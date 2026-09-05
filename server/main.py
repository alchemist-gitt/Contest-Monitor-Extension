# main-v2.py
# Stage 4 Python FastAPI Server for Contest Monitor
# This server receives focus events from separate users, identifies them,
# and saves logs both globally in SQLite and individually per user in separate files.

import os
import threading
import csv
import sqlite3
import re
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from pathlib import Path
from playsound3 import playsound
app = FastAPI(title="Contest Monitor Backend - Stage 4")

lastBlur = time.perf_counter()

# Enable CORS so the extension's background script can make fetch requests from other devices
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits requests from chrome-extension:// origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATABASE_FILE = "contest_monitor.db"
LOGS_DIR = Path("user_logs")
SOUNDS_DIR=Path("sounds")
# Ensure the logs directory exists
LOGS_DIR.mkdir(exist_ok=True)
SOUNDS_DIR.mkdir(exist_ok=True)

#sound loading and playing
def play_participant_sound(participant_name: str):
    if(participant_name=="shaurya"):
        sound_file=sound_file = SOUNDS_DIR / f"{participant_name}.mp3"
    else:
        sound_file = SOUNDS_DIR / f"{participant_name}.m4a"
    

    if not sound_file.exists():
        sound_file = SOUNDS_DIR / "shaurya.mp3"

    if not sound_file.exists():
        print(
            f"⚠️ No sound found for participant "
            f"{participant_name}"
        )
        return

    try:
        print(f"🔊 Playing: {sound_file}")
        playsound(str(sound_file))

    except Exception as e:
        print(f"❌ Audio error: {e}")


# Database Initialization
def init_db():
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            participant_id TEXT NOT NULL,
            participant_name TEXT NOT NULL,
            event_type TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            readable_time TEXT NOT NULL,
            url TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()


# Define the structured data payload received from each unique user
class FocusEvent(BaseModel):
    participant_id: str
    participant_name: str
    type: str
    timestamp: int
    url: Optional[str] = None


def sanitize_filename(name: str) -> str:
    """Sanitizes a participant's name to ensure it forms a safe filename."""
    # Replace spaces with underscores and remove any non-alphanumeric/dash/underscore chars
    safe = re.sub(r'\s+', '_', name)
    safe = re.sub(r'[^\w\-]', '', safe)
    return safe or "Anonymous"


def log_to_user_file(event: FocusEvent, readable_time: str):
    """Saves the event to a dedicated CSV file for the specific user."""
    safe_name = sanitize_filename(event.participant_name)
    user_file = LOGS_DIR / f"{event.participant_id}_{safe_name}.csv"
    
    file_exists = user_file.exists()
    
    with open(user_file, mode="a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            # Write header if this is the user's first log entry
            writer.writerow(["Timestamp", "Readable_Time", "Event_Type", "URL"])
        
        writer.writerow([
            event.timestamp,
            readable_time,
            event.type,
            event.url or "N/A"
        ])


def log_to_database(event: FocusEvent, readable_time: str):
    """Saves the event details globally into the centralized SQLite database."""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO events (participant_id, participant_name, event_type, timestamp, readable_time, url)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        event.participant_id,
        event.participant_name,
        event.type,
        event.timestamp,
        readable_time,
        event.url
    ))
    conn.commit()
    conn.close()


@app.get("/")

def read_root():
    return {
        "status": "active",
        "message": "Contest Monitor Server - Stage 4 is running.",
        "database": DATABASE_FILE,
        "logs_directory": str(LOGS_DIR)
    }
def get_previous_event(participant_id: str):
    """
    Gets the most recent event for this participant
    from the SQLite database.
    """

    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT event_type, url, timestamp
        FROM events
        WHERE participant_id = ?
        ORDER BY id DESC
        LIMIT 1
    """, (participant_id,))

    row = cursor.fetchone()
    conn.close()

    if row is None:
        return None

    return {
        "type": row[0],
        "url": row[1],
        "timestamp": row[2]
    }

@app.post("/event")

def receive_event(event: FocusEvent):
    # Convert milliseconds timestamp to a readable datetime format
    dt_object = datetime.fromtimestamp(event.timestamp / 1000.0)
    readable_time = dt_object.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    global lastBlur
    try:
        curr_event = event
        previous_event = get_previous_event(event.participant_id)

        should_play_sound = False;

        if(curr_event.type=="MONITOR_START"):
            print("running")
            should_play_sound=False;
        
        else:
            if(previous_event is not None):

                if(curr_event.type == "WINDOW_BLUR" and curr_event.url==previous_event["url"]):
                    lastBlur = time.perf_counter()
                    print("lastblur: ",lastBlur)
                    should_play_sound = False
                elif(curr_event.type == "WINDOW_FOCUS"):
                    focusTime=time.perf_counter()
                    elapsedTime=focusTime-lastBlur
                    print("elapsedTime: ",elapsedTime)
                    should_play_sound=elapsedTime>1.2

                    
            

        




        # 1. central structured database
        log_to_database(event, readable_time)
        
        # 2. individual, isolated log file for this specific user
        log_to_user_file(event, readable_time)
        
    except Exception as e:
        # Print internal server errors to the terminal so the developer can troubleshoot
        print(f"❌ Error saving event: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error saving logs.")

    try:
        if(should_play_sound):
            threading.Thread(
                target=play_participant_sound,
                args=(event.participant_id,),
                daemon=True
            ).start()
    except Exception as e:
        print(f"error in playing sound : {e}")
    
    # Beautiful server-side console printout
    # print(f"\n" + "="*60)
    # print(f" NEW EVENT RECORDED (Saved to Database & Individual Log)")
    # print(f" Participant Name : {event.participant_name}")
    # print(f" Participant ID   : {event.participant_id}")
    # print(f" Event Type       : {event.type}")
    # print(f" Timestamp        : {readable_time}")
    # print(f" Log File         : {LOGS_DIR}/{event.participant_id}_{sanitize_filename(event.participant_name)}.csv")
    # print(f"url :{event.url}")
    # print("="*60 + "\n")
    
    return {
        "status": "success",
        "logged_for": {
            "id": event.participant_id,
            "name": event.participant_name
        },
        "received_event": event.type,
        "saved_to_disk": True
    }


# Optional: Helper endpoint to view active participants and their event counts
@app.get("/participants")
def list_participants():
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT participant_id, participant_name, COUNT(*), MAX(readable_time)
        FROM events
        GROUP BY participant_id
    """)
    rows = cursor.fetchall()
    conn.close()
    
    return [
        {
            "id": r[0],
            "name": r[1],
            "total_events": r[2],
            "last_active": r[3]
        }
        for r in rows
    ]


if __name__ == "__main__":
    import uvicorn
    print("Starting Contest Monitor FastAPI server on http://127.0.0.1:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
