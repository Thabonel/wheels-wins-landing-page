"""Utilities for extracting travel information from transcripts."""

from __future__ import annotations

import json
import logging
import re
from typing import Iterable, List, Optional

from openai import AsyncOpenAI
from pydantic import BaseModel, Field, ValidationError

logger = logging.getLogger(__name__)


class TripData(BaseModel):
    """Structured representation of a trip."""

    start_location: Optional[str] = None
    end_location: Optional[str] = None
    waypoints: List[str] = Field(default_factory=list)
    duration_days: Optional[int] = None
    highlights: List[str] = Field(default_factory=list)
    costs: Optional[str] = None
    campgrounds: List[str] = Field(default_factory=list)
    route_description: Optional[str] = None
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class TripExtractor:
    """Extract trip details from transcripts using GPT-4 with fallback heuristics."""

    def __init__(self, client: Optional[AsyncOpenAI] = None) -> None:
        self.client = client or AsyncOpenAI()

    # -----------------------------------------------------
    # Public API
    # -----------------------------------------------------
    async def extract(self, transcript: str) -> TripData:
        """Extract trip data from a single transcript."""
        if not transcript.strip():
            logger.warning("Transcript is empty")
            return TripData()

        prompt = self._build_prompt(transcript)
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            content = response.choices[0].message.content
            data = json.loads(content)
            trip = TripData.model_validate(data)
            return self._validate(trip)
        except Exception as exc:
            logger.error("GPT extraction failed: %s", exc)
            return self._fallback_extract(transcript)

    async def batch_extract(self, transcripts: Iterable[str]) -> List[TripData]:
        """Process multiple transcripts sequentially."""
        results: List[TripData] = []
        for t in transcripts:
            results.append(await self.extract(t))
        return results

    # -----------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------
    def _build_prompt(self, transcript: str) -> str:
        return (
            "You are a helpful travel assistant. "
            "Extract any RV trip information from the transcript below. "
            "Return JSON with these fields: "
            "start_location, end_location, waypoints (list), duration_days (integer), "
            "highlights (list), costs (string), campgrounds (list), route_description, "
            "confidence (0 to 1 indicating your certainty). "
            "Use null or empty lists if unsure.\n\n"
            f"Transcript:\n{transcript}"
        )

    def _validate(self, trip: TripData) -> TripData:
        missing = [
            field
            for field in ["start_location", "end_location", "route_description"]
            if not getattr(trip, field)
        ]
        if missing:
            logger.warning("Missing fields in extracted trip: %s", ", ".join(missing))
            trip.confidence *= 0.5
        return trip

    def _fallback_extract(self, transcript: str) -> TripData:
        """Best-effort regex extraction used when GPT fails."""
        start = end = None
        match = re.search(r"from\s+(?P<start>[A-Za-z ,]+?)\s+to\s+(?P<end>[A-Za-z ,]+)", transcript, re.I)
        if match:
            start = match.group("start").strip()
            end = match.group("end").strip()
        waypoints = re.findall(r"stop(?:ping)?\s+at\s+([A-Za-z ,]+)", transcript, re.I)
        trip = TripData(
            start_location=start,
            end_location=end,
            waypoints=[w.strip() for w in waypoints],
            confidence=0.3,
        )
        return self._validate(trip)

