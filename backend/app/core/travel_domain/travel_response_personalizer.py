"""
Travel Response Personalizer - Enhances AI responses with vehicle context

Ensures responses are personalized based on user's vehicle and travel preferences,
preventing generic responses when vehicle-specific context is available.
"""

import logging
from typing import Dict, Any, List, Optional
import re

logger = logging.getLogger(__name__)


class TravelResponsePersonalizer:
    """
    Personalizes AI travel responses based on user vehicle and preferences
    
    Key function: Prevents generic responses by injecting vehicle context
    and ensuring recommendations match user's actual travel capabilities.
    """
    
    def __init__(self):
        # Route-specific knowledge for Australia
        self.australia_routes = {
            ("sydney", "hobart"): {
                "overland_route": "Sydney → Melbourne (9 hours) → Ferry to Devonport (11 hours) → Hobart (4 hours)",
                "ferry_operator": "Spirit of Tasmania",
                "total_time": "24-30 hours including stops",
                "vehicle_considerations": "Book vehicle ferry in advance, carry extra fuel"
            },
            ("melbourne", "hobart"): {
                "overland_route": "Melbourne → Ferry to Devonport (11 hours) → Hobart (4 hours)",
                "ferry_operator": "Spirit of Tasmania",
                "total_time": "15-18 hours",
                "vehicle_considerations": "Direct ferry route, most convenient for vehicles"
            }
        }
        
        # Vehicle-specific response templates
        self.vehicle_templates = {
            "unimog": {
                "greeting": "Perfect for your Unimog expedition vehicle!",
                "routing_advice": "Your Unimog is well-suited for overland travel including ferry crossings.",
                "accommodation": "Look for RV-friendly camping grounds or caravan parks.",
                "fuel_planning": "Plan fuel stops for your diesel Unimog - consider range and availability."
            },
            "motorhome": {
                "greeting": "Great choice for your motorhome adventure!",
                "routing_advice": "Your motorhome provides comfortable overland travel options.",
                "accommodation": "Caravan parks and RV-friendly sites will accommodate your motorhome.",
                "fuel_planning": "Factor in your motorhome's fuel consumption for route planning."
            }
        }
        
        logger.info("💬 TravelResponsePersonalizer initialized")
    
    async def enhance_response(
        self, 
        ai_response: Dict[str, Any], 
        user_context: Any, 
        travel_mode: str
    ) -> Dict[str, Any]:
        """
        Enhance AI response with personalized vehicle and travel context
        
        This prevents generic responses and ensures vehicle-specific recommendations
        """
        
        original_content = ai_response.get("content", "")
        
        # Skip enhancement if response is already personalized
        if self._is_already_personalized(original_content, user_context):
            return ai_response
        
        # Enhance based on travel mode and vehicle
        enhanced_content = await self._personalize_content(
            original_content, user_context, travel_mode
        )
        
        # Add vehicle-specific context
        enhanced_content = self._add_vehicle_context(
            enhanced_content, user_context
        )
        
        # Add route-specific information
        enhanced_content = self._add_route_context(
            enhanced_content, user_context, travel_mode
        )
        
        result = ai_response.copy()
        result["content"] = enhanced_content
        result["personalized"] = True
        result["vehicle_context_added"] = True
        
        logger.info(f"✨ Enhanced response with {user_context.vehicle_info.get('type', 'unknown')} context")
        return result
    
    def _is_already_personalized(self, content: str, user_context: Any) -> bool:
        """Check if content is already personalized with vehicle context"""
        
        vehicle_type = user_context.vehicle_info.get("type", "").lower()
        vehicle_model = user_context.vehicle_info.get("make_model_year", "").lower()
        
        # Check if vehicle is mentioned in the response
        content_lower = content.lower()
        
        if vehicle_type and vehicle_type in content_lower:
            return True
        
        if vehicle_model and any(part in content_lower for part in vehicle_model.split()):
            return True
        
        # Check for generic personalization indicators
        personal_indicators = ["your vehicle", "your rv", "overland", "ferry"]
        if any(indicator in content_lower for indicator in personal_indicators):
            return True
        
        return False
    
    async def _personalize_content(
        self, 
        content: str, 
        user_context: Any, 
        travel_mode: str
    ) -> str:
        """Personalize content based on user context and travel mode"""
        
        if travel_mode == "OVERLAND_VEHICLE":
            return self._personalize_for_overland_travel(content, user_context)
        elif user_context.is_rv_traveler:
            return self._personalize_for_rv_traveler(content, user_context)
        else:
            return content
    
    def _personalize_for_overland_travel(self, content: str, user_context: Any) -> str:
        """Personalize content for overland vehicle travel"""
        
        vehicle_type = user_context.vehicle_info.get("type", "vehicle")
        vehicle_name = user_context.vehicle_info.get("make_model_year", "")
        
        # Remove flight recommendations if present
        content = self._remove_flight_suggestions(content)
        
        # Add vehicle-specific introduction
        if not self._has_vehicle_mention(content):
            vehicle_intro = self._get_vehicle_intro(vehicle_type, vehicle_name)
            content = f"{vehicle_intro}\n\n{content}"
        
        # Replace generic travel advice with vehicle-specific advice
        content = self._replace_generic_advice(content, user_context)
        
        return content
    
    def _personalize_for_rv_traveler(self, content: str, user_context: Any) -> str:
        """Personalize content for RV travelers"""
        
        # Add RV-specific context if not present
        if not self._has_rv_context(content):
            content = self._inject_rv_context(content, user_context)
        
        return content
    
    def _remove_flight_suggestions(self, content: str) -> str:
        """Remove flight suggestions from content"""
        
        # Patterns to identify and remove flight-related sections
        flight_patterns = [
            r'### Flight.*?(?=###|$)',  # Flight sections
            r'## Flight.*?(?=##|$)',   # Flight headers
            r'.*[Ff]light.*?\n',       # Flight lines
            r'.*[Aa]irline.*?\n',      # Airline lines
            r'.*[Aa]irport.*?\n'       # Airport lines
        ]
        
        for pattern in flight_patterns:
            content = re.sub(pattern, '', content, flags=re.DOTALL)
        
        # Clean up multiple newlines
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        return content.strip()
    
    def _get_vehicle_intro(self, vehicle_type: str, vehicle_name: str) -> str:
        """Get personalized intro based on vehicle"""
        
        vehicle_display = f"{vehicle_name} {vehicle_type}" if vehicle_name else vehicle_type
        
        if vehicle_type.lower() == "unimog":
            return f"🚐 Perfect for your {vehicle_display} expedition! Your Unimog is ideal for overland travel with ferry crossings."
        elif "motorhome" in vehicle_type.lower():
            return f"🏠 Great choice for your {vehicle_display} adventure! Motorhomes provide excellent comfort for overland journeys."
        elif "caravan" in vehicle_type.lower():
            return f"🚐 Excellent for your {vehicle_display} journey! Caravans offer flexibility for extended travels."
        else:
            return f"🚗 Planning your journey with your {vehicle_display}!"
    
    def _has_vehicle_mention(self, content: str) -> bool:
        """Check if content already mentions the vehicle"""
        vehicle_indicators = ["your vehicle", "your rv", "your motorhome", "your unimog", "your caravan"]
        content_lower = content.lower()
        return any(indicator in content_lower for indicator in vehicle_indicators)
    
    def _has_rv_context(self, content: str) -> bool:
        """Check if content has RV-specific context"""
        rv_indicators = ["rv park", "caravan park", "camping", "overland", "ferry"]
        content_lower = content.lower()
        return any(indicator in content_lower for indicator in rv_indicators)
    
    def _replace_generic_advice(self, content: str, user_context: Any) -> str:
        """Replace generic travel advice with vehicle-specific advice"""
        
        # Replace accommodation suggestions
        content = re.sub(
            r'[Hh]otel.*?accommodation',
            'RV-friendly caravan parks and camping grounds',
            content
        )
        
        # Replace transport suggestions
        content = re.sub(
            r'[Cc]ar rental.*?option',
            'your own vehicle provides the flexibility and comfort you need',
            content
        )
        
        return content
    
    def _inject_rv_context(self, content: str, user_context: Any) -> str:
        """Inject RV-specific context into content"""
        
        # Add RV considerations to accommodation sections
        if "accommodation" in content.lower():
            rv_advice = "\n\n**RV Travel Notes:** Look for caravan parks with powered sites, dump stations, and vehicle access. Book ahead during peak seasons."
            content += rv_advice
        
        return content
    
    def _add_vehicle_context(self, content: str, user_context: Any) -> str:
        """Add specific vehicle context to the response"""
        
        vehicle_info = user_context.vehicle_info
        if not vehicle_info:
            return content
        
        vehicle_type = vehicle_info.get("type", "").lower()
        
        # Add vehicle-specific considerations
        if vehicle_type in self.vehicle_templates:
            template = self.vehicle_templates[vehicle_type]
            
            # Add fuel planning if not present
            if "fuel" not in content.lower() and vehicle_info.get("fuel_type"):
                fuel_advice = f"\n\n**Fuel Planning:** {template['fuel_planning']}"
                content += fuel_advice
        
        return content
    
    def _add_route_context(self, content: str, user_context: Any, travel_mode: str) -> str:
        """Add route-specific context for known routes"""
        
        if travel_mode != "OVERLAND_VEHICLE":
            return content
        
        # Extract potential origin/destination from content
        route_info = self._extract_route_info(content)
        
        if route_info and route_info in self.australia_routes:
            route_data = self.australia_routes[route_info]
            
            route_details = f"""
            
**Recommended Overland Route:**
{route_data['overland_route']}

**Ferry Details:**
- Operator: {route_data['ferry_operator']}
- Total journey time: {route_data['total_time']}
- Vehicle considerations: {route_data['vehicle_considerations']}
            """
            
            content += route_details
        
        return content
    
    def _extract_route_info(self, content: str) -> Optional[tuple]:
        """Extract route information from content"""
        
        content_lower = content.lower()
        
        # Check for known routes
        if "sydney" in content_lower and "hobart" in content_lower:
            return ("sydney", "hobart")
        elif "melbourne" in content_lower and "hobart" in content_lower:
            return ("melbourne", "hobart")
        
        return None
    
    def get_personalization_stats(self) -> Dict[str, Any]:
        """Get statistics about personalization usage"""
        return {
            "supported_vehicle_types": len(self.vehicle_templates),
            "supported_routes": len(self.australia_routes),
            "personalization_active": True
        }