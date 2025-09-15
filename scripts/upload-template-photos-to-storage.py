#!/usr/bin/env python3
"""
Upload Template Photos to Supabase Storage
Downloads appropriate photos and uploads them to the trip-images bucket in Supabase Storage.
"""

import os
import json
import requests
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import hashlib
from datetime import datetime
import time

# Supabase configuration - we'll need to get these from environment
SUPABASE_URL = "https://kycoklimpzkyrecbjecn.supabase.co"
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
STORAGE_BUCKET = 'trip-images'

class TemplatePhotoUploader:
    """Uploads photos to Supabase Storage and updates templates"""

    def __init__(self):
        self.supabase_url = SUPABASE_URL
        self.anon_key = SUPABASE_ANON_KEY
        self.bucket_name = STORAGE_BUCKET
        self.headers = {
            'apikey': self.anon_key,
            'Authorization': f'Bearer {self.anon_key}',
            'Content-Type': 'application/json'
        }

    def get_all_templates(self) -> List[Dict]:
        """Fetch all trip templates from database via REST API"""
        try:
            url = f"{self.supabase_url}/rest/v1/trip_templates"
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            templates = response.json()
            print(f"📊 Fetched {len(templates)} templates from database")
            return templates
        except Exception as e:
            print(f"❌ Error fetching templates: {e}")
            return []

    def get_intelligent_photo_mapping(self) -> Dict[str, Dict]:
        """Get intelligent photo mappings for templates"""
        return {
            # Iconic Australian Routes with high-quality Wikipedia images
            'great ocean road': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Twelve_apostles_coastline.jpg/1280px-Twelve_apostles_coastline.jpg',
                'filename': 'great-ocean-road-twelve-apostles.jpg',
                'caption': 'The iconic Twelve Apostles along the Great Ocean Road'
            },
            'big lap': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Uluru_Kata_Tjuta_National_Park_03.jpg/1280px-Uluru_Kata_Tjuta_National_Park_03.jpg',
                'filename': 'big-lap-uluru.jpg',
                'caption': 'Uluru - heart of the Australian outback'
            },
            'red centre': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Kings_Canyon_Northern_Territory.jpg/1280px-Kings_Canyon_Northern_Territory.jpg',
                'filename': 'red-centre-kings-canyon.jpg',
                'caption': 'Kings Canyon in the Red Centre'
            },
            'uluru': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Uluru_Kata_Tjuta_National_Park_03.jpg/1280px-Uluru_Kata_Tjuta_National_Park_03.jpg',
                'filename': 'uluru-sunset.jpg',
                'caption': 'Uluru at sunset'
            },
            'pacific coast': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Byron_Bay_Lighthouse.jpg/1280px-Byron_Bay_Lighthouse.jpg',
                'filename': 'pacific-coast-byron-bay.jpg',
                'caption': 'Byron Bay Lighthouse on the Pacific Coast'
            },
            'byron bay': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Byron_Bay_Lighthouse.jpg/1280px-Byron_Bay_Lighthouse.jpg',
                'filename': 'byron-bay-lighthouse.jpg',
                'caption': 'Byron Bay Lighthouse'
            },
            'gold coast': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Gold_Coast_skyline.jpg/1280px-Gold_Coast_skyline.jpg',
                'filename': 'gold-coast-skyline.jpg',
                'caption': 'Gold Coast skyline and beaches'
            },
            'outback': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Australian_Outback.jpg/1280px-Australian_Outback.jpg',
                'filename': 'australian-outback.jpg',
                'caption': 'The vast Australian Outback'
            },

            # Regional Photos
            'tasmania': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Cradle_Mountain.jpg/1280px-Cradle_Mountain.jpg',
                'filename': 'tasmania-cradle-mountain.jpg',
                'caption': 'Cradle Mountain in Tasmania'
            },
            'queensland': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Great_Barrier_Reef_033.jpg/1280px-Great_Barrier_Reef_033.jpg',
                'filename': 'queensland-great-barrier-reef.jpg',
                'caption': 'Great Barrier Reef in Queensland'
            },
            'victoria': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Melbourne_skyline.jpg/1280px-Melbourne_skyline.jpg',
                'filename': 'victoria-melbourne.jpg',
                'caption': 'Melbourne skyline in Victoria'
            },
            'western australia': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Pinnacles_Desert.jpg/1280px-Pinnacles_Desert.jpg',
                'filename': 'wa-pinnacles.jpg',
                'caption': 'Pinnacles Desert in Western Australia'
            },
            'south australia': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Flinders_Ranges.jpg/1280px-Flinders_Ranges.jpg',
                'filename': 'sa-flinders-ranges.jpg',
                'caption': 'Flinders Ranges in South Australia'
            },
            'new south wales': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Sydney_Opera_House_and_Harbour_Bridge.jpg/1280px-Sydney_Opera_House_and_Harbour_Bridge.jpg',
                'filename': 'nsw-sydney.jpg',
                'caption': 'Sydney Opera House and Harbour Bridge'
            },
            'northern territory': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Kakadu_National_Park.jpg/1280px-Kakadu_National_Park.jpg',
                'filename': 'nt-kakadu.jpg',
                'caption': 'Kakadu National Park in Northern Territory'
            },

            # International
            'new zealand': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Milford_Sound_New_Zealand.jpg/1280px-Milford_Sound_New_Zealand.jpg',
                'filename': 'nz-milford-sound.jpg',
                'caption': 'Milford Sound in New Zealand'
            },
            'canada': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Moraine_Lake_17092005.jpg/1280px-Moraine_Lake_17092005.jpg',
                'filename': 'canada-moraine-lake.jpg',
                'caption': 'Moraine Lake in Canada'
            },
            'united states': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Grand_Canyon_View.jpg/1280px-Grand_Canyon_View.jpg',
                'filename': 'usa-grand-canyon.jpg',
                'caption': 'Grand Canyon in United States'
            },

            # Category defaults
            'coastal': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Great_Australian_Bight.jpg/1280px-Great_Australian_Bight.jpg',
                'filename': 'coastal-great-australian-bight.jpg',
                'caption': 'Great Australian Bight coastal view'
            },
            'mountain': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Blue_Mountains_National_Park.jpg/1280px-Blue_Mountains_National_Park.jpg',
                'filename': 'mountain-blue-mountains.jpg',
                'caption': 'Blue Mountains National Park'
            },
            'desert': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Simpson_Desert.jpg/1280px-Simpson_Desert.jpg',
                'filename': 'desert-simpson.jpg',
                'caption': 'Simpson Desert landscape'
            },
            'default': {
                'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Australian_road.jpg/1280px-Australian_road.jpg',
                'filename': 'default-australian-road.jpg',
                'caption': 'Open road in Australia'
            }
        }

    def select_photo_for_template(self, template: Dict) -> Dict:
        """Select the most appropriate photo for a template"""
        mappings = self.get_intelligent_photo_mapping()

        name = template['name'].lower()
        description = (template.get('description') or '').lower()
        template_data = template.get('template_data', {})
        region = (template_data.get('region') or '').lower()
        category = (template.get('category') or '').lower()

        # Combine all text for matching
        text_content = f"{name} {description} {region} {category}"

        # Priority order for matching
        for keyword, photo_info in mappings.items():
            if keyword != 'default' and keyword in text_content:
                print(f"📸 Matched '{template['name']}' with '{keyword}'")
                return photo_info

        # Use default if no match
        print(f"📸 Using default photo for '{template['name']}'")
        return mappings['default']

    def download_photo(self, url: str) -> Optional[bytes]:
        """Download photo from URL"""
        try:
            print(f"📥 Downloading from: {url}")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.content
        except Exception as e:
            print(f"❌ Failed to download photo: {e}")
            return None

    def upload_to_storage(self, file_content: bytes, filename: str) -> Optional[str]:
        """Upload photo to Supabase Storage bucket"""
        try:
            # Prepare upload URL and headers
            upload_url = f"{self.supabase_url}/storage/v1/object/{self.bucket_name}/{filename}"

            headers = {
                'apikey': self.anon_key,
                'Authorization': f'Bearer {self.anon_key}',
                'Content-Type': 'image/jpeg'
            }

            # Upload the file
            response = requests.post(upload_url, data=file_content, headers=headers)

            if response.status_code == 200:
                # Get public URL
                public_url = f"{self.supabase_url}/storage/v1/object/public/{self.bucket_name}/{filename}"
                print(f"✅ Uploaded: {filename}")
                return public_url
            else:
                print(f"❌ Upload failed with status {response.status_code}: {response.text}")
                return None

        except Exception as e:
            print(f"❌ Failed to upload to storage: {e}")
            return None

    def update_template_with_storage_url(self, template_id: str, storage_url: str, caption: str):
        """Update template with Supabase Storage URL"""
        try:
            # Get current template data
            url = f"{self.supabase_url}/rest/v1/trip_templates?id=eq.{template_id}"
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()

            templates = response.json()
            if not templates:
                print(f"❌ Template {template_id} not found")
                return False

            template = templates[0]
            template_data = template.get('template_data', {})

            # Add photo data
            template_data['photo_url'] = storage_url
            template_data['photo_source'] = 'supabase_storage'
            template_data['photo_caption'] = caption
            template_data['photo_permanent'] = True
            template_data['photo_stored_at'] = datetime.now().isoformat()

            # Update the template
            update_url = f"{self.supabase_url}/rest/v1/trip_templates?id=eq.{template_id}"
            update_data = {'template_data': template_data}

            response = requests.patch(
                update_url,
                json=update_data,
                headers=self.headers
            )

            if response.status_code in [200, 204]:
                print(f"✅ Updated template {template_id} with storage URL")
                return True
            else:
                print(f"❌ Failed to update template: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"❌ Failed to update template {template_id}: {e}")
            return False

    def process_all_templates(self):
        """Process all templates and upload photos to Storage"""
        print("🚀 Starting photo upload to Supabase Storage...")

        if not self.anon_key:
            print("❌ Missing SUPABASE_ANON_KEY environment variable!")
            print("Please set it with: export SUPABASE_ANON_KEY='your-anon-key'")
            return

        templates = self.get_all_templates()
        if not templates:
            print("❌ No templates found!")
            return

        success_count = 0
        error_count = 0
        skip_count = 0

        # Track uploaded photos to avoid duplicates
        uploaded_photos = {}

        for i, template in enumerate(templates):
            try:
                print(f"\n📋 Processing {i+1}/{len(templates)}: {template['name']}")

                # Skip if already has permanent storage photo
                template_data = template.get('template_data', {})
                if template_data.get('photo_source') == 'supabase_storage':
                    print(f"⏭️ Skipping - already has storage photo")
                    skip_count += 1
                    continue

                # Select appropriate photo
                photo_info = self.select_photo_for_template(template)

                # Check if we already uploaded this photo
                if photo_info['filename'] in uploaded_photos:
                    # Reuse existing upload
                    storage_url = uploaded_photos[photo_info['filename']]
                    print(f"♻️ Reusing existing upload: {photo_info['filename']}")
                else:
                    # Download and upload new photo
                    photo_content = self.download_photo(photo_info['url'])
                    if not photo_content:
                        error_count += 1
                        continue

                    # Upload to storage
                    storage_url = self.upload_to_storage(photo_content, photo_info['filename'])
                    if not storage_url:
                        error_count += 1
                        continue

                    # Cache the upload
                    uploaded_photos[photo_info['filename']] = storage_url

                    # Rate limit to avoid overwhelming the API
                    time.sleep(0.5)

                # Update template with storage URL
                if self.update_template_with_storage_url(
                    template['id'],
                    storage_url,
                    photo_info['caption']
                ):
                    success_count += 1
                else:
                    error_count += 1

            except Exception as e:
                print(f"❌ Error processing template '{template['name']}': {e}")
                error_count += 1

        print(f"\n🎉 Photo upload complete!")
        print(f"✅ Success: {success_count} templates")
        print(f"⏭️ Skipped: {skip_count} templates")
        print(f"❌ Errors: {error_count} templates")
        print(f"📸 Unique photos uploaded: {len(uploaded_photos)}")

def main():
    """Main execution function"""
    print("🖼️ Supabase Storage Photo Upload System")
    print("=" * 50)

    # Provide instructions for getting the anon key
    if not os.environ.get('SUPABASE_ANON_KEY'):
        print("\n⚠️ Missing SUPABASE_ANON_KEY environment variable!")
        print("\nTo get your anon key:")
        print("1. Go to: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/settings/api")
        print("2. Copy the 'anon public' key")
        print("3. Run: export SUPABASE_ANON_KEY='your-key-here'")
        print("4. Then run this script again")
        return

    # Initialize uploader and process templates
    uploader = TemplatePhotoUploader()
    uploader.process_all_templates()

if __name__ == "__main__":
    main()