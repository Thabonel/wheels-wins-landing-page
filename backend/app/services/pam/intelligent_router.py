"""
Intelligent Model Router - Automatic Model Selection
Chooses the best AI model for each query based on complexity and cost

Features:
- Automatic complexity detection (simple/medium/complex)
- Cost-aware model selection
- Performance tracking and learning
- Fallback chain on failure
- Admin controls for behavior tuning

Model Selection Strategy (Cursor-style Auto-Routing):
  SIMPLE queries → Cheapest fast model (auto-selected by cost)
  MEDIUM queries → GPT-5.1 Instant (2-5x faster, 58% cheaper) or Haiku 4.5
  COMPLEX queries → GPT-5.1 Thinking (adaptive reasoning) or Sonnet 4.5

Usage:
  router = IntelligentModelRouter()
  model = await router.select_model(user_message, context)
  # Returns best model for the query

Date: October 16, 2025
Last Updated: November 15, 2025 (Added GPT-5.1 Instant/Thinking support)
"""

import re
import logging
from typing import Dict, Any, Optional, List, Tuple
from enum import Enum
from dataclasses import dataclass
from datetime import datetime, timedelta
import json

from app.config.model_config import get_model_config, ModelConfig

logger = logging.getLogger(__name__)


class QueryComplexity(str, Enum):
    """Query complexity levels"""
    SIMPLE = "simple"      # Greetings, quick questions, status checks
    MEDIUM = "medium"      # Single tool calls, straightforward tasks
    COMPLEX = "complex"    # Multi-step reasoning, multiple tools, planning


@dataclass
class ModelSelection:
    """Result of model selection"""
    model: ModelConfig
    complexity: QueryComplexity
    confidence: float
    reasoning: str
    estimated_cost: float


class ComplexityDetector:
    """
    Detects query complexity using pattern matching and heuristics

    Simple queries:
    - Greetings: "hello", "hi", "hey"
    - Status checks: "how much did I spend", "show my budget"
    - Quick questions: "what's the weather", "find gas stations"

    Medium queries:
    - Single actions: "add $50 expense", "create calendar event"
    - Data retrieval with filtering: "show expenses for last week"
    - Location-based queries: "find campgrounds near me"

    Complex queries:
    - Multi-step planning: "plan a trip from X to Y under $2000"
    - Complex reasoning: "analyze my spending and suggest savings"
    - Multiple tool chains: "find cheap gas, book campground, update calendar"
    """

    # Simple query patterns
    SIMPLE_PATTERNS = [
        r'\b(hi|hello|hey|sup|yo)\b',
        r'\b(thanks|thank you|thx)\b',
        r'\b(bye|goodbye|see you)\b',
        r'\b(how are you|how\'s it going)\b',
        r'^(yes|no|ok|okay|sure|nope)$',
        r'\b(help|what can you do)\b',
    ]

    # Complex query indicators
    COMPLEX_INDICATORS = [
        r'\b(plan|analyze|optimize|compare|evaluate|recommend)\b',
        r'\b(and then|after that|next|finally)\b',  # Multi-step
        r'\b(under \$\d+|within \$\d+|budget of)\b',  # Budget constraints
        r'\b(best|cheapest|fastest|optimal)\b',  # Optimization
        r'\b(if|unless|when|while)\b',  # Conditional logic
        r'\b(multiple|several|many|various)\b',  # Multiple items
    ]

    # Tool-related keywords (medium complexity)
    TOOL_KEYWORDS = [
        'add', 'create', 'update', 'delete', 'find', 'search',
        'show', 'get', 'list', 'book', 'reserve', 'cancel'
    ]

    def detect(self, message: str, context: Optional[Dict[str, Any]] = None) -> Tuple[QueryComplexity, float]:
        """
        Detect query complexity

        Returns:
            Tuple of (complexity, confidence_score)
        """
        message_lower = message.lower().strip()

        # Empty or very short messages are simple
        if len(message_lower) < 5:
            return QueryComplexity.SIMPLE, 0.9

        # Check for simple patterns first
        for pattern in self.SIMPLE_PATTERNS:
            if re.search(pattern, message_lower, re.IGNORECASE):
                return QueryComplexity.SIMPLE, 0.8

        # Check for complex indicators
        complex_count = sum(
            1 for pattern in self.COMPLEX_INDICATORS
            if re.search(pattern, message_lower, re.IGNORECASE)
        )

        if complex_count >= 2:
            return QueryComplexity.COMPLEX, 0.85

        # Check message length (longer = more complex)
        word_count = len(message_lower.split())
        if word_count > 30:
            return QueryComplexity.COMPLEX, 0.7

        # Check for tool keywords
        tool_count = sum(
            1 for keyword in self.TOOL_KEYWORDS
            if keyword in message_lower
        )

        if tool_count >= 2:
            return QueryComplexity.COMPLEX, 0.75
        elif tool_count == 1:
            return QueryComplexity.MEDIUM, 0.8

        # Check for question marks (questions tend to be simpler)
        if '?' in message and word_count < 10:
            return QueryComplexity.SIMPLE, 0.7

        # Default to medium complexity
        return QueryComplexity.MEDIUM, 0.6


class IntelligentModelRouter:
    """
    Intelligent model router that chooses best model for each query

    Selection criteria:
    1. Query complexity (simple/medium/complex)
    2. Cost optimization (use cheaper models when possible)
    3. Performance requirements (latency vs quality)
    4. Historical success rates
    5. Current model health status
    """

    def __init__(self):
        self.complexity_detector = ComplexityDetector()
        self.model_config = get_model_config()

        # Performance tracking (in-memory for now, could move to Redis)
        self._performance_history: Dict[str, List[Dict]] = {}
        self._max_history = 100

        # Router configuration (can be overridden via admin API)
        self.config = {
            "enable_intelligent_routing": True,
            "prefer_cost_optimization": True,  # Use cheaper models when possible
            "require_tool_support": True,  # Only select models with tool support
            "max_latency_ms": 3000,  # Maximum acceptable latency
            "confidence_threshold": 0.6,  # Minimum confidence for complexity detection
        }

        logger.info("Intelligent Model Router initialized")

    def _get_model_for_complexity(self, complexity: QueryComplexity) -> ModelConfig:
        """
        Get recommended model for complexity level

        Strategy:
        - SIMPLE: Use cheapest fast model (Haiku, Gemini Flash)
        - MEDIUM: Use balanced model (Haiku 4.5, GPT-4o Mini)
        - COMPLEX: Use best model (Sonnet 4.5, GPT-4o)
        """
        model_config = get_model_config()

        # Get all healthy models
        all_models = model_config.get_all_models()
        healthy_models = [m for m in all_models if model_config.is_model_healthy(m.model_id)]

        if not healthy_models:
            logger.warning("No healthy models available, using primary")
            return model_config.get_primary_model()

        # Filter for tool support if required
        if self.config["require_tool_support"]:
            healthy_models = [m for m in healthy_models if m.supports_tools]

        if not healthy_models:
            logger.warning("No healthy models with tool support, falling back to primary")
            return model_config.get_primary_model()

        # Select based on complexity
        if complexity == QueryComplexity.SIMPLE:
            # Use cheapest model for simple queries
            model = min(healthy_models, key=lambda m: m.cost_per_1m_input + m.cost_per_1m_output)
            logger.info(f"Selected {model.name} for SIMPLE query (cheapest option)")
            return model

        elif complexity == QueryComplexity.MEDIUM:
            # Use balanced model (good quality, reasonable cost)
            # Prefer GPT-5.1 Instant (2-5x faster) or Haiku 4.5 for medium queries
            preferred_models = [
                "gpt-5.1-instant",  # NEW: Fast, conversational, 58% cheaper than Sonnet 4.5
                "claude-haiku-4-5-20250514",
                "claude-3-5-haiku-20241022",
                "gpt-4o-mini"
            ]

            for model_id in preferred_models:
                model = next((m for m in healthy_models if m.model_id == model_id), None)
                if model:
                    logger.info(f"Selected {model.name} for MEDIUM query")
                    return model

            # Fallback: use mid-priced model
            sorted_models = sorted(healthy_models, key=lambda m: m.cost_per_1m_input + m.cost_per_1m_output)
            mid_index = len(sorted_models) // 2
            model = sorted_models[mid_index]
            logger.info(f"Selected {model.name} for MEDIUM query (mid-tier fallback)")
            return model

        else:  # COMPLEX
            # Use best quality model
            # Prefer GPT-5.1 Thinking (adaptive reasoning) or Sonnet 4.5 for complex tasks
            preferred_models = [
                "gpt-5.1-thinking",  # NEW: Adaptive reasoning with dynamic thinking time
                "claude-sonnet-4-5-20250929",  # Proven best-in-class
                "claude-3-7-sonnet-20250219",
                "gpt-4o"
            ]

            for model_id in preferred_models:
                model = next((m for m in healthy_models if m.model_id == model_id), None)
                if model:
                    logger.info(f"Selected {model.name} for COMPLEX query")
                    return model

            # Fallback: use most expensive (usually best quality)
            model = max(healthy_models, key=lambda m: m.cost_per_1m_input + m.cost_per_1m_output)
            logger.info(f"Selected {model.name} for COMPLEX query (highest quality fallback)")
            return model

    def _estimate_cost(self, model: ModelConfig, message_length: int) -> float:
        """
        Estimate cost for a query

        Rough estimate based on:
        - Message length → input tokens (~1.3 tokens per character)
        - Average response length (~500 tokens)
        - Tool definitions (~12,000 tokens, but cached after first use)
        """
        # Estimate input tokens
        input_tokens = (message_length * 1.3) + 500  # message + system prompt
        input_tokens += 1000  # Average conversation history

        # Estimate output tokens
        output_tokens = 500  # Average response

        # Calculate cost (per 1M tokens, convert to actual cost)
        input_cost = (input_tokens / 1_000_000) * model.cost_per_1m_input
        output_cost = (output_tokens / 1_000_000) * model.cost_per_1m_output

        total_cost = input_cost + output_cost
        return round(total_cost, 6)

    async def select_model(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        force_model: Optional[str] = None
    ) -> ModelSelection:
        """
        Select the best model for a query

        Args:
            message: User's message
            context: Optional context (location, preferences, etc.)
            force_model: Optional model ID to force (bypasses intelligent routing)

        Returns:
            ModelSelection with chosen model and reasoning
        """
        # If intelligent routing disabled, use primary model
        if not self.config["enable_intelligent_routing"]:
            primary = self.model_config.get_primary_model()
            return ModelSelection(
                model=primary,
                complexity=QueryComplexity.MEDIUM,
                confidence=1.0,
                reasoning="Intelligent routing disabled, using primary model",
                estimated_cost=self._estimate_cost(primary, len(message))
            )

        # If force_model specified, use it
        if force_model:
            from app.config.model_config import MODEL_REGISTRY
            if force_model in MODEL_REGISTRY:
                model = MODEL_REGISTRY[force_model]
                return ModelSelection(
                    model=model,
                    complexity=QueryComplexity.MEDIUM,
                    confidence=1.0,
                    reasoning=f"Forced model selection: {force_model}",
                    estimated_cost=self._estimate_cost(model, len(message))
                )

        # Detect query complexity
        complexity, confidence = self.complexity_detector.detect(message, context)

        # Get recommended model for complexity
        model = self._get_model_for_complexity(complexity)

        # Estimate cost
        estimated_cost = self._estimate_cost(model, len(message))

        # Build reasoning
        reasoning = (
            f"Complexity: {complexity.value} (confidence: {confidence:.0%}), "
            f"Selected: {model.name}, "
            f"Cost: ${estimated_cost:.6f}, "
            f"Provider: {model.provider}"
        )

        logger.info(f"Model selection: {reasoning}")

        return ModelSelection(
            model=model,
            complexity=complexity,
            confidence=confidence,
            reasoning=reasoning,
            estimated_cost=estimated_cost
        )

    def track_performance(
        self,
        model_id: str,
        complexity: QueryComplexity,
        latency_ms: float,
        success: bool,
        cost: float
    ):
        """Track model performance for learning"""
        if model_id not in self._performance_history:
            self._performance_history[model_id] = []

        entry = {
            "timestamp": datetime.now().isoformat(),
            "complexity": complexity.value,
            "latency_ms": latency_ms,
            "success": success,
            "cost": cost
        }

        self._performance_history[model_id].append(entry)

        # Trim history if too long
        if len(self._performance_history[model_id]) > self._max_history:
            self._performance_history[model_id] = self._performance_history[model_id][-self._max_history:]

    def get_performance_stats(self, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Get performance statistics"""
        if model_id:
            if model_id not in self._performance_history:
                return {"error": "No performance data for this model"}

            history = self._performance_history[model_id]

            return {
                "model_id": model_id,
                "total_requests": len(history),
                "success_rate": sum(1 for h in history if h["success"]) / len(history) if history else 0,
                "avg_latency_ms": sum(h["latency_ms"] for h in history) / len(history) if history else 0,
                "total_cost": sum(h["cost"] for h in history),
                "complexity_breakdown": {
                    "simple": sum(1 for h in history if h["complexity"] == "simple"),
                    "medium": sum(1 for h in history if h["complexity"] == "medium"),
                    "complex": sum(1 for h in history if h["complexity"] == "complex"),
                }
            }
        else:
            # Return stats for all models
            return {
                model_id: self.get_performance_stats(model_id)
                for model_id in self._performance_history.keys()
            }

    def update_config(self, new_config: Dict[str, Any]):
        """Update router configuration"""
        self.config.update(new_config)
        logger.info(f"Router config updated: {self.config}")


# Global singleton instance
_intelligent_router: Optional[IntelligentModelRouter] = None


def get_intelligent_router() -> IntelligentModelRouter:
    """Get or create global intelligent router instance"""
    global _intelligent_router
    if _intelligent_router is None:
        _intelligent_router = IntelligentModelRouter()
    return _intelligent_router
