Contest Monitor: Browser Visibility & Integrity Tracker
A lightweight, local-network browser extension and Python backend designed to monitor focus, tab switching, and window blurring during online coding contests (e.g., Codeforces) to assist in fair-play evaluation [4].

Architecture Overview
[ Participant Laptop ]                          [ Organizer Laptop ]
+----------------------------+                  +----------------------------+
| Chrome Browser             |                  | FastAPI Python Backend     |
|  - Content Script          |  Event Payload   |  - Parses User Details     |
|  - Background Worker  ==== | ===============> |  - Live Terminal Logger    |
|  - Pop-up Configuration    |  (JSON over IP)  |  - (Upcoming Database)     |
+----------------------------+                  +----------------------------+
Content Script (content.js): Injected directly into Codeforces. Listens for browser-level visibility drops (switching tabs, minimizing) and system-level focus losses (Alt+Tab, clicking onto a second monitor) [6].
Lifecycle Safeguard: Intelligent tracking suppresses false-positive "unloading" beeps when navigating page-to-page within Codeforces.
Background Worker (background.js): Pairs focus-loss events with a persistent user UUID and custom handle before transmitting them over the network to the coordinator's server.
Popup (popup.html / popup.js): Provides a visual debug interface for the participant, allowing them to verify their tracking status and enter their display name.
Python Server (main.py): Runs a FastAPI server that receives data streams from all participants over local Wi-Fi, formatting and printing live integrity logs to the console.
👤 Participant / User Guide
1. Download the Extension
Get the extension folder directly from the organizer (via ZIP, shared folder, or a Git clone).
Extract the folder contents to a safe place on your desktop.
2. Install the Extension in Chrome
Open Google Chrome and type chrome://extensions/ in your URL bar.
Enable Developer mode using the toggle switch in the top-right corner.
Click the Load unpacked button in the top-left corner.
Select the extension/ folder you just extracted.
In your extension toolbar (the puzzle piece icon in Chrome), click the pin icon next to Contest Focus Monitor so it sits permanently on your bar.
3. Enter Your Details
Click the extension icon in your Chrome toolbar.
In the input box under "Participant Name / Handle", type your real name or Codeforces handle.
Note: Your unique ID (e.g., usr_x3d892ba193f) is automatically generated and stays persistent across reloads.
4. Active Monitoring
Keep the extension running during your contest.
If you click out of your contest tab, minimize Chrome, or Alt+Tab to another app, you will hear a subtle beep warning you of focus loss, and your event will be logged [6].
Note: Navigating between different problems on Codeforces is safe and will not trigger false warning beeps.
🛠️ Developer / Organizer Guide
1. Configure Server Host Resolution
Before distributing the extension to participants, you must hardcode your computer's local network IP address in the configuration files so their browsers know where to send the focus logs.

Step A: Find Your Local IP Address
Connect your host machine to the shared Wi-Fi network and find its local IP:

Windows (cmd): Run ipconfig and find the "IPv4 Address" under your active Wi-Fi adapter.
Mac/Linux (Terminal): Run ifconfig or ip route (usually starts with 192.168.x.x or 10.x.x.x).
Step B: Update the Extension Source Files
Update the following files in your code before participants load them:

extension/manifest.json: Add your host IP to the allowed domains list so Chrome security doesn't block outgoing transmissions:

"host_permissions": [
  "https://codeforces.com/*",
  "http://YOUR_HOST_IP_HERE:8000/*"
]
extension/background.js: Update the target endpoint fetch destination:

fetch("http://YOUR_HOST_IP_HERE:8000/event", { ... })
2. Spin Up the Backend Server
Run the FastAPI logging server on your coordinator machine. Ensure that the host is bound to 0.0.0.0 so that external network requests can pass through:

Requirements
Install the minimal routing and execution dependencies:

pip install fastapi uvicorn
Run Server
Execute your Python application:

python main.py
(The server will initialize on port 8000 and start accepting multi-client payloads).

3. How to Read Server Terminal Output
When participants switch tabs or Alt+Tab, their devices send structured JSON packets. Your server will process these in real time, showing clearly labeled entries:

============================================================
📥 NEW EVENT RECEIVED
👤 Participant Name : CodeforcesMaster_99
🔑 Participant ID   : usr_7a4bf02e81c3
⚡ Event Type       : PAGE_HIDDEN
⏰ Timestamp        : 2026-09-03 12:25:46.324
🌐 Contest Page URL : https://codeforces.com/problemset
============================================================
⚠️ Troubleshooting
No events showing up on the server?
Ensure both the host server and the participants are on the exact same Wi-Fi network.
Verify that firewalls on the coordinator machine allow incoming connections on port 8000.
Ensure the participant refreshed their active Codeforces page after reloading the extension.
Are warning beeps playing when clicking on Codeforces problems?
Check that content.js successfully registered the beforeunload listener. This should prevent the browser transition states from trigger-firing while navigating internal pages.