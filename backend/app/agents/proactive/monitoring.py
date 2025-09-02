"""
Proactive Monitoring Service - Tracks user patterns and context for anticipatory assistance
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import json
from dataclasses import dataclass, asdict
from enum import Enum
import math

logger = logging.getLogger(__name__)


class PatternType(Enum):
    """Types of user patterns that can be detected"""
    LOCATION_MOVEMENT = "location_movement"
    TIME_BASED_ACTIVITY = "time_based_activity"
    SPENDING_BEHAVIOR = "spending_behavior"
    ROUTE_PREFERENCE = "route_preference"
    ACCOMMODATION_CHOICE = "accommodation_choice"
    FUEL_USAGE = "fuel_usage"
    SOCIAL_INTERACTION = "social_interaction"


@dataclass
class UserPattern:
    """Represents a detected user behavior pattern"""
    pattern_id: str
    pattern_type: PatternType
    user_id: str
    description: str
    confidence: float
    frequency: int
    last_occurrence: datetime
    next_predicted: Optional[datetime]
    context_data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


@dataclass
class LocationContext:
    """Current location and movement context"""
    latitude: float
    longitude: float
    accuracy: float
    speed: Optional[float]
    heading: Optional[float]
    altitude: Optional[float]
    timestamp: datetime
    address: Optional[str] = None
    region: Optional[str] = None
    is_moving: bool = False
    distance_from_last: float = 0.0


@dataclass
class EnvironmentalContext:
    """Current environmental conditions"""
    weather_conditions: Dict[str, Any]
    road_conditions: Dict[str, Any]
    fuel_prices_nearby: List[Dict[str, Any]]
    traffic_conditions: Dict[str, Any]
    community_events: List[Dict[str, Any]]
    campground_availability: List[Dict[str, Any]]
    timestamp: datetime


class ProactiveMonitoringService:
    """
    Service for proactive monitoring of user patterns, location, and environmental context
    Enables anticipatory assistance by learning user behaviors and tracking situational data
    """
    
    def __init__(self, memory_service=None):
        self.memory_service = memory_service
        self.patterns: Dict[str, UserPattern] = {}
        self.user_contexts: Dict[str, LocationContext] = {}
        self.environmental_context: Optional[EnvironmentalContext] = None
        
        # Pattern detection thresholds
        self.pattern_confidence_threshold = 0.7
        self.location_accuracy_threshold = 100  # meters
        self.movement_threshold = 50  # meters to consider movement
        
        # Monitoring intervals
        self.location_update_interval = 30  # seconds
        self.environmental_update_interval = 300  # 5 minutes
        self.pattern_analysis_interval = 3600  # 1 hour
        
        logger.info("Proactive Monitoring Service initialized")
    
    async def update_user_location(
        self, 
        user_id: str, 
        latitude: float, 
        longitude: float,
        accuracy: float,
        speed: Optional[float] = None,
        heading: Optional[float] = None,
        altitude: Optional[float] = None
    ) -> LocationContext:
        """Update user location and analyze movement patterns"""
        try:
            current_time = datetime.utcnow()
            
            # Get previous location for movement analysis
            previous_context = self.user_contexts.get(user_id)
            distance_moved = 0.0
            is_moving = False
            
            if previous_context:
                distance_moved = self._calculate_distance(
                    previous_context.latitude, previous_context.longitude,
                    latitude, longitude
                )
                is_moving = distance_moved > self.movement_threshold
            
            # Create new location context
            location_context = LocationContext(
                latitude=latitude,
                longitude=longitude,
                accuracy=accuracy,
                speed=speed,
                heading=heading,
                altitude=altitude,
                timestamp=current_time,
                is_moving=is_moving,
                distance_from_last=distance_moved
            )
            
            # Enhance with reverse geocoding (would integrate with mapping service)
            location_context.address = await self._get_address(latitude, longitude)
            location_context.region = await self._get_region(latitude, longitude)
            
            # Store updated context
            self.user_contexts[user_id] = location_context
            
            # Analyze location patterns
            await self._analyze_location_patterns(user_id, location_context)
            
            logger.debug(f"Updated location for user {user_id}: {latitude:.6f}, {longitude:.6f}")
            
            return location_context
            
        except Exception as e:
            logger.error(f"Error updating user location: {e}")
            return None
    
    async def analyze_user_patterns(self, user_id: str) -> List[UserPattern]:
        """Analyze user behavior patterns across all data types"""
        try:
            detected_patterns = []
            
            # Analyze different pattern types
            location_patterns = await self._analyze_location_patterns(user_id)
            time_patterns = await self._analyze_time_patterns(user_id)
            spending_patterns = await self._analyze_spending_patterns(user_id)
            route_patterns = await self._analyze_route_patterns(user_id)
            
            # Combine all detected patterns
            all_patterns = location_patterns + time_patterns + spending_patterns + route_patterns
            
            # Filter by confidence threshold
            high_confidence_patterns = [
                pattern for pattern in all_patterns 
                if pattern.confidence >= self.pattern_confidence_threshold
            ]
            
            # Update pattern storage
            for pattern in high_confidence_patterns:
                self.patterns[pattern.pattern_id] = pattern
            
            logger.info(f"Detected {len(high_confidence_patterns)} high-confidence patterns for user {user_id}")
            
            return high_confidence_patterns
            
        except Exception as e:
            logger.error(f"Error analyzing user patterns: {e}")
            return []
    
    async def update_environmental_context(self, location: LocationContext) -> EnvironmentalContext:
        """Update environmental context based on current location"""
        try:
            current_time = datetime.utcnow()
            
            # Gather environmental data (would integrate with real APIs)
            weather_data = await self._get_weather_data(location.latitude, location.longitude)
            road_data = await self._get_road_conditions(location.latitude, location.longitude)
            fuel_data = await self._get_nearby_fuel_prices(location.latitude, location.longitude)
            traffic_data = await self._get_traffic_conditions(location.latitude, location.longitude)
            events_data = await self._get_community_events(location.latitude, location.longitude)
            campground_data = await self._get_campground_availability(location.latitude, location.longitude)
            
            environmental_context = EnvironmentalContext(
                weather_conditions=weather_data,
                road_conditions=road_data,
                fuel_prices_nearby=fuel_data,
                traffic_conditions=traffic_data,
                community_events=events_data,
                campground_availability=campground_data,
                timestamp=current_time
            )
            
            self.environmental_context = environmental_context
            
            logger.debug(f"Updated environmental context at {location.latitude:.6f}, {location.longitude:.6f}")
            
            return environmental_context
            
        except Exception as e:
            logger.error(f"Error updating environmental context: {e}")
            return None
    
    async def get_proactive_opportunities(
        self, 
        user_id: str, 
        context_window_hours: int = 24
    ) -> List[Dict[str, Any]]:
        """Identify opportunities for proactive assistance"""
        try:
            opportunities = []
            current_time = datetime.utcnow()
            
            # Get user's current context
            location_context = self.user_contexts.get(user_id)
            user_patterns = [p for p in self.patterns.values() if p.user_id == user_id]
            
            if not location_context:
                return opportunities
            
            # Analyze upcoming pattern predictions
            for pattern in user_patterns:
                if pattern.next_predicted and pattern.next_predicted <= current_time + timedelta(hours=context_window_hours):
                    opportunity = {
                        'type': 'pattern_prediction',
                        'pattern_type': pattern.pattern_type.value,
                        'description': pattern.description,
                        'predicted_time': pattern.next_predicted.isoformat(),
                        'confidence': pattern.confidence,
                        'context': pattern.context_data,
                        'urgency': self._calculate_urgency(pattern.next_predicted, current_time)
                    }
                    opportunities.append(opportunity)
            
            # Environmental opportunities
            if self.environmental_context:
                env_opportunities = await self._analyze_environmental_opportunities(
                    location_context, self.environmental_context
                )
                opportunities.extend(env_opportunities)
            
            # Location-based opportunities
            location_opportunities = await self._analyze_location_opportunities(
                location_context, user_patterns
            )
            opportunities.extend(location_opportunities)
            
            # Sort by urgency and relevance
            opportunities.sort(key=lambda x: (x.get('urgency', 0), x.get('confidence', 0)), reverse=True)
            
            logger.info(f"Found {len(opportunities)} proactive opportunities for user {user_id}")
            
            return opportunities[:10]  # Return top 10 opportunities
            
        except Exception as e:
            logger.error(f"Error getting proactive opportunities: {e}")
            return []
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two coordinates in meters"""
        # Haversine formula
        R = 6371000  # Earth's radius in meters
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_lat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    async def _analyze_location_patterns(self, user_id: str, current_location: LocationContext = None) -> List[UserPattern]:
        """Analyze location-based movement patterns"""
        patterns = []
        
        try:
            # This would analyze historical location data from memory service
            # For now, return example patterns based on typical Grey Nomad behavior
            
            if current_location and current_location.is_moving:
                pattern = UserPattern(
                    pattern_id=f"{user_id}_movement_{datetime.utcnow().strftime('%Y%m%d')}",
                    pattern_type=PatternType.LOCATION_MOVEMENT,
                    user_id=user_id,
                    description="User typically travels in morning hours (8-11 AM)",
                    confidence=0.85,
                    frequency=5,
                    last_occurrence=datetime.utcnow(),
                    next_predicted=datetime.utcnow() + timedelta(days=1, hours=9),
                    context_data={
                        'preferred_travel_time': '08:00-11:00',
                        'average_distance_per_day': 250,
                        'preferred_break_interval': 2
                    },
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                patterns.append(pattern)
        
        except Exception as e:
            logger.warning(f"Error analyzing location patterns: {e}")
        
        return patterns
    
    async def _analyze_time_patterns(self, user_id: str) -> List[UserPattern]:
        """Analyze time-based activity patterns"""
        patterns = []
        
        # Example time-based patterns for Grey Nomads
        patterns.append(UserPattern(
            pattern_id=f"{user_id}_morning_routine",
            pattern_type=PatternType.TIME_BASED_ACTIVITY,
            user_id=user_id,
            description="User checks weather and road conditions at 7 AM daily",
            confidence=0.90,
            frequency=20,
            last_occurrence=datetime.utcnow(),
            next_predicted=datetime.utcnow().replace(hour=7, minute=0, second=0, microsecond=0) + timedelta(days=1),
            context_data={
                'activity': 'weather_check',
                'preferred_time': '07:00',
                'information_types': ['weather', 'road_conditions', 'fuel_prices']
            },
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        ))
        
        return patterns
    
    async def _analyze_spending_patterns(self, user_id: str) -> List[UserPattern]:
        """Analyze spending behavior patterns"""
        patterns = []
        
        # Example spending patterns
        patterns.append(UserPattern(
            pattern_id=f"{user_id}_fuel_pattern",
            pattern_type=PatternType.SPENDING_BEHAVIOR,
            user_id=user_id,
            description="User refuels when tank reaches 25% capacity, typically every 400km",
            confidence=0.88,
            frequency=15,
            last_occurrence=datetime.utcnow() - timedelta(days=2),
            next_predicted=datetime.utcnow() + timedelta(days=1),
            context_data={
                'trigger_threshold': 0.25,
                'average_distance_between_refuels': 400,
                'preferred_fuel_brands': ['Shell', 'Caltex'],
                'price_sensitivity': 'moderate'
            },
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        ))
        
        return patterns
    
    async def _analyze_route_patterns(self, user_id: str) -> List[UserPattern]:
        """Analyze route preference patterns"""
        patterns = []
        
        patterns.append(UserPattern(
            pattern_id=f"{user_id}_route_pref",
            pattern_type=PatternType.ROUTE_PREFERENCE,
            user_id=user_id,
            description="User prefers coastal routes and avoids major highways when possible",
            confidence=0.82,
            frequency=12,
            last_occurrence=datetime.utcnow() - timedelta(days=1),
            next_predicted=None,  # Preference, not time-based
            context_data={
                'route_preference': 'coastal',
                'highway_avoidance': True,
                'scenic_priority': 'high',
                'maximum_daily_distance': 350
            },
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        ))
        
        return patterns
    
    async def _get_weather_data(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Get weather data for location (placeholder)"""
        return {
            'current_temperature': 22,
            'condition': 'partly_cloudy',
            'wind_speed': 15,
            'wind_direction': 'NE',
            'humidity': 65,
            'forecast_6h': 'light_rain',
            'forecast_24h': 'clear',
            'alerts': []
        }
    
    async def _get_road_conditions(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Get road conditions for area (placeholder)"""
        return {
            'road_status': 'good',
            'construction_zones': [],
            'closures': [],
            'traffic_level': 'moderate',
            'caravan_restrictions': []
        }
    
    async def _get_nearby_fuel_prices(self, latitude: float, longitude: float) -> List[Dict[str, Any]]:
        """Get nearby fuel prices (placeholder)"""
        return [
            {
                'station_name': 'Shell Coles Express',
                'distance_km': 2.3,
                'diesel_price': 1.89,
                'unleaded_price': 1.85,
                'updated_at': datetime.utcnow().isoformat()
            },
            {
                'station_name': 'BP Service Station',
                'distance_km': 4.1,
                'diesel_price': 1.92,
                'unleaded_price': 1.88,
                'updated_at': datetime.utcnow().isoformat()
            }
        ]
    
    async def _get_traffic_conditions(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Get traffic conditions (placeholder)"""
        return {
            'congestion_level': 'light',
            'incidents': [],
            'travel_time_factor': 1.0,
            'recommended_departure': None
        }
    
    async def _get_community_events(self, latitude: float, longitude: float) -> List[Dict[str, Any]]:
        """Get nearby community events (placeholder)"""
        return [
            {
                'event_name': 'Grey Nomad Meetup - Coastal Stories',
                'location': 'Hervey Bay Community Centre',
                'distance_km': 15.2,
                'date': (datetime.utcnow() + timedelta(days=2)).isoformat(),
                'description': 'Share travel stories and tips with fellow Grey Nomads'
            }
        ]
    
    async def _get_campground_availability(self, latitude: float, longitude: float) -> List[Dict[str, Any]]:
        """Get campground availability (placeholder)"""
        return [
            {
                'name': 'Beachside Caravan Park',
                'distance_km': 8.5,
                'availability': 'available',
                'sites_free': 12,
                'powered_sites': True,
                'price_per_night': 42
            }
        ]
    
    async def _get_address(self, latitude: float, longitude: float) -> str:
        """Reverse geocoding to get address (placeholder)"""
        return f"Near {latitude:.3f}, {longitude:.3f}"
    
    async def _get_region(self, latitude: float, longitude: float) -> str:
        """Get region name (placeholder)"""
        # Simple region detection based on rough Australian coordinates
        if -28 <= latitude <= -10:
            return "Queensland"
        elif -37 <= latitude <= -28:
            return "New South Wales"
        elif -39 <= latitude <= -34:
            return "Victoria"
        else:
            return "Unknown"
    
    async def _analyze_environmental_opportunities(
        self, 
        location: LocationContext, 
        environment: EnvironmentalContext
    ) -> List[Dict[str, Any]]:
        """Analyze environmental context for proactive opportunities"""
        opportunities = []
        
        # Weather-based opportunities
        if 'rain' in environment.weather_conditions.get('forecast_6h', ''):
            opportunities.append({
                'type': 'weather_alert',
                'description': 'Rain forecast in next 6 hours - consider indoor activities or route adjustment',
                'confidence': 0.9,
                'urgency': 0.8,
                'context': {'weather_type': 'rain', 'timeframe': '6_hours'}
            })
        
        # Fuel price opportunities
        if environment.fuel_prices_nearby:
            cheapest_fuel = min(environment.fuel_prices_nearby, key=lambda x: x.get('diesel_price', 999))
            if cheapest_fuel['distance_km'] < 10:
                opportunities.append({
                    'type': 'fuel_opportunity',
                    'description': f'Good fuel prices at {cheapest_fuel["station_name"]} ({cheapest_fuel["distance_km"]}km away)',
                    'confidence': 0.85,
                    'urgency': 0.6,
                    'context': cheapest_fuel
                })
        
        # Community event opportunities
        for event in environment.community_events:
            if event['distance_km'] < 20:
                opportunities.append({
                    'type': 'community_event',
                    'description': f'Nearby event: {event["event_name"]} ({event["distance_km"]}km away)',
                    'confidence': 0.75,
                    'urgency': 0.4,
                    'context': event
                })
        
        return opportunities
    
    async def _analyze_location_opportunities(
        self, 
        location: LocationContext, 
        patterns: List[UserPattern]
    ) -> List[Dict[str, Any]]:
        """Analyze location context for opportunities"""
        opportunities = []
        
        # Check if user is approaching areas they've visited before
        for pattern in patterns:
            if pattern.pattern_type == PatternType.ROUTE_PREFERENCE:
                context = pattern.context_data
                if context.get('route_preference') == 'coastal' and 'coastal' in location.region.lower():
                    opportunities.append({
                        'type': 'route_preference_match',
                        'description': 'You\'re in a coastal area matching your preferred routes',
                        'confidence': pattern.confidence,
                        'urgency': 0.3,
                        'context': {'preference_match': 'coastal_route'}
                    })
        
        return opportunities
    
    def _calculate_urgency(self, predicted_time: datetime, current_time: datetime) -> float:
        """Calculate urgency score based on time until predicted event"""
        time_diff = predicted_time - current_time
        hours_until = time_diff.total_seconds() / 3600
        
        if hours_until < 1:
            return 1.0  # Very urgent
        elif hours_until < 6:
            return 0.8  # High urgency
        elif hours_until < 24:
            return 0.6  # Medium urgency
        elif hours_until < 72:
            return 0.4  # Low urgency
        else:
            return 0.2  # Very low urgency
    
    def get_monitoring_status(self) -> Dict[str, Any]:
        """Get current monitoring system status"""
        return {
            'active_users': len(self.user_contexts),
            'total_patterns': len(self.patterns),
            'environmental_data_age': (
                datetime.utcnow() - self.environmental_context.timestamp
            ).total_seconds() if self.environmental_context else None,
            'pattern_types_detected': list(set(p.pattern_type.value for p in self.patterns.values())),
            'monitoring_intervals': {
                'location_update': self.location_update_interval,
                'environmental_update': self.environmental_update_interval,
                'pattern_analysis': self.pattern_analysis_interval
            }
        }