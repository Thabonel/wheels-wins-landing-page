# 🚧 Pam 2.0 – Track A Scaffold (FastAPI + Supabase + Gemini)

"""
This scaffold sets up the backend foundation for Pam 2.0.
It includes:
- FastAPI app with health + chat endpoints
- Supabase client integration
- Gemini API wrapper
- Basic project structure
"""

from fastapi import FastAPI, WebSocket
from supabase import create_client, Client
import os
import httpx

# --- Environment Variables ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# --- Initialize Clients ---
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI(title="Pam 2.0 Backend")

# --- Gemini Wrapper ---
async def gemini_chat(prompt: str, context: dict = None) -> str:
    """Send a message to Gemini API and return response."""
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
    headers = {"Authorization": f"Bearer {GEMINI_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            return "Sorry, I'm having trouble right now."

# --- Routes ---
@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/chat")
async def chat(user_id: str, message: str):
    response = await gemini_chat(message)
    # Log to Supabase
    supabase.table("pam_messages").insert({
        "user_id": user_id,
        "role": "user",
        "content": message
    }).execute()
    supabase.table("pam_messages").insert({
        "user_id": user_id,
        "role": "pam",
        "content": response
    }).execute()
    return {"response": response}

@app.websocket("/chat")
async def chat_ws(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        response = await gemini_chat(data)
        await websocket.send_text(response)

# --- Run Scaffold ---
# uvicorn main:app --reload