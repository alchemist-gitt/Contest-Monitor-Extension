// // background.js (Manifest V3 service worker)
// // Stage 1: receive visibility/focus events from content.js and keep the
// // most recent ones in chrome.storage.local so the popup can show them.
// // Nothing leaves this machine yet — sending to a server is Stage 3.

// const MAX_EVENTS = 500;

// chrome.runtime.onMessage.addListener((message, sender) => {
//   if (!message || !message.type || !message.timestamp) return;
//   console.log("🔥 BACKGROUND RECEIVED:", message);
//   fetch("http://100.130.114.40:8000/event", {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//             type: message.type,
//             timestamp: message.timestamp,
//             url:message.url
            
            
//         })
//     })
//     .then(response => response.json())
//     .then(data => {
//         console.log("Server received event:", data);
//     })
//     .catch(error => {
//         console.error("Could not reach server:", error);
//     });

//   const event = {
//     type: message.type,
//     timestamp: message.timestamp,
//     tabId: sender.tab ? sender.tab.id : null,
//     url: message.url || (sender.tab ? sender.tab.url : null)
//   };

//   chrome.storage.local.get({ events: [] }, ({ events }) => {


//     events.push(event);
//     if (events.length > MAX_EVENTS) {
//       events.splice(0, events.length - MAX_EVENTS);
//     }
//     chrome.storage.local.set({ events });

    
//   });

//   console.log("[contest-monitor]", event.type, new Date(event.timestamp).toISOString());
// });

const MAX_EVENTS = 500;

function generateShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'usr_';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message || !message.type || !message.timestamp) return;
  console.log("🔥 BACKGROUND RECEIVED:", message);



















  // Retrieve user identity details from chrome.storage.local
  chrome.storage.local.get({ participantId: null, participantName: "", events: [] }, (data) => {
    let pid = data.participantId;
    if (!pid) {
      pid = generateShortId();
      chrome.storage.local.set({ participantId: pid });
    }
    
    const name = data.participantName.trim() || "Anonymous";
    const eventUrl = message.url || (sender.tab ? sender.tab.url : null);

    // POST the event to the local Python server with User Identification attached!
    fetch("http://100.130.114.40:8000/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        participant_id: pid,
        participant_name: name,
        type: message.type,
        timestamp: message.timestamp,
        url: eventUrl
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Server successfully recorded event:", data);
    })
    .catch(error => {
      console.error("Could not reach Python server:", error.message);
    });

    // Also store locally for the popup debug view
    const event = {
      type: message.type,
      timestamp: message.timestamp,
      tabId: sender.tab ? sender.tab.id : null,
      url: eventUrl,
      participantId: pid,
      participantName: name
    };

    const events = data.events || [];
    events.push(event);
    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS);
    }
    
    chrome.storage.local.set({ events });
    console.log("[contest-monitor]", event.type, new Date(event.timestamp).toISOString());
  });
});