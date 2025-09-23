"""
PAM 2.0 Safety Layer Service
Phase 7 Implementation: Guardrails and Content Safety

Key Features:
- Medium-level content filtering (non-intrusive but safe)
- Redis-based rate limiting (100 messages/hour per user)
- User safety monitoring and reporting
- Compliance with content policies

Target: <300 lines, modular design
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from enum import Enum

from ..core.types import (
    ServiceResponse,
    SafetyLevel,
    GuardrailsConfig
)
from ..core.exceptions import SafetyLayerError, GuardrailsViolation, RateLimitExceeded
from ..core.config import pam2_settings

logger = logging.getLogger(__name__)

class ContentRisk(str, Enum):
    """Content risk levels"""
    SAFE = "safe"
    LOW_RISK = "low_risk"
    MEDIUM_RISK = "medium_risk"
    HIGH_RISK = "high_risk"
    BLOCKED = "blocked"

class SafetyLayer:
    """
    Safety Layer Service
    Provides content safety and rate limiting for PAM 2.0
    """

    def __init__(self):
        self.config = pam2_settings.get_guardrails_config()
        self.redis_config = pam2_settings.get_redis_config()

        # Rate limiting settings
        self.rate_limit_window = 3600  # 1 hour in seconds
        self.rate_limit_max = self.config.rate_limit_messages_per_hour
        self.burst_limit = 10  # Allow 10 messages in quick succession

        # Content filtering patterns
        self._init_content_filters()

        # Redis client for rate limiting (Phase 7 implementation)
        self._redis_client = None

        logger.info(f"SafetyLayer initialized with {self.config.safety_level} safety level")

    def _init_content_filters(self):
        """Initialize content filtering patterns"""

        # Medium-level filtering (non-intrusive but effective)
        self.blocked_patterns = [
            # Explicit content
            "explicit_content_pattern_1",
            "explicit_content_pattern_2",

            # Harmful instructions
            "harmful_instruction_pattern_1",
            "harmful_instruction_pattern_2",

            # Personal information requests
            "personal_info_pattern_1",
            "personal_info_pattern_2"
        ]

        self.warning_patterns = [
            # Financial advice (requires disclaimer)
            "investment advice",
            "financial recommendation",

            # Legal advice (requires disclaimer)
            "legal advice",
            "legal opinion"
        ]

        # Sensitive topics that need careful handling
        self.sensitive_topics = [
            "health", "medical", "legal", "financial_advice",
            "investment", "political", "religious"
        ]

    async def check_message_safety(
        self,
        user_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ServiceResponse:
        """
        Check message safety and apply guardrails

        Args:
            user_id: User identifier
            message: Message content to check
            context: Additional context (optional)

        Returns:
            ServiceResponse with safety assessment
        """
        try:
            logger.debug(f"Checking message safety for user {user_id}")

            # Check rate limiting first
            rate_limit_check = await self._check_rate_limit(user_id)
            if not rate_limit_check["allowed"]:
                raise RateLimitExceeded(
                    message=f"Rate limit exceeded: {rate_limit_check['limit']} messages per hour",
                    details=rate_limit_check
                )

            # Content safety analysis
            content_analysis = await self._analyze_content_safety(message, context)

            # Determine if message should be allowed
            is_safe = content_analysis["risk_level"] in [ContentRisk.SAFE, ContentRisk.LOW_RISK]

            # For medium risk, allow with warnings
            if content_analysis["risk_level"] == ContentRisk.MEDIUM_RISK:
                is_safe = True
                content_analysis["requires_disclaimer"] = True

            # Update rate limiting counter if message allowed
            if is_safe:
                await self._update_rate_limit_counter(user_id)

            return ServiceResponse(
                success=True,
                data={
                    "is_safe": is_safe,
                    "risk_level": content_analysis["risk_level"],
                    "confidence": content_analysis["confidence"],
                    "requires_disclaimer": content_analysis.get("requires_disclaimer", False),
                    "detected_issues": content_analysis.get("issues", []),
                    "rate_limit_status": rate_limit_check
                },
                metadata={
                    "user_id": user_id,
                    "safety_level": self.config.safety_level,
                    "timestamp": datetime.now().isoformat()
                }
            )

        except Exception as e:
            logger.error(f"Error checking message safety for user {user_id}: {e}")
            if isinstance(e, (GuardrailsViolation, RateLimitExceeded)):
                raise
            raise SafetyLayerError(
                message=f"Failed to check message safety: {str(e)}",
                details={"user_id": user_id}
            )

    async def _analyze_content_safety(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze content for safety risks
        """

        message_lower = message.lower()
        issues = []
        confidence = 0.0
        risk_level = ContentRisk.SAFE

        # Check for blocked patterns
        for pattern in self.blocked_patterns:
            if pattern.lower() in message_lower:
                issues.append(f"blocked_pattern: {pattern}")
                risk_level = ContentRisk.BLOCKED
                confidence = 1.0
                break

        # If not blocked, check for warnings
        if risk_level != ContentRisk.BLOCKED:
            for pattern in self.warning_patterns:
                if pattern.lower() in message_lower:
                    issues.append(f"warning_pattern: {pattern}")
                    risk_level = ContentRisk.MEDIUM_RISK
                    confidence = max(confidence, 0.7)

            # Check for sensitive topics
            for topic in self.sensitive_topics:
                if topic.lower() in message_lower:
                    issues.append(f"sensitive_topic: {topic}")
                    if risk_level == ContentRisk.SAFE:
                        risk_level = ContentRisk.LOW_RISK
                    confidence = max(confidence, 0.5)

        # Length-based checks
        if len(message) > 5000:  # Very long messages
            issues.append("message_too_long")
            confidence = max(confidence, 0.3)

        # Set default confidence if no issues found
        if not issues:
            confidence = 0.9  # High confidence it's safe

        return {
            "risk_level": risk_level,
            "confidence": confidence,
            "issues": issues,
            "requires_disclaimer": risk_level == ContentRisk.MEDIUM_RISK
        }

    async def _check_rate_limit(self, user_id: str) -> Dict[str, Any]:
        """
        Check rate limiting for user
        Phase 7: Redis-based implementation placeholder
        """

        # Phase 1: Simple in-memory check (no persistence)
        # Phase 7: Implement Redis-based rate limiting

        current_time = datetime.now()

        # For Phase 1, allow all requests
        # Phase 7: Implement sliding window rate limiting with Redis

        return {
            "allowed": True,
            "limit": self.rate_limit_max,
            "remaining": self.rate_limit_max - 1,
            "reset_time": (current_time + timedelta(seconds=self.rate_limit_window)).isoformat(),
            "implementation": "phase_1_placeholder"
        }

    async def _update_rate_limit_counter(self, user_id: str):
        """
        Update rate limiting counter
        Phase 7 implementation placeholder
        """

        # Phase 7: Implement Redis counter update
        logger.debug(f"Rate limit counter update pending Phase 7: {user_id}")

    async def filter_ai_response(
        self,
        response: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Filter AI response for safety
        """

        # Analyze AI response for potential issues
        analysis = await self._analyze_content_safety(response, context)

        filtered_response = response
        disclaimers = []

        # Add disclaimers for sensitive topics
        if analysis.get("requires_disclaimer"):
            for issue in analysis.get("issues", []):
                if "financial" in issue or "investment" in issue:
                    disclaimers.append("This is not financial advice. Please consult a qualified financial advisor.")
                elif "legal" in issue:
                    disclaimers.append("This is not legal advice. Please consult a qualified attorney.")
                elif "medical" in issue or "health" in issue:
                    disclaimers.append("This is not medical advice. Please consult a healthcare professional.")

        # Block harmful responses
        if analysis["risk_level"] == ContentRisk.BLOCKED:
            filtered_response = "I apologize, but I cannot provide that information. Let me help you with something else instead."

        return {
            "original_response": response,
            "filtered_response": filtered_response,
            "disclaimers": disclaimers,
            "safety_analysis": analysis
        }

    async def log_safety_incident(
        self,
        user_id: str,
        incident_type: str,
        details: Dict[str, Any]
    ):
        """
        Log safety incidents for monitoring
        Phase 7 implementation placeholder
        """

        logger.warning(
            f"Safety incident logged: user={user_id}, type={incident_type}, "
            f"details={details}"
        )

        # Phase 7: Implement incident logging
        # - Store in Supabase for analysis
        # - Generate alerts for serious violations
        # - Update user safety profile

    async def get_user_safety_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Get user safety profile and history
        Phase 7 implementation placeholder
        """

        # Phase 7: Implement safety profile retrieval
        return {
            "user_id": user_id,
            "safety_score": 100,  # 0-100 scale
            "incident_count": 0,
            "last_incident": None,
            "warnings_issued": 0,
            "account_status": "good_standing"
        }

    async def update_safety_configuration(
        self,
        new_config: GuardrailsConfig
    ) -> ServiceResponse:
        """
        Update safety configuration
        """

        # Validate new configuration
        if new_config.rate_limit_messages_per_hour < 1 or new_config.rate_limit_messages_per_hour > 1000:
            raise SafetyLayerError(
                message="Invalid rate limit: must be between 1 and 1000 messages per hour"
            )

        # Update configuration
        self.config = new_config
        self.rate_limit_max = new_config.rate_limit_messages_per_hour

        logger.info(f"Safety configuration updated: {new_config}")

        return ServiceResponse(
            success=True,
            data={"configuration_updated": True},
            metadata={"timestamp": datetime.now().isoformat()}
        )

    async def get_service_health(self) -> Dict[str, Any]:
        """Get service health status"""

        return {
            "service": "safety_layer",
            "status": "healthy",
            "safety_level": self.config.safety_level,
            "rate_limit_max": self.rate_limit_max,
            "rate_limit_window": self.rate_limit_window,
            "content_filtering_enabled": self.config.content_filtering_enabled,
            "user_monitoring_enabled": self.config.user_safety_monitoring,
            "blocked_patterns_count": len(self.blocked_patterns),
            "warning_patterns_count": len(self.warning_patterns),
            "redis_connected": self._redis_client is not None,
            "timestamp": datetime.now().isoformat()
        }

# Service factory function
def create_safety_layer() -> SafetyLayer:
    """Factory function to create SafetyLayer instance"""
    return SafetyLayer()