#!/usr/bin/env python3
"""
Permanent Template Photo Storage System
Automatically downloads, stores, and assigns photos to all trip templates in Supabase Storage.
"""

import os
import json
import requests
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from urllib.parse import quote
import hashlib
from supabase import create_client, Client

# Configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
STORAGE_BUCKET = 'template-photos'

# Initialize Supabase client
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print("✅ Supabase client initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize Supabase client: {e}")
    exit(1)

class TemplatePhotoManager:
    """Manages permanent photo storage for trip templates"""

    def __init__(self):
        self.supabase = supabase
        self.bucket_name = STORAGE_BUCKET
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """Ensure the storage bucket exists"""
        try:
            # Try to list the bucket - if it doesn't exist, create it
            self.supabase.storage.list_buckets()
            buckets = [b.name for b in self.supabase.storage.list_buckets()]

            if self.bucket_name not in buckets:
                print(f"📁 Creating storage bucket: {self.bucket_name}")
                self.supabase.storage.create_bucket(
                    self.bucket_name,
                    options={"public": True}  # Make bucket publicly readable
                )
                print(f"✅ Created bucket: {self.bucket_name}")
            else:
                print(f"✅ Bucket already exists: {self.bucket_name}")

        except Exception as e:
            print(f"⚠️ Bucket management error: {e}")

    def get_all_templates(self) -> List[Dict]:
        """Fetch all trip templates from database"""
        try:
            response = self.supabase.table('trip_templates').select('*').execute()
            print(f"📊 Fetched {len(response.data)} templates from database")
            return response.data
        except Exception as e:
            print(f"❌ Error fetching templates: {e}")
            return []

    def get_intelligent_photo_url(self, template: Dict) -> Optional[str]:
        """Get the most appropriate photo URL for a template using intelligent categorization"""

        name = template['name'].lower()
        description = template.get('description', '').lower()
        template_data = template.get('template_data', {})
        region = template_data.get('region', '').lower()

        # Combine all text for analysis
        text_content = f"{name} {description} {region}".lower()

        # Intelligent photo selection based on content analysis
        photo_mappings = {
            # Iconic Australian Routes
            'great ocean road': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Twelve_apostles_coastline.jpg/800px-Twelve_apostles_coastline.jpg',
            'big lap': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Uluru_Kata_Tjuta_National_Park_03.jpg/800px-Uluru_Kata_Tjuta_National_Park_03.jpg',
            'red centre': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Uluru_Kata_Tjuta_National_Park_03.jpg/800px-Uluru_Kata_Tjuta_National_Park_03.jpg',
            'pacific coast': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Byron_Bay_Lighthouse.jpg/800px-Byron_Bay_Lighthouse.jpg',
            'outback': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Australian_Outback.jpg/800px-Australian_Outback.jpg',

            # Regional Photos
            'tasmania': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Cradle_Mountain.jpg/800px-Cradle_Mountain.jpg',
            'queensland': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Great_Barrier_Reef_033.jpg/800px-Great_Barrier_Reef_033.jpg',
            'victoria': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Twelve_apostles_coastline.jpg/800px-Twelve_apostles_coastline.jpg',
            'western australia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Pinnacles_Desert.jpg/800px-Pinnacles_Desert.jpg',
            'south australia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Flinders_Ranges.jpg/800px-Flinders_Ranges.jpg',
            'new south wales': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Sydney_Opera_House_and_Harbour_Bridge.jpg/800px-Sydney_Opera_House_and_Harbour_Bridge.jpg',
            'northern territory': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Uluru_Kata_Tjuta_National_Park_03.jpg/800px-Uluru_Kata_Tjuta_National_Park_03.jpg',

            # International
            'new zealand': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Milford_Sound_New_Zealand.jpg/800px-Milford_Sound_New_Zealand.jpg',
            'canada': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Moraine_Lake_17092005.jpg/800px-Moraine_Lake_17092005.jpg',
            'united states': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Grand_Canyon_View.jpg/800px-Grand_Canyon_View.jpg',

            # Category-based fallbacks
            'coastal': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Coastal_landscape.jpg/800px-Coastal_landscape.jpg',
            'mountain': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Mountain_landscape.jpg/800px-Mountain_landscape.jpg',
            'desert': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Australian_Outback.jpg/800px-Australian_Outback.jpg',
            'urban': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Sydney_Opera_House_and_Harbour_Bridge.jpg/800px-Sydney_Opera_House_and_Harbour_Bridge.jpg',
            'national park': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Cradle_Mountain.jpg/800px-Cradle_Mountain.jpg'
        }

        # Find the best match
        for keyword, photo_url in photo_mappings.items():
            if keyword in text_content:
                print(f"📸 Matched '{template['name']}' with '{keyword}' -> {photo_url}")
                return photo_url

        # Default fallback
        default_photo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Road_trip_landscape.jpg/800px-Road_trip_landscape.jpg'
        print(f"📸 Using default photo for '{template['name']}'")
        return default_photo

    def download_and_store_photo(self, template: Dict, photo_url: str) -> Optional[str]:
        """Download photo and store it in Supabase Storage"""
        try:
            # Generate a unique filename
            template_id = template['id']
            template_name = template['name'].replace('/', '-').replace(' ', '-')
            file_extension = photo_url.split('.')[-1].split('?')[0]
            filename = f"{template_id}-{template_name}.{file_extension}"

            print(f"📥 Downloading photo for '{template['name']}'...")

            # Download the image
            response = requests.get(photo_url, timeout=30)
            response.raise_for_status()

            # Upload to Supabase Storage
            result = self.supabase.storage.from_(self.bucket_name).upload(
                filename,
                response.content,
                {"content-type": f"image/{file_extension}"}
            )

            if result:
                # Get the public URL
                public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(filename)
                print(f"✅ Uploaded: {filename} -> {public_url}")
                return public_url

        except Exception as e:
            print(f"❌ Failed to download/store photo for '{template['name']}': {e}")
            return None

    def update_template_with_photo(self, template_id: str, photo_url: str, photo_source: str = 'permanent_storage'):
        """Update template with permanent photo URL"""
        try:
            # Get current template data
            current = self.supabase.table('trip_templates').select('template_data').eq('id', template_id).execute()

            if current.data:
                template_data = current.data[0].get('template_data', {})

                # Add photo data
                template_data['photo_url'] = photo_url
                template_data['photo_source'] = photo_source
                template_data['photo_stored_at'] = str(__import__('datetime').datetime.now())
                template_data['photo_permanent'] = True

                # Update the template
                result = self.supabase.table('trip_templates').update({
                    'template_data': template_data
                }).eq('id', template_id).execute()

                if result.data:
                    print(f"✅ Updated template {template_id} with permanent photo")
                    return True

            return False

        except Exception as e:
            print(f"❌ Failed to update template {template_id}: {e}")
            return False

    def process_all_templates(self):
        """Process all templates and add permanent photos"""
        print("🚀 Starting permanent photo storage process...")

        templates = self.get_all_templates()
        if not templates:
            print("❌ No templates found!")
            return

        success_count = 0
        error_count = 0

        for template in templates:
            try:
                print(f"\n📋 Processing: {template['name']}")

                # Skip if already has permanent photo
                template_data = template.get('template_data', {})
                if template_data.get('photo_permanent'):
                    print(f"⏭️ Skipping - already has permanent photo")
                    continue

                # Get appropriate photo URL
                photo_url = self.get_intelligent_photo_url(template)
                if not photo_url:
                    print(f"⚠️ No suitable photo found")
                    error_count += 1
                    continue

                # Download and store photo
                stored_url = self.download_and_store_photo(template, photo_url)
                if not stored_url:
                    print(f"❌ Failed to store photo")
                    error_count += 1
                    continue

                # Update template with permanent photo
                if self.update_template_with_photo(template['id'], stored_url):
                    success_count += 1
                else:
                    error_count += 1

            except Exception as e:
                print(f"❌ Error processing template '{template['name']}': {e}")
                error_count += 1

        print(f"\n🎉 Photo storage complete!")
        print(f"✅ Success: {success_count} templates")
        print(f"❌ Errors: {error_count} templates")

def main():
    """Main execution function"""
    print("🖼️ Permanent Template Photo Storage System")
    print("=" * 50)

    # Check environment variables
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Missing required environment variables:")
        print("   SUPABASE_URL")
        print("   SUPABASE_SERVICE_ROLE_KEY")
        return

    # Initialize photo manager and process templates
    photo_manager = TemplatePhotoManager()
    photo_manager.process_all_templates()

if __name__ == "__main__":
    main()