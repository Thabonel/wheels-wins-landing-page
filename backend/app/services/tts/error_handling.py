"""
TTS Error Handling and Recovery System
Comprehensive error handling, logging, and recovery mechanisms for TTS services.
"""

import logging
from typing import Dict, List, Optional, Any, Union, Tuple
from enum import Enum
from dataclasses import dataclass
from datetime import datetime, timedelta
import asyncio
import json


logger = logging.getLogger(__name__)


class TTSErrorType(Enum):
    """Categories of TTS errors for appropriate handling"""
    NETWORK_ERROR = "network_error"
    AUTHENTICATION_ERROR = "authentication_error"
    QUOTA_EXCEEDED = "quota_exceeded"
    VOICE_NOT_FOUND = "voice_not_found"
    ENGINE_UNAVAILABLE = "engine_unavailable"
    INVALID_TEXT = "invalid_text"
    TIMEOUT_ERROR = "timeout_error"
    CONFIGURATION_ERROR = "configuration_error"
    SYSTEM_ERROR = "system_error"
    UNKNOWN_ERROR = "unknown_error"


class TTSErrorSeverity(Enum):
    """Error severity levels"""
    LOW = "low"           # Minor issues, can continue
    MEDIUM = "medium"     # Significant issues, fallback recommended
    HIGH = "high"         # Critical issues, immediate fallback required
    CRITICAL = "critical" # System-wide issues, disable TTS


@dataclass
class TTSError:
    """Structured TTS error information"""
    error_type: TTSErrorType
    severity: TTSErrorSeverity
    message: str
    engine: str
    voice_id: Optional[str] = None
    timestamp: datetime = None
    details: Dict[str, Any] = None
    recoverable: bool = True
    suggested_action: str = ""
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
        if self.details is None:
            self.details = {}


class TTSErrorClassifier:
    """Classifies and categorizes TTS errors for appropriate handling"""
    
    # Error pattern mappings
    ERROR_PATTERNS = {
        # Network-related errors
        TTSErrorType.NETWORK_ERROR: [
            "connection", "network", "dns", "timeout", "unreachable",
            "connecterror", "networkerror", "readtimeout", "connectionerror"
        ],
        
        # Authentication errors
        TTSErrorType.AUTHENTICATION_ERROR: [
            "401", "403", "unauthorized", "forbidden", "api key", "authentication",
            "invalid key", "access denied", "permission denied"
        ],
        
        # Quota/rate limiting errors
        TTSErrorType.QUOTA_EXCEEDED: [
            "quota", "rate limit", "429", "too many requests", "limit exceeded",
            "usage limit", "billing", "credits"
        ],
        
        # Voice/model errors
        TTSErrorType.VOICE_NOT_FOUND: [
            "voice not found", "invalid voice", "unknown voice", "voice id",
            "speaker not found", "model not found"
        ],
        
        # Engine availability errors
        TTSErrorType.ENGINE_UNAVAILABLE: [
            "service unavailable", "503", "502", "500", "internal server error",
            "maintenance", "temporarily unavailable", "engine not found"
        ],
        
        # Text/input errors
        TTSErrorType.INVALID_TEXT: [
            "invalid text", "text too long", "empty text", "unsupported character",
            "text length", "invalid input", "bad request", "400"
        ],
        
        # Timeout errors
        TTSErrorType.TIMEOUT_ERROR: [
            "timeout", "timed out", "request timeout", "response timeout",
            "read timeout", "connection timeout"
        ],
        
        # Configuration errors
        TTSErrorType.CONFIGURATION_ERROR: [
            "configuration", "config", "missing", "not configured", "setup",
            "initialization", "invalid configuration"
        ]
    }
    
    @classmethod
    def classify_error(cls, error_message: str, engine: str) -> TTSError:
        """Classify an error message into structured error information"""
        
        error_message_lower = error_message.lower()
        
        # Determine error type
        error_type = TTSErrorType.UNKNOWN_ERROR
        for err_type, patterns in cls.ERROR_PATTERNS.items():
            if any(pattern in error_message_lower for pattern in patterns):
                error_type = err_type
                break
        
        # Determine severity based on error type
        severity_mapping = {
            TTSErrorType.NETWORK_ERROR: TTSErrorSeverity.HIGH,
            TTSErrorType.AUTHENTICATION_ERROR: TTSErrorSeverity.CRITICAL,
            TTSErrorType.QUOTA_EXCEEDED: TTSErrorSeverity.HIGH,
            TTSErrorType.VOICE_NOT_FOUND: TTSErrorSeverity.MEDIUM,
            TTSErrorType.ENGINE_UNAVAILABLE: TTSErrorSeverity.HIGH,
            TTSErrorType.INVALID_TEXT: TTSErrorSeverity.LOW,
            TTSErrorType.TIMEOUT_ERROR: TTSErrorSeverity.MEDIUM,
            TTSErrorType.CONFIGURATION_ERROR: TTSErrorSeverity.CRITICAL,
            TTSErrorType.SYSTEM_ERROR: TTSErrorSeverity.HIGH,
            TTSErrorType.UNKNOWN_ERROR: TTSErrorSeverity.MEDIUM
        }
        
        severity = severity_mapping.get(error_type, TTSErrorSeverity.MEDIUM)
        
        # Determine if error is recoverable
        recoverable_errors = {
            TTSErrorType.NETWORK_ERROR,
            TTSErrorType.TIMEOUT_ERROR,
            TTSErrorType.ENGINE_UNAVAILABLE,
            TTSErrorType.VOICE_NOT_FOUND,
            TTSErrorType.INVALID_TEXT
        }
        
        recoverable = error_type in recoverable_errors
        
        # Generate suggested action
        action_mapping = {
            TTSErrorType.NETWORK_ERROR: "Retry with different engine or check network connectivity",
            TTSErrorType.AUTHENTICATION_ERROR: "Check API keys and authentication configuration",
            TTSErrorType.QUOTA_EXCEEDED: "Use different engine or wait for quota reset",
            TTSErrorType.VOICE_NOT_FOUND: "Use fallback voice or voice mapping",
            TTSErrorType.ENGINE_UNAVAILABLE: "Switch to fallback engine",
            TTSErrorType.INVALID_TEXT: "Validate and sanitize input text",
            TTSErrorType.TIMEOUT_ERROR: "Retry with shorter text or different engine",
            TTSErrorType.CONFIGURATION_ERROR: "Check TTS service configuration",
            TTSErrorType.SYSTEM_ERROR: "Check system resources and dependencies",
            TTSErrorType.UNKNOWN_ERROR: "Retry with fallback engine"
        }
        
        suggested_action = action_mapping.get(error_type, "Contact system administrator")
        
        return TTSError(
            error_type=error_type,
            severity=severity,
            message=error_message,
            engine=engine,
            recoverable=recoverable,
            suggested_action=suggested_action,
            details={"original_message": error_message}
        )


class TTSErrorRecovery:
    """Handles TTS error recovery and fallback strategies"""
    
    def __init__(self):
        self.error_history: List[TTSError] = []
        self.engine_health: Dict[str, Dict[str, Any]] = {}
        self.circuit_breakers: Dict[str, Dict[str, Any]] = {}
        self.recovery_strategies = self._initialize_recovery_strategies()
    
    def _initialize_recovery_strategies(self) -> Dict[TTSErrorType, List[str]]:
        """Initialize recovery strategies for different error types"""
        return {
            TTSErrorType.NETWORK_ERROR: [
                "retry_with_delay",
                "switch_engine",
                "use_cached_response",
                "return_text_fallback"
            ],
            TTSErrorType.AUTHENTICATION_ERROR: [
                "switch_engine",
                "use_system_tts",
                "return_text_fallback"
            ],
            TTSErrorType.QUOTA_EXCEEDED: [
                "switch_engine",
                "use_system_tts",
                "queue_for_later",
                "return_text_fallback"
            ],
            TTSErrorType.VOICE_NOT_FOUND: [
                "use_fallback_voice",
                "voice_mapping_fallback",
                "switch_engine",
                "return_text_fallback"
            ],
            TTSErrorType.ENGINE_UNAVAILABLE: [
                "switch_engine",
                "use_system_tts", 
                "return_text_fallback"
            ],
            TTSErrorType.INVALID_TEXT: [
                "sanitize_text",
                "truncate_text",
                "return_text_fallback"
            ],
            TTSErrorType.TIMEOUT_ERROR: [
                "retry_with_shorter_text",
                "switch_engine",
                "return_text_fallback"
            ],
            TTSErrorType.CONFIGURATION_ERROR: [
                "use_default_config",
                "switch_engine",
                "return_text_fallback"
            ]
        }
    
    def record_error(self, error: TTSError):
        """Record error for analysis and pattern detection"""
        self.error_history.append(error)
        
        # Keep only last 100 errors to prevent memory issues
        if len(self.error_history) > 100:
            self.error_history = self.error_history[-100:]
        
        # Update engine health tracking
        self._update_engine_health(error)
        
        # Update circuit breaker state
        self._update_circuit_breaker(error)
        
        logger.warning(
            f"TTS Error Recorded: {error.error_type.value} in {error.engine} - {error.message}"
        )
    
    def _update_engine_health(self, error: TTSError):
        """Update engine health metrics based on error"""
        engine = error.engine
        
        if engine not in self.engine_health:
            self.engine_health[engine] = {
                "total_errors": 0,
                "recent_errors": 0,
                "last_error": None,
                "error_types": {},
                "health_score": 1.0,
                "consecutive_failures": 0
            }
        
        health = self.engine_health[engine]
        health["total_errors"] += 1
        health["recent_errors"] += 1
        health["last_error"] = error.timestamp
        health["consecutive_failures"] += 1
        
        # Track error types
        error_type_key = error.error_type.value
        if error_type_key not in health["error_types"]:
            health["error_types"][error_type_key] = 0
        health["error_types"][error_type_key] += 1
        
        # Calculate health score (0.0 to 1.0)
        # Based on recent error frequency and severity
        recent_critical_errors = sum(
            1 for e in self.error_history[-10:] 
            if e.engine == engine and e.severity == TTSErrorSeverity.CRITICAL
        )
        
        recent_high_errors = sum(
            1 for e in self.error_history[-10:]
            if e.engine == engine and e.severity == TTSErrorSeverity.HIGH
        )
        
        # Penalty calculation
        critical_penalty = recent_critical_errors * 0.3
        high_penalty = recent_high_errors * 0.2
        consecutive_penalty = min(health["consecutive_failures"] * 0.1, 0.5)
        
        health["health_score"] = max(0.0, 1.0 - critical_penalty - high_penalty - consecutive_penalty)
    
    def _update_circuit_breaker(self, error: TTSError):
        """Update circuit breaker state for engine"""
        engine = error.engine
        
        if engine not in self.circuit_breakers:
            self.circuit_breakers[engine] = {
                "state": "closed",  # closed, open, half_open
                "failure_count": 0,
                "last_failure": None,
                "next_retry": None,
                "timeout": 60  # seconds
            }
        
        breaker = self.circuit_breakers[engine]
        breaker["failure_count"] += 1
        breaker["last_failure"] = error.timestamp
        
        # Open circuit breaker if too many failures
        if breaker["failure_count"] >= 5 and breaker["state"] == "closed":
            breaker["state"] = "open"
            breaker["next_retry"] = datetime.utcnow() + timedelta(seconds=breaker["timeout"])
            logger.warning(f"Circuit breaker OPENED for {engine} due to repeated failures")
        
        # Exponential backoff for timeout
        if breaker["state"] == "open":
            breaker["timeout"] = min(breaker["timeout"] * 2, 300)  # Max 5 minutes
    
    def should_use_engine(self, engine: str) -> bool:
        """Check if engine should be used based on circuit breaker state"""
        if engine not in self.circuit_breakers:
            return True
        
        breaker = self.circuit_breakers[engine]
        
        if breaker["state"] == "closed":
            return True
        elif breaker["state"] == "open":
            # Check if retry time has passed
            if datetime.utcnow() >= breaker["next_retry"]:
                breaker["state"] = "half_open"
                breaker["failure_count"] = 0
                logger.info(f"Circuit breaker HALF-OPEN for {engine} - attempting recovery")
                return True
            return False
        elif breaker["state"] == "half_open":
            return True
        
        return False
    
    def record_success(self, engine: str):
        """Record successful operation for engine health recovery"""
        if engine in self.engine_health:
            health = self.engine_health[engine]
            health["consecutive_failures"] = 0
            health["recent_errors"] = max(0, health["recent_errors"] - 1)
            health["health_score"] = min(1.0, health["health_score"] + 0.1)
        
        if engine in self.circuit_breakers:
            breaker = self.circuit_breakers[engine]
            if breaker["state"] == "half_open":
                breaker["state"] = "closed"
                breaker["failure_count"] = 0
                breaker["timeout"] = 60  # Reset timeout
                logger.info(f"Circuit breaker CLOSED for {engine} - recovery successful")
    
    def get_recovery_strategies(self, error: TTSError) -> List[str]:
        """Get recommended recovery strategies for an error"""
        return self.recovery_strategies.get(error.error_type, ["return_text_fallback"])
    
    def get_engine_health_report(self) -> Dict[str, Any]:
        """Generate comprehensive engine health report"""
        now = datetime.utcnow()
        
        report = {
            "timestamp": now.isoformat(),
            "total_errors_recorded": len(self.error_history),
            "engines": {}
        }
        
        for engine, health in self.engine_health.items():
            # Calculate recent error rate (last hour)
            recent_errors = [
                e for e in self.error_history
                if e.engine == engine and (now - e.timestamp).total_seconds() < 3600
            ]
            
            breaker = self.circuit_breakers.get(engine, {"state": "closed"})
            
            report["engines"][engine] = {
                "health_score": health["health_score"],
                "total_errors": health["total_errors"],
                "consecutive_failures": health["consecutive_failures"],
                "recent_error_count": len(recent_errors),
                "circuit_breaker_state": breaker["state"],
                "should_use": self.should_use_engine(engine),
                "last_error": health["last_error"].isoformat() if health["last_error"] else None,
                "error_types": health["error_types"]
            }
        
        return report
    
    def get_error_analytics(self, hours: int = 24) -> Dict[str, Any]:
        """Get error analytics for specified time period"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        recent_errors = [e for e in self.error_history if e.timestamp >= cutoff_time]
        
        if not recent_errors:
            return {"message": f"No errors in the last {hours} hours"}
        
        # Error type distribution
        error_type_counts = {}
        for error in recent_errors:
            error_type = error.error_type.value
            error_type_counts[error_type] = error_type_counts.get(error_type, 0) + 1
        
        # Engine error distribution
        engine_error_counts = {}
        for error in recent_errors:
            engine = error.engine
            engine_error_counts[engine] = engine_error_counts.get(engine, 0) + 1
        
        # Severity distribution
        severity_counts = {}
        for error in recent_errors:
            severity = error.severity.value
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        return {
            "period_hours": hours,
            "total_errors": len(recent_errors),
            "error_types": error_type_counts,
            "engines": engine_error_counts,
            "severities": severity_counts,
            "most_common_error": max(error_type_counts.items(), key=lambda x: x[1])[0] if error_type_counts else None,
            "most_problematic_engine": max(engine_error_counts.items(), key=lambda x: x[1])[0] if engine_error_counts else None
        }


class TTSFallbackManager:
    """Manages TTS fallback strategies and recovery actions"""
    
    def __init__(self, error_recovery: TTSErrorRecovery):
        self.error_recovery = error_recovery
        self.fallback_actions = self._initialize_fallback_actions()
    
    def _initialize_fallback_actions(self):
        """Initialize fallback action implementations"""
        return {
            "retry_with_delay": self._retry_with_delay,
            "switch_engine": self._switch_engine,
            "use_cached_response": self._use_cached_response,
            "return_text_fallback": self._return_text_fallback,
            "use_fallback_voice": self._use_fallback_voice,
            "voice_mapping_fallback": self._voice_mapping_fallback,
            "use_system_tts": self._use_system_tts,
            "sanitize_text": self._sanitize_text,
            "truncate_text": self._truncate_text,
            "retry_with_shorter_text": self._retry_with_shorter_text,
            "use_default_config": self._use_default_config,
            "queue_for_later": self._queue_for_later
        }
    
    async def execute_recovery_strategy(
        self, 
        error: TTSError, 
        original_request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute recovery strategy for a TTS error"""
        
        strategies = self.error_recovery.get_recovery_strategies(error)
        
        for strategy in strategies:
            try:
                if strategy in self.fallback_actions:
                    logger.info(f"Executing recovery strategy: {strategy} for {error.engine}")
                    result = await self.fallback_actions[strategy](error, original_request)
                    
                    if result.get("success"):
                        logger.info(f"Recovery strategy {strategy} successful")
                        return result
                    else:
                        logger.warning(f"Recovery strategy {strategy} failed: {result.get('error')}")
                        continue
                else:
                    logger.warning(f"Unknown recovery strategy: {strategy}")
                    continue
                    
            except Exception as e:
                logger.error(f"Recovery strategy {strategy} raised exception: {e}")
                continue
        
        # All strategies failed, return text fallback
        return await self._return_text_fallback(error, original_request)
    
    async def _retry_with_delay(self, error: TTSError, request: Dict[str, Any]) -> Dict[str, Any]:
        """Retry the same request with exponential backoff delay"""
        delay = min(2 ** request.get("retry_count", 0), 30)  # Max 30 seconds
        await asyncio.sleep(delay)
        
        return {
            "success": False,
            "action": "retry_with_delay",
            "retry_delay": delay,
            "retry_request": {**request, "retry_count": request.get("retry_count", 0) + 1}
        }
    
    async def _switch_engine(self, error: TTSError, request: Dict[str, Any]) -> Dict[str, Any]:
        """Switch to a different TTS engine"""
        current_engine = error.engine
        available_engines = ["edge", "coqui", "system", "supabase"]
        
        # Remove current engine and find next healthy engine
        available_engines = [e for e in available_engines if e != current_engine]
        
        for engine in available_engines:
            if self.error_recovery.should_use_engine(engine):
                return {
                    "success": False,
                    "action": "switch_engine",
                    "new_engine": engine,
                    "retry_request": {**request, "preferred_engine": engine}
                }
        
        return {"success": False, "error": "No healthy engines available"}
    
    async def _use_cached_response(self, error: TTSError, request: Dict[str, Any]) -> Dict[str, Any]:
        """Attempt to use cached TTS response"""
        # This would integrate with the TTS cache system
        return {"success": False, "error": "No cached response available"}
    
    async def _return_text_fallback(self, error: TTSError, request: Dict[str, Any]) -> Dict[str, Any]:
        """Return text-only response as final fallback"""
        return {
            "success": True,
            "action": "text_fallback",
            "response": {
                "text": request.get("text", ""),
                "audio_data": None,
                "engine": "text_fallback",
                "quality": "fallback",
                "fallback_used": True,
                "error": error.message
            }
        }
    
    async def _use_fallback_voice(self, error: TTSError, request: Dict[str, Any]) -> Dict[str, Any]:
        """Use a fallback voice for the same engine"""
        fallback_voices = {
            "edge": "en-US-JennyNeural",
            "coqui": "p225",
            "system": "default",
            "supabase": "nari-dia"
        }
        
        fallback_voice = fallback_voices.get(error.engine)
        if fallback_voice:
            return {
                "success": False,
                "action": "use_fallback_voice",
                "retry_request": {**request, "voice_id": fallback_voice}
            }
        
        return {"success": False, "error": "No fallback voice available for engine"}
    
    async def _voice_mapping_fallback(self, error: TTSError, request: Dict[str, Any]) -> Dict[str, Any]:
        """Use voice mapping system to find alternative voice"""
        # This would integrate with the voice mapping service
        return {
            "success": False,
            "action": "voice_mapping_fallback",
            "retry_request": {**request, "voice_id": "pam_default"}
        }
    
    async def _use_system_tts(self, error: TTSError, request: Dict[str, Any]) -> Dict[str, Any]:
        """Switch to system TTS as fallback"""
        return {
            "success": False,
            "action": "use_system_tts",
            "retry_request": {**request, "preferred_engine": "system"}
        }
    
    async def _sanitize_text(self, error: TTSError, request: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize text to remove problematic characters"""
        text = request.get("text", "")
        
        # Basic text sanitization
        sanitized_text = "".join(char for char in text if char.isprintable())
        sanitized_text = sanitized_text.replace("\n", " ").replace("\t", " ")
        
        if sanitized_text != text and len(sanitized_text) > 0:
            return {
                "success": False,
                "action": "sanitize_text",
                "retry_request": {**request, "text": sanitized_text}
            }
        
        return {"success": False, "error": "Text sanitization did not help"}
    
    async def _truncate_text(self, error: TTSError, request: Dict[str, Any]) -> Dict[str, Any]:
        """Truncate text if it's too long"""
        text = request.get("text", "")
        max_length = 1000  # Conservative limit
        
        if len(text) > max_length:
            truncated_text = text[:max_length].rsplit(" ", 1)[0] + "..."
            return {
                "success": False,
                "action": "truncate_text",
                "retry_request": {**request, "text": truncated_text}
            }
        
        return {"success": False, "error": "Text is not too long"}
    
    async def _retry_with_shorter_text(self, error: TTSError, request: Dict[str, Any]) -> Dict[str, Any]:
        """Split text into smaller chunks for processing"""
        text = request.get("text", "")
        
        # Split at sentence boundaries
        sentences = text.split(". ")
        if len(sentences) > 1:
            shorter_text = sentences[0] + "."
            return {
                "success": False,
                "action": "retry_with_shorter_text",
                "retry_request": {**request, "text": shorter_text}
            }
        
        return {"success": False, "error": "Cannot make text shorter"}
    
    async def _use_default_config(self, error: TTSError, request: Dict[str, Any]) -> Dict[str, Any]:
        """Use default configuration settings"""
        default_request = {
            "text": request.get("text", ""),
            "voice_id": "pam_default",
            "engine": "edge"
        }
        
        return {
            "success": False,
            "action": "use_default_config",
            "retry_request": default_request
        }
    
    async def _queue_for_later(self, error: TTSError, request: Dict[str, Any]) -> Dict[str, Any]:
        """Queue request for later processing (quota exceeded scenarios)"""
        # This would integrate with a task queue system
        return {
            "success": True,
            "action": "queued_for_later",
            "response": {
                "text": request.get("text", ""),
                "audio_data": None,
                "engine": "queued",
                "quality": "deferred",
                "queued": True,
                "message": "Request queued due to quota limits"
            }
        }


# Global error handling instances
error_classifier = TTSErrorClassifier()
error_recovery = TTSErrorRecovery()
fallback_manager = TTSFallbackManager(error_recovery)


def get_error_recovery() -> TTSErrorRecovery:
    """Get the global error recovery instance"""
    return error_recovery


def get_fallback_manager() -> TTSFallbackManager:
    """Get the global fallback manager instance"""
    return fallback_manager


def classify_and_handle_error(error_message: str, engine: str) -> TTSError:
    """Convenience function to classify and record an error"""
    error = error_classifier.classify_error(error_message, engine)
    error_recovery.record_error(error)
    return error