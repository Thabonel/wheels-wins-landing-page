"""
API Integration Service
Provides structured access to third-party APIs for real-time local data
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import json

import aiohttp

# Optional imports with fallbacks
try:
    import googlemaps
    GOOGLEMAPS_AVAILABLE = True
except ImportError:
    googlemaps = None
    GOOGLEMAPS_AVAILABLE = False

try:
    from yelpapi import YelpAPI
    YELP_AVAILABLE = True
except ImportError:
    YelpAPI = None
    YELP_AVAILABLE = False

from app.core.config import get_settings
from app.services.knowledge.vector_store import VectorKnowledgeBase
from app.services.knowledge.document_processor import DocumentProcessor

logger = logging.getLogger(__name__)
settings = get_settings()

class RateLimitedAPI:
    """Base class for rate-limited API access"""
    
    def __init__(self, rate_limit_per_minute: int = 60):
        self.rate_limit = rate_limit_per_minute
        self.request_times = []
    
    async def _wait_for_rate_limit(self):
        """Wait if necessary to respect rate limits"""
        now = datetime.utcnow()
        
        # Remove requests older than 1 minute
        self.request_times = [
            req_time for req_time in self.request_times 
            if now - req_time < timedelta(minutes=1)
        ]
        
        # If we're at the limit, wait
        if len(self.request_times) >= self.rate_limit:
            sleep_time = 60 - (now - self.request_times[0]).total_seconds()
            if sleep_time > 0:
                logger.info(f"⏱️ Rate limit reached, waiting {sleep_time:.1f}s")
                await asyncio.sleep(sleep_time)
        
        self.request_times.append(now)

class GooglePlacesAPI(RateLimitedAPI):
    """Google Places API integration for comprehensive local business data"""
    
    def __init__(self):
        super().__init__(rate_limit_per_minute=100)  # Adjust based on your quota
        
        self.api_key = getattr(settings, 'GOOGLE_PLACES_API_KEY', None)
        if not self.api_key:
            logger.warning("⚠️ Google Places API key not configured")
            self.client = None
        elif not GOOGLEMAPS_AVAILABLE:
            logger.warning("⚠️ googlemaps library not available")
            self.client = None
        else:
            try:
                self.client = googlemaps.Client(key=self.api_key)
                logger.info("✅ Google Places API client initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Google Places client: {e}")
                self.client = None
        
        self.session = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get aiohttp session for direct API calls"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def close(self):
        """Close the session"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def nearby_search(
        self, 
        location: Tuple[float, float], 
        place_type: str = "restaurant",
        radius: int = 5000,
        keyword: Optional[str] = None,
        min_rating: float = 3.0
    ) -> List[Dict[str, Any]]:
        """Search for nearby places using Google Places API"""
        
        if not self.client:
            logger.error("❌ Google Places API client not available")
            return []
        
        await self._wait_for_rate_limit()
        
        try:
            lat, lon = location
            
            # Prepare search parameters
            search_params = {
                'location': (lat, lon),
                'radius': radius,
                'type': place_type,
                'language': 'en'
            }
            
            if keyword:
                search_params['keyword'] = keyword
            
            # Execute search
            logger.info(f"🔍 Searching Google Places for {place_type} near ({lat:.4f}, {lon:.4f})")
            
            results = self.client.places_nearby(**search_params)
            
            # Process results
            processed_places = []
            
            for place in results.get('results', []):
                try:
                    # Filter by rating if specified
                    rating = place.get('rating', 0)
                    if rating < min_rating:
                        continue
                    
                    # Get detailed place information
                    place_details = await self._get_place_details(place['place_id'])
                    
                    processed_place = {
                        'place_id': place['place_id'],
                        'name': place.get('name', ''),
                        'rating': rating,
                        'user_ratings_total': place.get('user_ratings_total', 0),
                        'price_level': place.get('price_level'),
                        'types': place.get('types', []),
                        'vicinity': place.get('vicinity', ''),
                        'geometry': place.get('geometry', {}),
                        'latitude': place['geometry']['location']['lat'],
                        'longitude': place['geometry']['location']['lng'],
                        'opening_hours': place.get('opening_hours', {}),
                        'photos': [photo.get('photo_reference') for photo in place.get('photos', [])],
                        'source': 'google_places',
                        'search_location': location,
                        'distance_km': self._calculate_distance(
                            lat, lon,
                            place['geometry']['location']['lat'],
                            place['geometry']['location']['lng']
                        )
                    }
                    
                    # Add detailed information if available
                    if place_details:
                        processed_place.update({
                            'formatted_address': place_details.get('formatted_address', ''),
                            'formatted_phone_number': place_details.get('formatted_phone_number', ''),
                            'website': place_details.get('website', ''),
                            'reviews': place_details.get('reviews', [])[:3],  # First 3 reviews
                            'opening_hours_detailed': place_details.get('opening_hours', {})
                        })
                    
                    processed_places.append(processed_place)
                    
                except Exception as e:
                    logger.warning(f"⚠️ Failed to process place {place.get('name', 'unknown')}: {e}")
                    continue
            
            logger.info(f"✅ Found {len(processed_places)} places from Google Places")
            return processed_places
            
        except Exception as e:
            logger.error(f"❌ Google Places API error: {e}")
            return []
    
    async def _get_place_details(self, place_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information for a specific place"""
        try:
            await self._wait_for_rate_limit()
            
            details = self.client.place(
                place_id=place_id,
                fields=[
                    'formatted_address', 'formatted_phone_number', 'website',
                    'opening_hours', 'reviews', 'photos', 'url'
                ]
            )
            
            return details.get('result', {})
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to get place details for {place_id}: {e}")
            return None
    
    async def text_search(
        self, 
        query: str, 
        location: Tuple[float, float],
        radius: int = 10000
    ) -> List[Dict[str, Any]]:
        """Search places using text query"""
        
        if not self.client:
            return []
        
        await self._wait_for_rate_limit()
        
        try:
            lat, lon = location
            
            results = self.client.places(
                query=query,
                location=(lat, lon),
                radius=radius,
                language='en'
            )
            
            processed_places = []
            
            for place in results.get('results', []):
                processed_place = {
                    'place_id': place['place_id'],
                    'name': place.get('name', ''),
                    'rating': place.get('rating', 0),
                    'formatted_address': place.get('formatted_address', ''),
                    'types': place.get('types', []),
                    'latitude': place['geometry']['location']['lat'],
                    'longitude': place['geometry']['location']['lng'],
                    'source': 'google_places_text_search',
                    'search_query': query,
                    'search_location': location
                }
                
                processed_places.append(processed_place)
            
            return processed_places
            
        except Exception as e:
            logger.error(f"❌ Google Places text search error: {e}")
            return []
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in kilometers"""
        from math import radians, cos, sin, asin, sqrt
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371  # Earth radius in kilometers
        
        return round(c * r, 2)

class YelpFusionAPI(RateLimitedAPI):
    """Yelp Fusion API integration for restaurant and business reviews"""
    
    def __init__(self):
        super().__init__(rate_limit_per_minute=5000)  # Yelp has generous limits
        
        self.api_key = getattr(settings, 'YELP_API_KEY', None)
        if not self.api_key:
            logger.warning("⚠️ Yelp API key not configured")
            self.client = None
        elif not YELP_AVAILABLE:
            logger.warning("⚠️ yelpapi library not available")
            self.client = None
        else:
            try:
                self.client = YelpAPI(self.api_key)
                logger.info("✅ Yelp Fusion API client initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Yelp client: {e}")
                self.client = None
    
    async def business_search(
        self, 
        location: Tuple[float, float],
        preferences: Dict[str, Any],
        radius: int = 5000,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Search for businesses based on user preferences"""
        
        if not self.client:
            logger.error("❌ Yelp API client not available")
            return []
        
        await self._wait_for_rate_limit()
        
        try:
            lat, lon = location
            
            # Build search parameters from preferences
            search_params = {
                'latitude': lat,
                'longitude': lon,
                'radius': min(radius, 40000),  # Yelp max radius
                'limit': min(limit, 50),  # Yelp max limit
                'sort_by': 'rating'
            }
            
            # Add category filter if specified
            if 'cuisine' in preferences:
                search_params['categories'] = preferences['cuisine']
            elif 'business_type' in preferences:
                search_params['categories'] = preferences['business_type']
            
            # Add price filter
            if 'price_level' in preferences:
                price_level = preferences['price_level']
                if isinstance(price_level, int) and 1 <= price_level <= 4:
                    search_params['price'] = ','.join([str(i) for i in range(1, price_level + 1)])
            
            # Execute search
            logger.info(f"🔍 Searching Yelp for businesses near ({lat:.4f}, {lon:.4f})")
            
            response = self.client.search_query(**search_params)
            
            # Process results
            processed_businesses = []
            
            for business in response.get('businesses', []):
                try:
                    processed_business = {
                        'yelp_id': business['id'],
                        'name': business.get('name', ''),
                        'rating': business.get('rating', 0),
                        'review_count': business.get('review_count', 0),
                        'price': business.get('price', ''),
                        'categories': [cat['title'] for cat in business.get('categories', [])],
                        'address': business.get('location', {}).get('display_address', []),
                        'latitude': business['coordinates']['latitude'],
                        'longitude': business['coordinates']['longitude'],
                        'phone': business.get('phone', ''),
                        'url': business.get('url', ''),
                        'image_url': business.get('image_url', ''),
                        'is_closed': business.get('is_closed', False),
                        'distance': business.get('distance', 0) / 1000,  # Convert to km
                        'source': 'yelp_fusion',
                        'search_location': location
                    }
                    
                    processed_businesses.append(processed_business)
                    
                except Exception as e:
                    logger.warning(f"⚠️ Failed to process Yelp business {business.get('name', 'unknown')}: {e}")
                    continue
            
            logger.info(f"✅ Found {len(processed_businesses)} businesses from Yelp")
            return processed_businesses
            
        except Exception as e:
            logger.error(f"❌ Yelp API error: {e}")
            return []
    
    async def get_business_details(self, business_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information for a specific business"""
        
        if not self.client:
            return None
        
        await self._wait_for_rate_limit()
        
        try:
            business = self.client.business_query(id=business_id)
            
            return {
                'yelp_id': business['id'],
                'name': business.get('name', ''),
                'rating': business.get('rating', 0),
                'review_count': business.get('review_count', 0),
                'price': business.get('price', ''),
                'categories': [cat['title'] for cat in business.get('categories', [])],
                'hours': business.get('hours', []),
                'photos': business.get('photos', []),
                'phone': business.get('phone', ''),
                'website': business.get('url', ''),
                'is_claimed': business.get('is_claimed', False),
                'special_hours': business.get('special_hours', []),
                'source': 'yelp_fusion_details'
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get Yelp business details for {business_id}: {e}")
            return None

class WeatherAPI(RateLimitedAPI):
    """Weather API integration for location-based weather data"""
    
    def __init__(self):
        super().__init__(rate_limit_per_minute=60)
        
        self.api_key = getattr(settings, 'OPENWEATHER_API_KEY', None)
        self.base_url = "https://api.openweathermap.org/data/2.5"
        self.session = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get aiohttp session"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def close(self):
        """Close the session"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def get_current_weather(self, location: Tuple[float, float]) -> Optional[Dict[str, Any]]:
        """Get current weather for location"""
        
        if not self.api_key:
            logger.warning("⚠️ OpenWeather API key not configured")
            return None
        
        await self._wait_for_rate_limit()
        
        try:
            lat, lon = location
            session = await self._get_session()
            
            url = f"{self.base_url}/weather"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric'
            }
            
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    logger.error(f"❌ Weather API error: {response.status}")
                    return None
                
                data = await response.json()
                
                return {
                    'temperature': data['main']['temp'],
                    'feels_like': data['main']['feels_like'],
                    'humidity': data['main']['humidity'],
                    'pressure': data['main']['pressure'],
                    'description': data['weather'][0]['description'],
                    'wind_speed': data['wind']['speed'],
                    'wind_direction': data['wind'].get('deg', 0),
                    'visibility': data.get('visibility', 0) / 1000,  # Convert to km
                    'location_name': data['name'],
                    'country': data['sys']['country'],
                    'source': 'openweather',
                    'latitude': lat,
                    'longitude': lon
                }
                
        except Exception as e:
            logger.error(f"❌ Weather API error: {e}")
            return None

class APIIntegrationService:
    """Main service coordinating all API integrations"""
    
    def __init__(self, vector_store: VectorKnowledgeBase):
        self.vector_store = vector_store
        self.document_processor = DocumentProcessor(vector_store)
        
        # Initialize API clients
        self.google_places = GooglePlacesAPI()
        self.yelp_fusion = YelpFusionAPI()
        self.weather_api = WeatherAPI()
        
        self.apis = {
            'google_places': self.google_places,
            'yelp_fusion': self.yelp_fusion,
            'weather': self.weather_api
        }
    
    async def close(self):
        """Close all API clients"""
        for api in self.apis.values():
            if hasattr(api, 'close'):
                await api.close()
        
        await self.document_processor.close()
    
    async def get_local_recommendations(
        self, 
        user_location: Tuple[float, float], 
        preferences: Dict[str, Any],
        radius_km: float = 5.0
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Get comprehensive local recommendations from all APIs"""
        
        radius_meters = int(radius_km * 1000)
        
        logger.info(f"🌍 Getting local recommendations for ({user_location[0]:.4f}, {user_location[1]:.4f})")
        
        # Prepare API tasks
        tasks = {
            'google_places_restaurants': self.google_places.nearby_search(
                user_location, 'restaurant', radius_meters
            ),
            'google_places_attractions': self.google_places.nearby_search(
                user_location, 'tourist_attraction', radius_meters
            ),
            'yelp_businesses': self.yelp_fusion.business_search(
                user_location, preferences, radius_meters
            ),
            'current_weather': self.weather_api.get_current_weather(user_location)
        }
        
        # Execute all API calls concurrently
        results = {}
        for name, task in tasks.items():
            try:
                result = await task
                results[name] = result if result else []
            except Exception as e:
                logger.error(f"❌ API task {name} failed: {e}")
                results[name] = []
        
        # Store results in vector database
        await self._store_api_results(results, user_location)
        
        return results
    
    async def _store_api_results(
        self, 
        results: Dict[str, Any], 
        user_location: Tuple[float, float]
    ):
        """Store API results in vector database for future retrieval"""
        
        for api_name, data in results.items():
            if not data:
                continue
            
            try:
                if api_name == 'current_weather':
                    # Store weather data
                    await self.document_processor.process_api_data(
                        data, 
                        'weather_api',
                        ['description', 'location_name'],
                        'real_time_data'
                    )
                else:
                    # Store business/location data
                    if isinstance(data, list):
                        for item in data:
                            await self.document_processor.process_location_data(item, user_location)
                    
            except Exception as e:
                logger.error(f"❌ Failed to store {api_name} results: {e}")
                continue
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of all API integrations"""
        
        health_status = {
            'overall_status': 'healthy',
            'apis': {}
        }
        
        # Check each API
        for api_name, api_client in self.apis.items():
            try:
                if api_name == 'google_places':
                    status = 'healthy' if api_client.client else 'unavailable'
                elif api_name == 'yelp_fusion':
                    status = 'healthy' if api_client.client else 'unavailable'
                elif api_name == 'weather':
                    status = 'healthy' if api_client.api_key else 'unavailable'
                else:
                    status = 'unknown'
                
                health_status['apis'][api_name] = {
                    'status': status,
                    'configured': status != 'unavailable'
                }
                
            except Exception as e:
                health_status['apis'][api_name] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
        
        # Determine overall status
        api_statuses = [api['status'] for api in health_status['apis'].values()]
        if 'unhealthy' in api_statuses:
            health_status['overall_status'] = 'degraded'
        elif all(status == 'unavailable' for status in api_statuses):
            health_status['overall_status'] = 'unhealthy'
        
        return health_status