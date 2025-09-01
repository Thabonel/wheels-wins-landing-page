"""
Trip Discovery Scraper Service

This service handles web scraping, API integration, and AI enhancement
for discovering and importing trip templates from various sources.
"""

import asyncio
import json
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from urllib.parse import urlparse, urljoin
from urllib.robotparser import RobotFileParser
import aiohttp
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field
import openai
from supabase import Client
from ..core.database import get_supabase_client
from ..core.config import settings
import hashlib
import logging

logger = logging.getLogger(__name__)


class ScrapedTrip(BaseModel):
    """Model for a scraped trip template."""
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    location: Optional[str] = None
    duration_days: Optional[int] = None
    distance_miles: Optional[float] = None
    difficulty: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)
    images: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    source_url: str
    quality_score: float = 0.0
    ai_enhanced: bool = False


class TripDiscoveryScraperService:
    """
    Service for discovering and scraping trip templates from various sources.
    Supports web scraping, API integration, and AI enhancement.
    """
    
    def __init__(self):
        self.supabase: Client = get_supabase_client()
        self.session: Optional[aiohttp.ClientSession] = None
        self.rate_limits: Dict[str, datetime] = {}
        self.robot_parsers: Dict[str, RobotFileParser] = {}
        
        # Configure AI model from environment variable (not hardcoded)
        self.ai_model = getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini')
        self.ai_enabled = bool(getattr(settings, 'OPENAI_API_KEY', None))
        
        if self.ai_enabled:
            openai.api_key = settings.OPENAI_API_KEY
    
    async def __aenter__(self):
        """Async context manager entry."""
        headers = {
            'User-Agent': 'WheelsAndWins-TripDiscovery/1.0 (admin@wheelsandwins.com)'
        }
        self.session = aiohttp.ClientSession(headers=headers)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
    
    async def check_robots_txt(self, url: str) -> bool:
        """
        Check if we're allowed to scrape this URL according to robots.txt.
        
        Args:
            url: The URL to check
            
        Returns:
            True if allowed, False otherwise
        """
        try:
            parsed_url = urlparse(url)
            robots_url = f"{parsed_url.scheme}://{parsed_url.netloc}/robots.txt"
            
            if robots_url not in self.robot_parsers:
                parser = RobotFileParser()
                parser.set_url(robots_url)
                
                # Fetch and parse robots.txt
                async with self.session.get(robots_url) as response:
                    if response.status == 200:
                        content = await response.text()
                        parser.parse(content.splitlines())
                    else:
                        # No robots.txt means we can scrape
                        return True
                
                self.robot_parsers[robots_url] = parser
            
            return self.robot_parsers[robots_url].can_fetch("WheelsAndWins-TripDiscovery", url)
        
        except Exception as e:
            logger.warning(f"Error checking robots.txt for {url}: {e}")
            # Be conservative - don't scrape if we can't check
            return False
    
    async def check_rate_limit(self, domain: str, rate_limit: int = 60) -> bool:
        """
        Check if we're within rate limits for a domain.
        
        Args:
            domain: The domain to check
            rate_limit: Requests per hour allowed
            
        Returns:
            True if we can make a request, False if rate limited
        """
        now = datetime.now()
        
        if domain in self.rate_limits:
            last_request = self.rate_limits[domain]
            min_interval = timedelta(hours=1) / rate_limit
            
            if now - last_request < min_interval:
                return False
        
        self.rate_limits[domain] = now
        return True
    
    async def scrape_web_page(self, url: str, selectors: Dict[str, str]) -> Optional[ScrapedTrip]:
        """
        Scrape a web page using CSS selectors.
        
        Args:
            url: The URL to scrape
            selectors: Dictionary of CSS selectors for different content types
            
        Returns:
            ScrapedTrip object or None if scraping fails
        """
        try:
            # Check robots.txt
            if not await self.check_robots_txt(url):
                logger.warning(f"Robots.txt disallows scraping {url}")
                return None
            
            # Check rate limit
            domain = urlparse(url).netloc
            if not await self.check_rate_limit(domain):
                logger.warning(f"Rate limit exceeded for {domain}")
                return None
            
            # Fetch the page
            async with self.session.get(url, timeout=30) as response:
                if response.status != 200:
                    logger.error(f"Failed to fetch {url}: Status {response.status}")
                    return None
                
                html = await response.text()
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(html, 'html.parser')
            
            # Extract content using selectors
            trip = ScrapedTrip(source_url=url)
            
            # Title
            if 'title' in selectors:
                title_elem = soup.select_one(selectors['title'])
                if title_elem:
                    trip.title = title_elem.get_text(strip=True)
            
            if not trip.title:
                # Fallback to page title
                title_tag = soup.find('title')
                if title_tag:
                    trip.title = title_tag.get_text(strip=True)
            
            # Description
            if 'description' in selectors:
                desc_elem = soup.select_one(selectors['description'])
                if desc_elem:
                    trip.description = desc_elem.get_text(strip=True)
            
            if not trip.description:
                # Try meta description
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                if meta_desc:
                    trip.description = meta_desc.get('content', '')
            
            # Content
            if 'content' in selectors:
                content_elems = soup.select(selectors['content'])
                if content_elems:
                    trip.content = '\n\n'.join([elem.get_text(strip=True) for elem in content_elems])
            
            # Images
            if 'images' in selectors:
                image_elems = soup.select(selectors['images'])
                for img in image_elems[:10]:  # Limit to 10 images
                    img_url = img.get('src') or img.get('data-src')
                    if img_url:
                        # Make absolute URL
                        img_url = urljoin(url, img_url)
                        trip.images.append(img_url)
            
            # Extract highlights from content
            if trip.content:
                # Look for list items or key phrases
                highlights = []
                for li in soup.select('li')[:6]:
                    text = li.get_text(strip=True)
                    if len(text) > 10 and len(text) < 100:
                        highlights.append(text)
                trip.highlights = highlights
            
            # Calculate quality score
            trip.quality_score = self.calculate_quality_score(trip)
            
            return trip
        
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            return None
    
    def calculate_quality_score(self, trip: ScrapedTrip) -> float:
        """
        Calculate a quality score for a scraped trip (0.0 to 1.0).
        
        Args:
            trip: The scraped trip to score
            
        Returns:
            Quality score between 0.0 and 1.0
        """
        score = 0.0
        
        # Title quality (30%)
        if trip.title:
            title_score = min(len(trip.title) / 50, 1.0)  # Optimal length ~50 chars
            if len(trip.title) > 10:
                score += 0.3 * title_score
        
        # Description quality (20%)
        if trip.description:
            desc_score = min(len(trip.description) / 200, 1.0)  # Optimal length ~200 chars
            score += 0.2 * desc_score
        
        # Content depth (30%)
        if trip.content:
            content_score = min(len(trip.content) / 1000, 1.0)  # Optimal length ~1000 chars
            score += 0.3 * content_score
        
        # Images (20%)
        if trip.images:
            image_score = min(len(trip.images) / 3, 1.0)  # Optimal 3+ images
            score += 0.2 * image_score
        
        return round(score, 2)
    
    async def enhance_with_ai(self, trip: ScrapedTrip) -> ScrapedTrip:
        """
        Enhance scraped content using AI.
        
        Args:
            trip: The trip to enhance
            
        Returns:
            Enhanced trip object
        """
        if not self.ai_enabled:
            return trip
        
        try:
            # Prepare content for AI
            context = f"""
            Title: {trip.title}
            Description: {trip.description or 'None'}
            Content snippet: {(trip.content or '')[:500]}
            Current highlights: {', '.join(trip.highlights) if trip.highlights else 'None'}
            """
            
            # Create AI prompt
            prompt = f"""
            You are helping to enhance a trip template. Based on this scraped content:
            
            {context}
            
            Please provide:
            1. An improved, engaging title (max 60 chars)
            2. A compelling description (max 200 chars)
            3. 5 key highlights or features of this trip
            4. 5 relevant tags
            
            Format your response as JSON:
            {{
                "title": "...",
                "description": "...",
                "highlights": ["...", "...", "...", "...", "..."],
                "tags": ["...", "...", "...", "...", "..."]
            }}
            """
            
            # Call AI API (using configurable model)
            response = await asyncio.to_thread(
                openai.ChatCompletion.create,
                model=self.ai_model,  # Use configurable model
                messages=[
                    {"role": "system", "content": "You are a travel content specialist."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            # Parse AI response
            ai_content = response.choices[0].message.content
            enhanced_data = json.loads(ai_content)
            
            # Update trip with AI enhancements
            if enhanced_data.get('title'):
                trip.title = enhanced_data['title']
            if enhanced_data.get('description'):
                trip.description = enhanced_data['description']
            if enhanced_data.get('highlights'):
                trip.highlights = enhanced_data['highlights']
            if enhanced_data.get('tags'):
                trip.tags = enhanced_data['tags']
            
            trip.ai_enhanced = True
            
            # Recalculate quality score after enhancement
            trip.quality_score = self.calculate_quality_score(trip)
            
        except Exception as e:
            logger.error(f"AI enhancement failed: {e}")
        
        return trip
    
    async def create_scraper_job(self, source_id: str) -> str:
        """
        Create a new scraper job in the database.
        
        Args:
            source_id: The source to scrape
            
        Returns:
            Job ID
        """
        try:
            # Get source details
            source = self.supabase.table('trip_scraper_sources')\
                .select('*')\
                .eq('id', source_id)\
                .single()\
                .execute()
            
            if not source.data:
                raise ValueError(f"Source {source_id} not found")
            
            # Create job
            job = {
                'status': 'pending',
                'source_url': source.data['url'],
                'region': source.data.get('region', 'Global'),
                'parameters': {
                    'source_id': source_id,
                    'source_name': source.data['name'],
                    'source_type': source.data['source_type']
                }
            }
            
            result = self.supabase.table('trip_scraper_jobs')\
                .insert(job)\
                .execute()
            
            return result.data[0]['id']
        
        except Exception as e:
            logger.error(f"Failed to create scraper job: {e}")
            raise
    
    async def scrape_source(self, source_id: str, job_id: str) -> List[ScrapedTrip]:
        """
        Scrape a configured source.
        
        Args:
            source_id: The source to scrape
            job_id: The job ID to update
            
        Returns:
            List of scraped trips
        """
        results = []
        
        try:
            # Update job status
            self.supabase.table('trip_scraper_jobs')\
                .update({
                    'status': 'running',
                    'started_at': datetime.now().isoformat()
                })\
                .eq('id', job_id)\
                .execute()
            
            # Get source configuration
            source = self.supabase.table('trip_scraper_sources')\
                .select('*')\
                .eq('id', source_id)\
                .single()\
                .execute()
            
            if not source.data:
                raise ValueError(f"Source {source_id} not found")
            
            source_data = source.data
            
            # Scrape based on source type
            if source_data['source_type'] == 'scraper':
                # Web scraping
                selectors = source_data.get('selectors', {})
                trip = await self.scrape_web_page(source_data['url'], selectors)
                
                if trip:
                    # Enhance with AI if enabled
                    trip = await self.enhance_with_ai(trip)
                    results.append(trip)
                    
                    # Save to database
                    await self.save_scraper_result(job_id, source_id, trip)
            
            elif source_data['source_type'] == 'api':
                # API integration (placeholder for future implementation)
                logger.info(f"API source type not yet implemented for {source_data['name']}")
            
            elif source_data['source_type'] == 'rss':
                # RSS feed parsing (placeholder for future implementation)
                logger.info(f"RSS source type not yet implemented for {source_data['name']}")
            
            # Update job with results
            self.supabase.table('trip_scraper_jobs')\
                .update({
                    'status': 'completed',
                    'completed_at': datetime.now().isoformat(),
                    'templates_created': len(results),
                    'results': {
                        'total_found': len(results),
                        'quality_scores': [r.quality_score for r in results],
                        'ai_enhanced_count': sum(1 for r in results if r.ai_enhanced)
                    }
                })\
                .eq('id', job_id)\
                .execute()
            
            # Update source last scraped time
            self.supabase.table('trip_scraper_sources')\
                .update({'last_scraped_at': datetime.now().isoformat()})\
                .eq('id', source_id)\
                .execute()
        
        except Exception as e:
            logger.error(f"Scraping failed for source {source_id}: {e}")
            
            # Update job with error
            self.supabase.table('trip_scraper_jobs')\
                .update({
                    'status': 'failed',
                    'completed_at': datetime.now().isoformat(),
                    'error_message': str(e)
                })\
                .eq('id', job_id)\
                .execute()
        
        return results
    
    async def save_scraper_result(self, job_id: str, source_id: str, trip: ScrapedTrip):
        """
        Save a scraper result to the database.
        
        Args:
            job_id: The job ID
            source_id: The source ID
            trip: The scraped trip data
        """
        try:
            result = {
                'job_id': job_id,
                'source_id': source_id,
                'raw_data': {
                    'url': trip.source_url,
                    'title': trip.title,
                    'content': trip.content
                },
                'processed_data': {
                    'title': trip.title,
                    'description': trip.description,
                    'highlights': trip.highlights,
                    'tags': trip.tags
                },
                'template_data': {
                    'name': trip.title,
                    'description': trip.description,
                    'location': trip.location,
                    'duration_days': trip.duration_days,
                    'distance_miles': trip.distance_miles,
                    'difficulty': trip.difficulty,
                    'highlights': trip.highlights,
                    'tags': trip.tags
                },
                'images_found': trip.images,
                'quality_score': trip.quality_score,
                'ai_enhanced': trip.ai_enhanced,
                'import_status': 'pending'
            }
            
            self.supabase.table('trip_scraper_results')\
                .insert(result)\
                .execute()
        
        except Exception as e:
            logger.error(f"Failed to save scraper result: {e}")
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the status of a scraping job.
        
        Args:
            job_id: The job ID to check
            
        Returns:
            Job status dictionary or None
        """
        try:
            result = self.supabase.table('trip_scraper_jobs')\
                .select('*')\
                .eq('id', job_id)\
                .single()\
                .execute()
            
            if result.data:
                job = result.data
                
                # Calculate progress
                progress = 0.0
                if job['status'] == 'completed':
                    progress = 100.0
                elif job['status'] == 'running':
                    progress = 50.0  # Simplified progress
                
                return {
                    'status': job['status'],
                    'progress': progress,
                    'results_count': job.get('templates_created', 0),
                    'error_message': job.get('error_message')
                }
            
            return None
        
        except Exception as e:
            logger.error(f"Failed to get job status: {e}")
            return None
    
    async def get_scraper_results(
        self, 
        job_id: Optional[str] = None,
        source_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get scraper results with optional filtering.
        
        Args:
            job_id: Filter by job ID
            source_id: Filter by source ID
            limit: Maximum results to return
            offset: Pagination offset
            
        Returns:
            List of scraper results
        """
        try:
            query = self.supabase.table('trip_scraper_results')\
                .select('*')\
                .order('created_at', desc=True)\
                .limit(limit)\
                .offset(offset)
            
            if job_id:
                query = query.eq('job_id', job_id)
            if source_id:
                query = query.eq('source_id', source_id)
            
            result = query.execute()
            
            return result.data if result.data else []
        
        except Exception as e:
            logger.error(f"Failed to get scraper results: {e}")
            return []