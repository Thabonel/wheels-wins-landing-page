"""
PAM 2.0 Trip Logger Service
Phase 4 Implementation: Passive Trip Activity Detection

Key Features:
- Passive detection of trip planning activities
- Smart logging without user interruption
- Integration with Wheels trip components
- Activity pattern recognition

Target: <300 lines, modular design
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from ..core.types import (
    ServiceResponse,
    UserContext
)
from ..core.exceptions import TripLoggerError
from ..core.config import pam2_settings

logger = logging.getLogger(__name__)

class TripLogger:
    """
    Trip Logger Service
    Passively logs trip-related activities and insights
    """

    def __init__(self):
        self.mcp_config = pam2_settings.get_mcp_config()

        # Trip detection settings
        self.activity_threshold = 3  # Minimum activities to consider trip planning
        self.detection_window_hours = 24  # Window for activity grouping
        self.confidence_threshold = 0.7  # Minimum confidence for trip detection

        # Activity patterns
        self.trip_keywords = [
            "trip", "travel", "vacation", "destination", "hotel", "flight",
            "booking", "itinerary", "visit", "explore", "tour", "resort"
        ]

        self.planning_indicators = [
            "when should i", "how much", "best time", "recommendation",
            "suggest", "plan", "book", "reserve", "budget"
        ]

        logger.info("TripLogger initialized")

    async def analyze_conversation_for_trip_activity(
        self,
        user_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ServiceResponse:
        """
        Analyze conversation message for trip planning activities

        Args:
            user_id: User identifier
            message: User message to analyze
            context: Additional context (optional)

        Returns:
            ServiceResponse with trip activity analysis
        """
        try:
            logger.debug(f"Analyzing trip activity for user {user_id}")

            # Analyze message for trip-related content
            activity_analysis = await self._analyze_trip_content(message, context)

            # If trip activity detected, log it
            if activity_analysis["is_trip_related"]:
                await self._log_trip_activity(user_id, activity_analysis)

            return ServiceResponse(
                success=True,
                data={
                    "trip_activity_detected": activity_analysis["is_trip_related"],
                    "activity_type": activity_analysis.get("activity_type"),
                    "confidence": activity_analysis.get("confidence", 0.0),
                    "entities": activity_analysis.get("entities", [])
                },
                metadata={
                    "user_id": user_id,
                    "analysis_timestamp": datetime.now().isoformat()
                }
            )

        except Exception as e:
            logger.error(f"Error analyzing trip activity for user {user_id}: {e}")
            raise TripLoggerError(
                message=f"Failed to analyze trip activity: {str(e)}",
                details={"user_id": user_id}
            )

    async def _analyze_trip_content(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze message content for trip-related indicators
        """

        message_lower = message.lower()

        # Check for trip keywords
        trip_keyword_matches = [kw for kw in self.trip_keywords if kw in message_lower]

        # Check for planning indicators
        planning_matches = [ind for ind in self.planning_indicators if ind in message_lower]

        # Calculate confidence score
        confidence = 0.0
        activity_type = "unknown"
        entities = []

        if trip_keyword_matches:
            confidence += 0.5
            entities.extend(trip_keyword_matches)

        if planning_matches:
            confidence += 0.3
            activity_type = "trip_planning"

        # Analyze for specific trip entities
        entities.extend(await self._extract_trip_entities(message))

        # Location detection
        if any(word in message_lower for word in ["to", "in", "visit", "go to"]):
            confidence += 0.2
            activity_type = "destination_research"

        # Budget/cost analysis
        if any(word in message_lower for word in ["cost", "price", "budget", "expensive", "cheap"]):
            confidence += 0.1
            if activity_type == "unknown":
                activity_type = "trip_budgeting"

        is_trip_related = confidence >= self.confidence_threshold

        return {
            "is_trip_related": is_trip_related,
            "confidence": min(confidence, 1.0),
            "activity_type": activity_type if is_trip_related else None,
            "entities": entities,
            "trip_keywords": trip_keyword_matches,
            "planning_indicators": planning_matches
        }

    async def _extract_trip_entities(self, message: str) -> List[str]:
        """
        Extract trip-related entities (destinations, dates, etc.)
        Phase 4: Simple regex-based extraction
        Phase 5+: NLP-based entity extraction
        """

        entities = []
        message_lower = message.lower()

        # Simple destination detection
        destination_patterns = [
            "paris", "london", "tokyo", "new york", "california", "italy",
            "spain", "france", "japan", "thailand", "bali", "hawaii"
        ]

        for dest in destination_patterns:
            if dest in message_lower:
                entities.append(f"destination:{dest}")

        # Month detection for trip dates
        months = [
            "january", "february", "march", "april", "may", "june",
            "july", "august", "september", "october", "november", "december"
        ]

        for month in months:
            if month in message_lower:
                entities.append(f"timeframe:{month}")

        return entities

    async def _log_trip_activity(
        self,
        user_id: str,
        activity_analysis: Dict[str, Any]
    ):
        """
        Log detected trip activity to storage
        Phase 4 implementation placeholder
        """

        # Phase 1: Log to local logger
        logger.info(
            f"Trip activity logged for user {user_id}: "
            f"type={activity_analysis['activity_type']}, "
            f"confidence={activity_analysis['confidence']:.2f}"
        )

        # Phase 4: Implement persistence to Supabase
        # - Store in trip_activity_log table
        # - Update user trip planning patterns
        # - Trigger trip insights generation

    async def get_user_trip_insights(self, user_id: str) -> Dict[str, Any]:
        """
        Get trip planning insights for user
        Phase 4 implementation placeholder
        """

        # Phase 4: Implement insights generation
        # - Analyze trip planning patterns
        # - Identify preferred destinations
        # - Calculate planning timeline patterns
        # - Generate personalized suggestions

        return {
            "trip_planning_frequency": "unknown",
            "preferred_destinations": [],
            "planning_patterns": {},
            "insights_available": False
        }

    async def detect_active_trip_planning(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Detect if user is currently actively planning a trip
        """

        # Phase 4: Implement active planning detection
        # - Check recent activity clusters
        # - Analyze conversation patterns
        # - Return current trip planning session info

        return None

    async def suggest_trip_assistance(
        self,
        user_id: str,
        activity_analysis: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Suggest trip assistance based on detected activity
        """

        if not activity_analysis.get("is_trip_related"):
            return None

        activity_type = activity_analysis.get("activity_type")

        suggestions = {
            "trip_planning": {
                "message": "I notice you're planning a trip! Would you like me to help you create a budget or find recommendations?",
                "actions": ["create_budget", "find_recommendations"]
            },
            "destination_research": {
                "message": "Looking for destination ideas? I can help you compare costs and create itineraries!",
                "actions": ["compare_destinations", "create_itinerary"]
            },
            "trip_budgeting": {
                "message": "Need help with trip budgeting? I can track expenses and suggest cost-saving tips!",
                "actions": ["create_trip_budget", "expense_tracking"]
            }
        }

        return suggestions.get(activity_type, {
            "message": "I'm here to help with your travel planning!",
            "actions": ["general_trip_help"]
        })

    async def get_trip_activity_summary(
        self,
        user_id: str,
        days_back: int = 7
    ) -> Dict[str, Any]:
        """
        Get summary of recent trip planning activities
        """

        # Phase 4: Implement activity summary
        return {
            "activities_detected": 0,
            "most_common_activity": None,
            "destinations_mentioned": [],
            "planning_intensity": "low",
            "period_days": days_back
        }

    async def get_service_health(self) -> Dict[str, Any]:
        """Get service health status"""

        return {
            "service": "trip_logger",
            "status": "healthy",
            "detection_enabled": True,
            "activity_threshold": self.activity_threshold,
            "confidence_threshold": self.confidence_threshold,
            "keywords_loaded": len(self.trip_keywords),
            "indicators_loaded": len(self.planning_indicators),
            "timestamp": datetime.now().isoformat()
        }

# Service factory function
def create_trip_logger() -> TripLogger:
    """Factory function to create TripLogger instance"""
    return TripLogger()