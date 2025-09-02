"""
PAM Reliability & Fault Tolerance System - Phase 5
Advanced reliability patterns, circuit breakers, retries, and resilience
"""

import asyncio
import logging
import time
import random
from typing import Dict, Any, List, Optional, Callable, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import uuid
from collections import defaultdict, deque
import threading
from functools import wraps

import redis
import aiohttp

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, requests blocked
    HALF_OPEN = "half_open"  # Testing if service recovered


class RetryStrategy(Enum):
    FIXED_DELAY = "fixed_delay"
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    LINEAR_BACKOFF = "linear_backoff"
    RANDOM_JITTER = "random_jitter"


class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    CRITICAL = "critical"


@dataclass
class CircuitBreakerConfig:
    name: str
    failure_threshold: int = 5
    recovery_timeout_seconds: int = 60
    expected_exception_types: tuple = field(default_factory=lambda: (Exception,))
    half_open_max_calls: int = 3
    minimum_throughput: int = 10
    sliding_window_seconds: int = 60


@dataclass
class RetryConfig:
    max_attempts: int = 3
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
    base_delay_seconds: float = 1.0
    max_delay_seconds: float = 60.0
    jitter: bool = True
    retry_on_exceptions: tuple = field(default_factory=lambda: (Exception,))


@dataclass 
class HealthCheck:
    name: str
    check_function: Callable[[], bool]
    interval_seconds: int = 30
    timeout_seconds: int = 10
    enabled: bool = True
    critical: bool = False


@dataclass
class ServiceMetrics:
    name: str
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    average_response_time_ms: float = 0.0
    last_request_time: Optional[datetime] = None
    circuit_breaker_state: CircuitState = CircuitState.CLOSED
    health_status: HealthStatus = HealthStatus.HEALTHY


class CircuitBreaker:
    """Circuit breaker implementation for fault tolerance"""
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None
        self.half_open_calls = 0
        self.request_history = deque(maxlen=1000)  # Track recent requests
        self.lock = threading.RLock()
        
        logger.info(f"Circuit breaker initialized: {config.name}")
    
    def __call__(self, func):
        """Decorator to wrap functions with circuit breaker"""
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._execute_with_circuit_breaker(func, *args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return asyncio.run(self._execute_with_circuit_breaker_sync(func, *args, **kwargs))
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    async def _execute_with_circuit_breaker(self, func, *args, **kwargs):
        """Execute async function with circuit breaker protection"""
        
        with self.lock:
            # Check circuit state
            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitState.HALF_OPEN
                    self.half_open_calls = 0
                else:
                    raise CircuitBreakerOpenError(f"Circuit breaker {self.config.name} is OPEN")
            
            elif self.state == CircuitState.HALF_OPEN:
                if self.half_open_calls >= self.config.half_open_max_calls:
                    raise CircuitBreakerOpenError(f"Circuit breaker {self.config.name} is HALF_OPEN with max calls reached")
                self.half_open_calls += 1
        
        # Execute the function
        start_time = time.time()
        try:
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            
            # Record success
            execution_time = (time.time() - start_time) * 1000
            self._record_success(execution_time)
            
            return result
            
        except Exception as e:
            # Check if this is an expected exception type
            if isinstance(e, self.config.expected_exception_types):
                execution_time = (time.time() - start_time) * 1000
                self._record_failure(execution_time)
            
            raise
    
    async def _execute_with_circuit_breaker_sync(self, func, *args, **kwargs):
        """Execute sync function with circuit breaker protection"""
        
        with self.lock:
            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitState.HALF_OPEN
                    self.half_open_calls = 0
                else:
                    raise CircuitBreakerOpenError(f"Circuit breaker {self.config.name} is OPEN")
            
            elif self.state == CircuitState.HALF_OPEN:
                if self.half_open_calls >= self.config.half_open_max_calls:
                    raise CircuitBreakerOpenError(f"Circuit breaker {self.config.name} is HALF_OPEN with max calls reached")
                self.half_open_calls += 1
        
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            execution_time = (time.time() - start_time) * 1000
            self._record_success(execution_time)
            return result
            
        except Exception as e:
            if isinstance(e, self.config.expected_exception_types):
                execution_time = (time.time() - start_time) * 1000
                self._record_failure(execution_time)
            raise
    
    def _record_success(self, execution_time_ms: float):
        """Record successful execution"""
        
        with self.lock:
            self.request_history.append({
                "timestamp": datetime.utcnow(),
                "success": True,
                "execution_time_ms": execution_time_ms
            })
            
            if self.state == CircuitState.HALF_OPEN:
                # If we get enough successes in half-open, close the circuit
                recent_successes = sum(1 for r in list(self.request_history)[-self.config.half_open_max_calls:] if r["success"])
                if recent_successes >= self.config.half_open_max_calls:
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
                    logger.info(f"Circuit breaker {self.config.name} CLOSED after recovery")
            
            elif self.state == CircuitState.CLOSED:
                # Reset failure count on success
                self.failure_count = max(0, self.failure_count - 1)
    
    def _record_failure(self, execution_time_ms: float):
        """Record failed execution"""
        
        with self.lock:
            self.request_history.append({
                "timestamp": datetime.utcnow(),
                "success": False,
                "execution_time_ms": execution_time_ms
            })
            
            self.failure_count += 1
            self.last_failure_time = datetime.utcnow()
            
            # Check if we should open the circuit
            if self._should_open_circuit():
                self.state = CircuitState.OPEN
                logger.warning(f"Circuit breaker {self.config.name} OPENED after {self.failure_count} failures")
    
    def _should_open_circuit(self) -> bool:
        """Determine if circuit should be opened"""
        
        # Check failure threshold
        if self.failure_count < self.config.failure_threshold:
            return False
        
        # Check minimum throughput
        window_start = datetime.utcnow() - timedelta(seconds=self.config.sliding_window_seconds)
        recent_requests = [r for r in self.request_history if r["timestamp"] > window_start]
        
        if len(recent_requests) < self.config.minimum_throughput:
            return False
        
        # Calculate failure rate
        failures = sum(1 for r in recent_requests if not r["success"])
        failure_rate = failures / len(recent_requests)
        
        return failure_rate >= 0.5  # 50% failure rate threshold
    
    def _should_attempt_reset(self) -> bool:
        """Determine if we should attempt to reset from OPEN to HALF_OPEN"""
        
        if not self.last_failure_time:
            return True
        
        return (datetime.utcnow() - self.last_failure_time).total_seconds() >= self.config.recovery_timeout_seconds
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get circuit breaker metrics"""
        
        with self.lock:
            total_requests = len(self.request_history)
            if total_requests == 0:
                return {
                    "name": self.config.name,
                    "state": self.state.value,
                    "failure_count": self.failure_count,
                    "total_requests": 0,
                    "success_rate": 0.0,
                    "average_response_time_ms": 0.0
                }
            
            successful_requests = sum(1 for r in self.request_history if r["success"])
            success_rate = successful_requests / total_requests
            avg_response_time = sum(r["execution_time_ms"] for r in self.request_history) / total_requests
            
            return {
                "name": self.config.name,
                "state": self.state.value,
                "failure_count": self.failure_count,
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "success_rate": round(success_rate, 3),
                "average_response_time_ms": round(avg_response_time, 2),
                "last_failure_time": self.last_failure_time.isoformat() if self.last_failure_time else None
            }


class RetryHandler:
    """Advanced retry handler with multiple strategies"""
    
    def __init__(self, config: RetryConfig):
        self.config = config
    
    def __call__(self, func):
        """Decorator to add retry logic to functions"""
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._execute_with_retry(func, *args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return asyncio.run(self._execute_with_retry_sync(func, *args, **kwargs))
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    async def _execute_with_retry(self, func, *args, **kwargs):
        """Execute async function with retry logic"""
        
        last_exception = None
        
        for attempt in range(self.config.max_attempts):
            try:
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)
                    
            except Exception as e:
                last_exception = e
                
                # Check if we should retry on this exception
                if not isinstance(e, self.config.retry_on_exceptions):
                    raise
                
                # Don't delay on last attempt
                if attempt < self.config.max_attempts - 1:
                    delay = self._calculate_delay(attempt)
                    logger.warning(f"Attempt {attempt + 1} failed, retrying in {delay}s: {str(e)}")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"All {self.config.max_attempts} attempts failed")
        
        raise last_exception
    
    async def _execute_with_retry_sync(self, func, *args, **kwargs):
        """Execute sync function with retry logic"""
        
        last_exception = None
        
        for attempt in range(self.config.max_attempts):
            try:
                return func(*args, **kwargs)
                
            except Exception as e:
                last_exception = e
                
                if not isinstance(e, self.config.retry_on_exceptions):
                    raise
                
                if attempt < self.config.max_attempts - 1:
                    delay = self._calculate_delay(attempt)
                    logger.warning(f"Attempt {attempt + 1} failed, retrying in {delay}s: {str(e)}")
                    time.sleep(delay)
        
        raise last_exception
    
    def _calculate_delay(self, attempt: int) -> float:
        """Calculate delay based on retry strategy"""
        
        if self.config.strategy == RetryStrategy.FIXED_DELAY:
            delay = self.config.base_delay_seconds
            
        elif self.config.strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            delay = self.config.base_delay_seconds * (2 ** attempt)
            
        elif self.config.strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = self.config.base_delay_seconds * (attempt + 1)
            
        else:  # RANDOM_JITTER
            delay = self.config.base_delay_seconds * random.uniform(0.5, 1.5)
        
        # Apply jitter if enabled
        if self.config.jitter and self.config.strategy != RetryStrategy.RANDOM_JITTER:
            jitter = delay * 0.1 * random.uniform(-1, 1)
            delay += jitter
        
        # Ensure delay doesn't exceed maximum
        return min(delay, self.config.max_delay_seconds)


class HealthMonitor:
    """System health monitoring and status management"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.from_url("redis://localhost:6379/8")
        
        self.health_checks: Dict[str, HealthCheck] = {}
        self.health_status: Dict[str, Dict[str, Any]] = {}
        self.monitoring_active = False
        self.monitoring_thread = None
        
        self.logger = logging.getLogger("HealthMonitor")
        
        self._initialize_default_checks()
    
    def _initialize_default_checks(self):
        """Initialize default health checks"""
        
        self.health_checks = {
            "redis_connection": HealthCheck(
                name="Redis Connection",
                check_function=self._check_redis_health,
                interval_seconds=30,
                critical=True
            ),
            "memory_usage": HealthCheck(
                name="Memory Usage",
                check_function=self._check_memory_health,
                interval_seconds=60,
                critical=False
            ),
            "disk_space": HealthCheck(
                name="Disk Space",
                check_function=self._check_disk_health,
                interval_seconds=300,  # 5 minutes
                critical=True
            )
        }
    
    def add_health_check(self, health_check: HealthCheck):
        """Add a custom health check"""
        self.health_checks[health_check.name] = health_check
        self.logger.info(f"Added health check: {health_check.name}")
    
    def start_monitoring(self):
        """Start background health monitoring"""
        
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitoring_thread.start()
        
        self.logger.info("Health monitoring started")
    
    def stop_monitoring(self):
        """Stop background health monitoring"""
        
        self.monitoring_active = False
        
        if self.monitoring_thread and self.monitoring_thread.is_alive():
            self.monitoring_thread.join(timeout=5)
        
        self.logger.info("Health monitoring stopped")
    
    def _monitoring_loop(self):
        """Background monitoring loop"""
        
        while self.monitoring_active:
            try:
                for health_check in self.health_checks.values():
                    if not health_check.enabled:
                        continue
                    
                    # Check if it's time to run this check
                    last_check = self.health_status.get(health_check.name, {}).get("last_check")
                    if last_check:
                        seconds_since_check = (datetime.utcnow() - datetime.fromisoformat(last_check)).total_seconds()
                        if seconds_since_check < health_check.interval_seconds:
                            continue
                    
                    # Run health check
                    asyncio.create_task(self._run_single_health_check(health_check))
                
                # Sleep for 10 seconds between cycles
                time.sleep(10)
                
            except Exception as e:
                self.logger.error(f"Health monitoring error: {e}")
                time.sleep(30)  # Wait longer on error
    
    async def _run_single_health_check(self, health_check: HealthCheck):
        """Run a single health check"""
        
        start_time = time.time()
        
        try:
            # Run the check with timeout
            is_healthy = await asyncio.wait_for(
                asyncio.to_thread(health_check.check_function),
                timeout=health_check.timeout_seconds
            )
            
            execution_time_ms = (time.time() - start_time) * 1000
            
            status = HealthStatus.HEALTHY if is_healthy else HealthStatus.UNHEALTHY
            
            self.health_status[health_check.name] = {
                "status": status.value,
                "last_check": datetime.utcnow().isoformat(),
                "execution_time_ms": execution_time_ms,
                "critical": health_check.critical,
                "healthy": is_healthy
            }
            
            # Log unhealthy critical services
            if not is_healthy and health_check.critical:
                self.logger.error(f"Critical health check failed: {health_check.name}")
            
        except asyncio.TimeoutError:
            self.health_status[health_check.name] = {
                "status": HealthStatus.CRITICAL.value,
                "last_check": datetime.utcnow().isoformat(),
                "execution_time_ms": health_check.timeout_seconds * 1000,
                "critical": health_check.critical,
                "healthy": False,
                "error": "Health check timed out"
            }
            
            self.logger.error(f"Health check timed out: {health_check.name}")
            
        except Exception as e:
            self.health_status[health_check.name] = {
                "status": HealthStatus.CRITICAL.value,
                "last_check": datetime.utcnow().isoformat(),
                "critical": health_check.critical,
                "healthy": False,
                "error": str(e)
            }
            
            self.logger.error(f"Health check failed: {health_check.name} - {e}")
    
    def _check_redis_health(self) -> bool:
        """Check Redis connectivity"""
        try:
            self.redis_client.ping()
            return True
        except Exception:
            return False
    
    def _check_memory_health(self) -> bool:
        """Check system memory usage"""
        try:
            import psutil
            memory = psutil.virtual_memory()
            return memory.percent < 90  # Consider unhealthy if > 90% memory usage
        except Exception:
            return False
    
    def _check_disk_health(self) -> bool:
        """Check disk space"""
        try:
            import psutil
            disk = psutil.disk_usage('/')
            return disk.percent < 95  # Consider unhealthy if > 95% disk usage
        except Exception:
            return False
    
    def get_overall_health(self) -> Dict[str, Any]:
        """Get overall system health status"""
        
        if not self.health_status:
            return {
                "status": HealthStatus.CRITICAL.value,
                "message": "No health checks configured"
            }
        
        critical_failures = []
        non_critical_failures = []
        healthy_checks = []
        
        for check_name, status in self.health_status.items():
            if status["healthy"]:
                healthy_checks.append(check_name)
            elif status["critical"]:
                critical_failures.append(check_name)
            else:
                non_critical_failures.append(check_name)
        
        # Determine overall status
        if critical_failures:
            overall_status = HealthStatus.CRITICAL
        elif non_critical_failures:
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.HEALTHY
        
        return {
            "status": overall_status.value,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {
                "total": len(self.health_status),
                "healthy": len(healthy_checks),
                "critical_failures": len(critical_failures),
                "non_critical_failures": len(non_critical_failures)
            },
            "details": self.health_status,
            "failed_checks": {
                "critical": critical_failures,
                "non_critical": non_critical_failures
            }
        }


class CircuitBreakerOpenError(Exception):
    """Exception raised when circuit breaker is open"""
    pass


class PAMReliabilitySystem:
    """
    Comprehensive reliability and fault tolerance system
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.from_url("redis://localhost:6379/8")
        
        # Components
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.retry_handlers: Dict[str, RetryHandler] = {}
        self.health_monitor = HealthMonitor(redis_client)
        
        # Service metrics
        self.service_metrics: Dict[str, ServiceMetrics] = {}
        
        # Configuration
        self.config = {
            "circuit_breaker_defaults": {
                "failure_threshold": 5,
                "recovery_timeout_seconds": 60,
                "half_open_max_calls": 3
            },
            "retry_defaults": {
                "max_attempts": 3,
                "strategy": RetryStrategy.EXPONENTIAL_BACKOFF,
                "base_delay_seconds": 1.0
            },
            "health_monitoring": {
                "enabled": True,
                "check_interval_seconds": 30
            }
        }
        
        self.logger = logging.getLogger("PAMReliabilitySystem")
        
        # Initialize default circuit breakers
        self._initialize_default_circuit_breakers()
        
        # Start health monitoring
        if self.config["health_monitoring"]["enabled"]:
            self.health_monitor.start_monitoring()
    
    def _initialize_default_circuit_breakers(self):
        """Initialize default circuit breakers for critical services"""
        
        # Database circuit breaker
        self.create_circuit_breaker(
            "database",
            CircuitBreakerConfig(
                name="database",
                failure_threshold=3,
                recovery_timeout_seconds=30,
                expected_exception_types=(Exception,)
            )
        )
        
        # External API circuit breaker
        self.create_circuit_breaker(
            "external_api",
            CircuitBreakerConfig(
                name="external_api",
                failure_threshold=5,
                recovery_timeout_seconds=60,
                expected_exception_types=(aiohttp.ClientError, asyncio.TimeoutError)
            )
        )
        
        # Agent processing circuit breaker
        self.create_circuit_breaker(
            "agent_processing",
            CircuitBreakerConfig(
                name="agent_processing",
                failure_threshold=10,
                recovery_timeout_seconds=120
            )
        )
    
    def create_circuit_breaker(self, name: str, config: CircuitBreakerConfig) -> CircuitBreaker:
        """Create and register a circuit breaker"""
        
        circuit_breaker = CircuitBreaker(config)
        self.circuit_breakers[name] = circuit_breaker
        
        # Initialize service metrics
        self.service_metrics[name] = ServiceMetrics(name=name)
        
        self.logger.info(f"Created circuit breaker: {name}")
        return circuit_breaker
    
    def get_circuit_breaker(self, name: str) -> Optional[CircuitBreaker]:
        """Get a circuit breaker by name"""
        return self.circuit_breakers.get(name)
    
    def create_retry_handler(self, name: str, config: RetryConfig) -> RetryHandler:
        """Create and register a retry handler"""
        
        retry_handler = RetryHandler(config)
        self.retry_handlers[name] = retry_handler
        
        self.logger.info(f"Created retry handler: {name}")
        return retry_handler
    
    def get_retry_handler(self, name: str) -> Optional[RetryHandler]:
        """Get a retry handler by name"""
        return self.retry_handlers.get(name)
    
    # Decorator factories for easy use
    def circuit_breaker(self, name: str, **kwargs):
        """Decorator factory for circuit breaker"""
        
        if name not in self.circuit_breakers:
            config = CircuitBreakerConfig(name=name, **kwargs)
            self.create_circuit_breaker(name, config)
        
        return self.circuit_breakers[name]
    
    def retry(self, name: str = None, **kwargs):
        """Decorator factory for retry handler"""
        
        handler_name = name or f"retry_{id(kwargs)}"
        
        if handler_name not in self.retry_handlers:
            config = RetryConfig(**kwargs)
            self.create_retry_handler(handler_name, config)
        
        return self.retry_handlers[handler_name]
    
    # Service monitoring
    def record_service_request(self, service_name: str, success: bool, response_time_ms: float):
        """Record a service request for metrics"""
        
        if service_name not in self.service_metrics:
            self.service_metrics[service_name] = ServiceMetrics(name=service_name)
        
        metrics = self.service_metrics[service_name]
        
        metrics.total_requests += 1
        metrics.last_request_time = datetime.utcnow()
        
        if success:
            metrics.successful_requests += 1
        else:
            metrics.failed_requests += 1
        
        # Update average response time (simple moving average)
        if metrics.total_requests == 1:
            metrics.average_response_time_ms = response_time_ms
        else:
            metrics.average_response_time_ms = (
                (metrics.average_response_time_ms * (metrics.total_requests - 1) + response_time_ms) 
                / metrics.total_requests
            )
        
        # Update circuit breaker state
        if service_name in self.circuit_breakers:
            cb_metrics = self.circuit_breakers[service_name].get_metrics()
            if cb_metrics["state"] == "open":
                metrics.circuit_breaker_state = CircuitState.OPEN
            elif cb_metrics["state"] == "half_open":
                metrics.circuit_breaker_state = CircuitState.HALF_OPEN
            else:
                metrics.circuit_breaker_state = CircuitState.CLOSED
        
        # Determine health status
        if metrics.total_requests >= 10:  # Need minimum requests for accurate assessment
            success_rate = metrics.successful_requests / metrics.total_requests
            if success_rate >= 0.95:
                metrics.health_status = HealthStatus.HEALTHY
            elif success_rate >= 0.80:
                metrics.health_status = HealthStatus.DEGRADED
            elif success_rate >= 0.50:
                metrics.health_status = HealthStatus.UNHEALTHY
            else:
                metrics.health_status = HealthStatus.CRITICAL
    
    def get_service_metrics(self, service_name: str) -> Optional[Dict[str, Any]]:
        """Get metrics for a specific service"""
        
        if service_name not in self.service_metrics:
            return None
        
        metrics = self.service_metrics[service_name]
        
        return {
            "name": metrics.name,
            "total_requests": metrics.total_requests,
            "successful_requests": metrics.successful_requests,
            "failed_requests": metrics.failed_requests,
            "success_rate": metrics.successful_requests / max(metrics.total_requests, 1),
            "average_response_time_ms": round(metrics.average_response_time_ms, 2),
            "last_request_time": metrics.last_request_time.isoformat() if metrics.last_request_time else None,
            "circuit_breaker_state": metrics.circuit_breaker_state.value,
            "health_status": metrics.health_status.value
        }
    
    def get_all_service_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Get metrics for all services"""
        
        return {
            service_name: self.get_service_metrics(service_name)
            for service_name in self.service_metrics.keys()
        }
    
    def get_circuit_breaker_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all circuit breakers"""
        
        return {
            name: cb.get_metrics()
            for name, cb in self.circuit_breakers.items()
        }
    
    def get_system_reliability_status(self) -> Dict[str, Any]:
        """Get comprehensive system reliability status"""
        
        try:
            # Overall health
            health_status = self.health_monitor.get_overall_health()
            
            # Circuit breaker summary
            cb_status = self.get_circuit_breaker_status()
            open_circuit_breakers = [name for name, status in cb_status.items() if status["state"] == "open"]
            half_open_circuit_breakers = [name for name, status in cb_status.items() if status["state"] == "half_open"]
            
            # Service metrics summary
            service_metrics = self.get_all_service_metrics()
            unhealthy_services = [
                name for name, metrics in service_metrics.items()
                if metrics and metrics["health_status"] in ["unhealthy", "critical"]
            ]
            
            # Calculate overall reliability score
            total_services = len(service_metrics)
            if total_services == 0:
                reliability_score = 1.0
            else:
                healthy_services = total_services - len(unhealthy_services)
                reliability_score = healthy_services / total_services
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "overall_health": health_status["status"],
                "reliability_score": round(reliability_score, 3),
                "circuit_breakers": {
                    "total": len(cb_status),
                    "open": len(open_circuit_breakers),
                    "half_open": len(half_open_circuit_breakers),
                    "open_breakers": open_circuit_breakers,
                    "half_open_breakers": half_open_circuit_breakers
                },
                "services": {
                    "total": total_services,
                    "unhealthy": len(unhealthy_services),
                    "unhealthy_services": unhealthy_services
                },
                "health_checks": health_status["checks"],
                "recommendations": self._generate_reliability_recommendations(
                    open_circuit_breakers, unhealthy_services, health_status
                )
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get reliability status: {e}")
            return {"error": str(e)}
    
    def _generate_reliability_recommendations(
        self,
        open_circuit_breakers: List[str],
        unhealthy_services: List[str],
        health_status: Dict[str, Any]
    ) -> List[str]:
        """Generate reliability improvement recommendations"""
        
        recommendations = []
        
        if open_circuit_breakers:
            recommendations.append(
                f"Investigate and fix issues with services: {', '.join(open_circuit_breakers)}"
            )
        
        if unhealthy_services:
            recommendations.append(
                f"Monitor and improve performance of unhealthy services: {', '.join(unhealthy_services)}"
            )
        
        if health_status.get("failed_checks", {}).get("critical"):
            recommendations.append(
                "Address critical health check failures immediately"
            )
        
        if health_status["checks"]["healthy"] / health_status["checks"]["total"] < 0.8:
            recommendations.append(
                "Review and improve overall system health monitoring"
            )
        
        if not recommendations:
            recommendations.append("System reliability is good - continue monitoring")
        
        return recommendations
    
    async def test_circuit_breaker(self, name: str) -> Dict[str, Any]:
        """Test a circuit breaker by simulating failures"""
        
        if name not in self.circuit_breakers:
            return {"error": f"Circuit breaker {name} not found"}
        
        cb = self.circuit_breakers[name]
        
        # Record current state
        initial_state = cb.state
        initial_metrics = cb.get_metrics()
        
        # Simulate failures to open circuit
        test_results = []
        
        @cb
        def failing_function():
            raise Exception("Test failure")
        
        # Try to trigger circuit breaker
        for i in range(cb.config.failure_threshold + 1):
            try:
                failing_function()
            except Exception:
                test_results.append({"attempt": i + 1, "state": cb.state.value})
        
        final_metrics = cb.get_metrics()
        
        return {
            "circuit_breaker": name,
            "initial_state": initial_state.value,
            "final_state": cb.state.value,
            "test_attempts": len(test_results),
            "state_changes": test_results,
            "initial_metrics": initial_metrics,
            "final_metrics": final_metrics,
            "test_passed": cb.state == CircuitState.OPEN
        }
    
    def shutdown(self):
        """Shutdown the reliability system"""
        
        # Stop health monitoring
        self.health_monitor.stop_monitoring()
        
        self.logger.info("Reliability system shutdown completed")


# Convenience decorators for global use
reliability_system = PAMReliabilitySystem()


def circuit_breaker(name: str, **kwargs):
    """Global circuit breaker decorator"""
    return reliability_system.circuit_breaker(name, **kwargs)


def retry(**kwargs):
    """Global retry decorator"""
    return reliability_system.retry(**kwargs)