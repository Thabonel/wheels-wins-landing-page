"""
Google Places Tool for PAM
Provides location-based business and attraction search capabilities
"""

import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from .base_tool import BaseTool
from app.services.scraping.api_integrations import GooglePlacesAPI
from app.core.config import get_settings

settings = get_settings()

class GooglePlacesTool(BaseTool):
    """Google Places API integration tool for PAM"""
    
    def __init__(self):
        super().__init__("google_places")
        self.google_places_api = None
        self.initialized = False
    
    async def initialize(self):
        """Initialize the Google Places API client"""
        try:
            self.google_places_api = GooglePlacesAPI()
            
            if self.google_places_api.client:
                self.initialized = True
                self.logger.info("✅ Google Places tool initialized successfully")
            else:
                self.logger.warning("⚠️ Google Places API not available - tool will return mock data")
                
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Google Places tool: {e}")
            self.initialized = False
    
    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute Google Places search
        
        Parameters:
        - action: 'nearby_search', 'text_search', 'place_details'
        - location: [latitude, longitude] or address string
        - place_type: 'restaurant', 'lodging', 'tourist_attraction', 'gas_station', etc.
        - radius: search radius in meters (default: 5000)
        - keyword: optional search keyword
        - min_rating: minimum rating filter (default: 3.0)
        - query: text query for text_search action
        - place_id: Google Place ID for place_details action
        """
        
        if not parameters:
            return self._create_error_response("No parameters provided")
        
        action = parameters.get('action', 'nearby_search')
        
        try:
            if action == 'nearby_search':
                return await self._nearby_search(user_id, parameters)
            elif action == 'text_search':
                return await self._text_search(user_id, parameters)
            elif action == 'place_details':
                return await self._place_details(user_id, parameters)
            else:
                return self._create_error_response(f"Unknown action: {action}")
                
        except Exception as e:
            self.logger.error(f"❌ Google Places tool execution failed: {e}")
            return self._create_error_response(f"Execution failed: {str(e)}")
    
    async def _nearby_search(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Search for nearby places"""
        
        # Extract and validate location
        location = await self._resolve_location(parameters.get('location'))
        if not location:
            return self._create_error_response("Invalid or missing location")
        
        place_type = parameters.get('place_type', 'restaurant')
        radius = min(parameters.get('radius', 5000), 50000)  # Max 50km
        keyword = parameters.get('keyword')
        min_rating = parameters.get('min_rating', 3.0)
        
        self.logger.info(f"🔍 Searching for {place_type} near {location} (radius: {radius}m)")
        
        if not self.initialized or not self.google_places_api.client:
            # Return mock data if API not available
            return self._create_mock_response('nearby_search', location, place_type)
        
        try:
            results = await self.google_places_api.nearby_search(
                location=location,
                place_type=place_type,
                radius=radius,
                keyword=keyword,
                min_rating=min_rating
            )
            
            # Format results for PAM
            formatted_results = self._format_places_for_pam(results)
            
            return self._create_success_response({
                'places': formatted_results,
                'search_params': {
                    'location': location,
                    'place_type': place_type,
                    'radius': radius,
                    'keyword': keyword,
                    'min_rating': min_rating
                },
                'count': len(formatted_results),
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            self.logger.error(f"❌ Nearby search failed: {e}")
            return self._create_error_response(f"Search failed: {str(e)}")
    
    async def _text_search(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Search places using text query"""
        
        query = parameters.get('query')
        if not query:
            return self._create_error_response("Query parameter is required for text search")
        
        location = await self._resolve_location(parameters.get('location'))
        if not location:
            return self._create_error_response("Invalid or missing location")
        
        radius = min(parameters.get('radius', 10000), 50000)
        
        self.logger.info(f"🔍 Text search: '{query}' near {location} (radius: {radius}m)")
        
        if not self.initialized or not self.google_places_api.client:
            return self._create_mock_response('text_search', location, query)
        
        try:
            results = await self.google_places_api.text_search(
                query=query,
                location=location,
                radius=radius
            )
            
            formatted_results = self._format_places_for_pam(results)
            
            return self._create_success_response({
                'places': formatted_results,
                'search_params': {
                    'query': query,
                    'location': location,
                    'radius': radius
                },
                'count': len(formatted_results),
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            self.logger.error(f"❌ Text search failed: {e}")
            return self._create_error_response(f"Search failed: {str(e)}")
    
    async def _place_details(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get detailed information for a specific place"""
        
        place_id = parameters.get('place_id')
        if not place_id:
            return self._create_error_response("place_id parameter is required")
        
        if not self.initialized or not self.google_places_api.client:
            return self._create_mock_response('place_details', None, place_id)
        
        try:
            details = await self.google_places_api._get_place_details(place_id)
            
            if not details:
                return self._create_error_response(f"No details found for place_id: {place_id}")
            
            return self._create_success_response({
                'place_details': details,
                'place_id': place_id,
                'timestamp': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            self.logger.error(f"❌ Place details failed: {e}")
            return self._create_error_response(f"Failed to get place details: {str(e)}")
    
    async def _resolve_location(self, location_input: Any) -> Optional[Tuple[float, float]]:
        """Resolve location input to latitude, longitude coordinates"""
        
        if not location_input:
            return None
        
        # If it's already coordinates
        if isinstance(location_input, (list, tuple)) and len(location_input) == 2:
            try:
                lat, lon = float(location_input[0]), float(location_input[1])
                if -90 <= lat <= 90 and -180 <= lon <= 180:
                    return (lat, lon)
            except (ValueError, TypeError):
                pass
        
        # If it's a dictionary with lat/lon
        if isinstance(location_input, dict):
            lat = location_input.get('latitude') or location_input.get('lat')
            lon = location_input.get('longitude') or location_input.get('lon')
            
            if lat is not None and lon is not None:
                try:
                    lat, lon = float(lat), float(lon)
                    if -90 <= lat <= 90 and -180 <= lon <= 180:
                        return (lat, lon)
                except (ValueError, TypeError):
                    pass
        
        # If it's an address string, we could geocode it here
        # For now, return None - could be enhanced with Google Geocoding API
        if isinstance(location_input, str):
            self.logger.warning(f"⚠️ Address geocoding not implemented: {location_input}")
            return None
        
        return None
    
    def _format_places_for_pam(self, places: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format Google Places results for PAM consumption"""
        
        formatted_places = []
        
        for place in places:
            try:
                formatted_place = {
                    'name': place.get('name', 'Unknown'),
                    'rating': place.get('rating', 0),
                    'price_level': self._format_price_level(place.get('price_level')),
                    'address': place.get('vicinity') or place.get('formatted_address', ''),
                    'phone': place.get('formatted_phone_number', ''),
                    'website': place.get('website', ''),
                    'types': place.get('types', []),
                    'location': {
                        'latitude': place.get('latitude'),
                        'longitude': place.get('longitude')
                    },
                    'distance_km': place.get('distance_km', 0),
                    'is_open': self._format_opening_hours(place.get('opening_hours', {})),
                    'user_ratings_total': place.get('user_ratings_total', 0),
                    'place_id': place.get('place_id', ''),
                    'source': 'google_places'
                }
                
                # Add reviews if available
                if place.get('reviews'):
                    formatted_place['recent_reviews'] = [
                        {
                            'rating': review.get('rating', 0),
                            'text': review.get('text', '')[:200] + '...' if len(review.get('text', '')) > 200 else review.get('text', ''),
                            'author': review.get('author_name', 'Anonymous')
                        }
                        for review in place.get('reviews', [])[:2]  # First 2 reviews
                    ]
                
                formatted_places.append(formatted_place)
                
            except Exception as e:
                self.logger.warning(f"⚠️ Failed to format place: {e}")
                continue
        
        return formatted_places
    
    def _format_price_level(self, price_level: Optional[int]) -> str:
        """Convert Google's price level to readable format"""
        if price_level is None:
            return "Unknown"
        
        price_map = {
            1: "Inexpensive ($)",
            2: "Moderate ($$)",
            3: "Expensive ($$$)",
            4: "Very expensive ($$$$)"
        }
        
        return price_map.get(price_level, "Unknown")
    
    def _format_opening_hours(self, opening_hours: Dict[str, Any]) -> Optional[bool]:
        """Extract if place is currently open"""
        if isinstance(opening_hours, dict):
            return opening_hours.get('open_now')
        return None
    
    def _create_mock_response(self, action: str, location: Optional[Tuple[float, float]], search_term: str) -> Dict[str, Any]:
        """Create mock response when Google Places API is not available"""
        
        mock_places = [
            {
                'name': f'Sample {search_term.title()} 1',
                'rating': 4.2,
                'price_level': 'Moderate ($$)',
                'address': '123 Main St, Sample City',
                'phone': '+1-555-0123',
                'website': 'https://example.com',
                'types': ['restaurant', 'food', 'establishment'],
                'location': {
                    'latitude': location[0] + 0.001 if location else 40.7128,
                    'longitude': location[1] + 0.001 if location else -74.0060
                },
                'distance_km': 0.5,
                'is_open': True,
                'user_ratings_total': 127,
                'place_id': 'mock_place_id_1',
                'source': 'google_places_mock'
            },
            {
                'name': f'Popular {search_term.title()} 2',
                'rating': 4.5,
                'price_level': 'Expensive ($$$)',
                'address': '456 Oak Ave, Sample City',
                'phone': '+1-555-0456',
                'website': 'https://example2.com',
                'types': ['restaurant', 'food', 'establishment'],
                'location': {
                    'latitude': location[0] - 0.002 if location else 40.7100,
                    'longitude': location[1] + 0.002 if location else -74.0080
                },
                'distance_km': 1.2,
                'is_open': True,
                'user_ratings_total': 289,
                'place_id': 'mock_place_id_2',
                'source': 'google_places_mock'
            }
        ]
        
        return self._create_success_response({
            'places': mock_places,
            'search_params': {
                'location': location,
                'search_term': search_term,
                'action': action
            },
            'count': len(mock_places),
            'timestamp': datetime.utcnow().isoformat(),
            'note': 'Mock data - Google Places API not configured'
        })
    
    async def close(self):
        """Clean up resources"""
        if self.google_places_api:
            await self.google_places_api.close()

# Create global instance
google_places_tool = GooglePlacesTool()