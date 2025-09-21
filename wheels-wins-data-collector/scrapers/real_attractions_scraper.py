"""
Real Attractions Scraper with Actual API Integrations
Collects tourist attractions, swimming spots, waterfalls, and points of interest
"""

import asyncio
import aiohttp
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
import os
from tenacity import retry, stop_after_attempt, wait_exponential
import overpy
from bs4 import BeautifulSoup
import re

# Import photo services
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.photo_scraper import add_photos_to_locations

logger = logging.getLogger(__name__)

class RealAttractionsScraperService:
    """Production attractions scraper with real API integrations"""

    def __init__(self):
        self.session = None
        self.overpass = overpy.Overpass()

        # API keys from environment
        self.api_keys = {
            'google_places': os.getenv('GOOGLE_PLACES_KEY'),
            'openweather': os.getenv('OPENWEATHER_API_KEY'),
            'foursquare': os.getenv('FOURSQUARE_API_KEY')
        }

        self.collected_count = 0
        self.target_per_source = 200

    def _extract_coordinates_safely(self, element, element_type: str) -> Optional[tuple]:
        """Safely extract coordinates from OSM element with null checking"""
        try:
            lat, lng = None, None

            if element_type == 'node':
                lat, lng = getattr(element, 'lat', None), getattr(element, 'lon', None)
            else:
                if hasattr(element, 'center_lat'):
                    lat, lng = getattr(element, 'center_lat', None), getattr(element, 'center_lon', None)
                else:
                    return None

            # Validate coordinates are not None
            if lat is None or lng is None:
                return None

            # Ensure coordinates are numeric and within valid ranges
            try:
                lat_float = float(lat)
                lng_float = float(lng)

                if not (-90 <= lat_float <= 90) or not (-180 <= lng_float <= 180):
                    return None

                return (lat_float, lng_float)

            except (ValueError, TypeError):
                return None

        except Exception:
            return None

    async def search_google_places(self, location: tuple, radius: int, place_type: str, country: str, region_name: str) -> List[Dict]:
        """Search Google Places API for attractions in a specific area"""
        try:
            if not self.api_keys.get('google_places'):
                return []

            lat, lng = location

            # Google Places Nearby Search API
            url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

            params = {
                'location': f"{lat},{lng}",
                'radius': min(radius, 50000),  # Max 50km for Google Places
                'type': place_type,
                'key': self.api_keys['google_places']
            }

            logger.debug(f"🔍 Searching Google Places: {region_name} - {place_type}")

            async with self.session.get(url, params=params) as response:
                if response.status != 200:
                    logger.error(f"Google Places API error: {response.status}")
                    return []

                data = await response.json()

                if data.get('status') != 'OK':
                    if data.get('status') == 'ZERO_RESULTS':
                        logger.debug(f"No {place_type} results in {region_name}")
                        return []
                    else:
                        logger.error(f"Google Places API status: {data.get('status')}")
                        return []

                places = data.get('results', [])
                attractions = []

                for place in places:
                    try:
                        attraction = await self._parse_google_place(place, country, place_type)
                        if attraction:
                            attractions.append(attraction)
                    except Exception as e:
                        logger.error(f"Error parsing Google Place: {e}")
                        continue

                logger.info(f"✅ Found {len(attractions)} {place_type} attractions in {region_name}")
                return attractions

        except Exception as e:
            logger.error(f"Error searching Google Places for {place_type} in {region_name}: {e}")
            return []

    async def _parse_google_place(self, place: Dict, country: str, place_type: str) -> Optional[Dict]:
        """Parse a Google Places result into our attraction format"""
        try:
            # Required fields
            if not place.get('place_id') or not place.get('geometry', {}).get('location'):
                return None

            location = place['geometry']['location']
            lat = location.get('lat')
            lng = location.get('lng')

            if lat is None or lng is None:
                return None

            # Build attraction data
            attraction = {
                'name': place.get('name', 'Unknown Attraction'),
                'data_type': 'attractions',
                'attraction_type': self._map_google_type_to_attraction_type(place_type, place.get('types', [])),
                'country': country,
                'latitude': float(lat),  # Ensure it's a regular float, not Decimal
                'longitude': float(lng),  # Ensure it's a regular float, not Decimal
                'description': self._build_description(place),
                'website': place.get('website'),
                'opening_hours': self._format_opening_hours(place.get('opening_hours')),
                'rating': place.get('rating'),
                'user_ratings_total': place.get('user_ratings_total'),
                'price_level': place.get('price_level'),
                'vicinity': place.get('vicinity'),
                'place_id': place.get('place_id'),
                'data_source': 'google_places',
                'source_id': f"google_place_{place.get('place_id')}",
                'collected_at': datetime.now().isoformat(),
                'quality_score': self._calculate_quality_score(place)
            }

            # Add photos if available
            if place.get('photos'):
                photo_reference = place['photos'][0].get('photo_reference')
                if photo_reference:
                    attraction['google_photo_reference'] = photo_reference

            return attraction

        except Exception as e:
            logger.error(f"Error parsing Google Place {place.get('name', 'unknown')}: {e}")
            return None

    def _map_google_type_to_attraction_type(self, primary_type: str, all_types: List[str]) -> str:
        """Map Google Places types to our attraction types"""
        type_mapping = {
            'tourist_attraction': 'attraction',
            'natural_feature': 'natural',
            'park': 'park',
            'museum': 'museum',
            'amusement_park': 'entertainment',
            'zoo': 'entertainment',
            'aquarium': 'entertainment',
            'art_gallery': 'cultural',
            'landmark': 'landmark'
        }

        # Check for more specific types in the full types list
        for gtype in all_types:
            if 'waterfall' in gtype.lower():
                return 'waterfall'
            elif 'beach' in gtype.lower() or 'swimming' in gtype.lower():
                return 'swimming_spot'
            elif 'viewpoint' in gtype.lower() or 'lookout' in gtype.lower():
                return 'viewpoint'
            elif 'historical' in gtype.lower() or 'heritage' in gtype.lower():
                return 'historical'

        return type_mapping.get(primary_type, 'attraction')

    def _build_description(self, place: Dict) -> str:
        """Build a description from Google Places data"""
        desc_parts = []

        if place.get('rating'):
            rating = place['rating']
            reviews = place.get('user_ratings_total', 0)
            desc_parts.append(f"Rated {rating}/5 stars ({reviews} reviews)")

        if place.get('price_level') is not None:
            price_symbols = ['Free', '$', '$$', '$$$', '$$$$']
            price_level = int(place['price_level'])
            if 0 <= price_level < len(price_symbols):
                desc_parts.append(f"Price level: {price_symbols[price_level]}")

        # Add place types as description
        types = place.get('types', [])
        relevant_types = [t.replace('_', ' ').title() for t in types[:3]
                         if t not in ['establishment', 'point_of_interest']]
        if relevant_types:
            desc_parts.append(f"Categories: {', '.join(relevant_types)}")

        return ' | '.join(desc_parts) if desc_parts else 'Popular attraction from Google Places'

    def _format_opening_hours(self, opening_hours: Dict) -> Optional[str]:
        """Format opening hours from Google Places format"""
        if not opening_hours or not opening_hours.get('weekday_text'):
            return None

        # Take first few days as example
        weekdays = opening_hours['weekday_text'][:3]
        return '; '.join(weekdays)

    def _calculate_quality_score(self, place: Dict) -> float:
        """Calculate quality score based on Google Places data"""
        score = 0.5  # Base score

        # Rating boost
        if place.get('rating'):
            rating = place['rating']
            score += (rating - 2.5) * 0.2  # Scale 1-5 rating to -0.3 to +0.5

        # Review count boost
        reviews = place.get('user_ratings_total', 0)
        if reviews > 100:
            score += 0.2
        elif reviews > 20:
            score += 0.1

        # Photos boost
        if place.get('photos'):
            score += 0.1

        # Website boost
        if place.get('website'):
            score += 0.1

        # Ensure score is between 0 and 1
        return max(0.0, min(1.0, score))

    async def __aenter__(self):
        timeout = aiohttp.ClientTimeout(total=60)
        self.session = aiohttp.ClientSession(
            timeout=timeout,
            headers={'User-Agent': 'WheelsWins-DataCollector/2.0'}
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def collect_all_countries(self, limit: int = 5000) -> List[Dict]:
        """Collect attractions from all sources up to limit"""
        logger.info(f"Starting real attractions data collection (target: {limit} attractions)")

        all_attractions = []

        async with self:
            # Use Google Places API as primary source, OSM methods as fallback
            try:
                # Primary collection via Google Places API
                google_places_attractions = await self.collect_google_places_attractions()
                all_attractions.extend(google_places_attractions)
                logger.info(f"Collected {len(google_places_attractions)} attractions from Google Places API")

                # If we haven't reached the limit, supplement with OSM data
                if len(all_attractions) < limit:
                    remaining_limit = limit - len(all_attractions)
                    logger.info(f"Supplementing with OSM data (need {remaining_limit} more)")

                    # Collect from OSM sources in parallel (as fallback/supplement)
                    osm_tasks = [
                        self.collect_waterfalls(),
                        self.collect_swimming_spots(),
                        self.collect_scenic_viewpoints(),
                        self.collect_historical_sites(),
                        self.collect_tourist_attractions()
                    ]

                    osm_results = await asyncio.gather(*osm_tasks, return_exceptions=True)

                    for result in osm_results:
                        if isinstance(result, list):
                            all_attractions.extend(result)
                        elif isinstance(result, Exception):
                            logger.error(f"Error in OSM collection task: {result}")

            except Exception as e:
                logger.error(f"Error in primary Google Places collection: {e}")
                logger.info("Falling back to OSM-only collection")

                # Fallback to OSM-only if Google Places fails
                osm_tasks = [
                    self.collect_osm_attractions(),
                    self.collect_waterfalls(),
                    self.collect_swimming_spots(),
                    self.collect_scenic_viewpoints(),
                    self.collect_historical_sites(),
                    self.collect_tourist_attractions()
                ]

                results = await asyncio.gather(*osm_tasks, return_exceptions=True)

                for result in results:
                    if isinstance(result, list):
                        all_attractions.extend(result)
                    elif isinstance(result, Exception):
                        logger.error(f"Error in fallback OSM collection task: {result}")

            # Deduplicate by location and name
            unique_attractions = self._deduplicate_attractions(all_attractions)

            logger.info(f"Collected {len(unique_attractions)} unique attractions (from {len(all_attractions)} total)")

            # Add photos to attractions if enabled
            if unique_attractions:
                try:
                    from services.photo_scraper import add_photos_to_locations
                    logger.info("Adding photos to attractions...")
                    unique_attractions = await add_photos_to_locations(unique_attractions)
                    photo_count = sum(1 for item in unique_attractions if item.get('photo_url'))
                    logger.info(f"Added photos to {photo_count} attractions")
                except Exception as e:
                    logger.error(f"Error adding photos: {e}")

            return unique_attractions[:limit]
    
    async def collect_waterfalls(self) -> List[Dict]:
        """Collect waterfall locations from OSM and other sources"""
        logger.info("Collecting waterfalls...")
        waterfalls = []
        
        try:
            # OSM query for waterfalls
            query = """
            [out:json][timeout:60];
            (
              node["waterway"="waterfall"]["name"]({{bbox}});
              way["waterway"="waterfall"]["name"]({{bbox}});
              node["natural"="waterfall"]["name"]({{bbox}});
              way["natural"="waterfall"]["name"]({{bbox}});
            );
            out body;
            >;
            out skel qt;
            """
            
            # Define bounding boxes for different regions
            bboxes = [
                # USA regions with known waterfalls
                "44,-124,48,-121",  # Pacific Northwest (many waterfalls)
                "42,-78,44,-76",    # Niagara region
                "35,-85,36,-84",    # Tennessee waterfalls
                "21,-160,23,-154",  # Hawaii
                
                # Canada
                "49,-125,53,-122",  # BC waterfalls
                "43,-80,44,-79",    # Ontario waterfalls
                
                # Australia
                "-28,152,-27,154",  # Queensland waterfalls
                "-34,150,-33,151",  # Blue Mountains
                
                # New Zealand
                "-45,167,-44,168",  # Fiordland waterfalls
                
                # UK
                "54,-3.5,55,-2.5",  # Lake District waterfalls
            ]
            
            for bbox in bboxes:
                query_filled = query.replace('{{bbox}}', bbox)
                
                try:
                    result = self.overpass.query(query_filled)
                    
                    for element in result.nodes:
                        waterfall = self._parse_waterfall(element, 'node')
                        if waterfall:
                            waterfalls.append(waterfall)
                    
                    for element in result.ways:
                        waterfall = self._parse_waterfall(element, 'way')
                        if waterfall:
                            waterfalls.append(waterfall)
                    
                    await asyncio.sleep(2)  # Rate limit
                    
                    if len(waterfalls) >= self.target_per_source:
                        break
                        
                except Exception as e:
                    logger.error(f"OSM waterfall query error: {e}")
                    continue
            
            logger.info(f"Collected {len(waterfalls)} waterfalls")
            
        except Exception as e:
            logger.error(f"Error collecting waterfalls: {e}")
        
        return waterfalls[:self.target_per_source]
    
    def _parse_waterfall(self, element, element_type: str) -> Optional[Dict]:
        """Parse waterfall data from OSM"""
        try:
            tags = element.tags

            if 'name' not in tags:
                return None

            # Get coordinates safely
            coords = self._extract_coordinates_safely(element, element_type)
            if coords is None:
                return None

            lat, lng = coords

            # Extract waterfall properties
            height = tags.get('height', '')
            if height and height.replace('.', '').isdigit():
                height = f"{height}m"

            # Determine country
            country = self._determine_country_from_coords(lat, lng)
            
            return {
                'name': tags.get('name'),
                'data_type': 'attractions',
                'attraction_type': 'waterfall',
                'country': country,
                'latitude': lat,
                'longitude': lng,
                'description': tags.get('description', f"Beautiful waterfall {height}" if height else "Beautiful waterfall"),
                'height': height,
                'difficulty': tags.get('difficulty'),
                'access': tags.get('access', 'public'),
                'best_season': tags.get('seasonal'),
                'swimming': tags.get('swimming') == 'yes',
                'parking': tags.get('parking') == 'yes',
                'trail_info': tags.get('trail_visibility'),
                'data_source': 'openstreetmap',
                'source_id': f"osm_waterfall_{element.id}",
                'collected_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error parsing waterfall: {e}")
            return None
    
    async def collect_swimming_spots(self) -> List[Dict]:
        """Collect swimming spots including beaches, lakes, and swimming holes"""
        logger.info("Collecting swimming spots...")
        swimming_spots = []
        
        try:
            # OSM queries for different swimming spot types
            queries = [
                """
                [out:json][timeout:60];
                (
                  node["natural"="beach"]["name"]({{bbox}});
                  way["natural"="beach"]["name"]({{bbox}});
                  node["leisure"="beach_resort"]["name"]({{bbox}});
                  way["leisure"="beach_resort"]["name"]({{bbox}});
                );
                out body;
                >;
                out skel qt;
                """,
                """
                [out:json][timeout:60];
                (
                  node["leisure"="swimming_pool"]["access"!="private"]["name"]({{bbox}});
                  way["leisure"="swimming_pool"]["access"!="private"]["name"]({{bbox}});
                  node["leisure"="swimming_area"]["name"]({{bbox}});
                  way["leisure"="swimming_area"]["name"]({{bbox}});
                );
                out body;
                >;
                out skel qt;
                """,
                """
                [out:json][timeout:60];
                (
                  node["natural"="water"]["sport"="swimming"]["name"]({{bbox}});
                  way["natural"="water"]["sport"="swimming"]["name"]({{bbox}});
                  node["natural"="hot_spring"]["name"]({{bbox}});
                  way["natural"="hot_spring"]["name"]({{bbox}});
                );
                out body;
                >;
                out skel qt;
                """
            ]
            
            # Coastal and lake regions
            bboxes = [
                # USA coasts and lakes
                "32,-118,34,-116",   # Southern California beaches
                "25,-81,26,-80",     # Miami beaches
                "20,-157,22,-155",   # Hawaii beaches
                "41,-88,42,-87",     # Lake Michigan beaches
                
                # Australia beaches
                "-34,151,-33,152",   # Sydney beaches
                "-28,153,-27,154",   # Gold Coast
                "-32,115,-31,116",   # Perth beaches
                
                # UK beaches
                "50,-6,51,-4",       # Cornwall beaches
                
                # New Zealand
                "-37,174,-36,175",   # Auckland beaches
            ]
            
            for query_template in queries:
                for bbox in bboxes[:5]:
                    query = query_template.replace('{{bbox}}', bbox)
                    
                    try:
                        result = self.overpass.query(query)
                        
                        for element in result.nodes + result.ways:
                            spot = self._parse_swimming_spot(element, element.__class__.__name__.lower())
                            if spot:
                                swimming_spots.append(spot)
                        
                        await asyncio.sleep(2)
                        
                        if len(swimming_spots) >= self.target_per_source:
                            break
                            
                    except Exception as e:
                        logger.error(f"OSM swimming spot query error: {e}")
                        continue
                
                if len(swimming_spots) >= self.target_per_source:
                    break
            
            logger.info(f"Collected {len(swimming_spots)} swimming spots")
            
        except Exception as e:
            logger.error(f"Error collecting swimming spots: {e}")
        
        return swimming_spots[:self.target_per_source]
    
    def _parse_swimming_spot(self, element, element_type: str) -> Optional[Dict]:
        """Parse swimming spot data"""
        try:
            tags = element.tags

            if 'name' not in tags:
                return None

            # Get coordinates safely using the existing safe method
            coords = self._extract_coordinates_safely(element, element_type)
            if coords is None:
                return None

            lat, lng = coords

            # Determine spot type
            spot_type = 'swimming_spot'
            if tags.get('natural') == 'beach':
                spot_type = 'beach'
            elif tags.get('natural') == 'hot_spring':
                spot_type = 'hot_spring'
            elif tags.get('leisure') == 'swimming_pool':
                spot_type = 'public_pool'
            elif tags.get('natural') == 'water':
                spot_type = 'swimming_hole'
            
            # Extract amenities
            amenities = []
            for amenity in ['toilets', 'shower', 'parking', 'lifeguard', 'changing_room']:
                if tags.get(amenity) == 'yes':
                    amenities.append(amenity)
            
            country = self._determine_country_from_coords(lat, lng)
            
            return {
                'name': tags.get('name'),
                'data_type': 'attractions',
                'attraction_type': 'swimming_spot',
                'swimming_type': spot_type,
                'country': country,
                'latitude': lat,
                'longitude': lng,
                'description': tags.get('description', f"Popular {spot_type.replace('_', ' ')}"),
                'water_quality': tags.get('water:quality'),
                'supervised': tags.get('lifeguard') == 'yes',
                'amenities': amenities,
                'access': tags.get('access', 'public'),
                'fee': tags.get('fee') == 'yes',
                'opening_hours': tags.get('opening_hours'),
                'surface': tags.get('surface'),
                'data_source': 'openstreetmap',
                'source_id': f"osm_swimming_{element.id}",
                'collected_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error parsing swimming spot: {e}")
            return None
    
    async def collect_scenic_viewpoints(self) -> List[Dict]:
        """Collect scenic viewpoints and lookouts"""
        logger.info("Collecting scenic viewpoints...")
        viewpoints = []
        
        try:
            query = """
            [out:json][timeout:60];
            (
              node["tourism"="viewpoint"]["name"]({{bbox}});
              way["tourism"="viewpoint"]["name"]({{bbox}});
              node["viewpoint"="yes"]["name"]({{bbox}});
            );
            out body;
            >;
            out skel qt;
            """
            
            # Mountain and scenic regions
            bboxes = [
                # USA scenic areas
                "36,-112,37,-111",   # Grand Canyon area
                "44,-111,45,-110",   # Yellowstone area
                "37,-120,38,-119",   # Yosemite area
                
                # Canada
                "51,-117,52,-115",   # Canadian Rockies
                
                # Australia
                "-34,150,-33,151",   # Blue Mountains
                
                # New Zealand
                "-44,168,-43,171",   # Southern Alps
                
                # UK
                "54,-3.5,55,-2.5",   # Lake District
            ]
            
            for bbox in bboxes:
                query_filled = query.replace('{{bbox}}', bbox)
                
                try:
                    result = self.overpass.query(query_filled)
                    
                    for element in result.nodes:
                        viewpoint = self._parse_viewpoint(element)
                        if viewpoint:
                            viewpoints.append(viewpoint)
                    
                    await asyncio.sleep(2)
                    
                    if len(viewpoints) >= 100:  # Limit viewpoints
                        break
                        
                except Exception as e:
                    logger.error(f"OSM viewpoint query error: {e}")
                    continue
            
            logger.info(f"Collected {len(viewpoints)} viewpoints")
            
        except Exception as e:
            logger.error(f"Error collecting viewpoints: {e}")
        
        return viewpoints
    
    def _parse_viewpoint(self, element) -> Optional[Dict]:
        """Parse viewpoint data"""
        try:
            tags = element.tags

            if 'name' not in tags:
                return None

            # Safely extract coordinates
            lat = getattr(element, 'lat', None)
            lng = getattr(element, 'lon', None)

            if lat is None or lng is None:
                return None

            # Validate coordinates
            try:
                lat_float = float(lat)
                lng_float = float(lng)

                if not (-90 <= lat_float <= 90) or not (-180 <= lng_float <= 180):
                    return None
            except (ValueError, TypeError):
                return None

            country = self._determine_country_from_coords(lat_float, lng_float)
            
            return {
                'name': tags.get('name'),
                'data_type': 'attractions',
                'attraction_type': 'viewpoint',
                'country': country,
                'latitude': lat_float,
                'longitude': lng_float,
                'description': tags.get('description', 'Scenic viewpoint'),
                'elevation': tags.get('ele'),
                'direction': tags.get('direction'),
                'accessible': tags.get('wheelchair') == 'yes',
                'parking': tags.get('parking') == 'yes',
                'data_source': 'openstreetmap',
                'source_id': f"osm_viewpoint_{element.id}",
                'collected_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error parsing viewpoint: {e}")
            return None
    
    async def collect_historical_sites(self) -> List[Dict]:
        """Collect historical sites and monuments"""
        logger.info("Collecting historical sites...")
        sites = []
        
        try:
            query = """
            [out:json][timeout:60];
            (
              node["historic"]["name"]({{bbox}});
              way["historic"]["name"]({{bbox}});
              node["tourism"="museum"]["name"]({{bbox}});
              way["tourism"="museum"]["name"]({{bbox}});
            );
            out body;
            >;
            out skel qt;
            """
            
            # Historical regions
            bboxes = [
                # USA
                "38,-78,40,-76",     # Washington DC area
                "42,-71.2,42.4,-70.9", # Boston area
                
                # UK
                "51.4,-0.2,51.6,0.1",  # London
                "52,-2,53,-1",         # Central England
                
                # Australia
                "-34,151,-33,152",     # Sydney area
                
                # Canada
                "45.4,-75.8,45.5,-75.6", # Ottawa
            ]
            
            for bbox in bboxes[:4]:
                query_filled = query.replace('{{bbox}}', bbox)
                
                try:
                    result = self.overpass.query(query_filled)
                    
                    for element in result.nodes + result.ways:
                        site = self._parse_historical_site(element, element.__class__.__name__.lower())
                        if site:
                            sites.append(site)
                    
                    await asyncio.sleep(2)
                    
                    if len(sites) >= 100:
                        break
                        
                except Exception as e:
                    logger.error(f"OSM historical site query error: {e}")
                    continue
            
            logger.info(f"Collected {len(sites)} historical sites")
            
        except Exception as e:
            logger.error(f"Error collecting historical sites: {e}")
        
        return sites
    
    def _parse_historical_site(self, element, element_type: str) -> Optional[Dict]:
        """Parse historical site data"""
        try:
            tags = element.tags

            if 'name' not in tags:
                return None

            # Get coordinates safely using the existing safe method
            coords = self._extract_coordinates_safely(element, element_type)
            if coords is None:
                return None

            lat, lng = coords
            
            # Determine site type
            site_type = tags.get('historic', tags.get('tourism', 'historical_site'))

            country = self._determine_country_from_coords(lat, lng)
            
            return {
                'name': tags.get('name'),
                'data_type': 'attractions',
                'attraction_type': 'historical_site',
                'site_type': site_type,
                'country': country,
                'latitude': lat,
                'longitude': lng,
                'description': tags.get('description', f"Historical {site_type.replace('_', ' ')}"),
                'wikipedia': tags.get('wikipedia'),
                'website': tags.get('website'),
                'opening_hours': tags.get('opening_hours'),
                'fee': tags.get('fee') == 'yes',
                'wheelchair': tags.get('wheelchair') == 'yes',
                'year': tags.get('start_date'),
                'data_source': 'openstreetmap',
                'source_id': f"osm_historic_{element.id}",
                'collected_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error parsing historical site: {e}")
            return None
    
    async def collect_tourist_attractions(self) -> List[Dict]:
        """Collect general tourist attractions"""
        logger.info("Collecting tourist attractions...")
        attractions = []
        
        try:
            # Enhanced tourist attractions query
            query = """
            [out:json][timeout:120];
            (
              node["tourism"="attraction"]({{bbox}});
              node["tourism"="viewpoint"]({{bbox}});
              node["natural"="waterfall"]({{bbox}});
              node["natural"="hot_spring"]({{bbox}});
              node["leisure"="swimming_area"]({{bbox}});
              node["tourism"="theme_park"]({{bbox}});
              node["historic"="monument"]({{bbox}});
              node["historic"="castle"]({{bbox}});
              node["tourism"="museum"]({{bbox}});
              node["amenity"="theatre"]({{bbox}});
              way["tourism"="attraction"]({{bbox}});
              way["tourism"="theme_park"]({{bbox}});
              way["historic"="castle"]({{bbox}});
              way["tourism"="museum"]({{bbox}});
            );
            out center;
            """
            
            # Major tourist areas
            bboxes = [
                # USA
                "28.3,-81.6,28.6,-81.3",  # Orlando (theme parks)
                "34,-118.5,34.2,-118.2",  # Los Angeles
                
                # Australia
                "-34,151,-33,152",        # Sydney
                
                # UK
                "51.4,-0.2,51.6,0.1",     # London
            ]
            
            for bbox in bboxes:
                query_filled = query.replace('{{bbox}}', bbox)
                
                try:
                    result = self.overpass.query(query_filled)
                    
                    for element in result.nodes + result.ways:
                        attraction = self._parse_tourist_attraction(element, element.__class__.__name__.lower())
                        if attraction:
                            attractions.append(attraction)
                    
                    await asyncio.sleep(2)
                    
                    if len(attractions) >= 100:
                        break
                        
                except Exception as e:
                    logger.error(f"OSM attraction query error: {e}")
                    continue
            
            logger.info(f"Collected {len(attractions)} tourist attractions")
            
        except Exception as e:
            logger.error(f"Error collecting tourist attractions: {e}")
        
        return attractions
    
    def _parse_tourist_attraction(self, element, element_type: str) -> Optional[Dict]:
        """Parse tourist attraction data"""
        try:
            tags = element.tags

            if 'name' not in tags:
                return None

            # Get coordinates with null safety
            lat, lng = None, None
            if element_type == 'node':
                lat, lng = getattr(element, 'lat', None), getattr(element, 'lon', None)
            else:
                if hasattr(element, 'center_lat'):
                    lat, lng = getattr(element, 'center_lat', None), getattr(element, 'center_lon', None)
                else:
                    return None

            # Validate coordinates are not None
            if lat is None or lng is None:
                logger.debug(f"Skipping attraction {tags.get('name')} - missing coordinates")
                return None

            # Ensure coordinates are numeric
            try:
                lat_float = float(lat)
                lng_float = float(lng)
            except (ValueError, TypeError):
                logger.debug(f"Skipping attraction {tags.get('name')} - invalid coordinates: lat={lat}, lng={lng}")
                return None

            # Validate coordinate ranges
            if not (-90 <= lat_float <= 90) or not (-180 <= lng_float <= 180):
                logger.debug(f"Skipping attraction {tags.get('name')} - coordinates out of range: lat={lat_float}, lng={lng_float}")
                return None

            country = self._determine_country_from_coords(lat_float, lng_float)

            return {
                'name': tags.get('name'),
                'data_type': 'attractions',
                'attraction_type': tags.get('tourism', 'attraction'),
                'country': country,
                'latitude': lat_float,
                'longitude': lng_float,
                'description': tags.get('description', 'Popular tourist attraction'),
                'website': tags.get('website'),
                'opening_hours': tags.get('opening_hours'),
                'fee': tags.get('fee') == 'yes',
                'wheelchair': tags.get('wheelchair') == 'yes',
                'operator': tags.get('operator'),
                'data_source': 'openstreetmap',
                'source_id': f"osm_attraction_{element.id}",
                'collected_at': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error parsing tourist attraction: {e}")
            return None
    
    async def collect_google_places_attractions(self) -> List[Dict]:
        """Main method to collect attractions using Google Places API"""
        all_attractions = []

        if not self.api_keys.get('google_places'):
            logger.warning("No Google Places API key - falling back to OSM")
            return await self.collect_osm_attractions()

        logger.info("🗺️ Using Google Places API for attraction data")

        # Major regions to search across
        search_regions = [
            # Australia - major cities and tourist areas
            {'name': 'Sydney', 'location': (-33.8688, 151.2093), 'radius': 50000, 'country': 'australia'},
            {'name': 'Melbourne', 'location': (-37.8136, 144.9631), 'radius': 50000, 'country': 'australia'},
            {'name': 'Brisbane', 'location': (-27.4698, 153.0251), 'radius': 50000, 'country': 'australia'},
            {'name': 'Perth', 'location': (-31.9505, 115.8605), 'radius': 50000, 'country': 'australia'},
            {'name': 'Adelaide', 'location': (-34.9285, 138.6007), 'radius': 40000, 'country': 'australia'},
            {'name': 'Gold Coast', 'location': (-28.0167, 153.4000), 'radius': 30000, 'country': 'australia'},
            {'name': 'Cairns', 'location': (-16.9186, 145.7781), 'radius': 30000, 'country': 'australia'},
            {'name': 'Darwin', 'location': (-12.4634, 130.8456), 'radius': 30000, 'country': 'australia'},

            # New Zealand
            {'name': 'Auckland', 'location': (-36.8485, 174.7633), 'radius': 40000, 'country': 'new_zealand'},
            {'name': 'Wellington', 'location': (-41.2865, 174.7762), 'radius': 30000, 'country': 'new_zealand'},
            {'name': 'Christchurch', 'location': (-43.5321, 172.6362), 'radius': 30000, 'country': 'new_zealand'},
            {'name': 'Queenstown', 'location': (-45.0312, 168.6626), 'radius': 25000, 'country': 'new_zealand'},

            # USA - major tourist areas
            {'name': 'San Francisco', 'location': (37.7749, -122.4194), 'radius': 50000, 'country': 'united_states'},
            {'name': 'Los Angeles', 'location': (34.0522, -118.2437), 'radius': 60000, 'country': 'united_states'},
            {'name': 'New York', 'location': (40.7128, -74.0060), 'radius': 50000, 'country': 'united_states'},
            {'name': 'Las Vegas', 'location': (36.1699, -115.1398), 'radius': 30000, 'country': 'united_states'},

            # Canada
            {'name': 'Toronto', 'location': (43.6532, -79.3832), 'radius': 40000, 'country': 'canada'},
            {'name': 'Vancouver', 'location': (49.2827, -123.1207), 'radius': 40000, 'country': 'canada'},

            # UK
            {'name': 'London', 'location': (51.5074, -0.1278), 'radius': 50000, 'country': 'great_britain'},
        ]

        # Place types to search for
        place_types = [
            'tourist_attraction',
            'natural_feature',
            'park',
            'museum',
            'amusement_park',
            'zoo',
            'aquarium',
            'art_gallery',
            'landmark'
        ]

        logger.info(f"🔍 Searching {len(search_regions)} regions for {len(place_types)} place types")

        for region in search_regions:
            for place_type in place_types:
                try:
                    region_attractions = await self.search_google_places(
                        location=region['location'],
                        radius=region['radius'],
                        place_type=place_type,
                        country=region['country'],
                        region_name=region['name']
                    )
                    all_attractions.extend(region_attractions)

                    # Rate limiting - Google Places has strict limits
                    await asyncio.sleep(0.1)

                    # Stop if we have enough data
                    if len(all_attractions) >= 1000:
                        logger.info(f"✅ Collected {len(all_attractions)} attractions, stopping")
                        break

                except Exception as e:
                    logger.error(f"Error searching {region['name']} for {place_type}: {e}")
                    continue

            if len(all_attractions) >= 1000:
                break

        logger.info(f"✅ Google Places API collected {len(all_attractions)} attractions")
        return all_attractions

    async def search_google_places(
        self,
        location: tuple,
        radius: int,
        place_type: str,
        country: str,
        region_name: str,
        max_results: int = 20
    ) -> List[Dict]:
        """Search Google Places API for attractions in a specific location"""
        attractions = []

        try:
            url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

            params = {
                'location': f"{location[0]},{location[1]}",
                'radius': radius,
                'type': place_type,
                'key': self.api_keys['google_places']
            }

            logger.debug(f"🔍 Searching Google Places: {region_name} for {place_type}")

            async with self.session.get(url, params=params) as response:
                if response.status != 200:
                    logger.warning(f"Google Places API error {response.status} for {region_name}")
                    return []

                data = await response.json()

                if data.get('status') != 'OK':
                    if data.get('status') == 'ZERO_RESULTS':
                        logger.debug(f"No {place_type} results for {region_name}")
                    else:
                        logger.warning(f"Google Places API status: {data.get('status')} for {region_name}")
                    return []

                # Process results
                for place in data.get('results', [])[:max_results]:
                    try:
                        attraction = await self._parse_google_place(place, country, place_type, region_name)
                        if attraction:
                            attractions.append(attraction)
                    except Exception as e:
                        logger.error(f"Error parsing Google place: {e}")
                        continue

                logger.debug(f"✅ Found {len(attractions)} {place_type}s in {region_name}")

        except Exception as e:
            logger.error(f"Error searching Google Places for {region_name}: {e}")

        return attractions

    async def _parse_google_place(self, place: dict, country: str, place_type: str, region_name: str) -> Optional[Dict]:
        """Parse a Google Places API result into our format"""
        try:
            geometry = place.get('geometry', {})
            location = geometry.get('location', {})

            lat = location.get('lat')
            lng = location.get('lng')

            if not lat or not lng:
                return None

            # Basic place data
            name = place.get('name')
            if not name:
                return None

            # Calculate quality score based on Google data
            rating = place.get('rating', 0)
            user_ratings_total = place.get('user_ratings_total', 0)
            price_level = place.get('price_level', 0)

            # Quality scoring algorithm
            quality_score = 0.5  # Base score
            if rating > 0:
                quality_score += (rating / 5.0) * 0.3  # Max +0.3 for rating
            if user_ratings_total > 10:
                quality_score += min(user_ratings_total / 1000, 0.2)  # Max +0.2 for popularity

            # Google photo URL if available
            photo_url = None
            if place.get('photos') and len(place['photos']) > 0:
                photo_reference = place['photos'][0].get('photo_reference')
                if photo_reference:
                    photo_url = (
                        f"https://maps.googleapis.com/maps/api/place/photo"
                        f"?maxwidth=800&photoreference={photo_reference}"
                        f"&key={self.api_keys['google_places']}"
                    )

            return {
                'name': name,
                'data_type': 'attractions',
                'attraction_type': self._map_google_place_type(place_type, place.get('types', [])),
                'country': country,
                'state_province': region_name,
                'latitude': float(lat),
                'longitude': float(lng),
                'description': f"{name} in {region_name}",
                'rating': rating,
                'user_ratings_total': user_ratings_total,
                'price_level': price_level,
                'quality_score': min(quality_score, 1.0),
                'opening_hours': place.get('opening_hours', {}).get('open_now'),
                'address': place.get('vicinity'),
                'place_id': place.get('place_id'),
                'photo_url': photo_url,
                'photo_source': 'google_places' if photo_url else 'none',
                'data_source': 'google_places',
                'source_id': f"google_places_{place.get('place_id')}",
                'collected_at': datetime.now().isoformat(),
                'google_types': place.get('types', []),
                'is_free': price_level == 0,
                'last_verified': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error parsing Google place {place.get('name')}: {e}")
            return None

    def _map_google_place_type(self, primary_type: str, all_types: list) -> str:
        """Map Google Places types to our attraction types"""
        # Primary type mapping
        type_mapping = {
            'tourist_attraction': 'tourist_attraction',
            'natural_feature': 'natural_attraction',
            'park': 'park',
            'museum': 'cultural',
            'amusement_park': 'entertainment',
            'zoo': 'wildlife',
            'aquarium': 'wildlife',
            'art_gallery': 'cultural',
            'landmark': 'landmark'
        }

        # Check all types for more specific mapping
        for gtype in all_types:
            if gtype in ['national_park', 'state_park']:
                return 'national_park'
            elif gtype in ['beach', 'lake', 'waterfall']:
                return 'natural_attraction'
            elif gtype in ['church', 'temple', 'monastery']:
                return 'religious'
            elif gtype in ['shopping_mall', 'store']:
                return 'shopping'
            elif gtype in ['restaurant', 'cafe', 'bar']:
                return 'food_drink'

        return type_mapping.get(primary_type, 'attraction')

    async def collect_osm_attractions(self) -> List[Dict]:
        """Fallback method to collect OSM attractions if Google Places unavailable"""
        all_attractions = []

        # Collect each type
        waterfalls = await self.collect_waterfalls()
        swimming = await self.collect_swimming_spots()
        viewpoints = await self.collect_scenic_viewpoints()
        historical = await self.collect_historical_sites()
        tourist = await self.collect_tourist_attractions()

        all_attractions.extend(waterfalls)
        all_attractions.extend(swimming)
        all_attractions.extend(viewpoints)
        all_attractions.extend(historical)
        all_attractions.extend(tourist)

        # Deduplicate before photo processing
        unique_attractions = self._deduplicate_attractions(all_attractions)

        # Add photos to attractions
        logger.info(f"🔍 Starting photo collection for {len(unique_attractions)} unique attractions")
        try:
            attractions_with_photos = await add_photos_to_locations(unique_attractions)
            photo_count = sum(1 for attr in attractions_with_photos if attr.get('photo_url'))
            logger.info(f"✅ Added photos to {photo_count}/{len(unique_attractions)} attractions")
            return attractions_with_photos
        except Exception as e:
            logger.error(f"❌ Photo collection failed: {e}")
            # Return attractions without photos if photo collection fails
            return unique_attractions
    
    def _deduplicate_attractions(self, attractions: List[Dict]) -> List[Dict]:
        """Remove duplicate attractions based on location"""
        seen_locations = set()
        unique_attractions = []
        
        for attraction in attractions:
            lat = round(attraction.get('latitude', 0), 4)
            lng = round(attraction.get('longitude', 0), 4)
            location_key = f"{lat},{lng}"
            
            if location_key not in seen_locations:
                seen_locations.add(location_key)
                unique_attractions.append(attraction)
        
        logger.info(f"Deduplication: {len(attractions)} -> {len(unique_attractions)} attractions")
        return unique_attractions
    
    def _determine_country_from_coords(self, lat: float, lng: float) -> str:
        """Determine country from coordinates (simplified)"""
        # Safety check for None values
        if lat is None or lng is None:
            return 'unknown'

        try:
            # Ensure coordinates are numeric
            lat_safe = float(lat)
            lng_safe = float(lng)

            # Country boundary checks with safe comparisons
            if 24 <= lat_safe <= 49 and -125 <= lng_safe <= -66:
                return 'united_states'
            elif 41 <= lat_safe <= 84 and -141 <= lng_safe <= -52:
                return 'canada'
            elif -44 <= lat_safe <= -10 and 113 <= lng_safe <= 154:
                return 'australia'
            elif -47 <= lat_safe <= -34 and 166 <= lng_safe <= 179:
                return 'new_zealand'
            elif 49 <= lat_safe <= 61 and -8 <= lng_safe <= 2:
                return 'great_britain'
            else:
                return 'unknown'

        except (ValueError, TypeError):
            logger.debug(f"Invalid coordinates for country determination: lat={lat}, lng={lng}")
            return 'unknown'