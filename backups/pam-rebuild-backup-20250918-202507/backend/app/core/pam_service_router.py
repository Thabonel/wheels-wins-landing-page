"""
PAM Service Router
Central broker for routing between different PAM orchestrators based on user persona and context.
This preserves the sophisticated orchestrator variety while organizing their usage patterns.
"""

import logging
from typing import Dict, Any, Optional, Union
from enum import Enum
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


class UserPersona(Enum):
    """User persona types for routing decisions"""
    DIGITAL_NOMAD = "digital_nomad"          # Tech-savvy, feature-rich experience
    WEEKEND_WARRIOR = "weekend_warrior"      # Quick, efficient interactions
    SNOWBIRD = "snowbird"                    # Stable, reliable, simple interface
    NEW_RVER = "new_rver"                    # Guidance-focused, educational
    SOCIAL_TRAVELER = "social_traveler"      # Community-focused features
    UNKNOWN = "unknown"                      # Default routing


class InteractionContext(Enum):
    """Interaction context types for routing decisions"""
    PLANNING = "planning"                    # Trip planning and preparation
    ACTIVE_TRAVEL = "active_travel"         # Currently on the road
    MAINTENANCE = "maintenance"              # Vehicle or equipment focus
    FINANCIAL = "financial"                  # Budget and expense tracking
    SOCIAL = "social"                        # Community interactions
    EMERGENCY = "emergency"                  # Urgent assistance needed
    CASUAL_CHAT = "casual_chat"             # General conversation


@dataclass
class RoutingDecision:
    """Represents a routing decision with reasoning"""
    orchestrator_type: str
    confidence: float
    reasoning: str
    fallback_chain: list
    estimated_complexity: str  # "simple", "moderate", "complex"


@dataclass
class UserContext:
    """Enhanced user context for routing decisions"""
    user_id: str
    persona: UserPersona
    interaction_context: InteractionContext
    device_type: str = "unknown"           # mobile, desktop, tablet
    network_quality: str = "good"          # poor, fair, good, excellent
    conversation_history_length: int = 0
    recent_feature_usage: Dict[str, int] = None
    time_constraints: str = "flexible"      # urgent, moderate, flexible
    complexity_preference: str = "adaptive" # simple, moderate, complex, adaptive


class PamServiceRouter:
    """
    Central broker for routing PAM requests to appropriate orchestrators.
    
    This router preserves the sophisticated orchestrator variety while organizing
    their usage based on user persona, context, and system state.
    """
    
    def __init__(self):
        self.routing_rules = self._initialize_routing_rules()
        self.performance_cache = {}
        self.routing_history = {}
        
    def _initialize_routing_rules(self) -> Dict[str, Dict]:
        """Initialize routing rules based on user personas and contexts"""
        return {
            # Digital Nomad - Tech-savvy users who want advanced features
            UserPersona.DIGITAL_NOMAD.value: {
                InteractionContext.PLANNING.value: {
                    "primary": "agentic",
                    "fallback": ["enhanced", "simple"],
                    "min_confidence": 0.7
                },
                InteractionContext.ACTIVE_TRAVEL.value: {
                    "primary": "enhanced", 
                    "fallback": ["simple"],
                    "min_confidence": 0.8  # Need reliability while traveling
                },
                InteractionContext.FINANCIAL.value: {
                    "primary": "agentic",
                    "fallback": ["enhanced", "simple"],
                    "min_confidence": 0.6
                },
                "default": {
                    "primary": "enhanced",
                    "fallback": ["simple"],
                    "min_confidence": 0.7
                }
            },
            
            # Snowbird - Reliability and simplicity focused
            UserPersona.SNOWBIRD.value: {
                InteractionContext.PLANNING.value: {
                    "primary": "simple",
                    "fallback": ["enhanced"],
                    "min_confidence": 0.9
                },
                InteractionContext.EMERGENCY.value: {
                    "primary": "simple",
                    "fallback": [],
                    "min_confidence": 0.95
                },
                "default": {
                    "primary": "simple",
                    "fallback": ["enhanced"],
                    "min_confidence": 0.8
                }
            },
            
            # New RVer - Educational and guidance focused
            UserPersona.NEW_RVER.value: {
                InteractionContext.PLANNING.value: {
                    "primary": "enhanced",
                    "fallback": ["simple"],
                    "min_confidence": 0.6
                },
                InteractionContext.MAINTENANCE.value: {
                    "primary": "agentic",  # Complex guidance needed
                    "fallback": ["enhanced", "simple"],
                    "min_confidence": 0.5
                },
                "default": {
                    "primary": "enhanced",
                    "fallback": ["simple"],
                    "min_confidence": 0.7
                }
            },
            
            # Weekend Warrior - Quick and efficient
            UserPersona.WEEKEND_WARRIOR.value: {
                "default": {
                    "primary": "simple",
                    "fallback": ["enhanced"],
                    "min_confidence": 0.8
                }
            },
            
            # Social Traveler - Community features
            UserPersona.SOCIAL_TRAVELER.value: {
                InteractionContext.SOCIAL.value: {
                    "primary": "enhanced",
                    "fallback": ["simple"],
                    "min_confidence": 0.7
                },
                "default": {
                    "primary": "simple",
                    "fallback": ["enhanced"],
                    "min_confidence": 0.8
                }
            },
            
            # Unknown/Default - Safe conservative routing
            UserPersona.UNKNOWN.value: {
                "default": {
                    "primary": "simple",
                    "fallback": ["enhanced"],
                    "min_confidence": 0.9
                }
            }
        }
    
    async def route_request(
        self, 
        user_context: UserContext, 
        message: str,
        conversation_history: list = None
    ) -> RoutingDecision:
        """
        Route a PAM request to the appropriate orchestrator based on context.
        
        Args:
            user_context: Enhanced user context for routing decisions
            message: The user message to process
            conversation_history: Previous conversation for context
            
        Returns:
            RoutingDecision with orchestrator choice and reasoning
        """
        try:
            # Analyze request complexity
            complexity = self._analyze_request_complexity(message, conversation_history)
            
            # Get routing rules for user persona
            persona_rules = self.routing_rules.get(
                user_context.persona.value,
                self.routing_rules[UserPersona.UNKNOWN.value]
            )
            
            # Get context-specific rules
            context_rules = persona_rules.get(
                user_context.interaction_context.value,
                persona_rules.get("default")
            )
            
            # Apply mobile/network optimizations
            adjusted_rules = self._apply_mobile_optimizations(
                context_rules, user_context
            )
            
            # Make routing decision
            decision = self._make_routing_decision(
                adjusted_rules, complexity, user_context
            )
            
            # Log routing decision for learning
            self._log_routing_decision(user_context, decision, message)
            
            return decision
            
        except Exception as e:
            logger.error(f"Error in PAM routing: {e}")
            # Safe fallback to simple orchestrator
            return RoutingDecision(
                orchestrator_type="simple",
                confidence=1.0,
                reasoning=f"Fallback due to routing error: {str(e)}",
                fallback_chain=[],
                estimated_complexity="simple"
            )
    
    def _analyze_request_complexity(
        self, 
        message: str, 
        conversation_history: list = None
    ) -> str:
        """Analyze the complexity of the user request"""
        complexity_indicators = {
            "simple": [
                "what", "where", "when", "how much", "yes", "no", "ok", "thanks"
            ],
            "moderate": [
                "plan", "recommend", "suggest", "compare", "calculate", "find"
            ],
            "complex": [
                "optimize", "analyze", "correlate", "predict", "automate", "integrate"
            ]
        }
        
        message_lower = message.lower()
        
        # Check for complex indicators
        complex_count = sum(1 for word in complexity_indicators["complex"] 
                          if word in message_lower)
        if complex_count > 0:
            return "complex"
        
        # Check for moderate indicators
        moderate_count = sum(1 for word in complexity_indicators["moderate"] 
                           if word in message_lower)
        if moderate_count > 0:
            return "moderate"
        
        # Check message length and conversation depth
        if len(message) > 200 or (conversation_history and len(conversation_history) > 10):
            return "moderate"
        
        return "simple"
    
    def _apply_mobile_optimizations(
        self, 
        context_rules: Dict, 
        user_context: UserContext
    ) -> Dict:
        """Apply mobile and network optimizations to routing rules"""
        optimized_rules = context_rules.copy()
        
        # Mobile device optimizations
        if user_context.device_type == "mobile":
            # Prefer faster orchestrators on mobile
            if optimized_rules["primary"] == "agentic":
                # Only use agentic for mobile if high confidence
                optimized_rules["min_confidence"] = min(
                    optimized_rules["min_confidence"] + 0.1, 0.95
                )
        
        # Network quality optimizations
        if user_context.network_quality in ["poor", "fair"]:
            # Prefer simple orchestrator for poor connections
            if optimized_rules["primary"] in ["agentic", "enhanced"]:
                # Downgrade to simpler orchestrator
                fallback_chain = optimized_rules["fallback"]
                if fallback_chain:
                    optimized_rules["primary"] = fallback_chain[0]
                    optimized_rules["fallback"] = fallback_chain[1:]
                else:
                    optimized_rules["primary"] = "simple"
                    optimized_rules["fallback"] = []
        
        # Time constraint optimizations
        if user_context.time_constraints == "urgent":
            # Always prefer simple for urgent requests
            optimized_rules["primary"] = "simple"
            optimized_rules["fallback"] = []
            optimized_rules["min_confidence"] = 0.95
        
        return optimized_rules
    
    def _make_routing_decision(
        self, 
        rules: Dict, 
        complexity: str, 
        user_context: UserContext
    ) -> RoutingDecision:
        """Make the final routing decision based on rules and context"""
        
        primary_orchestrator = rules["primary"]
        fallback_chain = rules["fallback"].copy()
        min_confidence = rules["min_confidence"]
        
        # Calculate confidence based on various factors
        confidence = self._calculate_confidence(
            primary_orchestrator, complexity, user_context
        )
        
        # If confidence is too low, try fallback
        if confidence < min_confidence and fallback_chain:
            logger.info(
                f"Confidence {confidence:.2f} below threshold {min_confidence}, "
                f"trying fallback from {primary_orchestrator} to {fallback_chain[0]}"
            )
            primary_orchestrator = fallback_chain.pop(0)
            confidence = self._calculate_confidence(
                primary_orchestrator, complexity, user_context
            )
        
        # Generate reasoning
        reasoning = (
            f"Routed to {primary_orchestrator} orchestrator for "
            f"{user_context.persona.value} user in {user_context.interaction_context.value} context. "
            f"Request complexity: {complexity}, Confidence: {confidence:.2f}"
        )
        
        return RoutingDecision(
            orchestrator_type=primary_orchestrator,
            confidence=confidence,
            reasoning=reasoning,
            fallback_chain=fallback_chain,
            estimated_complexity=complexity
        )
    
    def _calculate_confidence(
        self, 
        orchestrator: str, 
        complexity: str, 
        user_context: UserContext
    ) -> float:
        """Calculate confidence score for orchestrator choice"""
        base_confidence = 0.8
        
        # Orchestrator-complexity match
        if orchestrator == "simple" and complexity == "simple":
            base_confidence += 0.15
        elif orchestrator == "enhanced" and complexity == "moderate":
            base_confidence += 0.1
        elif orchestrator == "agentic" and complexity == "complex":
            base_confidence += 0.05
        else:
            base_confidence -= 0.05
        
        # Device type adjustments
        if user_context.device_type == "mobile":
            if orchestrator == "simple":
                base_confidence += 0.05
            elif orchestrator == "agentic":
                base_confidence -= 0.1
        
        # Network quality adjustments
        if user_context.network_quality == "poor":
            if orchestrator == "simple":
                base_confidence += 0.1
            else:
                base_confidence -= 0.15
        
        return max(0.0, min(1.0, base_confidence))
    
    def _log_routing_decision(
        self, 
        user_context: UserContext, 
        decision: RoutingDecision, 
        message: str
    ):
        """Log routing decision for performance analysis and learning"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_context.user_id,
            "persona": user_context.persona.value,
            "context": user_context.interaction_context.value,
            "device_type": user_context.device_type,
            "network_quality": user_context.network_quality,
            "orchestrator_chosen": decision.orchestrator_type,
            "confidence": decision.confidence,
            "complexity": decision.estimated_complexity,
            "message_length": len(message),
            "reasoning": decision.reasoning
        }
        
        # Store in routing history for analysis
        if user_context.user_id not in self.routing_history:
            self.routing_history[user_context.user_id] = []
        
        self.routing_history[user_context.user_id].append(log_entry)
        
        # Keep only last 100 entries per user
        if len(self.routing_history[user_context.user_id]) > 100:
            self.routing_history[user_context.user_id] = \
                self.routing_history[user_context.user_id][-100:]
        
        logger.info(f"PAM Routing Decision: {decision.reasoning}")
    
    def get_user_persona(self, user_id: str, user_data: Dict = None) -> UserPersona:
        """Determine user persona based on profile data and usage patterns"""
        if not user_data:
            return UserPersona.UNKNOWN
        
        # Analyze user profile for persona classification
        experience_level = user_data.get("experience_level", "unknown")
        age_group = user_data.get("age_group", "unknown")
        tech_comfort = user_data.get("tech_comfort", "medium")
        travel_frequency = user_data.get("travel_frequency", "occasional")
        
        # Persona determination logic
        if age_group in ["65+", "55-64"] and travel_frequency == "seasonal":
            return UserPersona.SNOWBIRD
        elif tech_comfort == "high" and travel_frequency in ["frequent", "full-time"]:
            return UserPersona.DIGITAL_NOMAD
        elif experience_level in ["beginner", "new"]:
            return UserPersona.NEW_RVER
        elif travel_frequency == "weekend" and tech_comfort in ["medium", "high"]:
            return UserPersona.WEEKEND_WARRIOR
        elif user_data.get("social_features_usage", 0) > 5:
            return UserPersona.SOCIAL_TRAVELER
        else:
            return UserPersona.UNKNOWN
    
    def get_interaction_context(self, message: str, user_data: Dict = None) -> InteractionContext:
        """Determine interaction context from message content and user state"""
        message_lower = message.lower()
        
        # Emergency detection
        emergency_keywords = ["emergency", "urgent", "help", "stuck", "broken", "accident"]
        if any(keyword in message_lower for keyword in emergency_keywords):
            return InteractionContext.EMERGENCY
        
        # Planning detection
        planning_keywords = ["plan", "trip", "route", "destination", "itinerary"]
        if any(keyword in message_lower for keyword in planning_keywords):
            return InteractionContext.PLANNING
        
        # Financial detection
        financial_keywords = ["budget", "cost", "expense", "money", "payment", "bill"]
        if any(keyword in message_lower for keyword in financial_keywords):
            return InteractionContext.FINANCIAL
        
        # Maintenance detection
        maintenance_keywords = ["maintenance", "repair", "service", "oil", "tire", "engine"]
        if any(keyword in message_lower for keyword in maintenance_keywords):
            return InteractionContext.MAINTENANCE
        
        # Social detection
        social_keywords = ["group", "friend", "meet", "share", "community", "event"]
        if any(keyword in message_lower for keyword in social_keywords):
            return InteractionContext.SOCIAL
        
        # Active travel detection (check user state if available)
        if user_data and user_data.get("currently_traveling", False):
            return InteractionContext.ACTIVE_TRAVEL
        
        # Default to casual chat
        return InteractionContext.CASUAL_CHAT
    
    def get_routing_analytics(self, user_id: str = None) -> Dict[str, Any]:
        """Get routing analytics for performance monitoring"""
        if user_id and user_id in self.routing_history:
            user_history = self.routing_history[user_id]
            total_decisions = len(user_history)
            
            if total_decisions == 0:
                return {"error": "No routing history for user"}
            
            # Calculate user-specific analytics
            orchestrator_usage = {}
            confidence_scores = []
            
            for entry in user_history:
                orch = entry["orchestrator_chosen"]
                orchestrator_usage[orch] = orchestrator_usage.get(orch, 0) + 1
                confidence_scores.append(entry["confidence"])
            
            return {
                "user_id": user_id,
                "total_decisions": total_decisions,
                "orchestrator_usage": orchestrator_usage,
                "average_confidence": sum(confidence_scores) / len(confidence_scores),
                "recent_decisions": user_history[-10:]  # Last 10 decisions
            }
        
        # Global analytics
        all_entries = []
        for user_entries in self.routing_history.values():
            all_entries.extend(user_entries)
        
        if not all_entries:
            return {"error": "No routing history available"}
        
        # Calculate global analytics
        orchestrator_usage = {}
        persona_distribution = {}
        context_distribution = {}
        
        for entry in all_entries:
            # Orchestrator usage
            orch = entry["orchestrator_chosen"]
            orchestrator_usage[orch] = orchestrator_usage.get(orch, 0) + 1
            
            # Persona distribution
            persona = entry["persona"]
            persona_distribution[persona] = persona_distribution.get(persona, 0) + 1
            
            # Context distribution
            context = entry["context"]
            context_distribution[context] = context_distribution.get(context, 0) + 1
        
        return {
            "total_decisions": len(all_entries),
            "unique_users": len(self.routing_history),
            "orchestrator_usage": orchestrator_usage,
            "persona_distribution": persona_distribution,
            "context_distribution": context_distribution
        }


# Global router instance
pam_service_router = PamServiceRouter()