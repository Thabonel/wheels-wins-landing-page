from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from app.core.config import get_settings
from app.core.logging import setup_logging

router = APIRouter()
logger = setup_logging()

class VoiceRequest(BaseModel):
    text: str

class VoiceResponse(BaseModel):
    audio: list[int]
    duration: int
    cached: bool

@router.post("/voice", response_model=VoiceResponse)
async def generate_voice(payload: VoiceRequest):
    """Generate speech audio from text via Supabase function."""
    settings = get_settings()
    supabase_url = settings.SUPABASE_URL.rstrip('/')
    function_url = f"{supabase_url}/functions/v1/nari-dia-tts"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
        "apikey": settings.SUPABASE_KEY,
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(function_url, json={"text": payload.text}, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return VoiceResponse(**data)
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate audio")
