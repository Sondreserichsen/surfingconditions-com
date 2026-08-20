const els = {
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  content: document.getElementById("content"),
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

function setState(state) {
  els.loading.classList.toggle("hidden", state !== "loading");
  els.error.classList.toggle("hidden", state !== "error");
  els.content.classList.toggle("hidden", state !== "ready");
}

function render(region, conditions) {
  els.regionName.textContent = `${region.name} — ${region.spot}`;
  els.updatedAt.textContent = `Conditions for ${new Date(conditions.time).toLocaleString("en-AU", { timeZone: region.timezone })}`;

  const { level } = skillLevelFor(conditions);
  els.skillValue.textContent = level;

  els.skillScale.querySelectorAll("span").forEach(span => {
    span.classList.toggle("active", span.dataset.level === level);
  });

  const localDate = new Date(new Date().toLocaleString("en-US", { timeZone: region.timezone }));
  const crowd = crowdEstimateFor(conditions, localDate);
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
  const region = REGIONS[key];
  setState("loading");
  try {
    const conditions = await fetchConditions(region);
    render(region, conditions);
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
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  loadRegion(btn.dataset.region);
});

loadRegion("sunshine-coast");
