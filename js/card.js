/* Navi — Location list rendering + interactions
   Exposes: renderList(locations), focusCard(id)
   Depends on: map.js (panToLocation), #list element in DOM */

const LIST_CONTAINER_ID = 'list';

function naviGetInitials(name) {
  if (!name) return '·';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

function naviTruncate(text, maxWords) {
  if (!text) return '';
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}

function naviDirectionsUrl(coords) {
  if (!Array.isArray(coords) || coords.length !== 2) return '#';
  return `https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}`;
}

function naviPickString(obj, lang) {
  if (!obj) return '';
  return obj[lang] || obj.en || '';
}

function naviEscape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function naviBuildCard(loc, lang, step) {
  const name = naviPickString(loc.name, lang) || loc.id;
  const description = naviPickString(loc.description, lang);
  const tip = naviPickString(loc.insider_tip, lang);
  const hours = naviPickString(loc.hours, lang);
  const featured = loc.featured === true;
  const isLocalSecret = loc.local_secret === true || !!loc.submitted_by;
  // In route mode, the thumb shows the step number (1, 2, 3...) instead of initials.
  const isRouteStep = (typeof step === 'number');
  const thumbContent = isRouteStep ? String(step) : naviGetInitials(name);

  const article = document.createElement('article');
  article.className = 'loc-card'
    + (featured ? ' featured' : '')
    + (isLocalSecret ? ' local-secret' : '')
    + (isRouteStep ? ' route-step' : '');
  article.dataset.id = loc.id;

  // A card can be both featured and a local secret — show both badges.
  let badgesHtml = '';
  if (featured)      badgesHtml += '<span class="loc-badge">\u2605 Navi Recommends</span>';
  if (isLocalSecret) badgesHtml += '<span class="loc-badge local-badge">Local Secret</span>';

  // "Suggested by Amina, Vratnik" attribution, only when submitted_by is present.
  let attributionHtml = '';
  if (loc.submitted_by && (loc.submitted_by.name || loc.submitted_by.neighborhood)) {
    const parts = [];
    if (loc.submitted_by.name)         parts.push(naviEscape(loc.submitted_by.name));
    if (loc.submitted_by.neighborhood) parts.push(naviEscape(loc.submitted_by.neighborhood));
    attributionHtml = `<p class="loc-attribution">Suggested by ${parts.join(', ')}</p>`;
  }

  article.innerHTML = `
    <button class="loc-row" type="button" aria-expanded="false" aria-controls="expand-${loc.id}">
      <div class="loc-thumb" aria-hidden="true">${thumbContent}</div>
      <div class="loc-body">
        <h3 class="loc-name">
          <span>${name}</span>
          ${badgesHtml}
        </h3>
        <p class="loc-preview">${naviTruncate(description, 18)}</p>
      </div>
    </button>
    <div class="loc-expand" id="expand-${loc.id}" aria-hidden="true">
      ${attributionHtml}
      <p class="loc-description">${description}</p>
      ${tip ? `<p class="loc-tip"><span class="loc-tip-label">Insider tip</span>${tip}</p>` : ''}
      ${hours ? `<p class="loc-meta"><span class="loc-meta-icon">\u29D7</span> ${hours}</p>` : ''}
      <a class="loc-directions"
         href="${naviDirectionsUrl(loc.coordinates)}"
         target="_blank"
         rel="noopener noreferrer">
        Get Directions in Google Maps &rarr;
      </a>
      <button type="button" class="loc-ask-link" data-ask-id="${loc.id}">
        Have a question about this place? Ask a Sarajevan
      </button>
    </div>
  `;

  article.querySelector('.loc-row').addEventListener('click', () => {
    toggleCard(article, loc);
  });

  // The Ask link should not toggle the card, so stop propagation.
  const askBtn = article.querySelector('.loc-ask-link');
  if (askBtn) {
    askBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof openAskModal === 'function') openAskModal(loc);
    });
  }

  return article;
}

/* Permanent CTA appended to every list view.
   Replace NAVI_SUGGEST_URL with your real Google Form / Tally form link. */
const NAVI_SUGGEST_URL = 'https://forms.gle/REPLACE-WITH-YOUR-FORM-ID';

function naviBuildSuggestCard() {
  const a = document.createElement('a');
  a.className = 'loc-suggest-card';
  a.href = NAVI_SUGGEST_URL;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', 'Suggest a hidden gem');
  a.innerHTML = `
    <div class="loc-suggest-icon" aria-hidden="true">+</div>
    <h3 class="loc-suggest-title">Know a place tourists should know?</h3>
    <p class="loc-suggest-sub">Suggest a hidden gem &mdash; reviewed and added to <strong>Local Secrets</strong>.</p>
  `;
  return a;
}

function naviBuildEmptyState() {
  const div = document.createElement('div');
  div.className = 'cat-empty';
  div.innerHTML = `
    <strong>No places here yet.</strong>
    Try another category, or browse "All".
  `;
  return div;
}

/* Scroll #list so cardEl's TOP lines up with the top of the visible list panel.
   Uses getBoundingClientRect (not offsetTop) so it's immune to whatever is
   stacked above the list — header, map, future category bar, etc. */
function scrollCardToTop(cardEl, collapsingHeightAbove) {
  const list = document.getElementById(LIST_CONTAINER_ID);
  if (!list || !cardEl) return;
  const cardRect = cardEl.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();
  // current top of card relative to list's scrolled content
  const currentOffsetInList = (cardRect.top - listRect.top) + list.scrollTop;
  // subtract the height that's about to disappear above us when another card collapses
  const targetTop = Math.max(0, currentOffsetInList - (collapsingHeightAbove || 0) - 4);
  list.scrollTo({ top: targetTop, behavior: 'smooth' });
}

function toggleCard(cardEl, loc) {
  const wasOpen = cardEl.classList.contains('expanded');
  const list = document.getElementById(LIST_CONTAINER_ID);

  // Capture the height of any currently-expanded card BEFORE we change classes,
  // so we can compensate for the layout shift its collapse will cause.
  let collapsingHeightAbove = 0;
  const currentlyOpen = document.querySelector('.loc-card.expanded');
  if (currentlyOpen && currentlyOpen !== cardEl && list) {
    const cards = Array.from(list.querySelectorAll('.loc-card'));
    const openIdx = cards.indexOf(currentlyOpen);
    const targetIdx = cards.indexOf(cardEl);
    if (openIdx > -1 && targetIdx > -1 && openIdx < targetIdx) {
      const exp = currentlyOpen.querySelector('.loc-expand');
      if (exp) collapsingHeightAbove = exp.offsetHeight;
    }
  }

  // Collapse any currently expanded card
  document.querySelectorAll('.loc-card.expanded').forEach(other => {
    other.classList.remove('expanded');
    const row = other.querySelector('.loc-row');
    if (row) row.setAttribute('aria-expanded', 'false');
    const exp = other.querySelector('.loc-expand');
    if (exp) exp.setAttribute('aria-hidden', 'true');
  });

  if (wasOpen) return; // user tapped the open card — just close

  // Open this card
  cardEl.classList.add('expanded');
  cardEl.querySelector('.loc-row').setAttribute('aria-expanded', 'true');
  cardEl.querySelector('.loc-expand').setAttribute('aria-hidden', 'false');

  // Pan map to the location
  if (typeof panToLocation === 'function') {
    panToLocation(loc.coordinates, 17);
  }

  // Scroll the title to the top of the list panel.
  scrollCardToTop(cardEl, collapsingHeightAbove);
}

// Called from map.js when a pin is tapped
function focusCard(id) {
  const cardEl = document.querySelector(`.loc-card[data-id="${CSS.escape(id)}"]`);
  if (!cardEl) return;
  const loc = naviLocations.find(l => l.id === id);
  if (!loc) return;
  if (!cardEl.classList.contains('expanded')) {
    toggleCard(cardEl, loc);
  } else {
    // Already open — just scroll the title to the top
    scrollCardToTop(cardEl, 0);
  }
}

// Module state
let naviLocations = [];

function naviBuildRouteHeader(route) {
  const div = document.createElement('div');
  div.className = 'route-header';
  div.innerHTML = `
    <div class="route-header-body">
      <div class="route-header-label">Route</div>
      <h2 class="route-header-name">${naviEscape(route.name)}</h2>
      <p class="route-header-desc">${naviEscape(route.description)}</p>
      <div class="route-header-meta">${naviEscape(route.duration_label)} \u00B7 ${route.locations.length} stops</div>
    </div>
    <button type="button" class="route-header-exit" aria-label="Exit route">Exit \u00D7</button>
  `;
  div.querySelector('.route-header-exit').addEventListener('click', () => {
    if (typeof exitRoute === 'function') exitRoute();
  });
  return div;
}

/* renderList(locations, lang, options?)
   options.route — when present, the list is rendered as a numbered route:
                   route header on top, cards get step badges (1, 2, 3...). */
function renderList(locations, lang, options) {
  const container = document.getElementById(LIST_CONTAINER_ID);
  if (!container) return;
  naviLocations = locations || [];
  const activeLang = lang || 'en';
  const opts = options || {};
  container.innerHTML = '';

  if (opts.route) {
    container.appendChild(naviBuildRouteHeader(opts.route));
  }

  if (naviLocations.length === 0) {
    container.appendChild(naviBuildEmptyState());
  } else {
    naviLocations.forEach((loc, i) => {
      const step = opts.route ? (i + 1) : undefined;
      container.appendChild(naviBuildCard(loc, activeLang, step));
    });
  }

  // Always last: the "suggest a hidden gem" CTA.
  container.appendChild(naviBuildSuggestCard());
}
