"""
PAM Social Media & Communication Platform Integration System
Comprehensive integration with social media platforms, messaging services,
and communication tools for content sharing and social travel experiences.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import base64
import hashlib
import hmac
import urllib.parse
from PIL import Image
import io

from app.core.config import get_settings
from app.services.database import get_database
from app.core.security import encrypt_sensitive_data, decrypt_sensitive_data

settings = get_settings()
logger = logging.getLogger(__name__)

class SocialPlatform(Enum):
    """Supported social media platforms"""
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    TWITTER = "twitter"
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    LINKEDIN = "linkedin"
    PINTEREST = "pinterest"
    SNAPCHAT = "snapchat"
    
    # Travel-specific platforms
    TRIPADVISOR = "tripadvisor"
    YELP = "yelp"
    GOOGLE_REVIEWS = "google_reviews"
    FOURSQUARE = "foursquare"
    
    # Communication platforms
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"
    DISCORD = "discord"
    SLACK = "slack"
    
    # Australian platforms
    GUMTREE = "gumtree"
    SEEK = "seek"

class ContentType(Enum):
    """Types of content that can be shared"""
    TEXT_POST = "text_post"
    IMAGE_POST = "image_post"
    VIDEO_POST = "video_post"
    STORY = "story"
    REEL = "reel"
    LIVE_STREAM = "live_stream"
    REVIEW = "review"
    CHECK_IN = "check_in"
    TRAVEL_LOG = "travel_log"
    RECOMMENDATION = "recommendation"

class PostStatus(Enum):
    """Status of social media posts"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    POSTED = "posted"
    FAILED = "failed"
    DELETED = "deleted"
    HIDDEN = "hidden"

class PrivacyLevel(Enum):
    """Privacy levels for social media posts"""
    PUBLIC = "public"
    FRIENDS = "friends"
    PRIVATE = "private"
    FOLLOWERS = "followers"
    CUSTOM = "custom"

@dataclass
class SocialAccount:
    """Connected social media account"""
    account_id: str
    platform: SocialPlatform
    username: str
    display_name: str
    profile_picture: Optional[str]
    follower_count: Optional[int]
    following_count: Optional[int]
    is_verified: bool
    is_business_account: bool
    access_token: str  # Encrypted
    refresh_token: Optional[str]  # Encrypted
    token_expires: Optional[datetime]
    permissions: List[str]
    connected_at: datetime
    last_sync: datetime
    user_id: str
    metadata: Dict[str, Any]

@dataclass
class SocialPost:
    """Social media post"""
    post_id: str
    platform: SocialPlatform
    account_id: str
    content_type: ContentType
    title: Optional[str]
    text_content: Optional[str]
    media_urls: List[str]
    hashtags: List[str]
    mentions: List[str]
    location: Optional[Dict[str, Any]]
    privacy_level: PrivacyLevel
    scheduled_time: Optional[datetime]
    posted_time: Optional[datetime]
    status: PostStatus
    engagement_metrics: Dict[str, int]
    platform_post_id: Optional[str]
    platform_url: Optional[str]
    user_id: str
    metadata: Dict[str, Any]

@dataclass
class SocialEngagement:
    """Social media engagement data"""
    engagement_id: str
    post_id: str
    platform: SocialPlatform
    engagement_type: str  # like, comment, share, view
    user_id: Optional[str]
    username: Optional[str]
    content: Optional[str]
    timestamp: datetime
    metadata: Dict[str, Any]

@dataclass
class TravelStoryTemplate:
    """Template for travel stories"""
    template_id: str
    name: str
    description: str
    template_type: str
    content_structure: Dict[str, Any]
    suggested_hashtags: List[str]
    platforms: List[SocialPlatform]
    media_requirements: Dict[str, Any]
    customization_options: Dict[str, Any]

class PAMSocialPlatformSystem:
    """
    Comprehensive social media integration system for PAM.
    
    Features:
    - Multi-platform account connection and management
    - Cross-platform content publishing and scheduling
    - Travel story creation and sharing templates
    - Location-based check-ins and reviews
    - Automated travel blogging and documentation
    - Social travel recommendations and sharing
    - Community engagement and interaction
    - Privacy-aware content management
    - Analytics and engagement tracking
    """
    
    def __init__(self):
        self.db = get_database()
        self.session = None
        
        # Platform configurations
        self.platform_configs = {
            SocialPlatform.FACEBOOK: {
                "api_url": "https://graph.facebook.com/v18.0",
                "auth_url": "https://www.facebook.com/v18.0/dialog/oauth",
                "scopes": ["publish_actions", "user_posts", "pages_manage_posts", "pages_read_engagement"],
                "media_types": ["image", "video", "album"],
                "max_text_length": 63206,
                "hashtag_limit": 30
            },
            SocialPlatform.INSTAGRAM: {
                "api_url": "https://graph.instagram.com",
                "auth_url": "https://api.instagram.com/oauth/authorize",
                "scopes": ["instagram_basic", "instagram_content_publish"],
                "media_types": ["image", "video", "carousel", "story", "reel"],
                "max_text_length": 2200,
                "hashtag_limit": 30
            },
            SocialPlatform.TWITTER: {
                "api_url": "https://api.twitter.com/2",
                "auth_url": "https://twitter.com/i/oauth2/authorize",
                "scopes": ["tweet.read", "tweet.write", "users.read"],
                "media_types": ["image", "video", "gif"],
                "max_text_length": 280,
                "hashtag_limit": 10
            },
            SocialPlatform.TRIPADVISOR: {
                "api_url": "https://api.tripadvisor.com/api/partner/2.0",
                "scopes": ["write_reviews", "read_reviews"],
                "media_types": ["image"],
                "max_text_length": 5000,
                "rating_required": True
            },
            SocialPlatform.GOOGLE_REVIEWS: {
                "api_url": "https://mybusinessbusinessinformation.googleapis.com/v1",
                "scopes": ["https://www.googleapis.com/auth/business.manage"],
                "media_types": ["image"],
                "max_text_length": 4096,
                "rating_required": True
            }
        }
        
        # Content templates
        self.travel_templates = {}
        
        # Media processing
        self.image_processor = None
        
        # Rate limiting
        self.rate_limiters = {}
        
        # Initialize social system
        asyncio.create_task(self._initialize_social_system())
    
    async def _initialize_social_system(self):
        """Initialize social platform system"""
        try:
            # Create HTTP session
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=60),
                headers={"User-Agent": "PAM-Social-Assistant/1.0"}
            )
            
            # Load travel story templates
            await self._load_travel_templates()
            
            # Initialize rate limiters
            self._initialize_rate_limiters()
            
            logger.info("Social platform system initialized")
            
        except Exception as e:
            logger.error(f"Error initializing social system: {e}")
    
    async def connect_social_account(
        self,
        user_id: str,
        platform: SocialPlatform,
        auth_code: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """
        Connect a social media account using OAuth.
        
        Args:
            user_id: User identifier
            platform: Social media platform
            auth_code: Authorization code from OAuth flow
            redirect_uri: Redirect URI used in OAuth flow
            
        Returns:
            Connection result with account details
        """
        try:
            # Exchange auth code for access token
            token_result = await self._exchange_social_auth_code(platform, auth_code, redirect_uri)
            if not token_result["success"]:
                return {"success": False, "error": token_result["error"]}
            
            access_token = token_result["access_token"]
            refresh_token = token_result.get("refresh_token")
            expires_in = token_result.get("expires_in")
            
            # Get account information
            account_info = await self._get_account_info(platform, access_token)
            if not account_info:
                return {"success": False, "error": "Failed to retrieve account information"}
            
            # Create social account record
            account = SocialAccount(
                account_id=f"{platform.value}_{account_info['id']}",
                platform=platform,
                username=account_info["username"],
                display_name=account_info["display_name"],
                profile_picture=account_info.get("profile_picture"),
                follower_count=account_info.get("follower_count"),
                following_count=account_info.get("following_count"),
                is_verified=account_info.get("is_verified", False),
                is_business_account=account_info.get("is_business_account", False),
                access_token=await encrypt_sensitive_data(access_token),
                refresh_token=await encrypt_sensitive_data(refresh_token) if refresh_token else None,
                token_expires=datetime.utcnow() + timedelta(seconds=expires_in) if expires_in else None,
                permissions=token_result.get("permissions", []),
                connected_at=datetime.utcnow(),
                last_sync=datetime.utcnow(),
                user_id=user_id,
                metadata=account_info.get("metadata", {})
            )
            
            # Store account connection
            await self._store_social_account(account)
            
            return {
                "success": True,
                "account": asdict(account),
                "message": f"Successfully connected to {platform.value}"
            }
            
        except Exception as e:
            logger.error(f"Error connecting social account: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_travel_story(
        self,
        user_id: str,
        template_id: str,
        location_data: Dict[str, Any],
        media_files: List[str],
        custom_content: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a travel story using a template.
        
        Args:
            user_id: User identifier
            template_id: Template to use
            location_data: Location information
            media_files: List of media file URLs/paths
            custom_content: Custom content additions
            
        Returns:
            Created travel story content
        """
        try:
            # Get template
            template = self.travel_templates.get(template_id)
            if not template:
                return {"success": False, "error": "Template not found"}
            
            # Process location data
            location_context = await self._enrich_location_data(location_data)
            
            # Process media files
            processed_media = await self._process_travel_media(media_files, template.media_requirements)
            
            # Generate story content
            story_content = await self._generate_story_content(
                template, location_context, processed_media, custom_content
            )
            
            # Create story record
            story_id = f"story_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            travel_story = {
                "story_id": story_id,
                "user_id": user_id,
                "template_id": template_id,
                "location": location_context,
                "content": story_content,
                "media": processed_media,
                "suggested_platforms": [p.value for p in template.platforms],
                "hashtags": template.suggested_hashtags + story_content.get("generated_hashtags", []),
                "created_at": datetime.utcnow().isoformat(),
                "status": "draft"
            }
            
            # Store travel story
            await self._store_travel_story(travel_story)
            
            return {
                "success": True,
                "story": travel_story,
                "message": "Travel story created successfully"
            }
            
        except Exception as e:
            logger.error(f"Error creating travel story: {e}")
            return {"success": False, "error": str(e)}
    
    async def publish_content(
        self,
        user_id: str,
        platforms: List[SocialPlatform],
        content: Dict[str, Any],
        scheduling: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Publish content to multiple social media platforms.
        
        Args:
            user_id: User identifier
            platforms: List of platforms to publish to
            content: Content to publish
            scheduling: Optional scheduling information
            
        Returns:
            Publishing results for each platform
        """
        try:
            # Get connected accounts for platforms
            connected_accounts = await self._get_connected_accounts(user_id, platforms)
            
            if not connected_accounts:
                return {"success": False, "error": "No connected accounts found for specified platforms"}
            
            # Prepare content for each platform
            platform_content = {}
            for platform in platforms:
                if platform in connected_accounts:
                    adapted_content = await self._adapt_content_for_platform(content, platform)
                    platform_content[platform] = adapted_content
            
            # Schedule or publish immediately
            if scheduling and scheduling.get("scheduled_time"):
                # Schedule posts
                scheduled_posts = await self._schedule_posts(
                    user_id, platform_content, connected_accounts, scheduling
                )
                
                return {
                    "success": True,
                    "scheduled_posts": scheduled_posts,
                    "message": f"Content scheduled for {len(scheduled_posts)} platforms"
                }
            else:
                # Publish immediately
                publish_results = await self._publish_immediately(
                    user_id, platform_content, connected_accounts
                )
                
                successful_publishes = sum(1 for result in publish_results.values() if result["success"])
                
                return {
                    "success": successful_publishes > 0,
                    "results": publish_results,
                    "successful_publishes": successful_publishes,
                    "total_attempts": len(publish_results)
                }
            
        except Exception as e:
            logger.error(f"Error publishing content: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_location_checkin(
        self,
        user_id: str,
        location: Dict[str, Any],
        platforms: List[SocialPlatform],
        message: Optional[str] = None,
        photos: Optional[List[str]] = None,
        rating: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Create location check-in across platforms.
        
        Args:
            user_id: User identifier
            location: Location data (name, coordinates, etc.)
            platforms: Platforms to check in on
            message: Optional check-in message
            photos: Optional photos to include
            rating: Optional rating (for review platforms)
            
        Returns:
            Check-in results
        """
        try:
            # Get location details
            location_details = await self._get_location_details(location)
            
            # Generate check-in content
            checkin_content = await self._generate_checkin_content(
                location_details, message, rating
            )
            
            # Create check-in posts for each platform
            checkin_results = {}
            
            for platform in platforms:
                try:
                    if platform in [SocialPlatform.FACEBOOK, SocialPlatform.INSTAGRAM]:
                        result = await self._create_social_checkin(
                            user_id, platform, location_details, checkin_content, photos
                        )
                    elif platform in [SocialPlatform.TRIPADVISOR, SocialPlatform.GOOGLE_REVIEWS]:
                        result = await self._create_review_checkin(
                            user_id, platform, location_details, checkin_content, photos, rating
                        )
                    else:
                        result = await self._create_generic_checkin(
                            user_id, platform, location_details, checkin_content, photos
                        )
                    
                    checkin_results[platform.value] = result
                    
                except Exception as e:
                    logger.error(f"Error creating check-in for {platform}: {e}")
                    checkin_results[platform.value] = {"success": False, "error": str(e)}
            
            # Store check-in record
            await self._store_checkin_record(user_id, location_details, checkin_results)
            
            successful_checkins = sum(1 for result in checkin_results.values() if result.get("success"))
            
            return {
                "success": successful_checkins > 0,
                "results": checkin_results,
                "location": location_details,
                "successful_checkins": successful_checkins
            }
            
        except Exception as e:
            logger.error(f"Error creating location check-in: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_social_analytics(
        self,
        user_id: str,
        platforms: Optional[List[SocialPlatform]] = None,
        date_range: Optional[Tuple[datetime, datetime]] = None
    ) -> Dict[str, Any]:
        """
        Get social media analytics and engagement metrics.
        
        Args:
            user_id: User identifier
            platforms: Optional specific platforms
            date_range: Optional date range for analytics
            
        Returns:
            Social media analytics data
        """
        try:
            # Set default date range (last 30 days)
            if not date_range:
                end_date = datetime.utcnow()
                start_date = end_date - timedelta(days=30)
                date_range = (start_date, end_date)
            
            # Get connected accounts
            connected_accounts = await self._get_connected_accounts(user_id, platforms)
            
            analytics = {
                "period": {
                    "start": date_range[0].isoformat(),
                    "end": date_range[1].isoformat()
                },
                "platforms": {},
                "summary": {
                    "total_posts": 0,
                    "total_engagement": 0,
                    "average_engagement_rate": 0,
                    "top_performing_content": []
                }
            }
            
            total_posts = 0
            total_engagement = 0
            
            for platform, account in connected_accounts.items():
                platform_analytics = await self._get_platform_analytics(
                    platform, account, date_range
                )
                
                analytics["platforms"][platform.value] = platform_analytics
                total_posts += platform_analytics.get("post_count", 0)
                total_engagement += platform_analytics.get("total_engagement", 0)
            
            # Calculate summary metrics
            analytics["summary"]["total_posts"] = total_posts
            analytics["summary"]["total_engagement"] = total_engagement
            analytics["summary"]["average_engagement_rate"] = (
                total_engagement / total_posts if total_posts > 0 else 0
            )
            
            # Get top performing content
            analytics["summary"]["top_performing_content"] = await self._get_top_performing_content(
                user_id, date_range, limit=5
            )
            
            return analytics
            
        except Exception as e:
            logger.error(f"Error getting social analytics: {e}")
            return {"error": str(e)}
    
    async def manage_social_privacy(
        self,
        user_id: str,
        privacy_settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Manage privacy settings across social platforms.
        
        Args:
            user_id: User identifier
            privacy_settings: Privacy settings to apply
            
        Returns:
            Privacy management results
        """
        try:
            # Get connected accounts
            connected_accounts = await self._get_connected_accounts(user_id)
            
            privacy_results = {}
            
            for platform, account in connected_accounts.items():
                try:
                    platform_settings = privacy_settings.get(platform.value, {})
                    if platform_settings:
                        result = await self._apply_platform_privacy_settings(
                            platform, account, platform_settings
                        )
                        privacy_results[platform.value] = result
                        
                except Exception as e:
                    logger.error(f"Error managing privacy for {platform}: {e}")
                    privacy_results[platform.value] = {"success": False, "error": str(e)}
            
            # Store privacy preferences
            await self._store_privacy_preferences(user_id, privacy_settings)
            
            return {
                "success": True,
                "results": privacy_results,
                "message": "Privacy settings updated"
            }
            
        except Exception as e:
            logger.error(f"Error managing social privacy: {e}")
            return {"success": False, "error": str(e)}
    
    # Private helper methods
    
    async def _exchange_social_auth_code(
        self,
        platform: SocialPlatform,
        auth_code: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """Exchange OAuth authorization code for access token"""
        try:
            config = self.platform_configs[platform]
            
            if platform == SocialPlatform.FACEBOOK:
                return await self._exchange_facebook_token(auth_code, redirect_uri)
            elif platform == SocialPlatform.INSTAGRAM:
                return await self._exchange_instagram_token(auth_code, redirect_uri)
            elif platform == SocialPlatform.TWITTER:
                return await self._exchange_twitter_token(auth_code, redirect_uri)
            else:
                return await self._generic_token_exchange(platform, auth_code, redirect_uri)
                
        except Exception as e:
            logger.error(f"Error exchanging auth code for {platform}: {e}")
            return {"success": False, "error": str(e)}
    
    async def _generate_story_content(
        self,
        template: TravelStoryTemplate,
        location_context: Dict[str, Any],
        processed_media: List[Dict[str, Any]],
        custom_content: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate story content based on template and context"""
        try:
            content_structure = template.content_structure
            
            # Generate title
            title = await self._generate_story_title(template, location_context)
            
            # Generate main text
            main_text = await self._generate_story_text(
                template, location_context, custom_content
            )
            
            # Generate hashtags
            hashtags = await self._generate_contextual_hashtags(
                location_context, template.suggested_hashtags
            )
            
            # Generate captions for media
            media_captions = await self._generate_media_captions(processed_media, location_context)
            
            story_content = {
                "title": title,
                "main_text": main_text,
                "hashtags": hashtags,
                "media_captions": media_captions,
                "location_tags": [location_context.get("name", "")],
                "generated_hashtags": hashtags,
                "template_type": template.template_type
            }
            
            return story_content
            
        except Exception as e:
            logger.error(f"Error generating story content: {e}")
            return {}
    
    async def _adapt_content_for_platform(
        self,
        content: Dict[str, Any],
        platform: SocialPlatform
    ) -> Dict[str, Any]:
        """Adapt content for specific platform requirements"""
        try:
            config = self.platform_configs.get(platform, {})
            adapted = content.copy()
            
            # Adapt text length
            max_length = config.get("max_text_length", 10000)
            if "text" in adapted and len(adapted["text"]) > max_length:
                adapted["text"] = adapted["text"][:max_length-3] + "..."
            
            # Adapt hashtags
            hashtag_limit = config.get("hashtag_limit", 30)
            if "hashtags" in adapted and len(adapted["hashtags"]) > hashtag_limit:
                adapted["hashtags"] = adapted["hashtags"][:hashtag_limit]
            
            # Platform-specific adaptations
            if platform == SocialPlatform.TWITTER:
                # Twitter specific formatting
                if "hashtags" in adapted:
                    hashtag_text = " ".join(f"#{tag}" for tag in adapted["hashtags"])
                    text_with_hashtags = f"{adapted.get('text', '')} {hashtag_text}"
                    if len(text_with_hashtags) > 280:
                        # Adjust text or hashtags
                        available_space = 280 - len(adapted.get('text', '')) - 1
                        if available_space > 0:
                            hashtag_text = hashtag_text[:available_space]
                    adapted["formatted_text"] = text_with_hashtags
            
            elif platform == SocialPlatform.INSTAGRAM:
                # Instagram specific formatting
                adapted["formatted_text"] = f"{adapted.get('text', '')}\n\n" + \
                                          " ".join(f"#{tag}" for tag in adapted.get("hashtags", []))
            
            # Media adaptations
            if "media" in adapted:
                adapted["media"] = await self._adapt_media_for_platform(adapted["media"], platform)
            
            return adapted
            
        except Exception as e:
            logger.error(f"Error adapting content for {platform}: {e}")
            return content
    
    def _load_travel_templates(self):
        """Load predefined travel story templates"""
        self.travel_templates = {
            "scenic_drive": TravelStoryTemplate(
                template_id="scenic_drive",
                name="Scenic Drive Adventure",
                description="Template for scenic drive experiences",
                template_type="journey",
                content_structure={
                    "opening": "Just completed an amazing drive through {location}!",
                    "highlights": ["scenic_views", "interesting_stops", "road_conditions"],
                    "closing": "What a day! Next stop: {next_destination}"
                },
                suggested_hashtags=["#ScenicDrive", "#RoadTrip", "#Australia", "#Travel", "#Adventure"],
                platforms=[SocialPlatform.FACEBOOK, SocialPlatform.INSTAGRAM, SocialPlatform.TWITTER],
                media_requirements={"min_photos": 2, "preferred_ratio": "landscape"},
                customization_options={"weather_mention": True, "fuel_costs": True}
            ),
            
            "campground_review": TravelStoryTemplate(
                template_id="campground_review",
                name="Campground Review",
                description="Template for reviewing campgrounds and caravan parks",
                template_type="review",
                content_structure={
                    "opening": "Stayed at {location} and here's my honest review:",
                    "highlights": ["facilities", "cleanliness", "staff", "value_for_money"],
                    "rating": "Overall rating: {rating}/5 stars",
                    "closing": "Would I stay again? {recommendation}"
                },
                suggested_hashtags=["#CampgroundReview", "#CaravanPark", "#GreyNomads", "#Travel", "#Review"],
                platforms=[SocialPlatform.FACEBOOK, SocialPlatform.TRIPADVISOR, SocialPlatform.GOOGLE_REVIEWS],
                media_requirements={"min_photos": 3, "facility_photos": True},
                customization_options={"price_mention": True, "booking_tips": True}
            ),
            
            "local_discovery": TravelStoryTemplate(
                template_id="local_discovery",
                name="Local Discovery",
                description="Template for sharing local discoveries and hidden gems",
                template_type="discovery",
                content_structure={
                    "opening": "Found a hidden gem in {location}!",
                    "description": "{discovery_details}",
                    "tips": "Pro tip: {local_tip}",
                    "closing": "Have you been here? Share your experience!"
                },
                suggested_hashtags=["#HiddenGem", "#LocalDiscovery", "#Australia", "#Travel", "#Explore"],
                platforms=[SocialPlatform.FACEBOOK, SocialPlatform.INSTAGRAM, SocialPlatform.PINTEREST],
                media_requirements={"min_photos": 1, "location_showcase": True},
                customization_options={"local_history": True, "practical_info": True}
            )
        }


# Global social platform system instance
social_platform_system = PAMSocialPlatformSystem()

# Utility functions for easy integration

async def connect_social_platform(
    user_id: str,
    platform: str,
    auth_code: str,
    redirect_uri: str
) -> Dict[str, Any]:
    """Convenience function for connecting social account"""
    social_platform = SocialPlatform(platform)
    return await social_platform_system.connect_social_account(
        user_id=user_id,
        platform=social_platform,
        auth_code=auth_code,
        redirect_uri=redirect_uri
    )

async def create_travel_story(
    user_id: str,
    template: str,
    location: Dict[str, Any],
    photos: List[str],
    custom_text: str = None
) -> Dict[str, Any]:
    """Convenience function for creating travel story"""
    custom_content = {"custom_text": custom_text} if custom_text else None
    
    return await social_platform_system.create_travel_story(
        user_id=user_id,
        template_id=template,
        location_data=location,
        media_files=photos,
        custom_content=custom_content
    )

async def share_travel_content(
    user_id: str,
    platforms: List[str],
    content: Dict[str, Any],
    schedule_time: datetime = None
) -> Dict[str, Any]:
    """Convenience function for sharing content"""
    social_platforms = [SocialPlatform(p) for p in platforms]
    scheduling = {"scheduled_time": schedule_time} if schedule_time else None
    
    return await social_platform_system.publish_content(
        user_id=user_id,
        platforms=social_platforms,
        content=content,
        scheduling=scheduling
    )

async def check_into_location(
    user_id: str,
    location: Dict[str, Any],
    platforms: List[str],
    message: str = None,
    rating: int = None
) -> Dict[str, Any]:
    """Convenience function for location check-in"""
    social_platforms = [SocialPlatform(p) for p in platforms]
    
    return await social_platform_system.create_location_checkin(
        user_id=user_id,
        location=location,
        platforms=social_platforms,
        message=message,
        rating=rating
    )