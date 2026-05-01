/* Navi — Category filter bar
   Exposes: initCategories(allLocations), applyCategory(key)
   Depends on: map.js (setPinsVisible), card.js (renderList) */

/* The framework. Order here = display order in the bar. */
const NAVI_CATEGORIES = [
  { key: 'all',          label: 'All',           icon: null,  variant: 'default' },
  { key: 'recommended',  label: 'Recommended',   icon: '\u2605', variant: 'recommended' }, // ★
  { key: 'see',          label: 'See',           icon: null,  variant: 'default' },
  { key: 'eat',          label: 'Eat',           icon: null,  variant: 'default' },
  { key: 'coffee',       label: 'Coffee',        icon: null,  variant: 'default' },
  { key: 'nightlife',    label: 'Nightlife',     icon: null,  variant: 'default' },
  { key: 'sleep',        label: 'Sleep',         icon: null,  variant: 'default' },
  { key: 'local-secret', label: 'Local Secrets', icon: null,  variant: 'local' }
];

let naviAllLocations = [];
let naviCurrentCategory = 'all';
let naviActiveRoute = null;       // when set, overrides category filtering

function naviMatchesCategory(loc, key) {
  if (!loc) return false;
  switch (key) {
    case 'all':          return true;
    case 'recommended':  return loc.featured === true;
    case 'local-secret': return loc.local_secret === true || !!loc.submitted_by;
    default:             return loc.category === key;
  }
}

function naviFilteredLocations() {
  return naviAllLocations.filter(l => naviMatchesCategory(l, naviCurrentCategory));
}

function naviUpdateActiveButton() {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.key === naviCurrentCategory);
    btn.setAttribute('aria-pressed', btn.dataset.key === naviCurrentCategory ? 'true' : 'false');
  });
}

function applyCategory(key) {
  if (!NAVI_CATEGORIES.some(c => c.key === key)) return;
  naviCurrentCategory = key;
  naviActiveRoute = null;        // tapping any category exits route mode
  naviUpdateActiveButton();

  const filtered = naviFilteredLocations();

  // Re-render the list (card.js) and update visible pins (map.js).
  if (typeof renderList === 'function') {
    renderList(filtered, typeof naviCurrentLang === 'string' ? naviCurrentLang : 'en');
  }
  if (typeof setPinsVisible === 'function') {
    setPinsVisible(new Set(filtered.map(l => l.id)));
  }

  // Scroll the list back to the top so the user sees the new results.
  const list = document.getElementById('list');
  if (list) list.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

/* Activate a route: list shows route's stops in order, map shows just those pins,
   no category pill is active. Triggered by Right Now strip's "Show me" button. */
function applyRoute(routeId) {
  const routes = window.naviRoutes || [];
  const route = routes.find(r => r.id === routeId);
  if (!route) return;

  naviActiveRoute = route;
  naviCurrentCategory = null;
  naviUpdateActiveButton();

  // Resolve the route's location IDs to actual location objects, in route order.
  const byId = new Map(naviAllLocations.map(l => [l.id, l]));
  const ordered = route.locations.map(id => byId.get(id)).filter(Boolean);

  if (typeof renderList === 'function') {
    renderList(
      ordered,
      typeof naviCurrentLang === 'string' ? naviCurrentLang : 'en',
      { route: route }
    );
  }
  if (typeof setPinsVisible === 'function') {
    setPinsVisible(new Set(ordered.map(l => l.id)));
  }

  const list = document.getElementById('list');
  if (list) list.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function exitRoute() {
  naviActiveRoute = null;
  applyCategory('all');
}

function naviBuildCategoryButton(cat) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cat-btn';
  if (cat.variant === 'recommended') btn.classList.add('cat-recommended');
  if (cat.variant === 'local')       btn.classList.add('cat-local');
  btn.dataset.key = cat.key;
  btn.setAttribute('aria-pressed', 'false');

  if (cat.icon) {
    const ic = document.createElement('span');
    ic.className = 'cat-icon';
    ic.setAttribute('aria-hidden', 'true');
    ic.textContent = cat.icon;
    btn.appendChild(ic);
  }
  const label = document.createElement('span');
  label.textContent = cat.label;
  btn.appendChild(label);

  btn.addEventListener('click', () => applyCategory(cat.key));
  return btn;
}

function initCategories(allLocations) {
  naviAllLocations = Array.isArray(allLocations) ? allLocations : [];
  const bar = document.getElementById('categories');
  if (!bar) return;
  bar.innerHTML = '';
  NAVI_CATEGORIES.forEach(cat => bar.appendChild(naviBuildCategoryButton(cat)));
  applyCategory('all');
}
