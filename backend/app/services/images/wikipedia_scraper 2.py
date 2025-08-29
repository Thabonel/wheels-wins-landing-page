"""
Wikipedia Scraper Service
Fetches information and images about national parks and landmarks from Wikipedia
"""

import asyncio
import aiohttp
import logging
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
import re
from urllib.parse import quote, unquote

logger = logging.getLogger(__name__)


class WikipediaScraper:
    """Scrapes Wikipedia for national park information and images"""
    
    def __init__(self):
        self.base_url = "https://en.wikipedia.org/w/api.php"
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def search_national_parks(self, country: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search for national parks in a specific country"""
        search_terms = [
            f"national parks in {country}",
            f"list of national parks of {country}",
            f"{country} national park"
        ]
        
        all_results = []
        seen_titles = set()
        
        for term in search_terms:
            results = await self._search_wikipedia(term, limit=20)
            for result in results:
                if result['title'] not in seen_titles:
                    seen_titles.add(result['title'])
                    all_results.append(result)
        
        # Filter results to likely be national parks
        filtered_results = []
        for result in all_results:
            title_lower = result['title'].lower()
            if 'national park' in title_lower or 'national monument' in title_lower:
                filtered_results.append(result)
        
        return filtered_results[:limit]
    
    async def get_national_park_info(self, page_title: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a national park from its Wikipedia page"""
        try:
            # Get page content
            page_data = await self._get_page_content(page_title)
            if not page_data:
                return None
            
            # Extract basic info
            park_info = {
                'name': page_title,
                'wikipedia_page_id': page_data.get('pageid'),
                'wikipedia_url': f"https://en.wikipedia.org/wiki/{quote(page_title.replace(' ', '_'))}",
                'description': self._extract_description(page_data.get('extract', '')),
                'wikipedia_extract': page_data.get('extract', '')[:1000]  # First 1000 chars
            }
            
            # Get page properties and parse infobox
            full_content = await self._get_full_page_content(page_title)
            if full_content:
                infobox_data = self._parse_infobox(full_content)
                park_info.update(infobox_data)
            
            # Get coordinates
            coords = await self._get_coordinates(page_title)
            if coords:
                park_info['latitude'] = coords[0]
                park_info['longitude'] = coords[1]
            
            # Get images
            images = await self._get_page_images(page_title)
            if images:
                # Find the main image (usually the first high-quality image)
                main_image = self._select_best_image(images)
                if main_image:
                    park_info['primary_image_url'] = main_image['url']
                    park_info['thumbnail_url'] = self._get_thumbnail_url(main_image['url'], 400)
                
                # Store gallery of images
                park_info['image_gallery'] = [
                    {
                        'url': img['url'],
                        'caption': img.get('title', ''),
                        'source': 'wikipedia',
                        'attribution': 'CC BY-SA 3.0'
                    }
                    for img in images[:10]  # Limit to 10 images
                ]
            
            # Extract features and activities from content
            if full_content:
                park_info['main_features'] = self._extract_features(full_content)
                park_info['activities'] = self._extract_activities(full_content)
                park_info['wildlife'] = self._extract_wildlife(full_content)
            
            park_info['data_source'] = 'wikipedia'
            park_info['last_updated'] = datetime.utcnow().isoformat()
            
            return park_info
            
        except Exception as e:
            logger.error(f"Error fetching Wikipedia data for {page_title}: {e}")
            return None
    
    async def _search_wikipedia(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search Wikipedia for pages matching the query"""
        params = {
            'action': 'query',
            'format': 'json',
            'list': 'search',
            'srsearch': query,
            'srlimit': limit,
            'srprop': 'snippet|titlesnippet|size|wordcount'
        }
        
        try:
            async with self.session.get(self.base_url, params=params) as response:
                data = await response.json()
                return data.get('query', {}).get('search', [])
        except Exception as e:
            logger.error(f"Wikipedia search error: {e}")
            return []
    
    async def _get_page_content(self, title: str) -> Optional[Dict[str, Any]]:
        """Get page content with extract"""
        params = {
            'action': 'query',
            'format': 'json',
            'titles': title,
            'prop': 'extracts|pageprops|categories',
            'exintro': True,
            'explaintext': True,
            'exlimit': 1,
            'cllimit': 50
        }
        
        try:
            async with self.session.get(self.base_url, params=params) as response:
                data = await response.json()
                pages = data.get('query', {}).get('pages', {})
                # Return the first (and should be only) page
                return next(iter(pages.values()), None)
        except Exception as e:
            logger.error(f"Error getting page content: {e}")
            return None
    
    async def _get_full_page_content(self, title: str) -> Optional[str]:
        """Get full page wikitext content"""
        params = {
            'action': 'query',
            'format': 'json',
            'titles': title,
            'prop': 'revisions',
            'rvprop': 'content',
            'rvslots': 'main'
        }
        
        try:
            async with self.session.get(self.base_url, params=params) as response:
                data = await response.json()
                pages = data.get('query', {}).get('pages', {})
                page = next(iter(pages.values()), None)
                if page and 'revisions' in page:
                    return page['revisions'][0]['slots']['main']['*']
                return None
        except Exception as e:
            logger.error(f"Error getting full page content: {e}")
            return None
    
    async def _get_coordinates(self, title: str) -> Optional[Tuple[float, float]]:
        """Get geographic coordinates for a page"""
        params = {
            'action': 'query',
            'format': 'json',
            'titles': title,
            'prop': 'coordinates',
            'coprimary': 'primary'
        }
        
        try:
            async with self.session.get(self.base_url, params=params) as response:
                data = await response.json()
                pages = data.get('query', {}).get('pages', {})
                page = next(iter(pages.values()), None)
                
                if page and 'coordinates' in page:
                    coord = page['coordinates'][0]
                    return (coord['lat'], coord['lon'])
                return None
        except Exception as e:
            logger.error(f"Error getting coordinates: {e}")
            return None
    
    async def _get_page_images(self, title: str) -> List[Dict[str, Any]]:
        """Get all images from a Wikipedia page"""
        params = {
            'action': 'query',
            'format': 'json',
            'titles': title,
            'prop': 'images',
            'imlimit': 50
        }
        
        try:
            async with self.session.get(self.base_url, params=params) as response:
                data = await response.json()
                pages = data.get('query', {}).get('pages', {})
                page = next(iter(pages.values()), None)
                
                if not page or 'images' not in page:
                    return []
                
                # Get image URLs for each image
                images = []
                for img in page['images']:
                    img_title = img['title']
                    # Skip common Wikipedia icons and logos
                    if any(skip in img_title.lower() for skip in [
                        'commons-logo', 'wikimedia', 'wiki.png', 'edit-icon',
                        'red_pog.svg', 'compass', 'folder', 'question_mark'
                    ]):
                        continue
                    
                    img_info = await self._get_image_info(img_title)
                    if img_info:
                        images.append(img_info)
                
                return images
                
        except Exception as e:
            logger.error(f"Error getting page images: {e}")
            return []
    
    async def _get_image_info(self, image_title: str) -> Optional[Dict[str, Any]]:
        """Get URL and metadata for a specific image"""
        params = {
            'action': 'query',
            'format': 'json',
            'titles': image_title,
            'prop': 'imageinfo',
            'iiprop': 'url|size|mime|metadata|extmetadata',
            'iiurlwidth': 1200  # Get a reasonably sized version
        }
        
        try:
            async with self.session.get(self.base_url, params=params) as response:
                data = await response.json()
                pages = data.get('query', {}).get('pages', {})
                page = next(iter(pages.values()), None)
                
                if page and 'imageinfo' in page:
                    info = page['imageinfo'][0]
                    return {
                        'title': image_title,
                        'url': info.get('url'),
                        'thumb_url': info.get('thumburl'),
                        'width': info.get('width'),
                        'height': info.get('height'),
                        'mime': info.get('mime')
                    }
                return None
                
        except Exception as e:
            logger.error(f"Error getting image info: {e}")
            return None
    
    def _extract_description(self, extract: str) -> str:
        """Extract a clean description from Wikipedia extract"""
        # Remove pronunciation guides
        extract = re.sub(r'\([^)]*pronunciation[^)]*\)', '', extract)
        extract = re.sub(r'\([^)]*listen[^)]*\)', '', extract)
        
        # Take first 2-3 sentences
        sentences = extract.split('. ')
        description = '. '.join(sentences[:3])
        
        # Clean up
        description = re.sub(r'\s+', ' ', description).strip()
        if not description.endswith('.'):
            description += '.'
            
        return description
    
    def _parse_infobox(self, wikitext: str) -> Dict[str, Any]:
        """Parse infobox data from wikitext"""
        info = {}
        
        # Extract infobox content
        infobox_match = re.search(r'\{\{Infobox[^}]+\}\}', wikitext, re.DOTALL | re.IGNORECASE)
        if not infobox_match:
            return info
        
        infobox_text = infobox_match.group(0)
        
        # Parse common fields
        patterns = {
            'area_sq_km': [r'\|\s*area[_\s]*km2\s*=\s*([0-9,\.]+)', r'\|\s*area\s*=\s*([0-9,\.]+)\s*km'],
            'established_date': [r'\|\s*established\s*=\s*([^|\n]+)', r'\|\s*created\s*=\s*([^|\n]+)'],
            'state_province': [r'\|\s*state\s*=\s*([^|\n]+)', r'\|\s*province\s*=\s*([^|\n]+)'],
            'nearest_city': [r'\|\s*nearest[_\s]*city\s*=\s*([^|\n]+)'],
            'visitor_count': [r'\|\s*visitation[_\s]*num\s*=\s*([0-9,]+)']
        }
        
        for field, patterns_list in patterns.items():
            for pattern in patterns_list:
                match = re.search(pattern, infobox_text, re.IGNORECASE)
                if match:
                    value = match.group(1).strip()
                    # Clean wiki markup
                    value = re.sub(r'\[\[([^|\]]+)\|([^\]]+)\]\]', r'\2', value)
                    value = re.sub(r'\[\[([^\]]+)\]\]', r'\1', value)
                    value = re.sub(r'<[^>]+>', '', value)
                    
                    if field == 'area_sq_km':
                        try:
                            info[field] = float(value.replace(',', ''))
                        except:
                            pass
                    elif field == 'visitor_count':
                        try:
                            info['visitor_count_annual'] = int(value.replace(',', ''))
                        except:
                            pass
                    else:
                        info[field] = value
                    break
        
        return info
    
    def _extract_features(self, content: str) -> List[str]:
        """Extract main features from page content"""
        features = []
        
        # Look for geography/geology sections
        feature_patterns = [
            r'==\s*(?:Geography|Geology|Landscape)[^=]*==([^=]+)',
            r'==\s*(?:Natural features|Features)[^=]*==([^=]+)'
        ]
        
        for pattern in feature_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                section = match.group(1)
                # Extract mentioned features
                feature_words = ['mountain', 'lake', 'river', 'canyon', 'valley', 'forest',
                               'desert', 'glacier', 'waterfall', 'beach', 'cliff', 'gorge']
                
                for word in feature_words:
                    if word in section.lower():
                        # Try to extract the specific feature name
                        pattern = rf'\b([A-Z][a-zA-Z]*\s+)*{word}'
                        matches = re.findall(pattern, section, re.IGNORECASE)
                        features.extend([m.strip() for m in matches if m])
        
        return list(set(features))[:10]  # Limit to 10 unique features
    
    def _extract_activities(self, content: str) -> List[str]:
        """Extract available activities from page content"""
        activities = set()
        
        # Common activities to look for
        activity_keywords = {
            'hiking': 'Hiking',
            'camping': 'Camping',
            'fishing': 'Fishing',
            'boating': 'Boating',
            'swimming': 'Swimming',
            'climbing': 'Rock Climbing',
            'biking': 'Biking',
            'cycling': 'Cycling',
            'kayaking': 'Kayaking',
            'canoeing': 'Canoeing',
            'wildlife viewing': 'Wildlife Viewing',
            'bird watching': 'Bird Watching',
            'photography': 'Photography',
            'backpacking': 'Backpacking',
            'horseback riding': 'Horseback Riding',
            'skiing': 'Skiing',
            'snowshoeing': 'Snowshoeing'
        }
        
        content_lower = content.lower()
        for keyword, activity_name in activity_keywords.items():
            if keyword in content_lower:
                activities.add(activity_name)
        
        return list(activities)
    
    def _extract_wildlife(self, content: str) -> List[str]:
        """Extract wildlife information from page content"""
        wildlife = []
        
        # Look for flora and fauna sections
        wildlife_patterns = [
            r'==\s*(?:Wildlife|Fauna|Animals)[^=]*==([^=]+)',
            r'==\s*(?:Flora and fauna|Ecology)[^=]*==([^=]+)'
        ]
        
        for pattern in wildlife_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                section = match.group(1)
                # Extract species mentioned (simple approach)
                # Look for capitalized words that might be species names
                species = re.findall(r'\b([A-Z][a-z]+(?:\s+[a-z]+)?)\b', section)
                wildlife.extend(species)
        
        return list(set(wildlife))[:20]  # Limit to 20 unique species
    
    def _select_best_image(self, images: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Select the best image to use as primary image"""
        if not images:
            return None
        
        # Filter out SVGs and very small images
        good_images = [
            img for img in images
            if img.get('mime', '').startswith('image/') 
            and not img.get('mime', '').endswith('svg+xml')
            and img.get('width', 0) > 400
            and img.get('height', 0) > 300
        ]
        
        if not good_images:
            return images[0] if images else None
        
        # Prefer images with certain keywords in the title
        priority_keywords = ['aerial', 'landscape', 'panorama', 'view', 'entrance']
        
        for keyword in priority_keywords:
            for img in good_images:
                if keyword in img.get('title', '').lower():
                    return img
        
        # Return the first good image
        return good_images[0]
    
    def _get_thumbnail_url(self, image_url: str, width: int = 400) -> str:
        """Convert a Wikipedia image URL to a thumbnail URL"""
        if 'upload.wikimedia.org' in image_url:
            # Wikipedia/Wikimedia URLs can be modified to get thumbnails
            # Example: https://upload.wikimedia.org/wikipedia/commons/X/XX/File.jpg
            # Becomes: https://upload.wikimedia.org/wikipedia/commons/thumb/X/XX/File.jpg/400px-File.jpg
            
            if '/thumb/' not in image_url:
                # Insert /thumb/ after /commons/ or /en/
                parts = image_url.split('/')
                for i, part in enumerate(parts):
                    if part in ['commons', 'en']:
                        parts.insert(i + 1, 'thumb')
                        filename = parts[-1]
                        parts.append(f'{width}px-{filename}')
                        return '/'.join(parts)
            
        return image_url


async def fetch_national_parks_for_country(country: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Fetch national parks data for a specific country"""
    async with WikipediaScraper() as scraper:
        # Search for national parks
        logger.info(f"Searching for national parks in {country}")
        search_results = await scraper.search_national_parks(country, limit=limit)
        
        # Fetch detailed information for each park
        parks_data = []
        for result in search_results:
            logger.info(f"Fetching data for: {result['title']}")
            park_info = await scraper.get_national_park_info(result['title'])
            if park_info:
                park_info['country'] = country
                parks_data.append(park_info)
                
                # Small delay to be respectful to Wikipedia's servers
                await asyncio.sleep(0.5)
        
        logger.info(f"Successfully fetched data for {len(parks_data)} parks in {country}")
        return parks_data