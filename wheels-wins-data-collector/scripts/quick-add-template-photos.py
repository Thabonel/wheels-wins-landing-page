#!/usr/bin/env python3
"""
Quick Template Photo Addition
Rapidly adds photos to all trip templates using SQL updates
"""

import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QuickTemplatePhotoAdder:
    def __init__(self):
        self.supabase = create_client(
            os.getenv('SUPABASE_URL'),
            os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        )

    def analyze_templates(self):
        """Quick analysis of template photo status"""
        logger.info("🔍 Analyzing template photo status...")

        # Get all templates and check photo status
        result = self.supabase.table('trip_templates').select('id, title, template_data').execute()
        templates = result.data or []

        stats = {'total': len(templates), 'with_photos': 0, 'without_photos': 0}
        without_photos = []

        for template in templates:
            template_data = template.get('template_data', {})
            has_photo = (template_data.get('photo_url') or
                        template_data.get('photos') or
                        template_data.get('image'))

            if has_photo:
                stats['with_photos'] += 1
            else:
                stats['without_photos'] += 1
                without_photos.append(template)

        logger.info(f"📊 Found {stats['total']} templates: {stats['with_photos']} with photos, {stats['without_photos']} without")
        return without_photos

    def add_photos_to_templates(self, templates_without_photos):
        """Add photos to templates based on smart categorization"""
        logger.info(f"📸 Adding photos to {len(templates_without_photos)} templates...")

        updates = []
        for template in templates_without_photos:
            title = template['title'].lower()
            template_data = template.get('template_data', {})

            # Smart photo selection based on content
            photo_url = self.get_smart_photo_url(title, template_data)
            photo_source = 'ai_categorized'
            photo_caption = f"Scenic view for {template['title']}"

            # Update template_data with photo
            updated_data = {
                **template_data,
                'photo_url': photo_url,
                'photo_source': photo_source,
                'photo_caption': photo_caption,
                'photo_added_at': '2025-09-15T21:00:00Z',
                'photo_enhancement_version': '2.0'
            }

            try:
                # Update in database
                result = self.supabase.table('trip_templates').update({
                    'template_data': updated_data
                }).eq('id', template['id']).execute()

                if result.data:
                    updates.append(template['id'])
                    logger.info(f"✅ Updated '{template['title']}' with {photo_source} photo")
                else:
                    logger.error(f"❌ Failed to update '{template['title']}'")

            except Exception as e:
                logger.error(f"❌ Error updating template {template['id']}: {e}")

        return updates

    def get_smart_photo_url(self, title, template_data):
        """Get appropriate photo URL based on intelligent content analysis"""

        # High-quality Unsplash photos categorized by keywords
        photo_categories = {
            # Nature & Outdoor
            'mountain': 'https://images.unsplash.com/photo-1464822759844-d150a47e6ecd?w=800&q=80&auto=format&fit=crop',
            'beach': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80&auto=format&fit=crop',
            'forest': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80&auto=format&fit=crop',
            'lake': 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80&auto=format&fit=crop',
            'desert': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80&auto=format&fit=crop',
            'canyon': 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=800&q=80&auto=format&fit=crop',
            'waterfall': 'https://images.unsplash.com/photo-1432889490240-84df33d47091?w=800&q=80&auto=format&fit=crop',

            # Activities
            'hike': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80&auto=format&fit=crop',
            'hiking': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80&auto=format&fit=crop',
            'camping': 'https://images.unsplash.com/photo-1504851149312-7a075b496cc7?w=800&q=80&auto=format&fit=crop',
            'safari': 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80&auto=format&fit=crop',
            'adventure': 'https://images.unsplash.com/photo-1527004760525-72088e4f4ccf?w=800&q=80&auto=format&fit=crop',

            # Urban & Cultural
            'city': 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80&auto=format&fit=crop',
            'urban': 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1f?w=800&q=80&auto=format&fit=crop',
            'museum': 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80&auto=format&fit=crop',
            'architecture': 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80&auto=format&fit=crop',

            # Countries/Regions
            'australia': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop',
            'new_zealand': 'https://images.unsplash.com/photo-1464822759844-d150a47e6ecd?w=800&q=80&auto=format&fit=crop',
            'canada': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80&auto=format&fit=crop',
            'usa': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80&auto=format&fit=crop',
            'united_states': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80&auto=format&fit=crop',
            'uk': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80&auto=format&fit=crop',
            'britain': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80&auto=format&fit=crop',

            # Transport & Travel
            'road_trip': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80&auto=format&fit=crop',
            'rv': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80&auto=format&fit=crop',
            'caravan': 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800&q=80&auto=format&fit=crop',
        }

        # Default fallback
        default_photo = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80&auto=format&fit=crop'

        # Check title and template_data for keywords
        content_text = f"{title} {str(template_data)}".lower()

        # Find best matching category
        for keyword, photo_url in photo_categories.items():
            if keyword in content_text:
                logger.debug(f"Matched '{keyword}' for title: {title}")
                return photo_url

        # If no specific match, try broader categories
        if any(word in content_text for word in ['park', 'nature', 'outdoor']):
            return photo_categories['forest']
        elif any(word in content_text for word in ['water', 'river', 'coast']):
            return photo_categories['lake']
        elif any(word in content_text for word in ['trip', 'travel', 'tour']):
            return photo_categories['road_trip']

        logger.debug(f"Using default photo for title: {title}")
        return default_photo

    def run_enhancement(self):
        """Run the complete photo enhancement process"""
        logger.info("🚀 Starting Quick Template Photo Enhancement")
        logger.info("=" * 50)

        try:
            # Step 1: Find templates without photos
            templates_without_photos = self.analyze_templates()

            if not templates_without_photos:
                logger.info("🎉 All templates already have photos!")
                return {'status': 'complete', 'message': 'All templates already have photos'}

            # Step 2: Add photos
            updated_templates = self.add_photos_to_templates(templates_without_photos)

            # Step 3: Verify results
            final_analysis = self.analyze_templates()

            logger.info("\n" + "=" * 50)
            logger.info("🎉 PHOTO ENHANCEMENT COMPLETE!")
            logger.info(f"✅ Successfully updated {len(updated_templates)} templates")
            logger.info(f"📊 Remaining without photos: {len(final_analysis)}")
            logger.info("=" * 50)

            return {
                'status': 'success',
                'updated_count': len(updated_templates),
                'remaining_count': len(final_analysis),
                'updated_template_ids': updated_templates
            }

        except Exception as e:
            logger.error(f"❌ Error during enhancement: {e}")
            raise

if __name__ == "__main__":
    enhancer = QuickTemplatePhotoAdder()
    results = enhancer.run_enhancement()
    print(f"\n📋 Results: {results}")