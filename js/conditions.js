// Derives surfer-facing labels (skill level, crowd estimate, compass
// directions) from raw Open-Meteo values. These are heuristics, not
// measurements — tuned for small-to-moderate east-coast-AU beach breaks.

const SKILL_LEVELS = ["Beginner", "Amateur", "Casual", "Experienced", "Expert"];

// Below this, waves generally don't have enough face to push a board —
// there's nothing to catch, regardless of surfer skill.
const NOT_SURFABLE_WAVE_HEIGHT = 0.3;

function degreesToCompass(deg) {
  if (deg === undefined || deg === null || Number.isNaN(deg)) return "—";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

// Difficulty score: bigger waves, stronger wind and longer/more powerful
// swell periods all push the score up (harder to handle).
function difficultyScore(c) {
  const waveHeight = c.wave_height ?? c.swell_wave_height ?? 0;
  const windSpeed = c.wind_speed_10m ?? 0;
  const period = c.swell_wave_period ?? c.wave_period ?? 8;

  return waveHeight * 25 + windSpeed * 0.8 + Math.max(0, period - 6) * 3;
}

const SKILL_BANDS = [
  { level: "Beginner", min: 0 },
  { level: "Amateur", min: 18 },
  { level: "Casual", min: 32 },
  { level: "Experienced", min: 50 },
  { level: "Expert", min: 78 }
];

function skillLevelFor(c) {
  const waveHeight = c.wave_height ?? c.swell_wave_height ?? 0;
  const score = difficultyScore(c);

  if (waveHeight < NOT_SURFABLE_WAVE_HEIGHT) {
    return { level: "Not Surfable", score, notSurfable: true };
  }

  let best = SKILL_BANDS[0].level;
  for (const band of SKILL_BANDS) {
    if (score >= band.min) best = band.level;
  }
  return { level: best, score, notSurfable: false };
}

// Crowd estimate: combines how "fun"/approachable the conditions are with
// typical time-of-day and weekend patterns at popular AU beach breaks.
// `wallClockDate` must hold the region's local hour/weekday in its UTC
// fields (see wallClock() in app.js) — not an actual UTC or browser-local time.
function crowdEstimateFor(c, wallClockDate) {
  const waveHeight = c.wave_height ?? c.swell_wave_height ?? 0;
  const windSpeed = c.wind_speed_10m ?? 0;
  const rainChance = c.precipitation_probability ?? 0;

  let goodness = 50;
  if (waveHeight >= 0.5 && waveHeight <= 2.0) goodness += 20;
  if (waveHeight < 0.3 || waveHeight > 2.8) goodness -= 20;
  if (windSpeed > 25) goodness -= 20;
  if (windSpeed < 12) goodness += 10;
  if (rainChance > 50) goodness -= 25;

  const hour = wallClockDate.getUTCHours();
  const day = wallClockDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = day === 0 || day === 6;

  let timeFactor = 0;
  if (hour >= 5 && hour < 7) timeFactor = 15; // dawn patrol
  else if (hour >= 7 && hour < 10) timeFactor = 30; // peak before-work/school
  else if (hour >= 10 && hour < 15) timeFactor = 20;
  else if (hour >= 15 && hour < 18) timeFactor = 15;
  else timeFactor = -20; // early morning / evening / night

  const weekendBonus = isWeekend ? 15 : 0;

  const score = goodness * 0.5 + timeFactor + weekendBonus;

  if (score < 20) return "Empty";
  if (score < 40) return "Slightly Busy";
  if (score < 60) return "Busy";
  return "Full";
}

function buildMetrics(c) {
  const waveHeight = c.wave_height ?? c.swell_wave_height;
  return [
    { label: "Wave Height", value: waveHeight != null ? `${waveHeight.toFixed(1)} m` : "—" },
    { label: "Swell Height", value: c.swell_wave_height != null ? `${c.swell_wave_height.toFixed(1)} m` : "—" },
    { label: "Swell Period", value: c.swell_wave_period != null ? `${c.swell_wave_period.toFixed(0)} s` : "—" },
    { label: "Swell Direction", value: `${degreesToCompass(c.swell_wave_direction)} (${c.swell_wave_direction != null ? Math.round(c.swell_wave_direction) + "°" : "—"})` },
    { label: "Wind Speed", value: c.wind_speed_10m != null ? `${c.wind_speed_10m.toFixed(0)} km/h` : "—" },
    { label: "Wind Gusts", value: c.wind_gusts_10m != null ? `${c.wind_gusts_10m.toFixed(0)} km/h` : "—" },
    { label: "Wind Direction", value: `${degreesToCompass(c.wind_direction_10m)} (${c.wind_direction_10m != null ? Math.round(c.wind_direction_10m) + "°" : "—"})` },
    { label: "Air Temp", value: c.temperature_2m != null ? `${c.temperature_2m.toFixed(0)}°C` : "—" },
    { label: "Sea Temp", value: c.sea_surface_temperature != null ? `${c.sea_surface_temperature.toFixed(1)}°C` : "—" },
    { label: "UV Index", value: c.uv_index != null ? c.uv_index.toFixed(1) : "—" },
    { label: "Rain Chance", value: c.precipitation_probability != null ? `${c.precipitation_probability}%` : "—" }
  ];
}
