"""
Photo Storage Service for Supabase
Handles downloading and storing location photos in Supabase Storage
"""

import asyncio
import aiohttp
import logging
import hashlib
from typing import Optional, Dict
from urllib.parse import urlparse
import os
from supabase import Client

logger = logging.getLogger(__name__)

class PhotoStorageService:
    """Manages photo storage in Supabase Storage"""

    # Storage configuration - using existing public-assets bucket
    BUCKET_NAME = 'public-assets'
    FOLDER_NAME = 'scraped-locations'  # Subfolder for scraped location photos
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB limit
    ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/webp'}

    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.session = None

    async def __aenter__(self):
        timeout = aiohttp.ClientTimeout(total=60)
        self.session = aiohttp.ClientSession(
            timeout=timeout,
            headers={
                'User-Agent': 'WheelsWins-PhotoStorage/1.0 (https://wheelsandwins.com)'
            }
        )
        # No need to create bucket - using existing public-assets bucket
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()


    def generate_file_path(self, location_data: Dict, image_url: str) -> str:
        """Generate a unique file path for the location photo"""
        # Create a unique filename based on location data
        name = location_data.get('name', 'unknown')
        country = location_data.get('country', 'unknown')
        lat = location_data.get('latitude', 0)
        lng = location_data.get('longitude', 0)

        # Create hash for uniqueness
        content_hash = hashlib.md5(
            f"{name}_{country}_{lat}_{lng}".encode()
        ).hexdigest()[:12]

        # Get file extension from URL
        parsed_url = urlparse(image_url)
        path = parsed_url.path.lower()

        if path.endswith('.jpg') or path.endswith('.jpeg'):
            ext = '.jpg'
        elif path.endswith('.png'):
            ext = '.png'
        elif path.endswith('.webp'):
            ext = '.webp'
        else:
            ext = '.jpg'  # Default to jpg

        # Clean filename
        clean_name = ''.join(c for c in name if c.isalnum() or c in '-_')[:30]
        filename = f"{clean_name}_{content_hash}{ext}"

        # Organize by country within scraped-locations folder
        folder = country.replace('_', '-') if country != 'unknown' else 'other'

        return f"{self.FOLDER_NAME}/{folder}/{filename}"

    async def download_image(self, image_url: str) -> Optional[bytes]:
        """Download image from URL and return bytes"""
        try:
            logger.debug(f"📥 Downloading image: {image_url[:100]}...")

            async with self.session.get(image_url) as response:
                if response.status != 200:
                    logger.warning(f"Failed to download image: HTTP {response.status}")
                    return None

                # Check content type
                content_type = response.headers.get('content-type', '').lower()
                if not any(allowed in content_type for allowed in self.ALLOWED_TYPES):
                    logger.warning(f"Unsupported image type: {content_type}")
                    return None

                # Check content length
                content_length = response.headers.get('content-length')
                if content_length and int(content_length) > self.MAX_FILE_SIZE:
                    logger.warning(f"Image too large: {content_length} bytes")
                    return None

                # Read content with size limit
                content = await response.read()
                if len(content) > self.MAX_FILE_SIZE:
                    logger.warning(f"Downloaded image too large: {len(content)} bytes")
                    return None

                logger.debug(f"✅ Downloaded {len(content)} bytes")
                return content

        except Exception as e:
            logger.error(f"Error downloading image: {e}")
            return None

    async def upload_to_storage(self, file_path: str, image_data: bytes, content_type: str = 'image/jpeg') -> Optional[str]:
        """Upload image data to Supabase Storage"""
        try:
            logger.debug(f"☁️ Uploading to storage: {file_path}")

            # Upload to storage
            result = self.supabase.storage.from_(self.BUCKET_NAME).upload(
                path=file_path,
                file=image_data,
                file_options={
                    'content-type': content_type,
                    'cache-control': '3600',
                    'upsert': True  # Replace if exists
                }
            )

            if result.get('error'):
                logger.error(f"Storage upload failed: {result['error']}")
                return None

            # Get public URL
            public_url_result = self.supabase.storage.from_(self.BUCKET_NAME).get_public_url(file_path)
            public_url = public_url_result.get('publicURL') or public_url_result.get('publicUrl')

            if not public_url:
                logger.error("Failed to get public URL after upload")
                return None

            logger.debug(f"✅ Uploaded to storage: {public_url}")
            return public_url

        except Exception as e:
            logger.error(f"Error uploading to storage: {e}")
            return None

    async def store_location_photo(self, location_data: Dict, image_url: str) -> Optional[str]:
        """
        Download and store a photo for a location
        Returns the Supabase Storage public URL
        """
        try:
            # Generate file path
            file_path = self.generate_file_path(location_data, image_url)

            # Check if file already exists
            existing_url = await self.get_existing_photo_url(file_path)
            if existing_url:
                logger.debug(f"Photo already exists for {location_data.get('name')}: {file_path}")
                return existing_url

            # Download image
            image_data = await self.download_image(image_url)
            if not image_data:
                return None

            # Determine content type
            content_type = 'image/jpeg'  # Default
            if image_url.lower().endswith('.png'):
                content_type = 'image/png'
            elif image_url.lower().endswith('.webp'):
                content_type = 'image/webp'

            # Upload to storage
            storage_url = await self.upload_to_storage(file_path, image_data, content_type)

            if storage_url:
                logger.info(f"✅ Stored photo for {location_data.get('name')}: {storage_url}")

            return storage_url

        except Exception as e:
            logger.error(f"Error storing photo for {location_data.get('name')}: {e}")
            return None

    async def get_existing_photo_url(self, file_path: str) -> Optional[str]:
        """Check if photo already exists and return its URL"""
        try:
            # List files in the directory
            folder = '/'.join(file_path.split('/')[:-1])
            filename = file_path.split('/')[-1]

            files_result = self.supabase.storage.from_(self.BUCKET_NAME).list(folder)

            if files_result.get('error'):
                return None

            files = files_result.get('data', [])

            # Check if our file exists
            for file_info in files:
                if file_info.get('name') == filename:
                    # Get public URL using the same pattern as trip templates
                    public_url_result = self.supabase.storage.from_(self.BUCKET_NAME).get_public_url(file_path)
                    return public_url_result.get('publicURL') or public_url_result.get('publicUrl')

            return None

        except Exception as e:
            logger.debug(f"Error checking existing photo: {e}")
            return None

    async def batch_store_photos(self, locations_with_photos: List[Dict], max_concurrent: int = 3) -> Dict[str, str]:
        """
        Store photos for multiple locations concurrently
        Returns dict mapping location names to storage URLs
        """
        logger.info(f"☁️ Storing photos for {len(locations_with_photos)} locations")

        semaphore = asyncio.Semaphore(max_concurrent)

        async def store_with_limit(location):
            async with semaphore:
                try:
                    photo_url = location.get('photo_url')
                    if not photo_url:
                        return location.get('name', ''), None

                    storage_url = await self.store_location_photo(location, photo_url)
                    return location.get('name', ''), storage_url

                except Exception as e:
                    logger.error(f"Error storing photo for {location.get('name')}: {e}")
                    return location.get('name', ''), None

        # Execute storage operations concurrently
        tasks = [store_with_limit(loc) for loc in locations_with_photos if loc.get('photo_url')]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Build result dict
        storage_results = {}
        success_count = 0

        for result in results:
            if isinstance(result, tuple) and len(result) == 2:
                name, storage_url = result
                if name and storage_url:
                    storage_results[name] = storage_url
                    success_count += 1

        logger.info(f"✅ Stored {success_count}/{len(locations_with_photos)} photos")
        return storage_results


# Utility function for integration
async def store_location_photos(supabase_client: Client, locations: List[Dict]) -> List[Dict]:
    """
    Store photos for locations and update their data with storage URLs
    """
    if not locations:
        return locations

    # Filter locations that have photos
    locations_with_photos = [loc for loc in locations if loc.get('photo_url')]

    if not locations_with_photos:
        logger.info("No locations with photos to store")
        return locations

    async with PhotoStorageService(supabase_client) as storage:
        storage_results = await storage.batch_store_photos(locations_with_photos)

        # Update location data with storage URLs
        for location in locations:
            name = location.get('name', '')
            if name in storage_results:
                # Replace photo_url with stored URL
                location['photo_url'] = storage_results[name]
                location['photo_stored'] = True
            elif location.get('photo_url'):
                # Photo URL exists but storage failed
                location['photo_stored'] = False

    return locations