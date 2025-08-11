"""
Profile Router for PAM
Intelligently routes requests to appropriate use-case profiles with performance tracking
"""

import time
import logging
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict
import asyncio

from app.services.pam.usecase_profiles import PamUseCase, pam_profile_manager
from app.core.logging import get_logger

logger = get_logger(__name__)

@dataclass
class ProfileMetrics:
    """Metrics for a specific profile"""
    use_count: int = 0
    total_latency: float = 0.0
    total_tokens: int = 0
    total_cost: float = 0.0
    error_count: int = 0
    cache_hits: int = 0
    average_satisfaction: float = 0.0
    last_used: Optional[datetime] = None
    
    @property
    def average_latency(self) -> float:
        return self.total_latency / self.use_count if self.use_count > 0 else 0
    
    @property
    def success_rate(self) -> float:
        total = self.use_count + self.error_count
        return (self.use_count / total * 100) if total > 0 else 0

@dataclass
class RouteDecision:
    """Decision made by the router"""
    use_case: PamUseCase
    confidence: float
    reasoning: str
    fallback_options: List[PamUseCase] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

class ProfileRouter:
    """
    Intelligent router for selecting appropriate PAM profiles
    Features:
    - Context-aware routing
    - Performance tracking
    - A/B testing support
    - Adaptive routing based on metrics
    """
    
    def __init__(self):
        self.profile_manager = pam_profile_manager
        self.metrics: Dict[PamUseCase, ProfileMetrics] = defaultdict(ProfileMetrics)
        self.routing_history: List[RouteDecision] = []
        self.max_history = 1000
        
        # A/B testing configuration
        self.ab_tests: Dict[str, Dict] = {}
        self.ab_test_enabled = False
        
        # Cache for routing decisions
        self.routing_cache: Dict[str, Tuple[PamUseCase, float]] = {}
        self.cache_ttl = 300  # 5 minutes
        
    def analyze_message(self, message: str, context: Optional[Dict[str, Any]] = None) -> RouteDecision:
        """
        Analyze message and context to determine best profile
        
        Args:
            message: User message
            context: Additional context (user history, preferences, etc.)
            
        Returns:
            RouteDecision with use case and confidence
        """
        start_time = time.time()
        
        # Check cache first
        cache_key = f"{hash(message)}:{hash(str(context))}"
        if cache_key in self.routing_cache:
            cached_use_case, cached_time = self.routing_cache[cache_key]
            if time.time() - cached_time < self.cache_ttl:
                logger.debug(f"🎯 Cache hit for routing decision: {cached_use_case.value}")
                return RouteDecision(
                    use_case=cached_use_case,
                    confidence=1.0,
                    reasoning="Cached decision",
                    metadata={"from_cache": True}
                )
        
        # Initialize confidence scores for each use case
        scores: Dict[PamUseCase, float] = {}
        
        # 1. Message content analysis
        message_lower = message.lower()
        word_count = len(message.split())
        has_question = "?" in message
        
        # Emergency detection (highest priority)
        if self._detect_emergency(message_lower):
            decision = RouteDecision(
                use_case=PamUseCase.EMERGENCY_HELP,
                confidence=1.0,
                reasoning="Emergency keywords detected",
                fallback_options=[PamUseCase.GENERAL]
            )
            self._cache_decision(cache_key, decision.use_case)
            return decision
        
        # 2. Keyword-based scoring
        keyword_scores = self._score_by_keywords(message_lower)
        for use_case, score in keyword_scores.items():
            scores[use_case] = scores.get(use_case, 0) + score
        
        # 3. Context-based scoring
        if context:
            context_scores = self._score_by_context(context)
            for use_case, score in context_scores.items():
                scores[use_case] = scores.get(use_case, 0) + score * 0.8  # Slightly lower weight
        
        # 4. Message structure scoring
        structure_scores = self._score_by_structure(message, word_count, has_question)
        for use_case, score in structure_scores.items():
            scores[use_case] = scores.get(use_case, 0) + score * 0.5
        
        # 5. Historical performance scoring (adaptive routing)
        if self.metrics:
            performance_scores = self._score_by_performance()
            for use_case, score in performance_scores.items():
                scores[use_case] = scores.get(use_case, 0) + score * 0.3
        
        # 6. Apply A/B testing if enabled
        if self.ab_test_enabled:
            scores = self._apply_ab_testing(scores, context)
        
        # Select best use case
        if not scores:
            # Default fallback
            use_case = PamUseCase.GENERAL
            confidence = 0.5
            reasoning = "No specific patterns detected"
        else:
            # Sort by score
            sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
            use_case = sorted_scores[0][0]
            confidence = min(sorted_scores[0][1] / 10.0, 1.0)  # Normalize to 0-1
            
            # Determine reasoning
            if confidence > 0.8:
                reasoning = f"High confidence match for {use_case.value}"
            elif confidence > 0.5:
                reasoning = f"Moderate confidence match for {use_case.value}"
            else:
                reasoning = f"Low confidence, defaulting to {use_case.value}"
            
            # Get fallback options
            fallback_options = [uc for uc, _ in sorted_scores[1:4] if uc != use_case]
        
        # Cache the decision
        self._cache_decision(cache_key, use_case)
        
        # Track routing time
        routing_time = time.time() - start_time
        
        decision = RouteDecision(
            use_case=use_case,
            confidence=confidence,
            reasoning=reasoning,
            fallback_options=fallback_options,
            metadata={
                "routing_time_ms": routing_time * 1000,
                "scores": {k.value: v for k, v in scores.items()}
            }
        )
        
        # Store in history
        self._add_to_history(decision)
        
        logger.info(f"🎯 Routed to {use_case.value} (confidence: {confidence:.2f}) - {reasoning}")
        
        return decision
    
    def _detect_emergency(self, message_lower: str) -> bool:
        """Detect emergency situations"""
        emergency_keywords = [
            "emergency", "help", "urgent", "accident", "broken down",
            "medical", "911", "hospital", "police", "fire",
            "injury", "hurt", "sick", "danger", "stranded"
        ]
        return any(keyword in message_lower for keyword in emergency_keywords)
    
    def _score_by_keywords(self, message_lower: str) -> Dict[PamUseCase, float]:
        """Score use cases based on keyword matches"""
        scores = {}
        
        # Define keyword patterns for each use case
        patterns = {
            PamUseCase.EXPENSE_TRACKING: {
                "strong": ["spent", "bought", "paid", "expense", "receipt", "cost $"],
                "moderate": ["money", "dollar", "price", "budget"],
                "weak": ["save", "track", "log"]
            },
            PamUseCase.TRIP_PLANNING: {
                "strong": ["plan trip", "plan a trip", "itinerary", "plan my journey"],
                "moderate": ["route to", "travel", "journey", "vacation"],
                "weak": ["visit", "go to", "explore"]
            },
            PamUseCase.ROUTE_OPTIMIZATION: {
                "strong": ["best route", "fastest route", "shortest route", "optimal path"],
                "moderate": ["directions", "navigate", "avoid traffic"],
                "weak": ["how to get", "way to"]
            },
            PamUseCase.WEATHER_CHECK: {
                "strong": ["weather", "forecast", "storm", "rain today"],
                "moderate": ["temperature", "wind", "snow", "sunny"],
                "weak": ["climate", "conditions"]
            },
            PamUseCase.CAMPGROUND_SEARCH: {
                "strong": ["campground", "rv park", "camping site"],
                "moderate": ["hookups", "campsite", "boondocking"],
                "weak": ["stay", "park", "overnight"]
            },
            PamUseCase.SAVINGS_ANALYSIS: {
                "strong": ["analyze spending", "savings report", "financial analysis"],
                "moderate": ["save money", "budget", "costs"],
                "weak": ["cheaper", "affordable", "discount"]
            },
            PamUseCase.QUICK_INFO: {
                "strong": ["what time", "how far", "where is", "when does"],
                "moderate": ["quick question", "simple", "just tell me"],
                "weak": ["?"]  # Question mark alone is weak signal
            }
        }
        
        for use_case, keywords in patterns.items():
            score = 0
            for strong_kw in keywords.get("strong", []):
                if strong_kw in message_lower:
                    score += 3
            for mod_kw in keywords.get("moderate", []):
                if mod_kw in message_lower:
                    score += 2
            for weak_kw in keywords.get("weak", []):
                if weak_kw in message_lower:
                    score += 1
            
            if score > 0:
                scores[use_case] = score
        
        return scores
    
    def _score_by_context(self, context: Dict[str, Any]) -> Dict[PamUseCase, float]:
        """Score use cases based on context"""
        scores = {}
        
        # Check for explicit use case hint
        if "use_case" in context:
            try:
                explicit_case = PamUseCase(context["use_case"])
                scores[explicit_case] = 10  # High score for explicit selection
            except ValueError:
                pass
        
        # Voice input context
        if context.get("input_mode") == "voice":
            scores[PamUseCase.VOICE_RESPONSE] = 5
        
        # Location context
        if context.get("user_location") or context.get("location"):
            scores[PamUseCase.CAMPGROUND_SEARCH] = scores.get(PamUseCase.CAMPGROUND_SEARCH, 0) + 1
            scores[PamUseCase.WEATHER_CHECK] = scores.get(PamUseCase.WEATHER_CHECK, 0) + 1
        
        # Financial context
        if context.get("viewing_expenses") or context.get("in_financial_section"):
            scores[PamUseCase.EXPENSE_TRACKING] = scores.get(PamUseCase.EXPENSE_TRACKING, 0) + 3
            scores[PamUseCase.SAVINGS_ANALYSIS] = scores.get(PamUseCase.SAVINGS_ANALYSIS, 0) + 2
        
        # Trip context
        if context.get("planning_trip") or context.get("current_trip"):
            scores[PamUseCase.TRIP_PLANNING] = scores.get(PamUseCase.TRIP_PLANNING, 0) + 3
            scores[PamUseCase.ROUTE_OPTIMIZATION] = scores.get(PamUseCase.ROUTE_OPTIMIZATION, 0) + 2
        
        return scores
    
    def _score_by_structure(self, message: str, word_count: int, has_question: bool) -> Dict[PamUseCase, float]:
        """Score use cases based on message structure"""
        scores = {}
        
        # Short questions likely need quick info
        if word_count <= 10 and has_question:
            scores[PamUseCase.QUICK_INFO] = 3
        
        # Long messages might be trip planning or complex queries
        if word_count > 50:
            scores[PamUseCase.TRIP_PLANNING] = 2
            scores[PamUseCase.CONVERSATION] = 1
        
        # Messages with numbers often relate to expenses
        import re
        if re.search(r'\$?\d+\.?\d*', message):
            scores[PamUseCase.EXPENSE_TRACKING] = 2
        
        # Messages with locations (cities, states)
        location_pattern = r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b'
        if len(re.findall(location_pattern, message)) >= 2:
            scores[PamUseCase.ROUTE_OPTIMIZATION] = 1
            scores[PamUseCase.TRIP_PLANNING] = 1
        
        return scores
    
    def _score_by_performance(self) -> Dict[PamUseCase, float]:
        """Score based on historical performance metrics"""
        scores = {}
        
        for use_case, metrics in self.metrics.items():
            if metrics.use_count > 0:
                # Favor profiles with good success rates
                if metrics.success_rate > 90:
                    scores[use_case] = 1
                
                # Penalize profiles with high error rates
                if metrics.success_rate < 50:
                    scores[use_case] = -2
                
                # Favor recently used profiles (momentum)
                if metrics.last_used and (datetime.now() - metrics.last_used).seconds < 300:
                    scores[use_case] = scores.get(use_case, 0) + 0.5
        
        return scores
    
    def _apply_ab_testing(self, scores: Dict[PamUseCase, float], context: Dict[str, Any]) -> Dict[PamUseCase, float]:
        """Apply A/B testing modifications to scores"""
        # Implementation for A/B testing experiments
        # This would modify scores based on active experiments
        return scores
    
    def _cache_decision(self, cache_key: str, use_case: PamUseCase):
        """Cache a routing decision"""
        self.routing_cache[cache_key] = (use_case, time.time())
        
        # Clean old cache entries
        if len(self.routing_cache) > 1000:
            current_time = time.time()
            self.routing_cache = {
                k: v for k, v in self.routing_cache.items()
                if current_time - v[1] < self.cache_ttl
            }
    
    def _add_to_history(self, decision: RouteDecision):
        """Add decision to history"""
        self.routing_history.append(decision)
        if len(self.routing_history) > self.max_history:
            self.routing_history = self.routing_history[-self.max_history:]
    
    def record_performance(
        self,
        use_case: PamUseCase,
        latency: float,
        tokens: int,
        cost: float,
        success: bool,
        cache_hit: bool = False,
        satisfaction: Optional[float] = None
    ):
        """Record performance metrics for a profile"""
        metrics = self.metrics[use_case]
        
        if success:
            metrics.use_count += 1
            metrics.total_latency += latency
            metrics.total_tokens += tokens
            metrics.total_cost += cost
            if cache_hit:
                metrics.cache_hits += 1
            if satisfaction is not None:
                # Update average satisfaction
                total_satisfaction = metrics.average_satisfaction * (metrics.use_count - 1) + satisfaction
                metrics.average_satisfaction = total_satisfaction / metrics.use_count
        else:
            metrics.error_count += 1
        
        metrics.last_used = datetime.now()
        
        logger.debug(f"📊 Recorded metrics for {use_case.value}: latency={latency:.2f}s, tokens={tokens}, success={success}")
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of all profile metrics"""
        summary = {}
        
        for use_case, metrics in self.metrics.items():
            if metrics.use_count > 0 or metrics.error_count > 0:
                summary[use_case.value] = {
                    "use_count": metrics.use_count,
                    "error_count": metrics.error_count,
                    "success_rate": f"{metrics.success_rate:.1f}%",
                    "avg_latency": f"{metrics.average_latency:.2f}s",
                    "total_cost": f"${metrics.total_cost:.4f}",
                    "cache_hit_rate": f"{(metrics.cache_hits / metrics.use_count * 100):.1f}%" if metrics.use_count > 0 else "0%",
                    "avg_satisfaction": f"{metrics.average_satisfaction:.2f}" if metrics.average_satisfaction > 0 else "N/A"
                }
        
        return summary
    
    def get_routing_analytics(self) -> Dict[str, Any]:
        """Get analytics about routing decisions"""
        if not self.routing_history:
            return {}
        
        # Analyze routing history
        use_case_counts = defaultdict(int)
        confidence_sum = defaultdict(float)
        
        for decision in self.routing_history:
            use_case_counts[decision.use_case.value] += 1
            confidence_sum[decision.use_case.value] += decision.confidence
        
        analytics = {
            "total_decisions": len(self.routing_history),
            "use_case_distribution": dict(use_case_counts),
            "average_confidence": {
                uc: conf / count 
                for uc, conf in confidence_sum.items()
                for count in [use_case_counts[uc]]
            },
            "cache_size": len(self.routing_cache)
        }
        
        return analytics

# Singleton instance
profile_router = ProfileRouter()