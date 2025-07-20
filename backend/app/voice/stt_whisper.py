"""Asynchronous speech-to-text using OpenAI Whisper."""

from io import BytesIO
from typing import Optional

from openai import AsyncOpenAI

from app.core.logging import get_logger

logger = get_logger(__name__)


class WhisperSTT:
    """Async wrapper around OpenAI Whisper API."""

    def __init__(self, api_key: Optional[str] = None, model: str = "whisper-1") -> None:
        try:
            self.client = AsyncOpenAI(api_key=api_key)
        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI client: {e}. Using mock client.")
            self.client = None
        self.model = model

    async def transcribe(self, audio_data: bytes, **kwargs) -> str:
        """Transcribe audio bytes to text."""
        if self.client is None:
            logger.error("OpenAI client not available - speech-to-text requires valid API key")
            raise RuntimeError("Speech-to-text service not configured. OpenAI API key required.")
        
        try:
            file_obj = BytesIO(audio_data)
            file_obj.name = "audio.wav"
            response = await self.client.audio.transcriptions.create(
                model=self.model,
                file=file_obj,
                response_format="text",
                **kwargs,
            )
            return response
        except Exception as exc:
            logger.error(f"Whisper transcription failed: {exc}")
            raise


try:
    from app.core.config import settings
    whisper_stt = WhisperSTT(api_key=settings.OPENAI_API_KEY)
except Exception as e:
    logger.warning(f"Failed to initialize WhisperSTT with config: {e}")
    # Don't create a dummy instance - let it fail properly
    whisper_stt = WhisperSTT(api_key=None)


async def get_whisper_stt() -> WhisperSTT:
    return whisper_stt
