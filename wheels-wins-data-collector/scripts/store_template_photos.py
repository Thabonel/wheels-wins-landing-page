#!/usr/bin/env python3
"""
Store Template Photos in Supabase Storage
This script runs on the data collector Render instance which has all necessary credentials.
It downloads photos and stores them permanently in the Supabase Storage bucket.
"""

import os
import sys
import json
import requests
import logging
from typing import Dict, List, Optional
from datetime import datetime
import time

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client, Client
from config import get_supabase_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TemplatePhotoStorage:
    """Handles downloading and storing photos in Supabase Storage"""

    def __init__(self):
        """Initialize with Supabase client from config"""
        self.supabase = get_supabase_client()
        self.bucket_name = 'trip-images'
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """Ensure the storage bucket exists and is public"""
        try:
            buckets = self.supabase.storage.list_buckets()
            bucket_names = [b['name'] for b in buckets] if buckets else []

            if self.bucket_name not in bucket_names:
                logger.info(f"Creating storage bucket: {self.bucket_name}")
                self.supabase.storage.create_bucket(
                    self.bucket_name,
                    options={"public": True}
                )
                logger.info(f"Created bucket: {self.bucket_name}")
            else:
                logger.info(f"Bucket already exists: {self.bucket_name}")

        except Exception as e:
            logger.warning(f"Bucket check/creation: {e}")
            # Bucket might already exist, continue

    def get_photo_mappings(self) -> Dict[str, Dict]:
        """Get photo mappings for different template types"""
        return {
            'great-ocean-road': {
                'url': 'https://images.pexels.com/photos/2422259/pexels-photo-2422259.jpeg',
                'filename': 'great-ocean-road-coastal-cliffs.jpg',
                'caption': 'Coastal cliffs and ocean view along the Great Ocean Road'
            },
            'big-lap-uluru': {
                'url': 'https://images.pexels.com/photos/2674062/pexels-photo-2674062.jpeg',
                'filename': 'big-lap-uluru-outback.jpg',
                'caption': 'Australian outback landscape with Uluru'
            },
            'tasmania': {
                'url': 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg',
                'filename': 'tasmania-cradle-mountain.jpg',
                'caption': 'Mountain landscape with lake in Tasmania'
            },
            'byron-bay': {
                'url': 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg',
                'filename': 'byron-bay-beach.jpg',
                'caption': 'Beautiful beach coastline at Byron Bay'
            },
            'gold-coast': {
                'url': 'https://images.pexels.com/photos/2193300/pexels-photo-2193300.jpeg',
                'filename': 'gold-coast-skyline.jpg',
                'caption': 'Urban skyline by the beach at Gold Coast'
            },
            'queensland': {
                'url': 'https://images.pexels.com/photos/994605/pexels-photo-994605.jpeg',
                'filename': 'queensland-reef.jpg',
                'caption': 'Tropical reef waters in Queensland'
            },
            'victoria': {
                'url': 'https://images.pexels.com/photos/2422259/pexels-photo-2422259.jpeg',
                'filename': 'victoria-coastal-road.jpg',
                'caption': 'Coastal road scenery in Victoria'
            },
            'western-australia': {
                'url': 'https://images.pexels.com/photos/1559825/pexels-photo-1559825.jpeg',
                'filename': 'western-australia-desert.jpg',
                'caption': 'Desert landscape in Western Australia'
            },
            'south-australia': {
                'url': 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg',
                'filename': 'south-australia-mountains.jpg',
                'caption': 'Mountain ranges in South Australia'
            },
            'new-south-wales': {
                'url': 'https://images.pexels.com/photos/995764/pexels-photo-995764.jpeg',
                'filename': 'nsw-sydney-harbor.jpg',
                'caption': 'Sydney harbor view in New South Wales'
            },
            'northern-territory': {
                'url': 'https://images.pexels.com/photos/2674062/pexels-photo-2674062.jpeg',
                'filename': 'northern-territory-outback.jpg',
                'caption': 'Outback scenery in Northern Territory'
            },
            'default': {
                'url': 'https://images.pexels.com/photos/1118448/pexels-photo-1118448.jpeg',
                'filename': 'default-scenic-road.jpg',
                'caption': 'Scenic road through nature'
            }
        }

    def download_photo(self, url: str) -> Optional[bytes]:
        """Download photo from URL"""
        try:
            # Add quality parameter for Pexels
            if 'pexels.com' in url and '?' not in url:
                url = f"{url}?auto=compress&cs=tinysrgb&w=1200"

            logger.info(f"Downloading: {url}")
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            content = response.content
            logger.info(f"Downloaded {len(content)} bytes")
            return content

        except Exception as e:
            logger.error(f"Failed to download photo: {e}")
            return None

    def upload_to_storage(self, content: bytes, filename: str) -> Optional[str]:
        """Upload photo to Supabase Storage"""
        try:
            # Check if file already exists
            existing = self.supabase.storage.from_(self.bucket_name).list(path='')
            existing_files = [f['name'] for f in existing] if existing else []

            if filename in existing_files:
                logger.info(f"File already exists: {filename}")
                # Get public URL for existing file
                public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(filename)
                return public_url

            # Upload new file
            logger.info(f"Uploading {filename} ({len(content)} bytes)")

            result = self.supabase.storage.from_(self.bucket_name).upload(
                path=filename,
                file=content,
                file_options={"content-type": "image/jpeg"}
            )

            if result:
                public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(filename)
                logger.info(f"Uploaded successfully: {public_url}")
                return public_url
            else:
                logger.error(f"Upload failed for {filename}")
                return None

        except Exception as e:
            logger.error(f"Storage upload error: {e}")
            return None

    def update_template_with_storage_url(self, template_id: str, storage_url: str, caption: str):
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
                'photo_stored_at': datetime.now().isoformat()
            })

            # Update in database
            update_result = self.supabase.table('trip_templates').update({
                'template_data': template_data
            }).eq('id', template_id).execute()

            if update_result.data:
                logger.info(f"Updated template {template_id} with storage URL")
                return True
            else:
                logger.error(f"Failed to update template {template_id}")
                return False

        except Exception as e:
            logger.error(f"Database update error: {e}")
            return False

    def process_all_templates(self):
        """Process all templates and store photos in Storage bucket"""
        logger.info("="*50)
        logger.info("Starting template photo storage process")
        logger.info("="*50)

        # Get all templates
        try:
            result = self.supabase.table('trip_templates').select('*').execute()
            templates = result.data if result.data else []
            logger.info(f"Found {len(templates)} templates to process")
        except Exception as e:
            logger.error(f"Failed to fetch templates: {e}")
            return

        if not templates:
            logger.warning("No templates found in database")
            return

        # Get photo mappings
        mappings = self.get_photo_mappings()

        # Track statistics
        stats = {
            'processed': 0,
            'uploaded': 0,
            'skipped': 0,
            'errors': 0
        }

        # Track uploaded files to avoid duplicates
        uploaded_files = {}

        for template in templates:
            template_name = template.get('name', '')
            template_id = template.get('id')
            template_data = template.get('template_data', {})
            region = template_data.get('region', '').lower()

            logger.info(f"\nProcessing: {template_name}")
            stats['processed'] += 1

            # Skip if already has Storage URL
            if template_data.get('photo_source') == 'supabase_storage':
                logger.info("Already has Storage photo, skipping")
                stats['skipped'] += 1
                continue

            # Find appropriate photo mapping
            photo_info = None
            name_lower = template_name.lower()

            # Check specific matches first
            if 'great ocean road' in name_lower:
                photo_info = mappings['great-ocean-road']
            elif 'big lap' in name_lower or 'uluru' in name_lower:
                photo_info = mappings['big-lap-uluru']
            elif 'tasmania' in name_lower or 'tassie' in name_lower:
                photo_info = mappings['tasmania']
            elif 'byron bay' in name_lower:
                photo_info = mappings['byron-bay']
            elif 'gold coast' in name_lower:
                photo_info = mappings['gold-coast']
            elif 'queensland' in region:
                photo_info = mappings['queensland']
            elif 'victoria' in region:
                photo_info = mappings['victoria']
            elif 'western australia' in region:
                photo_info = mappings['western-australia']
            elif 'south australia' in region:
                photo_info = mappings['south-australia']
            elif 'new south wales' in region or 'nsw' in region:
                photo_info = mappings['new-south-wales']
            elif 'northern territory' in region:
                photo_info = mappings['northern-territory']
            else:
                photo_info = mappings['default']

            # Check if we already uploaded this file
            filename = photo_info['filename']
            if filename in uploaded_files:
                storage_url = uploaded_files[filename]
                logger.info(f"Reusing existing upload: {filename}")
            else:
                # Download and upload photo
                content = self.download_photo(photo_info['url'])
                if not content:
                    logger.error(f"Failed to download photo for {template_name}")
                    stats['errors'] += 1
                    continue

                storage_url = self.upload_to_storage(content, filename)
                if not storage_url:
                    logger.error(f"Failed to upload photo for {template_name}")
                    stats['errors'] += 1
                    continue

                uploaded_files[filename] = storage_url
                stats['uploaded'] += 1

                # Rate limit to avoid overwhelming the API
                time.sleep(0.5)

            # Update template with Storage URL
            if self.update_template_with_storage_url(template_id, storage_url, photo_info['caption']):
                logger.info(f"Successfully updated {template_name}")
            else:
                stats['errors'] += 1

        # Print summary
        logger.info("\n" + "="*50)
        logger.info("PHOTO STORAGE COMPLETE")
        logger.info("="*50)
        logger.info(f"Templates processed: {stats['processed']}")
        logger.info(f"Photos uploaded: {stats['uploaded']}")
        logger.info(f"Templates skipped: {stats['skipped']}")
        logger.info(f"Errors: {stats['errors']}")
        logger.info(f"Unique photos in storage: {len(uploaded_files)}")

def main():
    """Main execution"""
    try:
        storage = TemplatePhotoStorage()
        storage.process_all_templates()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()