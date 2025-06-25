# app/core/orchestrator.py
from typing import Dict, List, Any
from enum import Enum
import json
import logging
from app.core.config import settings
from app.nodes.wins_node import wins_node
from app.nodes.wheels_node import wheels_node
from app.nodes.social_node import social_node
from app.nodes.you_node import you_node
from app.nodes.memory_node import MemoryNode

# Import the enhanced route intelligence
from app.core.route_intelligence import route_intelligence

# Import the scraping function
try:
    from scraper_service.main import fetch_and_parse
    SCRAPER_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Scraper service not available: {e}")
    SCRAPER_AVAILABLE = False

logger = logging.getLogger("pam")

class Domain(Enum):
    WHEELS = "wheels"
    WINS = "wins"
    SOCIAL = "social"
    YOU = "you"
    SHOP = "shop"
    GENERAL = "general"

class ActionType(Enum):
    VIEW = "view"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    NAVIGATE = "navigate"
    HELP = "help"
    PLAN = "plan"
    TRACK = "track"
    ANALYZE = "analyze"

class Intent:
    def __init__(self, domain: Domain, action: ActionType, entities: Dict[str, Any], confidence: float):
        self.domain = domain
        self.action = action
        self.entities = entities
        self.confidence = confidence

class IntentClassifier:
    def __init__(self):
        pass
    
    def classify(self, message: str, context: Dict[str, Any]) -> Intent:
        """Enhanced intent classification with camping keywords"""
        message_lower = message.lower()
        
        # Enhanced camping detection
        camping_keywords = ["camp", "camping", "campsite", "caravan park", "rv park", "overnight", "stay", "park up"]
        travel_keywords = ["travel", "route", "wheel", "drive", "road", "trip", "journey"]
        
        if any(word in message_lower for word in camping_keywords):
            return Intent(Domain.WHEELS, ActionType.VIEW, {"type": "camping"}, 0.9)
        elif any(word in message_lower for word in travel_keywords):
            return Intent(Domain.WHEELS, ActionType.VIEW, {"type": "travel"}, 0.8)
        elif any(word in message_lower for word in ["win", "goal", "achieve"]):
            return Intent(Domain.WINS, ActionType.VIEW, {}, 0.8)
        elif any(word in message_lower for word in ["social", "friend", "connect"]):
            return Intent(Domain.SOCIAL, ActionType.VIEW, {}, 0.8)
        elif any(word in message_lower for word in ["you", "profile", "personal"]):
            return Intent(Domain.YOU, ActionType.VIEW, {}, 0.8)
        else:
            return Intent(Domain.GENERAL, ActionType.VIEW, {}, 0.5)

class RouteIntelligentScraper:
    """Enhanced scraper that uses user's route and preferences"""
    
    def __init__(self):
        self.route_engine = route_intelligence
    
    async def scrape_camping_along_route(self, user_id: str, message: str) -> List[Dict[str, Any]]:
        """Scrape camping options along user's travel route"""
        if not SCRAPER_AVAILABLE:
            return [{
                "type": "error",
                "content": "Scraper service not available. Please check configuration."
            }]
        
        try:
            # Get user's intelligent search zones
            search_zones = await self.route_engine.calculate_search_zones(user_id)
            
            if not search_zones:
                return [{
                    "type": "message",
                    "content": "I need your location and travel plans to find camping options. Please update your profile with your current location and destination."
                }]
            
            # Get user preferences for filtering
            content_filters = await self.route_engine.get_content_filters(user_id)
            
            all_results = []
            total_found = 0
            
            # Scrape each zone in priority order
            for zone in search_zones[:3]:  # Limit to top 3 zones for performance
                try:
                    # Build Overpass query for this zone
                    overpass_query = self.build_overpass_query(
                        zone.center_lat, 
                        zone.center_lng, 
                        zone.radius_miles,
                        content_filters
                    )
                    
                    # Fetch data for this zone
                    zone_results = await fetch_and_parse(overpass_query)
                    
                    # Add zone metadata to results
                    for result in zone_results:
                        result['zone_type'] = zone.zone_type
                        result['priority'] = zone.priority
                        result['distance_from_current'] = self.route_engine.calculate_distance(
                            search_zones[0].center_lat,  # Current location
                            search_zones[0].center_lng,
                            result['lat'],
                            result['lng']
                        )
                    
                    all_results.extend(zone_results)
                    total_found += len(zone_results)
                    
                    logger.info(f"Found {len(zone_results)} campsites in {zone.zone_type} zone for user {user_id}")
                    
                except Exception as e:
                    logger.error(f"Error scraping zone {zone.zone_type}: {e}")
                    continue
            
            # Sort results by priority and distance
            all_results.sort(key=lambda x: (x.get('priority', 999), x.get('distance_from_current', 999)))
            
            # Build response based on results
            if total_found == 0:
                return [{
                    "type": "message",
                    "content": "I couldn't find any camping options along your planned route. You might want to adjust your travel radius or check alternative routes."
                }]
            
            # Generate intelligent summary
            summary = self.generate_camping_summary(all_results, content_filters)
            
            return [
                {
                    "type": "message", 
                    "content": summary
                },
                {
                    "type": "data_render",
                    "data": all_results[:20]  # Limit to top 20 results
                }
            ]
            
        except Exception as e:
            logger.error(f"Error in route-intelligent camping scrape: {e}")
            return [{
                "type": "error",
                "content": f"I encountered an error finding camping options: {str(e)}"
            }]
    
    def build_overpass_query(self, lat: float, lng: float, radius_miles: float, filters: Dict[str, Any]) -> str:
        """Build Overpass API query based on location and user preferences"""
        radius_meters = radius_miles * 1609.34  # Convert miles to meters
        
        # Base query for campsites
        query = f"""
        [out:json];
        (
          node["tourism"="camp_site"](around:{radius_meters},{lat},{lng});
          node["tourism"="caravan_site"](around:{radius_meters},{lat},{lng});
        );
        out;
        """
        
        # Build the full URL
        base_url = "https://overpass-api.de/api/interpreter?data="
        return base_url + query.replace('\n', '').replace(' ', '%20')
    
    def generate_camping_summary(self, results: List[Dict], filters: Dict[str, Any]) -> str:
        """Generate intelligent summary based on results and user preferences"""
        if not results:
            return "No camping options found along your route."
        
        total = len(results)
        current_zone = len([r for r in results if r.get('zone_type') == 'current'])
        overnight_zone = len([r for r in results if r.get('zone_type') == 'overnight'])
        
        summary = f"Found {total} camping options along your travel route! "
        
        if current_zone > 0:
            summary += f"{current_zone} near your current location, "
        
        if overnight_zone > 0:
            summary += f"{overnight_zone} for your next overnight stop, "
        
        # Add user preference context
        camp_types = filters.get('camp_types', [])
        if camp_types:
            summary += f"filtered for your preferred {', '.join(camp_types)} style. "
        
        summary += "Results are sorted by proximity to your route."
        
        return summary

class ActionPlanner:
    def __init__(self):
        self.classifier = IntentClassifier()
        self.route_scraper = RouteIntelligentScraper()
        self.memory_node = MemoryNode()

    async def plan(self, message: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create comprehensive action plan from user message using route intelligence"""
        intent = self.classifier.classify(message, context)
        actions = []
        
        # Enhanced camping request handling
        if intent.domain == Domain.WHEELS and intent.entities.get("type") == "camping":
            user_id = context.get('user_id')
            
            if not user_id:
                return [{
                    "type": "error",
                    "content": "I need to know who you are to find camping options. Please log in first."
                }]
            
            # Use route-intelligent scraping
            return await self.route_scraper.scrape_camping_along_route(user_id, message)
        
        # Route to appropriate node based on domain (existing logic)
        try:
            if intent.domain == Domain.WHEELS:
                result = await wheels_node.process(message, context)
            elif intent.domain == Domain.WINS:
                result = await wins_node.process(message, context)
            elif intent.domain == Domain.SOCIAL:
                result = await social_node.process(message, context)
            elif intent.domain == Domain.YOU:
                result = await you_node.process(message, context)
            else:
                result = {
                    "type": "message",
                    "content": "I'm not sure how to help with that. Could you be more specific about what you're looking for? I can help with camping, travel planning, budgets, or social connections."
                }
            
            actions.append(result)
            
        except Exception as e:
            logger.error(f"Error in action planning: {e}")
            return [{
                "type": "error",
                "content": f"I encountered an error: {e}"
            }]
        
        return actions

# Create global orchestrator instance
orchestrator = ActionPlanner()