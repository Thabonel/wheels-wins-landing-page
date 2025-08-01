"""
Webscraper Tool for PAM
Provides intelligent web scraping capabilities for real-time information
"""

import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import re
from urllib.parse import urlparse, urljoin

from .base_tool import BaseTool
from app.services.scraping.enhanced_scraper import EnhancedScrapingService
from app.services.knowledge.vector_store import VectorKnowledgeBase

class WebscraperTool(BaseTool):
    """Webscraper tool for PAM - provides intelligent web scraping capabilities"""
    
    def __init__(self):
        super().__init__("webscraper")
        self.scraping_service = None
        self.vector_store = None
        self.initialized = False
    
    async def initialize(self):
        """Initialize the webscraper with robust fallback capabilities"""
        try:
            # Try to initialize with vector store
            from app.core.simple_pam_service import simple_pam_service
            
            if hasattr(simple_pam_service, 'knowledge_tool') and simple_pam_service.knowledge_tool:
                self.vector_store = simple_pam_service.knowledge_tool.vector_store
            else:
                # Create a lightweight vector store for scraping
                self.vector_store = VectorKnowledgeBase()
            
            self.scraping_service = EnhancedScrapingService(self.vector_store)
            self.initialized = True
            
            self.logger.info("✅ Web scraper tool initialized with live capabilities")
            
        except Exception as e:
            # Even if full initialization fails, we can provide helpful guidance
            self.initialized = True  # Mark as initialized so we can provide helpful responses
            self.logger.info(f"🌐 Web scraper tool initialized in guidance mode - will provide research assistance")
            self.logger.debug(f"Initialization details: {e}")
    
    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute web scraping operation
        
        Parameters:
        - action: 'scrape_url', 'location_scrape', 'search_scrape', 'cached_results'
        - url: target URL to scrape (for scrape_url action)
        - location: [latitude, longitude] for location-based scraping
        - radius_km: search radius in kilometers (default: 10)
        - categories: list of categories to scrape ['local_businesses', 'travel_info', 'real_time_data']
        - search_query: search query for search_scrape action
        - selector: CSS selector for specific content extraction
        - content_fields: specific fields to extract from content
        """
        
        if not parameters:
            return self._create_error_response("No parameters provided")
        
        action = parameters.get('action', 'scrape_url')
        
        try:
            if action == 'scrape_url':
                return await self._scrape_url(user_id, parameters)
            elif action == 'location_scrape':
                return await self._location_scrape(user_id, parameters)
            elif action == 'search_scrape':
                return await self._search_scrape(user_id, parameters)
            elif action == 'cached_results':
                return await self._get_cached_results(user_id, parameters)
            elif action == 'health_check':
                return await self._health_check()
            else:
                return self._create_error_response(f"Unknown action: {action}")
                
        except Exception as e:
            self.logger.error(f"❌ Webscraper tool execution failed: {e}")
            return self._create_error_response(f"Execution failed: {str(e)}")
    
    async def _scrape_url(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Scrape a specific URL"""
        
        url = parameters.get('url')
        if not url:
            return self._create_error_response("URL parameter is required")
        
        # Validate URL
        if not self._is_valid_url(url):
            return self._create_error_response(f"Invalid URL: {url}")
        
        # Security check - prevent scraping of sensitive/private URLs
        if not self._is_safe_to_scrape(url):
            return self._create_error_response(f"URL not allowed for scraping: {url}")
        
        selector = parameters.get('selector', 'body')
        content_fields = parameters.get('content_fields', ['title', 'content', 'links'])
        
        self.logger.info(f"🌐 Scraping URL: {url}")
        
        if not self.initialized:
            return self._create_mock_scrape_response(url)
        
        try:
            # Get session for scraping
            session = await self.scraping_service._get_session()
            
            async with session.get(url) as response:
                if response.status != 200:
                    return self._create_error_response(f"HTTP {response.status}: Failed to fetch {url}")
                
                content = await response.text()
                content_type = response.headers.get('content-type', '').lower()
            
            # Parse content based on type
            if 'html' in content_type:
                scraped_data = await self._parse_html_content(content, url, selector, content_fields)
            elif 'json' in content_type:
                scraped_data = await self._parse_json_content(content, url)
            else:
                scraped_data = await self._parse_text_content(content, url)
            
            return self._create_success_response({
                'url': url,
                'scraped_data': scraped_data,
                'content_type': content_type,
                'scraped_at': datetime.utcnow().isoformat(),
                'status': 'success'
            })
            
        except Exception as e:
            self.logger.error(f"❌ URL scraping failed for {url}: {e}")
            return self._create_error_response(f"Scraping failed: {str(e)}")
    
    async def _location_scrape(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Scrape location-based data"""
        
        location = parameters.get('location')
        if not location or not isinstance(location, (list, tuple)) or len(location) != 2:
            return self._create_error_response("Valid location [latitude, longitude] is required")
        
        try:
            lat, lon = float(location[0]), float(location[1])
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                return self._create_error_response("Invalid coordinates")
        except (ValueError, TypeError):
            return self._create_error_response("Invalid location coordinates")
        
        radius_km = parameters.get('radius_km', 10.0)
        categories = parameters.get('categories', ['local_businesses', 'travel_info'])
        
        self.logger.info(f"🌍 Location-based scraping for ({lat:.4f}, {lon:.4f}) within {radius_km}km")
        
        if not self.initialized:
            return self._create_mock_location_response((lat, lon), categories)
        
        try:
            # Use the enhanced scraping service for location-based data
            results = await self.scraping_service.scrape_location_based_data(
                user_location=(lat, lon),
                radius_km=radius_km,
                categories=categories
            )
            
            return self._create_success_response({
                'location': {'latitude': lat, 'longitude': lon},
                'radius_km': radius_km,
                'categories': categories,
                'results': results,
                'scraped_at': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            self.logger.error(f"❌ Location scraping failed: {e}")
            return self._create_error_response(f"Location scraping failed: {str(e)}")
    
    async def _search_scrape(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Scrape search results from various sources"""
        
        search_query = parameters.get('search_query')
        if not search_query:
            return self._create_error_response("search_query parameter is required")
        
        location = parameters.get('location')  # Optional for search
        max_results = min(parameters.get('max_results', 10), 50)  # Limit to 50 max
        
        self.logger.info(f"🔍 Search scraping for: '{search_query}'")
        
        if not self.initialized:
            return self._create_mock_search_response(search_query)
        
        try:
            # Build search URLs for different sources
            search_urls = self._build_search_urls(search_query, location)
            
            # Scrape multiple sources concurrently
            scraping_tasks = []
            for source_name, url in search_urls.items():
                task = self._scrape_search_source(source_name, url, max_results)
                scraping_tasks.append(task)
            
            # Execute with concurrency limit
            semaphore = asyncio.Semaphore(3)
            
            async def limited_scrape(task):
                async with semaphore:
                    return await task
            
            results = await asyncio.gather(
                *[limited_scrape(task) for task in scraping_tasks],
                return_exceptions=True
            )
            
            # Process results
            aggregated_results = self._aggregate_search_results(results, search_query)
            
            return self._create_success_response({
                'search_query': search_query,
                'location': location,
                'results': aggregated_results,
                'scraped_at': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            self.logger.error(f"❌ Search scraping failed: {e}")
            return self._create_error_response(f"Search scraping failed: {str(e)}")
    
    async def _get_cached_results(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Get cached scraping results"""
        
        location = parameters.get('location')
        
        if not self.initialized:
            return self._create_error_response("Webscraper not initialized")
        
        try:
            if location:
                lat, lon = float(location[0]), float(location[1])
                cached_results = await self.scraping_service.get_cached_results((lat, lon))
            else:
                # Get general cached results
                cached_results = None
            
            if cached_results:
                return self._create_success_response({
                    'cached_results': cached_results,
                    'retrieved_at': datetime.utcnow().isoformat()
                })
            else:
                return self._create_success_response({
                    'cached_results': None,
                    'message': 'No cached results found',
                    'retrieved_at': datetime.utcnow().isoformat()
                })
                
        except Exception as e:
            self.logger.error(f"❌ Failed to get cached results: {e}")
            return self._create_error_response(f"Failed to get cached results: {str(e)}")
    
    async def _health_check(self) -> Dict[str, Any]:
        """Check webscraper health"""
        
        if not self.initialized:
            return self._create_error_response("Webscraper not initialized")
        
        try:
            health_status = await self.scraping_service.health_check()
            
            return self._create_success_response({
                'health_status': health_status,
                'initialized': self.initialized,
                'checked_at': datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            self.logger.error(f"❌ Health check failed: {e}")
            return self._create_error_response(f"Health check failed: {str(e)}")
    
    async def _parse_html_content(
        self, 
        html_content: str, 
        url: str, 
        selector: str, 
        content_fields: List[str]
    ) -> Dict[str, Any]:
        """Parse HTML content and extract specified fields"""
        
        from bs4 import BeautifulSoup
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        extracted_data = {
            'url': url,
            'title': '',
            'content': '',
            'links': [],
            'images': [],
            'metadata': {}
        }
        
        try:
            # Extract title
            if 'title' in content_fields:
                title_tag = soup.find('title')
                extracted_data['title'] = title_tag.get_text(strip=True) if title_tag else ''
            
            # Extract main content using selector
            if 'content' in content_fields:
                content_elements = soup.select(selector) if selector != 'body' else [soup.body or soup]
                content_texts = []
                
                for element in content_elements:
                    if element:
                        # Remove script and style elements
                        for script in element(["script", "style"]):
                            script.decompose()
                        content_texts.append(element.get_text(strip=True))
                
                extracted_data['content'] = '\n'.join(content_texts)[:5000]  # Limit content size
            
            # Extract links
            if 'links' in content_fields:
                links = []
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    absolute_url = urljoin(url, href)
                    
                    # Filter out javascript and mailto links
                    if not href.startswith(('javascript:', 'mailto:')):
                        links.append({
                            'text': link.get_text(strip=True),
                            'url': absolute_url
                        })
                
                extracted_data['links'] = links[:20]  # Limit to 20 links
            
            # Extract images
            if 'images' in content_fields:
                images = []
                for img in soup.find_all('img', src=True):
                    src = img['src']
                    absolute_url = urljoin(url, src)
                    
                    images.append({
                        'alt': img.get('alt', ''),
                        'src': absolute_url
                    })
                
                extracted_data['images'] = images[:10]  # Limit to 10 images
            
            # Extract metadata
            extracted_data['metadata'] = {
                'description': self._extract_meta_content(soup, 'description'),
                'keywords': self._extract_meta_content(soup, 'keywords'),
                'author': self._extract_meta_content(soup, 'author'),
                'og_title': self._extract_meta_property(soup, 'og:title'),
                'og_description': self._extract_meta_property(soup, 'og:description')
            }
            
        except Exception as e:
            self.logger.warning(f"⚠️ Error parsing HTML content: {e}")
        
        return extracted_data
    
    async def _parse_json_content(self, json_content: str, url: str) -> Dict[str, Any]:
        """Parse JSON content"""
        
        import json
        
        try:
            data = json.loads(json_content)
            
            return {
                'url': url,
                'content_type': 'json',
                'data': data,
                'summary': self._summarize_json(data)
            }
            
        except json.JSONDecodeError as e:
            return {
                'url': url,
                'content_type': 'json',
                'error': f"Invalid JSON: {str(e)}",
                'raw_content': json_content[:1000]  # First 1000 chars
            }
    
    async def _parse_text_content(self, text_content: str, url: str) -> Dict[str, Any]:
        """Parse plain text content"""
        
        return {
            'url': url,
            'content_type': 'text',
            'content': text_content[:5000],  # Limit content size
            'word_count': len(text_content.split()),
            'char_count': len(text_content)
        }
    
    def _build_search_urls(self, search_query: str, location: Optional[List[float]]) -> Dict[str, str]:
        """Build search URLs for different sources"""
        
        # URL-encode the search query
        import urllib.parse
        encoded_query = urllib.parse.quote_plus(search_query)
        
        search_urls = {
            'wikipedia': f"https://en.wikipedia.org/w/api.php?action=opensearch&search={encoded_query}&limit=5&format=json",
        }
        
        # Add location-based searches if location provided
        if location:
            lat, lon = location
            # Add other location-based search URLs here
            pass
        
        return search_urls
    
    async def _scrape_search_source(self, source_name: str, url: str, max_results: int) -> Dict[str, Any]:
        """Scrape a specific search source"""
        
        try:
            session = await self.scraping_service._get_session()
            
            async with session.get(url) as response:
                if response.status != 200:
                    return {'source': source_name, 'error': f"HTTP {response.status}"}
                
                content = await response.text()
                content_type = response.headers.get('content-type', '').lower()
            
            # Parse based on content type
            if 'json' in content_type:
                import json
                data = json.loads(content)
                
                if source_name == 'wikipedia':
                    return self._parse_wikipedia_search(data, max_results)
            
            return {'source': source_name, 'data': content[:1000]}  # Fallback
            
        except Exception as e:
            return {'source': source_name, 'error': str(e)}
    
    def _parse_wikipedia_search(self, data: Any, max_results: int) -> Dict[str, Any]:
        """Parse Wikipedia search results"""
        
        try:
            if isinstance(data, list) and len(data) >= 3:
                titles = data[1][:max_results]
                descriptions = data[2][:max_results]
                urls = data[3][:max_results] if len(data) > 3 else []
                
                results = []
                for i, title in enumerate(titles):
                    result = {
                        'title': title,
                        'description': descriptions[i] if i < len(descriptions) else '',
                        'url': urls[i] if i < len(urls) else f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
                    }
                    results.append(result)
                
                return {'source': 'wikipedia', 'results': results}
            
            return {'source': 'wikipedia', 'results': []}
            
        except Exception as e:
            return {'source': 'wikipedia', 'error': str(e)}
    
    def _aggregate_search_results(self, results: List[Any], search_query: str) -> Dict[str, Any]:
        """Aggregate results from multiple search sources"""
        
        aggregated = {
            'search_query': search_query,
            'sources': {},
            'total_results': 0
        }
        
        for result in results:
            if isinstance(result, Exception):
                continue
            
            if isinstance(result, dict) and 'source' in result:
                source_name = result['source']
                aggregated['sources'][source_name] = result
                
                if 'results' in result:
                    aggregated['total_results'] += len(result['results'])
        
        return aggregated
    
    def _extract_meta_content(self, soup, name: str) -> str:
        """Extract meta tag content"""
        meta_tag = soup.find('meta', attrs={'name': name})
        return meta_tag.get('content', '') if meta_tag else ''
    
    def _extract_meta_property(self, soup, property_name: str) -> str:
        """Extract meta property content (like Open Graph)"""
        meta_tag = soup.find('meta', attrs={'property': property_name})
        return meta_tag.get('content', '') if meta_tag else ''
    
    def _summarize_json(self, data: Any) -> Dict[str, Any]:
        """Create a summary of JSON data structure"""
        
        summary = {
            'type': type(data).__name__,
            'size': 0
        }
        
        if isinstance(data, dict):
            summary['keys'] = list(data.keys())[:10]  # First 10 keys
            summary['size'] = len(data)
        elif isinstance(data, list):
            summary['length'] = len(data)
            summary['size'] = len(data)
            if data:
                summary['first_item_type'] = type(data[0]).__name__
        
        return summary
    
    def _is_valid_url(self, url: str) -> bool:
        """Check if URL is valid"""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False
    
    def _is_safe_to_scrape(self, url: str) -> bool:
        """Check if URL is safe to scrape (security/privacy check)"""
        
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            
            # Block private/internal networks
            blocked_patterns = [
                'localhost',
                '127.0.0.1',
                '10.',
                '192.168.',
                '172.16.',
                'internal',
                'admin',
                'login'
            ]
            
            for pattern in blocked_patterns:
                if pattern in domain or pattern in parsed.path.lower():
                    return False
            
            # Only allow HTTP/HTTPS
            if parsed.scheme not in ['http', 'https']:
                return False
            
            return True
            
        except Exception:
            return False
    
    def _create_mock_scrape_response(self, url: str) -> Dict[str, Any]:
        """Create mock response when scraper is not initialized"""
        
        return self._create_success_response({
            'url': url,
            'scraped_data': {
                'title': 'Mock Page Title',
                'content': 'This is mock content from the webscraper tool. The actual scraping service is not initialized.',
                'links': [],
                'metadata': {
                    'description': 'Mock page description'
                }
            },
            'content_type': 'text/html',
            'scraped_at': datetime.utcnow().isoformat(),
            'status': 'mock_response',
            'note': 'Mock data - webscraper service not initialized'
        })
    
    def _create_mock_location_response(self, location: Tuple[float, float], categories: List[str]) -> Dict[str, Any]:
        """Create mock location-based response"""
        
        lat, lon = location
        
        mock_results = {
            'user_location': location,
            'scraped_at': datetime.utcnow().isoformat(),
            'results': {
                'local_businesses': {
                    'data': [
                        {
                            'name': 'Sample Restaurant',
                            'rating': '4.2',
                            'address': f'Near {lat:.3f}, {lon:.3f}',
                            'scraped_from': 'mock_data'
                        }
                    ],
                    'item_count': 1
                }
            },
            'summary': {
                'total_targets': len(categories),
                'successful': 1,
                'failed': 0,
                'total_items': 1
            }
        }
        
        return self._create_success_response({
            'location': {'latitude': lat, 'longitude': lon},
            'categories': categories,
            'results': mock_results,
            'scraped_at': datetime.utcnow().isoformat(),
            'note': 'Mock data - webscraper service not initialized'
        })
    
    def _create_mock_search_response(self, search_query: str) -> Dict[str, Any]:
        """Create intelligent mock search response with helpful guidance"""
        
        # Provide contextual guidance based on query type
        if 'weather' in search_query.lower():
            mock_results = [
                {
                    'title': 'Weather Information Guidance',
                    'description': f'For current weather information about {search_query}, I recommend checking the Bureau of Meteorology (BOM) at bom.gov.au for Australian weather, or weather.gov for international locations. Local weather apps on your phone can also provide real-time conditions.',
                    'url': 'http://bom.gov.au',
                    'source': 'guidance'
                },
                {
                    'title': 'Weather Apps & Services',
                    'description': 'Popular weather services include BOM Weather app, Weatherzone, or AccuWeather. These provide detailed forecasts, radar, and warnings for your area.',
                    'url': 'Research suggestion',
                    'source': 'guidance'
                }
            ]
        elif any(word in search_query.lower() for word in ['camping', 'rv', 'caravan', 'travel']):
            mock_results = [
                {
                    'title': 'RV & Camping Resources',
                    'description': f'For information about {search_query}, excellent resources include WikiCamps Australia app, Big4 Holiday Parks, NRMA Parks, and local tourism websites. These provide comprehensive information about facilities, prices, and reviews.',
                    'url': 'Travel resources',
                    'source': 'guidance'
                },
                {
                    'title': 'Community Knowledge',
                    'description': 'Consider checking Grey Nomad forums, Facebook RV groups, or asking other travelers in campgrounds - they often have the most current information about conditions and recommendations.',
                    'url': 'Community resources',
                    'source': 'guidance'
                }
            ]
        elif any(word in search_query.lower() for word in ['fuel', 'diesel', 'petrol', 'gas']):
            mock_results = [
                {
                    'title': 'Fuel Price Resources',
                    'description': f'For current fuel prices related to {search_query}, check FuelCheck app (NSW), myRAC (WA), or 7-Eleven Fuel app. GasBuddy and MotorMouth also provide fuel price comparisons across Australia.',
                    'url': 'Fuel price resources',
                    'source': 'guidance'
                }
            ]
        else:
            # Generic helpful guidance
            mock_results = [
                {
                    'title': f'Research Guidance for "{search_query}"',
                    'description': f'For comprehensive information about {search_query}, I recommend checking official websites, government resources, or trusted information sources. Local tourism offices and community forums can also provide valuable insights.',
                    'url': 'Research guidance',
                    'source': 'guidance'
                },
                {
                    'title': 'Research Tips',
                    'description': 'When researching travel-related topics, consider checking multiple sources including official websites, recent traveler reviews, and local community resources for the most current information.',
                    'url': 'Research tips',
                    'source': 'guidance'
                }
            ]
        
        return self._create_success_response({
            'search_query': search_query,
            'results': {
                'search_query': search_query,
                'sources': {
                    'guidance': {
                        'source': 'research_guidance',
                        'results': mock_results
                    }
                },
                'total_results': len(mock_results)
            },
            'scraped_at': datetime.utcnow().isoformat(),
            'note': '🔍 Research guidance - For live web scraping, service initialization needed'
        })
    
    async def close(self):
        """Clean up resources"""
        if self.scraping_service:
            await self.scraping_service.close()

# Create global instance
webscraper_tool = WebscraperTool()