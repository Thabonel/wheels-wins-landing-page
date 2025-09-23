"""
Enhanced Fallback Data Collection System
Implements multi-tier fallback strategy for reliable data collection
"""

import asyncio
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
import aiohttp
import overpy
import os
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

class EnhancedFallbackCollector:
    """Smart fallback system for data collection"""

    def __init__(self):
        self.session = None
        self.overpass = overpy.Overpass()
        self.api_keys = {
            'recreation_gov': os.getenv('RECREATION_GOV_KEY'),
            'google_places': os.getenv('GOOGLE_PLACES_KEY'),
        }

        # Fallback strategies in order of preference
        self.strategies = [
            'try_api_collection',      # Primary: API with key
            'try_open_data',           # Fallback 1: Open government data
            'try_osm_enhanced',        # Fallback 2: Enhanced OSM queries
            'try_web_scraping',        # Fallback 3: Direct web scraping
            'try_cached_expansion'     # Fallback 4: Expand existing data
        ]

    async def __aenter__(self):
        timeout = aiohttp.ClientTimeout(total=60)
        self.session = aiohttp.ClientSession(
            timeout=timeout,
            headers={'User-Agent': 'WheelsWins-DataCollector/2.0 Enhanced'}
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def collect_with_fallbacks(self, source_type: str, target_count: int = 200) -> List[Dict]:
        """Execute collection with comprehensive fallback system"""
        logger.info(f"🔄 Starting fallback collection for {source_type} (target: {target_count})")

        all_results = []

        async with self:
            for strategy_name in self.strategies:
                if len(all_results) >= target_count:
                    break

                try:
                    strategy = getattr(self, strategy_name)
                    logger.info(f"🎯 Trying strategy: {strategy_name}")

                    results = await strategy(source_type, target_count - len(all_results))

                    if results:
                        all_results.extend(results)
                        logger.info(f"✅ {strategy_name} collected {len(results)} items")
                    else:
                        logger.warning(f"⚠️ {strategy_name} returned no results")

                except Exception as e:
                    logger.warning(f"❌ Strategy {strategy_name} failed: {e}")
                    continue

        unique_results = self._deduplicate_by_location(all_results)
        logger.info(f"🎉 Fallback collection complete: {len(unique_results)} unique items from {len(all_results)} total")

        return unique_results[:target_count]

    async def try_api_collection(self, source_type: str, remaining: int) -> List[Dict]:
        """Primary strategy: Use official APIs when available"""
        logger.info(f"🔑 Trying API collection for {source_type}")

        if source_type == 'camping_spots' and self.api_keys['recreation_gov']:
            return await self._collect_recreation_gov_api(remaining)
        elif self.api_keys['google_places']:
            return await self._collect_google_places_api(source_type, remaining)
        else:
            logger.info("🚫 No API keys available for this source type")
            return []

    async def try_open_data(self, source_type: str, remaining: int) -> List[Dict]:
        """Fallback 1: Government open data sources (no API keys required)"""
        logger.info(f"🏛️ Trying open government data for {source_type}")

        open_data_sources = [
            {
                'name': 'US National Parks Service',
                'url': 'https://www.nps.gov/lib/npmap.js/4.0.0/examples/data/national-parks.geojson',
                'no_key_required': True
            },
            {
                'name': 'Parks Canada Open Data',
                'url': 'https://open.canada.ca/data/en/dataset/c735a449-5dce-49ad-a845-7bb9dd1c5d6b',
                'format': 'geojson'
            }
        ]

        results = []
        for source in open_data_sources:
            try:
                if source_type in ['parks', 'camping_spots'] and source.get('no_key_required'):
                    data = await self._fetch_open_data_geojson(source['url'])
                    parsed_items = self._parse_open_data(data, source_type)
                    results.extend(parsed_items[:remaining//2])  # Split between sources

            except Exception as e:
                logger.warning(f"Open data source {source['name']} failed: {e}")
                continue

        return results

    async def try_osm_enhanced(self, source_type: str, remaining: int) -> List[Dict]:
        """Fallback 2: Enhanced OpenStreetMap queries"""
        logger.info(f"🗺️ Trying enhanced OSM queries for {source_type}")

        enhanced_queries = self._get_enhanced_osm_queries(source_type)
        results = []

        # Use more permissive bounding boxes
        relaxed_bboxes = [
            # Larger USA regions
            "25,-130,50,-65",   # Continental US (expanded)
            "20,-160,65,-140",  # Alaska + Hawaii

            # Larger Canada region
            "40,-145,75,-50",   # Canada (expanded)

            # Larger Australia region
            "-45,110,-8,160",   # Australia + surrounds

            # Europe
            "35,-15,72,45",     # Europe (expanded)
        ]

        for query_template in enhanced_queries:
            for bbox in relaxed_bboxes:
                if len(results) >= remaining:
                    break

                try:
                    query = query_template.replace('{{bbox}}', bbox)
                    result = self.overpass.query(query)

                    for element in result.nodes + result.ways + getattr(result, 'relations', []):
                        if len(results) >= remaining:
                            break

                        item = self._parse_osm_element_enhanced(element, source_type)
                        if item:
                            results.append(item)

                    await asyncio.sleep(3)  # Be more respectful to OSM

                except Exception as e:
                    logger.warning(f"OSM enhanced query failed: {e}")
                    continue

        return results

    async def try_web_scraping(self, source_type: str, remaining: int) -> List[Dict]:
        """Fallback 3: Direct web scraping of public databases"""
        logger.info(f"🕷️ Trying web scraping for {source_type}")

        # API-free sources that can be scraped
        scraping_targets = {
            'camping_spots': [
                'https://freecampsites.net',
                'https://www.ioverlander.com/places',
                'https://campendium.com/free-camping'
            ],
            'parks': [
                'https://www.alltrails.com/parks',
                'https://www.recreation.gov/search'
            ],
            'attractions': [
                'https://www.tripadvisor.com/Attractions',
                'https://www.atlasobscura.com/places'
            ]
        }

        results = []
        for url in scraping_targets.get(source_type, []):
            if len(results) >= remaining:
                break

            try:
                scraped_items = await self._scrape_public_website(url, source_type)
                results.extend(scraped_items[:remaining//3])  # Distribute among sources
                await asyncio.sleep(5)  # Be respectful

            except Exception as e:
                logger.warning(f"Web scraping {url} failed: {e}")
                continue

        return results

    async def try_cached_expansion(self, source_type: str, remaining: int) -> List[Dict]:
        """Fallback 4: Expand existing data with enhanced details"""
        logger.info(f"📈 Trying cached data expansion for {source_type}")

        # This would query existing database items and enhance them
        # with additional details, photos, reviews, etc.
        # Placeholder for now
        return []

    def _get_enhanced_osm_queries(self, source_type: str) -> List[str]:
        """Get enhanced OSM queries by type"""

        if source_type == 'camping_spots':
            return [
                # Comprehensive camping query
                """
                [out:json][timeout:180];
                (
                  node["tourism"="camp_site"]["access"!="private"]({{bbox}});
                  node["tourism"="caravan_site"]({{bbox}});
                  node["leisure"="park"]["camping"="yes"]({{bbox}});
                  node["highway"="rest_area"]["camping"="yes"]({{bbox}});
                  node["amenity"="parking"]["camping"="tolerated"]({{bbox}});
                  way["tourism"="camp_site"]["access"!="private"]({{bbox}});
                  way["tourism"="caravan_site"]({{bbox}});
                  relation["tourism"="camp_site"]({{bbox}});
                );
                out center;
                """,

                # Free camping specific
                """
                [out:json][timeout:180];
                (
                  node["tourism"="camp_site"]["fee"="no"]({{bbox}});
                  node["tourism"="wild_camping"]({{bbox}});
                  node["amenity"="parking"]["camping"="designated"]({{bbox}});
                );
                out center;
                """
            ]

        elif source_type == 'parks':
            return [
                """
                [out:json][timeout:180];
                (
                  way["leisure"="nature_reserve"]({{bbox}});
                  way["boundary"="national_park"]({{bbox}});
                  way["boundary"="protected_area"]({{bbox}});
                  relation["leisure"="nature_reserve"]({{bbox}});
                  relation["boundary"="national_park"]({{bbox}});
                  relation["boundary"="protected_area"]({{bbox}});
                );
                out center;
                """
            ]

        elif source_type == 'attractions':
            return [
                """
                [out:json][timeout:180];
                (
                  node["tourism"="attraction"]({{bbox}});
                  node["tourism"="viewpoint"]({{bbox}});
                  node["natural"="waterfall"]({{bbox}});
                  node["natural"="hot_spring"]({{bbox}});
                  node["leisure"="swimming_area"]({{bbox}});
                  node["historic"="monument"]({{bbox}});
                  node["historic"="castle"]({{bbox}});
                  node["tourism"="museum"]({{bbox}});
                );
                out center;
                """
            ]

        return []

    async def _collect_recreation_gov_api(self, limit: int) -> List[Dict]:
        """Collect from Recreation.gov API"""
        # Implementation from existing scraper
        return []

    async def _collect_google_places_api(self, source_type: str, limit: int) -> List[Dict]:
        """Collect from Google Places API"""
        # Implementation from existing scraper
        return []

    async def _fetch_open_data_geojson(self, url: str) -> Dict:
        """Fetch GeoJSON from open data source"""
        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"Open data fetch failed: {response.status}")
                    return {}
        except Exception as e:
            logger.error(f"Error fetching open data: {e}")
            return {}

    def _parse_open_data(self, data: Dict, source_type: str) -> List[Dict]:
        """Parse open government data"""
        items = []

        try:
            if 'features' in data:
                for feature in data['features']:
                    props = feature.get('properties', {})
                    geom = feature.get('geometry', {})

                    if geom.get('type') == 'Point':
                        coords = geom.get('coordinates', [])
                        if len(coords) >= 2:
                            item = {
                                'name': props.get('name', props.get('NAME', 'Unnamed Location')),
                                'data_type': source_type,
                                'latitude': coords[1],
                                'longitude': coords[0],
                                'description': props.get('description', ''),
                                'data_source': 'open_government_data',
                                'collected_at': datetime.now().isoformat(),
                                'source_reliability': 9  # Government data is highly reliable
                            }
                            items.append(item)

        except Exception as e:
            logger.error(f"Error parsing open data: {e}")

        return items

    async def _scrape_public_website(self, url: str, source_type: str) -> List[Dict]:
        """Scrape public website for data"""
        # Placeholder - would implement respectful scraping
        logger.info(f"Would scrape {url} for {source_type}")
        return []

    def _parse_osm_element_enhanced(self, element, source_type: str) -> Optional[Dict]:
        """Enhanced OSM element parsing with better error handling"""
        try:
            tags = getattr(element, 'tags', {})

            # Get coordinates safely
            lat, lng = None, None
            element_type = element.__class__.__name__.lower()

            if element_type == 'node':
                lat, lng = getattr(element, 'lat', None), getattr(element, 'lon', None)
            elif hasattr(element, 'center_lat'):
                lat, lng = getattr(element, 'center_lat', None), getattr(element, 'center_lon', None)

            if not lat or not lng:
                return None

            # Validate coordinates
            try:
                lat_float = float(lat)
                lng_float = float(lng)
                if not (-90 <= lat_float <= 90) or not (-180 <= lng_float <= 180):
                    return None
            except (ValueError, TypeError):
                return None

            # Get name - more flexible
            name = (tags.get('name') or
                   tags.get('name:en') or
                   tags.get('official_name') or
                   f"Unnamed {source_type.title()}")

            return {
                'name': name,
                'data_type': source_type,
                'latitude': lat_float,
                'longitude': lng_float,
                'description': tags.get('description', ''),
                'data_source': 'openstreetmap_enhanced',
                'source_id': f"osm_{element_type}_{element.id}",
                'collected_at': datetime.now().isoformat(),
                'source_reliability': 7,  # OSM is quite reliable
                'osm_tags': dict(tags)  # Preserve all tags
            }

        except Exception as e:
            logger.error(f"Error parsing OSM element: {e}")
            return None

    def _deduplicate_by_location(self, items: List[Dict]) -> List[Dict]:
        """Improved deduplication with relaxed distance threshold"""
        if not items:
            return items

        unique_items = []
        seen_locations = set()

        for item in items:
            lat = item.get('latitude')
            lng = item.get('longitude')

            if not lat or not lng:
                continue

            # Use 1km threshold instead of 100m (more relaxed)
            location_key = f"{round(lat, 2)},{round(lng, 2)}"

            if location_key not in seen_locations:
                seen_locations.add(location_key)
                unique_items.append(item)

        logger.info(f"Relaxed deduplication: {len(items)} -> {len(unique_items)} items")
        return unique_items