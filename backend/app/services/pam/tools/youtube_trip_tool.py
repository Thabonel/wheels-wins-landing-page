"""
YouTube Trip Scraper Tool for PAM
Provides YouTube video search and trip extraction capabilities
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from .base_tool import BaseTool
from app.services.scraping.youtube_travel_scraper import YouTubeTravelScraper
from app.core.exceptions import PAMError, ErrorCode

logger = logging.getLogger(__name__)


class YouTubeTripTool(BaseTool):
    """YouTube trip scraper tool for PAM - finds and extracts trip information from videos"""
    
    def __init__(self):
        super().__init__("youtube_trip_scraper")
        self.scraper = None
        self.initialized = False
    
    async def initialize(self):
        """Initialize the YouTube scraper"""
        try:
            self.scraper = YouTubeTravelScraper()
            self.initialized = True
            
            if self.scraper.youtube_api_key:
                self.logger.info("✅ YouTube trip scraper initialized with API access")
            else:
                self.logger.warning("⚠️ YouTube trip scraper initialized without API key - limited functionality")
                
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize YouTube scraper: {e}")
            self.initialized = False
    
    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute YouTube trip scraping operation
        
        Parameters:
        - action: 'search_videos', 'extract_trip', 'import_video', 'suggest_trips'
        - query: Search query for finding videos
        - video_id: YouTube video ID for extraction
        - video_url: YouTube URL (will extract ID)
        - region: Region code (e.g., 'AU' for Australia)
        - max_results: Maximum number of results (default 5)
        """
        
        if not self.initialized:
            await self.initialize()
        
        if not parameters:
            return self._create_error_response("No parameters provided")
        
        action = parameters.get('action', 'search_videos')
        
        try:
            if action == 'search_videos':
                return await self._search_videos(user_id, parameters)
            elif action == 'extract_trip':
                return await self._extract_trip(user_id, parameters)
            elif action == 'import_video':
                return await self._import_video(user_id, parameters)
            elif action == 'suggest_trips':
                return await self._suggest_trips(user_id, parameters)
            else:
                return self._create_error_response(f"Unknown action: {action}")
                
        except Exception as e:
            self.logger.error(f"❌ YouTube tool execution failed: {e}")
            return self._create_error_response(f"Execution failed: {str(e)}")
    
    async def _search_videos(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Search YouTube for travel videos"""
        
        query = parameters.get('query')
        if not query:
            return self._create_error_response("Query parameter is required")
        
        region = parameters.get('region', 'AU')  # Default to Australia
        max_results = min(parameters.get('max_results', 5), 20)  # Cap at 20
        
        self.logger.info(f"🔍 Searching YouTube for: {query}")
        
        if not self.scraper:
            return self._create_mock_search_response(query)
        
        try:
            videos = await self.scraper.search_adventure_videos(query, region, max_results)
            
            if not videos:
                return self._create_success_response({
                    'query': query,
                    'videos': [],
                    'message': f"I couldn't find any trips for '{query}'. Try searching for specific locations like 'Cape York trips' or 'Simpson Desert adventures'.",
                    'pam_response': f"I couldn't find any trips matching '{query}'. Try searching for:\n• Cape York trips\n• Simpson Desert adventures\n• Fraser Island 4WD\n• Gibb River Road trips",
                    'suggestions': [
                        f"Cape York {query}",
                        f"Simpson Desert {query}",
                        f"Fraser Island {query}"
                    ]
                })
            
            # Format results for PAM
            formatted_videos = []
            for video in videos:
                formatted_videos.append({
                    'title': video['title'],
                    'channel': video['channel'],
                    'url': video['url'],
                    'video_id': video['video_id'],
                    'description': video['description'][:200] + '...' if len(video['description']) > 200 else video['description'],
                    'thumbnail': video['thumbnail'],
                    'published': video['published_at']
                })
            
            # Format for PAM conversation
            trip_summaries = []
            for i, video in enumerate(formatted_videos, 1):
                trip_summaries.append(f"{i}. **{video['title']}** by {video['channel']}")
            
            trips_list = "\n".join(trip_summaries)
            
            return self._create_success_response({
                'query': query,
                'region': region,
                'videos': formatted_videos,
                'total': len(formatted_videos),
                'trips_summary': trips_list,
                'message': f"I found {len(formatted_videos)} {query} adventures! Which one would you like me to show you?",
                'pam_response': f"I found {len(formatted_videos)} {query} adventures!\n\n{trips_list}\n\nWhich one would you like me to show you details for?"
            })
            
        except Exception as e:
            self.logger.error(f"❌ Video search failed: {e}")
            return self._create_error_response(f"Search failed: {str(e)}")
    
    async def _extract_trip(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Extract trip information from a specific video"""
        
        video_id = parameters.get('video_id')
        video_url = parameters.get('video_url')
        
        # Extract video ID from URL if provided
        if video_url and not video_id:
            import re
            match = re.search(r'(?:v=|/)([0-9A-Za-z_-]{11}).*', video_url)
            if match:
                video_id = match.group(1)
            else:
                return self._create_error_response("Invalid YouTube URL")
        
        if not video_id:
            return self._create_error_response("video_id or video_url parameter is required")
        
        self.logger.info(f"📝 Extracting trip from video: {video_id}")
        
        if not self.scraper:
            return self._create_mock_extraction_response(video_id)
        
        try:
            # Get transcript
            transcript = await self.scraper.get_video_transcript(video_id)
            if not transcript:
                return self._create_error_response(
                    "Could not extract transcript. Video may not have captions enabled."
                )
            
            # Get video metadata
            videos = await self.scraper.search_adventure_videos(video_id, max_results=1)
            if not videos:
                video_metadata = {
                    'video_id': video_id,
                    'title': 'Unknown',
                    'description': '',
                    'channel': 'Unknown',
                    'url': f"https://www.youtube.com/watch?v={video_id}"
                }
            else:
                video_metadata = videos[0]
            
            # Extract trip info
            trip_data = await self.scraper.extract_trip_info(transcript, video_metadata)
            
            if not trip_data:
                return self._create_error_response(
                    "Could not extract trip information from video transcript"
                )
            
            # Format trip details for PAM conversation
            metadata = trip_data.get('metadata', {})
            key_stops = metadata.get('key_stops', [])
            challenges = metadata.get('challenges', [])
            highlights = metadata.get('highlights', [])
            
            trip_summary = f"**{trip_data['title']}**\n\n"
            trip_summary += f"📍 Location: {metadata.get('location', 'Unknown')}\n"
            if key_stops:
                trip_summary += f"🛣️ Key stops: {', '.join(key_stops[:3])}\n"
            if metadata.get('difficulty'):
                trip_summary += f"🏔️ Difficulty: {metadata.get('difficulty')}\n"
            if challenges:
                trip_summary += f"⚠️ Main challenges: {challenges[0]}\n"
            if highlights:
                trip_summary += f"✨ Highlights: {highlights[0]}\n"
            
            trip_summary += f"\nWould you like me to add this trip to your collection?"
            
            return self._create_success_response({
                'video_id': video_id,
                'video_title': video_metadata.get('title', 'Unknown'),
                'trip_data': trip_data,
                'trip_summary': trip_summary,
                'message': f"Here are the details for **{trip_data['title']}**",
                'pam_response': trip_summary
            })
            
        except Exception as e:
            self.logger.error(f"❌ Trip extraction failed: {e}")
            return self._create_error_response(f"Extraction failed: {str(e)}")
    
    async def _import_video(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Import a video and save to trips database"""
        
        video_id = parameters.get('video_id')
        video_url = parameters.get('video_url')
        
        # Extract video ID from URL if provided
        if video_url and not video_id:
            import re
            match = re.search(r'(?:v=|/)([0-9A-Za-z_-]{11}).*', video_url)
            if match:
                video_id = match.group(1)
            else:
                return self._create_error_response("Invalid YouTube URL")
        
        if not video_id:
            return self._create_error_response("video_id or video_url parameter is required")
        
        self.logger.info(f"📥 Importing trip from video: {video_id}")
        
        if not self.scraper:
            return self._create_mock_import_response(video_id)
        
        try:
            # Process video and save to database
            trip_data = await self.scraper.process_video(video_id, user_id)
            
            if trip_data:
                return self._create_success_response({
                    'video_id': video_id,
                    'trip_id': trip_data['id'],
                    'trip_title': trip_data['title'],
                    'message': f"Perfect! I've added **{trip_data['title']}** to your trips collection.",
                    'pam_response': f"Perfect! I've added **{trip_data['title']}** to your trips collection. You can find it in your Wheels section with all the route details, challenges, and highlights extracted from the video.",
                    'trip_data': trip_data
                })
            else:
                return self._create_error_response(
                    "I couldn't import that video - it might already be in your collection or doesn't contain enough trip information."
                )
                
        except Exception as e:
            self.logger.error(f"❌ Video import failed: {e}")
            return self._create_error_response(f"Import failed: {str(e)}")
    
    async def _suggest_trips(self, user_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Suggest trip videos based on user preferences"""
        
        # Get user preferences or use defaults
        preferences = parameters.get('preferences', {})
        region = preferences.get('region', 'AU')
        vehicle_type = preferences.get('vehicle', '4WD')
        difficulty = preferences.get('difficulty', 'moderate')
        
        # Build smart search queries
        queries = []
        
        if region == 'AU':
            queries = [
                f"{vehicle_type} Cape York adventure",
                f"{vehicle_type} Victorian High Country",
                f"{vehicle_type} Simpson Desert crossing",
                f"{vehicle_type} Fraser Island camping"
            ]
        else:
            queries = [
                f"{vehicle_type} {region} road trip",
                f"{vehicle_type} {region} camping adventure",
                f"Overlanding {region}",
                f"RV travel {region}"
            ]
        
        self.logger.info(f"🎯 Suggesting trips for {vehicle_type} in {region}")
        
        if not self.scraper:
            return self._create_mock_suggestions_response(region, vehicle_type)
        
        try:
            all_videos = []
            
            # Search for videos with each query
            for query in queries[:2]:  # Limit to 2 queries to avoid quota
                videos = await self.scraper.search_adventure_videos(query, region, max_results=3)
                all_videos.extend(videos)
            
            # Remove duplicates
            seen_ids = set()
            unique_videos = []
            for video in all_videos:
                if video['video_id'] not in seen_ids:
                    seen_ids.add(video['video_id'])
                    unique_videos.append(video)
            
            # Format suggestions
            suggestions = []
            for video in unique_videos[:6]:  # Top 6 suggestions
                suggestions.append({
                    'title': video['title'],
                    'channel': video['channel'],
                    'url': video['url'],
                    'video_id': video['video_id'],
                    'description': video['description'][:150] + '...',
                    'thumbnail': video['thumbnail']
                })
            
            # Format suggestions for PAM
            suggestions_list = []
            for i, suggestion in enumerate(suggestions, 1):
                suggestions_list.append(f"{i}. **{suggestion['title']}** by {suggestion['channel']}")
            
            suggestions_text = "\n".join(suggestions_list)
            
            return self._create_success_response({
                'region': region,
                'vehicle_type': vehicle_type,
                'suggestions': suggestions,
                'suggestions_text': suggestions_text,
                'message': f"Here are some great {vehicle_type} adventures I found for you!",
                'pam_response': f"Here are some great {vehicle_type} adventures I found for you!\n\n{suggestions_text}\n\nWhich one catches your eye? I can show you the details or add it to your trips."
            })
            
        except Exception as e:
            self.logger.error(f"❌ Trip suggestions failed: {e}")
            return self._create_error_response(f"Suggestions failed: {str(e)}")
    
    def _create_mock_search_response(self, query: str) -> Dict[str, Any]:
        """Create mock search response when scraper not available"""
        
        return self._create_success_response({
            'query': query,
            'videos': [
                {
                    'title': f"Epic {query} Adventure - Full Documentary",
                    'channel': 'Adventure Channel',
                    'url': 'https://youtube.com/watch?v=mock123',
                    'video_id': 'mock123',
                    'description': f"Join us on an incredible journey through {query}...",
                    'thumbnail': 'https://i.ytimg.com/vi/mock123/hqdefault.jpg'
                }
            ],
            'message': 'Mock results - YouTube API not configured',
            'note': 'To enable real YouTube search, configure YOUTUBE_API_KEY'
        })
    
    def _create_mock_extraction_response(self, video_id: str) -> Dict[str, Any]:
        """Create mock extraction response"""
        
        return self._create_success_response({
            'video_id': video_id,
            'video_title': 'Mock Adventure Video',
            'trip_data': {
                'title': 'Sample 4WD Adventure',
                'description': 'This is a mock trip extraction',
                'metadata': {
                    'location': 'Cape York, Queensland',
                    'vehicles': ['Toyota Land Cruiser'],
                    'difficulty': 'Challenging'
                }
            },
            'message': 'Mock extraction - YouTube API not configured'
        })
    
    def _create_mock_import_response(self, video_id: str) -> Dict[str, Any]:
        """Create mock import response"""
        
        return self._create_success_response({
            'video_id': video_id,
            'trip_id': 'mock-trip-id',
            'trip_title': 'Mock Imported Trip',
            'message': 'Mock import - Database save disabled in demo mode'
        })
    
    def _create_mock_suggestions_response(self, region: str, vehicle_type: str) -> Dict[str, Any]:
        """Create mock suggestions response"""
        
        return self._create_success_response({
            'region': region,
            'vehicle_type': vehicle_type,
            'suggestions': [
                {
                    'title': f'Ultimate {vehicle_type} Guide to {region}',
                    'channel': 'Travel Guide Channel',
                    'url': 'https://youtube.com/watch?v=suggest1',
                    'video_id': 'suggest1',
                    'description': 'Complete guide to the best tracks...',
                    'thumbnail': 'https://i.ytimg.com/vi/suggest1/hqdefault.jpg'
                }
            ],
            'message': f'Mock suggestions for {vehicle_type} in {region}'
        })


# Create global instance
youtube_trip_tool = YouTubeTripTool()