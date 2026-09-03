// background.js (Manifest V3 service worker)
// Stage 1: receive visibility/focus events from content.js and keep the
// most recent ones in chrome.storage.local so the popup can show them.
// Nothing leaves this machine yet — sending to a server is Stage 3.

const MAX_EVENTS = 500;

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message || !message.type || !message.timestamp) return;
  console.log("🔥 BACKGROUND RECEIVED:", message);
  fetch("http://100.130.114.40:8000/event", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            type: message.type,
            timestamp: message.timestamp,
            
            
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Server received event:", data);
    })
    .catch(error => {
        console.error("Could not reach server:", error);
    });

  const event = {
    type: message.type,
    timestamp: message.timestamp,
    tabId: sender.tab ? sender.tab.id : null,
    url: message.url || (sender.tab ? sender.tab.url : null)
  };

  chrome.storage.local.get({ events: [] }, ({ events }) => {


    events.push(event);
    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS);
    }
    chrome.storage.local.set({ events });

    
  });

  console.log("[contest-monitor]", event.type, new Date(event.timestamp).toISOString());
});
