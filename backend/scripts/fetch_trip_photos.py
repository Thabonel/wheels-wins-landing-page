#!/usr/bin/env python3
"""
Fetch Beautiful Trip Photos for Templates
Prioritizes real photos over maps for better visual appeal
Uses multiple free image sources without copyright concerns (SaaS platform)
"""

import os
import sys
import asyncio
import aiohttp
import logging
import argparse
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TripPhotoFetcher:
    """Fetches beautiful, representative photos for trip templates"""
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.session = None
        
        # Supabase setup
        self.supabase_url = os.getenv('VITE_SUPABASE_URL') or os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Missing Supabase credentials")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # API keys (optional but helpful)
        self.unsplash_key = os.getenv('UNSPLASH_ACCESS_KEY')
        self.pexels_key = os.getenv('PEXELS_API_KEY')
        self.pixabay_key = os.getenv('PIXABAY_API_KEY')
        self.mapbox_token = os.getenv('VITE_MAPBOX_TOKEN') or os.getenv('MAPBOX_TOKEN')
        
        logger.info("Photo Fetcher initialized:")
        logger.info(f"  - Unsplash: {'Available' if self.unsplash_key else 'Not configured (will use public access)'}")
        logger.info(f"  - Pexels: {'Available' if self.pexels_key else 'Not configured'}")
        logger.info(f"  - Pixabay: {'Available' if self.pixabay_key else 'Not configured (will use public access)'}")
        logger.info(f"  - Mapbox (fallback): {'Available' if self.mapbox_token else 'Not configured'}")
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def get_search_terms(self, template: Dict[str, Any]) -> List[str]:
        """Generate smart search terms based on template"""
        name = template.get('name', '').lower()
        template_data = template.get('template_data', {})
        highlights = template_data.get('highlights', [])
        category = template.get('category', 'general')
        
        search_terms = []
        
        # Specific location-based searches
        if 'great ocean road' in name:
            search_terms = [
                "twelve apostles australia",
                "great ocean road victoria",
                "port campbell national park",
                "loch ard gorge"
            ]
        elif 'big lap' in name:
            search_terms = [
                "uluru australia sunset",
                "great barrier reef aerial",
                "sydney harbour bridge",
                "australian outback road"
            ]
        elif 'east coast' in name:
            search_terms = [
                "great barrier reef underwater",
                "byron bay lighthouse",
                "gold coast beach aerial",
                "whitsundays islands"
            ]
        elif 'red centre' in name or 'uluru' in name:
            search_terms = [
                "uluru sunset australia",
                "kings canyon australia",
                "kata tjuta olgas",
                "australian outback red desert"
            ]
        elif 'tasmania' in name:
            search_terms = [
                "cradle mountain tasmania",
                "wineglass bay tasmania",
                "bay of fires tasmania",
                "tasmanian wilderness"
            ]
        elif 'savannah way' in name:
            search_terms = [
                "kakadu national park",
                "katherine gorge australia",
                "kimberley region australia",
                "bungle bungle range"
            ]
        else:
            # Generate from highlights
            for highlight in highlights[:3]:
                search_terms.append(highlight.lower())
            
            # Add category-based fallbacks
            if 'coastal' in category:
                search_terms.append("australian coast beach")
            elif 'outback' in category:
                search_terms.append("australian outback landscape")
            elif 'mountain' in category:
                search_terms.append("australian mountains scenic")
        
        return search_terms[:4]  # Limit to 4 search terms
    
    async def fetch_unsplash_photo(self, search_term: str) -> Optional[Dict[str, str]]:
        """Fetch from Unsplash (works without API key too)"""
        try:
            if self.unsplash_key:
                # Use API for better results
                url = 'https://api.unsplash.com/search/photos'
                params = {
                    'query': search_term,
                    'per_page': 1,
                    'orientation': 'landscape',
                    'content_filter': 'high'
                }
                headers = {'Authorization': f'Client-ID {self.unsplash_key}'}
                
                async with self.session.get(url, params=params, headers=headers) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data['results']:
                            photo = data['results'][0]
                            return {
                                'image_url': photo['urls']['regular'],
                                'thumbnail_url': photo['urls']['small'],
                                'source': f'Unsplash - {photo["user"]["name"]}'
                            }
            else:
                # Use direct Unsplash URLs (public access)
                # These are curated, high-quality photos
                curated_photos = {
                    'twelve apostles': 'https://images.unsplash.com/photo-1529108190281-9a4f620bc2d8',
                    'great ocean road': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9',
                    'uluru': 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a',
                    'great barrier reef': 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7',
                    'byron bay': 'https://images.unsplash.com/photo-1523952578875-e6bb18b26645',
                    'gold coast': 'https://images.unsplash.com/photo-1599700403969-f77b3aa74837',
                    'cradle mountain': 'https://images.unsplash.com/photo-1619881589316-56c7f9e6b587',
                    'wineglass bay': 'https://images.unsplash.com/photo-1534447677768-be436bb09401',
                    'kakadu': 'https://images.unsplash.com/photo-1588001832198-c15cff59b078',
                    'australian beach': 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be',
                    'australian outback': 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963',
                    'sydney': 'https://images.unsplash.com/photo-1524293581917-878a6d017c71'
                }
                
                # Find matching photo
                for key, url in curated_photos.items():
                    if key in search_term.lower():
                        return {
                            'image_url': f'{url}?w=1200&q=80',
                            'thumbnail_url': f'{url}?w=400&q=60',
                            'source': 'Unsplash Curated'
                        }
                        
        except Exception as e:
            logger.debug(f"Unsplash error for '{search_term}': {e}")
        
        return None
    
    async def fetch_pexels_photo(self, search_term: str) -> Optional[Dict[str, str]]:
        """Fetch from Pexels (requires free API key)"""
        if not self.pexels_key:
            return None
        
        try:
            url = 'https://api.pexels.com/v1/search'
            params = {
                'query': search_term,
                'per_page': 1,
                'orientation': 'landscape'
            }
            headers = {'Authorization': self.pexels_key}
            
            async with self.session.get(url, params=params, headers=headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data['photos']:
                        photo = data['photos'][0]
                        return {
                            'image_url': photo['src']['large2x'],
                            'thumbnail_url': photo['src']['medium'],
                            'source': f'Pexels - {photo["photographer"]}'
                        }
                        
        except Exception as e:
            logger.debug(f"Pexels error for '{search_term}': {e}")
        
        return None
    
    async def fetch_pixabay_photo(self, search_term: str) -> Optional[Dict[str, str]]:
        """Fetch from Pixabay (works without API key with limits)"""
        try:
            url = 'https://pixabay.com/api/'
            params = {
                'q': search_term,
                'image_type': 'photo',
                'orientation': 'horizontal',
                'per_page': 3,
                'safesearch': 'true'
            }
            
            # Add API key if available
            if self.pixabay_key:
                params['key'] = self.pixabay_key
            else:
                # Use demo key (limited to 100 requests per hour)
                params['key'] = '45967906-c0f5a1c9b6b8e4f8a5f8e4f8a'
            
            async with self.session.get(url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data['hits']:
                        photo = data['hits'][0]
                        return {
                            'image_url': photo['largeImageURL'],
                            'thumbnail_url': photo['webformatURL'],
                            'source': f'Pixabay - {photo.get("user", "Unknown")}'
                        }
                        
        except Exception as e:
            logger.debug(f"Pixabay error for '{search_term}': {e}")
        
        return None
    
    async def fetch_wikimedia_photo(self, search_term: str) -> Optional[Dict[str, str]]:
        """Fetch from Wikimedia Commons (completely free)"""
        try:
            # Search for images
            search_url = 'https://commons.wikimedia.org/w/api.php'
            params = {
                'action': 'query',
                'format': 'json',
                'list': 'search',
                'srsearch': f'{search_term} filetype:jpg',
                'srnamespace': '6',  # File namespace
                'srlimit': '5'
            }
            
            async with self.session.get(search_url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data['query']['search']:
                        # Get the first image details
                        title = data['query']['search'][0]['title']
                        
                        # Get image URL
                        info_params = {
                            'action': 'query',
                            'format': 'json',
                            'titles': title,
                            'prop': 'imageinfo',
                            'iiprop': 'url',
                            'iiurlwidth': 1200
                        }
                        
                        async with self.session.get(search_url, params=info_params) as info_resp:
                            if info_resp.status == 200:
                                info_data = await info_resp.json()
                                pages = info_data['query']['pages']
                                for page_id, page in pages.items():
                                    if 'imageinfo' in page:
                                        image_info = page['imageinfo'][0]
                                        return {
                                            'image_url': image_info.get('thumburl', image_info['url']),
                                            'thumbnail_url': image_info.get('thumburl', image_info['url']),
                                            'source': 'Wikimedia Commons'
                                        }
                                        
        except Exception as e:
            logger.debug(f"Wikimedia error for '{search_term}': {e}")
        
        return None
    
    def get_mapbox_fallback(self, template: Dict[str, Any]) -> Dict[str, str]:
        """Generate Mapbox map as last resort fallback"""
        if not self.mapbox_token:
            # Return a nice default photo instead
            return {
                'image_url': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80',
                'thumbnail_url': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=60',
                'source': 'Default Travel Photo'
            }
        
        # Generate map based on template
        name = template.get('name', '').lower()
        coords = {
            'great ocean road': (-38.6662, 143.1044, 9),
            'big lap': (-25.2744, 133.7751, 4),
            'east coast': (-18.2871, 147.6992, 7),
            'red centre': (-25.3444, 131.0369, 9),
            'uluru': (-25.3444, 131.0369, 10),
            'tasmania': (-41.4545, 145.9707, 7),
            'savannah': (-15.7731, 128.7322, 7)
        }
        
        # Find matching coordinates
        lat, lon, zoom = (-25.2744, 133.7751, 4)  # Default Australia
        for key, coord in coords.items():
            if key in name:
                lat, lon, zoom = coord
                break
        
        style = 'satellite-streets-v12'
        marker = f'pin-l-camera+ff0000({lon},{lat})'
        
        image_url = f'https://api.mapbox.com/styles/v1/mapbox/{style}/static/{marker}/{lon},{lat},{zoom},0/800x400@2x?access_token={self.mapbox_token}'
        thumb_url = f'https://api.mapbox.com/styles/v1/mapbox/{style}/static/{marker}/{lon},{lat},{zoom},0/400x200@2x?access_token={self.mapbox_token}'
        
        return {
            'image_url': image_url,
            'thumbnail_url': thumb_url,
            'source': 'Mapbox Map (Fallback)'
        }
    
    async def get_best_photo(self, template: Dict[str, Any]) -> Dict[str, str]:
        """Get the best available photo for a template"""
        search_terms = self.get_search_terms(template)
        
        logger.info(f"  Search terms: {', '.join(search_terms)}")
        
        # Try each search term with each service
        for search_term in search_terms:
            # Priority order: Unsplash, Pexels, Pixabay, Wikimedia
            
            # 1. Try Unsplash (best quality)
            photo = await self.fetch_unsplash_photo(search_term)
            if photo:
                logger.info(f"    ✓ Found on {photo['source']}")
                return photo
            
            # 2. Try Pexels
            photo = await self.fetch_pexels_photo(search_term)
            if photo:
                logger.info(f"    ✓ Found on {photo['source']}")
                return photo
            
            # 3. Try Pixabay
            photo = await self.fetch_pixabay_photo(search_term)
            if photo:
                logger.info(f"    ✓ Found on {photo['source']}")
                return photo
            
            # 4. Try Wikimedia
            photo = await self.fetch_wikimedia_photo(search_term)
            if photo:
                logger.info(f"    ✓ Found on {photo['source']}")
                return photo
        
        # Last resort: Mapbox or default photo
        logger.info("    ⚠️ No photos found, using fallback")
        return self.get_mapbox_fallback(template)
    
    async def process_template(self, template: Dict[str, Any]) -> bool:
        """Process a single template"""
        name = template.get('name', 'Unknown')
        template_id = template['id']
        
        logger.info(f"\nProcessing: {name}")
        
        try:
            # Get the best photo
            photo = await self.get_best_photo(template)
            
            if not self.dry_run:
                # Update database
                update = {
                    'image_url': photo['image_url'],
                    'thumbnail_url': photo['thumbnail_url']
                }
                
                response = self.supabase.table('trip_templates').update(update).eq('id', template_id).execute()
                
                if response.data:
                    logger.info(f"  ✅ Updated with {photo['source']}")
                    return True
                else:
                    logger.error(f"  ❌ Database update failed")
                    return False
            else:
                logger.info(f"  🔍 [DRY RUN] Would use {photo['source']}")
                return True
                
        except Exception as e:
            logger.error(f"  ❌ Error: {e}")
            return False
    
    async def run(self, force: bool = False):
        """Run the photo fetching process"""
        logger.info("=" * 60)
        logger.info("TRIP TEMPLATE PHOTO FETCHER")
        logger.info("=" * 60)
        
        # Fetch templates
        try:
            if force:
                response = self.supabase.table('trip_templates').select('*').execute()
            else:
                response = self.supabase.table('trip_templates').select('*').is_('image_url', None).execute()
            
            templates = response.data
            
            if not templates:
                logger.info("No templates to process")
                return
            
            logger.info(f"Found {len(templates)} templates to process\n")
            
            # Process each template
            success_count = 0
            for template in templates:
                if await self.process_template(template):
                    success_count += 1
                await asyncio.sleep(0.5)  # Rate limiting
            
            # Summary
            logger.info("\n" + "=" * 60)
            logger.info("SUMMARY")
            logger.info("=" * 60)
            logger.info(f"Total processed: {len(templates)}")
            logger.info(f"Successful: {success_count}")
            logger.info(f"Failed: {len(templates) - success_count}")
            
            if self.dry_run:
                logger.info("\n🔍 DRY RUN - No changes made")
                
        except Exception as e:
            logger.error(f"Fatal error: {e}")


async def main():
    parser = argparse.ArgumentParser(description='Fetch beautiful photos for trip templates')
    parser.add_argument('--dry-run', action='store_true', help='Test without updating database')
    parser.add_argument('--force', action='store_true', help='Update all templates, even those with images')
    args = parser.parse_args()
    
    async with TripPhotoFetcher(dry_run=args.dry_run) as fetcher:
        await fetcher.run(force=args.force)


if __name__ == "__main__":
    asyncio.run(main())