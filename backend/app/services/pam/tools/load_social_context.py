"""Load Social Context Tool - Retrieves friends locations and nearby events for travel planning."""
from typing import Dict, Any, List, Tuple
from pydantic import BaseModel, Field, ValidationError as PydanticValidationError
from datetime import datetime, timedelta
from .base_tool import BaseTool
from app.core.database import get_supabase_client, get_user_context_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import validate_uuid


FRIEND_LIMIT = 20
LOCATION_POST_LIMIT = 50
EVENT_LIMIT = 25
TRAVEL_POST_LIMIT = 30
FRIEND_PREVIEW_LIMIT = 10
LOCATION_PREVIEW_LIMIT = 15
EVENT_PREVIEW_LIMIT = 10
POST_PREVIEW_LIMIT = 10
RECENT_LOCATION_DAYS = 30
EVENT_FORECAST_DAYS = 90
RECENT_TRAVEL_POST_DAYS = 14

class _ExecuteParams(BaseModel):
    """Validation model for execute parameters."""

    user_id: str = Field(min_length=1)
    parameters: Dict[str, Any] | None = None


class LoadSocialContextTool(BaseTool):
    """Tool to load social context including friends' locations and nearby events."""

    def __init__(self, user_jwt: str = None):
        super().__init__("load_social_context", user_jwt=user_jwt)
        if user_jwt:
            self.supabase = get_user_context_supabase_client(user_jwt)
        else:
            self.supabase = get_supabase_client()
    
    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Load social context for travel planning

        Raises:
            ValidationError: Invalid parameters
            DatabaseError: Database operation failed
        """
        try:
            # Validate inputs
            try:
                validate_uuid(user_id, "user_id")
                _ExecuteParams(user_id=user_id, parameters=parameters)
            except PydanticValidationError as ve:
                self.logger.error(f"Input validation failed: {ve.errors()}")
                raise ValidationError(
                    "Invalid parameters",
                    context={"validation_errors": ve.errors()}
                )

            self.logger.info(f"🤝 SOCIAL DEBUG: Loading social context for user {user_id}")
            
            # Get user's friends (accepted friendships)
            friends_data = await self._get_user_friends(user_id)
            
            # Get recent friend locations from social posts
            friend_locations = await self._get_friend_recent_locations(user_id)
            
            # Get nearby community events
            upcoming_events = await self._get_upcoming_community_events(user_id)
            
            # Get travel-related posts from friends
            friend_travel_posts = await self._get_friend_travel_posts(user_id)
            
            social_context = {
                "user_id": user_id,
                "friends": {
                    "count": len(friends_data),
                    "list": friends_data[:FRIEND_PREVIEW_LIMIT],
                },
                "friend_locations": {
                    "count": len(friend_locations),
                    "recent_locations": friend_locations[:LOCATION_PREVIEW_LIMIT],
                },
                "nearby_events": {
                    "count": len(upcoming_events),
                    "upcoming": upcoming_events[:EVENT_PREVIEW_LIMIT],
                },
                "friend_travel_activity": {
                    "count": len(friend_travel_posts),
                    "recent_posts": friend_travel_posts[:POST_PREVIEW_LIMIT],
                },
                "context_summary": {
                    "has_nearby_friends": len(friend_locations) > 0,
                    "has_upcoming_events": len(upcoming_events) > 0,
                    "friends_traveling": len(friend_travel_posts) > 0,
                    "social_travel_opportunities": len(friend_locations) + len(upcoming_events)
                }
            }
            
            self.logger.info(f"🤝 SOCIAL DEBUG: Found {len(friends_data)} friends, {len(friend_locations)} recent locations, {len(upcoming_events)} events")

            return self._create_success_response(social_context)

        except ValidationError:
            raise
        except DatabaseError:
            raise
        except Exception as e:
            self.logger.error(
                f"Unexpected error loading social context",
                extra={"user_id": user_id},
                exc_info=True
            )
            raise DatabaseError(
                "Could not load social context",
                context={"user_id": user_id, "error": str(e)}
            )
    
    async def _get_user_friends(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's accepted friends with their profile info."""
        try:
            friends_response = (
                self.supabase.table("user_friendships")
                .select("""
                    friend_id,
                    created_at,
                    profiles!user_friendships_friend_id_fkey (
                        id,
                        full_name,
                        nickname,
                        region,
                        vehicle_type,
                        make_model_year
                    )
                """)
                .eq("user_id", user_id)
                .eq("status", "accepted")
                .order("created_at", desc=True)
                .limit(FRIEND_LIMIT)
                .execute()
            )
            
            friends = []
            for friendship in friends_response.data:
                if friendship.get("profiles"):
                    friend_profile = friendship["profiles"]
                    friends.append({
                        "user_id": friendship["friend_id"],
                        "name": friend_profile.get("full_name") or friend_profile.get("nickname", "Friend"),
                        "region": friend_profile.get("region", "Unknown"),
                        "vehicle": {
                            "type": friend_profile.get("vehicle_type", "Unknown"),
                            "details": friend_profile.get("make_model_year", "")
                        },
                        "friendship_date": friendship["created_at"]
                    })
            
            return friends
            
        except Exception as e:
            self.logger.error(f"Error getting user friends: {e}")
            return []
    
    async def _get_friend_recent_locations(self, user_id: str) -> List[Dict[str, Any]]:
        """Get recent location posts from friends."""
        try:
            since_date = (datetime.now() - timedelta(days=RECENT_LOCATION_DAYS)).isoformat()

            location_posts_response = (
                self.supabase.table("social_posts")
                .select("""
                    id,
                    user_id,
                    content,
                    location_name,
                    post_type,
                    created_at,
                    profiles!social_posts_user_id_fkey (
                        full_name,
                        nickname
                    )
                """)
                .not_.is_("location", "null")
                .gte("created_at", since_date)
                .in_("post_type", ["location", "trip_share", "text", "image"])
                .order("created_at", desc=True)
                .limit(LOCATION_POST_LIMIT)
                .execute()
            )

            friend_ids = await self._get_friend_ids(user_id)
            
            friend_locations = []
            for post in location_posts_response.data:
                if post["user_id"] in friend_ids and post.get("location_name"):
                    friend_locations.append({
                        "post_id": post["id"],
                        "friend_id": post["user_id"],
                        "friend_name": (
                            post["profiles"]["full_name"] or 
                            post["profiles"]["nickname"] or 
                            "Friend"
                        ) if post.get("profiles") else "Friend",
                        "location": post["location_name"],
                        "content_preview": post["content"][:100] if post.get("content") else "",
                        "post_type": post["post_type"],
                        "posted_at": post["created_at"]
                    })
            
            return friend_locations
            
        except Exception as e:
            self.logger.error(f"Error getting friend locations: {e}")
            return []
    
    async def _get_upcoming_community_events(self, user_id: str) -> List[Dict[str, Any]]:
        """Get upcoming community events that might be relevant."""
        try:
            start_date = datetime.now().isoformat()
            end_date = (datetime.now() + timedelta(days=EVENT_FORECAST_DAYS)).isoformat()

            events_response = (
                self.supabase.table("community_events")
                .select("""
                    id,
                    title,
                    description,
                    event_type,
                    start_date,
                    end_date,
                    location_name,
                    address,
                    max_attendees,
                    current_attendees,
                    organizer_id,
                    profiles!community_events_organizer_id_fkey (
                        full_name,
                        nickname
                    )
                """)
                .eq("is_public", True)
                .gte("start_date", start_date)
                .lte("start_date", end_date)
                .not_.is_("location_name", "null")
                .order("start_date", desc=False)
                .limit(EVENT_LIMIT)
                .execute()
            )
            
            events = []
            for event in events_response.data:
                events.append({
                    "event_id": event["id"],
                    "title": event["title"],
                    "description": event.get("description", "")[:150],
                    "type": event["event_type"],
                    "start_date": event["start_date"],
                    "end_date": event.get("end_date"),
                    "location": event.get("location_name", "TBD"),
                    "address": event.get("address", ""),
                    "attendees": f"{event.get('current_attendees', 0)}/{event.get('max_attendees', '∞')}",
                    "organizer": (
                        event["profiles"]["full_name"] or 
                        event["profiles"]["nickname"] or 
                        "Organizer"
                    ) if event.get("profiles") else "Community"
                })
            
            return events
            
        except Exception as e:
            self.logger.error(f"Error getting community events: {e}")
            return []
    
    async def _get_friend_travel_posts(self, user_id: str) -> List[Dict[str, Any]]:
        """Get recent travel-related posts from friends."""
        try:
            since_date = (datetime.now() - timedelta(days=RECENT_TRAVEL_POST_DAYS)).isoformat()

            travel_posts_response = (
                self.supabase.table("social_posts")
                .select("""
                    id,
                    user_id,
                    content,
                    location_name,
                    post_type,
                    created_at,
                    profiles!social_posts_user_id_fkey (
                        full_name,
                        nickname
                    )
                """)
                .eq("post_type", "trip_share")
                .gte("created_at", since_date)
                .order("created_at", desc=True)
                .limit(TRAVEL_POST_LIMIT)
                .execute()
            )

            friend_ids = await self._get_friend_ids(user_id)
            
            travel_posts = []
            for post in travel_posts_response.data:
                if post["user_id"] in friend_ids:
                    travel_posts.append({
                        "post_id": post["id"],
                        "friend_id": post["user_id"],
                        "friend_name": (
                            post["profiles"]["full_name"] or 
                            post["profiles"]["nickname"] or 
                            "Friend"
                        ) if post.get("profiles") else "Friend",
                        "content": post.get("content", "")[:200],
                        "location": post.get("location_name"),
                        "posted_at": post["created_at"]
                    })
            
            return travel_posts
            
        except Exception as e:
            self.logger.error(f"Error getting friend travel posts: {e}")
            return []
    
    async def _get_friend_ids(self, user_id: str) -> List[str]:
        """Get list of user's friend IDs for filtering"""
        try:
            friends_response = (
                self.supabase.table("user_friendships")
                .select("friend_id")
                .eq("user_id", user_id)
                .eq("status", "accepted")
                .execute()
            )
            
            return [f["friend_id"] for f in friends_response.data]
            
        except Exception as e:
            self.logger.error(f"Error getting friend IDs: {e}")
            return []