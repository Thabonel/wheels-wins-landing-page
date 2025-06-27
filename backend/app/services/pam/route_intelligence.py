# app/core/route_intelligence.py
import math
import logging
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass
from app.database.supabase_client import get_supabase

logger = logging.getLogger("pam")

@dataclass
class SearchZone:
    """Represents a geographic search area along the user's route"""
    center_lat: float
    center_lng: float
    radius_miles: float
    priority: int  # 1=current location, 2=next stop, 3=future stops
    zone_type: str  # "current", "overnight", "future"

@dataclass
class UserProfile:
    """User profile data from existing database structure"""
    user_id: str
    current_latitude: Optional[float]
    current_longitude: Optional[float]
    destination_latitude: Optional[float]
    destination_longitude: Optional[float]
    travel_radius_miles: Optional[float]
    max_driving: Optional[str]
    camp_types: Optional[str]
    travel_style: Optional[str]
    budget_range: Optional[str]
    accessibility_needs: Optional[str]
    vehicle_type: Optional[str]

class RouteIntelligenceEngine:
    """
    Calculates intelligent search zones based on user's current location,
    destination, and travel preferences from existing profile data
    """

    def __init__(self):
        self.earth_radius_miles = 3959.0  # Earth's radius in miles
        self.supabase = get_supabase()

    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Fetch user profile from existing Supabase profiles table"""
        try:
            response = self.supabase.table("profiles").select("*").eq("id", user_id).single().execute()

            if response.data:
                data = response.data
                return UserProfile(
                    user_id=user_id,
                    current_latitude=data.get("current_latitude"),
                    current_longitude=data.get("current_longitude"),
                    destination_latitude=data.get("destination_latitude"),
                    destination_longitude=data.get("destination_longitude"),
                    travel_radius_miles=data.get("travel_radius_miles", 50),  # Default 50 miles
                    max_driving=data.get("max_driving"),
                    camp_types=data.get("camp_types"),
                    travel_style=data.get("travel_style"),
                    budget_range=data.get("budget_range"),
                    accessibility_needs=data.get("accessibility_needs"),
                    vehicle_type=data.get("vehicle_type")
                )
            return None

        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
            return None

    def calculate_bearing(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate bearing from point 1 to point 2 in degrees"""
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lng_rad = math.radians(lng2 - lng1)

        y = math.sin(delta_lng_rad) * math.cos(lat2_rad)
        x = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(delta_lng_rad)

        bearing_rad = math.atan2(y, x)
        bearing_deg = math.degrees(bearing_rad)

        # Normalize to 0-360 degrees
        return (bearing_deg + 360) % 360

    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance between two points in miles using Haversine formula"""
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat_rad = math.radians(lat2 - lat1)
        delta_lng_rad = math.radians(lng2 - lng1)

        a = (math.sin(delta_lat_rad / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng_rad / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return self.earth_radius_miles * c

    def project_point_along_bearing(self, lat: float, lng: float, bearing_deg: float, distance_miles: float) -> Tuple[float, float]:
        """Project a point along a bearing for a given distance"""
        lat_rad = math.radians(lat)
        lng_rad = math.radians(lng)
        bearing_rad = math.radians(bearing_deg)

        distance_rad = distance_miles / self.earth_radius_miles

        new_lat_rad = math.asin(
            math.sin(lat_rad) * math.cos(distance_rad) +
            math.cos(lat_rad) * math.sin(distance_rad) * math.cos(bearing_rad)
        )

        new_lng_rad = lng_rad + math.atan2(
            math.sin(bearing_rad) * math.sin(distance_rad) * math.cos(lat_rad),
            math.cos(distance_rad) - math.sin(lat_rad) * math.sin(new_lat_rad)
        )

        return math.degrees(new_lat_rad), math.degrees(new_lng_rad)

    def parse_max_driving(self, max_driving: str) -> float:
        """Convert max_driving text to miles (rough estimate)"""
        if not max_driving:
            return 200  # Default to 200 miles per day

        max_driving_lower = max_driving.lower()

        # Parse common formats
        if "1 hour" in max_driving_lower or "one hour" in max_driving_lower:
            return 60  # ~60 miles
        elif "2 hour" in max_driving_lower or "two hour" in max_driving_lower:
            return 120  # ~120 miles
        elif "3 hour" in max_driving_lower or "three hour" in max_driving_lower:
            return 180  # ~180 miles
        elif "4 hour" in max_driving_lower or "four hour" in max_driving_lower:
            return 240  # ~240 miles
        elif "half day" in max_driving_lower:
            return 200  # ~200 miles
        elif "full day" in max_driving_lower:
            return 400  # ~400 miles

        return 200  # Default

    async def calculate_search_zones(self, user_id: str) -> List[SearchZone]:
        """
        Calculate intelligent search zones based on user's route and preferences
        Uses existing profile data to create travel corridor
        """
        profile = await self.get_user_profile(user_id)

        if not profile or not profile.current_latitude or not profile.current_longitude:
            logger.warning(f"No location data for user {user_id}")
            return []

        zones = []

        # Zone 1: Current location (highest priority)
        current_radius = min(profile.travel_radius_miles or 25, 25)  # Max 25 miles for current
        zones.append(SearchZone(
            center_lat=profile.current_latitude,
            center_lng=profile.current_longitude,
            radius_miles=current_radius,
            priority=1,
            zone_type="current"
        ))

        # If user has destination, calculate route-based zones
        if profile.destination_latitude and profile.destination_longitude:
            total_distance = self.calculate_distance(
                profile.current_latitude, profile.current_longitude,
                profile.destination_latitude, profile.destination_longitude
            )

            # Calculate daily travel capacity
            daily_travel_miles = self.parse_max_driving(profile.max_driving)

            # Calculate bearing to destination
            bearing = self.calculate_bearing(
                profile.current_latitude, profile.current_longitude,
                profile.destination_latitude, profile.destination_longitude
            )

            # Create search zones along the route
            current_lat, current_lng = profile.current_latitude, profile.current_longitude
            remaining_distance = total_distance
            zone_priority = 2

            while remaining_distance > daily_travel_miles and zone_priority <= 5:  # Limit to 5 zones
                # Project next overnight stop
                next_lat, next_lng = self.project_point_along_bearing(
                    current_lat, current_lng, bearing, daily_travel_miles
                )

                # Add search zone around overnight stop
                overnight_radius = min(profile.travel_radius_miles or 30, 30)
                zones.append(SearchZone(
                    center_lat=next_lat,
                    center_lng=next_lng,
                    radius_miles=overnight_radius,
                    priority=zone_priority,
                    zone_type="overnight" if zone_priority == 2 else "future"
                ))

                # Update for next iteration
                current_lat, current_lng = next_lat, next_lng
                remaining_distance = self.calculate_distance(
                    current_lat, current_lng,
                    profile.destination_latitude, profile.destination_longitude
                )
                zone_priority += 1

        logger.info(f"Generated {len(zones)} search zones for user {user_id}")
        return zones

    async def get_content_filters(self, user_id: str) -> Dict[str, Any]:
        """Get user preferences for filtering scraped content"""
        profile = await self.get_user_profile(user_id)

        if not profile:
            return {}

        filters = {}

        if profile.camp_types:
            filters["camp_types"] = profile.camp_types.split(",") if "," in profile.camp_types else [profile.camp_types]

        if profile.budget_range:
            filters["budget_range"] = profile.budget_range

        if profile.accessibility_needs:
            filters["accessibility_needs"] = profile.accessibility_needs

        if profile.vehicle_type:
            filters["vehicle_type"] = profile.vehicle_type

        if profile.travel_style:
            filters["travel_style"] = profile.travel_style

        return filters

# Global instance for use by orchestrator
route_intelligence = RouteIntelligenceEngine()