from __future__ import annotations

"""Lightweight Supabase client and trip template storage."""

from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

import logging

try:
    from pydantic import BaseModel, Field, validator
except Exception:  # pragma: no cover - fallback when dependency missing
    BaseModel = object  # type: ignore
    Field = lambda default=None, **_: default  # type: ignore
    def validator(*args, **kwargs):  # type: ignore
        def wrap(f):
            return f
        return wrap

try:
    from supabase import create_client, Client
except Exception:  # pragma: no cover - supabase optional
    Client = Any  # type: ignore

    def create_client(*args: Any, **kwargs: Any) -> Any:  # type: ignore
        class MockClient:
            def __getattr__(self, name: str) -> Any:
                return lambda *a, **k: None
        return MockClient()

logger = logging.getLogger(__name__)


class TripTemplate(BaseModel):
    """Schema for a stored trip template."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    start_location: str
    end_location: str
    waypoints: List[str] = Field(default_factory=list)
    duration_days: Optional[int] = None
    highlights: List[str] = Field(default_factory=list)
    costs: Optional[str] = None
    campgrounds: List[str] = Field(default_factory=list)
    route_description: Optional[str] = None
    creator_id: Optional[str] = None
    creator_name: Optional[str] = None
    allow_usage: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator("name", "start_location", "end_location")
    def _not_empty(cls, value: str) -> str:  # noqa: D401 - simple validation
        if not value or not str(value).strip():
            raise ValueError("field required")
        return value


@dataclass
class SupabaseClient:
    """Client wrapper storing trip templates in Supabase.

    When the Supabase SDK is unavailable, an in-memory store is used instead so
    the rest of the application can operate without external dependencies.
    """

    url: str
    key: str
    client: Optional[Client] = None

    def __post_init__(self) -> None:  # pragma: no cover - connection side effects
        try:
            self.client = create_client(self.url, self.key)
            logger.info("Supabase client initialized")
        except Exception as exc:  # pragma: no cover - network failure path
            logger.warning("Falling back to local storage: %s", exc)
            self.client = None
        self._store: Dict[str, TripTemplate] = {}
        self.opt_out_creators: set[str] = set()

    # ------------------------------------------------------------------
    # Schema management
    # ------------------------------------------------------------------
    def create_schema(self) -> None:
        """Create the ``trips`` table if it does not exist."""
        sql = (
            "CREATE TABLE IF NOT EXISTS trips ("
            "id uuid primary key,"
            "name text,"
            "start_location text,"
            "end_location text,"
            "waypoints jsonb,"
            "duration_days integer,"
            "highlights jsonb,"
            "costs text,"
            "campgrounds jsonb,"
            "route_description text,"
            "creator_id text,"
            "creator_name text,"
            "allow_usage boolean default true,"
            "created_at timestamptz default now(),"
            "updated_at timestamptz default now()"
            ")"
        )
        if self.client:
            try:
                self.client.rpc("execute_sql", {"sql": sql}).execute()
            except Exception as exc:  # pragma: no cover - depends on server
                logger.error("Failed to create schema: %s", exc)
        else:
            logger.debug("Using in-memory store; schema creation skipped")

    # ------------------------------------------------------------------
    # CRUD operations
    # ------------------------------------------------------------------
    def create_trip(self, data: Dict[str, Any]) -> TripTemplate:
        """Validate and store a new trip template."""
        trip = TripTemplate(**data)
        if trip.creator_id in self.opt_out_creators:
            raise ValueError("creator opted out")
        if self.is_duplicate(trip):
            raise ValueError("duplicate trip")
        if self.client:
            try:
                result = (
                    self.client.table("trips")
                    .insert(trip.dict())
                    .execute()
                )
                if hasattr(result, "data") and result.data:
                    trip.id = result.data[0].get("id", trip.id)
            except Exception as exc:  # pragma: no cover - network failure
                logger.error("Failed to insert trip: %s", exc)
        self._store[trip.id] = trip
        return trip

    def read_trip(self, trip_id: str) -> Optional[TripTemplate]:
        if self.client:
            try:
                result = (
                    self.client.table("trips").select("*").eq("id", trip_id).single().execute()
                )
                if hasattr(result, "data") and result.data:
                    return TripTemplate(**result.data)
            except Exception:  # pragma: no cover - network failure
                pass
        return self._store.get(trip_id)

    def update_trip(self, trip_id: str, **updates: Any) -> Optional[TripTemplate]:
        trip = self.read_trip(trip_id)
        if not trip:
            return None
        updated = trip.copy(update=updates)
        updated.updated_at = datetime.utcnow()
        if self.client:
            try:
                self.client.table("trips").update(updates).eq("id", trip_id).execute()
            except Exception as exc:  # pragma: no cover
                logger.error("Failed to update trip: %s", exc)
        self._store[trip_id] = updated
        return updated

    def delete_trip(self, trip_id: str) -> bool:
        if self.client:
            try:
                self.client.table("trips").delete().eq("id", trip_id).execute()
            except Exception as exc:  # pragma: no cover
                logger.error("Failed to delete trip: %s", exc)
        return self._store.pop(trip_id, None) is not None

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------
    def is_duplicate(self, trip: TripTemplate) -> bool:
        """Simple duplicate detection by start/end/duration."""
        for existing in self._store.values():
            if (
                existing.start_location == trip.start_location
                and existing.end_location == trip.end_location
                and existing.duration_days == trip.duration_days
            ):
                return True
        if self.client:
            try:
                result = (
                    self.client.table("trips")
                    .select("id")
                    .eq("start_location", trip.start_location)
                    .eq("end_location", trip.end_location)
                    .eq("duration_days", trip.duration_days)
                    .execute()
                )
                if hasattr(result, "data") and result.data:
                    return True
            except Exception:  # pragma: no cover
                pass
        return False

    def search_trips(self, text: str) -> List[TripTemplate]:
        """Return trips whose description or highlights mention ``text``."""
        results: List[TripTemplate] = []
        if self.client:
            try:
                data = (
                    self.client.table("trips")
                    .select("*")
                    .ilike("route_description", f"%{text}%")
                    .execute()
                )
                if hasattr(data, "data") and data.data:
                    results.extend(TripTemplate(**row) for row in data.data)
            except Exception:  # pragma: no cover
                pass
        for trip in self._store.values():
            if (
                (trip.route_description and text.lower() in trip.route_description.lower())
                or any(text.lower() in h.lower() for h in trip.highlights)
            ):
                results.append(trip)
        return results

    # ------------------------------------------------------------------
    # Creator management and export
    # ------------------------------------------------------------------
    def opt_out_creator(self, creator_id: str) -> None:
        self.opt_out_creators.add(creator_id)

    def export_trips(self) -> List[Dict[str, Any]]:
        """Return all stored trips as serialisable dictionaries."""
        if self.client:
            try:
                data = self.client.table("trips").select("*").execute()
                if hasattr(data, "data") and data.data:
                    return list(data.data)
            except Exception:  # pragma: no cover
                pass
        return [asdict(t) for t in self._store.values()]
