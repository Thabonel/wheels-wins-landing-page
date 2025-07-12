"""
Enhanced Scraping Service
Provides intelligent, location-aware web scraping for real-time local information
"""

import asyncio
import logging
import json
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
import hashlib
from urllib.parse import urljoin, urlparse

import aiohttp
from bs4 import BeautifulSoup
import time

from app.services.knowledge.vector_store import VectorKnowledgeBase
from app.services.knowledge.document_processor import DocumentProcessor
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

@dataclass
class ScrapingTarget:
    """Defines a target for scraping operations"""
    name: str
    url: str
    selector: str
    data_type: str
    refresh_interval: int  # seconds
    location_dependent: bool = False
    rate_limit_delay: float = 1.0
    headers: Optional[Dict[str, str]] = None
    params: Optional[Dict[str, Any]] = None
    content_fields: Optional[List[str]] = None
    priority: int = 1  # 1=high, 2=medium, 3=low

@dataclass
class ScrapingResult:
    """Result of a scraping operation"""
    target_name: str
    success: bool
    data: List[Dict[str, Any]]
    error: Optional[str] = None
    scraped_at: Optional[datetime] = None
    processing_time: Optional[float] = None

class LocationCalculator:
    """Handles geographic calculations for location-based scraping"""
    
    @staticmethod
    def calculate_search_radius(user_location: Tuple[float, float], travel_radius_km: float = 50) -> Dict[str, float]:
        """Calculate search boundaries based on user location and travel radius"""
        lat, lon = user_location
        
        # Rough conversion: 1 degree ≈ 111 km
        lat_delta = travel_radius_km / 111.0
        lon_delta = travel_radius_km / (111.0 * abs(lat))  # Adjust for latitude
        
        return {
            "min_lat": lat - lat_delta,
            "max_lat": lat + lat_delta,
            "min_lon": lon - lon_delta,
            "max_lon": lon + lon_delta,
            "center_lat": lat,
            "center_lon": lon,
            "radius_km": travel_radius_km
        }
    
    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in kilometers"""
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371  # Radius of earth in kilometers
        
        return c * r

class RateLimiter:
    """Simple rate limiter for scraping operations"""
    
    def __init__(self):
        self.last_request_times = {}
    
    async def wait_if_needed(self, domain: str, min_delay: float):
        """Wait if necessary to respect rate limits"""
        now = time.time()
        
        if domain in self.last_request_times:
            time_since_last = now - self.last_request_times[domain]
            if time_since_last < min_delay:
                wait_time = min_delay - time_since_last
                await asyncio.sleep(wait_time)
        
        self.last_request_times[domain] = time.time()

class EnhancedScrapingService:
    """Main enhanced scraping service with location awareness"""
    
    def __init__(self, vector_store: VectorKnowledgeBase):
        self.vector_store = vector_store
        self.document_processor = DocumentProcessor(vector_store)
        self.rate_limiter = RateLimiter()
        self.location_calculator = LocationCalculator()
        self.session = None
        
        # Define scraping targets
        self.scraping_targets = self._initialize_scraping_targets()
        
        # Cache for recent results
        self.cache = {}
        self.cache_ttl = 3600  # 1 hour default
    
    def _initialize_scraping_targets(self) -> Dict[str, List[ScrapingTarget]]:
        """Initialize predefined scraping targets"""
        return {
            'local_businesses': [
                ScrapingTarget(
                    name="yelp_restaurants",
                    url="https://www.yelp.com/search",
                    selector=".biz-listing-large",
                    data_type="restaurant",
                    refresh_interval=3600,
                    location_dependent=True,
                    rate_limit_delay=2.0,
                    content_fields=["name", "rating", "review_count", "price", "cuisine", "address"]
                ),
                ScrapingTarget(
                    name="google_businesses",
                    url="https://www.google.com/search",
                    selector=".business-result",
                    data_type="business",
                    refresh_interval=1800,
                    location_dependent=True,
                    rate_limit_delay=1.5,
                    content_fields=["name", "rating", "address", "phone", "hours"]
                )
            ],
            'travel_info': [
                ScrapingTarget(
                    name="tripadvisor_attractions",
                    url="https://www.tripadvisor.com/Attractions",
                    selector=".attraction-review-header",
                    data_type="attraction",
                    refresh_interval=86400,
                    location_dependent=True,
                    rate_limit_delay=3.0,
                    content_fields=["name", "rating", "review_count", "description", "address"]
                ),
                ScrapingTarget(
                    name="campgrounds_info",
                    url="https://www.recreation.gov/camping",
                    selector=".campground-result",
                    data_type="campground",
                    refresh_interval=43200,
                    location_dependent=True,
                    rate_limit_delay=2.0,
                    content_fields=["name", "description", "amenities", "availability", "price"]
                )
            ],
            'real_time_data': [
                ScrapingTarget(
                    name="weather_local",
                    url="https://api.openweathermap.org/data/2.5/weather",
                    selector="",
                    data_type="weather",
                    refresh_interval=900,  # 15 minutes
                    location_dependent=True,
                    rate_limit_delay=1.0,
                    content_fields=["description", "temperature", "humidity", "wind_speed"]
                ),
                ScrapingTarget(
                    name="traffic_conditions",
                    url="https://maps.googleapis.com/maps/api/directions/json",
                    selector="",
                    data_type="traffic",
                    refresh_interval=300,  # 5 minutes
                    location_dependent=True,
                    rate_limit_delay=0.5,
                    content_fields=["duration", "distance", "traffic_conditions"]
                )
            ],
            'general_knowledge': [
                ScrapingTarget(
                    name="wikipedia_travel",
                    url="https://en.wikipedia.org/wiki/",
                    selector=".mw-parser-output",
                    data_type="encyclopedia",
                    refresh_interval=604800,  # 1 week
                    location_dependent=False,
                    rate_limit_delay=1.0,
                    content_fields=["content"]
                )
            ]
        }
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session with proper headers"""
        if not self.session:
            headers = {
                'User-Agent': 'Mozilla/5.0 (compatible; PAM-TravelBot/1.0; +https://wheelsandwins.com/bot)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
            
            timeout = aiohttp.ClientTimeout(total=30, connect=10)
            connector = aiohttp.TCPConnector(limit=10, limit_per_host=3)
            
            self.session = aiohttp.ClientSession(
                headers=headers,
                timeout=timeout,
                connector=connector
            )
        
        return self.session
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None
        
        await self.document_processor.close()
    
    async def scrape_location_based_data(
        self, 
        user_location: Tuple[float, float], 
        radius_km: float = 10.0,
        categories: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Scrape data relevant to user's current location"""
        
        lat, lon = user_location
        search_bounds = self.location_calculator.calculate_search_radius(user_location, radius_km)
        
        logger.info(f"🌍 Scraping location data for ({lat:.4f}, {lon:.4f}) within {radius_km}km")
        
        # Determine which categories to scrape
        target_categories = categories or ['local_businesses', 'travel_info', 'real_time_data']
        
        # Collect scraping tasks
        scraping_tasks = []
        
        for category in target_categories:
            if category in self.scraping_targets:
                for target in self.scraping_targets[category]:
                    if target.location_dependent:
                        task = self._scrape_target_with_location(target, user_location, search_bounds)
                        scraping_tasks.append(task)
        
        # Execute scraping tasks with concurrency control
        semaphore = asyncio.Semaphore(3)  # Limit concurrent requests
        
        async def limited_scrape(task):
            async with semaphore:
                return await task
        
        limited_tasks = [limited_scrape(task) for task in scraping_tasks]
        results = await asyncio.gather(*limited_tasks, return_exceptions=True)
        
        # Process results
        processed_results = self._process_scraping_results(results, user_location)
        
        logger.info(f"✅ Completed location-based scraping: {len(processed_results)} results")
        return processed_results
    
    async def _scrape_target_with_location(
        self, 
        target: ScrapingTarget, 
        user_location: Tuple[float, float],
        search_bounds: Dict[str, float]
    ) -> ScrapingResult:
        """Scrape a specific target with location context"""
        
        start_time = time.time()
        lat, lon = user_location
        
        try:
            # Check cache first
            cache_key = f"{target.name}_{lat:.3f}_{lon:.3f}"
            if cache_key in self.cache:
                cache_entry = self.cache[cache_key]
                if datetime.utcnow() - cache_entry['timestamp'] < timedelta(seconds=target.refresh_interval):
                    logger.info(f"💾 Using cached data for {target.name}")
                    return cache_entry['result']
            
            # Apply rate limiting
            domain = urlparse(target.url).netloc
            await self.rate_limiter.wait_if_needed(domain, target.rate_limit_delay)
            
            # Build location-aware URL
            location_url = self._build_location_url(target, user_location, search_bounds)
            
            session = await self._get_session()
            
            # Add target-specific headers
            headers = target.headers or {}
            
            async with session.get(location_url, headers=headers, params=target.params) as response:
                if response.status != 200:
                    raise Exception(f"HTTP {response.status}: {await response.text()}")
                
                content = await response.text()
            
            # Parse content based on target type
            if target.selector:
                # HTML scraping
                data = await self._parse_html_content(content, target, user_location)
            else:
                # JSON API response
                json_data = json.loads(content)
                data = await self._parse_json_content(json_data, target, user_location)
            
            processing_time = time.time() - start_time
            
            result = ScrapingResult(
                target_name=target.name,
                success=True,
                data=data,
                scraped_at=datetime.utcnow(),
                processing_time=processing_time
            )
            
            # Cache the result
            self.cache[cache_key] = {
                'result': result,
                'timestamp': datetime.utcnow()
            }
            
            # Store in vector database
            if data:
                await self._store_scraped_data(data, target, user_location)
            
            logger.info(f"✅ Scraped {target.name}: {len(data)} items in {processing_time:.2f}s")
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            
            logger.error(f"❌ Failed to scrape {target.name}: {e}")
            return ScrapingResult(
                target_name=target.name,
                success=False,
                data=[],
                error=str(e),
                scraped_at=datetime.utcnow(),
                processing_time=processing_time
            )
    
    def _build_location_url(
        self, 
        target: ScrapingTarget, 
        user_location: Tuple[float, float],
        search_bounds: Dict[str, float]
    ) -> str:
        """Build location-aware URL for scraping"""
        
        lat, lon = user_location
        base_url = target.url
        
        # Handle different URL patterns
        if "yelp.com" in base_url:
            # Yelp location search
            return f"{base_url}?find_desc=restaurants&find_loc={lat},{lon}"
            
        elif "tripadvisor.com" in base_url:
            # TripAdvisor location search  
            return f"{base_url}?geo={lat},{lon}"
            
        elif "openweathermap.org" in base_url:
            # Weather API
            api_key = getattr(settings, 'OPENWEATHER_API_KEY', 'demo_key')
            return f"{base_url}?lat={lat}&lon={lon}&appid={api_key}&units=metric"
            
        elif "googleapis.com" in base_url:
            # Google Maps API
            api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', 'demo_key')
            return f"{base_url}?origin={lat},{lon}&destination={lat},{lon}&key={api_key}"
            
        else:
            # Generic location parameter
            separator = "&" if "?" in base_url else "?"
            return f"{base_url}{separator}lat={lat}&lon={lon}"
    
    async def _parse_html_content(
        self, 
        html_content: str, 
        target: ScrapingTarget,
        user_location: Tuple[float, float]
    ) -> List[Dict[str, Any]]:
        """Parse HTML content using BeautifulSoup"""
        
        soup = BeautifulSoup(html_content, 'html.parser')
        elements = soup.select(target.selector)
        
        parsed_data = []
        
        for element in elements[:20]:  # Limit to first 20 results
            try:
                item_data = {
                    "name": self._extract_text(element, [".business-name", "h3", "h2", ".name"]),
                    "description": self._extract_text(element, [".description", ".snippet", ".review-snippet"]),
                    "rating": self._extract_text(element, [".rating", ".stars", ".review-rating"]),
                    "address": self._extract_text(element, [".address", ".location", ".venue-address"]),
                    "phone": self._extract_text(element, [".phone", ".telephone", ".contact-phone"]),
                    "website": self._extract_href(element, ["a"]),
                    "image_url": self._extract_src(element, ["img"]),
                    "scraped_from": target.name,
                    "user_location": user_location
                }
                
                # Remove empty values
                item_data = {k: v for k, v in item_data.items() if v}
                
                if item_data.get("name"):  # Only add if we have a name
                    parsed_data.append(item_data)
                    
            except Exception as e:
                logger.warning(f"⚠️ Failed to parse element in {target.name}: {e}")
                continue
        
        return parsed_data
    
    async def _parse_json_content(
        self, 
        json_data: Dict[str, Any], 
        target: ScrapingTarget,
        user_location: Tuple[float, float]
    ) -> List[Dict[str, Any]]:
        """Parse JSON API response"""
        
        parsed_data = []
        
        # Handle different API response formats
        if target.name == "weather_local":
            weather_data = {
                "description": json_data.get("weather", [{}])[0].get("description", ""),
                "temperature": json_data.get("main", {}).get("temp", ""),
                "humidity": json_data.get("main", {}).get("humidity", ""),
                "wind_speed": json_data.get("wind", {}).get("speed", ""),
                "location": json_data.get("name", ""),
                "scraped_from": target.name,
                "user_location": user_location
            }
            parsed_data.append(weather_data)
            
        elif "results" in json_data:
            # Generic API with results array
            for item in json_data["results"][:10]:
                parsed_data.append({
                    **item,
                    "scraped_from": target.name,
                    "user_location": user_location
                })
        
        return parsed_data
    
    def _extract_text(self, element, selectors: List[str]) -> str:
        """Extract text from element using multiple selector options"""
        for selector in selectors:
            found = element.select_one(selector)
            if found:
                return found.get_text(strip=True)
        return ""
    
    def _extract_href(self, element, selectors: List[str]) -> str:
        """Extract href from element"""
        for selector in selectors:
            found = element.select_one(selector)
            if found and found.get("href"):
                return found.get("href")
        return ""
    
    def _extract_src(self, element, selectors: List[str]) -> str:
        """Extract src from element"""
        for selector in selectors:
            found = element.select_one(selector)
            if found and found.get("src"):
                return found.get("src")
        return ""
    
    async def _store_scraped_data(
        self, 
        data: List[Dict[str, Any]], 
        target: ScrapingTarget,
        user_location: Tuple[float, float]
    ):
        """Store scraped data in vector database"""
        
        for item in data:
            try:
                # Process location data if available
                if target.data_type in ["restaurant", "business", "attraction", "campground"]:
                    await self.document_processor.process_location_data(item, user_location)
                else:
                    # Process as general API data
                    content_fields = target.content_fields or ["name", "description"]
                    await self.document_processor.process_api_data(
                        item, 
                        target.name, 
                        content_fields,
                        collection_name="local_businesses"
                    )
                    
            except Exception as e:
                logger.error(f"❌ Failed to store scraped item: {e}")
                continue
    
    def _process_scraping_results(
        self, 
        results: List[Any], 
        user_location: Tuple[float, float]
    ) -> Dict[str, Any]:
        """Process and organize scraping results"""
        
        processed = {
            "user_location": user_location,
            "scraped_at": datetime.utcnow().isoformat(),
            "results": {},
            "summary": {
                "total_targets": len(results),
                "successful": 0,
                "failed": 0,
                "total_items": 0
            }
        }
        
        for result in results:
            if isinstance(result, Exception):
                processed["summary"]["failed"] += 1
                continue
            
            if isinstance(result, ScrapingResult):
                if result.success:
                    processed["summary"]["successful"] += 1
                    processed["summary"]["total_items"] += len(result.data)
                    processed["results"][result.target_name] = {
                        "data": result.data,
                        "scraped_at": result.scraped_at.isoformat() if result.scraped_at else None,
                        "processing_time": result.processing_time,
                        "item_count": len(result.data)
                    }
                else:
                    processed["summary"]["failed"] += 1
                    processed["results"][result.target_name] = {
                        "error": result.error,
                        "scraped_at": result.scraped_at.isoformat() if result.scraped_at else None
                    }
        
        return processed
    
    async def get_cached_results(self, user_location: Tuple[float, float]) -> Optional[Dict[str, Any]]:
        """Get cached results for a location if available"""
        lat, lon = user_location
        
        # Look for cached results within small radius
        for cache_key, cache_entry in self.cache.items():
            if f"_{lat:.1f}_{lon:.1f}" in cache_key:
                if datetime.utcnow() - cache_entry['timestamp'] < timedelta(hours=1):
                    return cache_entry['result']
        
        return None
    
    async def health_check(self) -> Dict[str, Any]:
        """Check the health of the scraping service"""
        try:
            session = await self._get_session()
            
            # Test a simple request
            async with session.get("https://httpbin.org/status/200") as response:
                network_healthy = response.status == 200
            
            cache_size = len(self.cache)
            target_count = sum(len(targets) for targets in self.scraping_targets.values())
            
            return {
                "status": "healthy" if network_healthy else "degraded",
                "network_connectivity": network_healthy,
                "cache_size": cache_size,
                "configured_targets": target_count,
                "session_active": self.session is not None
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }