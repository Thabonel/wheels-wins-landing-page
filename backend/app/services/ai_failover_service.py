"""
AI Failover Service - Multi-provider AI service with automatic failover
Integrates the AI Orchestrator with PAM context for seamless provider switching
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, AsyncGenerator, Union
from datetime import datetime

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.ai.ai_orchestrator import AIOrchestrator
from app.services.ai.provider_interface import ProviderConfig
from app.services.ai.openai_provider import OpenAIProvider
from app.services.ai.anthropic_provider import AnthropicProvider
from app.services.pam.context_manager import ContextManager
from app.services.database import DatabaseService
from app.core.exceptions import PAMError, ErrorCode

logger = get_logger(__name__)


class AIFailoverService:
    """
    AI service with automatic failover between providers
    Provides the same interface as AIService but with multi-provider support
    """
    
    def __init__(self, db_service: Optional[DatabaseService] = None):
        self.settings = get_settings()
        self.db_service = db_service
        self.orchestrator = None
        self.context_manager = None
        self.initialized = False
        
    async def initialize(self) -> bool:
        """Initialize the failover AI service with available providers"""
        try:
            logger.info("🚀 Initializing AI Failover Service...")
            
            # Initialize context manager
            self.context_manager = ContextManager(self.db_service)
            
            # Prepare provider configurations
            providers = []
            
            # Configure OpenAI provider (primary)
            if self.settings.OPENAI_API_KEY:
                openai_config = ProviderConfig(
                    name="openai",
                    provider_type="openai",
                    api_key=self.settings.OPENAI_API_KEY.get_secret_value(),
                    priority=1,  # Highest priority
                    default_model="gpt-4o",
                    max_tokens=4096,
                    temperature=0.7
                )
                try:
                    openai_provider = OpenAIProvider(openai_config)
                    providers.append(openai_provider)
                    logger.info("✅ OpenAI provider configured successfully")
                except Exception as e:
                    logger.warning(f"⚠️ OpenAI provider configuration failed: {e}")
            
            # Configure Anthropic provider (backup)
            if self.settings.ANTHROPIC_API_KEY:
                anthropic_config = ProviderConfig(
                    name="anthropic",
                    provider_type="anthropic", 
                    api_key=self.settings.ANTHROPIC_API_KEY.get_secret_value(),
                    priority=2,  # Lower priority (backup)
                    default_model="claude-3-opus-20240229",
                    max_tokens=4096,
                    temperature=0.7
                )
                try:
                    anthropic_provider = AnthropicProvider(anthropic_config)
                    providers.append(anthropic_provider)
                    logger.info("✅ Anthropic provider configured successfully")
                except Exception as e:
                    logger.warning(f"⚠️ Anthropic provider configuration failed: {e}")
            
            if not providers:
                logger.error("❌ No AI providers available - check API key configuration")
                return False
            
            # Initialize orchestrator with providers
            self.orchestrator = AIOrchestrator(providers)
            await self.orchestrator.initialize()
            
            self.initialized = True
            logger.info(f"🎯 AI Failover Service initialized with {len(providers)} providers")
            return True
            
        except Exception as e:
            logger.error(f"❌ AI Failover Service initialization failed: {e}")
            self.initialized = False
            return False
    
    async def generate_response(
        self, 
        messages: List[Dict[str, Any]], 
        user_id: str,
        context: Optional[Dict[str, Any]] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        stream: bool = False,
        **kwargs
    ) -> Union[Dict[str, Any], AsyncGenerator[str, None]]:
        """
        Generate AI response with automatic failover
        """
        if not self.initialized:
            await self.initialize()
        
        if not self.orchestrator:
            raise PAMError("AI service not available", ErrorCode.SERVICE_UNAVAILABLE)
        
        try:
            # Use orchestrator to handle provider selection and failover
            if stream:
                return await self.orchestrator.stream_chat(
                    messages=messages,
                    user_id=user_id,
                    context=context or {},
                    tools=tools,
                    **kwargs
                )
            else:
                response = await self.orchestrator.chat_completion(
                    messages=messages,
                    user_id=user_id, 
                    context=context or {},
                    tools=tools,
                    **kwargs
                )
                
                # Format response to match expected structure
                return {
                    "response": response.content,
                    "provider": response.provider_used,
                    "model": response.model,
                    "usage": response.usage,
                    "processing_time_ms": response.processing_time_ms,
                    "intent": None,  # Can be added by intent classifier
                    "confidence": None,
                    "suggestions": None,
                    "actions": []
                }
                
        except Exception as e:
            logger.error(f"❌ AI response generation failed: {e}")
            # Return fallback response
            return {
                "response": "AI service is temporarily unavailable. Core app features remain functional. Please try again shortly.",
                "provider": "fallback",
                "model": "none",
                "usage": {"total_tokens": 0},
                "processing_time_ms": 0,
                "intent": None,
                "confidence": None,
                "suggestions": None,
                "actions": [{"type": "retry", "label": "Try again"}]
            }
    
    async def health_check(self) -> Dict[str, Any]:
        """Get health status of all providers"""
        if not self.orchestrator:
            return {
                "service_status": "not_initialized",
                "providers": [],
                "failover_enabled": False
            }
        
        provider_health = await self.orchestrator.get_provider_health()
        
        return {
            "service_status": "healthy" if any(p["status"] == "healthy" for p in provider_health) else "degraded",
            "providers": provider_health,
            "failover_enabled": len(provider_health) > 1,
            "primary_provider": next((p["name"] for p in provider_health if p["priority"] == 1), None),
            "backup_providers": [p["name"] for p in provider_health if p["priority"] > 1]
        }
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.orchestrator:
            await self.orchestrator.cleanup()
        self.initialized = False


# Global failover service instance
_failover_service_instance = None

async def get_ai_failover_service(db_service: Optional[DatabaseService] = None) -> AIFailoverService:
    """Get or create the global AI failover service instance"""
    global _failover_service_instance
    if _failover_service_instance is None:
        _failover_service_instance = AIFailoverService(db_service)
        await _failover_service_instance.initialize()
    return _failover_service_instance