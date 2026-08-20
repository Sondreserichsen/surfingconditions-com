// Fetches marine + weather data from Open-Meteo (free, no API key) and
// returns the values closest to the current hour.

const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

function closestHourIndex(timeArray) {
  const now = Date.now();
  let bestIdx = 0;
  let bestDiff = Infinity;
  timeArray.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - now);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  });
  return bestIdx;
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

async function fetchConditions(region) {
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
    forecast_days: "2"
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
    forecast_days: "2"
  });

  const [marine, forecast] = await Promise.all([
    fetchJSON(`${MARINE_URL}?${marineParams}`),
    fetchJSON(`${FORECAST_URL}?${forecastParams}`)
  ]);

  const marineIdx = closestHourIndex(marine.hourly.time);
  const forecastIdx = closestHourIndex(forecast.hourly.time);

  return {
    time: marine.hourly.time[marineIdx],
    ...pick(marine.hourly, marineIdx),
    ...pick(forecast.hourly, forecastIdx)
  };
}
