"""
Location Photo Scraper Service
Adapts the frontend photo scraping system for individual scraped locations
Uses Wikipedia, Google Search, and Tourism APIs to find representative photos
"""

import asyncio
import aiohttp
import logging
import hashlib
from typing import Optional, Dict, List
from urllib.parse import quote_plus
import json

logger = logging.getLogger(__name__)

class LocationPhotoScraper:
    """Photo scraper for individual attractions and locations"""

    def __init__(self):
        self.session = None

    async def __aenter__(self):
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(
            timeout=timeout,
            headers={
                'User-Agent': 'WheelsWins-PhotoScraper/1.0 (https://wheelsandwins.com)'
            }
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def get_wikipedia_image(self, search_term: str, country: str = None) -> Optional[str]:
        """
        Search Wikipedia for a location and get its main image
        """
        try:
            # Enhance search term with country for better results
            if country and country != 'unknown':
                enhanced_term = f"{search_term} {country.replace('_', ' ')}"
            else:
                enhanced_term = search_term

            # Use Wikipedia REST API
            encoded_term = quote_plus(enhanced_term)
            search_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded_term}"

            logger.debug(f"🔍 Searching Wikipedia for: {enhanced_term}")

            async with self.session.get(search_url) as response:
                if response.status != 200:
                    logger.debug(f"Wikipedia page not found for: {enhanced_term}")
                    return None

                data = await response.json()

                # Get the thumbnail or original image
                if 'thumbnail' in data and data['thumbnail'].get('source'):
                    # Get higher resolution version (800px width)
                    image_url = data['thumbnail']['source'].replace('/250px-', '/800px-')
                    logger.debug(f"✅ Found Wikipedia image for {search_term}")
                    return image_url
                elif 'originalimage' in data and data['originalimage'].get('source'):
                    logger.debug(f"✅ Found Wikipedia original image for {search_term}")
                    return data['originalimage']['source']

                logger.debug(f"No image found on Wikipedia for: {enhanced_term}")
                return None

        except Exception as e:
            logger.error(f"Error fetching Wikipedia image for {search_term}: {e}")
            return None

    async def get_tourism_image(self, location_name: str, country: str, attraction_type: str = None) -> Optional[str]:
        """
        Try to get images from official tourism websites
        """
        try:
            # Country-specific tourism API endpoints
            tourism_apis = {
                'australia': 'https://www.australia.com',
                'new_zealand': 'https://www.newzealand.com',
                'canada': 'https://www.pc.gc.ca',
                'united_states': 'https://www.nps.gov',
                'great_britain': 'https://www.visitbritain.com'
            }

            if country not in tourism_apis:
                return None

            # This would require specific API implementations for each tourism site
            # For now, return None and rely on Wikipedia
            logger.debug(f"Tourism API not implemented for {country}")
            return None

        except Exception as e:
            logger.error(f"Error fetching tourism image for {location_name}: {e}")
            return None

    def generate_search_query(self, location_data: Dict) -> str:
        """
        Generate an intelligent search query for the location
        """
        name = location_data.get('name', '')
        country = location_data.get('country', '').replace('_', ' ')
        attraction_type = location_data.get('attraction_type', '')

        # Build query components
        query_parts = [name]

        # Add attraction type if it helps (but not generic ones)
        if attraction_type and attraction_type not in ['attraction', 'point_of_interest']:
            query_parts.append(attraction_type.replace('_', ' '))

        # Add country for disambiguation
        if country and country != 'unknown':
            query_parts.append(country)

        return ' '.join(query_parts)

    async def search_location_photo(self, location_data: Dict) -> Optional[Dict]:
        """
        Search for a photo of the given location
        Returns dict with image_url, source, and metadata
        """
        name = location_data.get('name', '')
        country = location_data.get('country', 'unknown')

        if not name:
            logger.warning("No name provided for photo search")
            return None

        logger.info(f"🔍 Searching for photo of: {name} ({country})")

        # Try Wikipedia first (most reliable source)
        wiki_image = await self.get_wikipedia_image(name, country)
        if wiki_image:
            return {
                'image_url': wiki_image,
                'source': 'wikipedia',
                'search_query': self.generate_search_query(location_data),
                'confidence': 'high'
            }

        # Try tourism websites
        tourism_image = await self.get_tourism_image(
            name, country, location_data.get('attraction_type')
        )
        if tourism_image:
            return {
                'image_url': tourism_image,
                'source': 'tourism_official',
                'search_query': self.generate_search_query(location_data),
                'confidence': 'high'
            }

        # If no image found, return search query for manual resolution
        search_query = self.generate_search_query(location_data)
        logger.debug(f"⚠️ No image found for {name}, manual search needed: {search_query}")

        return {
            'image_url': None,
            'source': 'none',
            'search_query': search_query,
            'confidence': 'none',
            'google_search_url': f"https://www.google.com/search?tbm=isch&q={quote_plus(search_query)}"
        }

    async def batch_search_photos(self, locations: List[Dict], max_concurrent: int = 5) -> Dict[str, Dict]:
        """
        Search for photos for multiple locations concurrently
        Returns dict mapping location names to photo results
        """
        logger.info(f"🔍 Searching for photos for {len(locations)} locations")

        # Limit concurrent requests to avoid overwhelming APIs
        semaphore = asyncio.Semaphore(max_concurrent)

        async def search_with_limit(location):
            async with semaphore:
                try:
                    result = await self.search_location_photo(location)
                    return location.get('name', ''), result
                except Exception as e:
                    logger.error(f"Error searching photo for {location.get('name')}: {e}")
                    return location.get('name', ''), None

        # Execute searches concurrently
        tasks = [search_with_limit(loc) for loc in locations]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Filter out exceptions and build result dict
        photo_results = {}
        success_count = 0

        for result in results:
            if isinstance(result, tuple) and len(result) == 2:
                name, photo_data = result
                if photo_data and name:
                    photo_results[name] = photo_data
                    if photo_data.get('image_url'):
                        success_count += 1

        logger.info(f"✅ Found photos for {success_count}/{len(locations)} locations")
        return photo_results


# Utility functions for integration with existing scraper
async def add_photos_to_locations(locations: List[Dict]) -> List[Dict]:
    """
    Add photo data to a list of location dictionaries
    """
    if not locations:
        return locations

    async with LocationPhotoScraper() as photo_scraper:
        photo_results = await photo_scraper.batch_search_photos(locations)

        # Add photo data to each location
        for location in locations:
            name = location.get('name', '')
            if name in photo_results:
                photo_data = photo_results[name]
                location['photo_url'] = photo_data.get('image_url')
                location['photo_source'] = photo_data.get('source', 'none')
                location['photo_search_query'] = photo_data.get('search_query', '')
                location['photo_confidence'] = photo_data.get('confidence', 'none')
                if 'google_search_url' in photo_data:
                    location['photo_search_url'] = photo_data['google_search_url']

    return locations


async def test_photo_scraper():
    """Test function for the photo scraper"""
    test_locations = [
        {
            'name': 'Sydney Opera House',
            'country': 'australia',
            'attraction_type': 'cultural'
        },
        {
            'name': 'Uluru',
            'country': 'australia',
            'attraction_type': 'natural'
        },
        {
            'name': 'Milford Sound',
            'country': 'new_zealand',
            'attraction_type': 'natural'
        }
    ]

    async with LocationPhotoScraper() as scraper:
        results = await scraper.batch_search_photos(test_locations)

        for name, result in results.items():
            print(f"\n{name}:")
            print(f"  Image URL: {result.get('image_url', 'None')}")
            print(f"  Source: {result.get('source', 'None')}")
            print(f"  Search Query: {result.get('search_query', 'None')}")


if __name__ == "__main__":
    # Run test
    asyncio.run(test_photo_scraper())