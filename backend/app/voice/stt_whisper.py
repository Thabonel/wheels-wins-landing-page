"""Asynchronous speech-to-text using OpenAI Whisper."""

from io import BytesIO
from typing import Optional

from openai import AsyncOpenAI

from app.core.logging import get_logger

logger = get_logger(__name__)


class WhisperSTT:
    """Async wrapper around OpenAI Whisper API."""

    def __init__(self, api_key: Optional[str] = None, model: str = "whisper-1") -> None:
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model

    async def transcribe(self, audio_data: bytes, **kwargs) -> str:
        """Transcribe audio bytes to text."""
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


whisper_stt = WhisperSTT()


async def get_whisper_stt() -> WhisperSTT:
    return whisper_stt
