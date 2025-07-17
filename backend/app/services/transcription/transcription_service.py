"""Media transcription service using AssemblyAI."""

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import get_settings
from app.services.database import DatabaseService
from app.api.editing_hub import hub
from app.services.cache_service import cache_service, CacheService

settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class TranscriptionResult:
    """Container for transcription output."""

    text: str
    segments: List[Dict[str, Any]]


class TranscriptionService:
    """Service for transcribing media files with progress updates."""

    def __init__(
        self,
        http_client: Optional[httpx.AsyncClient] = None,
        db: Optional[DatabaseService] = None,
        cache: Optional[CacheService] = None,
    ) -> None:
        self.http_client = http_client or httpx.AsyncClient()
        self.db = db or DatabaseService()
        self.cache = cache or cache_service
        self.api_key = getattr(settings, "ASSEMBLYAI_API_KEY", None)
        self.base_url = "https://api.assemblyai.com/v2"

    async def _get_cached_result(self, file_id: str) -> Optional[TranscriptionResult]:
        cache_key = f"transcription:{file_id}"
        cached = await self.cache.get(cache_key, use_pickle=True)
        if cached:
            return cached
        return None

    async def _upload_to_assemblyai(self, file_path: str) -> str:
        headers = {"authorization": self.api_key}
        with open(file_path, "rb") as f:
            response = await self.http_client.post(
                f"{self.base_url}/upload", data=f, headers=headers
            )
        response.raise_for_status()
        return response.json()["upload_url"]

    async def _start_transcription(self, upload_url: str) -> str:
        headers = {
            "authorization": self.api_key,
            "content-type": "application/json",
        }
        payload = {"audio_url": upload_url, "speaker_labels": True}
        response = await self.http_client.post(
            f"{self.base_url}/transcript", json=payload, headers=headers
        )
        response.raise_for_status()
        return response.json()["id"]

    async def _get_transcript(self, transcript_id: str) -> Dict[str, Any]:
        headers = {"authorization": self.api_key}
        response = await self.http_client.get(
            f"{self.base_url}/transcript/{transcript_id}", headers=headers
        )
        response.raise_for_status()
        return response.json()

    async def _store_result(self, file_id: str, result: TranscriptionResult) -> None:
        if not self.db.client:
            return
        try:
            self.db.client.table("media_transcripts").insert(
                {
                    "file_id": file_id,
                    "text": result.text,
                    "segments": result.segments,
                    "created_at": datetime.utcnow().isoformat(),
                }
            ).execute()
            await self.cache.set(
                f"transcription:{file_id}",
                result,
                ttl=86400,
                use_pickle=True,
            )
        except Exception as exc:  # pragma: no cover - best effort
            logger.warning(f"Failed to store transcript: {exc}")

    async def transcribe_media(
        self, file_path: str, file_id: str, websocket: Optional[Any] = None
    ) -> TranscriptionResult:
        """Transcribe media file and stream progress."""
        if not self.api_key:
            raise RuntimeError("ASSEMBLYAI_API_KEY not configured")

        cached = await self._get_cached_result(file_id)
        if cached:
            if websocket is not None:
                await hub.send_progress(websocket, "TranscriptionProgress", 100, "cached")
            return cached

        upload_url = await self._upload_to_assemblyai(file_path)
        transcript_id = await self._start_transcription(upload_url)

        while True:
            status = await self._get_transcript(transcript_id)
            progress = status.get("words", [])
            percent = 0
            if status["status"] == "completed":
                percent = 100
            elif progress:
                percent = min(int(len(progress) / max(status.get("word_count", 1), 1) * 100), 99)

            if websocket is not None:
                await hub.send_progress(
                    websocket,
                    "TranscriptionProgress",
                    percent,
                    status.get("status", "queued"),
                )

            if status["status"] == "completed":
                text = status.get("text", "")
                segments = status.get("utterances", []) or []
                result = TranscriptionResult(text=text, segments=segments)
                await self._store_result(file_id, result)
                return result

            if status["status"] == "error":
                raise RuntimeError(status.get("error", "Unknown error"))

            await asyncio.sleep(1)


transcription_service = TranscriptionService()
