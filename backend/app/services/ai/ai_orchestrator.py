"""
AI Orchestrator - Intelligent multi-provider AI service
Handles failover, load balancing, and provider selection
"""

import asyncio
import time
import random
from typing import List, Dict, Any, AsyncGenerator, Optional, Set
from dataclasses import dataclass
from enum import Enum
import logging
from collections import defaultdict

from .provider_interface import (
    AIProviderInterface, AIMessage, AIResponse, AICapability,
    AIProviderStatus, ProviderConfig
)
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ProviderSelectionStrategy(Enum):
    """Strategy for selecting providers"""
    PRIORITY = "priority"  # Use providers in configured priority order
    ROUND_ROBIN = "round_robin"  # Distribute load evenly
    LATENCY = "latency"  # Choose fastest provider
    COST = "cost"  # Choose cheapest provider
    CAPABILITY = "capability"  # Choose based on required capabilities


@dataclass
class ProviderMetrics:
    """Metrics for provider selection"""
    provider_name: str
    success_rate: float
    average_latency_ms: float
    cost_per_token: float
    last_used: float
    consecutive_failures: int


class AIOrchestrator:
    """
    Orchestrates multiple AI providers with intelligent failover,
    load balancing, and provider selection strategies.
    """
    
    def __init__(
        self,
        strategy: ProviderSelectionStrategy = ProviderSelectionStrategy.PRIORITY,
        health_check_interval: int = 300,  # 5 minutes
        circuit_breaker_threshold: int = 3,
        circuit_breaker_timeout: int = 60
    ):
        self.strategy = strategy
        self.health_check_interval = health_check_interval
        self.circuit_breaker_threshold = circuit_breaker_threshold
        self.circuit_breaker_timeout = circuit_breaker_timeout
        
        self.providers: List[AIProviderInterface] = []
        self.provider_metrics: Dict[str, ProviderMetrics] = {}
        self.circuit_breakers: Dict[str, float] = {}  # provider_name -> reset_time
        self.round_robin_index = 0
        self._health_check_task = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize all configured providers"""
        if self._initialized:
            return
        
        logger.info("Initializing AI Orchestrator...")
        
        # Initialize OpenAI provider if configured
        if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
            try:
                openai_config = ProviderConfig(
                    name="openai",
                    api_key=settings.OPENAI_API_KEY,
                    default_model=getattr(settings, 'OPENAI_DEFAULT_MODEL', 'gpt-4-turbo-preview'),
                    max_retries=3,
                    timeout_seconds=30
                )
                openai_provider = OpenAIProvider(openai_config)
                if await openai_provider.initialize():
                    self.providers.append(openai_provider)
                    logger.info("✅ OpenAI provider initialized successfully")
                else:
                    logger.error("❌ Failed to initialize OpenAI provider")
            except Exception as e:
                logger.error(f"Error initializing OpenAI provider: {e}")
        
        # Initialize Anthropic provider if configured
        if hasattr(settings, 'ANTHROPIC_API_KEY') and settings.ANTHROPIC_API_KEY:
            try:
                anthropic_config = ProviderConfig(
                    name="anthropic",
                    api_key=settings.ANTHROPIC_API_KEY,
                    default_model=getattr(settings, 'ANTHROPIC_DEFAULT_MODEL', 'claude-3-opus-20240229'),
                    max_retries=3,
                    timeout_seconds=30
                )
                anthropic_provider = AnthropicProvider(anthropic_config)
                if await anthropic_provider.initialize():
                    self.providers.append(anthropic_provider)
                    logger.info("✅ Anthropic provider initialized successfully")
                else:
                    logger.error("❌ Failed to initialize Anthropic provider")
            except Exception as e:
                logger.error(f"Error initializing Anthropic provider: {e}")
        
        # Initialize metrics for each provider
        for provider in self.providers:
            self.provider_metrics[provider.name] = ProviderMetrics(
                provider_name=provider.name,
                success_rate=1.0,
                average_latency_ms=0.0,
                cost_per_token=(provider.config.cost_per_1k_input_tokens + 
                               provider.config.cost_per_1k_output_tokens) / 2000,
                last_used=0.0,
                consecutive_failures=0
            )
        
        # Start health check task
        self._health_check_task = asyncio.create_task(self._periodic_health_check())
        
        self._initialized = True
        logger.info(f"AI Orchestrator initialized with {len(self.providers)} providers")
    
    async def complete(
        self,
        messages: List[AIMessage],
        required_capabilities: Optional[Set[AICapability]] = None,
        preferred_provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AIResponse:
        """
        Generate a completion using the best available provider
        with automatic failover.
        """
        if not self._initialized:
            await self.initialize()
        
        if not self.providers:
            raise RuntimeError("No AI providers available")
        
        # Get ordered list of providers to try
        providers_to_try = await self._select_providers(
            required_capabilities,
            preferred_provider
        )
        
        last_error = None
        
        # Try each provider in order
        for provider in providers_to_try:
            # Check circuit breaker
            if self._is_circuit_broken(provider.name):
                logger.info(f"Skipping {provider.name} - circuit breaker open")
                continue
            
            try:
                logger.info(f"Attempting completion with {provider.name}")
                
                # Make the request
                start_time = time.time()
                response = await provider.complete(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs
                )
                
                # Update metrics on success
                self._update_metrics_success(provider.name, time.time() - start_time)
                
                # Add provider info to response
                response.provider = provider.name
                
                return response
                
            except Exception as e:
                last_error = e
                logger.error(f"Provider {provider.name} failed: {e}")
                self._update_metrics_failure(provider.name)
                
                # Check if circuit breaker should trip
                if self.provider_metrics[provider.name].consecutive_failures >= self.circuit_breaker_threshold:
                    self._trip_circuit_breaker(provider.name)
                
                # Continue to next provider
                continue
        
        # All providers failed
        raise RuntimeError(
            f"All AI providers failed. Last error: {last_error}"
        )
    
    async def stream(
        self,
        messages: List[AIMessage],
        required_capabilities: Optional[Set[AICapability]] = None,
        preferred_provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        Stream a completion using the best available provider
        with automatic failover.
        """
        if not self._initialized:
            await self.initialize()
        
        if not self.providers:
            raise RuntimeError("No AI providers available")
        
        # Ensure streaming capability is required
        if required_capabilities is None:
            required_capabilities = set()
        required_capabilities.add(AICapability.STREAMING)
        
        # Get ordered list of providers to try
        providers_to_try = await self._select_providers(
            required_capabilities,
            preferred_provider
        )
        
        last_error = None
        
        # Try each provider in order
        for provider in providers_to_try:
            # Check circuit breaker
            if self._is_circuit_broken(provider.name):
                logger.info(f"Skipping {provider.name} - circuit breaker open")
                continue
            
            try:
                logger.info(f"Attempting streaming with {provider.name}")
                
                # Stream the response
                start_time = time.time()
                first_chunk = True
                
                async for chunk in provider.stream(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs
                ):
                    if first_chunk:
                        # Update metrics on first successful chunk
                        self._update_metrics_success(provider.name, time.time() - start_time)
                        first_chunk = False
                    
                    yield chunk
                
                # Successful completion
                return
                
            except Exception as e:
                last_error = e
                logger.error(f"Provider {provider.name} streaming failed: {e}")
                self._update_metrics_failure(provider.name)
                
                # Check if circuit breaker should trip
                if self.provider_metrics[provider.name].consecutive_failures >= self.circuit_breaker_threshold:
                    self._trip_circuit_breaker(provider.name)
                
                # Continue to next provider
                continue
        
        # All providers failed
        raise RuntimeError(
            f"All AI providers failed streaming. Last error: {last_error}"
        )
    
    async def _select_providers(
        self,
        required_capabilities: Optional[Set[AICapability]],
        preferred_provider: Optional[str]
    ) -> List[AIProviderInterface]:
        """Select providers based on strategy and requirements"""
        # Filter by capabilities
        eligible_providers = []
        for provider in self.providers:
            # Skip if circuit breaker is open
            if self._is_circuit_broken(provider.name):
                continue
            
            # Skip if doesn't support required capabilities
            if required_capabilities:
                if not all(provider.supports(cap) for cap in required_capabilities):
                    continue
            
            # Skip if unhealthy
            if provider.status == AIProviderStatus.UNHEALTHY:
                continue
            
            eligible_providers.append(provider)
        
        if not eligible_providers:
            # Fall back to all providers if none are eligible
            eligible_providers = self.providers
        
        # Handle preferred provider
        if preferred_provider:
            preferred = [p for p in eligible_providers if p.name == preferred_provider]
            others = [p for p in eligible_providers if p.name != preferred_provider]
            eligible_providers = preferred + others
        
        # Apply selection strategy
        if self.strategy == ProviderSelectionStrategy.PRIORITY:
            # Already in priority order
            return eligible_providers
        
        elif self.strategy == ProviderSelectionStrategy.ROUND_ROBIN:
            # Rotate through providers
            if eligible_providers:
                start_idx = self.round_robin_index % len(eligible_providers)
                self.round_robin_index += 1
                return eligible_providers[start_idx:] + eligible_providers[:start_idx]
            return eligible_providers
        
        elif self.strategy == ProviderSelectionStrategy.LATENCY:
            # Sort by average latency
            return sorted(
                eligible_providers,
                key=lambda p: self.provider_metrics[p.name].average_latency_ms
            )
        
        elif self.strategy == ProviderSelectionStrategy.COST:
            # Sort by cost per token
            return sorted(
                eligible_providers,
                key=lambda p: self.provider_metrics[p.name].cost_per_token
            )
        
        else:
            return eligible_providers
    
    def _update_metrics_success(self, provider_name: str, latency_seconds: float):
        """Update metrics after successful request"""
        metrics = self.provider_metrics[provider_name]
        
        # Update latency (exponential moving average)
        latency_ms = latency_seconds * 1000
        if metrics.average_latency_ms == 0:
            metrics.average_latency_ms = latency_ms
        else:
            metrics.average_latency_ms = (
                0.9 * metrics.average_latency_ms + 0.1 * latency_ms
            )
        
        # Update success rate
        metrics.consecutive_failures = 0
        metrics.last_used = time.time()
        
        # Reset circuit breaker if it was tripped
        if provider_name in self.circuit_breakers:
            del self.circuit_breakers[provider_name]
            logger.info(f"Circuit breaker reset for {provider_name}")
    
    def _update_metrics_failure(self, provider_name: str):
        """Update metrics after failed request"""
        metrics = self.provider_metrics[provider_name]
        metrics.consecutive_failures += 1
    
    def _is_circuit_broken(self, provider_name: str) -> bool:
        """Check if circuit breaker is open for provider"""
        if provider_name not in self.circuit_breakers:
            return False
        
        reset_time = self.circuit_breakers[provider_name]
        if time.time() >= reset_time:
            # Circuit breaker timeout expired
            del self.circuit_breakers[provider_name]
            logger.info(f"Circuit breaker timeout expired for {provider_name}")
            return False
        
        return True
    
    def _trip_circuit_breaker(self, provider_name: str):
        """Trip the circuit breaker for a provider"""
        reset_time = time.time() + self.circuit_breaker_timeout
        self.circuit_breakers[provider_name] = reset_time
        logger.warning(
            f"Circuit breaker tripped for {provider_name}. "
            f"Will reset at {time.ctime(reset_time)}"
        )
    
    async def _periodic_health_check(self):
        """Periodically check provider health"""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                
                for provider in self.providers:
                    try:
                        status, message = await provider.health_check()
                        logger.info(f"Health check for {provider.name}: {status.value} - {message}")
                    except Exception as e:
                        logger.error(f"Health check failed for {provider.name}: {e}")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic health check: {e}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get orchestrator status and metrics"""
        return {
            "initialized": self._initialized,
            "strategy": self.strategy.value,
            "providers": [
                {
                    "name": provider.name,
                    "status": provider.status.value,
                    "capabilities": [cap.value for cap in provider.capabilities],
                    "metrics": provider.get_metrics(),
                    "circuit_breaker": self._is_circuit_broken(provider.name)
                }
                for provider in self.providers
            ],
            "total_providers": len(self.providers),
            "healthy_providers": sum(
                1 for p in self.providers 
                if p.status == AIProviderStatus.HEALTHY and not self._is_circuit_broken(p.name)
            )
        }
    
    async def cleanup(self):
        """Cleanup all resources"""
        # Cancel health check task
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
        
        # Cleanup all providers
        for provider in self.providers:
            try:
                await provider.cleanup()
            except Exception as e:
                logger.error(f"Error cleaning up provider {provider.name}: {e}")
        
        self.providers.clear()
        self._initialized = False


# Global orchestrator instance
ai_orchestrator = AIOrchestrator(
    strategy=ProviderSelectionStrategy.PRIORITY,
    health_check_interval=300,
    circuit_breaker_threshold=3,
    circuit_breaker_timeout=60
)