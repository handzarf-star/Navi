/* Navi — Bootstrap
   Initializes the map, loads locations.json, renders pins and the list.
   Depends on: map.js (initMap, renderPins), card.js (renderList) */

async function loadLocations() {
  try {
    const res = await fetch('data/locations.json');
    if (!res.ok) throw new Error(`Failed to load locations: HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Navi] Failed to load locations:', err);
    return [];
  }
}

async function bootstrap() {
  initLangSwitcher();
  initMap();
  const locations = await loadLocations();
  renderPins(locations);
  renderList(locations, 'en');
  console.log(`[Navi] Rendered ${locations.length} location${locations.length === 1 ? '' : 's'}.`);
}

// defer on the script tag guarantees DOM parsing is complete before this runs
bootstrap();
