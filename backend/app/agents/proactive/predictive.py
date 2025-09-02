"""
Predictive Assistance Engine - Generates proactive recommendations and notifications
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

logger = logging.getLogger(__name__)


class AssistanceType(Enum):
    """Types of predictive assistance"""
    ROUTE_SUGGESTION = "route_suggestion"
    FUEL_RECOMMENDATION = "fuel_recommendation"  
    WEATHER_ADVISORY = "weather_advisory"
    MAINTENANCE_REMINDER = "maintenance_reminder"
    COMMUNITY_OPPORTUNITY = "community_opportunity"
    BUDGET_ALERT = "budget_alert"
    ACCOMMODATION_SUGGESTION = "accommodation_suggestion"
    SAFETY_NOTIFICATION = "safety_notification"


class UrgencyLevel(Enum):
    """Urgency levels for assistance"""
    CRITICAL = "critical"      # Immediate attention required
    HIGH = "high"             # Should be addressed soon
    MEDIUM = "medium"         # Helpful to know
    LOW = "low"               # Nice to have information
    INFO = "info"             # General information


@dataclass
class PredictiveAssistance:
    """Represents a predictive assistance recommendation"""
    assistance_id: str
    user_id: str
    assistance_type: AssistanceType
    title: str
    message: str
    urgency: UrgencyLevel
    confidence: float
    context_data: Dict[str, Any]
    expires_at: Optional[datetime]
    actions: List[Dict[str, Any]]
    created_at: datetime
    delivered: bool = False
    user_response: Optional[str] = None
    effectiveness_score: Optional[float] = None


@dataclass
class UserBehaviorProfile:
    """User's behavior profile for personalized predictions"""
    user_id: str
    preferences: Dict[str, Any]
    patterns: Dict[str, Any]
    response_history: Dict[str, Any]
    learning_data: Dict[str, Any]
    updated_at: datetime


class PredictiveAssistanceEngine:
    """
    Engine for generating proactive recommendations and predictive assistance
    Learns from user patterns and environmental context to provide anticipatory help
    """
    
    def __init__(self, monitoring_service=None, memory_service=None):
        self.monitoring_service = monitoring_service
        self.memory_service = memory_service
        self.user_profiles: Dict[str, UserBehaviorProfile] = {}
        self.active_assistances: Dict[str, PredictiveAssistance] = {}
        
        # Learning parameters
        self.min_confidence_threshold = 0.6
        self.max_active_assistances_per_user = 5
        self.learning_decay_factor = 0.95
        
        logger.info("Predictive Assistance Engine initialized")
    
    async def generate_predictive_assistance(
        self, 
        user_id: str, 
        context_window_hours: int = 24
    ) -> List[PredictiveAssistance]:
        """Generate predictive assistance based on user patterns and context"""
        try:
            # Get user's behavior profile
            user_profile = await self._get_or_create_user_profile(user_id)
            
            # Get proactive opportunities from monitoring service
            opportunities = []
            if self.monitoring_service:
                opportunities = await self.monitoring_service.get_proactive_opportunities(
                    user_id, context_window_hours
                )
            
            # Generate assistance recommendations
            assistances = []
            
            # Process each opportunity
            for opportunity in opportunities:
                assistance = await self._create_assistance_from_opportunity(
                    user_id, opportunity, user_profile
                )
                if assistance and assistance.confidence >= self.min_confidence_threshold:
                    assistances.append(assistance)
            
            # Add pattern-based assistances
            pattern_assistances = await self._generate_pattern_based_assistances(
                user_id, user_profile, context_window_hours
            )
            assistances.extend(pattern_assistances)
            
            # Add environmental assistances
            environmental_assistances = await self._generate_environmental_assistances(
                user_id, user_profile
            )
            assistances.extend(environmental_assistances)
            
            # Filter and rank assistances
            filtered_assistances = await self._filter_and_rank_assistances(
                user_id, assistances
            )
            
            # Store active assistances
            for assistance in filtered_assistances:
                self.active_assistances[assistance.assistance_id] = assistance
            
            logger.info(f"Generated {len(filtered_assistances)} predictive assistances for user {user_id}")
            
            return filtered_assistances
            
        except Exception as e:
            logger.error(f"Error generating predictive assistance: {e}")
            return []
    
    async def _create_assistance_from_opportunity(
        self,
        user_id: str,
        opportunity: Dict[str, Any],
        user_profile: UserBehaviorProfile
    ) -> Optional[PredictiveAssistance]:
        """Create assistance recommendation from a proactive opportunity"""
        try:
            opportunity_type = opportunity.get('type')
            confidence = opportunity.get('confidence', 0.5)
            urgency_score = opportunity.get('urgency', 0.5)
            
            # Map opportunity types to assistance types
            assistance_type_mapping = {
                'pattern_prediction': AssistanceType.ROUTE_SUGGESTION,
                'weather_alert': AssistanceType.WEATHER_ADVISORY,
                'fuel_opportunity': AssistanceType.FUEL_RECOMMENDATION,
                'community_event': AssistanceType.COMMUNITY_OPPORTUNITY,
                'route_preference_match': AssistanceType.ROUTE_SUGGESTION
            }
            
            assistance_type = assistance_type_mapping.get(
                opportunity_type, AssistanceType.ROUTE_SUGGESTION
            )
            
            # Determine urgency level
            urgency = self._calculate_urgency_level(urgency_score)
            
            # Generate personalized message
            title, message, actions = await self._generate_assistance_content(
                assistance_type, opportunity, user_profile
            )
            
            # Calculate expiration time
            expires_at = self._calculate_expiration_time(assistance_type, opportunity)
            
            assistance = PredictiveAssistance(
                assistance_id=str(uuid.uuid4()),
                user_id=user_id,
                assistance_type=assistance_type,
                title=title,
                message=message,
                urgency=urgency,
                confidence=confidence,
                context_data=opportunity.get('context', {}),
                expires_at=expires_at,
                actions=actions,
                created_at=datetime.utcnow()
            )
            
            return assistance
            
        except Exception as e:
            logger.error(f"Error creating assistance from opportunity: {e}")
            return None
    
    async def _generate_pattern_based_assistances(
        self,
        user_id: str,
        user_profile: UserBehaviorProfile,
        context_window_hours: int
    ) -> List[PredictiveAssistance]:
        """Generate assistances based on learned user patterns"""
        assistances = []
        
        try:
            # Fuel pattern assistance
            fuel_pattern = user_profile.patterns.get('fuel_usage')
            if fuel_pattern and fuel_pattern.get('next_predicted'):
                next_fuel_time = datetime.fromisoformat(fuel_pattern['next_predicted'])
                if next_fuel_time <= datetime.utcnow() + timedelta(hours=context_window_hours):
                    
                    assistance = PredictiveAssistance(
                        assistance_id=str(uuid.uuid4()),
                        user_id=user_id,
                        assistance_type=AssistanceType.FUEL_RECOMMENDATION,
                        title="Fuel Stop Suggestion",
                        message="Based on your travel patterns, you'll likely need fuel soon. I found some good prices ahead.",
                        urgency=UrgencyLevel.MEDIUM,
                        confidence=0.82,
                        context_data={
                            'predicted_time': next_fuel_time.isoformat(),
                            'pattern_confidence': fuel_pattern.get('confidence', 0.8)
                        },
                        expires_at=next_fuel_time + timedelta(hours=2),
                        actions=[
                            {
                                'type': 'view_fuel_prices',
                                'label': 'View Nearby Fuel Prices',
                                'data': {'radius_km': 20}
                            },
                            {
                                'type': 'dismiss',
                                'label': 'Not Now',
                                'data': {}
                            }
                        ],
                        created_at=datetime.utcnow()
                    )
                    assistances.append(assistance)
            
            # Route planning assistance based on travel patterns
            travel_pattern = user_profile.patterns.get('daily_travel')
            if travel_pattern and travel_pattern.get('typical_departure_time'):
                departure_time = travel_pattern['typical_departure_time']
                current_hour = datetime.utcnow().hour
                departure_hour = int(departure_time.split(':')[0])
                
                # Suggest route planning 1 hour before typical departure
                if abs(current_hour - (departure_hour - 1)) <= 1:
                    assistance = PredictiveAssistance(
                        assistance_id=str(uuid.uuid4()),
                        user_id=user_id,
                        assistance_type=AssistanceType.ROUTE_SUGGESTION,
                        title="Ready for Today's Journey?",
                        message=f"You typically start traveling around {departure_time}. Would you like me to check today's route conditions?",
                        urgency=UrgencyLevel.LOW,
                        confidence=0.75,
                        context_data={
                            'typical_departure': departure_time,
                            'pattern_strength': travel_pattern.get('frequency', 1)
                        },
                        expires_at=datetime.utcnow() + timedelta(hours=3),
                        actions=[
                            {
                                'type': 'check_route',
                                'label': 'Check Route Conditions',
                                'data': {}
                            },
                            {
                                'type': 'plan_stops',
                                'label': 'Plan Today\'s Stops',
                                'data': {}
                            }
                        ],
                        created_at=datetime.utcnow()
                    )
                    assistances.append(assistance)
                    
        except Exception as e:
            logger.warning(f"Error generating pattern-based assistances: {e}")
        
        return assistances
    
    async def _generate_environmental_assistances(
        self,
        user_id: str,
        user_profile: UserBehaviorProfile
    ) -> List[PredictiveAssistance]:
        """Generate assistances based on environmental conditions"""
        assistances = []
        
        try:
            # Weather-based assistance
            if self.monitoring_service and self.monitoring_service.environmental_context:
                env_context = self.monitoring_service.environmental_context
                weather = env_context.weather_conditions
                
                # Severe weather warning
                if weather.get('alerts'):
                    for alert in weather['alerts']:
                        assistance = PredictiveAssistance(
                            assistance_id=str(uuid.uuid4()),
                            user_id=user_id,
                            assistance_type=AssistanceType.WEATHER_ADVISORY,
                            title=f"Weather Alert: {alert.get('type', 'Unknown')}",
                            message=f"Weather advisory in your area: {alert.get('description', 'Check conditions')}",
                            urgency=UrgencyLevel.HIGH,
                            confidence=0.95,
                            context_data=alert,
                            expires_at=datetime.utcnow() + timedelta(hours=12),
                            actions=[
                                {
                                    'type': 'view_weather',
                                    'label': 'View Full Forecast',
                                    'data': {}
                                },
                                {
                                    'type': 'find_shelter',
                                    'label': 'Find Nearby Shelter',
                                    'data': {}
                                }
                            ],
                            created_at=datetime.utcnow()
                        )
                        assistances.append(assistance)
                
                # Community events
                for event in env_context.community_events:
                    if event['distance_km'] < 25:  # Within reasonable distance
                        assistance = PredictiveAssistance(
                            assistance_id=str(uuid.uuid4()),
                            user_id=user_id,
                            assistance_type=AssistanceType.COMMUNITY_OPPORTUNITY,
                            title="Community Event Nearby",
                            message=f"{event['event_name']} is happening {event['distance_km']:.1f}km away. Interested?",
                            urgency=UrgencyLevel.INFO,
                            confidence=0.65,
                            context_data=event,
                            expires_at=datetime.fromisoformat(event['date']) if event.get('date') else None,
                            actions=[
                                {
                                    'type': 'event_details',
                                    'label': 'View Event Details',
                                    'data': event
                                },
                                {
                                    'type': 'get_directions',
                                    'label': 'Get Directions',
                                    'data': {'destination': event['location']}
                                }
                            ],
                            created_at=datetime.utcnow()
                        )
                        assistances.append(assistance)
                        
        except Exception as e:
            logger.warning(f"Error generating environmental assistances: {e}")
        
        return assistances
    
    async def _filter_and_rank_assistances(
        self,
        user_id: str,
        assistances: List[PredictiveAssistance]
    ) -> List[PredictiveAssistance]:
        """Filter and rank assistances based on user preferences and relevance"""
        try:
            # Remove expired assistances
            valid_assistances = [
                a for a in assistances 
                if not a.expires_at or a.expires_at > datetime.utcnow()
            ]
            
            # Remove duplicates based on type and context similarity
            unique_assistances = []
            seen_contexts = set()
            
            for assistance in valid_assistances:
                context_key = (
                    assistance.assistance_type.value,
                    str(sorted(assistance.context_data.items()))
                )
                if context_key not in seen_contexts:
                    unique_assistances.append(assistance)
                    seen_contexts.add(context_key)
            
            # Rank by urgency and confidence
            def ranking_score(a: PredictiveAssistance) -> float:
                urgency_weights = {
                    UrgencyLevel.CRITICAL: 1.0,
                    UrgencyLevel.HIGH: 0.8,
                    UrgencyLevel.MEDIUM: 0.6,
                    UrgencyLevel.LOW: 0.4,
                    UrgencyLevel.INFO: 0.2
                }
                return urgency_weights.get(a.urgency, 0.5) * a.confidence
            
            ranked_assistances = sorted(
                unique_assistances, 
                key=ranking_score, 
                reverse=True
            )
            
            # Limit to max active assistances per user
            return ranked_assistances[:self.max_active_assistances_per_user]
            
        except Exception as e:
            logger.error(f"Error filtering and ranking assistances: {e}")
            return assistances[:self.max_active_assistances_per_user]
    
    async def _get_or_create_user_profile(self, user_id: str) -> UserBehaviorProfile:
        """Get or create user behavior profile"""
        if user_id not in self.user_profiles:
            # Create basic profile (would integrate with memory service for rich data)
            self.user_profiles[user_id] = UserBehaviorProfile(
                user_id=user_id,
                preferences={
                    'travel_style': 'leisurely',
                    'notification_frequency': 'normal',
                    'assistance_types': ['all']
                },
                patterns={
                    'fuel_usage': {
                        'next_predicted': (datetime.utcnow() + timedelta(hours=8)).isoformat(),
                        'confidence': 0.75
                    },
                    'daily_travel': {
                        'typical_departure_time': '09:00',
                        'frequency': 5
                    }
                },
                response_history={
                    'total_assistances': 0,
                    'positive_responses': 0,
                    'dismissed': 0
                },
                learning_data={
                    'effectiveness_scores': [],
                    'preferred_timing': {}
                },
                updated_at=datetime.utcnow()
            )
        
        return self.user_profiles[user_id]
    
    async def _generate_assistance_content(
        self,
        assistance_type: AssistanceType,
        opportunity: Dict[str, Any],
        user_profile: UserBehaviorProfile
    ) -> Tuple[str, str, List[Dict[str, Any]]]:
        """Generate personalized title, message, and actions for assistance"""
        
        description = opportunity.get('description', '')
        context = opportunity.get('context', {})
        
        if assistance_type == AssistanceType.FUEL_RECOMMENDATION:
            title = "⛽ Fuel Stop Suggestion"
            message = f"I noticed good fuel prices ahead. {description}"
            actions = [
                {'type': 'view_fuel_prices', 'label': 'Show Prices', 'data': context},
                {'type': 'navigate', 'label': 'Get Directions', 'data': context},
                {'type': 'dismiss', 'label': 'Not Now', 'data': {}}
            ]
            
        elif assistance_type == AssistanceType.WEATHER_ADVISORY:
            title = "🌦️ Weather Update"
            message = f"Weather heads up: {description}"
            actions = [
                {'type': 'view_weather', 'label': 'Full Forecast', 'data': context},
                {'type': 'find_shelter', 'label': 'Find Shelter', 'data': context},
                {'type': 'dismiss', 'label': 'Thanks', 'data': {}}
            ]
            
        elif assistance_type == AssistanceType.COMMUNITY_OPPORTUNITY:
            title = "👥 Community Event"
            message = f"There's a community event nearby: {description}"
            actions = [
                {'type': 'event_details', 'label': 'Learn More', 'data': context},
                {'type': 'get_directions', 'label': 'Directions', 'data': context},
                {'type': 'dismiss', 'label': 'Not Interested', 'data': {}}
            ]
            
        elif assistance_type == AssistanceType.ROUTE_SUGGESTION:
            title = "🗺️ Route Suggestion"
            message = f"Route insight: {description}"
            actions = [
                {'type': 'view_route', 'label': 'View Route', 'data': context},
                {'type': 'alternative_routes', 'label': 'Alternatives', 'data': context},
                {'type': 'dismiss', 'label': 'Current Route OK', 'data': {}}
            ]
            
        else:
            title = "💡 Suggestion"
            message = description
            actions = [
                {'type': 'learn_more', 'label': 'Learn More', 'data': context},
                {'type': 'dismiss', 'label': 'Dismiss', 'data': {}}
            ]
        
        return title, message, actions
    
    def _calculate_urgency_level(self, urgency_score: float) -> UrgencyLevel:
        """Convert urgency score to urgency level"""
        if urgency_score >= 0.9:
            return UrgencyLevel.CRITICAL
        elif urgency_score >= 0.7:
            return UrgencyLevel.HIGH
        elif urgency_score >= 0.5:
            return UrgencyLevel.MEDIUM
        elif urgency_score >= 0.3:
            return UrgencyLevel.LOW
        else:
            return UrgencyLevel.INFO
    
    def _calculate_expiration_time(
        self,
        assistance_type: AssistanceType,
        opportunity: Dict[str, Any]
    ) -> Optional[datetime]:
        """Calculate when assistance expires"""
        
        current_time = datetime.utcnow()
        
        if assistance_type == AssistanceType.WEATHER_ADVISORY:
            return current_time + timedelta(hours=12)
        elif assistance_type == AssistanceType.FUEL_RECOMMENDATION:
            return current_time + timedelta(hours=4)
        elif assistance_type == AssistanceType.COMMUNITY_OPPORTUNITY:
            event_date = opportunity.get('context', {}).get('date')
            if event_date:
                return datetime.fromisoformat(event_date)
            return current_time + timedelta(days=1)
        elif assistance_type == AssistanceType.ROUTE_SUGGESTION:
            return current_time + timedelta(hours=6)
        else:
            return current_time + timedelta(hours=24)
    
    async def record_user_response(
        self,
        assistance_id: str,
        response_type: str,
        response_data: Dict[str, Any] = None
    ) -> bool:
        """Record user response to assistance for learning"""
        try:
            if assistance_id not in self.active_assistances:
                return False
            
            assistance = self.active_assistances[assistance_id]
            assistance.user_response = response_type
            
            # Calculate effectiveness score
            effectiveness_score = self._calculate_effectiveness(response_type, response_data)
            assistance.effectiveness_score = effectiveness_score
            
            # Update user profile learning data
            user_profile = self.user_profiles.get(assistance.user_id)
            if user_profile:
                user_profile.response_history['total_assistances'] += 1
                if response_type in ['accepted', 'acted_upon']:
                    user_profile.response_history['positive_responses'] += 1
                elif response_type == 'dismissed':
                    user_profile.response_history['dismissed'] += 1
                
                # Store effectiveness score for learning
                user_profile.learning_data['effectiveness_scores'].append(effectiveness_score)
                user_profile.updated_at = datetime.utcnow()
            
            logger.info(f"Recorded user response for assistance {assistance_id}: {response_type}")
            return True
            
        except Exception as e:
            logger.error(f"Error recording user response: {e}")
            return False
    
    def _calculate_effectiveness(self, response_type: str, response_data: Dict[str, Any] = None) -> float:
        """Calculate effectiveness score based on user response"""
        effectiveness_scores = {
            'acted_upon': 1.0,      # User took the suggested action
            'accepted': 0.8,        # User acknowledged positively
            'viewed': 0.6,          # User viewed details
            'dismissed': 0.2,       # User dismissed
            'ignored': 0.1          # User ignored completely
        }
        
        return effectiveness_scores.get(response_type, 0.5)
    
    async def get_active_assistances(self, user_id: str) -> List[PredictiveAssistance]:
        """Get active assistances for a user"""
        return [
            assistance for assistance in self.active_assistances.values()
            if assistance.user_id == user_id and not assistance.delivered
        ]
    
    async def cleanup_expired_assistances(self):
        """Remove expired assistances"""
        current_time = datetime.utcnow()
        expired_ids = [
            aid for aid, assistance in self.active_assistances.items()
            if assistance.expires_at and assistance.expires_at <= current_time
        ]
        
        for aid in expired_ids:
            del self.active_assistances[aid]
        
        if expired_ids:
            logger.info(f"Cleaned up {len(expired_ids)} expired assistances")
    
    def get_engine_status(self) -> Dict[str, Any]:
        """Get predictive assistance engine status"""
        total_assistances = len(self.active_assistances)
        user_profiles = len(self.user_profiles)
        
        # Calculate average effectiveness
        all_scores = []
        for profile in self.user_profiles.values():
            all_scores.extend(profile.learning_data.get('effectiveness_scores', []))
        
        avg_effectiveness = sum(all_scores) / len(all_scores) if all_scores else 0.0
        
        return {
            'active_assistances': total_assistances,
            'user_profiles': user_profiles,
            'average_effectiveness': avg_effectiveness,
            'confidence_threshold': self.min_confidence_threshold,
            'max_assistances_per_user': self.max_active_assistances_per_user,
            'assistance_types': [t.value for t in AssistanceType],
            'urgency_levels': [u.value for u in UrgencyLevel]
        }