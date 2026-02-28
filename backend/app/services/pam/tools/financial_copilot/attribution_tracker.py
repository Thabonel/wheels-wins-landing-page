"""
Attribution Tracker for PAM Financial Co-Pilot

Tracks PAM's value as a Financial Co-Pilot by measuring search helpfulness,
user engagement, and research assistance beyond just monetary savings.

This builds on the existing auto_track_savings infrastructure to measure
PAM's impact as a purchase advisor and decision-making companion.

Part of the Financial Co-Pilot MVP: Basic Attribution System functionality.
"""

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from app.services.pam.core.intent_classifier import SpendingCategory, RVRelevance
from app.services.pam.tools.budget.auto_track_savings import record_potential_savings

logger = logging.getLogger(__name__)


class AttributionEventType(Enum):
    """Types of attribution events PAM can track"""
    SEARCH_ASSISTANCE = "search_assistance"
    CONTEXT_PROVIDED = "context_provided"
    COMMUNITY_WISDOM_SHARED = "community_wisdom_shared"
    PRICE_COMPARISON_FOUND = "price_comparison_found"
    LINK_CLICKED = "link_clicked"
    RESEARCH_COMPLETED = "research_completed"
    DECISION_INFLUENCED = "decision_influenced"


@dataclass
class AttributionEvent:
    """A single attribution event"""
    event_type: AttributionEventType
    user_id: str
    category: SpendingCategory
    rv_relevance: RVRelevance
    description: str
    value_score: float  # 0.0-1.0 representing value provided
    metadata: Dict[str, Any]
    timestamp: datetime


class AttributionTracker:
    """
    Tracks PAM's value as a Financial Co-Pilot.

    Measures research assistance, decision support, and user engagement
    beyond just monetary savings to show PAM's comprehensive value.
    """

    def __init__(self):
        """Initialize the attribution tracker"""
        self.value_scores = self._build_value_scoring()

    async def track_search_assistance(
        self,
        user_id: str,
        query: str,
        category: SpendingCategory,
        rv_relevance: RVRelevance,
        results_found: int,
        community_insights_provided: int = 0,
        price_comparison_attempted: bool = False
    ) -> bool:
        """
        Track PAM providing search assistance with RV context.

        Args:
            user_id: User UUID
            query: Search query
            category: Spending category
            rv_relevance: RV relevance level
            results_found: Number of search results found
            community_insights_provided: Number of community insights shared
            price_comparison_attempted: Whether price comparison was attempted

        Returns:
            True if tracking succeeded
        """
        try:
            # Calculate value score based on assistance quality
            value_score = self._calculate_search_value_score(
                rv_relevance=rv_relevance,
                results_found=results_found,
                community_insights_provided=community_insights_provided,
                price_comparison_attempted=price_comparison_attempted
            )

            # Create description
            description = self._format_search_description(
                query=query,
                category=category,
                results_found=results_found,
                community_insights_provided=community_insights_provided
            )

            # Track using existing record_potential_savings infrastructure
            success = await record_potential_savings(
                user_id=user_id,
                amount=0.0,  # No monetary value - this is research assistance
                category="research",
                savings_type="search_assistance",
                description=description,
                verification_method="copilot_assistance",
                confidence_score=value_score,
                baseline_cost=None,
                optimized_cost=None
            )

            if success:
                logger.info(f"Tracked search assistance for user {user_id}: {query[:50]}... (value: {value_score:.2f})")

            return success

        except Exception as e:
            logger.warning(f"Failed to track search assistance: {e}")
            return False

    async def track_context_value(
        self,
        user_id: str,
        query: str,
        category: SpendingCategory,
        rv_relevance: RVRelevance,
        context_insights_provided: int,
        community_insights_provided: int = 0
    ) -> bool:
        """
        Track PAM providing valuable RV context for a purchase decision.

        Args:
            user_id: User UUID
            query: Search query
            category: Spending category
            rv_relevance: RV relevance level
            context_insights_provided: Number of RV context insights provided
            community_insights_provided: Number of community insights provided

        Returns:
            True if tracking succeeded
        """
        try:
            # Calculate value score for context provision
            value_score = self._calculate_context_value_score(
                rv_relevance=rv_relevance,
                context_insights_provided=context_insights_provided,
                community_insights_provided=community_insights_provided
            )

            description = (
                f"PAM provided {context_insights_provided} RV context insights "
                f"for {category.value} purchase: {query[:50]}..."
            )

            # Track context value
            success = await record_potential_savings(
                user_id=user_id,
                amount=0.0,
                category="research",
                savings_type="context_provided",
                description=description,
                verification_method="copilot_context",
                confidence_score=value_score,
                baseline_cost=None,
                optimized_cost=None
            )

            return success

        except Exception as e:
            logger.warning(f"Failed to track context value: {e}")
            return False

    async def track_decision_influence(
        self,
        user_id: str,
        original_query: str,
        category: SpendingCategory,
        influence_type: str,  # "consideration_change", "option_discovery", "timing_advice", etc.
        influence_description: str,
        confidence: float = 0.7
    ) -> bool:
        """
        Track PAM influencing a purchase decision.

        This is called when PAM provides advice that changes how the user
        approaches their purchase (not just finding results).

        Args:
            user_id: User UUID
            original_query: Original search query
            category: Purchase category
            influence_type: Type of influence provided
            influence_description: Description of how PAM helped
            confidence: Confidence in the influence (0.0-1.0)

        Returns:
            True if tracking succeeded
        """
        try:
            description = (
                f"PAM influenced {category.value} decision ({influence_type}): "
                f"{influence_description[:100]}..."
            )

            success = await record_potential_savings(
                user_id=user_id,
                amount=0.0,
                category="decision_support",
                savings_type="decision_influenced",
                description=description,
                verification_method="copilot_influence",
                confidence_score=confidence,
                baseline_cost=None,
                optimized_cost=None
            )

            return success

        except Exception as e:
            logger.warning(f"Failed to track decision influence: {e}")
            return False

    async def track_link_engagement(
        self,
        user_id: str,
        link_url: str,
        link_title: str,
        source_query: str,
        category: SpendingCategory
    ) -> bool:
        """
        Track user clicking on a link provided by PAM's search results.

        This helps measure engagement and actual usage of PAM's recommendations.
        (Note: This would be called from frontend when users click links)

        Args:
            user_id: User UUID
            link_url: URL that was clicked
            link_title: Title of the link
            source_query: Original query that produced this link
            category: Purchase category

        Returns:
            True if tracking succeeded
        """
        try:
            description = (
                f"User clicked PAM-provided link: {link_title[:50]}... "
                f"from query: {source_query[:50]}..."
            )

            success = await record_potential_savings(
                user_id=user_id,
                amount=0.0,
                category="engagement",
                savings_type="link_clicked",
                description=description,
                verification_method="user_engagement",
                confidence_score=0.9,  # High confidence - actual user action
                baseline_cost=None,
                optimized_cost=None
            )

            return success

        except Exception as e:
            logger.warning(f"Failed to track link engagement: {e}")
            return False

    def _calculate_search_value_score(
        self,
        rv_relevance: RVRelevance,
        results_found: int,
        community_insights_provided: int,
        price_comparison_attempted: bool
    ) -> float:
        """Calculate value score for search assistance"""

        # Base score from RV relevance
        base_scores = {
            RVRelevance.HIGH: 0.8,
            RVRelevance.MEDIUM: 0.6,
            RVRelevance.LOW: 0.4,
            RVRelevance.UNKNOWN: 0.3
        }
        score = base_scores.get(rv_relevance, 0.3)

        # Boost for good search results
        if results_found >= 5:
            score += 0.1
        elif results_found >= 3:
            score += 0.05

        # Boost for community insights
        if community_insights_provided >= 2:
            score += 0.15
        elif community_insights_provided >= 1:
            score += 0.1

        # Boost for price comparison
        if price_comparison_attempted:
            score += 0.1

        # Cap at 1.0
        return min(score, 1.0)

    def _calculate_context_value_score(
        self,
        rv_relevance: RVRelevance,
        context_insights_provided: int,
        community_insights_provided: int
    ) -> float:
        """Calculate value score for context provision"""

        # Base score from relevance
        base_scores = {
            RVRelevance.HIGH: 0.9,
            RVRelevance.MEDIUM: 0.7,
            RVRelevance.LOW: 0.4,
            RVRelevance.UNKNOWN: 0.2
        }
        score = base_scores.get(rv_relevance, 0.2)

        # Boost for context insights
        score += min(context_insights_provided * 0.05, 0.2)

        # Boost for community wisdom
        score += min(community_insights_provided * 0.05, 0.15)

        return min(score, 1.0)

    def _format_search_description(
        self,
        query: str,
        category: SpendingCategory,
        results_found: int,
        community_insights_provided: int
    ) -> str:
        """Format description for search assistance tracking"""

        parts = [
            f"PAM Financial Co-Pilot assisted with {category.value} search",
            f"Query: {query[:50]}{'...' if len(query) > 50 else ''}",
            f"Found {results_found} results"
        ]

        if community_insights_provided > 0:
            parts.append(f"Provided {community_insights_provided} community insights")

        return " | ".join(parts)

    def _build_value_scoring(self) -> Dict[str, float]:
        """Build value scoring system for different attribution events"""
        return {
            "search_with_context": 0.7,
            "search_with_community": 0.8,
            "search_with_price_comparison": 0.9,
            "decision_influence": 0.85,
            "link_engagement": 0.95
        }

    async def get_user_attribution_summary(
        self,
        user_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get attribution summary for a user over the specified period.

        This would query the pam_savings_events table for research/engagement
        events to show PAM's value as a Financial Co-Pilot.

        Args:
            user_id: User UUID
            days: Number of days to look back

        Returns:
            Summary of PAM's attributed value
        """
        try:
            # This would query the database for attribution events
            # For now, return a placeholder structure
            return {
                "period_days": days,
                "searches_assisted": 0,  # Count of search_assistance events
                "context_insights_provided": 0,  # Sum of context insights
                "community_insights_shared": 0,  # Count of community insights
                "links_engaged": 0,  # Count of link clicks
                "average_value_score": 0.0,  # Average confidence score
                "total_attribution_events": 0,
                "categories_helped_with": [],  # Unique categories assisted
                "top_assisted_category": None,
                "copilot_helpfulness_trend": "stable"  # "increasing", "stable", "decreasing"
            }

        except Exception as e:
            logger.error(f"Failed to get attribution summary for user {user_id}: {e}")
            return {}


# Singleton instance for easy import
attribution_tracker = AttributionTracker()