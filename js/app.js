const els = {
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  content: document.getElementById("content"),
  dayTabs: document.getElementById("day-tabs"),
  timeSliderWrap: document.getElementById("time-slider-wrap"),
  timeSlider: document.getElementById("time-slider"),
  timeSliderLabel: document.getElementById("time-slider-label"),
  timeSliderMin: document.getElementById("time-slider-min"),
  timeSliderMax: document.getElementById("time-slider-max"),
  regionName: document.getElementById("region-name"),
  updatedAt: document.getElementById("updated-at"),
  skillValue: document.getElementById("skill-value"),
  skillBadge: document.getElementById("skill-badge"),
  crowdValue: document.getElementById("crowd-value"),
  crowdBadge: document.getElementById("crowd-badge"),
  skillScale: document.getElementById("skill-scale"),
  flatBanner: document.getElementById("flat-banner"),
  metricsGrid: document.getElementById("metrics-grid")
};

const CROWD_CLASS = {
  "Empty": "crowd-empty",
  "Slightly Busy": "crowd-slight",
  "Busy": "crowd-busy",
  "Full": "crowd-full"
};

let currentForecast = []; // today + next 3 days, each with one slot per hour
let currentRegion = null;
let selectedDayIdx = 0;
let selectedHour = null; // 0-23 — the user's chosen check-time, kept across day/region/slider changes

function setState(state) {
  els.loading.classList.toggle("hidden", state !== "loading");
  els.error.classList.toggle("hidden", state !== "error");
  els.content.classList.toggle("hidden", state !== "ready");
}

function formatHourLabel(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
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

// Current time, expressed the same "wall clock as UTC fields" way as
// wallClock() above, so the two can be compared directly.
function nowWallClock(timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  }).formatToParts(new Date());
  const map = {};
  parts.forEach(p => { if (p.type !== "literal") map[p.type] = p.value; });
  return new Date(Date.UTC(
    Number(map.year), Number(map.month) - 1, Number(map.day),
    Number(map.hour) % 24, Number(map.minute), Number(map.second)
  ));
}

// For today, only show hours still ahead of the current time; other days
// show the full 24-hour timeline.
function visibleSlots(day, dayIdx) {
  if (dayIdx !== 0) return day.slots;
  const now = nowWallClock(currentRegion.timezone);
  return day.slots.filter(slot => wallClock(slot.time) > now);
}

// Resolves selectedHour to an index within the given (day-specific) slot
// list: exact hour match if present, otherwise the closest available hour,
// so a choice like "14:00" survives switching to a day/region where that
// exact hour isn't offered (e.g. today's list got trimmed by visibleSlots).
function resolveSlotIndex(slots) {
  if (slots.length === 0) return -1;
  if (selectedHour == null) return 0;
  const exact = slots.findIndex(s => s.hour === selectedHour);
  if (exact !== -1) return exact;
  let best = 0;
  let bestDiff = Infinity;
  slots.forEach((s, i) => {
    const diff = Math.abs(s.hour - selectedHour);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  });
  return best;
}

function dayLabel(day, idx) {
  if (idx === 0) return "Today";
  if (idx === 1) return "Tomorrow";
  const wc = wallClock(day.slots[0].time);
  return wc.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function renderDayTabs() {
  els.dayTabs.innerHTML = "";
  currentForecast.forEach((day, idx) => {
    const btn = document.createElement("button");
    btn.className = "tab day-tab" + (idx === selectedDayIdx ? " active" : "");
    btn.textContent = dayLabel(day, idx);
    btn.addEventListener("click", () => {
      selectedDayIdx = idx;
      renderDayTabs();
      renderTimeSlider();
      renderDay();
    });
    els.dayTabs.appendChild(btn);
  });
}

// Syncs the slider's min/max/value/labels to the currently selected day's
// slots. Called whenever the day or region changes.
function renderTimeSlider() {
  const slots = visibleSlots(currentForecast[selectedDayIdx], selectedDayIdx);

  if (slots.length === 0) {
    els.timeSliderWrap.classList.add("hidden");
    return;
  }
  els.timeSliderWrap.classList.remove("hidden");

  const idx = resolveSlotIndex(slots);
  els.timeSlider.min = 0;
  els.timeSlider.max = slots.length - 1;
  els.timeSlider.value = idx;
  els.timeSliderLabel.textContent = formatHourLabel(slots[idx].hour);
  els.timeSliderMin.textContent = formatHourLabel(slots[0].hour);
  els.timeSliderMax.textContent = formatHourLabel(slots[slots.length - 1].hour);
}

function renderDay() {
  const slots = visibleSlots(currentForecast[selectedDayIdx], selectedDayIdx);

  els.regionName.textContent = `${currentRegion.name} — ${currentRegion.spot}`;

  const idx = resolveSlotIndex(slots);
  if (idx === -1) {
    els.updatedAt.textContent = "No more hours left today — try Tomorrow.";
    els.skillValue.textContent = "—";
    els.skillBadge.className = "skill-badge";
    els.skillScale.querySelectorAll("span").forEach(span => span.classList.remove("active"));
    els.flatBanner.classList.add("hidden");
    els.crowdValue.textContent = "—";
    els.crowdBadge.className = "crowd-badge";
    els.metricsGrid.innerHTML = "";
    return;
  }

  const conditions = slots[idx];
  const wc = wallClock(conditions.time);

  els.updatedAt.textContent = `Conditions for ${wc.toLocaleString("en-AU", { timeZone: "UTC", weekday: "long", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}`;

  const { level, notSurfable } = skillLevelFor(conditions);
  els.skillValue.textContent = level;
  els.skillBadge.className = "skill-badge" + (notSurfable ? " skill-flat" : "");
  els.flatBanner.classList.toggle("hidden", !notSurfable);

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

let loadToken = 0; // guards against a slower, superseded region fetch clobbering a newer one

async function loadRegion(key) {
  const token = ++loadToken;
  const region = REGIONS[key];
  currentRegion = region;
  setState("loading");
  try {
    const forecast = await fetchForecast(region);
    if (token !== loadToken) return; // a newer region switch started while this one was in flight

    currentForecast = forecast;
    selectedDayIdx = Math.min(selectedDayIdx, currentForecast.length - 1);
    if (selectedHour == null) {
      selectedHour = nowWallClock(region.timezone).getUTCHours();
    }
    renderDayTabs();
    renderTimeSlider();
    renderDay();
    setState("ready");
  } catch (err) {
    if (token !== loadToken) return;
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

// "input" fires continuously while dragging, so conditions update live.
els.timeSlider.addEventListener("input", () => {
  const slots = visibleSlots(currentForecast[selectedDayIdx], selectedDayIdx);
  const slot = slots[Number(els.timeSlider.value)];
  if (!slot) return;
  selectedHour = slot.hour;
  els.timeSliderLabel.textContent = formatHourLabel(slot.hour);
  renderDay();
});

loadRegion("sunshine-coast");
