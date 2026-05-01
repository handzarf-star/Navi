/* Navi — Ask a Sarajevan
   A small modal that lets travellers ask a question about a specific place.
   Submissions POST to a Tally / Formspree / Google Form. Replies happen
   out-of-band from the founder's inbox. No backend, no auth, no payment in v1. */

/* Replace this with your real Tally / Formspree URL once the form exists.
   Example Tally URL: https://tally.so/r/abcDEF
   The form needs these fields (matching names): place_id, place_name, question,
   name, email, language, submitted_at. */
const NAVI_ASK_FORM_URL = 'https://tally.so/r/REPLACE-WITH-YOUR-FORM-ID';

/* Centralised copy so it's easy to translate later. */
const NAVI_ASK_COPY = {
  thanksTitle: 'Sent.',
  thanksBody: (name) =>
    `Thanks ${name || 'for asking'} \u2014 we'll reply by email within a few hours. Real Sarajevan, real answer.`,
  another: 'Ask another',
  errorTitle: "Couldn't send.",
  errorBody:
    'Check your connection and try again, or email handzar.f@gmail.com directly.',
  retry: 'Try again'
};

let naviAskCurrentLocation = null;

function naviAskGetEls() {
  return {
    overlay:    document.getElementById('ask-overlay'),
    panel:      document.getElementById('ask-panel'),
    form:       document.getElementById('ask-form'),
    place:      document.getElementById('ask-place'),
    question:   document.getElementById('ask-question'),
    name:       document.getElementById('ask-name'),
    email:      document.getElementById('ask-email'),
    submit:     document.getElementById('ask-submit'),
    state:      document.getElementById('ask-state'),
    closeBtns:  document.querySelectorAll('[data-ask-close]')
  };
}

function openAskModal(loc, lang) {
  const els = naviAskGetEls();
  if (!els.overlay) return;
  naviAskCurrentLocation = loc || null;

  // Pre-fill the place context (only if a location was supplied).
  const lang_ = lang || (typeof naviCurrentLang === 'string' ? naviCurrentLang : 'en');
  let placeName = '';
  if (loc && loc.name) placeName = loc.name[lang_] || loc.name.en || '';
  if (placeName) {
    els.place.textContent = `About: ${placeName}`;
    els.place.hidden = false;
  } else {
    els.place.textContent = '';
    els.place.hidden = true;
  }

  // Reset form and state
  els.form.reset();
  els.form.hidden = false;
  els.state.hidden = true;
  els.state.innerHTML = '';

  els.overlay.classList.add('open');
  els.overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  // Defer focus so the slide-in animation doesn't fight the keyboard
  setTimeout(() => { try { els.question.focus(); } catch (_) {} }, 60);
}

function closeAskModal() {
  const els = naviAskGetEls();
  if (!els.overlay) return;
  els.overlay.classList.remove('open');
  els.overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  naviAskCurrentLocation = null;
}

async function naviSubmitAsk(e) {
  e.preventDefault();
  const els = naviAskGetEls();
  const data = {
    place_id:    naviAskCurrentLocation ? naviAskCurrentLocation.id : '',
    place_name:  naviAskCurrentLocation && naviAskCurrentLocation.name
                  ? (naviAskCurrentLocation.name.en || '') : '',
    question:    els.question.value.trim(),
    name:        els.name.value.trim(),
    email:       els.email.value.trim(),
    language:    typeof naviCurrentLang === 'string' ? naviCurrentLang : 'en',
    submitted_at: new Date().toISOString()
  };

  if (!data.question || !data.name || !data.email) return;

  els.submit.disabled = true;
  const originalLabel = els.submit.textContent;
  els.submit.textContent = 'Sending\u2026';

  try {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, v));

    // mode: 'no-cors' — most form backends accept anonymous POSTs but don't
    // send back CORS headers. We don't need the response body, just delivery.
    await fetch(NAVI_ASK_FORM_URL, { method: 'POST', body: fd, mode: 'no-cors' });

    showAskThanks(data.name);
  } catch (err) {
    console.error('[Navi] Ask submit failed:', err);
    showAskError();
  } finally {
    els.submit.disabled = false;
    els.submit.textContent = originalLabel;
  }
}

function showAskThanks(name) {
  const els = naviAskGetEls();
  els.form.hidden = true;
  els.state.hidden = false;
  const safeName = (name || '').replace(/[<>&"']/g, '');
  els.state.innerHTML = `
    <div class="ask-state ask-state--ok">
      <div class="ask-state-icon" aria-hidden="true">\u2713</div>
      <h3>${NAVI_ASK_COPY.thanksTitle}</h3>
      <p>${NAVI_ASK_COPY.thanksBody(safeName)}</p>
      <button type="button" class="ask-btn ask-btn--ghost" id="ask-another">${NAVI_ASK_COPY.another}</button>
    </div>
  `;
  const again = document.getElementById('ask-another');
  if (again) {
    again.addEventListener('click', () => {
      // Re-open the same place context (or generic if none was set)
      openAskModal(naviAskCurrentLocation);
    });
  }
}

function showAskError() {
  const els = naviAskGetEls();
  els.form.hidden = true;
  els.state.hidden = false;
  els.state.innerHTML = `
    <div class="ask-state ask-state--err">
      <div class="ask-state-icon" aria-hidden="true">!</div>
      <h3>${NAVI_ASK_COPY.errorTitle}</h3>
      <p>${NAVI_ASK_COPY.errorBody}</p>
      <button type="button" class="ask-btn ask-btn--ghost" id="ask-retry">${NAVI_ASK_COPY.retry}</button>
    </div>
  `;
  const retry = document.getElementById('ask-retry');
  if (retry) {
    retry.addEventListener('click', () => openAskModal(naviAskCurrentLocation));
  }
}

function initAsk() {
  const els = naviAskGetEls();
  if (!els.overlay || !els.form) return;
  els.form.addEventListener('submit', naviSubmitAsk);
  els.closeBtns.forEach(b => b.addEventListener('click', closeAskModal));
  // Click on backdrop closes (but not on the panel itself)
  els.overlay.addEventListener('click', (e) => {
    if (e.target === els.overlay) closeAskModal();
  });
  // Escape closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.overlay.classList.contains('open')) closeAskModal();
  });
}
