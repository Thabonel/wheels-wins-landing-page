"""
Camping Site Web Scraper Service
Scrapes free camping locations from various sources to populate the database
"""

import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Optional
import aiohttp
from bs4 import BeautifulSoup
import json
from decimal import Decimal

from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)


class CampingScraperService:
    """Service for scraping camping location data from various sources"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.session = None
        self.headers = {
            'User-Agent': 'Wheels&Wins Bot 1.0 (Camping Data Aggregator)'
        }
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(headers=self.headers)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def scrape_freecampsites_net(self, state: str = None) -> List[Dict]:
        """
        Scrape free camping locations from FreeCampsites.net
        This is for US locations primarily
        """
        camping_sites = []
        base_url = "https://freecampsites.net"
        
        try:
            # Note: This is a simplified example. Real implementation would need to:
            # 1. Respect robots.txt
            # 2. Add delays between requests
            # 3. Handle pagination
            # 4. Parse actual HTML structure
            
            if state:
                url = f"{base_url}/state/{state.lower()}"
            else:
                url = f"{base_url}/free-camping"
                
            async with self.session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # This is a placeholder - actual parsing would depend on site structure
                    # Example structure:
                    camp_listings = soup.find_all('div', class_='camp-listing')
                    
                    for listing in camp_listings:
                        site_data = {
                            'name': listing.find('h3').text.strip() if listing.find('h3') else 'Unknown',
                            'type': 'free_camping',
                            'latitude': float(listing.get('data-lat', 0)),
                            'longitude': float(listing.get('data-lng', 0)),
                            'address': listing.find('span', class_='address').text.strip() if listing.find('span', class_='address') else None,
                            'is_free': True,
                            'price_per_night': 0,
                            'amenities': self._parse_amenities(listing),
                            'source_url': base_url + listing.find('a')['href'] if listing.find('a') else url,
                            'last_scraped': datetime.utcnow().isoformat()
                        }
                        
                        if site_data['latitude'] and site_data['longitude']:
                            camping_sites.append(site_data)
                            
                    logger.info(f"Scraped {len(camping_sites)} free camping sites from {url}")
                    
        except Exception as e:
            logger.error(f"Error scraping FreeCampsites.net: {str(e)}")
            
        return camping_sites
    
    async def scrape_blm_dispersed_camping(self) -> List[Dict]:
        """
        Scrape BLM (Bureau of Land Management) dispersed camping areas
        These are typically free camping on federal land
        """
        camping_sites = []
        
        # BLM provides data through their API
        blm_api_url = "https://www.blm.gov/api/camping/dispersed"
        
        try:
            # This is a placeholder - actual BLM API would have different structure
            async with self.session.get(blm_api_url) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    for area in data.get('camping_areas', []):
                        site_data = {
                            'name': area.get('name', 'BLM Dispersed Camping'),
                            'type': 'blm_dispersed',
                            'latitude': area.get('coordinates', {}).get('lat'),
                            'longitude': area.get('coordinates', {}).get('lng'),
                            'address': area.get('location_description'),
                            'is_free': True,
                            'price_per_night': 0,
                            'max_rig_length': area.get('max_vehicle_length'),
                            'amenities': {
                                'dispersed_camping': True,
                                'no_services': True,
                                'leave_no_trace': True
                            },
                            'seasonal_info': area.get('seasonal_restrictions'),
                            'source_url': f"https://www.blm.gov/camping/{area.get('id')}",
                            'last_scraped': datetime.utcnow().isoformat()
                        }
                        
                        if site_data['latitude'] and site_data['longitude']:
                            camping_sites.append(site_data)
                            
        except Exception as e:
            logger.error(f"Error scraping BLM data: {str(e)}")
            
        return camping_sites
    
    async def scrape_australian_free_camps(self) -> List[Dict]:
        """
        Scrape Australian free camping locations
        Would integrate with local council websites and forums
        """
        camping_sites = []
        
        # Example sources for Australian free camps:
        # - Local council rest areas
        # - State forest camping areas
        # - Showgrounds that allow camping
        
        # This is a placeholder implementation
        sources = [
            "https://example-council.gov.au/rest-areas",
            "https://parks.nsw.gov.au/free-camping"
        ]
        
        for source_url in sources:
            try:
                # Add delay to be respectful
                await asyncio.sleep(1)
                
                # Actual implementation would parse each source differently
                # This is just a template
                
            except Exception as e:
                logger.error(f"Error scraping {source_url}: {str(e)}")
                
        return camping_sites
    
    def _parse_amenities(self, listing_element) -> Dict:
        """Parse amenities from a listing element"""
        amenities = {}
        
        # Look for common amenity indicators
        amenity_icons = listing_element.find_all('i', class_='amenity-icon')
        
        for icon in amenity_icons:
            if 'toilet' in icon.get('class', []):
                amenities['toilets'] = True
            elif 'water' in icon.get('class', []):
                amenities['water'] = True
            elif 'fire' in icon.get('class', []):
                amenities['fire_allowed'] = True
            elif 'pet' in icon.get('class', []):
                amenities['pet_friendly'] = True
                
        return amenities
    
    async def update_database(self, camping_sites: List[Dict]) -> int:
        """Update the database with scraped camping sites"""
        updated_count = 0
        
        for site in camping_sites:
            try:
                # Check if site already exists based on coordinates
                existing = self.supabase.table('camping_locations').select('id').eq(
                    'latitude', site['latitude']
                ).eq(
                    'longitude', site['longitude']
                ).execute()
                
                if existing.data:
                    # Update existing record
                    result = self.supabase.table('camping_locations').update({
                        'is_free': site.get('is_free', False),
                        'source_url': site.get('source_url'),
                        'last_scraped': site.get('last_scraped'),
                        'amenities': site.get('amenities', {}),
                        'updated_at': datetime.utcnow().isoformat()
                    }).eq('id', existing.data[0]['id']).execute()
                else:
                    # Insert new record
                    result = self.supabase.table('camping_locations').insert(site).execute()
                    
                if result.data:
                    updated_count += 1
                    
            except Exception as e:
                logger.error(f"Error updating database for site {site.get('name')}: {str(e)}")
                
        return updated_count
    
    async def run_full_scrape(self) -> Dict[str, int]:
        """Run a full scraping session across all sources"""
        results = {
            'freecampsites_net': 0,
            'blm': 0,
            'australia': 0,
            'total': 0
        }
        
        logger.info("Starting full camping scrape session")
        
        # Scrape US free camping sites
        us_sites = await self.scrape_freecampsites_net()
        if us_sites:
            count = await self.update_database(us_sites)
            results['freecampsites_net'] = count
            results['total'] += count
            
        # Add delay between sources
        await asyncio.sleep(2)
        
        # Scrape BLM dispersed camping
        blm_sites = await self.scrape_blm_dispersed_camping()
        if blm_sites:
            count = await self.update_database(blm_sites)
            results['blm'] = count
            results['total'] += count
            
        # Add delay between sources
        await asyncio.sleep(2)
        
        # Scrape Australian sites
        au_sites = await self.scrape_australian_free_camps()
        if au_sites:
            count = await self.update_database(au_sites)
            results['australia'] = count
            results['total'] += count
            
        logger.info(f"Scraping session complete. Results: {results}")
        
        return results


# Scheduled task function
async def run_camping_scraper():
    """Run the camping scraper as a scheduled task"""
    async with CampingScraperService() as scraper:
        results = await scraper.run_full_scrape()
        
        # Log results to database for monitoring
        try:
            supabase = get_supabase_client()
            supabase.table('scraping_logs').insert({
                'scraper_name': 'camping_locations',
                'results': results,
                'completed_at': datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Error logging scraper results: {str(e)}")
            
        return results