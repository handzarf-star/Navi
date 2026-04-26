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

function naviIsRenderable(loc) {
  // Skip records still pending coordinate verification (coordinates: null in data)
  return loc
    && Array.isArray(loc.coordinates)
    && loc.coordinates.length === 2
    && typeof loc.coordinates[0] === 'number'
    && typeof loc.coordinates[1] === 'number';
}

async function bootstrap() {
  initLangSwitcher();
  initMap();
  const all = await loadLocations();
  const locations = all.filter(naviIsRenderable);
  const skipped = all.length - locations.length;
  // Create every marker once; categories.js then toggles which ones are visible.
  renderPins(locations);
  // initCategories takes the full filterable set, applies "All" by default,
  // which itself calls renderList(...) — so no separate renderList call here.
  initCategories(locations);
  console.log(
    `[Navi] Rendered ${locations.length} location${locations.length === 1 ? '' : 's'}` +
    (skipped ? ` (skipped ${skipped} pending coordinate verification).` : '.')
  );
}

// defer on the script tag guarantees DOM parsing is complete before this runs
bootstrap();
