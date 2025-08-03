"""
AI Coordinator - Routes requests to optimal AI model
"""
import hashlib
import json
from typing import Dict, Any, Optional
from datetime import datetime

from .claude_service import ClaudeService
from .openai_service import OpenAIService
from app.core.logging import logger
from app.services.cache import CacheService


class AICoordinator:
    """
    Coordinates AI requests between Claude and OpenAI models
    Routes each request to the optimal model based on task type
    """
    
    def __init__(self):
        self.claude = ClaudeService()
        self.openai = OpenAIService()
        self.cache = CacheService()
        
        # Define routing map
        self.routing_map = {
            # Claude for conversational and creative tasks
            "pam_conversation": self.claude.pam_conversation,
            "generate_itinerary": self.claude.generate_travel_itinerary,
            "content_moderation": self.claude.moderate_content,
            "travel_blog": self.claude.generate_travel_content,
            "analyze_trip": self.claude.analyze_trip_data,
            
            # OpenAI for structured and search tasks
            "create_embedding": self.openai.create_embedding,
            "find_similar_trips": self.openai.find_similar_trips,
            "optimize_route": self.openai.optimize_rv_route,
            "extract_trip_data": self.openai.extract_structured_data,
            "quick_answer": self.openai.quick_response,
            "expense_categorization": self.openai.categorize_expenses,
            "search_rv_parks": self.openai.search_rv_parks,
            "calculate_fuel_costs": self.openai.calculate_fuel_costs
        }
        
        # Define cacheable request types
        self.cacheable_types = {
            "create_embedding": 86400,  # 24 hours
            "find_similar_trips": 3600,  # 1 hour
            "search_rv_parks": 3600,     # 1 hour
            "quick_answer": 1800,        # 30 minutes
            "calculate_fuel_costs": 1800  # 30 minutes
        }
    
    async def process_request(
        self, 
        request_type: str, 
        use_cache: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Process an AI request, routing to the appropriate model
        
        Args:
            request_type: Type of AI request
            use_cache: Whether to use caching
            **kwargs: Arguments for the specific request
            
        Returns:
            Dict containing response and metadata
        """
        start_time = datetime.now()
        
        try:
            # Generate cache key if caching is enabled
            cache_key = None
            if use_cache and request_type in self.cacheable_types:
                cache_key = self._generate_cache_key(request_type, kwargs)
                cached = await self.cache.get(cache_key)
                if cached:
                    logger.info(f"🎯 Cache hit for {request_type}")
                    return {
                        **cached,
                        "cached": True,
                        "response_time": 0
                    }
            
            # Get the appropriate handler
            handler = self.routing_map.get(request_type)
            if not handler:
                raise ValueError(f"Unknown AI request type: {request_type}")
            
            # Determine which model we're using
            model_type = "claude" if handler.__self__.__class__.__name__ == "ClaudeService" else "openai"
            logger.info(f"🤖 Processing {request_type} with {model_type}")
            
            # Execute the request
            result = await handler(**kwargs)
            
            # Add metadata
            response_time = (datetime.now() - start_time).total_seconds()
            result.update({
                "model_type": model_type,
                "request_type": request_type,
                "response_time": response_time,
                "cached": False
            })
            
            # Cache if appropriate
            if cache_key and request_type in self.cacheable_types:
                ttl = self.cacheable_types[request_type]
                await self.cache.set(cache_key, result, ttl=ttl)
                logger.info(f"💾 Cached {request_type} response for {ttl}s")
            
            # Track metrics
            await self._track_metrics(request_type, model_type, response_time, result)
            
            return result
            
        except Exception as e:
            logger.error(f"❌ AI request failed: {request_type} - {str(e)}")
            raise
    
    def _generate_cache_key(self, request_type: str, params: Dict) -> str:
        """Generate a cache key for the request"""
        # Create a deterministic string from parameters
        param_str = json.dumps(params, sort_keys=True)
        param_hash = hashlib.md5(param_str.encode()).hexdigest()
        return f"ai:{request_type}:{param_hash}"
    
    async def _track_metrics(
        self, 
        request_type: str, 
        model_type: str, 
        response_time: float,
        result: Dict
    ):
        """Track AI usage metrics"""
        try:
            metrics = {
                "event": "ai_request",
                "properties": {
                    "request_type": request_type,
                    "model_type": model_type,
                    "response_time_ms": response_time * 1000,
                    "cached": result.get("cached", False),
                    "tokens_used": result.get("tokens_used", 0),
                    "success": True
                }
            }
            
            # Calculate estimated cost
            if model_type == "claude":
                # Claude 3.5 Sonnet pricing
                cost = (result.get("tokens_used", 0) / 1000) * 0.003
            else:
                # OpenAI pricing varies by model
                model = result.get("model", "gpt-3.5-turbo")
                if "gpt-4" in model:
                    cost = (result.get("tokens_used", 0) / 1000) * 0.03
                elif "embedding" in model:
                    cost = (result.get("tokens_used", 0) / 1000) * 0.0001
                else:
                    cost = (result.get("tokens_used", 0) / 1000) * 0.001
            
            metrics["properties"]["estimated_cost"] = cost
            
            # Log metrics (could be sent to analytics service)
            logger.info(f"📊 AI Metrics: {metrics}")
            
        except Exception as e:
            logger.error(f"Failed to track metrics: {e}")
    
    async def get_model_status(self) -> Dict[str, Any]:
        """Get status of both AI services"""
        status = {
            "claude": await self.claude.health_check(),
            "openai": await self.openai.health_check(),
            "routing_available": list(self.routing_map.keys()),
            "cache_enabled": True
        }
        return status