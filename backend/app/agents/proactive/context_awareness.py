"""
PAM Context Awareness Engine - Phase 4
Advanced contextual understanding and anticipatory assistance
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Union, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import json
import math

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)


class ContextType(Enum):
    LOCATION = "location"
    TEMPORAL = "temporal"
    ACTIVITY = "activity"
    SOCIAL = "social"
    ENVIRONMENTAL = "environmental"
    EMOTIONAL = "emotional"
    FINANCIAL = "financial"
    TRAVEL = "travel"


class ContextPriority(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


class AnticipationConfidence(Enum):
    VERY_LOW = 0.2
    LOW = 0.4
    MEDIUM = 0.6
    HIGH = 0.8
    VERY_HIGH = 0.9


@dataclass
class ContextualFactor:
    type: ContextType
    key: str
    value: Any
    confidence: float
    timestamp: datetime
    source: str
    priority: ContextPriority = ContextPriority.MEDIUM
    expires_at: Optional[datetime] = None


@dataclass
class ContextualInsight:
    id: str
    description: str
    factors: List[ContextualFactor]
    confidence: float
    priority: ContextPriority
    created_at: datetime
    relevant_until: Optional[datetime] = None


@dataclass
class AnticipatedNeed:
    id: str
    description: str
    category: str
    confidence: AnticipationConfidence
    urgency: ContextPriority
    expected_time: datetime
    context_triggers: List[str]
    suggested_actions: List[str]
    user_preferences_match: float
    created_at: datetime


@dataclass
class ContextualState:
    user_id: str
    current_contexts: Dict[ContextType, List[ContextualFactor]] = field(default_factory=dict)
    insights: List[ContextualInsight] = field(default_factory=list)
    anticipated_needs: List[AnticipatedNeed] = field(default_factory=list)
    last_updated: datetime = field(default_factory=datetime.utcnow)
    activity_timeline: List[Dict[str, Any]] = field(default_factory=list)


class ContextAwarenessEngine:
    """Advanced contextual understanding and anticipatory assistance engine"""
    
    def __init__(self, openai_api_key: str):
        self.openai_api_key = openai_api_key
        self.model = ChatOpenAI(
            api_key=openai_api_key,
            model="gpt-4",
            temperature=0.1  # Low temperature for consistent analysis
        )
        
        # Context storage
        self.user_contexts: Dict[str, ContextualState] = {}
        
        # Context analyzers
        self.context_analyzers = self._initialize_context_analyzers()
        
        # Pattern recognition
        self.learned_patterns: Dict[str, Dict[str, Any]] = {}
        
        # Anticipation rules
        self.anticipation_rules = self._initialize_anticipation_rules()
        
        logger.info("Context Awareness Engine initialized")
    
    def _initialize_context_analyzers(self) -> Dict[ContextType, Any]:
        """Initialize context analyzers for different context types"""
        
        return {
            ContextType.LOCATION: self._analyze_location_context,
            ContextType.TEMPORAL: self._analyze_temporal_context,
            ContextType.ACTIVITY: self._analyze_activity_context,
            ContextType.SOCIAL: self._analyze_social_context,
            ContextType.ENVIRONMENTAL: self._analyze_environmental_context,
            ContextType.EMOTIONAL: self._analyze_emotional_context,
            ContextType.FINANCIAL: self._analyze_financial_context,
            ContextType.TRAVEL: self._analyze_travel_context
        }
    
    def _initialize_anticipation_rules(self) -> List[Dict[str, Any]]:
        """Initialize rules for anticipating user needs"""
        
        return [
            {
                "name": "fuel_stop_anticipation",
                "description": "Anticipate fuel stops based on consumption and location",
                "triggers": ["low_fuel_level", "distance_to_next_station", "consumption_pattern"],
                "conditions": {
                    "fuel_level": {"operator": "<", "value": 0.3},
                    "distance_to_station": {"operator": ">", "value": 50}
                },
                "anticipated_need": "fuel_stop_planning",
                "urgency": ContextPriority.HIGH,
                "lead_time_minutes": 30
            },
            {
                "name": "rest_break_anticipation", 
                "description": "Anticipate need for rest breaks during driving",
                "triggers": ["driving_duration", "time_of_day", "fatigue_indicators"],
                "conditions": {
                    "continuous_driving_hours": {"operator": ">", "value": 2},
                    "time_since_break": {"operator": ">", "value": 90}
                },
                "anticipated_need": "rest_break_suggestion",
                "urgency": ContextPriority.HIGH,
                "lead_time_minutes": 15
            },
            {
                "name": "weather_preparation",
                "description": "Anticipate weather-related preparations",
                "triggers": ["weather_forecast", "location", "planned_route"],
                "conditions": {
                    "severe_weather_probability": {"operator": ">", "value": 0.6},
                    "time_to_weather_event": {"operator": "<", "value": 120}
                },
                "anticipated_need": "weather_preparation",
                "urgency": ContextPriority.CRITICAL,
                "lead_time_minutes": 60
            },
            {
                "name": "social_opportunity",
                "description": "Anticipate social interaction opportunities", 
                "triggers": ["location", "community_events", "user_social_preferences"],
                "conditions": {
                    "proximity_to_events": {"operator": "<", "value": 10},
                    "social_preference_score": {"operator": ">", "value": 0.7}
                },
                "anticipated_need": "social_engagement_opportunity",
                "urgency": ContextPriority.MEDIUM,
                "lead_time_minutes": 120
            },
            {
                "name": "maintenance_reminder",
                "description": "Anticipate vehicle maintenance needs",
                "triggers": ["mileage", "time_since_service", "performance_indicators"],
                "conditions": {
                    "mileage_since_service": {"operator": ">", "value": 8000},
                    "days_since_service": {"operator": ">", "value": 90}
                },
                "anticipated_need": "vehicle_maintenance",
                "urgency": ContextPriority.MEDIUM,
                "lead_time_minutes": 10080  # 1 week
            }
        ]
    
    async def update_context(
        self,
        user_id: str,
        context_updates: Dict[ContextType, Dict[str, Any]],
        source: str = "user_input"
    ) -> ContextualState:
        """Update contextual information for a user"""
        
        try:
            if user_id not in self.user_contexts:
                self.user_contexts[user_id] = ContextualState(user_id=user_id)
            
            state = self.user_contexts[user_id]
            timestamp = datetime.utcnow()
            
            # Process each context type
            for context_type, data in context_updates.items():
                if context_type not in state.current_contexts:
                    state.current_contexts[context_type] = []
                
                # Create contextual factors
                for key, value in data.items():
                    factor = ContextualFactor(
                        type=context_type,
                        key=key,
                        value=value,
                        confidence=0.8,  # Default confidence
                        timestamp=timestamp,
                        source=source,
                        priority=self._determine_factor_priority(context_type, key, value)
                    )
                    
                    # Remove old factors with same key
                    state.current_contexts[context_type] = [
                        f for f in state.current_contexts[context_type] 
                        if f.key != key
                    ]
                    
                    # Add new factor
                    state.current_contexts[context_type].append(factor)
            
            # Analyze contexts for insights
            await self._analyze_contexts(state)
            
            # Anticipate future needs
            await self._anticipate_needs(state)
            
            # Update activity timeline
            self._update_activity_timeline(state, context_updates, source)
            
            state.last_updated = timestamp
            
            logger.info(f"Updated context for user {user_id} with {len(context_updates)} context types")
            return state
            
        except Exception as e:
            logger.error(f"Failed to update context for user {user_id}: {e}")
            raise
    
    async def get_contextual_insights(self, user_id: str) -> List[ContextualInsight]:
        """Get current contextual insights for a user"""
        
        if user_id not in self.user_contexts:
            return []
        
        state = self.user_contexts[user_id]
        
        # Filter out expired insights
        current_time = datetime.utcnow()
        valid_insights = [
            insight for insight in state.insights
            if insight.relevant_until is None or insight.relevant_until > current_time
        ]
        
        # Sort by priority and confidence
        valid_insights.sort(
            key=lambda x: (x.priority.value, x.confidence),
            reverse=True
        )
        
        return valid_insights
    
    async def get_anticipated_needs(self, user_id: str, look_ahead_hours: int = 24) -> List[AnticipatedNeed]:
        """Get anticipated needs for a user within specified timeframe"""
        
        if user_id not in self.user_contexts:
            return []
        
        state = self.user_contexts[user_id]
        current_time = datetime.utcnow()
        cutoff_time = current_time + timedelta(hours=look_ahead_hours)
        
        # Filter needs within timeframe
        relevant_needs = [
            need for need in state.anticipated_needs
            if current_time <= need.expected_time <= cutoff_time
        ]
        
        # Sort by urgency and expected time
        relevant_needs.sort(
            key=lambda x: (x.urgency.value, x.expected_time),
            reverse=True
        )
        
        return relevant_needs
    
    async def get_contextual_recommendations(
        self,
        user_id: str,
        current_query: str,
        context_types: Optional[List[ContextType]] = None
    ) -> List[str]:
        """Get contextually relevant recommendations"""
        
        try:
            if user_id not in self.user_contexts:
                return []
            
            state = self.user_contexts[user_id]
            
            # Get relevant context factors
            relevant_factors = []
            filter_types = context_types or list(ContextType)
            
            for context_type in filter_types:
                if context_type in state.current_contexts:
                    relevant_factors.extend(state.current_contexts[context_type])
            
            # Sort by priority and recency
            relevant_factors.sort(
                key=lambda x: (x.priority.value, x.timestamp),
                reverse=True
            )
            
            # Use AI to generate contextual recommendations
            recommendations = await self._generate_contextual_recommendations(
                current_query,
                relevant_factors[:10],  # Top 10 most relevant
                state.insights[:5],     # Top 5 insights
                state.anticipated_needs[:3]  # Top 3 anticipated needs
            )
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to get contextual recommendations: {e}")
            return []
    
    async def _analyze_contexts(self, state: ContextualState):
        """Analyze current contexts to generate insights"""
        
        try:
            insights = []
            
            # Cross-context analysis
            location_factors = state.current_contexts.get(ContextType.LOCATION, [])
            temporal_factors = state.current_contexts.get(ContextType.TEMPORAL, [])
            activity_factors = state.current_contexts.get(ContextType.ACTIVITY, [])
            
            # Location + Time insights
            if location_factors and temporal_factors:
                location_time_insight = await self._analyze_location_time_context(
                    location_factors, temporal_factors
                )
                if location_time_insight:
                    insights.append(location_time_insight)
            
            # Activity patterns
            if activity_factors:
                activity_insight = await self._analyze_activity_patterns(activity_factors)
                if activity_insight:
                    insights.append(activity_insight)
            
            # Environmental + Travel insights
            env_factors = state.current_contexts.get(ContextType.ENVIRONMENTAL, [])
            travel_factors = state.current_contexts.get(ContextType.TRAVEL, [])
            
            if env_factors and travel_factors:
                env_travel_insight = await self._analyze_environmental_travel_context(
                    env_factors, travel_factors
                )
                if env_travel_insight:
                    insights.append(env_travel_insight)
            
            # Update state insights
            state.insights.extend(insights)
            
            # Keep only recent insights (last 24 hours)
            cutoff = datetime.utcnow() - timedelta(hours=24)
            state.insights = [
                insight for insight in state.insights 
                if insight.created_at > cutoff
            ]
            
        except Exception as e:
            logger.error(f"Failed to analyze contexts: {e}")
    
    async def _anticipate_needs(self, state: ContextualState):
        """Anticipate future needs based on current context"""
        
        try:
            anticipated_needs = []
            
            # Apply anticipation rules
            for rule in self.anticipation_rules:
                need = await self._evaluate_anticipation_rule(rule, state)
                if need:
                    anticipated_needs.append(need)
            
            # Pattern-based anticipation
            pattern_needs = await self._anticipate_from_patterns(state)
            anticipated_needs.extend(pattern_needs)
            
            # Update state
            state.anticipated_needs.extend(anticipated_needs)
            
            # Remove expired or fulfilled needs
            current_time = datetime.utcnow()
            state.anticipated_needs = [
                need for need in state.anticipated_needs
                if need.expected_time > current_time
            ]
            
        except Exception as e:
            logger.error(f"Failed to anticipate needs: {e}")
    
    async def _evaluate_anticipation_rule(
        self,
        rule: Dict[str, Any],
        state: ContextualState
    ) -> Optional[AnticipatedNeed]:
        """Evaluate a single anticipation rule"""
        
        try:
            # Check if all triggers are present
            all_contexts = {}
            for context_list in state.current_contexts.values():
                for factor in context_list:
                    all_contexts[factor.key] = factor.value
            
            # Check conditions
            conditions_met = True
            for condition_key, condition in rule.get('conditions', {}).items():
                if condition_key not in all_contexts:
                    conditions_met = False
                    break
                
                value = all_contexts[condition_key]
                operator = condition['operator']
                threshold = condition['value']
                
                if operator == '>' and value <= threshold:
                    conditions_met = False
                    break
                elif operator == '<' and value >= threshold:
                    conditions_met = False
                    break
                elif operator == '==' and value != threshold:
                    conditions_met = False
                    break
            
            if not conditions_met:
                return None
            
            # Create anticipated need
            lead_time = timedelta(minutes=rule.get('lead_time_minutes', 60))
            expected_time = datetime.utcnow() + lead_time
            
            return AnticipatedNeed(
                id=f"rule_{rule['name']}_{int(datetime.utcnow().timestamp())}",
                description=rule['description'],
                category=rule['anticipated_need'],
                confidence=AnticipationConfidence.HIGH,
                urgency=rule['urgency'],
                expected_time=expected_time,
                context_triggers=rule['triggers'],
                suggested_actions=[],  # Would be populated based on need type
                user_preferences_match=0.8,  # Would calculate based on user prefs
                created_at=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Failed to evaluate anticipation rule {rule.get('name')}: {e}")
            return None
    
    async def _anticipate_from_patterns(self, state: ContextualState) -> List[AnticipatedNeed]:
        """Anticipate needs based on learned patterns"""
        
        # Placeholder for pattern-based anticipation
        # Would analyze user's historical behavior patterns
        return []
    
    async def _generate_contextual_recommendations(
        self,
        query: str,
        factors: List[ContextualFactor],
        insights: List[ContextualInsight],
        needs: List[AnticipatedNeed]
    ) -> List[str]:
        """Generate contextual recommendations using AI"""
        
        try:
            # Build context summary
            context_summary = "Current Context:\n"
            
            for factor in factors:
                context_summary += f"- {factor.type.value}: {factor.key} = {factor.value}\n"
            
            if insights:
                context_summary += "\nCurrent Insights:\n"
                for insight in insights:
                    context_summary += f"- {insight.description}\n"
            
            if needs:
                context_summary += "\nAnticipated Needs:\n"
                for need in needs:
                    context_summary += f"- {need.description} (expected: {need.expected_time.strftime('%H:%M')})\n"
            
            # Generate recommendations
            system_prompt = """You are PAM's contextual recommendation engine for Grey Nomads.

Based on the user's current query and contextual information, provide 3-5 highly relevant recommendations.

Guidelines:
- Consider all contextual factors when making recommendations
- Prioritize safety and practicality
- Make recommendations specific and actionable
- Consider Grey Nomad lifestyle and needs
- Account for anticipated needs and timing
- Keep recommendations concise but informative

Format each recommendation as a bullet point starting with "•"."""
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"Query: {query}\n\n{context_summary}")
            ]
            
            response = await self.model.ainvoke(messages)
            
            # Parse recommendations
            recommendations = []
            lines = response.content.split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith('•') or line.startswith('-'):
                    recommendations.append(line[1:].strip())
            
            return recommendations[:5]  # Return top 5
            
        except Exception as e:
            logger.error(f"Failed to generate contextual recommendations: {e}")
            return []
    
    def _determine_factor_priority(
        self,
        context_type: ContextType,
        key: str,
        value: Any
    ) -> ContextPriority:
        """Determine priority of a contextual factor"""
        
        # Safety-related factors are always high priority
        safety_keywords = ['fuel', 'weather', 'emergency', 'breakdown', 'medical']
        if any(keyword in key.lower() for keyword in safety_keywords):
            return ContextPriority.HIGH
        
        # Location and time factors are generally medium priority
        if context_type in [ContextType.LOCATION, ContextType.TEMPORAL]:
            return ContextPriority.MEDIUM
        
        # Activity and social factors are typically lower priority
        if context_type in [ContextType.ACTIVITY, ContextType.SOCIAL]:
            return ContextPriority.LOW
        
        return ContextPriority.MEDIUM
    
    def _update_activity_timeline(
        self,
        state: ContextualState,
        context_updates: Dict[ContextType, Dict[str, Any]],
        source: str
    ):
        """Update activity timeline with context changes"""
        
        activity_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "source": source,
            "context_types": list(context_updates.keys()),
            "summary": self._summarize_context_update(context_updates)
        }
        
        state.activity_timeline.append(activity_entry)
        
        # Keep timeline manageable (last 100 entries)
        if len(state.activity_timeline) > 100:
            state.activity_timeline = state.activity_timeline[-100:]
    
    def _summarize_context_update(self, context_updates: Dict[ContextType, Dict[str, Any]]) -> str:
        """Create a summary of context updates"""
        
        summaries = []
        for context_type, data in context_updates.items():
            key_updates = list(data.keys())[:3]  # First 3 keys
            summary = f"{context_type.value}: {', '.join(key_updates)}"
            if len(data) > 3:
                summary += f" (+{len(data) - 3} more)"
            summaries.append(summary)
        
        return "; ".join(summaries)
    
    # Context analyzer methods (placeholder implementations)
    
    async def _analyze_location_context(self, data: Dict[str, Any]) -> List[ContextualFactor]:
        """Analyze location-specific context"""
        # Would implement location-based analysis
        return []
    
    async def _analyze_temporal_context(self, data: Dict[str, Any]) -> List[ContextualFactor]:
        """Analyze time-based context"""
        # Would implement temporal analysis
        return []
    
    async def _analyze_activity_context(self, data: Dict[str, Any]) -> List[ContextualFactor]:
        """Analyze activity context"""
        # Would implement activity analysis
        return []
    
    async def _analyze_social_context(self, data: Dict[str, Any]) -> List[ContextualFactor]:
        """Analyze social context"""
        # Would implement social analysis
        return []
    
    async def _analyze_environmental_context(self, data: Dict[str, Any]) -> List[ContextualFactor]:
        """Analyze environmental context"""
        # Would implement environmental analysis
        return []
    
    async def _analyze_emotional_context(self, data: Dict[str, Any]) -> List[ContextualFactor]:
        """Analyze emotional context"""
        # Would implement emotional analysis
        return []
    
    async def _analyze_financial_context(self, data: Dict[str, Any]) -> List[ContextualFactor]:
        """Analyze financial context"""
        # Would implement financial analysis
        return []
    
    async def _analyze_travel_context(self, data: Dict[str, Any]) -> List[ContextualFactor]:
        """Analyze travel context"""
        # Would implement travel analysis
        return []
    
    # Cross-context analysis methods
    
    async def _analyze_location_time_context(
        self,
        location_factors: List[ContextualFactor],
        temporal_factors: List[ContextualFactor]
    ) -> Optional[ContextualInsight]:
        """Analyze location and time context together"""
        
        # Example: Generate insights about location appropriateness for time of day
        return None
    
    async def _analyze_activity_patterns(
        self,
        activity_factors: List[ContextualFactor]
    ) -> Optional[ContextualInsight]:
        """Analyze activity patterns"""
        
        # Example: Detect activity patterns and suggest optimizations
        return None
    
    async def _analyze_environmental_travel_context(
        self,
        env_factors: List[ContextualFactor],
        travel_factors: List[ContextualFactor]
    ) -> Optional[ContextualInsight]:
        """Analyze environmental and travel context together"""
        
        # Example: Generate insights about weather impact on travel
        return None
    
    async def get_context_summary(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive context summary for a user"""
        
        if user_id not in self.user_contexts:
            return {"error": "User context not found"}
        
        state = self.user_contexts[user_id]
        
        # Count factors by type
        context_counts = {}
        for context_type, factors in state.current_contexts.items():
            context_counts[context_type.value] = len(factors)
        
        return {
            "user_id": user_id,
            "last_updated": state.last_updated.isoformat(),
            "context_types": context_counts,
            "total_factors": sum(context_counts.values()),
            "insights_count": len(state.insights),
            "anticipated_needs_count": len(state.anticipated_needs),
            "activity_timeline_length": len(state.activity_timeline),
            "high_priority_factors": len([
                f for factors in state.current_contexts.values() 
                for f in factors 
                if f.priority == ContextPriority.HIGH
            ])
        }