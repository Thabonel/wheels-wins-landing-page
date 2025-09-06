"""
Travel Mode Detector - Determines appropriate travel routing mode

Analyzes user messages combined with vehicle capabilities to determine
the appropriate travel routing mode (overland vs flight vs ferry).
"""

import logging
from typing import Dict, Any, Optional
import re
from enum import Enum

logger = logging.getLogger(__name__)


class TravelMode(Enum):
    """Travel routing modes"""
    OVERLAND_VEHICLE = "overland_vehicle"  # User wants to travel with their RV/vehicle
    FLIGHT_PRIORITY = "flight_priority"    # User specifically wants flights
    FASTEST_ROUTE = "fastest_route"        # User wants fastest option
    BUDGET_ROUTE = "budget_route"          # User wants cheapest option
    GENERAL_TRAVEL = "general_travel"      # No specific preference


class TravelModeDetector:
    """
    Detects appropriate travel mode based on user message and vehicle capabilities
    
    Critical function: Ensures users with overland vehicles get RV routing
    instead of generic flight recommendations.
    """
    
    def __init__(self):
        # Keywords that indicate specific travel modes
        self.overland_keywords = [
            "drive", "road trip", "overland", "with my", "bring my", 
            "take my", "camping", "rv", "caravan", "motor home",
            "ferry", "vehicle ferry", "car ferry", "driving"
        ]
        
        self.flight_keywords = [
            "fly", "flight", "airplane", "airline", "airport",
            "book flight", "air travel", "plane"
        ]
        
        self.speed_keywords = [
            "fastest", "quickest", "urgent", "asap", "hurry",
            "quick", "rapid", "express"
        ]
        
        self.budget_keywords = [
            "cheap", "budget", "affordable", "save money", "cost effective",
            "low cost", "economical", "inexpensive"
        ]
        
        # Location pairs that require ferries in Australia
        self.ferry_required_routes = [
            ("sydney", "hobart"), ("melbourne", "hobart"), ("brisbane", "hobart"),
            ("adelaide", "hobart"), ("perth", "hobart"), ("darwin", "hobart"),
            ("mainland", "tasmania"), ("australia", "tasmania")
        ]
        
        logger.info("🎯 TravelModeDetector initialized")
    
    async def detect_mode(
        self, 
        user_message: str, 
        vehicle_info: Dict[str, Any]
    ) -> TravelMode:
        """
        Detect appropriate travel mode based on message and vehicle capabilities
        
        KEY LOGIC: Users with overland-capable vehicles get OVERLAND_VEHICLE mode
        unless they specifically request flights
        """
        
        message_lower = user_message.lower()
        
        # Check for explicit flight requests
        if self._contains_keywords(message_lower, self.flight_keywords):
            logger.info(f"🛫 Flight mode detected: explicit flight request")
            return TravelMode.FLIGHT_PRIORITY
        
        # Check for speed priority
        if self._contains_keywords(message_lower, self.speed_keywords):
            logger.info(f"⚡ Fastest route mode detected")
            return TravelMode.FASTEST_ROUTE
        
        # Check for budget priority  
        if self._contains_keywords(message_lower, self.budget_keywords):
            logger.info(f"💰 Budget route mode detected")
            return TravelMode.BUDGET_ROUTE
        
        # Check if user has overland-capable vehicle
        vehicle_type = vehicle_info.get("type", "").lower()
        is_rv_capable = vehicle_info.get("is_rv", False) or self._is_overland_capable(vehicle_type)
        
        if is_rv_capable:
            # Check for overland indicators
            if (self._contains_keywords(message_lower, self.overland_keywords) or 
                self._requires_ferry_route(message_lower)):
                
                logger.info(f"🚐 Overland vehicle mode: RV-capable vehicle with travel request")
                return TravelMode.OVERLAND_VEHICLE
            
            # Even without explicit overland keywords, if they have an RV and are
            # planning a trip that their vehicle can handle, prefer overland
            if self._is_trip_planning_request(message_lower) and not self._explicitly_excludes_vehicle(message_lower):
                logger.info(f"🚐 Overland vehicle mode: RV owner planning trip")
                return TravelMode.OVERLAND_VEHICLE
        
        logger.info(f"🔄 General travel mode: no specific preferences detected")
        return TravelMode.GENERAL_TRAVEL
    
    def _contains_keywords(self, text: str, keywords: list) -> bool:
        """Check if text contains any of the keywords"""
        return any(keyword in text for keyword in keywords)
    
    def _is_overland_capable(self, vehicle_type: str) -> bool:
        """Check if vehicle type is overland-capable"""
        overland_types = [
            "unimog", "motorhome", "caravan", "travel_trailer", 
            "fifth_wheel", "truck_camper", "van", "camper_trailer",
            "rv", "recreational vehicle", "motor home", "expedition vehicle"
        ]
        
        return any(vtype in vehicle_type for vtype in overland_types)
    
    def _requires_ferry_route(self, message: str) -> bool:
        """Check if the route requires ferry travel"""
        
        # Check for Tasmania-related travel
        tasmania_indicators = ["hobart", "tasmania", "tassie", "devonport", "launceston"]
        mainland_indicators = ["sydney", "melbourne", "brisbane", "adelaide", "perth", "mainland"]
        
        has_tasmania = any(indicator in message for indicator in tasmania_indicators)
        has_mainland = any(indicator in message for indicator in mainland_indicators)
        
        return has_tasmania and has_mainland
    
    def _is_trip_planning_request(self, message: str) -> bool:
        """Check if message is a trip planning request"""
        trip_indicators = [
            "plan", "trip", "travel", "visit", "go to", "get to",
            "journey", "route", "way to", "how to get"
        ]
        
        return any(indicator in message for indicator in trip_indicators)
    
    def _explicitly_excludes_vehicle(self, message: str) -> bool:
        """Check if message explicitly excludes taking vehicle"""
        exclusion_phrases = [
            "without my", "leave my", "not taking", "flying only",
            "plane only", "don't want to drive"
        ]
        
        return any(phrase in message for phrase in exclusion_phrases)
    
    def get_mode_context(self, mode: TravelMode, vehicle_info: Dict[str, Any]) -> Dict[str, Any]:
        """Get additional context for the detected mode"""
        
        context = {
            "mode": mode.value,
            "routing_priority": self._get_routing_priority(mode),
            "transport_preferences": self._get_transport_preferences(mode, vehicle_info),
            "accommodation_type": self._get_accommodation_type(mode, vehicle_info)
        }
        
        return context
    
    def _get_routing_priority(self, mode: TravelMode) -> str:
        """Get routing priority for the mode"""
        priority_map = {
            TravelMode.OVERLAND_VEHICLE: "overland_first",
            TravelMode.FLIGHT_PRIORITY: "flights_only", 
            TravelMode.FASTEST_ROUTE: "speed_first",
            TravelMode.BUDGET_ROUTE: "cost_first",
            TravelMode.GENERAL_TRAVEL: "balanced"
        }
        
        return priority_map.get(mode, "balanced")
    
    def _get_transport_preferences(self, mode: TravelMode, vehicle_info: Dict[str, Any]) -> list:
        """Get preferred transport modes for the travel mode"""
        
        if mode == TravelMode.OVERLAND_VEHICLE:
            return ["overland", "ferry"]  # NO flights for overland vehicle mode
        elif mode == TravelMode.FLIGHT_PRIORITY:
            return ["flight"]
        elif mode == TravelMode.FASTEST_ROUTE:
            return ["flight", "train", "overland"]
        elif mode == TravelMode.BUDGET_ROUTE:
            return ["bus", "train", "overland", "flight"]
        else:
            return ["flight", "train", "bus", "overland"]
    
    def _get_accommodation_type(self, mode: TravelMode, vehicle_info: Dict[str, Any]) -> str:
        """Get preferred accommodation type for the mode"""
        
        if mode == TravelMode.OVERLAND_VEHICLE:
            return "rv_friendly"
        elif mode == TravelMode.BUDGET_ROUTE:
            return "budget"
        else:
            return "standard"