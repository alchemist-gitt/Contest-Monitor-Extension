from fastapi import FastAPI

app = FastAPI()

@app.post("/event")
def receive_event(event: dict):
    print("EVENT RECEIVED:", event)
    return {"status": "ok"}