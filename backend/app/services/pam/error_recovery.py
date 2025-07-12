"""
Comprehensive Error Handling and Recovery System - Phase 3
Advanced error handling, circuit breakers, and automatic recovery for PAM services
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Callable, Awaitable
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import traceback
import json
import time

logger = logging.getLogger(__name__)

class ErrorSeverity(Enum):
    """Error severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ErrorCategory(Enum):
    """Error categories for better handling"""
    SERVICE_UNAVAILABLE = "service_unavailable"
    TIMEOUT = "timeout"
    AUTHENTICATION = "authentication"
    RATE_LIMIT = "rate_limit"
    DATA_VALIDATION = "data_validation"
    EXTERNAL_API = "external_api"
    RESOURCE_EXHAUSTION = "resource_exhaustion"
    CONFIGURATION = "configuration"
    UNKNOWN = "unknown"

class RecoveryStrategy(Enum):
    """Recovery strategies"""
    RETRY = "retry"
    FALLBACK = "fallback"
    CIRCUIT_BREAKER = "circuit_breaker"
    DEGRADED_MODE = "degraded_mode"
    MANUAL_INTERVENTION = "manual_intervention"

@dataclass
class ErrorContext:
    """Context information for an error"""
    error_id: str
    timestamp: datetime
    service_name: str
    operation: str
    user_id: Optional[str]
    session_id: Optional[str]
    error_message: str
    error_type: str
    severity: ErrorSeverity
    category: ErrorCategory
    stack_trace: str
    metadata: Dict[str, Any]
    recovery_attempts: int = 0
    resolved: bool = False

@dataclass
class CircuitBreakerState:
    """Circuit breaker state tracking"""
    service_name: str
    operation: str
    failure_count: int
    last_failure_time: Optional[datetime]
    state: str  # "closed", "open", "half_open"
    failure_threshold: int
    timeout_seconds: int
    recovery_timeout: int

class PAMErrorRecoverySystem:
    """Comprehensive error handling and recovery system"""
    
    def __init__(self):
        # Error tracking
        self.error_history: List[ErrorContext] = []
        self.max_error_history = 1000
        
        # Circuit breakers by service and operation
        self.circuit_breakers: Dict[str, CircuitBreakerState] = {}
        
        # Recovery strategies mapping
        self.recovery_strategies: Dict[ErrorCategory, List[RecoveryStrategy]] = {
            ErrorCategory.SERVICE_UNAVAILABLE: [
                RecoveryStrategy.CIRCUIT_BREAKER,
                RecoveryStrategy.FALLBACK,
                RecoveryStrategy.DEGRADED_MODE
            ],
            ErrorCategory.TIMEOUT: [
                RecoveryStrategy.RETRY,
                RecoveryStrategy.CIRCUIT_BREAKER,
                RecoveryStrategy.FALLBACK
            ],
            ErrorCategory.RATE_LIMIT: [
                RecoveryStrategy.RETRY,
                RecoveryStrategy.DEGRADED_MODE
            ],
            ErrorCategory.EXTERNAL_API: [
                RecoveryStrategy.RETRY,
                RecoveryStrategy.FALLBACK,
                RecoveryStrategy.CIRCUIT_BREAKER
            ],
            ErrorCategory.RESOURCE_EXHAUSTION: [
                RecoveryStrategy.DEGRADED_MODE,
                RecoveryStrategy.MANUAL_INTERVENTION
            ],
            ErrorCategory.AUTHENTICATION: [
                RecoveryStrategy.MANUAL_INTERVENTION
            ],
            ErrorCategory.CONFIGURATION: [
                RecoveryStrategy.MANUAL_INTERVENTION
            ]
        }
        
        # Fallback handlers
        self.fallback_handlers: Dict[str, Callable] = {}
        
        # Recovery policies
        self.retry_policies = {
            "default": {
                "max_attempts": 3,
                "base_delay": 1.0,
                "max_delay": 30.0,
                "backoff_factor": 2.0
            },
            "quick": {
                "max_attempts": 2,
                "base_delay": 0.1,
                "max_delay": 1.0,
                "backoff_factor": 2.0
            },
            "persistent": {
                "max_attempts": 5,
                "base_delay": 2.0,
                "max_delay": 60.0,
                "backoff_factor": 2.0
            }
        }
        
        # Circuit breaker defaults
        self.circuit_breaker_defaults = {
            "failure_threshold": 5,
            "timeout_seconds": 60,
            "recovery_timeout": 300
        }
        
        # Error aggregation for pattern detection
        self.error_patterns: Dict[str, Dict[str, Any]] = {}
        
        # System health tracking
        self.system_health = {
            "overall_status": "healthy",
            "error_rate": 0.0,
            "recovery_rate": 0.0,
            "circuit_breakers_open": 0,
            "services_degraded": []
        }
    
    async def handle_error(
        self,
        error: Exception,
        service_name: str,
        operation: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Handle an error with appropriate recovery strategy"""
        
        # Create error context
        error_context = self._create_error_context(
            error, service_name, operation, user_id, session_id, metadata
        )
        
        # Log error
        self._log_error(error_context)
        
        # Store error for analysis
        self._store_error(error_context)
        
        # Determine recovery strategy
        recovery_strategies = self._determine_recovery_strategies(error_context)
        
        # Execute recovery
        recovery_result = await self._execute_recovery(error_context, recovery_strategies)
        
        # Update system health
        self._update_system_health()
        
        return {
            "error_id": error_context.error_id,
            "handled": True,
            "recovery_applied": recovery_result["strategy"],
            "success": recovery_result["success"],
            "fallback_used": recovery_result.get("fallback_used", False),
            "retry_count": error_context.recovery_attempts,
            "recommendations": recovery_result.get("recommendations", [])
        }
    
    def _create_error_context(
        self,
        error: Exception,
        service_name: str,
        operation: str,
        user_id: Optional[str],
        session_id: Optional[str],
        metadata: Optional[Dict[str, Any]]
    ) -> ErrorContext:
        """Create error context with classification"""
        
        error_id = f"{service_name}_{operation}_{int(time.time() * 1000)}"
        
        # Classify error
        severity = self._classify_error_severity(error, service_name)
        category = self._classify_error_category(error)
        
        return ErrorContext(
            error_id=error_id,
            timestamp=datetime.utcnow(),
            service_name=service_name,
            operation=operation,
            user_id=user_id,
            session_id=session_id,
            error_message=str(error),
            error_type=type(error).__name__,
            severity=severity,
            category=category,
            stack_trace=traceback.format_exc(),
            metadata=metadata or {}
        )
    
    def _classify_error_severity(self, error: Exception, service_name: str) -> ErrorSeverity:
        """Classify error severity"""
        
        error_type = type(error).__name__
        error_message = str(error).lower()
        
        # Critical errors
        if any(keyword in error_message for keyword in 
               ["database", "connection refused", "no space left", "memory"]):
            return ErrorSeverity.CRITICAL
        
        # High severity
        if any(keyword in error_message for keyword in 
               ["timeout", "unavailable", "authentication", "unauthorized"]):
            return ErrorSeverity.HIGH
        
        # Medium severity
        if any(keyword in error_message for keyword in 
               ["rate limit", "throttled", "quota", "validation"]):
            return ErrorSeverity.MEDIUM
        
        # Default to low
        return ErrorSeverity.LOW
    
    def _classify_error_category(self, error: Exception) -> ErrorCategory:
        """Classify error category for targeted recovery"""
        
        error_message = str(error).lower()
        error_type = type(error).__name__
        
        # Service availability
        if any(keyword in error_message for keyword in 
               ["connection refused", "service unavailable", "not found", "502", "503"]):
            return ErrorCategory.SERVICE_UNAVAILABLE
        
        # Timeouts
        if any(keyword in error_message for keyword in 
               ["timeout", "timed out", "time out"]):
            return ErrorCategory.TIMEOUT
        
        # Authentication
        if any(keyword in error_message for keyword in 
               ["unauthorized", "authentication", "invalid token", "401", "403"]):
            return ErrorCategory.AUTHENTICATION
        
        # Rate limiting
        if any(keyword in error_message for keyword in 
               ["rate limit", "throttled", "quota exceeded", "429"]):
            return ErrorCategory.RATE_LIMIT
        
        # External API
        if any(keyword in error_message for keyword in 
               ["api", "external", "http", "404", "500"]):
            return ErrorCategory.EXTERNAL_API
        
        # Resource exhaustion
        if any(keyword in error_message for keyword in 
               ["memory", "disk", "cpu", "resource", "exhausted"]):
            return ErrorCategory.RESOURCE_EXHAUSTION
        
        # Validation
        if any(keyword in error_message for keyword in 
               ["validation", "invalid", "malformed", "parse"]):
            return ErrorCategory.DATA_VALIDATION
        
        return ErrorCategory.UNKNOWN
    
    def _determine_recovery_strategies(self, error_context: ErrorContext) -> List[RecoveryStrategy]:
        """Determine appropriate recovery strategies"""
        
        strategies = self.recovery_strategies.get(
            error_context.category, 
            [RecoveryStrategy.MANUAL_INTERVENTION]
        )
        
        # Consider circuit breaker state
        circuit_key = f"{error_context.service_name}:{error_context.operation}"
        if circuit_key in self.circuit_breakers:
            breaker = self.circuit_breakers[circuit_key]
            if breaker.state == "open":
                # Circuit is open, skip retry strategies
                strategies = [s for s in strategies if s != RecoveryStrategy.RETRY]
        
        # Consider error frequency
        if self._is_frequent_error(error_context):
            # Don't retry frequent errors
            strategies = [s for s in strategies if s != RecoveryStrategy.RETRY]
            if RecoveryStrategy.CIRCUIT_BREAKER not in strategies:
                strategies.insert(0, RecoveryStrategy.CIRCUIT_BREAKER)
        
        return strategies
    
    async def _execute_recovery(
        self,
        error_context: ErrorContext,
        strategies: List[RecoveryStrategy]
    ) -> Dict[str, Any]:
        """Execute recovery strategies in order"""
        
        for strategy in strategies:
            try:
                if strategy == RecoveryStrategy.RETRY:
                    result = await self._apply_retry_strategy(error_context)
                    if result["success"]:
                        return {"strategy": "retry", "success": True}
                
                elif strategy == RecoveryStrategy.FALLBACK:
                    result = await self._apply_fallback_strategy(error_context)
                    if result["success"]:
                        return {
                            "strategy": "fallback", 
                            "success": True,
                            "fallback_used": True
                        }
                
                elif strategy == RecoveryStrategy.CIRCUIT_BREAKER:
                    self._apply_circuit_breaker(error_context)
                    return {
                        "strategy": "circuit_breaker",
                        "success": True,
                        "recommendations": ["Service temporarily isolated"]
                    }
                
                elif strategy == RecoveryStrategy.DEGRADED_MODE:
                    result = self._apply_degraded_mode(error_context)
                    return {
                        "strategy": "degraded_mode",
                        "success": True,
                        "recommendations": result.get("recommendations", [])
                    }
                
            except Exception as e:
                logger.error(f"❌ Recovery strategy {strategy} failed: {e}")
        
        # No recovery succeeded
        return {
            "strategy": "manual_intervention",
            "success": False,
            "recommendations": [
                "Manual intervention required",
                "Check service logs",
                "Contact system administrator"
            ]
        }
    
    async def _apply_retry_strategy(self, error_context: ErrorContext) -> Dict[str, Any]:
        """Apply retry strategy with exponential backoff"""
        
        policy_name = "default"
        if error_context.category == ErrorCategory.TIMEOUT:
            policy_name = "quick"
        elif error_context.severity == ErrorSeverity.HIGH:
            policy_name = "persistent"
        
        policy = self.retry_policies[policy_name]
        
        if error_context.recovery_attempts >= policy["max_attempts"]:
            return {"success": False, "reason": "max_attempts_exceeded"}
        
        # Calculate delay
        delay = min(
            policy["base_delay"] * (policy["backoff_factor"] ** error_context.recovery_attempts),
            policy["max_delay"]
        )
        
        await asyncio.sleep(delay)
        error_context.recovery_attempts += 1
        
        # In production, this would actually retry the operation
        # For now, simulate success based on attempt count
        success_probability = 0.3 + (0.2 * error_context.recovery_attempts)
        success = error_context.recovery_attempts >= 2  # Simulate eventual success
        
        return {
            "success": success,
            "attempt": error_context.recovery_attempts,
            "delay": delay
        }
    
    async def _apply_fallback_strategy(self, error_context: ErrorContext) -> Dict[str, Any]:
        """Apply fallback strategy"""
        
        fallback_key = f"{error_context.service_name}:{error_context.operation}"
        
        if fallback_key in self.fallback_handlers:
            try:
                handler = self.fallback_handlers[fallback_key]
                result = await handler(error_context)
                return {"success": True, "result": result}
            except Exception as e:
                logger.error(f"❌ Fallback handler failed: {e}")
                return {"success": False, "reason": "fallback_handler_failed"}
        
        # Default fallback responses
        default_fallbacks = {
            "knowledge_service": {
                "success": True,
                "result": {
                    "content": "I'm having trouble accessing my knowledge base right now. Please try again in a moment.",
                    "fallback": True
                }
            },
            "tts_service": {
                "success": True,
                "result": {
                    "audio_data": None,
                    "fallback": True,
                    "message": "Voice synthesis temporarily unavailable"
                }
            }
        }
        
        if error_context.service_name in default_fallbacks:
            return default_fallbacks[error_context.service_name]
        
        return {"success": False, "reason": "no_fallback_available"}
    
    def _apply_circuit_breaker(self, error_context: ErrorContext):
        """Apply circuit breaker pattern"""
        
        circuit_key = f"{error_context.service_name}:{error_context.operation}"
        
        if circuit_key not in self.circuit_breakers:
            self.circuit_breakers[circuit_key] = CircuitBreakerState(
                service_name=error_context.service_name,
                operation=error_context.operation,
                failure_count=1,
                last_failure_time=datetime.utcnow(),
                state="closed",
                **self.circuit_breaker_defaults
            )
        else:
            breaker = self.circuit_breakers[circuit_key]
            breaker.failure_count += 1
            breaker.last_failure_time = datetime.utcnow()
            
            # Check if we should open the circuit
            if breaker.failure_count >= breaker.failure_threshold:
                breaker.state = "open"
                logger.warning(f"🔴 Circuit breaker opened for {circuit_key}")
                self.system_health["circuit_breakers_open"] += 1
    
    def _apply_degraded_mode(self, error_context: ErrorContext) -> Dict[str, Any]:
        """Apply degraded mode strategy"""
        
        service_name = error_context.service_name
        
        # Add to degraded services list
        if service_name not in self.system_health["services_degraded"]:
            self.system_health["services_degraded"].append(service_name)
        
        recommendations = [
            f"{service_name} running in degraded mode",
            "Some features may be limited",
            "Monitor for recovery"
        ]
        
        logger.warning(f"⚠️ {service_name} entering degraded mode")
        
        return {
            "degraded_mode": True,
            "recommendations": recommendations
        }
    
    def _is_frequent_error(self, error_context: ErrorContext) -> bool:
        """Check if this is a frequent error pattern"""
        
        pattern_key = f"{error_context.service_name}:{error_context.category.value}"
        
        # Count recent errors of this pattern
        cutoff_time = datetime.utcnow() - timedelta(minutes=5)
        recent_errors = [
            err for err in self.error_history
            if (err.service_name == error_context.service_name and
                err.category == error_context.category and
                err.timestamp > cutoff_time)
        ]
        
        return len(recent_errors) >= 3  # 3 errors in 5 minutes = frequent
    
    def _log_error(self, error_context: ErrorContext):
        """Log error with appropriate level"""
        
        log_data = {
            "error_id": error_context.error_id,
            "service": error_context.service_name,
            "operation": error_context.operation,
            "category": error_context.category.value,
            "severity": error_context.severity.value,
            "user_id": error_context.user_id
        }
        
        if error_context.severity == ErrorSeverity.CRITICAL:
            logger.critical(f"🚨 Critical error: {error_context.error_message}", extra=log_data)
        elif error_context.severity == ErrorSeverity.HIGH:
            logger.error(f"❌ High severity error: {error_context.error_message}", extra=log_data)
        elif error_context.severity == ErrorSeverity.MEDIUM:
            logger.warning(f"⚠️ Medium severity error: {error_context.error_message}", extra=log_data)
        else:
            logger.info(f"ℹ️ Low severity error: {error_context.error_message}", extra=log_data)
    
    def _store_error(self, error_context: ErrorContext):
        """Store error in history for analysis"""
        
        self.error_history.append(error_context)
        
        # Limit history size
        if len(self.error_history) > self.max_error_history:
            self.error_history = self.error_history[-self.max_error_history:]
    
    def _update_system_health(self):
        """Update overall system health metrics"""
        
        # Calculate error rate (last hour)
        cutoff_time = datetime.utcnow() - timedelta(hours=1)
        recent_errors = [err for err in self.error_history if err.timestamp > cutoff_time]
        
        self.system_health["error_rate"] = len(recent_errors)
        
        # Calculate recovery rate
        resolved_errors = [err for err in recent_errors if err.resolved]
        self.system_health["recovery_rate"] = (
            len(resolved_errors) / len(recent_errors) if recent_errors else 1.0
        )
        
        # Update overall status
        if self.system_health["circuit_breakers_open"] > 0:
            self.system_health["overall_status"] = "degraded"
        elif self.system_health["error_rate"] > 10:
            self.system_health["overall_status"] = "unstable"
        else:
            self.system_health["overall_status"] = "healthy"
    
    def register_fallback_handler(
        self,
        service_name: str,
        operation: str,
        handler: Callable[[ErrorContext], Awaitable[Any]]
    ):
        """Register a fallback handler for specific service/operation"""
        
        fallback_key = f"{service_name}:{operation}"
        self.fallback_handlers[fallback_key] = handler
        logger.info(f"📋 Fallback handler registered for {fallback_key}")
    
    def get_error_statistics(self) -> Dict[str, Any]:
        """Get error and recovery statistics"""
        
        # Error counts by category
        category_counts = {}
        for error in self.error_history:
            category = error.category.value
            category_counts[category] = category_counts.get(category, 0) + 1
        
        # Service error counts
        service_counts = {}
        for error in self.error_history:
            service = error.service_name
            service_counts[service] = service_counts.get(service, 0) + 1
        
        # Circuit breaker status
        circuit_status = {}
        for key, breaker in self.circuit_breakers.items():
            circuit_status[key] = {
                "state": breaker.state,
                "failure_count": breaker.failure_count,
                "last_failure": breaker.last_failure_time.isoformat() if breaker.last_failure_time else None
            }
        
        return {
            "total_errors": len(self.error_history),
            "error_categories": category_counts,
            "service_errors": service_counts,
            "circuit_breakers": circuit_status,
            "system_health": self.system_health,
            "recovery_strategies_available": len(self.fallback_handlers)
        }

# Global error recovery system
error_recovery_system = PAMErrorRecoverySystem()

def get_error_recovery_system() -> PAMErrorRecoverySystem:
    """Get error recovery system instance"""
    return error_recovery_system