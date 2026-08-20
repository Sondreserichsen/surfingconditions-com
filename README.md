# SurfingConditions.com

Daily surf conditions for three east-coast Australia regions — Sunshine Coast, Gold Coast, and Byron Bay.

## Features

- Live wave, swell, wind, water/air temp, UV and rain data from [Open-Meteo](https://open-meteo.com) (free, no API key)
- Estimated surf skill-level suitability (Beginner / Amateur / Casual / Experienced / Expert)
- Estimated beach crowd level (Empty / Slightly Busy / Busy / Full)

Skill level and crowd level are heuristic estimates derived from the weather/marine data and time of day — not direct measurements.

## Running locally

No build step. Serve the folder with any static file server, e.g.:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Structure

- `index.html` — page markup
- `css/style.css` — styling
- `js/regions.js` — coordinates for each surf region
- `js/api.js` — Open-Meteo data fetching
- `js/conditions.js` — skill-level and crowd-level heuristics
- `js/app.js` — UI wiring
