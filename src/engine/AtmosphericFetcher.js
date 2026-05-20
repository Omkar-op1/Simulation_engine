import { CITIES, DEFAULT_CITY, PUNE_BASELINE } from '../utils/constants.js';

const WAQI  = 'https://api.waqi.info';
const OWM   = 'https://api.openweathermap.org/data/2.5';
const WAQI_TOKEN = import.meta.env.VITE_WAQI_TOKEN  || 'demo';
const OWM_KEY    = import.meta.env.VITE_OWM_KEY     || '';

// ─── Real API calls ──────────────────────────────────────────────────────────

async function fetchCPCB(cityConfig) {
  const stations = [];
  try {
    const res = await fetch('/cpcb-api');
    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    const cityNodes = Array.from(xmlDoc.getElementsByTagName('City'));
    const matchedCity = cityNodes.find(c => c.getAttribute('id').toLowerCase() === cityConfig.name.toLowerCase());
    
    if (matchedCity) {
      const stationNodes = matchedCity.getElementsByTagName('Station');
      for (const st of stationNodes) {
        const name = st.getAttribute('id');
        const lat = parseFloat(st.getAttribute('latitude'));
        const lon = parseFloat(st.getAttribute('longitude'));
        
        const aqiNode = st.getElementsByTagName('Air_Quality_Index')[0];
        const aqi = aqiNode ? parseInt(aqiNode.getAttribute('Value')) : 0;
        
        if (!lat || !lon || isNaN(aqi) || aqi === 0) continue;
        
        const polNodes = st.getElementsByTagName('Pollutant_Index');
        const pols = {};
        for (const p of polNodes) {
          pols[p.getAttribute('id')] = parseFloat(p.getAttribute('Avg'));
        }
        
        stations.push({
          uid: 'cpcb_' + name,
          name: name + ' (CPCB)',
          lat, lon, aqi,
          PM25: pols['PM2.5'],
          PM10: pols['PM10'],
          NO2:  pols['NO2'],
          SO2:  pols['SO2'],
          O3:   pols['OZONE'],
          CO:   pols['CO'],
        });
      }
    }
  } catch (err) {
    console.error('CPCB fetch failed:', err);
  }
  return stations;
}

async function fetchWAQI(cityConfig) {
  // 1. Search for stations
  const searchUrl = `${WAQI}/search/?keyword=${cityConfig.name}&token=${WAQI_TOKEN}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  
  if (searchData.status !== 'ok') throw new Error('WAQI search failed: ' + searchData.data);
  
  // Filter for real stations
  const stationUids = searchData.data
    .filter(s => s.station.name.toLowerCase().includes(cityConfig.name.toLowerCase()) || s.station.url.includes(cityConfig.id))
    .map(s => s.uid);

  // 2. Fetch detailed data for individual stations
  const stations = [];
  const feedPromises = stationUids.slice(0, 15).map(uid => 
    fetch(`${WAQI}/feed/@${uid}/?token=${WAQI_TOKEN}`).then(r => r.json()).catch(() => null)
  );
  
  const feeds = await Promise.all(feedPromises);
  const nowUnix = Math.floor(Date.now() / 1000);
  
  for (const feed of feeds) {
    if (feed && feed.status === 'ok' && feed.data && feed.data.city && feed.data.city.geo) {
      const fd = feed.data;
      if (!parseInt(fd.aqi)) continue; // Skip stations without AQI
      
      // Filter stale data (> 4 days old)
      const stime = fd.time?.vtime;
      if (stime && nowUnix - stime > 4 * 24 * 3600) {
        continue;
      }
      
      stations.push({
        uid: fd.idx,
        name: fd.city.name,
        lat: fd.city.geo[0],
        lon: fd.city.geo[1],
        aqi: parseInt(fd.aqi) || 0,
        PM25: fd.iaqi?.pm25?.v,
        PM10: fd.iaqi?.pm10?.v,
        NO2:  fd.iaqi?.no2?.v,
        SO2:  fd.iaqi?.so2?.v,
        O3:   fd.iaqi?.o3?.v,
        CO:   fd.iaqi?.co?.v,
      });
    }
  }

  // 3. Merge with CPCB Feed
  const cpcbStations = await fetchCPCB(cityConfig);
  for (const cs of cpcbStations) {
     const dup = stations.find(s => Math.abs(s.lat - cs.lat) < 0.002 && Math.abs(s.lon - cs.lon) < 0.002);
     if (!dup) {
       stations.push(cs);
     } else {
       if (!dup.PM25 && cs.PM25) dup.PM25 = cs.PM25;
     }
  }

  // 4. Calculate city averages dynamically
  let sumAQI = 0, sumPM25 = 0, sumPM10 = 0, sumNO2 = 0, sumSO2 = 0, sumO3 = 0, sumCO = 0;
  let countAQI = 0, countPM25 = 0, countPM10 = 0, countNO2 = 0, countSO2 = 0, countO3 = 0, countCO = 0;

  for (const s of stations) {
    if (s.aqi) { sumAQI += s.aqi; countAQI++; }
    if (s.PM25) { sumPM25 += s.PM25; countPM25++; }
    if (s.PM10) { sumPM10 += s.PM10; countPM10++; }
    if (s.NO2) { sumNO2 += s.NO2; countNO2++; }
    if (s.SO2) { sumSO2 += s.SO2; countSO2++; }
    if (s.O3) { sumO3 += s.O3; countO3++; }
    if (s.CO) { sumCO += s.CO; countCO++; }
  }

  const avgAQI = countAQI > 0 ? Math.round(sumAQI / countAQI) : 0;
  const avgPM25 = countPM25 > 0 ? sumPM25 / countPM25 : PUNE_BASELINE.PM25;
  const avgPM10 = countPM10 > 0 ? sumPM10 / countPM10 : PUNE_BASELINE.PM10;
  const avgNO2 = countNO2 > 0 ? sumNO2 / countNO2 : PUNE_BASELINE.NO2;
  const avgSO2 = countSO2 > 0 ? sumSO2 / countSO2 : PUNE_BASELINE.SO2;
  const avgO3 = countO3 > 0 ? sumO3 / countO3 : PUNE_BASELINE.O3;
  const avgCO = countCO > 0 ? sumCO / countCO : PUNE_BASELINE.CO;

  // 5. Assign fallbacks for missing data in individual stations
  stations.forEach(s => {
    s.PM25 = s.PM25 || avgPM25;
    s.PM10 = s.PM10 || avgPM10;
    s.NO2  = s.NO2  || avgNO2;
    s.SO2  = s.SO2  || avgSO2;
    s.O3   = s.O3   || avgO3;
    s.CO   = s.CO   || avgCO;
  });

  return {
    aqi:  avgAQI,
    PM25: avgPM25,
    PM10: avgPM10,
    NO2:  avgNO2,
    SO2:  avgSO2,
    O3:   avgO3,
    CO:   avgCO,
    CO2:  PUNE_BASELINE.CO2, // Not provided by WAQI/CPCB
    stations,
  };
}

async function fetchOWM(cityConfig) {
  if (!OWM_KEY) throw new Error("Missing OpenWeatherMap API Key in .env");
  const url = `${OWM}/weather?lat=${cityConfig.center[0]}&lon=${cityConfig.center[1]}&appid=${OWM_KEY}&units=metric`;
  const res  = await fetch(url);
  const d    = await res.json();
  if (d.cod !== 200) throw new Error('OWM fetch failed: ' + d.message);

  const hour = new Date().getHours();
  return {
    windSpeed:   d.wind?.speed ?? 2.5,
    windDir:     d.wind?.deg   ?? 210,
    temp:        d.main?.temp  ?? 30,
    humidity:    d.main?.humidity ?? 60,
    pressure:    d.main?.pressure ?? 1010,
    clouds:      d.clouds?.all ?? 20,
    isDay:       hour >= 6 && hour < 19,
    description: d.weather?.[0]?.description ?? '',
    visibility:  d.visibility ?? 8000,
    uvIndex:     0,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function fetchAllAtmosphericData(cityId) {
  if (!WAQI_TOKEN || WAQI_TOKEN === 'demo') {
    throw new Error("Missing WAQI API token. Please provide VITE_WAQI_TOKEN in .env");
  }
  
  const cityConfig = CITIES[cityId] || CITIES[DEFAULT_CITY];
  const [weather, aqi] = await Promise.all([fetchOWM(cityConfig), fetchWAQI(cityConfig)]);
  return { weather, aqi, isMock: false };
}

/** Refresh just weather (called every 10 min) */
export async function refreshWeather(cityId) {
  const cityConfig = CITIES[cityId] || CITIES[DEFAULT_CITY];
  return await fetchOWM(cityConfig);
}
