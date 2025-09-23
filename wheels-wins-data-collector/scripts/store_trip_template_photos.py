#!/usr/bin/env python3
"""
Store Trip Template Photos in Supabase Storage
Uses the existing photo scraper and storage services to find and store photos for trip templates.
Run this on the data collector Render instance which has all necessary credentials.
"""

import os
import sys
import asyncio
import logging
from typing import Dict, List, Optional
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import get_supabase_client
from services.photo_scraper import LocationPhotoScraper
from services.photo_storage import PhotoStorageService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TripTemplatePhotoManager:
    """Manages finding and storing photos for trip templates"""

    def __init__(self):
        self.supabase = get_supabase_client()
        # Override bucket name for trip templates
        self.bucket_name = 'trip-images'

    async def get_all_templates(self) -> List[Dict]:
        """Fetch all trip templates from database"""
        try:
            result = self.supabase.table('trip_templates').select('*').execute()
            templates = result.data if result.data else []
            logger.info(f"📊 Found {len(templates)} trip templates")
            return templates
        except Exception as e:
            logger.error(f"Failed to fetch templates: {e}")
            return []

    async def find_photo_for_template(self, template: Dict, scraper: LocationPhotoScraper) -> Optional[str]:
        """Find an appropriate photo for a template using the photo scraper"""

        name = template.get('name', '')
        template_data = template.get('template_data', {})
        region = template_data.get('region', '')

        # Create location data for the scraper
        location_data = {
            'name': name,
            'country': 'Australia' if 'australia' in region.lower() else region,
            'attraction_type': 'scenic_route'
        }

        # Special handling for known routes
        special_searches = {
            'great ocean road': 'Twelve Apostles Victoria Australia',
            'big lap': 'Uluru Northern Territory Australia',
            'red centre': 'Uluru Kata Tjuta National Park',
            'pacific coast': 'Byron Bay Lighthouse NSW',
            'tasmania': 'Cradle Mountain Tasmania',
            'gold coast': 'Gold Coast Skyline Queensland',
            'queensland': 'Great Barrier Reef Queensland',
            'victoria': 'Great Ocean Road Victoria',
            'western australia': 'Pinnacles Desert WA',
            'south australia': 'Flinders Ranges SA',
            'new south wales': 'Sydney Opera House NSW',
            'northern territory': 'Kakadu National Park NT'
        }

        # Check for special searches
        name_lower = name.lower()
        search_term = None

        for key, value in special_searches.items():
            if key in name_lower or key in region.lower():
                search_term = value
                logger.info(f"🎯 Using special search: {search_term}")
                break

        if not search_term:
            search_term = name

        # Use scraper to find photo
        photo_result = await scraper.get_wikipedia_image(search_term, 'Australia')

        if photo_result:
            logger.info(f"✅ Found photo for {name}")
            return photo_result
        else:
            logger.warning(f"❌ No photo found for {name}")
            return None

    async def store_photo_in_bucket(self, template: Dict, photo_url: str, storage: PhotoStorageService) -> Optional[str]:
        """Store photo in the trip-images bucket"""

        template_id = template.get('id')
        name = template.get('name', 'unknown')

        # Generate filename for storage
        clean_name = ''.join(c for c in name if c.isalnum() or c in '-_ ')[:50].strip().replace(' ', '-')
        filename = f"templates/{template_id}/{clean_name}.jpg"

        try:
            # Override bucket name for trip templates
            original_bucket = storage.BUCKET_NAME
            storage.BUCKET_NAME = self.bucket_name

            # Download image
            image_data = await storage.download_image(photo_url)
            if not image_data:
                logger.error(f"Failed to download image for {name}")
                return None

            # Upload to storage
            storage_url = await storage.upload_to_storage(filename, image_data)

            # Restore original bucket name
            storage.BUCKET_NAME = original_bucket

            if storage_url:
                logger.info(f"✅ Stored photo for {name}: {storage_url}")
                return storage_url
            else:
                logger.error(f"Failed to upload photo for {name}")
                return None

        except Exception as e:
            logger.error(f"Error storing photo for {name}: {e}")
            return None

    def update_template_with_storage_url(self, template_id: str, storage_url: str, caption: str = '') -> bool:
        """Update template with Storage bucket URL"""
        try:
            # Get current template data
            result = self.supabase.table('trip_templates').select('*').eq('id', template_id).execute()

            if not result.data:
                logger.error(f"Template {template_id} not found")
                return False

            template = result.data[0]
            template_data = template.get('template_data', {})

            # Update with Storage URL
            template_data.update({
                'photo_url': storage_url,
                'imageUrl': storage_url,
                'image_url': storage_url,
                'photo_source': 'supabase_storage',
                'photo_caption': caption,
                'photo_permanent': True,
                'photo_stored_at': datetime.now().isoformat(),
                'photo_bucket': self.bucket_name
            })

            # Update in database
            update_result = self.supabase.table('trip_templates').update({
                'template_data': template_data
            }).eq('id', template_id).execute()

            if update_result.data:
                logger.info(f"✅ Updated template {template_id} with storage URL")
                return True
            else:
                logger.error(f"Failed to update template {template_id}")
                return False

        except Exception as e:
            logger.error(f"Database update error: {e}")
            return False

    async def process_all_templates(self):
        """Process all templates to find and store photos"""

        logger.info("="*60)
        logger.info("TRIP TEMPLATE PHOTO STORAGE PROCESS")
        logger.info("="*60)

        # Get all templates
        templates = await self.get_all_templates()
        if not templates:
            logger.warning("No templates found")
            return

        # Statistics
        stats = {
            'total': len(templates),
            'processed': 0,
            'photos_found': 0,
            'photos_stored': 0,
            'already_stored': 0,
            'errors': 0
        }

        # Process templates with photo scraper and storage
        async with LocationPhotoScraper() as scraper:
            async with PhotoStorageService(self.supabase) as storage:

                for i, template in enumerate(templates, 1):
                    name = template.get('name', 'Unknown')
                    template_id = template.get('id')
                    template_data = template.get('template_data', {})

                    logger.info(f"\n[{i}/{stats['total']}] Processing: {name}")
                    stats['processed'] += 1

                    # Skip if already has Storage photo
                    if template_data.get('photo_source') == 'supabase_storage' and template_data.get('photo_bucket') == self.bucket_name:
                        logger.info("✓ Already has Storage photo, skipping")
                        stats['already_stored'] += 1
                        continue

                    # Find photo using scraper
                    photo_url = await self.find_photo_for_template(template, scraper)
                    if not photo_url:
                        logger.warning(f"No photo found for {name}")
                        stats['errors'] += 1
                        continue

                    stats['photos_found'] += 1

                    # Store photo in bucket
                    storage_url = await self.store_photo_in_bucket(template, photo_url, storage)
                    if not storage_url:
                        logger.error(f"Failed to store photo for {name}")
                        stats['errors'] += 1
                        continue

                    stats['photos_stored'] += 1

                    # Update template with storage URL
                    caption = f"Scenic view for {name}"
                    if not self.update_template_with_storage_url(template_id, storage_url, caption):
                        logger.error(f"Failed to update template {name}")
                        stats['errors'] += 1

                    # Rate limiting
                    await asyncio.sleep(0.5)

        # Print summary
        logger.info("\n" + "="*60)
        logger.info("PHOTO STORAGE COMPLETE")
        logger.info("="*60)
        logger.info(f"Total templates: {stats['total']}")
        logger.info(f"Processed: {stats['processed']}")
        logger.info(f"Photos found: {stats['photos_found']}")
        logger.info(f"Photos stored: {stats['photos_stored']}")
        logger.info(f"Already stored: {stats['already_stored']}")
        logger.info(f"Errors: {stats['errors']}")
        logger.info("="*60)

def main():
    """Main execution"""
    try:
        manager = TripTemplatePhotoManager()
        asyncio.run(manager.process_all_templates())
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()