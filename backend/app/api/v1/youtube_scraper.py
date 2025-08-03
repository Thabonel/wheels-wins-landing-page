"""
YouTube Travel Video Scraper API Endpoints
Search, extract, and import trip information from YouTube videos
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, HttpUrl

from app.core.auth import get_current_user
from app.models.user import User
from app.services.scraping.youtube_travel_scraper import YouTubeTravelScraper, SAMPLE_SEARCH_QUERIES
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


class VideoSearchRequest(BaseModel):
    query: str
    region: Optional[str] = "AU"
    max_results: Optional[int] = 10


class VideoImportRequest(BaseModel):
    video_id: Optional[str] = None
    video_url: Optional[HttpUrl] = None
    
    def get_video_id(self) -> Optional[str]:
        """Extract video ID from URL or return provided ID"""
        if self.video_id:
            return self.video_id
        
        if self.video_url:
            import re
            url_str = str(self.video_url)
            match = re.search(r'(?:v=|/)([0-9A-Za-z_-]{11}).*', url_str)
            if match:
                return match.group(1)
        
        return None


class BulkImportRequest(BaseModel):
    video_ids: Optional[List[str]] = None
    video_urls: Optional[List[HttpUrl]] = None
    
    def get_video_ids(self) -> List[str]:
        """Extract all video IDs"""
        ids = []
        
        if self.video_ids:
            ids.extend(self.video_ids)
        
        if self.video_urls:
            import re
            for url in self.video_urls:
                url_str = str(url)
                match = re.search(r'(?:v=|/)([0-9A-Za-z_-]{11}).*', url_str)
                if match:
                    ids.append(match.group(1))
        
        # Remove duplicates
        return list(set(ids))


class TripSuggestionsRequest(BaseModel):
    region: Optional[str] = "AU"
    vehicle_type: Optional[str] = "4WD"
    difficulty: Optional[str] = "moderate"
    max_results: Optional[int] = 6


@router.post("/search")
async def search_trip_videos(
    request: VideoSearchRequest,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Search YouTube for travel/adventure videos
    
    Example queries:
    - "Cape York Telegraph Track 4WD"
    - "Simpson Desert crossing"
    - "Fraser Island camping"
    """
    try:
        scraper = YouTubeTravelScraper()
        
        logger.info(f"User {current_user.id} searching for: {request.query}")
        
        videos = await scraper.search_adventure_videos(
            query=request.query,
            region=request.region,
            max_results=request.max_results
        )
        
        if not videos:
            return {
                "success": True,
                "query": request.query,
                "videos": [],
                "message": f"No videos found for '{request.query}'",
                "suggestions": [
                    f"{request.query} 4WD adventure",
                    f"{request.query} camping",
                    f"{request.query} road trip"
                ]
            }
        
        return {
            "success": True,
            "query": request.query,
            "region": request.region,
            "videos": videos,
            "total": len(videos)
        }
        
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract/{video_id}")
async def extract_trip_from_video(
    video_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Extract trip information from a YouTube video
    
    This endpoint:
    1. Fetches the video transcript
    2. Uses AI to extract structured trip data
    3. Returns the extracted information without saving
    """
    try:
        scraper = YouTubeTravelScraper()
        
        logger.info(f"User {current_user.id} extracting trip from video: {video_id}")
        
        # Get transcript
        transcript = await scraper.get_video_transcript(video_id)
        if not transcript:
            raise HTTPException(
                status_code=400, 
                detail="Could not extract transcript. Video may not have captions."
            )
        
        # Get video metadata
        videos = await scraper.search_adventure_videos(video_id, max_results=1)
        video_metadata = videos[0] if videos else {
            'video_id': video_id,
            'title': 'Unknown',
            'url': f"https://www.youtube.com/watch?v={video_id}"
        }
        
        # Extract trip info
        trip_data = await scraper.extract_trip_info(transcript, video_metadata)
        
        if not trip_data:
            raise HTTPException(
                status_code=400,
                detail="Could not extract trip information from video"
            )
        
        return {
            "success": True,
            "video_id": video_id,
            "video_title": video_metadata.get('title', 'Unknown'),
            "trip_data": trip_data,
            "transcript_length": len(transcript)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import")
async def import_video_trip(
    request: VideoImportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Import a YouTube video and save as a trip
    
    Provide either video_id or video_url
    """
    video_id = request.get_video_id()
    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="Either video_id or valid video_url is required"
        )
    
    try:
        scraper = YouTubeTravelScraper()
        
        logger.info(f"User {current_user.id} importing video: {video_id}")
        
        # Process video immediately (could be moved to background)
        trip_data = await scraper.process_video(video_id, current_user.id)
        
        if not trip_data:
            raise HTTPException(
                status_code=400,
                detail="Failed to import video. It may already exist or lack trip information."
            )
        
        return {
            "success": True,
            "video_id": video_id,
            "trip_id": trip_data['id'],
            "trip_title": trip_data['title'],
            "message": f"Successfully imported: {trip_data['title']}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk-import")
async def bulk_import_videos(
    request: BulkImportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Import multiple YouTube videos as trips
    
    Provide either video_ids or video_urls (or both)
    """
    video_ids = request.get_video_ids()
    if not video_ids:
        raise HTTPException(
            status_code=400,
            detail="No valid video IDs or URLs provided"
        )
    
    # Limit bulk imports
    if len(video_ids) > 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 videos per bulk import"
        )
    
    try:
        scraper = YouTubeTravelScraper()
        
        logger.info(f"User {current_user.id} bulk importing {len(video_ids)} videos")
        
        # Process in background
        background_tasks.add_task(
            scraper.bulk_import_videos,
            video_ids,
            current_user.id
        )
        
        return {
            "success": True,
            "message": f"Started importing {len(video_ids)} videos",
            "video_ids": video_ids,
            "status": "processing",
            "note": "Import running in background. Check your trips list for results."
        }
        
    except Exception as e:
        logger.error(f"Bulk import failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggest")
async def suggest_trip_videos(
    request: TripSuggestionsRequest,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get personalized trip video suggestions
    """
    try:
        scraper = YouTubeTravelScraper()
        
        # Build queries based on preferences
        queries = []
        
        if request.region == "AU":
            # Australian-specific suggestions
            if request.vehicle_type == "4WD":
                queries = [
                    "Cape York Telegraph Track 4WD",
                    "Victorian High Country 4x4",
                    "Simpson Desert crossing"
                ]
            elif request.vehicle_type == "RV":
                queries = [
                    "Big Lap Australia RV",
                    "Great Ocean Road motorhome",
                    "Nullarbor crossing caravan"
                ]
        else:
            # Generic queries for other regions
            queries = [
                f"{request.vehicle_type} {request.region} adventure",
                f"{request.region} road trip {request.vehicle_type}"
            ]
        
        all_videos = []
        
        # Search with each query
        for query in queries[:2]:  # Limit queries
            videos = await scraper.search_adventure_videos(
                query=query,
                region=request.region,
                max_results=3
            )
            all_videos.extend(videos)
        
        # Remove duplicates and limit results
        seen = set()
        unique_videos = []
        for video in all_videos:
            if video['video_id'] not in seen:
                seen.add(video['video_id'])
                unique_videos.append(video)
                if len(unique_videos) >= request.max_results:
                    break
        
        return {
            "success": True,
            "preferences": {
                "region": request.region,
                "vehicle_type": request.vehicle_type,
                "difficulty": request.difficulty
            },
            "suggestions": unique_videos,
            "total": len(unique_videos)
        }
        
    except Exception as e:
        logger.error(f"Suggestions failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sample-queries")
async def get_sample_queries() -> Dict[str, Any]:
    """
    Get sample search queries for inspiration
    """
    return {
        "success": True,
        "queries": SAMPLE_SEARCH_QUERIES,
        "categories": {
            "iconic_tracks": [
                "Cape York Telegraph Track",
                "Simpson Desert crossing",
                "Canning Stock Route"
            ],
            "coastal_adventures": [
                "Fraser Island 4WD",
                "Moreton Island beach driving",
                "Great Ocean Road RV"
            ],
            "mountain_tracks": [
                "Victorian High Country 4x4",
                "Flinders Ranges camping",
                "Blue Mountains 4WD"
            ],
            "outback_expeditions": [
                "Gibb River Road Kimberley",
                "Oodnadatta Track",
                "Birdsville Track"
            ]
        }
    }