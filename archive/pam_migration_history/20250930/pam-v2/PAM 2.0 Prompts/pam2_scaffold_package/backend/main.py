from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

class ChatRequest(BaseModel):
    message: str
    user_id: str

class ChatResponse(BaseModel):
    response: str

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    # Placeholder PAM response
    return ChatResponse(response=f"PAM heard: {req.message}")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "pam-2.0-backend"}
