"""
UnifiedContextService - Cross-feature AI context compilation.

Aggregates financial, location, medical, and social context into a single
snapshot that can be injected into AI system prompts. Each domain loader
is fault-tolerant: a failure in one domain never blocks others.
"""

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class ContextDomain(Enum):
    FINANCIAL = "financial"
    LOCATION = "location"
    MEDICAL = "medical"
    SOCIAL = "social"


@dataclass
class CompiledUserContext:
    user_id: str
    financial: Optional[Dict[str, Any]] = None
    location: Optional[Dict[str, Any]] = None
    medical: Optional[Dict[str, Any]] = None
    social: Optional[Dict[str, Any]] = None

    def to_prompt_snippet(self) -> str:
        """Generate a text block suitable for AI system prompt injection.

        Only includes sections for domains that have data, keeping the
        prompt compact and relevant to the current user state.
        """
        sections: List[str] = []

        if self.financial:
            sections.append(self._format_financial())

        if self.location:
            sections.append(self._format_location())

        if self.medical:
            sections.append(self._format_medical())

        if self.social:
            sections.append(self._format_social())

        return "\n\n".join(sections)

    # -- private formatters --------------------------------------------------

    def _format_financial(self) -> str:
        data = self.financial
        lines = ["FINANCIAL CONTEXT:"]

        remaining = data.get("remaining_budget")
        utilization = data.get("budget_utilization")
        if remaining is not None:
            lines.append(f"  Remaining budget: ${remaining:,.0f}")
        if utilization is not None:
            lines.append(f"  Budget utilization: {utilization:.0f}%")

        top_cats = data.get("top_categories")
        if top_cats:
            cat_parts = [
                f"{c['category']} (${c['amount']:,.0f})" for c in top_cats
            ]
            lines.append(f"  Top spending: {', '.join(cat_parts)}")

        over = data.get("over_budget_categories")
        if over:
            lines.append(f"  Over budget: {', '.join(over)}")

        return "\n".join(lines)

    def _format_location(self) -> str:
        data = self.location
        lines = ["LOCATION CONTEXT:"]
        city = data.get("city")
        lat = data.get("lat")
        lng = data.get("lng")
        if city:
            lines.append(f"  City: {city}")
        if lat is not None and lng is not None:
            lines.append(f"  Coordinates: {lat}, {lng}")
        return "\n".join(lines)

    def _format_medical(self) -> str:
        data = self.medical
        lines = ["MEDICAL CONTEXT:"]
        conditions = data.get("conditions", [])
        for cond in conditions:
            name = cond.get("condition_name", "Unknown")
            severity = cond.get("severity", "unknown")
            lines.append(f"  - {name} (severity: {severity})")
        lines.append("  Please consider health needs in recommendations.")
        return "\n".join(lines)

    def _format_social(self) -> str:
        data = self.social
        lines = ["SOCIAL CONTEXT:"]
        if data:
            for key, value in data.items():
                lines.append(f"  {key}: {value}")
        return "\n".join(lines)


class UnifiedContextService:
    """Compiles cross-domain user context for AI prompt injection.

    Each domain loader catches its own exceptions so a failure in one
    domain (e.g. Redis down for financial data) never prevents the
    other domains from loading.
    """

    def __init__(
        self,
        financial_service: Optional[Any] = None,
        supabase_client: Optional[Any] = None,
    ):
        self.financial_service = financial_service
        self.supabase_client = supabase_client

    async def compile_context(
        self,
        user_id: str,
        location: Optional[Dict[str, Any]] = None,
        domains: Optional[List[ContextDomain]] = None,
    ) -> CompiledUserContext:
        """Build a CompiledUserContext, loading only the requested domains.

        Args:
            user_id: The user's UUID.
            location: Optional pre-resolved location dict with city/lat/lng.
            domains: Which domains to load. None means all domains.

        Returns:
            A CompiledUserContext with populated fields for each domain
            that succeeded, and None for domains that failed or were
            not requested.
        """
        load_all = domains is None
        requested = set(domains) if domains else set()

        financial = None
        location_data = None
        medical = None
        social = None

        if load_all or ContextDomain.FINANCIAL in requested:
            financial = await self._load_financial(user_id)

        if load_all or ContextDomain.LOCATION in requested:
            location_data = location  # passthrough - already resolved by caller

        if load_all or ContextDomain.MEDICAL in requested:
            medical = await self._load_medical(user_id)

        if load_all or ContextDomain.SOCIAL in requested:
            # Social domain is not yet wired to a backing service
            social = None

        return CompiledUserContext(
            user_id=user_id,
            financial=financial,
            location=location_data,
            medical=medical,
            social=social,
        )

    async def _load_financial(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Load financial context via the injected financial service."""
        if not self.financial_service:
            return None
        try:
            return await self.financial_service.get_financial_context(user_id)
        except Exception:
            logger.warning(
                "Failed to load financial context for user %s", user_id, exc_info=True
            )
            return None

    async def _load_medical(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Query the medical_records table for the user's conditions."""
        if not self.supabase_client:
            return None
        try:
            result = (
                self.supabase_client.table("medical_records")
                .select("condition_name, severity")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(5)
                .execute()
            )
            if result.data:
                return {"conditions": result.data}
            return None
        except Exception:
            logger.warning(
                "Failed to load medical context for user %s", user_id, exc_info=True
            )
            return None
