// popup.js
// Renders the event log stored by background.js. Purely a debug view for
// Stage 1 — the real dashboard (server-backed, multi-participant) is Stage 5.

const ALERT_TYPES = new Set(["PAGE_HIDDEN", "WINDOW_BLUR"]);

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

function render(events) {
  const log = document.getElementById("log");
  const alertCount = events.filter(e => ALERT_TYPES.has(e.type)).length;
  const okCount = events.length - alertCount;

  document.getElementById("alertCount").textContent = alertCount;
  document.getElementById("okCount").textContent = okCount;

  if (events.length === 0) {
    log.innerHTML = '<div class="empty">No events yet — switch tabs or Alt+Tab on the test page.</div>';
    return;
  }

  const rows = events.slice().reverse().map(e => {
    const isAlert = ALERT_TYPES.has(e.type);
    const dotClass = isAlert ? "alert" : "ok";
    return `<div class="row">
      <span class="dot ${dotClass}"></span>
      <span class="type">${e.type}</span>
      <span class="time">${formatTime(e.timestamp)}</span>
    </div>`;
  }).join("");

  log.innerHTML = rows;
}

function load() {
  chrome.storage.local.get({ events: [] }, ({ events }) => render(events));
}

document.getElementById("clear").addEventListener("click", () => {
  chrome.storage.local.set({ events: [] }, load);
});

// Live-update while the popup is open.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.events) {
    render(changes.events.newValue || []);
  }
});

load();
