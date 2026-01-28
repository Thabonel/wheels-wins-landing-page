"""
YouTube Trip Tool

Search for travel videos, RV tips, destination guides, and camping tutorials.
Uses YouTube Data API if available, falls back to curated recommendations.
"""

import os
import logging
from typing import Dict, Any, List, Optional

from app.services.pam.tools.exceptions import (
    ValidationError,
    ExternalAPIError,
)

logger = logging.getLogger(__name__)

# Try to import an async HTTP client
try:
    import httpx
    HTTP_CLIENT = "httpx"
except ImportError:
    try:
        import aiohttp
        HTTP_CLIENT = "aiohttp"
    except ImportError:
        HTTP_CLIENT = None
        logger.warning("No async HTTP client available (httpx or aiohttp). YouTube API search disabled.")

# Curated travel video channels for fallback
CURATED_CHANNELS = {
    "rv_tips": [
        {"title": "Keep Your Daydream", "channel": "Keep Your Daydream", "focus": "Full-time RV living tips"},
        {"title": "RV Lifestyle", "channel": "RV Lifestyle", "focus": "RV reviews and tips"},
        {"title": "Less Junk More Journey", "channel": "Less Junk More Journey", "focus": "RV travel and lifestyle"},
    ],
    "destination_guide": [
        {"title": "Drivin' & Vibin'", "channel": "Drivin' & Vibin'", "focus": "National park guides"},
        {"title": "Long Long Honeymoon", "channel": "Long Long Honeymoon", "focus": "RV destination reviews"},
        {"title": "Getaway Couple", "channel": "Getaway Couple", "focus": "RV park and campground reviews"},
    ],
    "camping_tutorial": [
        {"title": "All About RV's", "channel": "All About RV's", "focus": "RV maintenance tutorials"},
        {"title": "RV Education 101", "channel": "RV Education 101", "focus": "RV how-to guides"},
        {"title": "My RV Works", "channel": "My RV Works", "focus": "RV repair tutorials"},
    ],
    "travel_vlog": [
        {"title": "Changing Lanes", "channel": "Changing Lanes", "focus": "Family RV adventures"},
        {"title": "Gone with the Wynns", "channel": "Gone with the Wynns", "focus": "RV and sailing adventures"},
        {"title": "Nomadic Fanatic", "channel": "Nomadic Fanatic", "focus": "Solo RV travel"},
    ],
    "reviews": [
        {"title": "RV Miles", "channel": "RV Miles", "focus": "RV and gear reviews"},
        {"title": "The Savvy Campers", "channel": "The Savvy Campers", "focus": "Camping gear reviews"},
        {"title": "Mortons on the Move", "channel": "Mortons on the Move", "focus": "RV tech reviews"},
    ],
}


class YouTubeTripTool:
    """Tool for searching travel and RV videos on YouTube."""

    def __init__(self):
        self.api_key = os.getenv("YOUTUBE_API_KEY")
        self.base_url = "https://www.googleapis.com/youtube/v3/search"

    async def execute(
        self,
        query: str,
        video_type: Optional[str] = None,
        max_results: int = 5,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Search for travel videos on YouTube.

        Args:
            query: Search query
            video_type: Type of video (destination_guide, rv_tips, etc.)
            max_results: Maximum results to return

        Returns:
            Dict with video results

        Raises:
            ValidationError: Invalid query or parameters
            ExternalAPIError: YouTube API request failed
        """
        try:
            if not query or not query.strip():
                raise ValidationError(
                    "Search query is required",
                    context={"query": query}
                )

            if max_results < 1 or max_results > 50:
                raise ValidationError(
                    "Max results must be between 1 and 50",
                    context={"max_results": max_results}
                )
            # Try YouTube API if key available
            if self.api_key:
                return await self._search_youtube_api(query, video_type, max_results)

            # Fallback to curated recommendations
            return self._get_curated_recommendations(query, video_type, max_results)

        except ValidationError:
            raise
        except ExternalAPIError:
            raise
        except Exception as e:
            logger.error(
                f"Unexpected YouTube search error",
                extra={"query": query, "video_type": video_type},
                exc_info=True
            )
            raise ExternalAPIError(
                "Failed to search YouTube videos",
                context={"query": query, "error": str(e)}
            )

    async def _search_youtube_api(
        self,
        query: str,
        video_type: Optional[str],
        max_results: int
    ) -> Dict[str, Any]:
        """Search using YouTube Data API."""
        if HTTP_CLIENT is None:
            logger.warning("No HTTP client available, falling back to curated")
            return self._get_curated_recommendations(query, video_type, max_results)

        # Enhance query based on video type
        enhanced_query = self._enhance_query(query, video_type)

        params = {
            "part": "snippet",
            "q": enhanced_query,
            "type": "video",
            "maxResults": min(max_results, 10),
            "key": self.api_key,
            "relevanceLanguage": "en",
            "safeSearch": "moderate",
        }

        data = await self._make_request(params)

        videos = []
        for item in data.get("items", []):
            snippet = item.get("snippet", {})
            video_id = item.get("id", {}).get("videoId")

            if video_id:
                videos.append({
                    "title": snippet.get("title"),
                    "description": snippet.get("description", "")[:200],
                    "channel": snippet.get("channelTitle"),
                    "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url"),
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "video_id": video_id,
                })

        return {
            "success": True,
            "query": query,
            "video_type": video_type,
            "videos": videos,
            "count": len(videos),
            "source": "youtube_api"
        }

    async def _make_request(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make HTTP request using available client.

        Raises:
            ExternalAPIError: API request failed
        """
        if HTTP_CLIENT == "httpx":
            async with httpx.AsyncClient() as client:
                response = await client.get(self.base_url, params=params)
                if response.status_code != 200:
                    raise ExternalAPIError(
                        f"YouTube API returned status {response.status_code}",
                        context={"api": "YouTube", "status_code": response.status_code}
                    )
                return response.json()
        elif HTTP_CLIENT == "aiohttp":
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status != 200:
                        raise ExternalAPIError(
                            f"YouTube API returned status {response.status}",
                            context={"api": "YouTube", "status_code": response.status}
                        )
                    return await response.json()
        else:
            raise ExternalAPIError(
                "No HTTP client available for YouTube API requests",
                context={"required_packages": ["httpx", "aiohttp"]}
            )

    def _get_curated_recommendations(
        self,
        query: str,
        video_type: Optional[str],
        max_results: int
    ) -> Dict[str, Any]:
        """Return curated channel recommendations when API unavailable."""
        recommendations = []

        # Get channels for the requested type
        if video_type and video_type in CURATED_CHANNELS:
            channels = CURATED_CHANNELS[video_type]
        else:
            # Mix from all categories
            channels = []
            for category_channels in CURATED_CHANNELS.values():
                channels.extend(category_channels[:2])

        # Build recommendations with search suggestions
        for channel in channels[:max_results]:
            search_url = f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}+{channel['channel'].replace(' ', '+')}"
            recommendations.append({
                "channel": channel["channel"],
                "focus": channel["focus"],
                "search_url": search_url,
                "suggestion": f"Search '{query}' on {channel['channel']}"
            })

        return {
            "success": True,
            "query": query,
            "video_type": video_type or "general",
            "recommendations": recommendations,
            "count": len(recommendations),
            "source": "curated",
            "message": "YouTube API key not configured. Here are recommended channels for your search."
        }

    def _enhance_query(self, query: str, video_type: Optional[str]) -> str:
        """Add relevant keywords to improve search results."""
        type_keywords = {
            "destination_guide": "travel guide",
            "rv_tips": "RV tips tutorial",
            "camping_tutorial": "camping how to",
            "travel_vlog": "travel vlog",
            "reviews": "review",
        }

        if video_type and video_type in type_keywords:
            return f"{query} {type_keywords[video_type]}"
        return query


# For direct function calls (non-class usage)
async def search_travel_videos(
    query: str,
    video_type: Optional[str] = None,
    max_results: int = 5
) -> Dict[str, Any]:
    """
    Search for travel videos on YouTube.

    Args:
        query: Search query (e.g., 'RV camping Yellowstone')
        video_type: Type of video (destination_guide, rv_tips, camping_tutorial, travel_vlog, reviews)
        max_results: Maximum number of videos to return

    Returns:
        Dict with video results or curated recommendations

    Raises:
        ValidationError: Invalid query or parameters
        ExternalAPIError: YouTube API request failed
    """
    tool = YouTubeTripTool()
    return await tool.execute(query, video_type, max_results)
