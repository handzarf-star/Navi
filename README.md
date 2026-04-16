# Navi

A QR-code-activated multilingual tourist guide for Sarajevo.

**Tagline:** Sarajevo, in your language.

## Live

https://navi-murex.vercel.app/

## Stack

Static HTML + Vanilla JavaScript + Leaflet.js + OpenStreetMap tiles.
No framework, no npm, no build step.

## Project structure

- `index.html` — entry point (currently a redirect to `app.html`; splash screen comes in a later build step)
- `app.html` — main map application
- `css/variables.css` — brand tokens: colors, spacing, typography
- `css/base.css` — resets and typography defaults
- `css/map.css` — map container, pin styles, Leaflet overrides
- `js/map.js` — Leaflet initialization and pin rendering
- `js/app.js` — bootstrap: init map, load data, render pins
- `data/locations.json` — single source of truth for all location data

## Deploy

Push changes to the `main` branch on GitHub. Vercel auto-deploys in under 60 seconds.

## Local development

The app fetches `data/locations.json` at runtime. Opening `app.html` directly
via `file://` will block that fetch in most browsers, so use a simple local
HTTP server instead:

    python3 -m http.server 8000

Then open `http://localhost:8000/app.html`.

## Status

**Day 3 of build** — Map skeleton with 3 test locations (Baščaršija Bazaar,
Sebilj Fountain, Gazi Husrev-beg Mosque). The map loads, pins render, and
tapping a pin shows the location name.

**Next up:** Location detail cards, language switcher (EN/TR/AR/DE/ZH),
and Arabic RTL layout.
