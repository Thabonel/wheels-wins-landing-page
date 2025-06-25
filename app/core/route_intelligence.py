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

class RouteIntelligenceEngine:
    """
    Calculates intelligent search zones based on user's current location,
    destination, and travel preferences from existing profile data
    """
    
    def __init__(self):
        self.earth_radius_miles = 3959.0  # Earth's radius in miles
        self.supabase = get_supabase()

# Global instance for use by orchestrator
route_intelligence = RouteIntelligenceEngine()
