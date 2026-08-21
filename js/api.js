// Fetches marine + weather data from Open-Meteo (free, no API key) and
// returns snapshots for today plus the next 3 days, each day split into
// one slot per hour (00:00-23:00 local) so the UI can scrub through a
// continuous timeline instead of a few fixed check-times.

const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const FORECAST_DAYS = 4; // today + 3 days ahead

function dateKey(isoTime) {
  return isoTime.slice(0, 10); // "YYYY-MM-DD" — Open-Meteo times are local, no offset math needed
}

// Groups hourly indices by calendar day; each day's slots are every hour
// Open-Meteo returned for it, in chronological order.
function slotsByDay(timeArray) {
  const byDay = new Map();

  timeArray.forEach((t, i) => {
    const key = dateKey(t);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(i);
  });

  const result = [];
  for (const [day, indices] of byDay.entries()) {
    const slots = indices.map(i => ({ hour: new Date(timeArray[i]).getHours(), idx: i }));
    result.push({ day, slots });
  }

  result.sort((a, b) => a.day.localeCompare(b.day));
  return result.slice(0, FORECAST_DAYS);
}

function pick(hourly, idx) {
  const out = {};
  for (const key of Object.keys(hourly)) {
    if (key === "time") continue;
    out[key] = hourly[key][idx];
  }
  return out;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function fetchForecast(region) {
  const marineParams = new URLSearchParams({
    latitude: region.lat,
    longitude: region.lon,
    hourly: [
      "wave_height",
      "wave_direction",
      "wave_period",
      "swell_wave_height",
      "swell_wave_direction",
      "swell_wave_period",
      "wind_wave_height",
      "sea_surface_temperature"
    ].join(","),
    timezone: "auto",
    forecast_days: String(FORECAST_DAYS)
  });

  const forecastParams = new URLSearchParams({
    latitude: region.lat,
    longitude: region.lon,
    hourly: [
      "temperature_2m",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "uv_index",
      "precipitation_probability"
    ].join(","),
    timezone: "auto",
    forecast_days: String(FORECAST_DAYS)
  });

  const [marine, forecast] = await Promise.all([
    fetchJSON(`${MARINE_URL}?${marineParams}`),
    fetchJSON(`${FORECAST_URL}?${forecastParams}`)
  ]);

  const days = slotsByDay(marine.hourly.time);

  return days.map(({ day, slots }) => ({
    day,
    // forecast.hourly.time shares the same hourly grid as marine, so the
    // same index lines up to the same timestamp.
    slots: slots.map(({ hour, idx }) => ({
      hour,
      time: marine.hourly.time[idx],
      ...pick(marine.hourly, idx),
      ...pick(forecast.hourly, idx)
    }))
  }));
}
