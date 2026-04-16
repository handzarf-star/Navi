/* Navi — Map
   Exposes: initMap(), renderPins(locations)
   Depends on: Leaflet (global L), #map element in DOM */

let naviMap = null;

function initMap() {
  naviMap = L.map('map', {
    zoomControl: true,
    attributionControl: true
  }).setView([43.8592, 18.4313], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(naviMap);

  return naviMap;
}

function renderPins(locations) {
  if (!naviMap || !Array.isArray(locations)) return;

  locations.forEach(loc => {
    if (!loc || !Array.isArray(loc.coordinates) || loc.coordinates.length !== 2) return;

    const isFeatured = loc.featured === true;
    const pinClass = isFeatured ? 'navi-pin featured' : 'navi-pin';
    const pinSymbol = isFeatured ? '\u2605' : '';

    const icon = L.divIcon({
      className: '',
      html: `<div class="${pinClass}">${pinSymbol}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker(loc.coordinates, { icon }).addTo(naviMap);
    const name = (loc.name && loc.name.en) || loc.id || '';
    marker.bindPopup(`<strong>${name}</strong>`);
  });
}
