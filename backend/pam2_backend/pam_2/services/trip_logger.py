"""
PAM 2.0 Trip Logger
==================

Clean trip activity detection and logging service.
Analyzes user messages for travel planning activities and extracts entities.

Key Features:
- Trip activity detection
- Entity extraction (destinations, dates, budgets)
- Non-intrusive passive logging
- Pattern recognition for travel planning

Design: <300 lines, single responsibility, easily testable
"""

import re
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

from ..core.types import (
    ChatMessage, UserContext, ServiceResponse,
    TripData, MessageType
)
from ..core.config import pam2_settings
from ..core.exceptions import TripLoggerError, handle_async_service_error

logger = logging.getLogger(__name__)


class TripLogger:
    """
    Clean trip activity detection and logging service

    Passively analyzes conversations to detect travel planning
    activities and extract relevant travel information.
    """

    def __init__(self):
        self.enabled = pam2_settings.enable_trip_logger

        # Travel-related keywords and patterns
        self.trip_keywords = {
            'planning': ['plan', 'planning', 'trip', 'travel', 'vacation', 'holiday', 'visit'],
            'destinations': ['to', 'in', 'at', 'visiting', 'going'],
            'activities': ['hotel', 'flight', 'accommodation', 'restaurant', 'attraction', 'museum'],
            'budget': ['budget', 'cost', 'price', 'expensive', 'cheap', 'money', 'dollar', '$'],
            'time': ['day', 'week', 'month', 'tomorrow', 'next', 'weekend']
        }

        # Common destination patterns
        self.destination_patterns = [
            r'\b(?:to|in|visiting|going to)\s+([A-Z][a-zA-Z\s]{2,20})',
            r'\b([A-Z][a-zA-Z\s]{2,20})(?:\s+trip|\s+vacation)',
            r'\btrip to\s+([A-Z][a-zA-Z\s]{2,20})',
        ]

        # Budget patterns
        self.budget_patterns = [
            r'\$([0-9,]+)',
            r'budget\s+(?:of\s+)?\$?([0-9,]+)',
            r'spend\s+(?:about\s+)?\$?([0-9,]+)',
        ]

        # Date patterns (simplified)
        self.date_patterns = [
            r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\b',
            r'\b(\d{1,2})\s+days?\b',
            r'\b(\d{1,2})\s+weeks?\b',
            r'\bnext\s+(week|month|year)\b',
        ]

        logger.info(f"TripLogger initialized (enabled: {self.enabled})")

    @handle_async_service_error
    async def analyze_trip_activity(
        self,
        message: ChatMessage,
        user_context: Optional[UserContext] = None
    ) -> ServiceResponse:
        """
        Analyze message for trip planning activity

        Args:
            message: User message to analyze
            user_context: Optional user context for personalization

        Returns:
            ServiceResponse with trip activity analysis
        """
        if not self.enabled:
            return ServiceResponse(
                success=True,
                data={"trip_activity_detected": False, "reason": "trip_logger_disabled"},
                service_name="trip_logger"
            )

        if message.type != MessageType.USER:
            return ServiceResponse(
                success=True,
                data={"trip_activity_detected": False, "reason": "not_user_message"},
                service_name="trip_logger"
            )

        try:
            content = message.content.lower()

            # Detect trip planning activity
            activity_score = self._calculate_activity_score(content)
            is_trip_activity = activity_score > 0.3  # Threshold for trip activity

            if not is_trip_activity:
                return ServiceResponse(
                    success=True,
                    data={
                        "trip_activity_detected": False,
                        "activity_score": activity_score,
                        "reason": "low_activity_score"
                    },
                    service_name="trip_logger"
                )

            # Extract trip entities
            entities = self._extract_trip_entities(message.content)

            # Create trip data
            trip_data = self._create_trip_data_from_entities(entities)

            # Log trip activity
            await self._log_trip_activity(message.user_id, message, entities, trip_data)

            return ServiceResponse(
                success=True,
                data={
                    "trip_activity_detected": True,
                    "activity_score": activity_score,
                    "entities": entities,
                    "trip_data": trip_data.dict(),
                    "confidence": self._calculate_confidence(entities)
                },
                metadata={
                    "user_id": message.user_id,
                    "message_id": message.id,
                    "analysis_timestamp": datetime.now().isoformat()
                },
                service_name="trip_logger"
            )

        except Exception as e:
            logger.error(f"Trip activity analysis failed: {e}")
            raise TripLoggerError(
                f"Activity analysis failed: {str(e)}",
                operation="analyze_trip_activity",
                context={"user_id": message.user_id, "message_id": message.id}
            )

    def _calculate_activity_score(self, content: str) -> float:
        """Calculate trip activity score based on keyword presence"""
        total_score = 0.0
        total_categories = len(self.trip_keywords)

        for category, keywords in self.trip_keywords.items():
            category_score = 0.0
            for keyword in keywords:
                if keyword in content:
                    category_score += 1.0

            # Normalize category score
            if len(keywords) > 0:
                category_score = min(category_score / len(keywords), 1.0)

            total_score += category_score

        return total_score / total_categories if total_categories > 0 else 0.0

    def _extract_trip_entities(self, content: str) -> Dict[str, List[str]]:
        """Extract trip-related entities from message content"""
        entities = {
            "destinations": [],
            "budgets": [],
            "dates": [],
            "activities": []
        }

        # Extract destinations
        for pattern in self.destination_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                destination = match.strip()
                if len(destination) > 2 and destination not in entities["destinations"]:
                    entities["destinations"].append(destination)

        # Extract budgets
        for pattern in self.budget_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                budget = match.replace(',', '').strip()
                if budget.isdigit() and budget not in entities["budgets"]:
                    entities["budgets"].append(budget)

        # Extract dates/time references
        for pattern in self.date_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                if match not in entities["dates"]:
                    entities["dates"].append(match)

        # Extract activities (simple keyword matching)
        for activity in self.trip_keywords['activities']:
            if activity in content.lower():
                if activity not in entities["activities"]:
                    entities["activities"].append(activity)

        return entities

    def _create_trip_data_from_entities(self, entities: Dict[str, List[str]]) -> TripData:
        """Create TripData object from extracted entities"""
        trip_data = TripData()

        # Set destinations
        trip_data.destinations = entities.get("destinations", [])

        # Set budget (use first valid budget found)
        budgets = entities.get("budgets", [])
        if budgets:
            try:
                trip_data.budget = float(budgets[0])
            except (ValueError, IndexError):
                pass

        # Set activities
        trip_data.activities = entities.get("activities", [])

        # Add date information to preferences
        dates = entities.get("dates", [])
        if dates:
            trip_data.preferences["date_references"] = dates

        return trip_data

    def _calculate_confidence(self, entities: Dict[str, List[str]]) -> float:
        """Calculate confidence score based on extracted entities"""
        entity_weights = {
            "destinations": 0.4,
            "budgets": 0.3,
            "dates": 0.2,
            "activities": 0.1
        }

        confidence = 0.0
        for entity_type, values in entities.items():
            if values and entity_type in entity_weights:
                confidence += entity_weights[entity_type]

        return min(confidence, 1.0)

    async def _log_trip_activity(
        self,
        user_id: str,
        message: ChatMessage,
        entities: Dict[str, List[str]],
        trip_data: TripData
    ):
        """Log trip activity (placeholder for actual logging implementation)"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "message_id": message.id,
            "entities": entities,
            "trip_data": trip_data.dict(),
            "message_content_preview": message.content[:100]
        }

        logger.info(f"Trip activity logged for user {user_id}: {len(entities['destinations'])} destinations")

        # In a real implementation, this would store to database
        # For now, we just log it

    async def get_trip_insights(self, user_id: str) -> ServiceResponse:
        """Get trip planning insights for user (placeholder)"""
        try:
            # This would query stored trip data in a real implementation
            insights = {
                "recent_destinations": [],
                "budget_patterns": {},
                "planning_frequency": 0,
                "preferences": {}
            }

            return ServiceResponse(
                success=True,
                data=insights,
                metadata={"user_id": user_id},
                service_name="trip_logger"
            )

        except Exception as e:
            logger.error(f"Failed to get trip insights: {e}")
            raise TripLoggerError(
                f"Trip insights retrieval failed: {str(e)}",
                operation="get_trip_insights",
                context={"user_id": user_id}
            )

    async def get_service_health(self) -> Dict[str, Any]:
        """Get service health status"""
        return {
            "service": "trip_logger",
            "enabled": self.enabled,
            "configuration": {
                "keyword_categories": len(self.trip_keywords),
                "destination_patterns": len(self.destination_patterns),
                "budget_patterns": len(self.budget_patterns)
            }
        }


def create_trip_logger() -> TripLogger:
    """Factory function to create TripLogger instance"""
    return TripLogger()