#!/usr/bin/env python3
"""
Trip Template Photo Enhancement System
Adds photos to all existing trip templates using multiple sources:
1. Related trip_locations with existing photos
2. Photo scraping for location-based templates
3. Default category-based placeholder images
"""

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

from supabase import create_client, Client
from dotenv import load_dotenv

# Import our photo services
import sys
sys.path.append(str(Path(__file__).parent))
from services.photo_scraper import add_photos_to_locations
from services.photo_storage import store_location_photos

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TemplatePhotoEnhancer:
    """Enhances all trip templates with appropriate photos"""

    def __init__(self):
        self.supabase = self._init_supabase()

        # Default photo URLs by category/type
        self.default_photos = {
            'beach': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
            'coast': 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80',
            'mountain': 'https://images.unsplash.com/photo-1464822759844-d150a47e6ecd?w=800&q=80',
            'hike': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80',
            'hiking': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80',
            'city': 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
            'urban': 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1f?w=800&q=80',
            'desert': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80',
            'safari': 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80',
            'forest': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
            'nature': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
            'camping': 'https://images.unsplash.com/photo-1504851149312-7a075b496cc7?w=800&q=80',
            'rv': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
            'park': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
            'lake': 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80',
            'waterfall': 'https://images.unsplash.com/photo-1432889490240-84df33d47091?w=800&q=80',
            'attraction': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
            'road_trip': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
            'adventure': 'https://images.unsplash.com/photo-1527004760525-72088e4f4ccf?w=800&q=80',
            'default': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80'
        }

        # Country/region specific defaults
        self.country_photos = {
            'australia': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
            'new_zealand': 'https://images.unsplash.com/photo-1464822759844-d150a47e6ecd?w=800&q=80',
            'united_states': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
            'canada': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
            'great_britain': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80'
        }

    def _init_supabase(self) -> Client:
        """Initialize Supabase client"""
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

        if not url or not key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

        return create_client(url, key)

    async def analyze_current_state(self) -> Dict[str, Any]:
        """Analyze current photo status of all templates"""
        logger.info("🔍 Analyzing current template photo status...")

        # Get photo status breakdown
        result = self.supabase.table('trip_templates').select(
            '''
            id,
            title,
            description,
            template_data,
            created_at
            '''
        ).execute()

        templates = result.data if result.data else []

        photo_analysis = {
            'total_templates': len(templates),
            'has_photo_url': 0,
            'has_photos_array': 0,
            'has_image_field': 0,
            'no_photos': 0,
            'templates_without_photos': []
        }

        for template in templates:
            template_data = template.get('template_data', {})

            if template_data.get('photo_url'):
                photo_analysis['has_photo_url'] += 1
            elif template_data.get('photos'):
                photo_analysis['has_photos_array'] += 1
            elif template_data.get('image'):
                photo_analysis['has_image_field'] += 1
            else:
                photo_analysis['no_photos'] += 1
                photo_analysis['templates_without_photos'].append({
                    'id': template['id'],
                    'title': template['title'],
                    'template_data': template_data
                })

        logger.info(f"📊 Analysis Results:")
        logger.info(f"  Total templates: {photo_analysis['total_templates']}")
        logger.info(f"  With photo_url: {photo_analysis['has_photo_url']}")
        logger.info(f"  With photos array: {photo_analysis['has_photos_array']}")
        logger.info(f"  With image field: {photo_analysis['has_image_field']}")
        logger.info(f"  Without photos: {photo_analysis['no_photos']}")

        return photo_analysis

    async def find_location_based_photos(self) -> Dict[str, str]:
        """Find photos from trip_locations that match templates"""
        logger.info("📍 Finding photos from trip_locations...")

        # Get locations with photos
        locations_result = self.supabase.table('trip_locations').select(
            'id, name, country, photo_url'
        ).not_.is_('photo_url', 'null').execute()

        locations_with_photos = locations_result.data if locations_result.data else []
        logger.info(f"Found {len(locations_with_photos)} locations with photos")

        # Get templates without photos
        templates_result = self.supabase.table('trip_templates').select(
            'id, title, template_data'
        ).execute()

        location_photo_matches = {}

        for template in templates_result.data or []:
            template_data = template.get('template_data', {})

            # Skip if already has photo
            if template_data.get('photo_url') or template_data.get('photos') or template_data.get('image'):
                continue

            template_title = template['title'].lower()

            # Try to match with locations
            for location in locations_with_photos:
                location_name = location['name'].lower()

                # Simple matching logic
                if (location_name in template_title or
                    any(word in location_name for word in template_title.split() if len(word) > 3)):

                    location_photo_matches[template['id']] = {
                        'photo_url': location['photo_url'],
                        'photo_source': 'trip_location',
                        'matched_location': location['name'],
                        'photo_caption': f"Photo of {location['name']}"
                    }
                    logger.info(f"✅ Matched '{template['title']}' with '{location['name']}'")
                    break

        logger.info(f"📍 Found {len(location_photo_matches)} location-based photo matches")
        return location_photo_matches

    def get_category_based_photo(self, template: Dict) -> Dict[str, str]:
        """Get appropriate photo based on template category/content"""
        title = template['title'].lower()
        template_data = template.get('template_data', {})

        # Check template data for category hints
        category = template_data.get('category', '').lower()
        destination = template_data.get('destination', {})
        destination_name = ''

        if isinstance(destination, dict):
            destination_name = destination.get('name', '').lower()
        elif isinstance(destination, str):
            destination_name = destination.lower()

        # Try country-specific photos first
        for country, photo_url in self.country_photos.items():
            if country in title or country in destination_name or country in category:
                return {
                    'photo_url': photo_url,
                    'photo_source': 'unsplash_country',
                    'photo_category': country,
                    'photo_caption': f"Scenic view from {country.replace('_', ' ').title()}"
                }

        # Try category-based photos
        for keyword, photo_url in self.default_photos.items():
            if keyword == 'default':
                continue

            if (keyword in title or keyword in destination_name or
                keyword in category or keyword in str(template_data)):
                return {
                    'photo_url': photo_url,
                    'photo_source': 'unsplash_category',
                    'photo_category': keyword,
                    'photo_caption': f"Beautiful {keyword.replace('_', ' ')} scenery"
                }

        # Default fallback
        return {
            'photo_url': self.default_photos['default'],
            'photo_source': 'unsplash_default',
            'photo_category': 'travel',
            'photo_caption': 'Beautiful travel destination'
        }

    async def scrape_photos_for_templates(self, templates_without_photos: List[Dict]) -> Dict[str, Dict]:
        """Scrape photos for templates that need them"""
        logger.info(f"🔍 Scraping photos for {len(templates_without_photos)} templates...")

        scraped_photos = {}

        # Convert templates to location format for photo scraper
        locations_for_scraping = []
        template_id_map = {}

        for template in templates_without_photos:
            template_data = template.get('template_data', {})
            destination = template_data.get('destination', {})

            # Create a location object for the photo scraper
            if isinstance(destination, dict) and destination.get('name'):
                location_data = {
                    'name': destination['name'],
                    'country': destination.get('country', 'unknown'),
                    'attraction_type': template_data.get('category', 'attraction')
                }
                locations_for_scraping.append(location_data)
                template_id_map[destination['name']] = template['id']
            elif template['title']:
                # Use the title as location name
                location_data = {
                    'name': template['title'],
                    'country': 'unknown',
                    'attraction_type': 'attraction'
                }
                locations_for_scraping.append(location_data)
                template_id_map[template['title']] = template['id']

        if locations_for_scraping:
            try:
                # Use our photo scraper service
                from services.photo_scraper import add_photos_to_locations
                locations_with_photos = await add_photos_to_locations(locations_for_scraping)

                # Map back to template IDs
                for location in locations_with_photos:
                    if location.get('photo_url') and location['name'] in template_id_map:
                        template_id = template_id_map[location['name']]
                        scraped_photos[template_id] = {
                            'photo_url': location['photo_url'],
                            'photo_source': location.get('photo_source', 'scraped'),
                            'photo_caption': f"Photo of {location['name']}",
                            'photo_search_query': location.get('photo_search_query', ''),
                            'photo_confidence': location.get('photo_confidence', 'medium')
                        }

                logger.info(f"🔍 Successfully scraped {len(scraped_photos)} photos")
            except Exception as e:
                logger.error(f"Error scraping photos: {e}")

        return scraped_photos

    async def update_template_photos(self, photo_updates: Dict[str, Dict]) -> Dict[str, Any]:
        """Update templates with photo information"""
        logger.info(f"📸 Updating {len(photo_updates)} templates with photos...")

        update_results = {
            'successful_updates': 0,
            'failed_updates': 0,
            'errors': []
        }

        for template_id, photo_data in photo_updates.items():
            try:
                # Get current template
                template_result = self.supabase.table('trip_templates').select('template_data').eq('id', template_id).single().execute()

                if not template_result.data:
                    logger.warning(f"Template {template_id} not found")
                    continue

                current_data = template_result.data.get('template_data', {})

                # Update with photo data
                updated_data = {
                    **current_data,
                    **photo_data,
                    'photo_added_at': datetime.now().isoformat(),
                    'photo_enhancement_version': '2.0'
                }

                # Update template
                update_result = self.supabase.table('trip_templates').update({
                    'template_data': updated_data
                }).eq('id', template_id).execute()

                if update_result.data:
                    update_results['successful_updates'] += 1
                    logger.info(f"✅ Updated template {template_id} with {photo_data.get('photo_source', 'unknown')} photo")
                else:
                    update_results['failed_updates'] += 1
                    logger.error(f"❌ Failed to update template {template_id}")

            except Exception as e:
                update_results['failed_updates'] += 1
                update_results['errors'].append(f"Template {template_id}: {str(e)}")
                logger.error(f"Error updating template {template_id}: {e}")

        return update_results

    async def enhance_all_templates(self) -> Dict[str, Any]:
        """Main method to enhance all templates with photos"""
        logger.info("🚀 Starting comprehensive template photo enhancement...")

        # Step 1: Analyze current state
        analysis = await self.analyze_current_state()

        if analysis['no_photos'] == 0:
            logger.info("🎉 All templates already have photos!")
            return {
                'status': 'complete',
                'message': 'All templates already have photos',
                'analysis': analysis
            }

        templates_needing_photos = analysis['templates_without_photos']
        logger.info(f"📋 Need to add photos to {len(templates_needing_photos)} templates")

        all_photo_updates = {}

        # Step 2: Find photos from existing locations
        location_matches = await self.find_location_based_photos()
        all_photo_updates.update(location_matches)
        logger.info(f"📍 Found {len(location_matches)} location-based matches")

        # Step 3: Scrape photos for remaining templates
        remaining_templates = [t for t in templates_needing_photos if t['id'] not in location_matches]
        if remaining_templates:
            scraped_photos = await self.scrape_photos_for_templates(remaining_templates[:10])  # Limit for testing
            all_photo_updates.update(scraped_photos)
            logger.info(f"🔍 Scraped {len(scraped_photos)} additional photos")

        # Step 4: Add category-based defaults for any remaining
        still_remaining = [t for t in templates_needing_photos if t['id'] not in all_photo_updates]
        for template in still_remaining:
            category_photo = self.get_category_based_photo(template)
            all_photo_updates[template['id']] = category_photo

        logger.info(f"📸 Total photo updates to apply: {len(all_photo_updates)}")

        # Step 5: Apply all updates
        update_results = await self.update_template_photos(all_photo_updates)

        # Step 6: Final verification
        final_analysis = await self.analyze_current_state()

        return {
            'status': 'success',
            'initial_analysis': analysis,
            'final_analysis': final_analysis,
            'photo_sources': {
                'location_matches': len(location_matches),
                'scraped_photos': len(scraped_photos) if 'scraped_photos' in locals() else 0,
                'category_defaults': len(still_remaining) if 'still_remaining' in locals() else 0
            },
            'update_results': update_results,
            'templates_enhanced': len(all_photo_updates)
        }

async def main():
    """Main function to run template photo enhancement"""
    logger.info("🎨 Starting Trip Template Photo Enhancement System")
    logger.info("=" * 60)

    try:
        enhancer = TemplatePhotoEnhancer()
        results = await enhancer.enhance_all_templates()

        logger.info("\n" + "=" * 60)
        logger.info("🎉 PHOTO ENHANCEMENT COMPLETE!")
        logger.info(f"Status: {results['status']}")

        if 'templates_enhanced' in results:
            logger.info(f"Templates Enhanced: {results['templates_enhanced']}")

        if 'photo_sources' in results:
            sources = results['photo_sources']
            logger.info(f"Photo Sources:")
            logger.info(f"  Location matches: {sources['location_matches']}")
            logger.info(f"  Scraped photos: {sources['scraped_photos']}")
            logger.info(f"  Category defaults: {sources['category_defaults']}")

        if 'update_results' in results:
            updates = results['update_results']
            logger.info(f"Update Results:")
            logger.info(f"  Successful: {updates['successful_updates']}")
            logger.info(f"  Failed: {updates['failed_updates']}")

        if 'final_analysis' in results:
            final = results['final_analysis']
            logger.info(f"Final Status:")
            logger.info(f"  Total templates: {final['total_templates']}")
            logger.info(f"  Templates without photos: {final['no_photos']}")

        logger.info("=" * 60)

        return results

    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise

if __name__ == "__main__":
    asyncio.run(main())