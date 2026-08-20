// Fetches marine + weather data from Open-Meteo (free, no API key) and
// returns a snapshot per day: today (closest hour to now) plus the next
// 3 days (a mid-morning ~10am snapshot, the typical time surfers check).

const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const FORECAST_DAYS = 4; // today + 3 days ahead
const REPRESENTATIVE_HOUR = 10; // 10am local, for future days

function dateKey(isoTime) {
  return isoTime.slice(0, 10); // "YYYY-MM-DD" — Open-Meteo times are local, no offset math needed
}

// Groups hourly indices by calendar day, then picks one representative
// index per day: closest-to-now for today, closest-to-10am for later days.
function representativeIndicesByDay(timeArray) {
  const today = dateKey(new Date().toISOString());
  const byDay = new Map();

  timeArray.forEach((t, i) => {
    const key = dateKey(t);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(i);
  });

  const result = [];
  for (const [day, indices] of byDay.entries()) {
    let bestIdx = indices[0];
    if (day === today) {
      const now = Date.now();
      let bestDiff = Infinity;
      for (const i of indices) {
        const diff = Math.abs(new Date(timeArray[i]).getTime() - now);
        if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
      }
    } else {
      let bestDiff = Infinity;
      for (const i of indices) {
        const hour = new Date(timeArray[i]).getHours();
        const diff = Math.abs(hour - REPRESENTATIVE_HOUR);
        if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
      }
    }
    result.push({ day, idx: bestIdx });
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

  const days = representativeIndicesByDay(marine.hourly.time);

  return days.map(({ day, idx }) => {
    // forecast.hourly.time shares the same hourly grid as marine, so the
    // same index lines up to the same timestamp.
    return {
      day,
      time: marine.hourly.time[idx],
      ...pick(marine.hourly, idx),
      ...pick(forecast.hourly, idx)
    };
  });
}
