#!/usr/bin/env python3
"""
Standalone Trip Template Image Population Script
Fetches and stores images for trip templates without backend dependencies
"""

import os
import sys
import asyncio
import logging
import argparse
import aiohttp
from typing import Dict, Any, Optional, List
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from frontend .env if backend .env doesn't exist
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class StandaloneImageService:
    """Simplified image service that works standalone"""
    
    def __init__(self):
        self.unsplash_key = os.getenv('UNSPLASH_ACCESS_KEY')
        self.mapbox_token = os.getenv('VITE_MAPBOX_TOKEN') or os.getenv('MAPBOX_TOKEN')
        self.session = None
        
        logger.info(f"Image Service initialized:")
        logger.info(f"  - Unsplash: {'Available' if self.unsplash_key else 'Not configured'}")
        logger.info(f"  - Mapbox: {'Available' if self.mapbox_token else 'Not configured'}")
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def get_template_image(self, template_data: Dict[str, Any]) -> Dict[str, str]:
        """Get appropriate image for a template"""
        name = template_data.get('name', '')
        highlights = template_data.get('highlights', [])
        category = template_data.get('category', 'general')
        
        # Try different methods
        image_data = None
        
        # 1. Try Unsplash if available
        if self.unsplash_key and highlights:
            for highlight in highlights[:2]:
                image_data = await self.get_unsplash_image(highlight, category)
                if image_data:
                    break
        
        # 2. Try Mapbox static map
        if not image_data and self.mapbox_token:
            image_data = self.get_mapbox_image(template_data)
        
        # 3. Use default category image
        if not image_data:
            image_data = self.get_default_image(category)
        
        return image_data
    
    async def get_unsplash_image(self, query: str, category: str) -> Optional[Dict[str, str]]:
        """Fetch from Unsplash"""
        if not self.unsplash_key or not self.session:
            return None
        
        try:
            # Enhance query based on category
            if 'coastal' in category:
                query += ' ocean beach'
            elif 'outback' in category:
                query += ' desert outback'
            elif 'mountain' in category:
                query += ' mountains'
            
            url = 'https://api.unsplash.com/search/photos'
            params = {
                'query': query,
                'per_page': 1,
                'orientation': 'landscape'
            }
            headers = {
                'Authorization': f'Client-ID {self.unsplash_key}'
            }
            
            async with self.session.get(url, params=params, headers=headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data['results']:
                        photo = data['results'][0]
                        return {
                            'image_url': photo['urls']['regular'],
                            'thumbnail_url': photo['urls']['small'],
                            'source': 'unsplash'
                        }
        except Exception as e:
            logger.error(f"Unsplash error: {e}")
        
        return None
    
    def get_mapbox_image(self, template_data: Dict[str, Any]) -> Dict[str, str]:
        """Generate Mapbox static map"""
        if not self.mapbox_token:
            return self.get_default_image(template_data.get('category', 'general'))
        
        # Determine coordinates based on template
        name = template_data.get('name', '').lower()
        coords = self.get_coordinates(name, template_data.get('highlights', []))
        
        lat, lon, zoom = coords
        style = 'outdoors-v12'
        
        # Choose style based on category
        category = template_data.get('category', '')
        if 'coastal' in category:
            style = 'satellite-streets-v12'
        elif 'outback' in category:
            style = 'satellite-v9'
        
        # Create URLs
        marker = f'pin-l-park+3b82f6({lon},{lat})'
        base_url = f'https://api.mapbox.com/styles/v1/mapbox/{style}/static'
        
        image_url = f'{base_url}/{marker}/{lon},{lat},{zoom},0/800x400@2x?access_token={self.mapbox_token}'
        thumb_url = f'{base_url}/{marker}/{lon},{lat},{zoom},0/400x200@2x?access_token={self.mapbox_token}'
        
        return {
            'image_url': image_url,
            'thumbnail_url': thumb_url,
            'source': 'mapbox'
        }
    
    def get_coordinates(self, name: str, highlights: List[str]) -> tuple:
        """Get coordinates for location"""
        # Location mapping
        locations = {
            'great ocean road': (-38.6662, 143.1044, 9),
            'twelve apostles': (-38.6662, 143.1044, 11),
            'big lap': (-25.2744, 133.7751, 4),
            'uluru': (-25.3444, 131.0369, 10),
            'red centre': (-25.3444, 131.0369, 9),
            'great barrier reef': (-18.2871, 147.6992, 8),
            'byron bay': (-28.6434, 153.6122, 11),
            'east coast': (-28.0167, 153.4000, 7),
            'tasmania': (-41.4545, 145.9707, 7),
            'cradle mountain': (-41.6818, 145.9369, 11),
            'savannah way': (-15.7731, 128.7322, 7),
            'kakadu': (-12.8375, 132.9028, 9),
        }
        
        # Check name
        for loc, coords in locations.items():
            if loc in name:
                return coords
        
        # Check highlights
        for highlight in highlights:
            for loc, coords in locations.items():
                if loc in highlight.lower():
                    return coords
        
        # Default to Australia overview
        return (-25.2744, 133.7751, 4)
    
    def get_default_image(self, category: str) -> Dict[str, str]:
        """Get default image by category"""
        defaults = {
            'coastal': 'https://images.unsplash.com/photo-1527004013197-933c4bb611b3',
            'outback': 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963',
            'mountain': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
            'general': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800'
        }
        
        url = defaults.get(category, defaults['general'])
        return {
            'image_url': f'{url}?w=800&q=80',
            'thumbnail_url': f'{url}?w=400&q=60',
            'source': 'default'
        }


class ImagePopulator:
    """Main populator class"""
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        
        # Get Supabase credentials
        self.supabase_url = os.getenv('VITE_SUPABASE_URL') or os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Missing Supabase credentials in environment")
        
        logger.info(f"Connecting to Supabase: {self.supabase_url[:30]}...")
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        self.image_service = StandaloneImageService()
        self.stats = {'total': 0, 'updated': 0, 'failed': 0}
    
    def fetch_templates(self) -> List[Dict[str, Any]]:
        """Fetch templates from database"""
        try:
            response = self.supabase.table('trip_templates').select('*').execute()
            templates = response.data
            logger.info(f"Fetched {len(templates)} templates")
            return templates
        except Exception as e:
            logger.error(f"Failed to fetch templates: {e}")
            return []
    
    def extract_template_data(self, template: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and prepare template data"""
        # Get nested template_data if exists
        template_data = template.get('template_data', {})
        
        # Extract highlights
        highlights = template_data.get('highlights', [])
        
        # Add highlights based on name
        name = template.get('name', '').lower()
        if 'great ocean road' in name:
            highlights = ['Twelve Apostles', 'Port Campbell'] + highlights
        elif 'big lap' in name:
            highlights = ['Around Australia', 'Uluru', 'Great Barrier Reef'] + highlights
        elif 'red centre' in name:
            highlights = ['Uluru', 'Kings Canyon'] + highlights
        elif 'east coast' in name:
            highlights = ['Great Barrier Reef', 'Byron Bay'] + highlights
        elif 'tasmania' in name:
            highlights = ['Cradle Mountain', 'Wineglass Bay'] + highlights
        elif 'savannah way' in name:
            highlights = ['Kakadu National Park', 'Katherine Gorge'] + highlights
        
        return {
            'name': template.get('name', ''),
            'category': template.get('category', 'general'),
            'highlights': highlights[:5]  # Limit to 5
        }
    
    async def process_template(self, template: Dict[str, Any]) -> bool:
        """Process single template"""
        name = template.get('name', 'Unknown')
        template_id = template['id']
        
        # Skip if already has image (unless force update)
        if template.get('image_url'):
            logger.info(f"  ⏩ Skipping {name} (has image)")
            return False
        
        logger.info(f"  Processing {name}...")
        
        try:
            # Extract data
            data = self.extract_template_data(template)
            
            # Get image
            async with self.image_service:
                image_data = await self.image_service.get_template_image(data)
            
            if not image_data:
                logger.warning(f"    ❌ No image found")
                self.stats['failed'] += 1
                return False
            
            logger.info(f"    ✓ Found image from {image_data.get('source', 'unknown')}")
            
            if not self.dry_run:
                # Update database
                update = {
                    'image_url': image_data['image_url'],
                    'thumbnail_url': image_data.get('thumbnail_url', image_data['image_url'])
                }
                
                response = self.supabase.table('trip_templates').update(update).eq('id', template_id).execute()
                
                if response.data:
                    logger.info(f"    ✅ Updated database")
                    self.stats['updated'] += 1
                    return True
                else:
                    logger.error(f"    ❌ Database update failed")
                    self.stats['failed'] += 1
            else:
                logger.info(f"    🔍 [DRY RUN] Would update database")
                self.stats['updated'] += 1
                return True
                
        except Exception as e:
            logger.error(f"    ❌ Error: {e}")
            self.stats['failed'] += 1
        
        return False
    
    async def run(self):
        """Run the population process"""
        logger.info("=" * 60)
        logger.info("TRIP TEMPLATE IMAGE POPULATION")
        logger.info("=" * 60)
        
        templates = self.fetch_templates()
        if not templates:
            logger.error("No templates found")
            return
        
        self.stats['total'] = len(templates)
        
        # Process each
        for i, template in enumerate(templates, 1):
            logger.info(f"\n[{i}/{len(templates)}]")
            await self.process_template(template)
            await asyncio.sleep(0.2)  # Rate limiting
        
        # Summary
        logger.info("\n" + "=" * 60)
        logger.info("SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total: {self.stats['total']}")
        logger.info(f"Updated: {self.stats['updated']}")
        logger.info(f"Failed: {self.stats['failed']}")
        
        if self.dry_run:
            logger.info("\n🔍 DRY RUN - No changes made")


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='Test without updating')
    args = parser.parse_args()
    
    try:
        populator = ImagePopulator(dry_run=args.dry_run)
        await populator.run()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())