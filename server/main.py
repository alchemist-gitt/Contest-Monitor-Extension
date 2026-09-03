# main.py
# Stage 3/4 Python FastAPI Server for Contest Monitor
# This server receives focus events from separate users, identifies them, and logs them.

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

app = FastAPI(title="Contest Monitor Backend")

# Enable CORS so the extension's background script can make fetch requests to localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits requests from chrome-extension:// origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the structured data payload received from each unique user
class FocusEvent(BaseModel):
    participant_id: str
    participant_name: str
    type: str
    timestamp: int
    url: Optional[str] = None

@app.get("/")
def read_root():
    return {"status": "active", "message": "Contest Monitor Server is running."}

@app.post("/event")
def receive_event(event: FocusEvent):
    # Convert milliseconds timestamp to a readable datetime
    dt_object = datetime.fromtimestamp(event.timestamp / 1000.0)
    readable_time = dt_object.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    
    # Print a beautiful, clearly-identified log to the server console
    print(f"\n" + "="*60)
    print(f"📥 NEW EVENT RECEIVED")
    print(f"👤 Participant Name : {event.participant_name}")
    print(f"🔑 Participant ID   : {event.participant_id}")
    print(f"⚡ Event Type       : {event.type}")
    print(f"⏰ Timestamp        : {readable_time} ({event.timestamp})")
    print(f"🌐 Contest Page URL : {event.url or 'N/A'}")
    print("="*60 + "\n")
    
    # Ready-to-go response mapping
    return {
        "status": "success",
        "logged_for": {
            "id": event.participant_id,
            "name": event.participant_name
        },
        "received_event": event.type
    }

if __name__ == "__main__":
    import uvicorn
    # Start the server on port 8000
    print("Starting Contest Monitor FastAPI server on http://127.0.0.1:8000...")
    uvicorn.run(app, host="127.0.0.1", port=8000)