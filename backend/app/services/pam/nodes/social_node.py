
"""
Social Node - Community and social features
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from app.models.domain.pam import PamResponse, PamContext, PamMemory
from app.services.pam.nodes.base_node import BaseNode
from app.services.database import DatabaseService
from app.services.cache import CacheService
from app.core.exceptions import ValidationError, DatabaseError
from pydantic import BaseModel, Field

logger = logging.getLogger("pam.social_node")

class PostRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    location: Optional[str] = None

class GroupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class SocialNode(BaseNode):
    """Node for handling social and community features"""
    
    def __init__(self):
        super().__init__("social")
        self.db_service = DatabaseService()
        self.cache_service = CacheService()
    
    async def process(self, message: str, intent: Any, context: PamContext, 
                     memories: List[PamMemory]) -> PamResponse:
        """Process social-related requests"""
        start_time = datetime.now()
        
        try:
            # Input validation
            if not message or not message.strip():
                raise ValidationError("Message cannot be empty")
            
            action = getattr(intent, 'action', None)
            if action:
                action = action.value if hasattr(action, 'value') else str(action)
            else:
                action = 'view'
            
            self.logger.info(f"Processing social request with action: {action}")
            
            if action == 'create':
                response = await self._handle_create_post(message, context)
            elif action == 'join':
                response = await self._handle_join_group(message, context)
            else:
                response = await self._handle_social_overview(message, context)
            
            # Performance logging
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            self.logger.info(f"Social node processed request in {processing_time:.2f}ms")
            
            self._log_processing(message, response)
            return response
                
        except ValidationError as e:
            logger.error(f"Validation error in social node: {str(e)}")
            return self._create_error_response(f"Invalid input: {str(e)}")
        except DatabaseError as e:
            logger.error(f"Database error in social node: {str(e)}")
            return self._create_error_response("I had trouble accessing social data. Please try again.")
        except Exception as e:
            logger.error(f"Social node processing failed: {str(e)}")
            return self._create_error_response("I had trouble with your social request. Please try again.")
    
    async def _handle_create_post(self, message: str, context: PamContext) -> PamResponse:
        """Handle post creation request with real data"""
        try:
            user_id = context.user_id
            if not user_id:
                raise ValidationError("User ID is required for posting")
            
            # Get user's recent posts and popular topics
            cache_key = f"recent_posts:{user_id}"
            cached_posts = await self.cache_service.get(cache_key)
            
            if not cached_posts:
                recent_posts = await self.db_service.get_user_recent_posts(user_id, limit=3)
                await self.cache_service.set(cache_key, [post.model_dump() for post in recent_posts], ttl=300)
            else:
                recent_posts = cached_posts
            
            # Get trending topics
            trending_topics = await self.db_service.get_trending_topics(limit=4)
            
            suggestions = [
                "Share travel tip",
                "Post campground review",
                "Ask for route advice",
                "Share photo story"
            ]
            
            # Add suggestions based on trending topics
            if trending_topics:
                for topic in trending_topics[:2]:
                    suggestions.append(f"Post about {topic.get('name', 'topic')}")
            
            return PamResponse(
                content="I'd love to help you share with the community! What would you like to post about?",
                intent=None,
                confidence=0.9,
                suggestions=suggestions,
                actions=[
                    {"type": "navigate", "target": "/social", "label": "Create Post"}
                ],
                requires_followup=True,
                context_updates={"post_creation_started": True},
                voice_enabled=True
            )
            
        except Exception as e:
            logger.error(f"Error in post creation: {str(e)}")
            return self._create_error_response("I had trouble accessing the social features.")
    
    async def _handle_join_group(self, message: str, context: PamContext) -> PamResponse:
        """Handle group joining request with real data"""
        try:
            user_id = context.user_id
            if not user_id:
                raise ValidationError("User ID is required for joining groups")
            
            # Get user's current groups and recommended groups
            user_groups = await self.db_service.get_user_groups(user_id)
            recommended_groups = await self.db_service.get_recommended_groups(user_id, limit=4)
            
            suggestions = [
                "Find local RV groups",
                "Join travel communities",
                "Connect with solo travelers",
                "Find technical help groups"
            ]
            
            # Add suggestions based on recommended groups
            if recommended_groups:
                for group in recommended_groups[:2]:
                    suggestions.append(f"Join {group.get('name', 'group')}")
            
            # Check if user has groups to suggest activities
            if user_groups:
                suggestions.append("Check group events")
                suggestions.append("Post in your groups")
            
            return PamResponse(
                content="Great! Let's find you some communities to connect with. What kind of groups interest you?",
                intent=None,
                confidence=0.9,
                suggestions=suggestions,
                actions=[
                    {"type": "navigate", "target": "/social", "label": "Browse Groups"}
                ],
                requires_followup=True,
                context_updates={"group_joining_started": True},
                voice_enabled=True
            )
            
        except Exception as e:
            logger.error(f"Error in group joining: {str(e)}")
            return self._create_error_response("I had trouble accessing group data.")
    
    async def _handle_social_overview(self, message: str, context: PamContext) -> PamResponse:
        """Handle social overview request with real data"""
        try:
            user_id = context.user_id
            if not user_id:
                return PamResponse(
                    content="I can help you connect with the RV community! What are you looking for?",
                    intent=None,
                    confidence=0.8,
                    suggestions=[
                        "Find local RV groups",
                        "Discover events nearby",
                        "Join community discussions",
                        "Share travel experiences"
                    ],
                    actions=[
                        {"type": "navigate", "target": "/social", "label": "Explore Social Features"}
                    ],
                    requires_followup=True,
                    context_updates={"social_exploration_started": True},
                    voice_enabled=True
                )
            
            # Get real social data
            cache_key = f"social_overview:{user_id}"
            cached_data = await self.cache_service.get(cache_key)
            
            if not cached_data:
                user_groups = await self.db_service.get_user_groups(user_id)
                recent_posts = await self.db_service.get_user_recent_posts(user_id, limit=5)
                upcoming_events = await self.db_service.get_upcoming_events(user_id, limit=3)
                
                social_data = {
                    'groups_count': len(user_groups),
                    'posts_count': len(recent_posts),
                    'events_count': len(upcoming_events),
                    'group_names': [group.get('name', '') for group in user_groups[:3]]
                }
                await self.cache_service.set(cache_key, social_data, ttl=300)
            else:
                social_data = cached_data
            
            # Build content based on real data
            content = "Here's your social overview:\n"
            
            if social_data.get('groups_count', 0) > 0:
                content += f"• Member of {social_data['groups_count']} groups\n"
                if social_data.get('group_names'):
                    content += f"• Active in: {', '.join(social_data['group_names'][:2])}\n"
                content += f"• Recent posts: {social_data.get('posts_count', 0)}"
            else:
                content += "Ready to connect with the RV community! Let's find some groups for you."
            
            suggestions = [
                "Find local groups",
                "Discover events nearby", 
                "Create a post",
                "Share travel tip"
            ]
            
            return PamResponse(
                content=content,
                intent=None,
                confidence=0.8,
                suggestions=suggestions,
                actions=[
                    {"type": "navigate", "target": "/social", "label": "Social Dashboard"}
                ],
                requires_followup=False,
                context_updates={},
                voice_enabled=True
            )
            
        except Exception as e:
            logger.error(f"Error in social overview: {str(e)}")
            return self._create_error_response("I had trouble accessing your social data.")

# Create singleton instance
social_node = SocialNode()
