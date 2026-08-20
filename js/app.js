const els = {
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  content: document.getElementById("content"),
  dayTabs: document.getElementById("day-tabs"),
  timeTabs: document.getElementById("time-tabs"),
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

const TIME_LABELS = { 9: "9am", 12: "12pm", 15: "3pm" };

let currentForecast = []; // today + next 3 days, each with 9am/12pm/3pm slots
let currentRegion = null;
let selectedDayIdx = 0;
let selectedSlotIdx = 0;

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

// For today, only show check-times still ahead of the current time;
// other days show all three.
function visibleSlots(day, dayIdx) {
  if (dayIdx !== 0) return day.slots;
  const now = nowWallClock(currentRegion.timezone);
  return day.slots.filter(slot => wallClock(slot.time) > now);
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
      selectedSlotIdx = 0;
      renderDayTabs();
      renderTimeTabs();
      renderDay();
    });
    els.dayTabs.appendChild(btn);
  });
}

function renderTimeTabs() {
  els.timeTabs.innerHTML = "";
  const slots = visibleSlots(currentForecast[selectedDayIdx], selectedDayIdx);
  slots.forEach((slot, idx) => {
    const btn = document.createElement("button");
    btn.className = "tab time-tab" + (idx === selectedSlotIdx ? " active" : "");
    btn.textContent = TIME_LABELS[slot.hour] ?? `${slot.hour}:00`;
    btn.addEventListener("click", () => {
      selectedSlotIdx = idx;
      renderTimeTabs();
      renderDay();
    });
    els.timeTabs.appendChild(btn);
  });
}

function renderDay() {
  const slots = visibleSlots(currentForecast[selectedDayIdx], selectedDayIdx);

  els.regionName.textContent = `${currentRegion.name} — ${currentRegion.spot}`;

  if (slots.length === 0) {
    els.updatedAt.textContent = "No more check-times left today — try Tomorrow.";
    els.skillValue.textContent = "—";
    els.skillScale.querySelectorAll("span").forEach(span => span.classList.remove("active"));
    els.crowdValue.textContent = "—";
    els.crowdBadge.className = "crowd-badge";
    els.metricsGrid.innerHTML = "";
    return;
  }

  const conditions = slots[selectedSlotIdx] ?? slots[0];
  const wc = wallClock(conditions.time);

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
  setState("loading");
  try {
    currentForecast = await fetchForecast(currentRegion);
    // Keep the previously selected day/time-slot when switching regions,
    // just clamped in case the new data has fewer days or slots.
    selectedDayIdx = Math.min(selectedDayIdx, currentForecast.length - 1);
    const slots = visibleSlots(currentForecast[selectedDayIdx], selectedDayIdx);
    selectedSlotIdx = Math.min(selectedSlotIdx, Math.max(slots.length - 1, 0));
    renderDayTabs();
    renderTimeTabs();
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
