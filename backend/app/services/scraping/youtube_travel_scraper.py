"""
YouTube Travel Video Scraper Service
Searches for travel/adventure videos, extracts transcripts, and populates trip database
"""

import asyncio
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
import re
from uuid import UUID

from youtube_transcript_api import YouTubeTranscriptApi
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import openai

from app.core.config import get_settings
from app.core.database import get_supabase_client
from app.models.domain.pam import PamResponse
from app.core.exceptions import PAMError, ErrorCode

logger = logging.getLogger(__name__)
settings = get_settings()


class YouTubeTravelScraper:
    """Service for scraping YouTube travel videos and extracting trip information"""
    
    def __init__(self):
        self.youtube_api_key = getattr(settings, 'YOUTUBE_API_KEY', None)
        self.youtube_service = None
        self.openai_client = None
        self.supabase = get_supabase_client()
        
        # Initialize services
        if self.youtube_api_key:
            try:
                self.youtube_service = build('youtube', 'v3', developerKey=self.youtube_api_key)
                logger.info("✅ YouTube API service initialized")
            except Exception as e:
                logger.warning(f"⚠️ YouTube API initialization failed: {e}")
        
        # Initialize OpenAI
        openai_key = getattr(settings, 'OPENAI_API_KEY', None)
        if openai_key:
            openai.api_key = openai_key
            self.openai_client = openai
            logger.info("✅ OpenAI service initialized for trip extraction")
    
    async def search_adventure_videos(
        self, 
        query: str, 
        region: Optional[str] = None,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search YouTube for adventure/travel videos
        
        Args:
            query: Search query (e.g., "Cape York Telegraph Track 4WD")
            region: Optional region code (e.g., "AU" for Australia)
            max_results: Maximum number of results to return
            
        Returns:
            List of video metadata dictionaries
        """
        if not self.youtube_service:
            logger.error("YouTube API not initialized")
            return []
        
        try:
            # Build search query
            search_query = query
            if region:
                search_query += f" {region}"
            
            # Add travel-specific keywords if not present
            travel_keywords = ["4WD", "RV", "overlanding", "road trip", "camping", "adventure"]
            if not any(keyword.lower() in query.lower() for keyword in travel_keywords):
                search_query += " adventure"
            
            logger.info(f"🔍 Searching YouTube for: {search_query}")
            
            # Execute search
            search_response = self.youtube_service.search().list(
                q=search_query,
                part='id,snippet',
                maxResults=max_results,
                type='video',
                videoDuration='long',  # Prefer longer videos (>20 mins)
                relevanceLanguage='en',
                regionCode=region if region else None,
                order='relevance'
            ).execute()
            
            videos = []
            for item in search_response.get('items', []):
                video_data = {
                    'video_id': item['id']['videoId'],
                    'title': item['snippet']['title'],
                    'description': item['snippet']['description'],
                    'channel': item['snippet']['channelTitle'],
                    'published_at': item['snippet']['publishedAt'],
                    'thumbnail': item['snippet']['thumbnails']['high']['url'],
                    'url': f"https://www.youtube.com/watch?v={item['id']['videoId']}"
                }
                videos.append(video_data)
            
            logger.info(f"✅ Found {len(videos)} adventure videos")
            return videos
            
        except HttpError as e:
            logger.error(f"❌ YouTube API error: {e}")
            return []
        except Exception as e:
            logger.error(f"❌ Search failed: {e}")
            return []
    
    async def get_video_transcript(self, video_id: str) -> Optional[str]:
        """
        Extract transcript from YouTube video
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Full transcript text or None if unavailable
        """
        try:
            logger.info(f"📝 Extracting transcript for video: {video_id}")
            
            # Try to get transcript in order of preference
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            transcript = None
            # First try manual transcripts
            try:
                transcript = transcript_list.find_manually_created_transcript(['en'])
                logger.info("✅ Found manual English transcript")
            except:
                # Fall back to auto-generated
                try:
                    transcript = transcript_list.find_generated_transcript(['en'])
                    logger.info("✅ Found auto-generated English transcript")
                except:
                    # Try any English transcript
                    for t in transcript_list:
                        if t.language_code.startswith('en'):
                            transcript = t
                            logger.info(f"✅ Found English transcript: {t.language_code}")
                            break
            
            if not transcript:
                logger.warning(f"⚠️ No English transcript found for video {video_id}")
                return None
            
            # Fetch and combine transcript segments
            transcript_data = transcript.fetch()
            full_text = ' '.join([segment['text'] for segment in transcript_data])
            
            # Clean up transcript
            full_text = self._clean_transcript(full_text)
            
            logger.info(f"✅ Extracted transcript: {len(full_text)} characters")
            return full_text
            
        except Exception as e:
            logger.error(f"❌ Transcript extraction failed: {e}")
            return None
    
    def _clean_transcript(self, text: str) -> str:
        """Clean up transcript text"""
        # Remove music notations
        text = re.sub(r'\[Music\]', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\[Applause\]', '', text, flags=re.IGNORECASE)
        
        # Remove excessive whitespace
        text = ' '.join(text.split())
        
        # Fix common transcription errors
        text = text.replace(' ,', ',').replace(' .', '.')
        
        return text.strip()
    
    async def extract_trip_info(
        self, 
        transcript: str, 
        video_metadata: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Use AI to extract structured trip information from transcript
        
        Args:
            transcript: Video transcript text
            video_metadata: Video title, description, etc.
            
        Returns:
            Structured trip data or None if extraction fails
        """
        if not self.openai_client:
            logger.error("OpenAI client not initialized")
            return None
        
        try:
            logger.info(f"🤖 Extracting trip info from: {video_metadata['title']}")
            
            # Prepare extraction prompt
            prompt = f"""Extract travel trip information from this YouTube video transcript.

Video Title: {video_metadata['title']}
Video Description: {video_metadata['description'][:500]}...
Channel: {video_metadata['channel']}

Transcript (first 5000 chars): {transcript[:5000]}...

Extract the following information and format as JSON:
{{
    "title": "Concise, descriptive trip title",
    "description": "Comprehensive summary of the journey (200-500 words)",
    "trip_type": "road_trip, camping, rv_travel, or business",
    "status": "completed",
    "privacy_level": "public",
    "metadata": {{
        "location": "Primary location/region",
        "country": "Country name",
        "route": "Route description",
        "key_stops": ["List of main stops/attractions"],
        "vehicles": ["Vehicle types used"],
        "distance_km": "Estimated total distance (number only, or null)",
        "duration_days": "Trip duration in days (number only, or null)",
        "difficulty": "Easy, Moderate, Challenging, or Extreme",
        "challenges": ["List of challenges encountered"],
        "highlights": ["List of trip highlights"],
        "equipment": ["Special equipment or preparations needed"],
        "best_season": "Recommended time of year",
        "weather_conditions": "Weather during the trip",
        "tips": ["Practical tips for others"],
        "youtube_url": "{video_metadata['url']}",
        "youtube_channel": "{video_metadata['channel']}",
        "extracted_date": "{datetime.utcnow().isoformat()}"
    }}
}}

Focus on extracting factual travel information. If information is not available, use null.
Ensure the JSON is valid and properly formatted."""

            # Call OpenAI
            response = await asyncio.to_thread(
                self.openai_client.ChatCompletion.create,
                model="gpt-3.5-turbo-16k",  # Use 16k for longer transcripts
                messages=[
                    {"role": "system", "content": "You are an expert at extracting structured travel information from video transcripts."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent extraction
                max_tokens=2000
            )
            
            # Parse response
            extracted_text = response.choices[0].message.content
            
            # Extract JSON from response (in case there's extra text)
            json_match = re.search(r'\{.*\}', extracted_text, re.DOTALL)
            if json_match:
                trip_data = json.loads(json_match.group())
                
                # Validate required fields
                if 'title' in trip_data and 'metadata' in trip_data:
                    logger.info(f"✅ Successfully extracted trip: {trip_data['title']}")
                    return trip_data
                else:
                    logger.warning("⚠️ Extracted data missing required fields")
                    return None
            else:
                logger.error("❌ No valid JSON found in AI response")
                return None
                
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON parsing error: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Trip extraction failed: {e}")
            return None
    
    async def save_trip_to_database(
        self, 
        trip_data: Dict[str, Any], 
        user_id: Optional[UUID] = None
    ) -> Optional[str]:
        """
        Save extracted trip data to database
        
        Args:
            trip_data: Structured trip data
            user_id: Optional user ID (defaults to system user)
            
        Returns:
            Trip ID if successful, None otherwise
        """
        try:
            # Use system user if no user specified
            if not user_id:
                # Get or create system user for YouTube imports
                system_user = self.supabase.table('auth.users').select('id').eq(
                    'email', 'youtube-scraper@wheels-wins.ai'
                ).execute()
                
                if system_user.data:
                    user_id = system_user.data[0]['id']
                else:
                    # For now, use the first available user
                    # In production, create a dedicated system user
                    users = self.supabase.table('auth.users').select('id').limit(1).execute()
                    if users.data:
                        user_id = users.data[0]['id']
                    else:
                        logger.error("❌ No users found in database")
                        return None
            
            # Prepare trip record
            trip_record = {
                'user_id': str(user_id),
                'title': trip_data['title'],
                'description': trip_data.get('description', ''),
                'trip_type': trip_data.get('trip_type', 'road_trip'),
                'status': trip_data.get('status', 'completed'),
                'privacy_level': trip_data.get('privacy_level', 'public'),
                'metadata': trip_data.get('metadata', {}),
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Check for duplicates based on YouTube URL
            youtube_url = trip_data.get('metadata', {}).get('youtube_url')
            if youtube_url:
                existing = self.supabase.table('user_trips').select('id').eq(
                    'metadata->>youtube_url', youtube_url
                ).execute()
                
                if existing.data:
                    logger.warning(f"⚠️ Trip already exists for video: {youtube_url}")
                    return existing.data[0]['id']
            
            # Insert trip
            result = self.supabase.table('user_trips').insert(trip_record).execute()
            
            if result.data:
                trip_id = result.data[0]['id']
                logger.info(f"✅ Saved trip to database: {trip_id}")
                return trip_id
            else:
                logger.error("❌ Failed to insert trip")
                return None
                
        except Exception as e:
            logger.error(f"❌ Database save failed: {e}")
            return None
    
    async def process_video(
        self, 
        video_id: str, 
        user_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Complete pipeline: fetch video -> extract transcript -> extract trip -> save
        
        Args:
            video_id: YouTube video ID
            user_id: Optional user ID for trip ownership
            
        Returns:
            Saved trip data or None
        """
        try:
            # Get video metadata
            if self.youtube_service:
                video_response = self.youtube_service.videos().list(
                    part='snippet',
                    id=video_id
                ).execute()
                
                if not video_response['items']:
                    logger.error(f"❌ Video not found: {video_id}")
                    return None
                
                video_item = video_response['items'][0]
                video_metadata = {
                    'video_id': video_id,
                    'title': video_item['snippet']['title'],
                    'description': video_item['snippet']['description'],
                    'channel': video_item['snippet']['channelTitle'],
                    'published_at': video_item['snippet']['publishedAt'],
                    'url': f"https://www.youtube.com/watch?v={video_id}"
                }
            else:
                # Minimal metadata if API not available
                video_metadata = {
                    'video_id': video_id,
                    'title': 'Unknown',
                    'description': '',
                    'channel': 'Unknown',
                    'url': f"https://www.youtube.com/watch?v={video_id}"
                }
            
            # Get transcript
            transcript = await self.get_video_transcript(video_id)
            if not transcript:
                logger.error(f"❌ No transcript available for video: {video_id}")
                return None
            
            # Extract trip info
            trip_data = await self.extract_trip_info(transcript, video_metadata)
            if not trip_data:
                logger.error(f"❌ Failed to extract trip info from video: {video_id}")
                return None
            
            # Save to database
            trip_id = await self.save_trip_to_database(trip_data, user_id)
            if trip_id:
                trip_data['id'] = trip_id
                return trip_data
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Video processing failed: {e}")
            return None
    
    async def bulk_import_videos(
        self, 
        video_ids: List[str], 
        user_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Process multiple videos in batch
        
        Args:
            video_ids: List of YouTube video IDs
            user_id: Optional user ID for trip ownership
            
        Returns:
            Summary of import results
        """
        results = {
            'total': len(video_ids),
            'successful': 0,
            'failed': 0,
            'skipped': 0,
            'trips': []
        }
        
        for video_id in video_ids:
            try:
                trip_data = await self.process_video(video_id, user_id)
                if trip_data:
                    results['successful'] += 1
                    results['trips'].append({
                        'id': trip_data['id'],
                        'title': trip_data['title']
                    })
                else:
                    results['failed'] += 1
                    
                # Rate limiting - avoid hitting API quotas
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"❌ Failed to process video {video_id}: {e}")
                results['failed'] += 1
        
        logger.info(f"✅ Bulk import complete: {results['successful']}/{results['total']} successful")
        return results


# Example search queries for Australian 4WD tracks
SAMPLE_SEARCH_QUERIES = [
    "Cape York Telegraph Track 4WD adventure",
    "Simpson Desert crossing Australia",
    "Gibb River Road Kimberley",
    "Fraser Island 4WD camping",
    "Victorian High Country 4WD tracks",
    "Flinders Ranges 4x4 camping",
    "Canning Stock Route expedition",
    "Big Red Simpson Desert",
    "Moreton Island 4WD beach",
    "Tasmania 4WD adventures"
]


async def search_and_import_trips(query: str, max_videos: int = 5):
    """
    Helper function to search and import trips for a specific query
    
    Args:
        query: Search query
        max_videos: Maximum videos to process
    """
    scraper = YouTubeTravelScraper()
    
    # Search for videos
    videos = await scraper.search_adventure_videos(query, region='AU', max_results=max_videos)
    
    if not videos:
        logger.warning(f"No videos found for query: {query}")
        return
    
    # Extract video IDs
    video_ids = [v['video_id'] for v in videos]
    
    # Bulk import
    results = await scraper.bulk_import_videos(video_ids)
    
    return results