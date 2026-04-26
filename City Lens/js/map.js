/* Navi — Map
   Exposes: initMap(), renderPins(locations), panToLocation(coords, zoom)
   Depends on: Leaflet (global L), #map element in DOM */

let naviMap = null;
const naviMarkers = {}; // id -> L.Marker

function initMap() {
  naviMap = L.map('map', {
    zoomControl: true,
    attributionControl: true,
    tap: true
  }).setView([43.8592, 18.4313], 15);

  // CartoDB Voyager — warm, clean, no API key required
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(naviMap);

  return naviMap;
}

function renderPins(locations) {
  if (!naviMap || !Array.isArray(locations)) return;

  locations.forEach(loc => {
    if (!loc || !Array.isArray(loc.coordinates) || loc.coordinates.length !== 2) return;

    const isFeatured = loc.featured === true;
    const pinClass = isFeatured ? 'navi-pin featured' : 'navi-pin';

    const icon = L.divIcon({
      className: '',
      html: `<div class="${pinClass}"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    const marker = L.marker(loc.coordinates, { icon }).addTo(naviMap);

    // Tapping a pin scrolls the list to the matching card and expands it
    marker.on('click', () => {
      if (typeof focusCard === 'function') {
        focusCard(loc.id);
      }
    });

    naviMarkers[loc.id] = marker;
  });
}

function panToLocation(coords, zoom) {
  if (!naviMap || !Array.isArray(coords) || coords.length !== 2) return;
  const targetZoom = typeof zoom === 'number' ? zoom : 17;
  naviMap.flyTo(coords, targetZoom, { duration: 0.8 });
}
