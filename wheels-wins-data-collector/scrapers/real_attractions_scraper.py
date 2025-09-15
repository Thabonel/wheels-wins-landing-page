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
            # Collect from each source in parallel
            tasks = [
                self.collect_osm_attractions(),
                self.collect_waterfalls(),
                self.collect_swimming_spots(),
                self.collect_scenic_viewpoints(),
                self.collect_historical_sites(),
                self.collect_tourist_attractions()
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, list):
                    all_attractions.extend(result)
                elif isinstance(result, Exception):
                    logger.error(f"Error in collection task: {result}")
            
            # Deduplicate
            unique_attractions = self._deduplicate_attractions(all_attractions)
            
            logger.info(f"Collected {len(unique_attractions)} unique attractions")
            
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

            # Get coordinates safely
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
            
            country = self._determine_country_from_coords(element.lat, element.lon)
            
            return {
                'name': tags.get('name'),
                'data_type': 'attractions',
                'attraction_type': 'viewpoint',
                'country': country,
                'latitude': element.lat,
                'longitude': element.lon,
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
            
            # Get coordinates
            if element_type == 'node':
                lat, lng = element.lat, element.lon
            else:
                if hasattr(element, 'center_lat'):
                    lat, lng = element.center_lat, element.center_lon
                else:
                    return None
            
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
            query = """
            [out:json][timeout:60];
            (
              node["tourism"="attraction"]["name"]({{bbox}});
              way["tourism"="attraction"]["name"]({{bbox}});
              node["tourism"="theme_park"]["name"]({{bbox}});
              way["tourism"="theme_park"]["name"]({{bbox}});
            );
            out body;
            >;
            out skel qt;
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
    
    async def collect_osm_attractions(self) -> List[Dict]:
        """Main method to collect all OSM attractions"""
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
        
        return all_attractions
    
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