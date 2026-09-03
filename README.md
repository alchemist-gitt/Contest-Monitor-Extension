# Contest Monitor

A Chrome extension + local server for fair peer coding contests. Built in stages.

## Stages

```
Stage 1 (this drop)   Extension detects visibility/blur/focus, logs locally
Stage 2               Extension plays a warning sound on violation
Stage 3               Extension POSTs/WebSockets events to a local FastAPI server
Stage 4               FastAPI timestamps + stores events in SQLite
Stage 5               Live dashboard (served by FastAPI) shows events per participant
```

Only Stage 1 is implemented right now — the `extension/` folder. `server/` and
`dashboard/` don't exist yet; they get created in later stages.

## Folder structure (target, for reference)

```
contest-monitor/
├── extension/              # Stage 1 ← built now
│   ├── manifest.json
│   ├── content.js
│   ├── background.js
│   ├── popup.html
│   └── popup.js
├── server/                 # Stage 3+ (not built yet)
│   ├── main.py
│   ├── database.py
│   └── requirements.txt
├── dashboard/               # Stage 5 (not built yet)
│   └── index.html
└── test-page/               # scratch page for testing only, not part of the product
    └── index.html
```

## Stage 1: what it does

- `content.js` runs on the contest page and listens for:
  - `visibilitychange` → tab switched, minimized, or moved to another virtual desktop
  - `blur` / `focus` → the browser window itself lost/regained OS-level focus (e.g. Alt+Tab
    to another app, or clicking a second monitor)
- Each event is timestamped **at the moment it happens** and handed to `background.js`
  (the MV3 service worker) via `chrome.runtime.sendMessage`.
- `background.js` keeps the last 500 events in `chrome.storage.local` (nothing leaves
  the machine yet — that's Stage 3).
- `popup.html` / `popup.js` is a small debug view so you can watch events arrive live
  while you test, with a button to clear the log.

It does **not** read page content, keystrokes, clipboard, screen, microphone, or files.
It only observes the two browser APIs above for the tab it's injected into.

## Try it

1. **Load the extension**
   - Go to `chrome://extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked" → select the `extension/` folder
   - Pin the extension so you can see its popup

2. **Serve a test page** (stand-in for your real contest site — `test-page/index.html`
   is just a blank page for triggering events against, since the extension is currently
   scoped to `http://localhost/*`)
   ```bash
   cd test-page
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000/` in Chrome.

3. **Trigger events** and watch the popup update live:
   - Switch to another tab → `PAGE_HIDDEN`
   - Switch back → `PAGE_VISIBLE`
   - Alt+Tab to another application → `WINDOW_BLUR`
   - Alt+Tab back → `WINDOW_FOCUS`
   - Minimize the window → `PAGE_HIDDEN` (and usually `WINDOW_BLUR` too)

4. When you're ready to point it at your real contest site, edit the two URL lists
   in `manifest.json` (`host_permissions` and `content_scripts[0].matches`).

## What Stage 1 can and can't tell you

**Reliable:**
- Tab switches and window minimizing (`visibilitychange`)
- The browser window losing OS focus to another app or monitor (`blur`/`focus`)
- Combining both signals catches the case a single one misses — e.g. on some
  multi-monitor setups a window can lose focus without ever becoming "hidden."

**Not reliable / not possible from a content script:**
- *What* the participant switched to (another IDE, ChatGPT, their phone) — only that
  focus left the page. Distinguishing destinations needs OS-level software, which is
  a different category of tool than a browser extension.
- A second physical device (phone, second laptop) is invisible to this extension entirely.
- A participant who disables or removes the extension — they control their own browser,
  so this is a *fair-play aid*, not a tamper-proof anti-cheat boundary. Extensions like
  "Disable Page Visibility" exist specifically to suppress these exact signals.
- Exact browser/OS behavior for `blur` on some virtual-desktop switches varies slightly
  by platform — treat single missed events as noise, and look at patterns over the
  contest rather than any one event in isolation.

Later stages (fullscreen-exit detection, server-side logging, optional stricter lockdown)
build on top of this rather than trying to fix these fundamental limits.
