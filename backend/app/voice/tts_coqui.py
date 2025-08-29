"""Asynchronous text-to-speech using Coqui TTS."""

from io import BytesIO
from typing import Optional
import asyncio

from TTS.api import TTS
import soundfile as sf

from app.core.logging import get_logger

logger = get_logger(__name__)


class CoquiTTS:
    """Async wrapper around Coqui TTS models."""

    def __init__(self, model_name: str = "tts_models/en/vctk/vits") -> None:
        self.tts = TTS(model_name=model_name, progress_bar=False, gpu=False)

    async def synthesize(self, text: str, **kwargs) -> bytes:
        """Synthesize speech from text and return WAV bytes."""
        loop = asyncio.get_event_loop()
        wav, sr = await loop.run_in_executor(None, lambda: self.tts.tts(text, **kwargs))
        buffer = BytesIO()
        await loop.run_in_executor(None, lambda: sf.write(buffer, wav, sr, format="WAV"))
        return buffer.getvalue()


coqui_tts = CoquiTTS()


async def get_coqui_tts() -> CoquiTTS:
    return coqui_tts
