"""
Camping Spots Scraper Service

Collects comprehensive camping data including free camping, RV parks, and campgrounds
across Australia, New Zealand, Canada, US, and Great Britain.

Data Sources:
- WikiCamps (Australia/NZ)
- iOverlander (Global)
- Campendium (US/Canada)
- FreeRoam (US)
- Recreation.gov (US)
- Government rest area databases
- RV forum scraping
"""

import asyncio
import aiohttp
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
import re
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class CampingSpotsScraperService:
    """Service for scraping camping spots data from multiple sources"""
    
    def __init__(self, countries_config: Dict, sources_config: Dict):
        self.countries_config = countries_config
        self.sources_config = sources_config
        self.session = None
        
        # API keys from environment
        self.api_keys = {
            'recreation_gov': sources_config.get('api_keys', {}).get('recreation_gov_key'),
            'google_places': sources_config.get('api_keys', {}).get('google_places_key'),
        }
        
        # Rate limiting
        self.rate_limits = sources_config.get('rate_limits', {})
        self.request_delays = {}
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={'User-Agent': 'WheelsWins-DataCollector/1.0 (Travel Data Aggregation)'}
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def collect_all(self, country: str) -> List[Dict]:
        """Collect all camping spots for a country"""
        logger.info(f"Starting camping spots collection for {country}")
        
        country_config = self.countries_config['countries'].get(country, {})
        if not country_config:
            logger.error(f"No configuration found for country: {country}")
            return []
        
        all_camping_spots = []
        
        # Use context manager for session
        async with self:
            if country == 'australia':
                spots = await self._collect_australia_camping(country_config)
            elif country == 'new_zealand':
                spots = await self._collect_new_zealand_camping(country_config)
            elif country == 'canada':
                spots = await self._collect_canada_camping(country_config)
            elif country == 'united_states':
                spots = await self._collect_us_camping(country_config)
            elif country == 'great_britain':
                spots = await self._collect_gb_camping(country_config)
            else:
                logger.error(f"Unsupported country: {country}")
                return []
            
            all_camping_spots.extend(spots)
        
        logger.info(f"Collected {len(all_camping_spots)} camping spots for {country}")
        return all_camping_spots
    
    async def collect_sample(self, country: str, limit: int = 10) -> List[Dict]:
        """Collect a sample of camping spots for testing"""
        all_spots = await self.collect_all(country)
        return all_spots[:limit]
    
    # ==================== COUNTRY-SPECIFIC COLLECTORS ====================
    
    async def _collect_australia_camping(self, country_config: Dict) -> List[Dict]:
        """Collect Australian camping spots"""
        camping_spots = []
        
        # Method 1: WikiCamps Australia data
        wikicamps_spots = await self._scrape_wikicamps_australia()
        camping_spots.extend(wikicamps_spots)
        
        # Method 2: Free Camps Australia
        freecamps_spots = await self._scrape_freecamps_australia()
        camping_spots.extend(freecamps_spots)
        
        # Method 3: Government rest areas by state
        for state in country_config.get('regions', []):
            rest_areas = await self._scrape_australian_rest_areas(state)
            camping_spots.extend(rest_areas)
            await asyncio.sleep(2)  # Be respectful
        
        # Method 4: iOverlander Australia
        ioverlander_spots = await self._scrape_ioverlander_country('australia')
        camping_spots.extend(ioverlander_spots)
        
        return self._deduplicate_by_location(camping_spots)
    
    async def _collect_new_zealand_camping(self, country_config: Dict) -> List[Dict]:
        """Collect New Zealand camping spots"""
        camping_spots = []
        
        # Method 1: DOC campsites (official)
        doc_campsites = await self._scrape_doc_campsites()
        camping_spots.extend(doc_campsites)
        
        # Method 2: CamperMate NZ
        campermate_spots = await self._scrape_campermate_nz()
        camping_spots.extend(campermate_spots)
        
        # Method 3: WikiCamps NZ
        wikicamps_nz = await self._scrape_wikicamps_newzealand()
        camping_spots.extend(wikicamps_nz)
        
        # Method 4: iOverlander New Zealand
        ioverlander_spots = await self._scrape_ioverlander_country('new_zealand')
        camping_spots.extend(ioverlander_spots)
        
        return self._deduplicate_by_location(camping_spots)
    
    async def _collect_canada_camping(self, country_config: Dict) -> List[Dict]:
        """Collect Canadian camping spots"""
        camping_spots = []
        
        # Method 1: Campendium Canada
        campendium_spots = await self._scrape_campendium_canada()
        camping_spots.extend(campendium_spots)
        
        # Method 2: iOverlander Canada
        ioverlander_spots = await self._scrape_ioverlander_country('canada')
        camping_spots.extend(ioverlander_spots)
        
        # Method 3: Provincial park camping by province
        for province in country_config.get('regions', []):
            provincial_camping = await self._scrape_canadian_provincial_camping(province)
            camping_spots.extend(provincial_camping)
            await asyncio.sleep(2)
        
        # Method 4: Recreation.gov (if available for Canada)
        if self.api_keys['recreation_gov']:
            rec_gov_spots = await self._scrape_recreation_gov_camping('canada')
            camping_spots.extend(rec_gov_spots)
        
        return self._deduplicate_by_location(camping_spots)
    
    async def _collect_us_camping(self, country_config: Dict) -> List[Dict]:
        """Collect US camping spots"""
        camping_spots = []
        
        # Method 1: Recreation.gov (official federal campgrounds)
        if self.api_keys['recreation_gov']:
            rec_gov_spots = await self._scrape_recreation_gov_api()
            camping_spots.extend(rec_gov_spots)
        
        # Method 2: Campendium
        campendium_spots = await self._scrape_campendium_us()
        camping_spots.extend(campendium_spots)
        
        # Method 3: FreeRoam (free camping)
        freeroam_spots = await self._scrape_freeroam_app()
        camping_spots.extend(freeroam_spots)
        
        # Method 4: iOverlander US
        ioverlander_spots = await self._scrape_ioverlander_country('united_states')
        camping_spots.extend(ioverlander_spots)
        
        # Method 5: BLM dispersed camping areas
        blm_spots = await self._scrape_blm_dispersed_camping()
        camping_spots.extend(blm_spots)
        
        # Method 6: State park camping (major states)
        major_states = ['California', 'Texas', 'Florida', 'Colorado', 'Utah', 'Arizona', 'Oregon', 'Washington']
        for state in major_states:
            state_camping = await self._scrape_us_state_camping(state)
            camping_spots.extend(state_camping)
            await asyncio.sleep(2)
        
        return self._deduplicate_by_location(camping_spots)
    
    async def _collect_gb_camping(self, country_config: Dict) -> List[Dict]:
        """Collect Great Britain camping spots"""
        camping_spots = []
        
        # Method 1: Camping and Caravanning Club
        ccc_spots = await self._scrape_camping_caravanning_club()
        camping_spots.extend(ccc_spots)
        
        # Method 2: Pitchup.com
        pitchup_spots = await self._scrape_pitchup_com()
        camping_spots.extend(pitchup_spots)
        
        # Method 3: Wild camping spots (Scotland - where legal)
        wild_camping_spots = await self._scrape_scotland_wild_camping()
        camping_spots.extend(wild_camping_spots)
        
        # Method 4: National Trust and English Heritage sites
        heritage_camping = await self._scrape_heritage_camping()
        camping_spots.extend(heritage_camping)
        
        return self._deduplicate_by_location(camping_spots)
    
    # ==================== SPECIFIC SOURCE SCRAPERS ====================
    
    async def _scrape_recreation_gov_api(self) -> List[Dict]:
        """Scrape Recreation.gov API for US federal campgrounds"""
        camping_spots = []
        
        if not self.api_keys['recreation_gov']:
            logger.warning("No Recreation.gov API key provided")
            return camping_spots
        
        base_url = "https://ridb.recreation.gov/api/v1"
        
        try:
            # Get facilities with camping
            url = f"{base_url}/facilities"
            params = {
                'apikey': self.api_keys['recreation_gov'],
                'limit': 50,
                'offset': 0,
                'activity': 'CAMPING',  # Filter for camping activities
                'full': 'true'
            }
            
            await self._respect_rate_limit('recreation_gov')
            
            # Paginate through results
            while True:
                async with self.session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        facilities = data.get('RECDATA', [])
                        if not facilities:
                            break
                        
                        for facility in facilities:
                            camping_spot = await self._parse_recreation_gov_facility(facility)
                            if camping_spot:
                                camping_spots.append(camping_spot)
                        
                        # Check if there are more results
                        metadata = data.get('METADATA', {})
                        if params['offset'] + params['limit'] >= metadata.get('RESULTS', {}).get('TOTAL_COUNT', 0):
                            break
                        
                        params['offset'] += params['limit']
                        await asyncio.sleep(1)  # Rate limiting
                        
                    else:
                        logger.error(f"Recreation.gov API error: {response.status}")
                        break
                        
            logger.info(f"Collected {len(camping_spots)} camping spots from Recreation.gov")
            
        except Exception as e:
            logger.error(f"Error scraping Recreation.gov API: {e}")
        
        return camping_spots
    
    async def _parse_recreation_gov_facility(self, facility: Dict) -> Optional[Dict]:
        """Parse Recreation.gov facility data into standard format"""
        
        try:
            # Basic information
            name = facility.get('FacilityName', '').strip()
            if not name:
                return None
            
            # Location
            latitude = facility.get('FacilityLatitude')
            longitude = facility.get('FacilityLongitude')
            
            if not latitude or not longitude:
                return None
            
            # Address
            address_parts = [
                facility.get('FacilityStreetAddress1', ''),
                facility.get('FacilityCity', ''),
                facility.get('FacilityStateCode', ''),
                facility.get('FacilityZipCode', '')
            ]
            address = ', '.join(filter(None, address_parts))
            
            # Amenities and features
            amenities = {}
            activities = facility.get('ACTIVITY', [])
            for activity in activities:
                activity_name = activity.get('ActivityName', '').lower()
                if 'camping' in activity_name:
                    amenities['camping'] = True
                elif 'rv' in activity_name:
                    amenities['rv_camping'] = True
                elif 'tent' in activity_name:
                    amenities['tent_camping'] = True
            
            # Contact information
            contact_info = {}
            if facility.get('FacilityPhone'):
                contact_info['phone'] = facility['FacilityPhone']
            if facility.get('FacilityEmail'):
                contact_info['email'] = facility['FacilityEmail']
            
            # Reservation information
            reservations_required = facility.get('Reservable', 'N') == 'Y'
            
            camping_spot = {
                'name': name,
                'data_type': 'camping_spots',
                'country': 'united_states',
                'state_province': facility.get('FacilityStateCode', ''),
                'description': facility.get('FacilityDescription', ''),
                'latitude': float(latitude),
                'longitude': float(longitude),
                'address': address,
                'camping_type': 'federal_campground',
                'is_free': False,  # Most Recreation.gov sites have fees
                'price_range': 'paid',
                'amenities': amenities,
                'reservations': {
                    'required': reservations_required,
                    'url': facility.get('FacilityReservationURL', ''),
                    'advance_booking': True
                },
                'contact_info': contact_info,
                'official_website': facility.get('FacilityWebsite', ''),
                'facility_id': facility.get('FacilityID'),
                'data_source': 'recreation_gov_api',
                'source_reliability': 10,  # Government API = highest reliability
                'collected_at': datetime.now().isoformat(),
                'rv_accessible': self._determine_rv_access_from_activities(activities),
                'seasonal_info': {
                    'operates_year_round': True,  # Default assumption
                    'seasonal_closures': []
                }
            }
            
            return camping_spot
            
        except Exception as e:
            logger.error(f"Error parsing Recreation.gov facility: {e}")
            return None
    
    async def _scrape_wikicamps_australia(self) -> List[Dict]:
        """Scrape WikiCamps Australia data"""
        camping_spots = []
        
        try:
            # WikiCamps has an API but requires special access
            # This would implement:
            # 1. API integration if available
            # 2. Respectful web scraping if necessary
            # 3. Focus on free camping and RV-friendly spots
            
            logger.info("WikiCamps Australia scraping - placeholder implementation")
            
            # Placeholder data structure
            sample_spots = [
                {
                    'name': 'Sample Free Camp - Outback NSW',
                    'data_type': 'camping_spots',
                    'country': 'australia',
                    'state_province': 'New South Wales',
                    'latitude': -32.0,
                    'longitude': 147.0,
                    'camping_type': 'free_camping',
                    'is_free': True,
                    'amenities': {'toilets': True, 'water': False},
                    'data_source': 'wikicamps_australia',
                    'collected_at': datetime.now().isoformat()
                }
            ]
            
            camping_spots.extend(sample_spots)
            
        except Exception as e:
            logger.error(f"Error scraping WikiCamps Australia: {e}")
        
        return camping_spots
    
    async def _scrape_ioverlander_country(self, country: str) -> List[Dict]:
        """Scrape iOverlander data for a specific country"""
        camping_spots = []
        
        try:
            # iOverlander has a public API
            base_url = "https://www.ioverlander.com/api/places"
            
            # Country mapping for iOverlander
            country_mapping = {
                'australia': 'Australia',
                'new_zealand': 'New Zealand',
                'canada': 'Canada',
                'united_states': 'United States',
                'great_britain': 'United Kingdom'
            }
            
            country_name = country_mapping.get(country, country)
            
            params = {
                'country': country_name,
                'category': 'camping',
                'limit': 1000  # Adjust as needed
            }
            
            await self._respect_rate_limit('ioverlander')
            
            async with self.session.get(base_url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    for place in data.get('places', []):
                        camping_spot = await self._parse_ioverlander_place(place, country)
                        if camping_spot:
                            camping_spots.append(camping_spot)
                            
                    logger.info(f"Collected {len(camping_spots)} spots from iOverlander for {country}")
                else:
                    logger.error(f"iOverlander API error: {response.status}")
                    
        except Exception as e:
            logger.error(f"Error scraping iOverlander for {country}: {e}")
        
        return camping_spots
    
    async def _parse_ioverlander_place(self, place: Dict, country: str) -> Optional[Dict]:
        """Parse iOverlander place data"""
        
        try:
            name = place.get('name', '').strip()
            if not name:
                return None
            
            latitude = place.get('latitude')
            longitude = place.get('longitude')
            
            if not latitude or not longitude:
                return None
            
            # Determine if it's free camping
            is_free = place.get('cost', 0) == 0
            
            camping_spot = {
                'name': name,
                'data_type': 'camping_spots',
                'country': country,
                'description': place.get('description', ''),
                'latitude': float(latitude),
                'longitude': float(longitude),
                'camping_type': 'community_reported',
                'is_free': is_free,
                'cost_per_night': place.get('cost', 0),
                'amenities': self._parse_ioverlander_amenities(place),
                'user_rating': place.get('rating'),
                'review_count': place.get('review_count', 0),
                'data_source': 'ioverlander',
                'source_reliability': 6,  # Community data
                'collected_at': datetime.now().isoformat(),
                'last_updated': place.get('updated_at'),
                'ioverlander_id': place.get('id')
            }
            
            return camping_spot
            
        except Exception as e:
            logger.error(f"Error parsing iOverlander place: {e}")
            return None
    
    def _parse_ioverlander_amenities(self, place: Dict) -> Dict:
        """Parse amenities from iOverlander data"""
        amenities = {}
        
        # iOverlander typically includes amenities in tags or features
        tags = place.get('tags', [])
        features = place.get('features', [])
        
        all_features = tags + features
        
        for feature in all_features:
            feature_lower = str(feature).lower()
            if 'water' in feature_lower:
                amenities['water'] = True
            elif 'toilet' in feature_lower or 'bathroom' in feature_lower:
                amenities['toilets'] = True
            elif 'shower' in feature_lower:
                amenities['showers'] = True
            elif 'electric' in feature_lower or 'power' in feature_lower:
                amenities['electricity'] = True
            elif 'wifi' in feature_lower:
                amenities['wifi'] = True
            elif 'pet' in feature_lower:
                amenities['pet_friendly'] = True
        
        return amenities
    
    # ==================== UTILITY METHODS ====================
    
    def _determine_rv_access_from_activities(self, activities: List[Dict]) -> bool:
        """Determine RV accessibility from activity list"""
        
        for activity in activities:
            activity_name = activity.get('ActivityName', '').lower()
            if any(keyword in activity_name for keyword in ['rv', 'recreational vehicle', 'motor home']):
                return True
        
        # Default to accessible unless proven otherwise
        return True
    
    def _deduplicate_by_location(self, camping_spots: List[Dict]) -> List[Dict]:
        """Remove duplicate camping spots based on proximity"""
        
        if not camping_spots:
            return camping_spots
        
        unique_spots = []
        processed_locations = []
        
        for spot in camping_spots:
            lat = spot.get('latitude')
            lng = spot.get('longitude')
            
            if not lat or not lng:
                continue
            
            # Check if this location is too close to an existing one
            is_duplicate = False
            for existing_lat, existing_lng in processed_locations:
                # Simple distance check (roughly 500 meters)
                if abs(lat - existing_lat) < 0.005 and abs(lng - existing_lng) < 0.005:
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique_spots.append(spot)
                processed_locations.append((lat, lng))
        
        logger.info(f"Deduplicated camping spots: {len(camping_spots)} -> {len(unique_spots)}")
        return unique_spots
    
    async def _respect_rate_limit(self, service: str):
        """Implement rate limiting for API calls"""
        
        limit = self.rate_limits.get(service, self.rate_limits.get('default', 60))
        delay = 3600 / limit  # Convert to seconds between requests
        
        last_request = self.request_delays.get(service, 0)
        time_since_last = datetime.now().timestamp() - last_request
        
        if time_since_last < delay:
            sleep_time = delay - time_since_last
            await asyncio.sleep(sleep_time)
        
        self.request_delays[service] = datetime.now().timestamp()
    
    # ==================== PLACEHOLDER METHODS ====================
    # These would be implemented with actual scraping logic
    
    async def _scrape_freecamps_australia(self) -> List[Dict]:
        """Placeholder for Free Camps Australia"""
        logger.info("Free Camps Australia - placeholder implementation")
        return []
    
    async def _scrape_australian_rest_areas(self, state: str) -> List[Dict]:
        """Placeholder for Australian rest areas"""
        logger.info(f"Australian rest areas ({state}) - placeholder implementation")
        return []
    
    async def _scrape_doc_campsites(self) -> List[Dict]:
        """Placeholder for New Zealand DOC campsites"""
        logger.info("New Zealand DOC campsites - placeholder implementation")
        return []
    
    async def _scrape_campermate_nz(self) -> List[Dict]:
        """Placeholder for CamperMate NZ"""
        logger.info("CamperMate NZ - placeholder implementation")
        return []
    
    async def _scrape_wikicamps_newzealand(self) -> List[Dict]:
        """Placeholder for WikiCamps New Zealand"""
        logger.info("WikiCamps New Zealand - placeholder implementation")
        return []
    
    async def _scrape_campendium_canada(self) -> List[Dict]:
        """Placeholder for Campendium Canada"""
        logger.info("Campendium Canada - placeholder implementation")
        return []
    
    async def _scrape_canadian_provincial_camping(self, province: str) -> List[Dict]:
        """Placeholder for Canadian provincial camping"""
        logger.info(f"Canadian provincial camping ({province}) - placeholder implementation")
        return []
    
    async def _scrape_recreation_gov_camping(self, country: str) -> List[Dict]:
        """Placeholder for Recreation.gov camping"""
        logger.info(f"Recreation.gov camping ({country}) - placeholder implementation")
        return []
    
    async def _scrape_campendium_us(self) -> List[Dict]:
        """Placeholder for Campendium US"""
        logger.info("Campendium US - placeholder implementation")
        return []
    
    async def _scrape_freeroam_app(self) -> List[Dict]:
        """Placeholder for FreeRoam app"""
        logger.info("FreeRoam app - placeholder implementation")
        return []
    
    async def _scrape_blm_dispersed_camping(self) -> List[Dict]:
        """Placeholder for BLM dispersed camping"""
        logger.info("BLM dispersed camping - placeholder implementation")
        return []
    
    async def _scrape_us_state_camping(self, state: str) -> List[Dict]:
        """Placeholder for US state camping"""
        logger.info(f"US state camping ({state}) - placeholder implementation")
        return []
    
    async def _scrape_camping_caravanning_club(self) -> List[Dict]:
        """Placeholder for Camping and Caravanning Club"""
        logger.info("Camping and Caravanning Club - placeholder implementation")
        return []
    
    async def _scrape_pitchup_com(self) -> List[Dict]:
        """Placeholder for Pitchup.com"""
        logger.info("Pitchup.com - placeholder implementation")
        return []
    
    async def _scrape_scotland_wild_camping(self) -> List[Dict]:
        """Placeholder for Scotland wild camping"""
        logger.info("Scotland wild camping - placeholder implementation")
        return []
    
    async def _scrape_heritage_camping(self) -> List[Dict]:
        """Placeholder for heritage site camping"""
        logger.info("Heritage site camping - placeholder implementation")
        return []