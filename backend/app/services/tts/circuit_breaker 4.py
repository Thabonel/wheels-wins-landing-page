"""
Circuit Breaker Implementation for TTS Services
Provides fault tolerance and automatic recovery for TTS engines
"""

import asyncio
import time
from typing import Dict, Optional
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass

from app.core.logging import get_logger

logger = get_logger(__name__)


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Circuit is open, requests fail fast
    HALF_OPEN = "half_open"  # Testing if service has recovered


@dataclass
class CircuitConfig:
    """Circuit breaker configuration"""
    failure_threshold: int = 5  # Failures before opening circuit
    timeout_seconds: int = 60   # Time to wait before trying again
    success_threshold: int = 3   # Successes needed to close circuit in half-open state
    max_requests_half_open: int = 5  # Max requests to allow in half-open state


@dataclass
class CircuitStats:
    """Circuit breaker statistics"""
    state: CircuitState
    failure_count: int
    success_count: int
    last_failure_time: Optional[datetime]
    last_success_time: Optional[datetime]
    total_requests: int
    total_failures: int
    state_changed_time: datetime


class CircuitBreaker:
    """
    Circuit breaker for TTS engine fault tolerance
    
    Features:
    - Automatic failure detection and circuit opening
    - Configurable failure thresholds and timeouts
    - Half-open state for testing service recovery
    - Per-engine circuit tracking
    - Performance metrics and monitoring
    """
    
    def __init__(self, config: Optional[CircuitConfig] = None):
        self.config = config or CircuitConfig()
        self.circuits: Dict[str, CircuitStats] = {}
        self.half_open_requests: Dict[str, int] = {}
        
    def is_open(self, service_name: str) -> bool:
        """Check if circuit is open for a service"""
        if service_name not in self.circuits:
            self._initialize_circuit(service_name)
            
        circuit = self.circuits[service_name]
        
        # Check if we should transition from OPEN to HALF_OPEN
        if circuit.state == CircuitState.OPEN:
            if self._should_attempt_reset(service_name):
                self._transition_to_half_open(service_name)
                return False
            return True
            
        # Check if we should limit requests in HALF_OPEN state
        if circuit.state == CircuitState.HALF_OPEN:
            half_open_count = self.half_open_requests.get(service_name, 0)
            if half_open_count >= self.config.max_requests_half_open:
                return True
                
        return False
    
    def record_success(self, service_name: str):
        """Record a successful operation"""
        if service_name not in self.circuits:
            self._initialize_circuit(service_name)
            
        circuit = self.circuits[service_name]
        circuit.total_requests += 1
        circuit.last_success_time = datetime.utcnow()
        
        if circuit.state == CircuitState.HALF_OPEN:
            circuit.success_count += 1
            self.half_open_requests[service_name] = self.half_open_requests.get(service_name, 0) + 1
            
            # Check if we should close the circuit
            if circuit.success_count >= self.config.success_threshold:
                self._transition_to_closed(service_name)
                
        elif circuit.state == CircuitState.CLOSED:
            # Reset failure count on successful operation
            circuit.failure_count = max(0, circuit.failure_count - 1)
            
        logger.debug(f"✅ Circuit breaker success recorded for {service_name}: {circuit.state.value}")
    
    def record_failure(self, service_name: str, error: Optional[Exception] = None):
        """Record a failed operation"""
        if service_name not in self.circuits:
            self._initialize_circuit(service_name)
            
        circuit = self.circuits[service_name]
        circuit.total_requests += 1
        circuit.total_failures += 1
        circuit.failure_count += 1
        circuit.last_failure_time = datetime.utcnow()
        
        if circuit.state == CircuitState.HALF_OPEN:
            # Failure in half-open state immediately opens circuit
            self._transition_to_open(service_name)
            
        elif circuit.state == CircuitState.CLOSED:
            # Check if we should open the circuit
            if circuit.failure_count >= self.config.failure_threshold:
                self._transition_to_open(service_name)
                
        logger.warning(f"❌ Circuit breaker failure recorded for {service_name}: "
                      f"failures={circuit.failure_count}, state={circuit.state.value}, error={error}")
    
    def reset(self, service_name: str):
        """Manually reset circuit to closed state"""
        if service_name in self.circuits:
            self._transition_to_closed(service_name)
            logger.info(f"🔄 Circuit breaker manually reset for {service_name}")
    
    def get_stats(self, service_name: str) -> Optional[CircuitStats]:
        """Get circuit statistics for a service"""
        return self.circuits.get(service_name)
    
    def get_all_stats(self) -> Dict[str, CircuitStats]:
        """Get statistics for all circuits"""
        return self.circuits.copy()
    
    def _initialize_circuit(self, service_name: str):
        """Initialize a new circuit for a service"""
        self.circuits[service_name] = CircuitStats(
            state=CircuitState.CLOSED,
            failure_count=0,
            success_count=0,
            last_failure_time=None,
            last_success_time=None,
            total_requests=0,
            total_failures=0,
            state_changed_time=datetime.utcnow()
        )
        self.half_open_requests[service_name] = 0
        logger.info(f"🔧 Initialized circuit breaker for {service_name}")
    
    def _should_attempt_reset(self, service_name: str) -> bool:
        """Check if we should attempt to reset an open circuit"""
        circuit = self.circuits[service_name]
        if not circuit.last_failure_time:
            return True
            
        time_since_failure = datetime.utcnow() - circuit.last_failure_time
        return time_since_failure.total_seconds() >= self.config.timeout_seconds
    
    def _transition_to_open(self, service_name: str):
        """Transition circuit to OPEN state"""
        circuit = self.circuits[service_name]
        old_state = circuit.state
        circuit.state = CircuitState.OPEN
        circuit.state_changed_time = datetime.utcnow()
        self.half_open_requests[service_name] = 0
        
        logger.warning(f"⚠️ Circuit breaker opened for {service_name}: {old_state.value} -> {circuit.state.value}")
    
    def _transition_to_half_open(self, service_name: str):
        """Transition circuit to HALF_OPEN state"""
        circuit = self.circuits[service_name]
        old_state = circuit.state
        circuit.state = CircuitState.HALF_OPEN
        circuit.state_changed_time = datetime.utcnow()
        circuit.success_count = 0
        self.half_open_requests[service_name] = 0
        
        logger.info(f"🔄 Circuit breaker half-opened for {service_name}: {old_state.value} -> {circuit.state.value}")
    
    def _transition_to_closed(self, service_name: str):
        """Transition circuit to CLOSED state"""
        circuit = self.circuits[service_name]
        old_state = circuit.state
        circuit.state = CircuitState.CLOSED
        circuit.state_changed_time = datetime.utcnow()
        circuit.failure_count = 0
        circuit.success_count = 0
        self.half_open_requests[service_name] = 0
        
        logger.info(f"✅ Circuit breaker closed for {service_name}: {old_state.value} -> {circuit.state.value}")
    
    def get_health_summary(self) -> Dict[str, any]:
        """Get overall health summary of all circuits"""
        total_circuits = len(self.circuits)
        healthy_circuits = len([c for c in self.circuits.values() if c.state == CircuitState.CLOSED])
        degraded_circuits = len([c for c in self.circuits.values() if c.state == CircuitState.HALF_OPEN])
        failed_circuits = len([c for c in self.circuits.values() if c.state == CircuitState.OPEN])
        
        return {
            "total_circuits": total_circuits,
            "healthy_circuits": healthy_circuits,
            "degraded_circuits": degraded_circuits,
            "failed_circuits": failed_circuits,
            "overall_health": "healthy" if failed_circuits == 0 else "degraded" if degraded_circuits > 0 else "unhealthy"
        }