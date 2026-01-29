"""
Web Search Service for PAM
Provides internet search capabilities using multiple search engines
"""

import asyncio
import hashlib
import json
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

import aiohttp
from bs4 import BeautifulSoup

from app.core.config import get_settings
from app.services.cache import cache_service

logger = logging.getLogger(__name__)
settings = get_settings()


class WebSearchEngine:
    """Base class for web search engines"""
    
    def __init__(self):
        self.session = None
        self.rate_limit_delay = 1.0  # Default 1 second between requests
        self.last_request_time = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get aiohttp session with proper compression handling"""
        if not self.session:
            # Create connector with timeout and compression settings
            connector = aiohttp.TCPConnector(
                limit=10,
                limit_per_host=5,
                ttl_dns_cache=300
            )

            # Create timeout configuration
            timeout = aiohttp.ClientTimeout(total=30, connect=10)

            self.session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',  # Avoid brotli compression
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            )
        return self.session
    
    async def close(self):
        """Close the session"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def _rate_limit(self):
        """Implement rate limiting"""
        if self.last_request_time:
            elapsed = datetime.now().timestamp() - self.last_request_time
            if elapsed < self.rate_limit_delay:
                await asyncio.sleep(self.rate_limit_delay - elapsed)
        self.last_request_time = datetime.now().timestamp()
    
    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Perform search - to be implemented by subclasses"""
        raise NotImplementedError


class GoogleSearchAPI(WebSearchEngine):
    """Google Custom Search API integration"""
    
    def __init__(self):
        super().__init__()
        # Support both naming conventions (GOOGLE_CUSTOM_SEARCH_* and GOOGLE_SEARCH_*)
        self.api_key = (
            getattr(settings, 'GOOGLE_CUSTOM_SEARCH_API_KEY', None) or
            getattr(settings, 'GOOGLE_SEARCH_API_KEY', None)
        )
        self.search_engine_id = (
            getattr(settings, 'GOOGLE_CUSTOM_SEARCH_ENGINE_ID', None) or
            getattr(settings, 'GOOGLE_SEARCH_ENGINE_ID', None)
        )
        self.base_url = "https://www.googleapis.com/customsearch/v1"
        self.is_available = bool(self.api_key and self.search_engine_id)
        
        if self.is_available:
            logger.info("✅ Google Custom Search API configured")
        else:
            logger.warning("⚠️ Google Custom Search API not configured")
    
    async def search(
        self, 
        query: str, 
        num_results: int = 10,
        search_type: Optional[str] = None,
        site_search: Optional[str] = None,
        file_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search using Google Custom Search API"""
        
        if not self.is_available:
            logger.error("❌ Google Search API not available")
            return []
        
        await self._rate_limit()
        
        try:
            session = await self._get_session()
            
            params = {
                'key': self.api_key,
                'cx': self.search_engine_id,
                'q': query,
                'num': min(num_results, 10),  # Google limits to 10 per request
                'safe': 'active'
            }
            
            if search_type:
                params['searchType'] = search_type  # 'image' for image search
            
            if site_search:
                params['siteSearch'] = site_search
            
            if file_type:
                params['fileType'] = file_type
            
            logger.info(f"🔍 Searching Google for: {query}")
            
            async with session.get(self.base_url, params=params) as response:
                if response.status != 200:
                    logger.error(f"❌ Google Search API error: {response.status}")
                    return []
                
                data = await response.json()
                
                results = []
                for item in data.get('items', []):
                    result = {
                        'title': item.get('title', ''),
                        'url': item.get('link', ''),
                        'snippet': item.get('snippet', ''),
                        'display_link': item.get('displayLink', ''),
                        'source': 'google_search',
                        'search_query': query,
                        'timestamp': datetime.now().isoformat()
                    }
                    
                    # Add metadata if available
                    if 'pagemap' in item:
                        pagemap = item['pagemap']
                        if 'metatags' in pagemap and pagemap['metatags']:
                            metatags = pagemap['metatags'][0]
                            result['meta_description'] = metatags.get('og:description', '')
                            result['meta_image'] = metatags.get('og:image', '')
                    
                    results.append(result)
                
                logger.info(f"✅ Found {len(results)} results from Google")
                return results
                
        except Exception as e:
            logger.error(f"❌ Google Search error: {e}")
            return []


class DuckDuckGoSearch(WebSearchEngine):
    """DuckDuckGo search integration (no API key required)"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://html.duckduckgo.com/html/"
        self.rate_limit_delay = 2.0  # Be respectful to DDG
        logger.info("✅ DuckDuckGo search initialized")
    
    async def search(
        self, 
        query: str, 
        num_results: int = 10,
        region: str = 'us-en'
    ) -> List[Dict[str, Any]]:
        """Search using DuckDuckGo HTML interface"""
        
        await self._rate_limit()
        
        try:
            session = await self._get_session()
            
            data = {
                'q': query,
                'kl': region
            }
            
            logger.info(f"🔍 Searching DuckDuckGo for: {query}")
            
            async with session.post(self.base_url, data=data) as response:
                if response.status != 200:
                    logger.error(f"❌ DuckDuckGo search error: {response.status}")
                    return []
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                results = []
                
                # Parse search results
                for idx, result_div in enumerate(soup.find_all('div', class_='result')):
                    if idx >= num_results:
                        break
                    
                    try:
                        # Extract title and URL
                        title_elem = result_div.find('a', class_='result__a')
                        if not title_elem:
                            continue
                        
                        title = title_elem.text.strip()
                        url = title_elem.get('href', '')
                        
                        # Extract snippet
                        snippet_elem = result_div.find('a', class_='result__snippet')
                        snippet = snippet_elem.text.strip() if snippet_elem else ''
                        
                        # Extract display URL
                        url_elem = result_div.find('a', class_='result__url')
                        display_url = url_elem.text.strip() if url_elem else ''
                        
                        result = {
                            'title': title,
                            'url': url,
                            'snippet': snippet,
                            'display_link': display_url,
                            'source': 'duckduckgo',
                            'search_query': query,
                            'timestamp': datetime.now().isoformat()
                        }
                        
                        results.append(result)
                        
                    except Exception as e:
                        logger.warning(f"⚠️ Failed to parse DuckDuckGo result: {e}")
                        continue
                
                logger.info(f"✅ Found {len(results)} results from DuckDuckGo")
                return results
                
        except Exception as e:
            logger.error(f"❌ DuckDuckGo search error: {e}")
            return []


class BingSearchAPI(WebSearchEngine):
    """Bing Web Search API integration"""
    
    def __init__(self):
        super().__init__()
        # Support multiple naming conventions for Bing API key
        self.api_key = (
            getattr(settings, 'BING_SEARCH_API_KEY', None) or
            getattr(settings, 'AZURE_BING_SEARCH_KEY', None)
        )
        self.base_url = "https://api.bing.microsoft.com/v7.0/search"
        self.is_available = bool(self.api_key)
        
        if self.is_available:
            logger.info("✅ Bing Search API configured")
        else:
            logger.warning("⚠️ Bing Search API not configured")
    
    async def search(
        self, 
        query: str, 
        num_results: int = 10,
        market: str = 'en-US',
        safe_search: str = 'Moderate'
    ) -> List[Dict[str, Any]]:
        """Search using Bing Web Search API"""
        
        if not self.is_available:
            logger.error("❌ Bing Search API not available")
            return []
        
        await self._rate_limit()
        
        try:
            session = await self._get_session()
            
            headers = {
                'Ocp-Apim-Subscription-Key': self.api_key
            }
            
            params = {
                'q': query,
                'count': min(num_results, 50),  # Bing allows up to 50
                'mkt': market,
                'safeSearch': safe_search
            }
            
            logger.info(f"🔍 Searching Bing for: {query}")
            
            async with session.get(self.base_url, headers=headers, params=params) as response:
                if response.status != 200:
                    logger.error(f"❌ Bing Search API error: {response.status}")
                    return []
                
                data = await response.json()
                
                results = []
                for item in data.get('webPages', {}).get('value', []):
                    result = {
                        'title': item.get('name', ''),
                        'url': item.get('url', ''),
                        'snippet': item.get('snippet', ''),
                        'display_link': item.get('displayUrl', ''),
                        'source': 'bing_search',
                        'search_query': query,
                        'timestamp': datetime.now().isoformat()
                    }
                    
                    # Add additional metadata
                    if 'dateLastCrawled' in item:
                        result['last_crawled'] = item['dateLastCrawled']
                    
                    results.append(result)
                
                logger.info(f"✅ Found {len(results)} results from Bing")
                return results
                
        except Exception as e:
            logger.error(f"❌ Bing Search error: {e}")
            return []


class WebSearchService:
    """Main web search service coordinating multiple search engines"""
    
    def __init__(self):
        # Initialize search engines
        self.google_search = GoogleSearchAPI()
        self.duckduckgo_search = DuckDuckGoSearch()
        self.bing_search = BingSearchAPI()

        # Shared cache service
        self.cache = cache_service
        
        self.search_engines = {
            'google': self.google_search,
            'duckduckgo': self.duckduckgo_search,
            'bing': self.bing_search
        }
        
        # Determine available engines
        self.available_engines = []
        if self.google_search.is_available:
            self.available_engines.append('google')
        if self.bing_search.is_available:
            self.available_engines.append('bing')
        # DuckDuckGo is always available
        self.available_engines.append('duckduckgo')
        
        logger.info(f"✅ Web search service initialized with engines: {self.available_engines}")
    
    async def close(self):
        """Close all search engine connections"""
        for engine in self.search_engines.values():
            await engine.close()
    
    async def search(
        self,
        query: str,
        num_results: int = 10,
        engines: Optional[List[str]] = None,
        aggregate: bool = True,
        use_cache: bool = True,
        ttl: int = 3600,
    ) -> Dict[str, Any]:
        """
        Perform web search across multiple engines
        
        Args:
            query: Search query
            num_results: Number of results to return
            engines: List of engines to use (default: all available)
            aggregate: Whether to aggregate results from multiple engines
        
        Returns:
            Dictionary with search results
        """
        
        if not engines:
            engines = self.available_engines
        else:
            # Filter to only available engines
            engines = [e for e in engines if e in self.available_engines]

        engine_key = ",".join(sorted(engines))
        cache_key = f"web_search:{hashlib.sha1(f'{query}|{engine_key}|{num_results}|{aggregate}'.encode()).hexdigest()}"

        if use_cache:
            cached = await self.cache.get(cache_key)
            if cached:
                return cached
        
        if not engines:
            logger.error("❌ No search engines available")
            return {'error': 'No search engines available', 'results': []}
        
        logger.info(f"🌐 Performing web search for '{query}' using engines: {engines}")
        
        # Run searches concurrently
        tasks = {}
        for engine_name in engines:
            if engine_name in self.search_engines:
                engine = self.search_engines[engine_name]
                tasks[engine_name] = engine.search(query, num_results)
        
        # Gather results
        results_by_engine = {}
        for engine_name, task in tasks.items():
            try:
                results = await task
                results_by_engine[engine_name] = results
            except Exception as e:
                logger.error(f"❌ {engine_name} search failed: {e}")
                results_by_engine[engine_name] = []
        
        # Prepare response
        response = {
            'query': query,
            'timestamp': datetime.now().isoformat(),
            'engines_used': list(results_by_engine.keys()),
            'results_by_engine': results_by_engine
        }
        
        # Aggregate results if requested
        if aggregate:
            aggregated = self._aggregate_results(results_by_engine, num_results)
            response['results'] = aggregated
            response['total_results'] = len(aggregated)

        if use_cache:
            await self.cache.set(cache_key, response, ttl=ttl)

        return response
    
    def _aggregate_results(
        self, 
        results_by_engine: Dict[str, List[Dict[str, Any]]], 
        max_results: int
    ) -> List[Dict[str, Any]]:
        """Aggregate and deduplicate results from multiple engines"""
        
        seen_urls = set()
        aggregated = []
        
        # Combine results, prioritizing by order and removing duplicates
        for engine, results in results_by_engine.items():
            for result in results:
                url = result.get('url', '')
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    result['engines'] = [engine]
                    aggregated.append(result)
                elif url in seen_urls:
                    # Find existing result and add engine
                    for agg_result in aggregated:
                        if agg_result.get('url') == url:
                            if 'engines' not in agg_result:
                                agg_result['engines'] = []
                            agg_result['engines'].append(engine)
                            break
        
        # Sort by number of engines (more engines = more relevant)
        aggregated.sort(key=lambda x: len(x.get('engines', [])), reverse=True)
        
        return aggregated[:max_results]
    
    async def search_with_context(
        self,
        query: str,
        context: Dict[str, Any],
        num_results: int = 10,
        use_cache: bool = True,
        ttl: int = 3600,
    ) -> Dict[str, Any]:
        """
        Perform context-aware search
        
        Args:
            query: Base search query
            context: User context (location, preferences, etc.)
            num_results: Number of results
        
        Returns:
            Search results with context-based enhancements
        """
        
        # Enhance query based on context
        enhanced_query = self._enhance_query_with_context(query, context)

        context_hash = hashlib.sha1(json.dumps(context, sort_keys=True).encode()).hexdigest()
        cache_key = f"web_search_ctx:{hashlib.sha1(f'{query}|{context_hash}|{num_results}'.encode()).hexdigest()}"

        if use_cache:
            cached = await self.cache.get(cache_key)
            if cached:
                return cached

        # Perform search
        results = await self.search(enhanced_query, num_results, use_cache=False)
        
        # Add context to results
        results['context_used'] = context
        results['original_query'] = query
        results['enhanced_query'] = enhanced_query

        if use_cache:
            await self.cache.set(cache_key, results, ttl=ttl)

        return results
    
    def _enhance_query_with_context(self, query: str, context: Dict[str, Any]) -> str:
        """Enhance search query based on user context"""
        
        enhanced = query
        
        # Add location context if available
        if 'location' in context:
            location = context['location']
            if isinstance(location, dict):
                city = location.get('city', '')
                state = location.get('state', '')
                if city:
                    enhanced += f" near {city}"
                    if state:
                        enhanced += f", {state}"
        
        # Add time context for time-sensitive queries
        if 'time_sensitive' in context and context['time_sensitive']:
            enhanced += " 2025"  # Current year
        
        # Add preference context
        if 'preferences' in context:
            prefs = context['preferences']
            if 'price_range' in prefs and 'cheap' in query.lower():
                enhanced += " budget affordable"
            elif 'price_range' in prefs and 'luxury' in query.lower():
                enhanced += " premium high-end"
        
        return enhanced
    
    async def specialized_search(
        self,
        search_type: str,
        query: str,
        use_cache: bool = True,
        ttl: int = 3600,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Perform specialized searches
        
        Types:
        - 'news': Recent news articles
        - 'local': Local business/service search
        - 'how-to': Tutorial and guide search
        - 'product': Product comparison search
        - 'travel': Travel and destination search
        """
        
        # Modify query based on search type
        if search_type == 'news':
            query = f"{query} news {datetime.now().year}"
            kwargs['num_results'] = kwargs.get('num_results', 20)
        
        elif search_type == 'local':
            if 'location' in kwargs:
                location = kwargs['location']
                query = f"{query} {location}"
        
        elif search_type == 'how-to':
            query = f"how to {query} tutorial guide"
        
        elif search_type == 'product':
            query = f"{query} review comparison best"
        
        elif search_type == 'travel':
            query = f"{query} travel guide tips destination"
        
        # Perform search
        results = await self.search(query, use_cache=use_cache, ttl=ttl, **kwargs)
        results['search_type'] = search_type
        
        return results


# Global web search service instance
web_search_service = WebSearchService()
