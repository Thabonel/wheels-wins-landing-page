"""
Comprehensive Error Logging Configuration for PAM API
Extends the existing structlog setup with specialized PAM event logging
"""

import logging
import json
import os
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from pathlib import Path
from typing import Any, Dict, Optional, List, Union
from dataclasses import dataclass, asdict
from enum import Enum
import structlog
from contextlib import contextmanager

from app.core.logging import get_logger, set_request_context
from app.core.config import get_settings
from app.utils.datetime_encoder import DateTimeEncoder

settings = get_settings()


class PAMEventType(Enum):
    """PAM-specific event types for structured logging"""
    API_REQUEST = "api_request"
    API_RESPONSE = "api_response" 
    WEBSOCKET_CONNECT = "websocket_connect"
    WEBSOCKET_DISCONNECT = "websocket_disconnect"
    WEBSOCKET_MESSAGE = "websocket_message"
    AI_REQUEST = "ai_request"
    AI_RESPONSE = "ai_response"
    SECURITY_EVENT = "security_event"
    RATE_LIMIT_VIOLATION = "rate_limit_violation"
    MESSAGE_SIZE_VIOLATION = "message_size_violation"
    AUTHENTICATION_EVENT = "authentication_event"
    TTS_REQUEST = "tts_request"
    TTS_ERROR = "tts_error"
    DATABASE_OPERATION = "database_operation"
    PERFORMANCE_ALERT = "performance_alert"
    CIRCUIT_BREAKER_EVENT = "circuit_breaker_event"
    ERROR_RECOVERY = "error_recovery"
    USER_ACTION = "user_action"
    SYSTEM_HEALTH = "system_health"


class LogSeverity(Enum):
    """Enhanced severity levels for PAM events"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"
    SECURITY = "security"
    PERFORMANCE = "performance"


@dataclass
class PAMLogEvent:
    """Structured PAM log event"""
    event_type: PAMEventType
    severity: LogSeverity
    message: str
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    session_id: Optional[str] = None
    endpoint: Optional[str] = None
    duration_ms: Optional[float] = None
    error_code: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None
    context: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now(timezone.utc)


class PAMLogger:
    """
    Comprehensive PAM Logger with specialized methods for different event types
    
    Features:
    - Structured JSON logging with rotation
    - Event-specific logging methods
    - Security event tracking
    - Performance monitoring
    - Error correlation and analysis
    - Multi-file logging (error, security, performance, audit)
    """
    
    def __init__(self, log_dir: str = "logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # Main structured logger
        self.logger = get_logger("PAM")
        
        # Specialized file loggers
        self.error_logger = self._setup_file_logger("pam_errors", "error")
        self.security_logger = self._setup_file_logger("pam_security", "security")
        self.performance_logger = self._setup_file_logger("pam_performance", "performance") 
        self.audit_logger = self._setup_file_logger("pam_audit", "audit")
        self.api_logger = self._setup_file_logger("pam_api", "api")
        
        # Event counters for monitoring
        self.event_counters = {
            "total_events": 0,
            "error_events": 0,
            "security_events": 0,
            "api_requests": 0,
            "websocket_connections": 0
        }
    
    def _setup_file_logger(self, name: str, log_type: str) -> logging.Logger:
        """Setup specialized file logger with rotation"""
        logger = logging.getLogger(f"pam_{name}")
        logger.setLevel(logging.INFO)
        
        # Remove existing handlers to avoid duplicates
        for handler in logger.handlers[:]:
            logger.removeHandler(handler)
        
        # Rotating file handler (10MB per file, keep 10 files)
        log_file = self.log_dir / f"{name}.log"
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=10,
            encoding='utf-8'
        )
        
        # JSON formatter for structured logs
        formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", '
            '"logger": "%(name)s", "message": %(message)s}',
            datefmt='%Y-%m-%d %H:%M:%S UTC'
        )
        
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        logger.propagate = False  # Prevent duplicate logs
        
        return logger
    
    def _log_event(self, event: PAMLogEvent, additional_data: Optional[Dict] = None):
        """Internal method to log structured PAM events"""
        # Convert event to dict and merge with additional data
        event_data = asdict(event)
        if additional_data:
            event_data.update(additional_data)
        
        # Convert timestamp to string for JSON serialization
        if event.timestamp:
            event_data['timestamp'] = event.timestamp.isoformat()
        
        # Log to main structured logger
        log_method = getattr(self.logger, event.severity.value)
        log_method(event.message, **event_data)
        
        # Log to specialized file loggers based on event type
        json_message = json.dumps(event_data, cls=DateTimeEncoder, ensure_ascii=False)
        
        if event.severity in [LogSeverity.ERROR, LogSeverity.CRITICAL]:
            self.error_logger.error(json_message)
            self.event_counters["error_events"] += 1
        
        if event.event_type in [PAMEventType.SECURITY_EVENT, PAMEventType.RATE_LIMIT_VIOLATION, 
                               PAMEventType.MESSAGE_SIZE_VIOLATION, PAMEventType.AUTHENTICATION_EVENT]:
            self.security_logger.warning(json_message)
            self.event_counters["security_events"] += 1
        
        if event.event_type in [PAMEventType.PERFORMANCE_ALERT] or event.severity == LogSeverity.PERFORMANCE:
            self.performance_logger.info(json_message)
        
        if event.event_type in [PAMEventType.API_REQUEST, PAMEventType.API_RESPONSE]:
            self.api_logger.info(json_message)
            self.event_counters["api_requests"] += 1
        
        # Always log to audit trail
        self.audit_logger.info(json_message)
        self.event_counters["total_events"] += 1
    
    # API Request/Response Logging
    def log_api_request(self, user_id: str, endpoint: str, method: str, 
                       data: Dict[str, Any], request_id: str = None, 
                       ip_address: str = None, user_agent: str = None):
        """Log API request with full context"""
        event = PAMLogEvent(
            event_type=PAMEventType.API_REQUEST,
            severity=LogSeverity.INFO,
            message=f"API request to {method} {endpoint}",
            user_id=user_id,
            request_id=request_id,
            endpoint=endpoint,
            ip_address=ip_address,
            user_agent=user_agent,
            context={
                "method": method,
                "data_size_bytes": len(json.dumps(data, cls=DateTimeEncoder)),
                "has_sensitive_data": self._contains_sensitive_data(data)
            }
        )
        self._log_event(event, {"request_data": self._sanitize_data(data)})
    
    def log_api_response(self, user_id: str, endpoint: str, status_code: int,
                        duration_ms: float, request_id: str = None,
                        error: Exception = None):
        """Log API response with timing and status"""
        severity = LogSeverity.ERROR if status_code >= 400 else LogSeverity.INFO
        error_details = None
        
        if error:
            error_details = {
                "error_type": type(error).__name__,
                "error_message": str(error),
                "error_code": getattr(error, 'status_code', None)
            }
        
        event = PAMLogEvent(
            event_type=PAMEventType.API_RESPONSE,
            severity=severity,
            message=f"API response {status_code} for {endpoint}",
            user_id=user_id,
            request_id=request_id,
            endpoint=endpoint,
            duration_ms=duration_ms,
            error_details=error_details,
            context={
                "status_code": status_code,
                "performance_category": self._categorize_performance(duration_ms)
            }
        )
        self._log_event(event)
    
    # WebSocket Logging
    def log_websocket_connect(self, user_id: str, connection_id: str, 
                             ip_address: str = None):
        """Log WebSocket connection establishment"""
        event = PAMLogEvent(
            event_type=PAMEventType.WEBSOCKET_CONNECT,
            severity=LogSeverity.INFO,
            message="WebSocket connection established",
            user_id=user_id,
            session_id=connection_id,
            ip_address=ip_address
        )
        self._log_event(event)
        self.event_counters["websocket_connections"] += 1
    
    def log_websocket_disconnect(self, user_id: str, connection_id: str,
                                reason: str = None, duration_seconds: float = None):
        """Log WebSocket disconnection"""
        event = PAMLogEvent(
            event_type=PAMEventType.WEBSOCKET_DISCONNECT,
            severity=LogSeverity.INFO,
            message="WebSocket connection closed",
            user_id=user_id,
            session_id=connection_id,
            context={
                "disconnect_reason": reason,
                "connection_duration_seconds": duration_seconds
            }
        )
        self._log_event(event)
    
    def log_websocket_message(self, user_id: str, connection_id: str,
                             message_type: str, message_size_bytes: int,
                             processing_duration_ms: float = None,
                             error: Exception = None):
        """Log WebSocket message processing"""
        severity = LogSeverity.ERROR if error else LogSeverity.INFO
        error_details = None
        
        if error:
            error_details = {
                "error_type": type(error).__name__,
                "error_message": str(error)
            }
        
        event = PAMLogEvent(
            event_type=PAMEventType.WEBSOCKET_MESSAGE,
            severity=severity,
            message=f"WebSocket message processed: {message_type}",
            user_id=user_id,
            session_id=connection_id,
            duration_ms=processing_duration_ms,
            error_details=error_details,
            context={
                "message_type": message_type,
                "message_size_bytes": message_size_bytes,
                "message_size_category": self._categorize_message_size(message_size_bytes)
            }
        )
        self._log_event(event)
    
    # Security Event Logging
    def log_security_event(self, event_type: str, user_id: str, details: str,
                          severity: LogSeverity = LogSeverity.SECURITY,
                          ip_address: str = None, additional_context: Dict = None):
        """Log security-related events"""
        context = additional_context or {}
        context.update({
            "security_event_type": event_type,
            "threat_level": self._assess_threat_level(event_type)
        })
        
        event = PAMLogEvent(
            event_type=PAMEventType.SECURITY_EVENT,
            severity=severity,
            message=f"Security event: {event_type} - {details}",
            user_id=user_id,
            ip_address=ip_address,
            context=context
        )
        self._log_event(event)
    
    def log_rate_limit_violation(self, user_id: str, limit_type: str, 
                                current_count: int, limit: int,
                                ip_address: str = None):
        """Log rate limit violations"""
        event = PAMLogEvent(
            event_type=PAMEventType.RATE_LIMIT_VIOLATION,
            severity=LogSeverity.WARNING,
            message=f"Rate limit violation: {limit_type}",
            user_id=user_id,
            ip_address=ip_address,
            context={
                "limit_type": limit_type,
                "current_count": current_count,
                "limit": limit,
                "violation_percentage": (current_count / limit) * 100 if limit > 0 else 0
            }
        )
        self._log_event(event)
    
    # AI/TTS Logging
    def log_ai_request(self, user_id: str, model: str, prompt_length: int,
                       context_data: Dict = None, request_id: str = None):
        """Log AI/LLM requests"""
        event = PAMLogEvent(
            event_type=PAMEventType.AI_REQUEST,
            severity=LogSeverity.INFO,
            message=f"AI request to {model}",
            user_id=user_id,
            request_id=request_id,
            context={
                "model": model,
                "prompt_length": prompt_length,
                "prompt_category": self._categorize_prompt_length(prompt_length),
                "has_context": bool(context_data)
            }
        )
        self._log_event(event, {"context_data": self._sanitize_data(context_data) if context_data else None})
    
    def log_ai_response(self, user_id: str, model: str, response_length: int,
                       duration_ms: float, tokens_used: int = None,
                       request_id: str = None, error: Exception = None):
        """Log AI/LLM responses"""
        severity = LogSeverity.ERROR if error else LogSeverity.INFO
        error_details = None
        
        if error:
            error_details = {
                "error_type": type(error).__name__,
                "error_message": str(error)
            }
        
        event = PAMLogEvent(
            event_type=PAMEventType.AI_RESPONSE,
            severity=severity,
            message=f"AI response from {model}",
            user_id=user_id,
            request_id=request_id,
            duration_ms=duration_ms,
            error_details=error_details,
            context={
                "model": model,
                "response_length": response_length,
                "tokens_used": tokens_used,
                "tokens_per_second": (tokens_used / (duration_ms / 1000)) if tokens_used and duration_ms > 0 else None
            }
        )
        self._log_event(event)
    
    def log_tts_request(self, user_id: str, engine: str, text_length: int,
                       voice: str = None, request_id: str = None):
        """Log TTS synthesis requests"""
        event = PAMLogEvent(
            event_type=PAMEventType.TTS_REQUEST,
            severity=LogSeverity.INFO,
            message=f"TTS request to {engine}",
            user_id=user_id,
            request_id=request_id,
            context={
                "engine": engine,
                "text_length": text_length,
                "voice": voice,
                "text_category": self._categorize_text_length(text_length)
            }
        )
        self._log_event(event)
    
    def log_tts_error(self, user_id: str, engine: str, error: Exception,
                     fallback_engine: str = None, request_id: str = None):
        """Log TTS synthesis errors and fallbacks"""
        event = PAMLogEvent(
            event_type=PAMEventType.TTS_ERROR,
            severity=LogSeverity.ERROR,
            message=f"TTS error in {engine}",
            user_id=user_id,
            request_id=request_id,
            error_details={
                "error_type": type(error).__name__,
                "error_message": str(error),
                "primary_engine": engine,
                "fallback_engine": fallback_engine,
                "has_fallback": bool(fallback_engine)
            }
        )
        self._log_event(event)
    
    # Performance and System Health
    def log_performance_alert(self, metric: str, current_value: float,
                             threshold: float, severity: LogSeverity = LogSeverity.PERFORMANCE):
        """Log performance alerts and anomalies"""
        event = PAMLogEvent(
            event_type=PAMEventType.PERFORMANCE_ALERT,
            severity=severity,
            message=f"Performance alert: {metric}",
            context={
                "metric": metric,
                "current_value": current_value,
                "threshold": threshold,
                "threshold_exceeded_by": current_value - threshold,
                "severity_level": self._assess_performance_severity(current_value, threshold)
            }
        )
        self._log_event(event)
    
    def log_circuit_breaker_event(self, service: str, state: str, failure_count: int = None):
        """Log circuit breaker state changes"""
        event = PAMLogEvent(
            event_type=PAMEventType.CIRCUIT_BREAKER_EVENT,
            severity=LogSeverity.WARNING if state == "OPEN" else LogSeverity.INFO,
            message=f"Circuit breaker {state.lower()} for {service}",
            context={
                "service": service,
                "circuit_state": state,
                "failure_count": failure_count
            }
        )
        self._log_event(event)
    
    def log_error_recovery(self, component: str, error: Exception, 
                          recovery_action: str, success: bool):
        """Log error recovery attempts"""
        event = PAMLogEvent(
            event_type=PAMEventType.ERROR_RECOVERY,
            severity=LogSeverity.INFO if success else LogSeverity.WARNING,
            message=f"Error recovery {'successful' if success else 'failed'} for {component}",
            error_details={
                "original_error_type": type(error).__name__,
                "original_error_message": str(error),
                "recovery_action": recovery_action,
                "recovery_success": success
            }
        )
        self._log_event(event)
    
    # System Monitoring
    def get_event_statistics(self) -> Dict[str, Any]:
        """Get logging statistics for monitoring"""
        return {
            "event_counters": self.event_counters.copy(),
            "log_files": {
                "error_log": str(self.log_dir / "pam_errors.log"),
                "security_log": str(self.log_dir / "pam_security.log"),
                "performance_log": str(self.log_dir / "pam_performance.log"),
                "audit_log": str(self.log_dir / "pam_audit.log"),
                "api_log": str(self.log_dir / "pam_api.log")
            },
            "log_directory": str(self.log_dir),
            "disk_usage_mb": self._get_log_directory_size()
        }
    
    def reset_counters(self):
        """Reset event counters (for administrative use)"""
        for key in self.event_counters:
            self.event_counters[key] = 0
    
    # Context manager for request tracing
    @contextmanager
    def request_context(self, request_id: str, user_id: str = None,
                       endpoint: str = None, ip_address: str = None):
        """Context manager for request-scoped logging"""
        # Set request context for structlog
        set_request_context(request_id, user_id)
        
        try:
            yield self
        finally:
            # Clear context when done
            from app.core.logging import clear_request_context
            clear_request_context()
    
    # Helper methods for categorization and analysis
    def _contains_sensitive_data(self, data: Dict) -> bool:
        """Check if data contains potentially sensitive information"""
        sensitive_keys = {'password', 'token', 'key', 'secret', 'auth', 'credit_card', 'ssn'}
        def check_keys(obj, keys_to_check=sensitive_keys):
            if isinstance(obj, dict):
                return any(
                    any(sensitive in key.lower() for sensitive in keys_to_check) 
                    for key in obj.keys()
                ) or any(check_keys(value, keys_to_check) for value in obj.values())
            return False
        return check_keys(data)
    
    def _sanitize_data(self, data: Dict, max_length: int = 1000) -> Dict:
        """Sanitize data for logging by removing sensitive info and truncating"""
        if not data:
            return data
        
        sensitive_keys = {'password', 'token', 'key', 'secret', 'auth'}
        sanitized = {}
        
        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in sensitive_keys):
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, str) and len(value) > max_length:
                sanitized[key] = value[:max_length] + "...[TRUNCATED]"
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_data(value, max_length)
            else:
                sanitized[key] = value
        
        return sanitized
    
    def _categorize_performance(self, duration_ms: float) -> str:
        """Categorize API response performance"""
        if duration_ms < 100:
            return "excellent"
        elif duration_ms < 500:
            return "good"
        elif duration_ms < 1000:
            return "acceptable"
        elif duration_ms < 3000:
            return "slow"
        else:
            return "very_slow"
    
    def _categorize_message_size(self, size_bytes: int) -> str:
        """Categorize message size for analysis"""
        if size_bytes < 1024:
            return "small"
        elif size_bytes < 10240:
            return "medium"
        elif size_bytes < 102400:
            return "large"
        else:
            return "very_large"
    
    def _categorize_prompt_length(self, length: int) -> str:
        """Categorize AI prompt length"""
        if length < 100:
            return "short"
        elif length < 500:
            return "medium"
        elif length < 2000:
            return "long"
        else:
            return "very_long"
    
    def _categorize_text_length(self, length: int) -> str:
        """Categorize TTS text length"""
        if length < 50:
            return "short"
        elif length < 200:
            return "medium"
        elif length < 1000:
            return "long"
        else:
            return "very_long"
    
    def _assess_threat_level(self, event_type: str) -> str:
        """Assess threat level of security events"""
        high_threat_events = {"SECURITY_ERROR", "REPEATED_VIOLATIONS", "SUSPICIOUS_MESSAGE"}
        medium_threat_events = {"RATE_LIMIT_VIOLATION", "MESSAGE_SIZE_VIOLATION"}
        
        if event_type in high_threat_events:
            return "high"
        elif event_type in medium_threat_events:
            return "medium"
        else:
            return "low"
    
    def _assess_performance_severity(self, current: float, threshold: float) -> str:
        """Assess performance alert severity"""
        ratio = current / threshold if threshold > 0 else float('inf')
        
        if ratio > 2.0:
            return "critical"
        elif ratio > 1.5:
            return "high"
        elif ratio > 1.2:
            return "medium"
        else:
            return "low"
    
    def _get_log_directory_size(self) -> float:
        """Get total size of log directory in MB"""
        total_size = 0
        for file_path in self.log_dir.rglob("*.log*"):
            if file_path.is_file():
                total_size += file_path.stat().st_size
        return round(total_size / (1024 * 1024), 2)


# Global PAM logger instance
pam_logger = PAMLogger()

# Convenience functions for common operations
def log_api_request(user_id: str, endpoint: str, method: str, data: Dict[str, Any], **kwargs):
    """Convenience function for API request logging"""
    return pam_logger.log_api_request(user_id, endpoint, method, data, **kwargs)

def log_api_response(user_id: str, endpoint: str, status_code: int, duration_ms: float, **kwargs):
    """Convenience function for API response logging"""
    return pam_logger.log_api_response(user_id, endpoint, status_code, duration_ms, **kwargs)

def log_error(user_id: str, error: Exception, context: Dict[str, Any], **kwargs):
    """Convenience function for error logging"""
    event = PAMLogEvent(
        event_type=PAMEventType.ERROR_RECOVERY,
        severity=LogSeverity.ERROR,
        message=f"Error: {type(error).__name__}",
        user_id=user_id,
        error_details={
            "error_type": type(error).__name__,
            "error_message": str(error)
        },
        context=context
    )
    return pam_logger._log_event(event, kwargs)

def log_security_event(event_type: str, user_id: str, details: str, **kwargs):
    """Convenience function for security event logging"""
    return pam_logger.log_security_event(event_type, user_id, details, **kwargs)

# Export main components
__all__ = [
    'PAMLogger',
    'PAMEventType', 
    'LogSeverity',
    'PAMLogEvent',
    'pam_logger',
    'log_api_request',
    'log_api_response', 
    'log_error',
    'log_security_event'
]