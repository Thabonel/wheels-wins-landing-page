# app/core/context_manager.py
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
import json

logger = logging.getLogger("pam")

class ContextManager:
    """Manages and validates context data for PAM conversations"""
    
    def __init__(self):
        self.default_context = {
            "user_id": None,
            "session_id": None,
            # CRITICAL: Use user_location with lat/lng keys (NOT latitude/longitude)
            # See docs/NAMING_CONVENTIONS_MASTER.md for field naming rules
            "user_location": {
                "lat": None,      # NOT latitude - weather tool checks 'lat'
                "lng": None,      # NOT longitude - weather tool checks 'lng'
                "city": None,
                "region": None,
                "country": None,
                "timezone": None,
                "source": None    # 'gps', 'ip', 'browser', 'cached'
            },
            "vehicle_info": {
                "make": None,
                "model": None,
                "year": None,
                "type": None,
                "fuel_type": None,
                "length": None,
                "towing_capacity": None
            },
            "travel_preferences": {
                "camp_types": [],
                "drive_limit_per_day": None,
                "travel_style": None,
                "accessibility_needs": [],
                "pet_friendly": False
            },
            "budget_constraints": {
                "daily_budget": None,
                "fuel_budget": None,
                "food_budget": None,
                "camp_budget": None,
                "total_monthly_budget": None
            },
            "conversation_history": [],
            "current_page": None,
            "timestamp": None
        }
    
    def validate_and_enrich_context(self, raw_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates incoming context and enriches it with defaults and additional data
        
        Args:
            raw_context: Raw context data from WebSocket
            
        Returns:
            Standardized and enriched context object
        """
        try:
            # Start with default context
            enriched_context = self.default_context.copy()
            
            # Update with provided context, validating each section
            if raw_context:
                # Core identifiers
                enriched_context["user_id"] = raw_context.get("user_id")
                enriched_context["session_id"] = raw_context.get("session_id")
                enriched_context["current_page"] = raw_context.get("current_page")
                
                # Location data - prefer user_location, fall back to location (deprecated)
                # See docs/NAMING_CONVENTIONS_MASTER.md Section 2 for field mapping
                user_loc = raw_context.get("user_location") or raw_context.get("location", {})
                if isinstance(user_loc, dict):
                    enriched_context["user_location"].update({
                        # Support both lat/lng (correct) and latitude/longitude (deprecated)
                        "lat": self._safe_float(user_loc.get("lat") or user_loc.get("latitude")),
                        "lng": self._safe_float(user_loc.get("lng") or user_loc.get("longitude")),
                        "city": user_loc.get("city"),
                        "region": user_loc.get("region"),
                        "country": user_loc.get("country"),
                        "timezone": user_loc.get("timezone"),
                        "source": user_loc.get("source")
                    })
                
                # Vehicle information
                vehicle = raw_context.get("vehicle_info", {})
                if isinstance(vehicle, dict):
                    enriched_context["vehicle_info"].update({
                        "make": vehicle.get("make"),
                        "model": vehicle.get("model"),
                        "year": self._safe_int(vehicle.get("year")),
                        "type": vehicle.get("type"),
                        "fuel_type": vehicle.get("fuel_type"),
                        "length": self._safe_float(vehicle.get("length")),
                        "towing_capacity": self._safe_float(vehicle.get("towing_capacity"))
                    })
                
                # Travel preferences
                travel_prefs = raw_context.get("travel_preferences", {})
                if isinstance(travel_prefs, dict):
                    enriched_context["travel_preferences"].update({
                        "camp_types": self._safe_list(travel_prefs.get("camp_types")),
                        "drive_limit_per_day": self._safe_int(travel_prefs.get("drive_limit_per_day")),
                        "travel_style": travel_prefs.get("travel_style"),
                        "accessibility_needs": self._safe_list(travel_prefs.get("accessibility_needs")),
                        "pet_friendly": bool(travel_prefs.get("pet_friendly", False))
                    })
                
                # Budget constraints
                budget = raw_context.get("budget_constraints", {})
                if isinstance(budget, dict):
                    enriched_context["budget_constraints"].update({
                        "daily_budget": self._safe_float(budget.get("daily_budget")),
                        "fuel_budget": self._safe_float(budget.get("fuel_budget")),
                        "food_budget": self._safe_float(budget.get("food_budget")),
                        "camp_budget": self._safe_float(budget.get("camp_budget")),
                        "total_monthly_budget": self._safe_float(budget.get("total_monthly_budget"))
                    })
                
                # Conversation history
                conv_history = raw_context.get("conversation_history", [])
                if isinstance(conv_history, list):
                    enriched_context["conversation_history"] = conv_history
            
            # Add timestamp
            enriched_context["timestamp"] = datetime.utcnow().isoformat()
            
            # Validate required fields
            self._validate_required_fields(enriched_context)
            
            logger.info(f"🔧 Context enriched for user: {enriched_context.get('user_id')}")
            logger.debug(f"📋 Enriched context: {json.dumps(enriched_context, indent=2, default=str)}")
            
            return enriched_context
            
        except Exception as e:
            logger.error(f"❌ Context enrichment failed: {str(e)}")
            # Return safe default context with any available user_id
            safe_context = self.default_context.copy()
            safe_context["user_id"] = raw_context.get("user_id") if raw_context else None
            safe_context["timestamp"] = datetime.utcnow().isoformat()
            return safe_context
    
    def _validate_required_fields(self, context: Dict[str, Any]) -> None:
        """Validate that required context fields are present"""
        if not context.get("user_id"):
            logger.warning("⚠️ Context missing user_id - this may limit functionality")
    
    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float"""
        try:
            return float(value) if value is not None else None
        except (ValueError, TypeError):
            return None
    
    def _safe_int(self, value: Any) -> Optional[int]:
        """Safely convert value to int"""
        try:
            return int(value) if value is not None else None
        except (ValueError, TypeError):
            return None
    
    def _safe_list(self, value: Any) -> List[Any]:
        """Safely convert value to list"""
        if isinstance(value, list):
            return value
        elif value is not None:
            return [value]
        else:
            return []
    
    def get_context_summary(self, context: Dict[str, Any]) -> str:
        """Generate a human-readable summary of the context for logging/debugging"""
        summary_parts = []
        
        user_id = context.get("user_id", "Unknown")
        summary_parts.append(f"User: {user_id}")

        # Use user_location with lat/lng keys
        user_loc = context.get("user_location", {})
        if user_loc.get("lat") and user_loc.get("lng"):
            summary_parts.append(f"Location: {user_loc['lat']:.4f}, {user_loc['lng']:.4f}")
        
        vehicle = context.get("vehicle_info", {})
        if vehicle.get("type"):
            summary_parts.append(f"Vehicle: {vehicle['type']}")
        
        budget = context.get("budget_constraints", {})
        if budget.get("daily_budget"):
            summary_parts.append(f"Daily Budget: ${budget['daily_budget']}")
        
        page = context.get("current_page")
        if page:
            summary_parts.append(f"Page: {page}")
        
        return " | ".join(summary_parts)
    
    def extract_relevant_context_for_node(self, context: Dict[str, Any], node_type: str) -> Dict[str, Any]:
        """Extract context most relevant for a specific node type"""
        base_context = {
            "user_id": context.get("user_id"),
            "session_id": context.get("session_id"),
            "timestamp": context.get("timestamp")
        }
        
        if node_type == "wheels":
            base_context.update({
                "vehicle_info": context.get("vehicle_info"),
                "user_location": context.get("user_location"),  # Correct field name
                "budget_constraints": {
                    "fuel_budget": context.get("budget_constraints", {}).get("fuel_budget"),
                    "daily_budget": context.get("budget_constraints", {}).get("daily_budget")
                }
            })

        elif node_type == "wins":
            base_context.update({
                "budget_constraints": context.get("budget_constraints"),
                "user_location": context.get("user_location")  # Correct field name
            })

        elif node_type == "social":
            base_context.update({
                "user_location": context.get("user_location"),  # Correct field name
                "travel_preferences": context.get("travel_preferences")
            })

        elif node_type == "you":
            base_context.update({
                "vehicle_info": context.get("vehicle_info"),
                "travel_preferences": context.get("travel_preferences"),
                "user_location": context.get("user_location")  # Correct field name
            })
        
        else:
            # For memory and general nodes, include full context
            base_context = context.copy()
        
        return base_context

# Global context manager instance
context_manager = ContextManager()