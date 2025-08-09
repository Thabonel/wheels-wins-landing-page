"""
National Parks Scraper Service

Collects comprehensive national park data from government APIs and official sources
across Australia, New Zealand, Canada, US, and Great Britain.

Data Sources:
- Australia: Parks Australia, state park services
- New Zealand: Department of Conservation (DOC)
- Canada: Parks Canada, provincial parks
- US: National Park Service API, state parks
- Great Britain: Natural England, NatureScot, Natural Resources Wales
"""

import asyncio
import aiohttp
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
from geopy.geocoders import Nominatim
from geopy.exc import GeopyError
import re

logger = logging.getLogger(__name__)

class NationalParksScraperService:
    """Service for scraping national parks data from official government sources"""
    
    def __init__(self, countries_config: Dict, sources_config: Dict):
        self.countries_config = countries_config
        self.sources_config = sources_config
        self.session = None
        self.geocoder = Nominatim(user_agent="WheelsWins-DataCollector/1.0")
        
        # API keys from environment
        self.api_keys = {
            'nps': sources_config.get('api_keys', {}).get('nps_api_key'),
            'parks_canada': sources_config.get('api_keys', {}).get('parks_canada_key'),
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
        """Collect all national parks for a country"""
        logger.info(f"Starting national parks collection for {country}")
        
        country_config = self.countries_config['countries'].get(country, {})
        if not country_config:
            logger.error(f"No configuration found for country: {country}")
            return []
        
        all_parks = []
        
        # Use context manager for session
        async with self:
            if country == 'australia':
                parks = await self._collect_australia_parks(country_config)
            elif country == 'new_zealand':
                parks = await self._collect_new_zealand_parks(country_config)
            elif country == 'canada':
                parks = await self._collect_canada_parks(country_config)
            elif country == 'united_states':
                parks = await self._collect_us_parks(country_config)
            elif country == 'great_britain':
                parks = await self._collect_gb_parks(country_config)
            else:
                logger.error(f"Unsupported country: {country}")
                return []
            
            all_parks.extend(parks)
        
        logger.info(f"Collected {len(all_parks)} national parks for {country}")
        return all_parks
    
    async def collect_sample(self, country: str, limit: int = 10) -> List[Dict]:
        """Collect a sample of parks for testing"""
        all_parks = await self.collect_all(country)
        return all_parks[:limit]
    
    async def _collect_australia_parks(self, country_config: Dict) -> List[Dict]:
        """Collect Australian national parks"""
        parks = []
        
        # Method 1: Parks Australia official data
        parks_au_data = await self._scrape_parks_australia()
        parks.extend(parks_au_data)
        
        # Method 2: State park services
        for state in country_config.get('regions', []):
            state_parks = await self._scrape_australian_state_parks(state)
            parks.extend(state_parks)
            await asyncio.sleep(2)  # Be respectful
        
        # Method 3: Wikipedia enhancement
        wikipedia_parks = await self._enhance_with_wikipedia('Australia', 'national park')
        parks.extend(wikipedia_parks)
        
        return self._deduplicate_by_name(parks)
    
    async def _collect_new_zealand_parks(self, country_config: Dict) -> List[Dict]:
        """Collect New Zealand national parks via DOC"""
        parks = []
        
        # Method 1: DOC official API/data
        doc_parks = await self._scrape_doc_nz_parks()
        parks.extend(doc_parks)
        
        # Method 2: Wikipedia enhancement
        wikipedia_parks = await self._enhance_with_wikipedia('New Zealand', 'national park')
        parks.extend(wikipedia_parks)
        
        return self._deduplicate_by_name(parks)
    
    async def _collect_canada_parks(self, country_config: Dict) -> List[Dict]:
        """Collect Canadian national parks"""
        parks = []
        
        # Method 1: Parks Canada API
        if self.api_keys['parks_canada']:
            parks_ca_data = await self._scrape_parks_canada_api()
            parks.extend(parks_ca_data)
        
        # Method 2: Provincial parks by province
        for province in country_config.get('regions', []):
            provincial_parks = await self._scrape_canadian_provincial_parks(province)
            parks.extend(provincial_parks)
            await asyncio.sleep(2)
        
        # Method 3: Wikipedia enhancement
        wikipedia_parks = await self._enhance_with_wikipedia('Canada', 'national park')
        parks.extend(wikipedia_parks)
        
        return self._deduplicate_by_name(parks)
    
    async def _collect_us_parks(self, country_config: Dict) -> List[Dict]:
        """Collect US national parks via NPS API"""
        parks = []
        
        # Method 1: National Park Service API (best source)
        if self.api_keys['nps']:
            nps_parks = await self._scrape_nps_api()
            parks.extend(nps_parks)
        
        # Method 2: Recreation.gov for additional data
        if self.api_keys['recreation_gov']:
            rec_gov_parks = await self._scrape_recreation_gov_api()
            parks.extend(rec_gov_parks)
        
        # Method 3: State parks (sample of major states)
        major_states = ['California', 'Texas', 'Florida', 'New York', 'Colorado', 'Utah', 'Arizona']
        for state in major_states:
            state_parks = await self._scrape_us_state_parks(state)
            parks.extend(state_parks)
            await asyncio.sleep(2)
        
        return self._deduplicate_by_name(parks)
    
    async def _collect_gb_parks(self, country_config: Dict) -> List[Dict]:
        """Collect Great Britain national parks"""
        parks = []
        
        # Method 1: Natural England data
        england_parks = await self._scrape_natural_england_parks()
        parks.extend(england_parks)
        
        # Method 2: NatureScot (Scotland)
        scotland_parks = await self._scrape_naturescot_parks()
        parks.extend(scotland_parks)
        
        # Method 3: Natural Resources Wales
        wales_parks = await self._scrape_nrw_parks()
        parks.extend(wales_parks)
        
        # Method 4: Wikipedia enhancement
        wikipedia_parks = await self._enhance_with_wikipedia('United Kingdom', 'national park')
        parks.extend(wikipedia_parks)
        
        return self._deduplicate_by_name(parks)
    
    # ==================== SPECIFIC API SCRAPERS ====================
    
    async def _scrape_nps_api(self) -> List[Dict]:
        """Scrape National Park Service API (US)"""
        parks = []
        
        if not self.api_keys['nps']:
            logger.warning("No NPS API key provided")
            return parks
        
        base_url = "https://developer.nps.gov/api/v1"
        
        try:
            # Get all parks
            url = f"{base_url}/parks"
            params = {
                'api_key': self.api_keys['nps'],
                'limit': 500,  # NPS has ~400 units
                'fields': 'images,addresses,contacts,entranceFees,operatingHours,activities'
            }
            
            await self._respect_rate_limit('nps')
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    for park_data in data.get('data', []):
                        park = await self._parse_nps_park(park_data)
                        if park:
                            parks.append(park)
                            
                    logger.info(f"Collected {len(parks)} parks from NPS API")
                else:
                    logger.error(f"NPS API error: {response.status}")
                    
        except Exception as e:
            logger.error(f"Error scraping NPS API: {e}")
        
        return parks
    
    async def _parse_nps_park(self, park_data: Dict) -> Optional[Dict]:
        """Parse NPS API park data into standard format"""
        
        try:
            # Extract coordinates
            latitude = longitude = None
            if park_data.get('latitude') and park_data.get('longitude'):
                latitude = float(park_data['latitude'])
                longitude = float(park_data['longitude'])
            
            # Extract address
            address = None
            addresses = park_data.get('addresses', [])
            if addresses:
                addr = addresses[0]  # Use first address
                address = f"{addr.get('line1', '')}, {addr.get('city', '')}, {addr.get('stateCode', '')} {addr.get('postalCode', '')}".strip(', ')
            
            # Extract images
            images = []
            for img in park_data.get('images', [])[:3]:  # Max 3 images
                if img.get('url'):
                    images.append({
                        'url': img['url'],
                        'caption': img.get('caption', ''),
                        'credit': img.get('credit', ''),
                        'title': img.get('title', '')
                    })
            
            # Extract activities
            activities = []
            for activity in park_data.get('activities', []):
                if activity.get('name'):
                    activities.append(activity['name'])
            
            # Extract entrance fees
            entrance_fees = park_data.get('entranceFees', [])
            fee_info = {}
            if entrance_fees:
                fee_info = {
                    'cost': entrance_fees[0].get('cost', '0'),
                    'description': entrance_fees[0].get('description', ''),
                    'title': entrance_fees[0].get('title', '')
                }
            
            # Operating hours
            operating_hours = park_data.get('operatingHours', [])
            hours_info = {}
            if operating_hours:
                hours_info = operating_hours[0].get('standardHours', {})
            
            park = {
                'name': park_data.get('name', '').strip(),
                'data_type': 'national_parks',
                'country': 'united_states',
                'state_province': park_data.get('states', ''),
                'description': park_data.get('description', ''),
                'latitude': latitude,
                'longitude': longitude,
                'address': address,
                'park_code': park_data.get('parkCode', ''),
                'designation': park_data.get('designation', ''),
                'images': images,
                'activities': activities,
                'entrance_fees': fee_info,
                'operating_hours': hours_info,
                'official_website': park_data.get('url', ''),
                'phone': park_data.get('contacts', {}).get('phoneNumbers', [{}])[0].get('phoneNumber', ''),
                'email': park_data.get('contacts', {}).get('emailAddresses', [{}])[0].get('emailAddress', ''),
                'data_source': 'nps_api',
                'source_reliability': 10,  # Government API = highest reliability
                'collected_at': datetime.now().isoformat(),
                'rv_accessible': self._determine_rv_accessibility(park_data),
                'camping_available': self._determine_camping_availability(park_data),
            }
            
            # Only return parks with valid coordinates and names
            if park['name'] and park['latitude'] and park['longitude']:
                return park
            else:
                logger.debug(f"Skipping park with missing data: {park.get('name', 'Unknown')}")
                return None
                
        except Exception as e:
            logger.error(f"Error parsing NPS park data: {e}")
            return None
    
    async def _scrape_parks_australia(self) -> List[Dict]:
        """Scrape Parks Australia data"""
        parks = []
        
        # This would connect to Australian Government Open Data APIs
        # For now, this is a placeholder implementation
        
        try:
            # Example: Australian Environmental Resource Information Network (ERIN)
            # or data.gov.au APIs
            
            # Placeholder for actual implementation
            logger.info("Parks Australia data collection - placeholder implementation")
            
            # This would contain actual API calls to:
            # - data.gov.au
            # - Australian Government Department of Agriculture, Water and the Environment
            # - Individual state park services
            
        except Exception as e:
            logger.error(f"Error scraping Parks Australia: {e}")
        
        return parks
    
    async def _enhance_with_wikipedia(self, country: str, search_term: str) -> List[Dict]:
        """Enhance park data using Wikipedia"""
        parks = []
        
        try:
            # Wikipedia API to search for national parks
            wiki_api_url = "https://en.wikipedia.org/api/rest_v1/page/list/"
            
            # This is a simplified implementation
            # Real implementation would:
            # 1. Search for national parks categories
            # 2. Extract park pages
            # 3. Get coordinates, descriptions, images
            # 4. Parse infoboxes for structured data
            
            logger.info(f"Wikipedia enhancement for {country} {search_term} - placeholder")
            
        except Exception as e:
            logger.error(f"Error enhancing with Wikipedia: {e}")
        
        return parks
    
    # ==================== UTILITY METHODS ====================
    
    def _determine_rv_accessibility(self, park_data: Dict) -> bool:
        """Determine if park is RV accessible based on available data"""
        
        # Look for camping-related activities or amenities
        activities = park_data.get('activities', [])
        for activity in activities:
            activity_name = activity.get('name', '').lower()
            if any(keyword in activity_name for keyword in ['rv', 'camping', 'recreational vehicle']):
                return True
        
        # Default assumption - most national parks have some RV access
        return True
    
    def _determine_camping_availability(self, park_data: Dict) -> bool:
        """Determine if camping is available"""
        
        activities = park_data.get('activities', [])
        for activity in activities:
            activity_name = activity.get('name', '').lower()
            if 'camping' in activity_name:
                return True
        
        # Default assumption for national parks
        return True
    
    def _deduplicate_by_name(self, parks: List[Dict]) -> List[Dict]:
        """Remove duplicate parks based on name similarity"""
        
        if not parks:
            return parks
        
        unique_parks = []
        seen_names = set()
        
        for park in parks:
            name = park.get('name', '').lower().strip()
            if name and name not in seen_names:
                seen_names.add(name)
                unique_parks.append(park)
        
        logger.info(f"Deduplicated: {len(parks)} -> {len(unique_parks)} parks")
        return unique_parks
    
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
    # These would be implemented with actual API calls and scraping logic
    
    async def _scrape_parks_canada_api(self) -> List[Dict]:
        """Placeholder for Parks Canada API"""
        logger.info("Parks Canada API - placeholder implementation")
        return []
    
    async def _scrape_recreation_gov_api(self) -> List[Dict]:
        """Placeholder for Recreation.gov API"""
        logger.info("Recreation.gov API - placeholder implementation")
        return []
    
    async def _scrape_doc_nz_parks(self) -> List[Dict]:
        """Placeholder for New Zealand DOC"""
        logger.info("New Zealand DOC - placeholder implementation")
        return []
    
    async def _scrape_australian_state_parks(self, state: str) -> List[Dict]:
        """Placeholder for Australian state parks"""
        logger.info(f"Australian state parks ({state}) - placeholder implementation")
        return []
    
    async def _scrape_canadian_provincial_parks(self, province: str) -> List[Dict]:
        """Placeholder for Canadian provincial parks"""
        logger.info(f"Canadian provincial parks ({province}) - placeholder implementation")
        return []
    
    async def _scrape_us_state_parks(self, state: str) -> List[Dict]:
        """Placeholder for US state parks"""
        logger.info(f"US state parks ({state}) - placeholder implementation")
        return []
    
    async def _scrape_natural_england_parks(self) -> List[Dict]:
        """Placeholder for Natural England"""
        logger.info("Natural England parks - placeholder implementation")
        return []
    
    async def _scrape_naturescot_parks(self) -> List[Dict]:
        """Placeholder for NatureScot"""
        logger.info("NatureScot parks - placeholder implementation")
        return []
    
    async def _scrape_nrw_parks(self) -> List[Dict]:
        """Placeholder for Natural Resources Wales"""
        logger.info("Natural Resources Wales parks - placeholder implementation")
        return []