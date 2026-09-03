// content.js
// Stage 1: watch the contest page for visibility/focus changes and report
// them to the background service worker. This script does NOT read page
// content, keystrokes, clipboard, or any contest-specific data — it only
// observes two standard browser events for the tab it's injected into.

// function sendEvent(type) {
//   const event = {
//     type,                   // "PAGE_HIDDEN" | "PAGE_VISIBLE" | "WINDOW_BLUR" | "WINDOW_FOCUS"
//     timestamp: Date.now(),  // captured at the moment the event fires
//     url: location.href
//   };

//   // The extension context can be invalidated (e.g. on reload/update) while
//   // the page is still open. Don't let that throw and break the contest page.
//   try {
//     chrome.runtime.sendMessage(event);
//   } catch (err) {
//     console.warn("[contest-monitor] could not send event:", err);
//   }
// }

// document.addEventListener("visibilitychange", () => {
//   sendEvent(document.hidden ? "PAGE_HIDDEN" : "PAGE_VISIBLE");
// });

// window.addEventListener("blur", () => sendEvent("WINDOW_BLUR"));
// window.addEventListener("focus", () => sendEvent("WINDOW_FOCUS"));

// // Log the starting state so the very first entry in the log is a baseline,
// // not a gap.
// sendEvent(document.hidden ? "PAGE_HIDDEN" : "PAGE_VISIBLE");




function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Handle browser autoplay policies
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime); // Pitch in Hz
        
        // Quick ramp-up and smooth exponential decay to avoid pops/clicks
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05); // Volume level 20%
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35); // Fade out
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.35);
    } catch (err) {
        console.warn("Audio playback was blocked or failed:", err);
    }
}

// Function to send event messages to background.js
function sendEvent(type) {
    const event = {
        type,
        timestamp: Date.now(),
        url: window.location.href
    };
    try {
        chrome.runtime.sendMessage(event);
    } catch (err) {
        console.log("Error sending event to extension context:", err.message);
    }
}

// Page visibility listener (tab switching)
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        sendEvent("PAGE_HIDDEN");
        playBeep();
    } else {
        sendEvent("PAGE_VISIBLE");
    }
});

// Window focus/blur listeners (Alt+Tab, shifting apps, click on another monitor)
window.addEventListener("blur", () => {
    sendEvent("WINDOW_BLUR");
    playBeep();
});

window.addEventListener("focus", () => {
    sendEvent("WINDOW_FOCUS");
});

// Initial load event
sendEvent("MONITOR_START");