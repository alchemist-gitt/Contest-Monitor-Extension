// popup.js
// Renders the event log stored by background.js, and manages participant identification.

const ALERT_TYPES = new Set(["PAGE_HIDDEN", "WINDOW_BLUR"]);

function generateShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'usr_';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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
    log.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 12px;">No events yet — switch tabs or Alt+Tab on the test page.</div>';
    return;
  }
  
  const rows = events.slice().reverse().map(e => {
    const isAlert = ALERT_TYPES.has(e.type);
    const typeClass = isAlert ? "alert" : "ok";
    return `<div class="log-row">
      <span class="log-type ${typeClass}">${e.type}</span>
      <span class="log-time">${formatTime(e.timestamp)}</span>
    </div>`;
  }).join("");
  
  log.innerHTML = rows;
}

function load() {
  // Load and display participant identification
  chrome.storage.local.get({ participantId: null, participantName: "", events: [] }, (data) => {
    let pid = data.participantId;
    if (!pid) {
      pid = generateShortId();
      chrome.storage.local.set({ participantId: pid });
    }
    
    document.getElementById("userIdDisplay").textContent = pid;
    document.getElementById("username").value = data.participantName || "";
    
    render(data.events || []);
  });
}

// Save participant name automatically as they type
document.getElementById("username").addEventListener("input", (e) => {
  const name = e.target.value.trim();
  chrome.storage.local.set({ participantName: name });
  
  const saveStatus = document.getElementById("saveStatus");
  saveStatus.style.display = "inline";
  setTimeout(() => {
    saveStatus.style.display = "none";
  }, 1000);
});

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
