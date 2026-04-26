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

function naviBuildCard(loc, lang) {
  const name = naviPickString(loc.name, lang) || loc.id;
  const description = naviPickString(loc.description, lang);
  const tip = naviPickString(loc.insider_tip, lang);
  const hours = naviPickString(loc.hours, lang);
  const featured = loc.featured === true;
  const initials = naviGetInitials(name);

  const article = document.createElement('article');
  article.className = 'loc-card' + (featured ? ' featured' : '');
  article.dataset.id = loc.id;

  article.innerHTML = `
    <button class="loc-row" type="button" aria-expanded="false" aria-controls="expand-${loc.id}">
      <div class="loc-thumb" aria-hidden="true">${initials}</div>
      <div class="loc-body">
        <h3 class="loc-name">
          <span>${name}</span>
          ${featured ? '<span class="loc-badge">\u2605 Navi Recommends</span>' : ''}
        </h3>
        <p class="loc-preview">${naviTruncate(description, 18)}</p>
      </div>
    </button>
    <div class="loc-expand" id="expand-${loc.id}" aria-hidden="true">
      <p class="loc-description">${description}</p>
      ${tip ? `<p class="loc-tip"><span class="loc-tip-label">Insider tip</span>${tip}</p>` : ''}
      ${hours ? `<p class="loc-meta"><span class="loc-meta-icon">\u29D7</span> ${hours}</p>` : ''}
      <a class="loc-directions"
         href="${naviDirectionsUrl(loc.coordinates)}"
         target="_blank"
         rel="noopener noreferrer">
        Get Directions in Google Maps &rarr;
      </a>
    </div>
  `;

  article.querySelector('.loc-row').addEventListener('click', () => {
    toggleCard(article, loc);
  });

  return article;
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

function renderList(locations, lang) {
  const container = document.getElementById(LIST_CONTAINER_ID);
  if (!container) return;
  naviLocations = locations || [];
  const activeLang = lang || 'en';
  container.innerHTML = '';
  naviLocations.forEach(loc => {
    container.appendChild(naviBuildCard(loc, activeLang));
  });
}
