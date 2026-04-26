/* Navi — i18n
   Visual-only language switcher for now. Real translation logic comes later
   (will be wired up once Day 2 translations are in locations.json). */

const NAVI_SUPPORTED_LANGS = ['en', 'tr', 'ar', 'de', 'zh'];
let naviCurrentLang = 'en';

function initLangSwitcher() {
  const buttons = document.querySelectorAll('.lang-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (!NAVI_SUPPORTED_LANGS.includes(lang)) return;

      // Visual state only for now
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      naviCurrentLang = lang;

      console.log(`[Navi] Selected language: ${lang}. Translation rendering not yet implemented \u2014 content stays in English.`);
    });
  });
}
