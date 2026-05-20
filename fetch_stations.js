import fs from 'fs';

async function fetchWAQI() {
  const WAQI_TOKEN = 'cbf222bbdfbb6635706c1a7218ba5703b84540d0';
  
  const searchUrl = `https://api.waqi.info/search/?keyword=pune&token=${WAQI_TOKEN}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  
  if (searchData.status !== 'ok') {
    console.error('Search failed');
    return;
  }
  
  const stationUids = searchData.data
    .filter(s => s.station.name.toLowerCase().includes('pune') || s.station.url.includes('pune'))
    .map(s => s.uid);

  const stations = [];
  const feedPromises = stationUids.slice(0, 15).map(uid => 
    fetch(`https://api.waqi.info/feed/@${uid}/?token=${WAQI_TOKEN}`).then(r => r.json()).catch(() => null)
  );
  
  const feeds = await Promise.all(feedPromises);
  
  for (const feed of feeds) {
    if (feed && feed.status === 'ok' && feed.data && feed.data.city && feed.data.city.geo) {
      stations.push({
        uid: feed.data.idx,
        name: feed.data.city.name,
        lat: feed.data.city.geo[0],
        lon: feed.data.city.geo[1],
        aqi: feed.data.aqi,
        iaqi: feed.data.iaqi
      });
    }
  }

  fs.writeFileSync('stations_log.json', JSON.stringify(stations, null, 2));
  console.log('Saved ' + stations.length + ' stations to stations_log.json');
}

fetchWAQI();
