"""Quality control utilities for extracted trip data."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from .trip_extractor import TripData

try:
    from geopy.geocoders import Nominatim
except Exception:  # pragma: no cover - optional dependency
    Nominatim = None  # type: ignore

logger = logging.getLogger(__name__)


@dataclass
class TripValidator:
    """Validate fields of a :class:`TripData`."""

    def validate(self, trip: TripData) -> List[str]:
        errors: List[str] = []
        if not trip.start_location:
            errors.append("start_location missing")
        if not trip.end_location:
            errors.append("end_location missing")
        if trip.duration_days is not None and trip.duration_days <= 0:
            errors.append("duration_days must be positive")
        return errors


@dataclass
class DuplicateDetector:
    """Detect duplicate trips based on start/end/duration."""

    seen: set[Tuple[str, str, Optional[int]]] = field(default_factory=set)

    def is_duplicate(self, trip: TripData) -> bool:
        key = (
            (trip.start_location or "").lower(),
            (trip.end_location or "").lower(),
            trip.duration_days,
        )
        if key in self.seen:
            return True
        self.seen.add(key)
        return False


@dataclass
class GeoValidator:
    """Verify that locations exist using geocoding."""

    geocoder: Optional[Nominatim] = field(default=None, init=False)

    def __post_init__(self) -> None:
        if Nominatim:
            try:
                self.geocoder = Nominatim(user_agent="trip_quality")
            except Exception as exc:  # pragma: no cover - network failure
                logger.warning("Failed to init geocoder: %s", exc)
                self.geocoder = None

    def validate(self, location: Optional[str]) -> bool:
        if not location:
            return False
        if not self.geocoder:
            return True
        try:
            result = self.geocoder.geocode(location, timeout=10)
            return result is not None
        except Exception:  # pragma: no cover - network failure
            return True


@dataclass
class ContentFilter:
    """Filter out low quality or irrelevant trips."""

    banned_words: List[str] = field(default_factory=lambda: ["test", "lorem", "spam"])

    def is_allowed(self, trip: TripData) -> bool:
        text = " ".join(
            [
                trip.start_location or "",
                trip.end_location or "",
                trip.route_description or "",
                " ".join(trip.highlights),
            ]
        ).lower()
        return not any(word in text for word in self.banned_words)


@dataclass
class ManualReviewQueue:
    """Store trips that require human review."""

    items: List[Tuple[TripData, str]] = field(default_factory=list)

    def flag(self, trip: TripData, reason: str) -> None:
        self.items.append((trip, reason))

    def get_pending(self) -> List[Tuple[TripData, str]]:
        return list(self.items)

    def approve(self, trip: TripData) -> None:
        self.items = [item for item in self.items if item[0] != trip]


@dataclass
class DataEnricher:
    """Enrich trips with geocoding information."""

    geovalidator: GeoValidator

    def enrich(self, trip: TripData) -> Dict[str, Tuple[float, float]]:
        coords: Dict[str, Tuple[float, float]] = {}
        if not self.geovalidator.geocoder:
            return coords
        for field_name in ["start_location", "end_location"] + trip.waypoints:
            location = getattr(trip, field_name, None) if hasattr(trip, field_name) else field_name
            try:
                result = self.geovalidator.geocoder.geocode(location, timeout=10)
                if result:
                    coords[location] = (result.latitude, result.longitude)
            except Exception:  # pragma: no cover - network failure
                continue
        return coords


@dataclass
class QualityMetrics:
    """Track metrics for processed trips."""

    processed: int = 0
    valid: int = 0
    duplicates: int = 0
    flagged: int = 0

    def report(self) -> Dict[str, int]:
        return {
            "processed": self.processed,
            "valid": self.valid,
            "duplicates": self.duplicates,
            "flagged": self.flagged,
        }


@dataclass
class QualityControl:
    """Orchestrate validation, scoring, and enrichment."""

    validator: TripValidator = field(default_factory=TripValidator)
    dedupe: DuplicateDetector = field(default_factory=DuplicateDetector)
    geovalidator: GeoValidator = field(default_factory=GeoValidator)
    content_filter: ContentFilter = field(default_factory=ContentFilter)
    review_queue: ManualReviewQueue = field(default_factory=ManualReviewQueue)
    metrics: QualityMetrics = field(default_factory=QualityMetrics)

    def score(self, trip: TripData, errors: List[str], geo_ok: bool) -> float:
        score = 1.0
        if errors:
            score -= 0.2 * len(errors)
        if not geo_ok:
            score -= 0.2
        if not trip.route_description:
            score -= 0.1
        if len(trip.highlights) < 1:
            score -= 0.1
        return max(0.0, min(1.0, score))

    def process(self, trip: TripData) -> Tuple[float, Dict[str, Tuple[float, float]]]:
        self.metrics.processed += 1
        errors = self.validator.validate(trip)
        geo_ok = self.geovalidator.validate(trip.start_location) and self.geovalidator.validate(
            trip.end_location
        )
        duplicate = self.dedupe.is_duplicate(trip)
        allowed = self.content_filter.is_allowed(trip)

        if duplicate:
            self.metrics.duplicates += 1
            self.review_queue.flag(trip, "duplicate")
        if errors or not geo_ok or not allowed:
            self.metrics.flagged += 1
            reasons = ", ".join(errors)
            if not geo_ok:
                reasons += ", invalid location"
            if not allowed:
                reasons += ", banned content"
            self.review_queue.flag(trip, reasons.strip(", "))

        if not errors and geo_ok and allowed and not duplicate:
            self.metrics.valid += 1

        score = self.score(trip, errors, geo_ok)
        enrichment = DataEnricher(self.geovalidator).enrich(trip)
        return score, enrichment


__all__ = [
    "TripValidator",
    "DuplicateDetector",
    "GeoValidator",
    "ContentFilter",
    "ManualReviewQueue",
    "DataEnricher",
    "QualityMetrics",
    "QualityControl",
]
