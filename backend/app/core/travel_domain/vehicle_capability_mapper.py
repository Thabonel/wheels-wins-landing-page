"""
Vehicle Capability Mapper - Determines vehicle travel capabilities

Maps vehicle types to their travel capabilities to enable intelligent
routing recommendations based on what the vehicle can actually do.
"""

import logging
from typing import Dict, List, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class VehicleType(Enum):
    """Standardized vehicle type classifications"""
    # Overland/RV capable
    UNIMOG = "unimog"
    MOTORHOME = "motorhome"
    CARAVAN = "caravan"
    TRAVEL_TRAILER = "travel_trailer"
    FIFTH_WHEEL = "fifth_wheel"
    TRUCK_CAMPER = "truck_camper"
    CAMPER_VAN = "van"
    CAMPER_TRAILER = "camper_trailer"
    
    # Standard vehicles
    CAR = "car"
    SUV = "suv"
    TRUCK = "truck"
    MOTORCYCLE = "motorcycle"
    
    # Specialized
    BOAT = "boat"
    AIRCRAFT = "aircraft"
    BICYCLE = "bicycle"


class TransportMode(Enum):
    """Available transport modes"""
    OVERLAND = "overland"
    FERRY = "ferry"
    FLIGHT = "flight"
    TRAIN = "train"
    BUS = "bus"


class VehicleCapabilityMapper:
    """
    Maps vehicle types to their travel capabilities and restrictions
    
    Critical function: Determines whether a user should get overland/ferry
    routing vs flight recommendations based on their vehicle.
    """
    
    def __init__(self):
        self.rv_capable_types = {
            VehicleType.UNIMOG,
            VehicleType.MOTORHOME,
            VehicleType.CARAVAN,
            VehicleType.TRAVEL_TRAILER,
            VehicleType.FIFTH_WHEEL,
            VehicleType.TRUCK_CAMPER,
            VehicleType.CAMPER_VAN,
            VehicleType.CAMPER_TRAILER
        }
        
        logger.info("🚐 VehicleCapabilityMapper initialized")
    
    async def analyze_capabilities(self, vehicle_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze vehicle capabilities for travel routing
        
        This is the KEY function that determines if a user gets RV routing
        """
        if not vehicle_info:
            return self._get_default_capabilities()
        
        vehicle_type_str = vehicle_info.get("type", "").lower()
        vehicle_type = self._normalize_vehicle_type(vehicle_type_str)
        
        capabilities = {
            "vehicle_type": vehicle_type.value if vehicle_type else "unknown",
            "is_rv_capable": vehicle_type in self.rv_capable_types if vehicle_type else False,
            "can_use_ferries": self._can_use_ferries(vehicle_type),
            "should_avoid_flights": self._should_avoid_flights(vehicle_type),
            "preferred_transport_modes": self._get_preferred_modes(vehicle_type),
            "fuel_type": vehicle_info.get("fuel_type", "petrol"),
            "range_km": vehicle_info.get("range_km", 500),
            "height_restrictions": self._get_height_restrictions(vehicle_info),
            "weight_restrictions": self._get_weight_restrictions(vehicle_info),
            "accommodation_preferences": self._get_accommodation_preferences(vehicle_type)
        }
        
        logger.info(f"🔍 Vehicle analysis: {vehicle_type_str} → RV capable: {capabilities['is_rv_capable']}")
        return capabilities
    
    def _normalize_vehicle_type(self, vehicle_type_str: str) -> Optional[VehicleType]:
        """Normalize user input to standard vehicle types"""
        
        vehicle_type_str = vehicle_type_str.lower().strip()
        
        # Direct matches
        for vehicle_type in VehicleType:
            if vehicle_type.value == vehicle_type_str:
                return vehicle_type
        
        # Fuzzy matching for common variations
        mapping = {
            "unimog": VehicleType.UNIMOG,
            "mercedes unimog": VehicleType.UNIMOG,
            "expedition vehicle": VehicleType.UNIMOG,
            "off-road vehicle": VehicleType.UNIMOG,
            
            "rv": VehicleType.MOTORHOME,
            "recreational vehicle": VehicleType.MOTORHOME,
            "motor home": VehicleType.MOTORHOME,
            "class a": VehicleType.MOTORHOME,
            "class c": VehicleType.MOTORHOME,
            
            "van": VehicleType.CAMPER_VAN,
            "campervan": VehicleType.CAMPER_VAN,
            "camper van": VehicleType.CAMPER_VAN,
            "sprinter": VehicleType.CAMPER_VAN,
            
            "caravan": VehicleType.CARAVAN,
            "travel trailer": VehicleType.TRAVEL_TRAILER,
            "trailer": VehicleType.CAMPER_TRAILER,
            
            "car": VehicleType.CAR,
            "sedan": VehicleType.CAR,
            "hatchback": VehicleType.CAR,
            
            "suv": VehicleType.SUV,
            "4wd": VehicleType.SUV,
            "truck": VehicleType.TRUCK,
            "ute": VehicleType.TRUCK,
            
            "motorcycle": VehicleType.MOTORCYCLE,
            "motorbike": VehicleType.MOTORCYCLE,
            "bike": VehicleType.MOTORCYCLE,
        }
        
        return mapping.get(vehicle_type_str)
    
    def _can_use_ferries(self, vehicle_type: Optional[VehicleType]) -> bool:
        """Determine if vehicle can use ferries"""
        if not vehicle_type:
            return False
        
        # Most land vehicles can use ferries
        ferry_capable = {
            VehicleType.UNIMOG,
            VehicleType.MOTORHOME,
            VehicleType.CARAVAN,
            VehicleType.TRAVEL_TRAILER,
            VehicleType.FIFTH_WHEEL,
            VehicleType.TRUCK_CAMPER,
            VehicleType.CAMPER_VAN,
            VehicleType.CAMPER_TRAILER,
            VehicleType.CAR,
            VehicleType.SUV,
            VehicleType.TRUCK,
            VehicleType.MOTORCYCLE
        }
        
        return vehicle_type in ferry_capable
    
    def _should_avoid_flights(self, vehicle_type: Optional[VehicleType]) -> bool:
        """
        Determine if flights should be avoided for this vehicle type
        
        CRITICAL LOGIC: This prevents flight recommendations for overland-capable vehicles
        """
        if not vehicle_type:
            return False
        
        # Overland-capable vehicles should prefer overland routes
        overland_preference = {
            VehicleType.UNIMOG,      # KEY: Unimogs should avoid flights!
            VehicleType.MOTORHOME,
            VehicleType.CARAVAN,
            VehicleType.TRAVEL_TRAILER,
            VehicleType.FIFTH_WHEEL,
            VehicleType.TRUCK_CAMPER,
            VehicleType.CAMPER_VAN
        }
        
        return vehicle_type in overland_preference
    
    def _get_preferred_modes(self, vehicle_type: Optional[VehicleType]) -> List[str]:
        """Get preferred transport modes for vehicle type"""
        if not vehicle_type:
            return ["flight", "train", "bus"]
        
        if vehicle_type in self.rv_capable_types:
            return ["overland", "ferry", "train"]  # Note: flights NOT preferred
        elif vehicle_type in {VehicleType.CAR, VehicleType.SUV, VehicleType.TRUCK}:
            return ["overland", "ferry", "flight", "train"]
        elif vehicle_type == VehicleType.MOTORCYCLE:
            return ["overland", "ferry", "flight", "train"]
        else:
            return ["flight", "train", "bus"]
    
    def _get_height_restrictions(self, vehicle_info: Dict[str, Any]) -> Dict[str, Any]:
        """Get vehicle height restrictions"""
        height_feet = vehicle_info.get("height_feet", 0)
        
        restrictions = {
            "height_feet": height_feet,
            "has_height_restrictions": height_feet > 8.0,  # Standard bridge clearance
            "max_bridge_clearance": height_feet + 1.0 if height_feet > 0 else 12.0
        }
        
        return restrictions
    
    def _get_weight_restrictions(self, vehicle_info: Dict[str, Any]) -> Dict[str, Any]:
        """Get vehicle weight restrictions"""
        weight_kg = vehicle_info.get("weight_kg", 0)
        
        restrictions = {
            "weight_kg": weight_kg,
            "requires_heavy_vehicle_permit": weight_kg > 4500,  # Australia HV permit threshold
            "ferry_weight_class": self._get_ferry_weight_class(weight_kg)
        }
        
        return restrictions
    
    def _get_ferry_weight_class(self, weight_kg: int) -> str:
        """Determine ferry booking weight class"""
        if weight_kg <= 2000:
            return "light_vehicle"
        elif weight_kg <= 3500:
            return "medium_vehicle"
        elif weight_kg <= 7500:
            return "heavy_vehicle"
        else:
            return "extra_heavy_vehicle"
    
    def _get_accommodation_preferences(self, vehicle_type: Optional[VehicleType]) -> Dict[str, Any]:
        """Get accommodation preferences for vehicle type"""
        
        if not vehicle_type or vehicle_type not in self.rv_capable_types:
            return {
                "self_contained": False,
                "requires_powered_sites": False,
                "prefers_hotels": True
            }
        
        # RV-specific accommodation preferences
        return {
            "self_contained": vehicle_type in {
                VehicleType.UNIMOG, VehicleType.MOTORHOME, 
                VehicleType.CAMPER_VAN, VehicleType.TRUCK_CAMPER
            },
            "requires_powered_sites": vehicle_type in {
                VehicleType.CARAVAN, VehicleType.TRAVEL_TRAILER,
                VehicleType.FIFTH_WHEEL, VehicleType.CAMPER_TRAILER
            },
            "prefers_hotels": False,
            "preferred_sites": ["rv_parks", "caravan_parks", "free_camps", "national_parks"]
        }
    
    def _get_default_capabilities(self) -> Dict[str, Any]:
        """Default capabilities for users without vehicle information"""
        return {
            "vehicle_type": "unknown",
            "is_rv_capable": False,
            "can_use_ferries": False,
            "should_avoid_flights": False,
            "preferred_transport_modes": ["flight", "train", "bus"],
            "fuel_type": "unknown",
            "range_km": 0,
            "height_restrictions": {"has_height_restrictions": False},
            "weight_restrictions": {"requires_heavy_vehicle_permit": False},
            "accommodation_preferences": {"prefers_hotels": True}
        }