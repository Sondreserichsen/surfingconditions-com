const els = {
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  content: document.getElementById("content"),
  dayTabs: document.getElementById("day-tabs"),
  regionName: document.getElementById("region-name"),
  updatedAt: document.getElementById("updated-at"),
  skillValue: document.getElementById("skill-value"),
  crowdValue: document.getElementById("crowd-value"),
  crowdBadge: document.getElementById("crowd-badge"),
  skillScale: document.getElementById("skill-scale"),
  metricsGrid: document.getElementById("metrics-grid")
};

const CROWD_CLASS = {
  "Empty": "crowd-empty",
  "Slightly Busy": "crowd-slight",
  "Busy": "crowd-busy",
  "Full": "crowd-full"
};

let currentForecast = []; // today + next 3 days, one snapshot each
let currentRegion = null;
let selectedDayIdx = 0;

function setState(state) {
  els.loading.classList.toggle("hidden", state !== "loading");
  els.error.classList.toggle("hidden", state !== "error");
  els.content.classList.toggle("hidden", state !== "ready");
}

// Open-Meteo (timezone=auto) returns times as the region's local wall clock
// with no offset, e.g. "2026-08-21T10:00". Parsing that as UTC keeps the
// hour/weekday numbers exactly as given, regardless of the browser's own timezone.
function wallClock(isoString) {
  const [datePart, timePart] = isoString.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm));
}

function dayLabel(isoString, idx) {
  if (idx === 0) return "Today";
  if (idx === 1) return "Tomorrow";
  const wc = wallClock(isoString);
  return wc.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function renderDayTabs() {
  els.dayTabs.innerHTML = "";
  currentForecast.forEach((day, idx) => {
    const btn = document.createElement("button");
    btn.className = "tab day-tab" + (idx === selectedDayIdx ? " active" : "");
    btn.textContent = dayLabel(day.time, idx);
    btn.addEventListener("click", () => {
      selectedDayIdx = idx;
      renderDayTabs();
      renderDay();
    });
    els.dayTabs.appendChild(btn);
  });
}

function renderDay() {
  const conditions = currentForecast[selectedDayIdx];
  const wc = wallClock(conditions.time);

  els.regionName.textContent = `${currentRegion.name} — ${currentRegion.spot}`;
  els.updatedAt.textContent = `Conditions for ${wc.toLocaleString("en-AU", { timeZone: "UTC", weekday: "long", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}`;

  const { level } = skillLevelFor(conditions);
  els.skillValue.textContent = level;

  els.skillScale.querySelectorAll("span").forEach(span => {
    span.classList.toggle("active", span.dataset.level === level);
  });

  const crowd = crowdEstimateFor(conditions, wc);
  els.crowdValue.textContent = crowd;
  els.crowdBadge.className = `crowd-badge ${CROWD_CLASS[crowd]}`;

  els.metricsGrid.innerHTML = "";
  buildMetrics(conditions).forEach(m => {
    const card = document.createElement("div");
    card.className = "metric-card";
    card.innerHTML = `<span class="metric-label">${m.label}</span><span class="metric-value">${m.value}</span>`;
    els.metricsGrid.appendChild(card);
  });
}

async function loadRegion(key) {
  currentRegion = REGIONS[key];
  selectedDayIdx = 0;
  setState("loading");
  try {
    currentForecast = await fetchForecast(currentRegion);
    renderDayTabs();
    renderDay();
    setState("ready");
  } catch (err) {
    console.error(err);
    els.error.textContent = "Couldn't load conditions right now. Please try again shortly.";
    setState("error");
  }
}

document.getElementById("region-tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll("#region-tabs .tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  loadRegion(btn.dataset.region);
});

loadRegion("sunshine-coast");
