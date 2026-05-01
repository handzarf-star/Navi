/* Navi — Right Now Engine
   Reads time + weather, suggests one of the hand-curated routes from
   data/routes.json. Renders a small strip above the category bar:
       Tuesday 4:47pm  ·  12°C rainy            Rainy Afternoon  3 hrs · 5 stops  [Show me]
   Tap "Show me" \u2192 categories.applyRoute(routeId) takes over from there.

   Open-Meteo (open-meteo.com) is free, keyless, and CORS-friendly. */

const NAVI_OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=43.86&longitude=18.43' +
  '&current=temperature_2m,weather_code' +
  '&timezone=Europe%2FSarajevo';

let naviRoutes = [];

async function naviFetchWeather() {
  try {
    const res = await fetch(NAVI_OPEN_METEO_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    return {
      code: (j.current && typeof j.current.weather_code === 'number') ? j.current.weather_code : null,
      temp: (j.current && typeof j.current.temperature_2m === 'number')
              ? Math.round(j.current.temperature_2m) : null
    };
  } catch (err) {
    console.warn('[Navi] Weather fetch failed:', err);
    return null;
  }
}

async function naviFetchRoutes() {
  try {
    const res = await fetch('data/routes.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Navi] Routes fetch failed:', err);
    return [];
  }
}

function naviTimeOfDay(date) {
  const h = date.getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

/* Open-Meteo uses WMO weather codes. Bucket them to four kinds. */
function naviWeatherKind(code) {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3 || code === 45 || code === 48) return 'cloudy';
  if ([71, 73, 75, 77, 85, 86].indexOf(code) > -1) return 'snow';
  // 51-67 (drizzle / rain), 80-82 (showers), 95-99 (thunder) \u2192 rain
  return 'rain';
}

function naviWeatherLabel(code, temp) {
  const kind = naviWeatherKind(code);
  const labels = { clear: 'clear', cloudy: 'cloudy', rain: 'rainy', snow: 'snowing' };
  const tempStr = (temp === null || temp === undefined) ? '' : `${temp}\u00B0C`;
  return `${tempStr} ${labels[kind] || ''}`.trim();
}

function naviTimeLabel(date) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const day = days[date.getDay()];
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  return `${day} ${h12}:${m}${ampm}`;
}

/* Route picker — priority order matters. First match wins.
   Rain/snow trumps everything (we want indoor warmth regardless of hour).
   Otherwise we map (timeOfDay, weatherKind) to the closest route. */
function naviPickRouteId(ctx) {
  if (ctx.weatherKind === 'rain' || ctx.weatherKind === 'snow') {
    return 'rainy_afternoon';
  }
  if (ctx.timeOfDay === 'evening') {
    return ctx.weatherKind === 'clear' ? 'golden_hour' : 'jetlagged_first_night';
  }
  if (ctx.timeOfDay === 'night') {
    return 'jetlagged_first_night';
  }
  // morning or afternoon
  return ctx.weatherKind === 'clear' ? 'sunny_morning' : 'slow_morning';
}

function naviGetRoute(routeId) {
  return (naviRoutes || []).find(r => r.id === routeId) || null;
}

function naviEscRN(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function naviRenderRightNow() {
  const strip = document.getElementById('right-now');
  if (!strip) return;
  const route = naviGetRoute(window.naviSuggestedRouteId);
  if (!route) {
    strip.hidden = true;
    return;
  }

  const ctx = window.naviContext || {};
  strip.hidden = false;
  strip.innerHTML = `
    <div class="right-now-context">
      <span class="right-now-time">${naviEscRN(ctx.timeLabel)}</span>
      ${ctx.weatherLabel ? `<span class="right-now-sep" aria-hidden="true">\u00B7</span>
       <span class="right-now-weather">${naviEscRN(ctx.weatherLabel)}</span>` : ''}
    </div>
    <div class="right-now-route">
      <div class="right-now-route-info">
        <strong>${naviEscRN(route.name)}</strong>
        <span class="right-now-route-meta">${naviEscRN(route.duration_label)} \u00B7 ${route.locations.length} stops</span>
      </div>
      <button type="button" class="right-now-go" aria-label="Show me the suggested route">Show me</button>
    </div>
  `;
  const goBtn = strip.querySelector('.right-now-go');
  if (goBtn) {
    goBtn.addEventListener('click', () => {
      if (typeof applyRoute === 'function') applyRoute(route.id);
    });
  }
}

async function initRightNow() {
  // Routes load locally and fast; weather may be slow or fail offline.
  // Render the strip on whatever we get \u2014 weather is optional, time isn't.
  naviRoutes = await naviFetchRoutes();
  window.naviRoutes = naviRoutes;

  const weather = await naviFetchWeather();
  const now = new Date();
  const ctx = {
    timeOfDay:  naviTimeOfDay(now),
    weatherKind: weather && weather.code !== null ? naviWeatherKind(weather.code) : 'cloudy',
    timeLabel:  naviTimeLabel(now),
    weatherLabel: (weather && weather.code !== null)
                    ? naviWeatherLabel(weather.code, weather.temp)
                    : ''   // no weather \u2192 hide that part of the strip
  };
  window.naviContext = ctx;
  window.naviSuggestedRouteId = naviPickRouteId(ctx);

  naviRenderRightNow();
}
