#!/usr/bin/env python3
"""
Populate Trip Template Images Script
Automatically fetches and stores appropriate images for all trip templates
Uses multiple sources: Wikipedia, Unsplash, Mapbox static maps
"""

import os
import sys
import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import argparse

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Supabase client
from supabase import create_client, Client
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('populate_images.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Import the ImageService
from app.services.images.image_service import ImageService


class TripTemplateImagePopulator:
    """Populates trip templates with appropriate images from various sources"""
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.image_service = ImageService()
        self.stats = {
            'total': 0,
            'processed': 0,
            'updated': 0,
            'skipped': 0,
            'failed': 0
        }
        
        # Check for API keys
        self.unsplash_key = os.getenv('UNSPLASH_ACCESS_KEY')
        self.mapbox_token = os.getenv('MAPBOX_TOKEN') or os.getenv('VITE_MAPBOX_TOKEN')
        
        logger.info(f"Initialized with:")
        logger.info(f"  - Dry run: {dry_run}")
        logger.info(f"  - Unsplash API: {'Available' if self.unsplash_key else 'Not configured'}")
        logger.info(f"  - Mapbox API: {'Available' if self.mapbox_token else 'Not configured'}")
    
    async def fetch_templates_without_images(self) -> List[Dict[str, Any]]:
        """Fetch all templates that don't have images"""
        try:
            # Query templates without images
            response = self.supabase.table('trip_templates').select('*').is_('image_url', None).execute()
            
            templates = response.data
            logger.info(f"Found {len(templates)} templates without images")
            
            return templates
        except Exception as e:
            logger.error(f"Error fetching templates: {e}")
            return []
    
    async def fetch_all_templates(self) -> List[Dict[str, Any]]:
        """Fetch all templates (for forced update)"""
        try:
            response = self.supabase.table('trip_templates').select('*').execute()
            templates = response.data
            logger.info(f"Found {len(templates)} total templates")
            return templates
        except Exception as e:
            logger.error(f"Error fetching templates: {e}")
            return []
    
    def prepare_template_data(self, template: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare template data for image service"""
        # Extract template_data if it exists (nested JSON)
        template_data = template.get('template_data', {})
        
        # Combine data from both levels
        prepared = {
            'name': template.get('name', ''),
            'description': template.get('description', ''),
            'category': template.get('category', 'general'),
            'region': template_data.get('region', 'Australia'),
            'highlights': template_data.get('highlights', []),
            'tags': template.get('tags', [])
        }
        
        # Parse specific template names for better image matching
        name_lower = prepared['name'].lower()
        
        # Add specific highlights based on template name
        if 'great ocean road' in name_lower:
            prepared['highlights'] = ['Twelve Apostles', 'Port Campbell', 'Lorne Beach'] + prepared['highlights']
        elif 'big lap' in name_lower:
            prepared['highlights'] = ['Australia circumnavigation', 'Uluru', 'Great Barrier Reef'] + prepared['highlights']
        elif 'east coast' in name_lower:
            prepared['highlights'] = ['Great Barrier Reef', 'Byron Bay', 'Gold Coast'] + prepared['highlights']
        elif 'red centre' in name_lower:
            prepared['highlights'] = ['Uluru', 'Kings Canyon', 'Alice Springs'] + prepared['highlights']
        elif 'tasmania' in name_lower:
            prepared['highlights'] = ['Cradle Mountain', 'Wineglass Bay', 'Port Arthur'] + prepared['highlights']
        elif 'savannah way' in name_lower:
            prepared['highlights'] = ['Kakadu National Park', 'Katherine Gorge', 'Kimberley'] + prepared['highlights']
        
        return prepared
    
    async def process_template(self, template: Dict[str, Any]) -> bool:
        """Process a single template to fetch and store images"""
        template_id = template['id']
        template_name = template['name']
        
        logger.info(f"Processing: {template_name}")
        
        try:
            # Prepare template data for image service
            template_data = self.prepare_template_data(template)
            
            # Get image using the image service
            async with self.image_service:
                image_data = await self.image_service.get_trip_template_image(template_data)
            
            if not image_data or not image_data.get('image_url'):
                logger.warning(f"  ⚠️ No image found for {template_name}")
                self.stats['failed'] += 1
                return False
            
            logger.info(f"  ✓ Found image from {image_data.get('image_source', 'unknown')}")
            logger.info(f"    Image URL: {image_data['image_url'][:50]}...")
            
            if not self.dry_run:
                # Update the database
                update_data = {
                    'image_url': image_data['image_url'],
                    'thumbnail_url': image_data.get('thumbnail_url', image_data['image_url']),
                    'updated_at': datetime.utcnow().isoformat()
                }
                
                response = self.supabase.table('trip_templates').update(update_data).eq('id', template_id).execute()
                
                if response.data:
                    logger.info(f"  ✅ Updated database for {template_name}")
                    self.stats['updated'] += 1
                    return True
                else:
                    logger.error(f"  ❌ Failed to update database for {template_name}")
                    self.stats['failed'] += 1
                    return False
            else:
                logger.info(f"  🔍 [DRY RUN] Would update {template_name}")
                self.stats['updated'] += 1
                return True
                
        except Exception as e:
            logger.error(f"  ❌ Error processing {template_name}: {e}")
            self.stats['failed'] += 1
            return False
    
    async def run(self, force_update: bool = False):
        """Run the image population process"""
        logger.info("=" * 60)
        logger.info("Starting Trip Template Image Population")
        logger.info("=" * 60)
        
        # Fetch templates
        if force_update:
            templates = await self.fetch_all_templates()
        else:
            templates = await self.fetch_templates_without_images()
        
        if not templates:
            logger.info("No templates to process")
            return
        
        self.stats['total'] = len(templates)
        
        # Process each template
        for i, template in enumerate(templates, 1):
            logger.info(f"\n[{i}/{len(templates)}] Processing template...")
            
            # Check if already has image (for non-forced updates)
            if not force_update and template.get('image_url'):
                logger.info(f"  ⏩ Skipping {template['name']} (already has image)")
                self.stats['skipped'] += 1
                continue
            
            success = await self.process_template(template)
            self.stats['processed'] += 1
            
            # Small delay to avoid rate limiting
            await asyncio.sleep(0.5)
        
        # Print summary
        logger.info("\n" + "=" * 60)
        logger.info("SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total templates: {self.stats['total']}")
        logger.info(f"Processed: {self.stats['processed']}")
        logger.info(f"Updated: {self.stats['updated']}")
        logger.info(f"Skipped: {self.stats['skipped']}")
        logger.info(f"Failed: {self.stats['failed']}")
        
        if self.dry_run:
            logger.info("\n🔍 This was a DRY RUN - no database changes were made")


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Populate trip template images')
    parser.add_argument('--dry-run', action='store_true', 
                        help='Run without updating database')
    parser.add_argument('--force', action='store_true',
                        help='Force update all templates, even those with images')
    
    args = parser.parse_args()
    
    try:
        populator = TripTemplateImagePopulator(dry_run=args.dry_run)
        await populator.run(force_update=args.force)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())