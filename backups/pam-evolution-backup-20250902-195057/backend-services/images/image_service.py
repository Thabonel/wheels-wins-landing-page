"""
Image Service
Handles fetching and managing images for trip templates and locations
Integrates with Wikipedia, Unsplash, and generates location-based map images
"""

import os
import asyncio
import aiohttp
import logging
from typing import List, Dict, Optional, Any, Tuple
from urllib.parse import quote
import hashlib
from datetime import datetime

from app.core.config import get_settings
from .wikipedia_scraper import WikipediaScraper

logger = logging.getLogger(__name__)
settings = get_settings()


class ImageService:
    """Service for fetching and managing images from various sources"""
    
    def __init__(self):
        self.unsplash_access_key = os.getenv('UNSPLASH_ACCESS_KEY')
        self.mapbox_token = os.getenv('VITE_MAPBOX_TOKEN') or os.getenv('MAPBOX_TOKEN')
        self.google_places_key = getattr(settings, 'GOOGLE_PLACES_API_KEY', None)
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def get_trip_template_image(self, template_data: Dict[str, Any]) -> Dict[str, str]:
        """Get appropriate image for a trip template"""
        image_data = {
            'image_url': None,
            'thumbnail_url': None,
            'image_source': None,
            'image_attribution': None
        }
        
        # Extract location information from template
        highlights = template_data.get('highlights', [])
        region = template_data.get('region', '')
        name = template_data.get('name', '')
        category = template_data.get('category', '')
        
        # Try different sources in order of preference
        
        # 1. Try to find images for specific highlights (national parks, landmarks)
        if highlights:
            for highlight in highlights[:3]:  # Check first 3 highlights
                logger.info(f"Searching for image: {highlight}")
                
                # Try Wikipedia first for landmarks and parks
                if 'park' in highlight.lower() or 'national' in highlight.lower():
                    wiki_image = await self._get_wikipedia_image(highlight)
                    if wiki_image:
                        image_data.update(wiki_image)
                        return image_data
                
                # Try Unsplash for general location photos
                if self.unsplash_access_key:
                    unsplash_image = await self._get_unsplash_image(highlight, category)
                    if unsplash_image:
                        image_data.update(unsplash_image)
                        return image_data
        
        # 2. Try region/destination based search
        search_query = f"{region} {category}"
        if 'coastal' in category:
            search_query = f"{region} coast beach"
        elif 'mountain' in category:
            search_query = f"{region} mountains"
        elif 'outback' in category or 'desert' in category:
            search_query = f"{region} outback desert"
        
        # Try Unsplash for regional photos
        if self.unsplash_access_key:
            unsplash_image = await self._get_unsplash_image(search_query, category)
            if unsplash_image:
                image_data.update(unsplash_image)
                return image_data
        
        # 3. Generate a map-based image as fallback
        if self.mapbox_token and highlights:
            map_image = await self._generate_map_image(template_data)
            if map_image:
                image_data.update(map_image)
                return image_data
        
        # 4. Use category-based default images
        default_image = self._get_default_category_image(category)
        image_data.update(default_image)
        
        return image_data
    
    async def _get_wikipedia_image(self, query: str) -> Optional[Dict[str, str]]:
        """Fetch image from Wikipedia"""
        try:
            async with WikipediaScraper() as scraper:
                # Search for the page
                results = await scraper._search_wikipedia(query, limit=1)
                if not results:
                    return None
                
                # Get images from the page
                images = await scraper._get_page_images(results[0]['title'])
                if not images:
                    return None
                
                # Select best image
                best_image = scraper._select_best_image(images)
                if best_image:
                    return {
                        'image_url': best_image['url'],
                        'thumbnail_url': scraper._get_thumbnail_url(best_image['url'], 600),
                        'image_source': 'wikipedia',
                        'image_attribution': f"Wikipedia - {results[0]['title']}"
                    }
                    
        except Exception as e:
            logger.error(f"Error fetching Wikipedia image: {e}")
        
        return None
    
    async def _get_unsplash_image(self, query: str, category: str = None) -> Optional[Dict[str, str]]:
        """Fetch image from Unsplash"""
        if not self.unsplash_access_key:
            return None
        
        try:
            # Add category-specific keywords
            if category:
                if 'coastal' in category:
                    query += ' ocean beach coast'
                elif 'mountain' in category:
                    query += ' mountains peaks'
                elif 'desert' in category or 'outback' in category:
                    query += ' desert landscape'
                elif 'national_park' in category:
                    query += ' national park nature'
                    
            params = {
                'query': query,
                'per_page': 1,
                'orientation': 'landscape',
                'content_filter': 'high'
            }
            
            headers = {
                'Authorization': f'Client-ID {self.unsplash_access_key}'
            }
            
            url = 'https://api.unsplash.com/search/photos'
            
            async with self.session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    if data['results']:
                        photo = data['results'][0]
                        return {
                            'image_url': photo['urls']['regular'],
                            'thumbnail_url': photo['urls']['small'],
                            'image_source': 'unsplash',
                            'image_attribution': f"Photo by {photo['user']['name']} on Unsplash"
                        }
                        
        except Exception as e:
            logger.error(f"Error fetching Unsplash image: {e}")
        
        return None
    
    async def _get_google_places_image(self, place_name: str, location: Tuple[float, float] = None) -> Optional[Dict[str, str]]:
        """Fetch image from Google Places API"""
        if not self.google_places_key:
            return None
        
        try:
            # First, search for the place
            search_params = {
                'input': place_name,
                'inputtype': 'textquery',
                'fields': 'photos,name,place_id',
                'key': self.google_places_key
            }
            
            if location:
                search_params['locationbias'] = f'circle:50000@{location[0]},{location[1]}'
            
            search_url = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json'
            
            async with self.session.get(search_url, params=search_params) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get('candidates') and data['candidates'][0].get('photos'):
                        photo_ref = data['candidates'][0]['photos'][0]['photo_reference']
                        place_name = data['candidates'][0]['name']
                        
                        # Get the photo URL
                        photo_url = (
                            f"https://maps.googleapis.com/maps/api/place/photo"
                            f"?maxwidth=1200&photoreference={photo_ref}&key={self.google_places_key}"
                        )
                        
                        thumb_url = (
                            f"https://maps.googleapis.com/maps/api/place/photo"
                            f"?maxwidth=400&photoreference={photo_ref}&key={self.google_places_key}"
                        )
                        
                        return {
                            'image_url': photo_url,
                            'thumbnail_url': thumb_url,
                            'image_source': 'google_places',
                            'image_attribution': f"Google Places - {place_name}"
                        }
                        
        except Exception as e:
            logger.error(f"Error fetching Google Places image: {e}")
        
        return None
    
    async def _generate_map_image(self, template_data: Dict[str, Any]) -> Dict[str, str]:
        """Generate a static map image using Mapbox"""
        if not self.mapbox_token:
            return self._get_default_category_image(template_data.get('category', 'general'))
        
        try:
            # Extract location data
            highlights = template_data.get('highlights', [])
            region = template_data.get('region', '')
            
            # Try to determine coordinates for the region/highlights
            center_lat, center_lon, zoom = self._get_map_coordinates(region, highlights)
            
            # Generate unique map style based on category
            style = 'outdoors-v12'  # Default style
            category = template_data.get('category', '')
            if 'coastal' in category:
                style = 'satellite-streets-v12'
            elif 'mountain' in category:
                style = 'outdoors-v12'
            elif 'desert' in category or 'outback' in category:
                style = 'satellite-v9'
            
            # Create map URL with markers for highlights
            markers = []
            if len(highlights) > 0:
                # Add a marker for the first highlight
                markers.append(f'pin-l-park+3b82f6({center_lon},{center_lat})')
            
            markers_str = ','.join(markers) if markers else f'pin-s+3b82f6({center_lon},{center_lat})'
            
            map_url = (
                f"https://api.mapbox.com/styles/v1/mapbox/{style}/static/"
                f"{markers_str}/{center_lon},{center_lat},{zoom},0/800x400@2x"
                f"?access_token={self.mapbox_token}"
            )
            
            thumb_url = (
                f"https://api.mapbox.com/styles/v1/mapbox/{style}/static/"
                f"{markers_str}/{center_lon},{center_lat},{zoom},0/400x200@2x"
                f"?access_token={self.mapbox_token}"
            )
            
            return {
                'image_url': map_url,
                'thumbnail_url': thumb_url,
                'image_source': 'mapbox',
                'image_attribution': 'Mapbox'
            }
            
        except Exception as e:
            logger.error(f"Error generating map image: {e}")
            return self._get_default_category_image(template_data.get('category', 'general'))
    
    def _get_map_coordinates(self, region: str, highlights: List[str]) -> Tuple[float, float, int]:
        """Get approximate coordinates for a region"""
        # Region coordinates mapping
        region_coords = {
            'Australia': (-25.2744, 133.7751, 4),
            'United States': (37.0902, -95.7129, 4),
            'Canada': (56.1304, -106.3468, 3),
            'New Zealand': (-40.9006, 174.8860, 5),
            'United Kingdom': (55.3781, -3.4360, 5),
            'Victoria': (-37.4713, 144.7852, 6),
            'Queensland': (-20.9176, 142.7028, 5),
            'New South Wales': (-31.8401, 145.6121, 5),
            'Tasmania': (-41.4545, 145.9707, 6),
            'Western Australia': (-27.6728, 121.6283, 5),
        }
        
        # Specific location coordinates for popular destinations
        location_coords = {
            'Great Barrier Reef': (-18.2871, 147.6992, 8),
            'Uluru': (-25.3444, 131.0369, 10),
            'Sydney': (-33.8688, 151.2093, 10),
            'Melbourne': (-37.8136, 144.9631, 10),
            'Byron Bay': (-28.6434, 153.6122, 11),
            'Gold Coast': (-28.0167, 153.4000, 10),
            'Twelve Apostles': (-38.6662, 143.1044, 11),
            'Kakadu': (-12.8375, 132.9028, 9),
            'Fraser Island': (-25.2350, 153.1160, 10),
            'Cradle Mountain': (-41.6818, 145.9369, 11),
        }
        
        # Check highlights for specific locations
        for highlight in highlights:
            for location, coords in location_coords.items():
                if location.lower() in highlight.lower():
                    return coords
        
        # Check region
        for region_name, coords in region_coords.items():
            if region_name.lower() in region.lower():
                return coords
        
        # Default to Australia if no match
        return region_coords['Australia']
    
    def _get_default_category_image(self, category: str) -> Dict[str, str]:
        """Get default image URL based on category"""
        # Using stock photo URLs that represent each category
        category_images = {
            'coastal': {
                'image_url': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
                'thumbnail_url': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
                'image_source': 'unsplash_default',
                'image_attribution': 'Coastal landscape'
            },
            'mountain': {
                'image_url': 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e',
                'thumbnail_url': 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400',
                'image_source': 'unsplash_default',
                'image_attribution': 'Mountain landscape'
            },
            'outback': {
                'image_url': 'https://images.unsplash.com/photo-1494548162494-384bba4ab999',
                'thumbnail_url': 'https://images.unsplash.com/photo-1494548162494-384bba4ab999?w=400',
                'image_source': 'unsplash_default',
                'image_attribution': 'Desert landscape'
            },
            'national_parks': {
                'image_url': 'https://images.unsplash.com/photo-1444927714506-8492d94b4e3d',
                'thumbnail_url': 'https://images.unsplash.com/photo-1444927714506-8492d94b4e3d?w=400',
                'image_source': 'unsplash_default',
                'image_attribution': 'National park landscape'
            },
            'general': {
                'image_url': 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7',
                'thumbnail_url': 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=400',
                'image_source': 'unsplash_default',
                'image_attribution': 'RV travel landscape'
            }
        }
        
        return category_images.get(category, category_images['general'])
    
    async def update_trip_template_images(self, template_id: str, template_data: Dict[str, Any]) -> bool:
        """Update a trip template with appropriate images"""
        try:
            # Get image for the template
            image_data = await self.get_trip_template_image(template_data)
            
            if image_data['image_url']:
                # Update the template in database
                from app.services.database import get_database_service
                db = get_database_service()
                
                update_data = {
                    'image_url': image_data['image_url'],
                    'thumbnail_url': image_data['thumbnail_url'],
                    'image_source': image_data['image_source'],
                    'image_attribution': image_data['image_attribution']
                }
                
                await db.update_record(
                    'trip_templates',
                    {'id': template_id},
                    update_data
                )
                
                logger.info(f"Updated template {template_id} with image from {image_data['image_source']}")
                return True
                
        except Exception as e:
            logger.error(f"Error updating template images: {e}")
        
        return False