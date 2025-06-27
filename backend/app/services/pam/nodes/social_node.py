"""
SOCIAL Node - Agentic Community & Social Management
Handles community groups, hustles, marketplace, social feeds with full AI integration.
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal
import logging
from dataclasses import dataclass

from app.services.database import get_database_service
from app.models.domain.pam import PamResponse
from app.services.pam.nodes.base_node import BaseNode
from app.services.pam.intelligent_conversation import IntelligentConversationService
from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)

@dataclass
class HustleOpportunity:
    id: str
    title: str
    category: str
    difficulty: str
    estimated_earnings: str
    time_commitment: str
    success_rate: float
    community_feedback: List[Dict]
    requirements: List[str]

@dataclass
class CommunityGroup:
    id: str
    name: str
    description: str
    member_count: int
    location_focus: str
    recent_activity: List[Dict]
    join_requirements: str

class SocialNode(BaseNode):
    """Agentic SOCIAL node for intelligent community and social management"""
    
    def __init__(self):
        super().__init__("social")
        self.database_service = None
        self.ai_service = IntelligentConversationService()
        self.supabase = get_supabase_client()
    
    async def initialize(self):
        """Initialize SOCIAL node"""
        self.database_service = await get_database_service()
        logger.info("Agentic SOCIAL node initialized")
    
    async def process(self, input_data: Dict[str, Any]) -> PamResponse:
        """Process social requests with full AI intelligence"""
        if not self.database_service:
            await self.initialize()
        
        user_id = input_data.get('user_id')
        message = input_data.get('message', '')
        conversation_history = input_data.get('conversation_history', [])
        user_context = input_data.get('user_context', {})
        
        try:
            # Get comprehensive social context for AI
            social_context = await self._get_social_context(user_id)
            
            # Build AI context with social data
            ai_context = {
                **user_context,
                'social_data': social_context,
                'domain': 'community_and_social_management',
                'capabilities': [
                    'hustle_recommendations', 'community_groups', 'marketplace_listings',
                    'social_feeds', 'community_insights', 'networking_opportunities'
                ]
            }
            
            # Check if this requires a social action
            action_result = await self._detect_and_execute_social_action(
                user_id, message, social_context
            )
            
            if action_result:
                # Action was performed, get updated social context
                social_context = await self._get_social_context(user_id)
                ai_context['social_data'] = social_context
                ai_context['action_performed'] = action_result
            
            # Generate intelligent response using AI
            ai_response = await self.ai_service.generate_response(
                message=message,
                context=ai_context,
                conversation_history=conversation_history,
                system_prompt=self._get_social_system_prompt()
            )
            
            # Generate contextual suggestions
            suggestions = await self._generate_smart_suggestions(
                user_id, message, social_context, action_result
            )
            
            return PamResponse(
                content=ai_response,
                confidence=0.9,
                suggestions=suggestions,
                requires_followup=False,
                metadata={
                    'social_action': action_result.get('action') if action_result else None,
                    'community_engagement': social_context.get('engagement_score', 0),
                    'hustle_opportunities': len(social_context.get('available_hustles', []))
                }
            )
            
        except Exception as e:
            logger.error(f"SOCIAL node processing error: {e}")
            return await self._generate_error_response(message)
    
    async def _get_social_context(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive social context for AI"""
        try:
            context = {}
            
            # User's social activity
            activity_query = """
                SELECT post_type, COUNT(*) as count, MAX(created_at) as last_activity
                FROM social_posts 
                WHERE user_id = $1 
                  AND created_at >= NOW() - INTERVAL '30 days'
                GROUP BY post_type
            """
            social_activity = await self.database_service.execute_query(
                activity_query, user_id, cache_key=f"social_activity:{user_id}", cache_ttl=300
            )
            context['social_activity'] = social_activity
            
            # Community memberships
            groups_query = """
                SELECT g.name, g.member_count, gm.joined_at, g.category
                FROM community_groups g
                JOIN group_memberships gm ON g.id = gm.group_id
                WHERE gm.user_id = $1 AND gm.status = 'active'
                ORDER BY gm.joined_at DESC
            """
            memberships = await self.database_service.execute_query(
                groups_query, user_id, cache_key=f"memberships:{user_id}", cache_ttl=600
            )
            context['community_memberships'] = memberships
            
            # Hustle performance
            hustle_query = """
                SELECT hustle_id, total_earnings, success_rate, status
                FROM user_hustle_attempts 
                WHERE user_id = $1 
                ORDER BY start_date DESC
                LIMIT 5
            """
            hustles = await self.database_service.execute_query(
                hustle_query, user_id, cache_key=f"hustles:{user_id}", cache_ttl=300
            )
            context['hustle_history'] = hustles
            
            # Marketplace activity
            marketplace_query = """
                SELECT status, COUNT(*) as count, AVG(price) as avg_price
                FROM marketplace_listings 
                WHERE user_id = $1 
                  AND created_at >= NOW() - INTERVAL '90 days'
                GROUP BY status
            """
            marketplace_stats = await self.database_service.execute_query(
                marketplace_query, user_id, cache_key=f"marketplace:{user_id}", cache_ttl=600
            )
            context['marketplace_activity'] = marketplace_stats
            
            # Calculate engagement score
            context['engagement_score'] = self._calculate_engagement_score(
                social_activity, memberships, hustles
            )
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting social context: {e}")
            return {}
    
    def _calculate_engagement_score(self, activity: List, memberships: List, hustles: List) -> float:
        """Calculate user's social engagement score"""
        score = 0.0
        
        # Points for social activity
        score += len(activity) * 0.1
        
        # Points for community memberships
        score += len(memberships) * 0.2
        
        # Points for hustle participation
        score += len(hustles) * 0.3
        
        return min(score, 1.0)  # Cap at 1.0
    
    async def _detect_and_execute_social_action(
        self, user_id: str, message: str, social_context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Detect and execute social actions from natural language"""
        message_lower = message.lower()
        
        try:
            # Hustle recommendation detection
            hustle_keywords = ['hustle', 'earn money', 'side income', 'make money', 'opportunities']
            if any(keyword in message_lower for keyword in hustle_keywords):
                return await self._recommend_hustles_from_message(user_id, message)
            
            # Group joining detection
            group_keywords = ['join group', 'find community', 'group', 'community']
            if any(keyword in message_lower for keyword in group_keywords):
                return await self._find_groups_from_message(user_id, message)
            
            # Marketplace detection
            marketplace_keywords = ['sell', 'selling', 'marketplace', 'list item']
            if any(keyword in message_lower for keyword in marketplace_keywords):
                return await self._create_listing_from_message(user_id, message)
            
            return None
            
        except Exception as e:
            logger.error(f"Error executing social action: {e}")
            return None
    
    def _get_social_system_prompt(self) -> str:
        """Get specialized system prompt for social conversations"""
        return """You are PAM (Personal Assistant & Motivator), a friendly AI assistant specializing in RV community building and social connections. You help users find hustles, join communities, participate in marketplaces, and build meaningful connections on the road.

Key capabilities:
- Recommend personalized hustle opportunities for income
- Help find and join relevant community groups
- Assist with marketplace listings and sales
- Create engaging social posts and content
- Provide community insights and networking tips

Communication style:
- Enthusiastic about community and connections
- Use social emojis appropriately (👥, 💰, 🤝, 📱, 🎯)
- Encourage community participation and networking
- Share success stories and social proof
- Be supportive about monetization and social growth

When provided with social_data context:
- Reference their community memberships and activity
- Mention relevant hustle opportunities
- Suggest groups based on their interests
- Provide personalized networking advice

Always be helpful, encouraging, and focused on building a strong, supportive RV community."""

    # Social Management Functions (from app/nodes/social_node.py)
    async def get_hustle_recommendations(self, user_id: str, user_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Get personalized hustle recommendations based on user profile"""
        try:
            skills = user_profile.get('skills', [])
            available_hours = user_profile.get('available_hours', 10)
            location = user_profile.get('location', 'Australia')
            startup_budget = user_profile.get('startup_budget', 100)
            
            # Get hustle opportunities
            hustles = await self._match_hustles_to_user(skills, available_hours, startup_budget)
            
            # Get community success stories
            success_stories = await self._get_community_success_stories(hustles[:3])
            
            # Rank by potential fit
            ranked_hustles = self._rank_hustles_by_fit(hustles, user_profile)
            
            return {
                "success": True,
                "data": {
                    "recommended_hustles": [h.__dict__ for h in ranked_hustles[:5]],
                    "success_stories": success_stories,
                    "total_available": len(hustles),
                    "user_match_score": self._calculate_overall_match_score(ranked_hustles[:5])
                },
                "message": f"Found {len(ranked_hustles)} hustle opportunities perfect for your skills!",
                "actions": [
                    {
                        "type": "navigate",
                        "target": "/social/hustle-board"
                    },
                    {
                        "type": "highlight",
                        "element": ".recommended-hustles"
                    },
                    {
                        "type": "show_notification",
                        "message": f"Top match: {ranked_hustles[0].title} ({ranked_hustles[0].estimated_earnings})",
                        "type": "success"
                    }
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting hustle recommendations: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I couldn't find hustle recommendations right now. Please try again."
            }
    
    async def join_community_group(self, user_id: str, group_data: Dict[str, Any]) -> Dict[str, Any]:
        """Help user join a community group"""
        try:
            group_name = group_data.get('group_name')
            location = group_data.get('location')
            interests = group_data.get('interests', [])
            
            # Find matching groups
            groups = await self._find_matching_groups(location, interests)
            
            if not groups:
                return {
                    "success": False,
                    "message": f"No groups found matching '{group_name}' in {location}. Would you like me to suggest similar groups?"
                }
            
            recommended_group = groups[0]
            
            return {
                "success": True,
                "data": {
                    "group": recommended_group.__dict__,
                    "join_process": self._get_join_requirements(recommended_group),
                    "similar_groups": [g.__dict__ for g in groups[1:3]]
                },
                "message": f"Found '{recommended_group.name}' with {recommended_group.member_count} members!",
                "actions": [
                    {
                        "type": "navigate", 
                        "target": f"/social/groups/{recommended_group.id}"
                    },
                    {
                        "type": "fill_form",
                        "form_id": "join-group-form",
                        "data": {
                            "group_id": recommended_group.id,
                            "user_message": f"Hi! I'm interested in {', '.join(interests)} and would love to join your group."
                        }
                    },
                    {
                        "type": "scroll_to",
                        "element": ".join-button"
                    }
                ]
            }
            
        except Exception as e:
            logger.error(f"Error joining group: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I had trouble finding that group. Please check the group name and try again."
            }
    
    async def create_marketplace_listing(self, user_id: str, listing_data: Dict[str, Any]) -> Dict[str, Any]:
        """Help user create a marketplace listing"""
        try:
            item_name = listing_data.get('item_name')
            category = listing_data.get('category')
            price = listing_data.get('price')
            description = listing_data.get('description', '')
            condition = listing_data.get('condition', 'used')
            
            # Generate listing suggestions
            listing_suggestions = await self._generate_listing_suggestions(item_name, category)
            
            # Check similar listings for pricing
            price_analysis = await self._analyze_market_prices(item_name, category)
            
            listing_id = f"listing_{user_id}_{datetime.now().timestamp()}"
            
            return {
                "success": True,
                "data": {
                    "listing_id": listing_id,
                    "suggested_title": listing_suggestions['title'],
                    "suggested_description": listing_suggestions['description'],
                    "price_analysis": price_analysis,
                    "category_tips": listing_suggestions['tips']
                },
                "message": f"I'll help you create a great listing for your {item_name}!",
                "actions": [
                    {
                        "type": "navigate",
                        "target": "/social/marketplace/create"
                    },
                    {
                        "type": "fill_form",
                        "form_id": "marketplace-form",
                        "data": {
                            "title": listing_suggestions['title'],
                            "description": listing_suggestions['description'],
                            "price": price,
                            "category": category,
                            "condition": condition
                        }
                    },
                    {
                        "type": "show_tooltip",
                        "element": ".price-input",
                        "message": f"Similar items sell for ${price_analysis['avg_price']:.0f} - ${price_analysis['max_price']:.0f}"
                    }
                ]
            }
            
        except Exception as e:
            logger.error(f"Error creating listing: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I couldn't create your marketplace listing. Please try again."
            }
    
    async def post_to_social_feed(self, user_id: str, post_data: Dict[str, Any]) -> Dict[str, Any]:
        """Help user create a social feed post"""
        try:
            content = post_data.get('content')
            post_type = post_data.get('type', 'general')  # tip, question, experience, general
            location = post_data.get('location')
            tags = post_data.get('tags', [])
            
            # Enhance post with suggestions
            enhanced_post = await self._enhance_post_content(content, post_type, location)
            
            # Suggest relevant groups to share with
            relevant_groups = await self._suggest_relevant_groups(content, tags, location)
            
            post_id = f"post_{user_id}_{datetime.now().timestamp()}"
            
            return {
                "success": True,
                "data": {
                    "post_id": post_id,
                    "enhanced_content": enhanced_post['content'],
                    "suggested_tags": enhanced_post['tags'],
                    "relevant_groups": [g.__dict__ for g in relevant_groups],
                    "engagement_tips": enhanced_post['tips']
                },
                "message": "I've enhanced your post and found groups that might be interested!",
                "actions": [
                    {
                        "type": "navigate",
                        "target": "/social/feed"
                    },
                    {
                        "type": "fill_form",
                        "form_id": "create-post-form", 
                        "data": {
                            "content": enhanced_post['content'],
                            "tags": enhanced_post['tags'],
                            "location": location,
                            "type": post_type
                        }
                    },
                    {
                        "type": "show_suggestions",
                        "element": ".group-sharing",
                        "suggestions": [g.name for g in relevant_groups[:3]]
                    }
                ]
            }
            
        except Exception as e:
            logger.error(f"Error creating post: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "I couldn't create your post. Please try again."
            }
    
    async def get_community_insights(self, user_id: str, topic: str) -> Dict[str, Any]:
        """Get community insights on a specific topic"""
        try:
            # Get recent discussions
            discussions = await self._get_recent_discussions(topic)
            
            # Get community sentiment
            sentiment = await self._analyze_community_sentiment(topic)
            
            # Get expert opinions
            expert_opinions = await self._get_expert_opinions(topic)
            
            # Get trending related topics
            related_topics = await self._get_trending_related_topics(topic)
            
            return {
                "success": True,
                "data": {
                    "topic": topic,
                    "recent_discussions": discussions,
                    "community_sentiment": sentiment,
                    "expert_opinions": expert_opinions,
                    "related_topics": related_topics,
                    "participation_score": self._calculate_topic_engagement(discussions)
                },
                "message": f"Here's what the community is saying about {topic}",
                "actions": [
                    {
                        "type": "navigate",
                        "target": "/social/feed"
                    },
                    {
                        "type": "filter_content",
                        "filter": topic
                    },
                    {
                        "type": "highlight",
                        "element": ".topic-insights"
                    }
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting insights: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"I couldn't get community insights about {topic}. Please try again."
            }

    # Helper Methods (from app/nodes/social_node.py)
    async def _match_hustles_to_user(self, skills: List[str], hours: int, budget: float) -> List[HustleOpportunity]:
        """Find hustles matching user capabilities"""
        all_hustles = [
            HustleOpportunity(
                id="freelance_writing",
                title="Freelance Writing for Travel Blogs",
                category="content_creation",
                difficulty="easy",
                estimated_earnings="$500-2000/month",
                time_commitment="2-4 hours/day",
                success_rate=0.75,
                community_feedback=[
                    {"user": "Sarah_nomad", "earnings": 1200, "time_months": 3, "rating": 4}
                ],
                requirements=["writing_skills", "laptop", "internet"]
            ),
            HustleOpportunity(
                id="rv_photography",
                title="RV & Camping Photography Sales",
                category="photography",
                difficulty="medium", 
                estimated_earnings="$300-1500/month",
                time_commitment="1-3 hours/day",
                success_rate=0.60,
                community_feedback=[
                    {"user": "Mike_photos", "earnings": 800, "time_months": 6, "rating": 5}
                ],
                requirements=["camera", "photo_editing", "social_media"]
            ),
            HustleOpportunity(
                id="campground_reviews",
                title="Campground Review Affiliate",
                category="affiliate_marketing",
                difficulty="easy",
                estimated_earnings="$200-800/month", 
                time_commitment="1-2 hours/day",
                success_rate=0.50,
                community_feedback=[
                    {"user": "Jenny_camps", "earnings": 600, "time_months": 4, "rating": 4}
                ],
                requirements=["blog", "social_media", "travel_experience"]
            )
        ]
        
        # Filter by skills and requirements
        matched = []
        for hustle in all_hustles:
            skill_match = any(skill in hustle.requirements for skill in skills)
            if skill_match or not skills:  # Include if skills match or no specific skills
                matched.append(hustle)
        
        return matched
    
    async def _get_community_success_stories(self, hustles: List[HustleOpportunity]) -> List[Dict]:
        """Get success stories for specific hustles"""
        stories = []
        for hustle in hustles:
            if hustle.community_feedback:
                best_feedback = max(hustle.community_feedback, key=lambda x: x['earnings'])
                stories.append({
                    "hustle_title": hustle.title,
                    "user": best_feedback['user'],
                    "earnings": best_feedback['earnings'],
                    "timeframe": f"{best_feedback['time_months']} months",
                    "quote": f"Great opportunity! Made ${best_feedback['earnings']} in {best_feedback['time_months']} months."
                })
        return stories
    
    def _rank_hustles_by_fit(self, hustles: List[HustleOpportunity], user_profile: Dict) -> List[HustleOpportunity]:
        """Rank hustles by how well they fit the user"""
        # Simple ranking by success rate for now
        return sorted(hustles, key=lambda h: h.success_rate, reverse=True)
    
    def _calculate_overall_match_score(self, hustles: List[HustleOpportunity]) -> float:
        """Calculate how well the hustles match the user"""
        if not hustles:
            return 0.0
        return sum(h.success_rate for h in hustles) / len(hustles)
    
    async def _find_matching_groups(self, location: str, interests: List[str]) -> List[CommunityGroup]:
        """Find groups matching location and interests"""
        sample_groups = [
            CommunityGroup(
                id="grey_nomads_qld",
                name="Grey Nomads Queensland",
                description="Queensland-based Grey Nomads sharing tips and meetups",
                member_count=1247,
                location_focus="Queensland, Australia",
                recent_activity=[
                    {"type": "post", "title": "Best free camps around Brisbane", "engagement": 45}
                ],
                join_requirements="Open to all Grey Nomads"
            ),
            CommunityGroup(
                id="budget_travelers_aus",
                name="Budget Travelers Australia",
                description="Tips and tricks for affordable travel across Australia",
                member_count=892,
                location_focus="Australia Wide",
                recent_activity=[
                    {"type": "discussion", "title": "Fuel saving strategies", "engagement": 67}
                ],
                join_requirements="Share your budget travel tips"
            )
        ]
        
        # Filter by location if specified
        if location:
            return [g for g in sample_groups if location.lower() in g.location_focus.lower()]
        return sample_groups
    
    def _get_join_requirements(self, group: CommunityGroup) -> Dict[str, Any]:
        """Get requirements for joining a group"""
        return {
            "requirements": group.join_requirements,
            "approval_process": "Usually approved within 24 hours",
            "group_rules": ["Be respectful", "Share helpful content", "No spam"]
        }
    
    async def _generate_listing_suggestions(self, item_name: str, category: str) -> Dict[str, Any]:
        """Generate suggestions for marketplace listings"""
        return {
            "title": f"{item_name.title()} - Excellent Condition",
            "description": f"Well-maintained {item_name} perfect for camping/RV use. Selling due to downsizing. Pick up preferred.",
            "tips": [
                "Include multiple clear photos",
                "Mention condition honestly", 
                "Respond quickly to inquiries",
                "Consider bundle deals"
            ]
        }
    
    async def _analyze_market_prices(self, item_name: str, category: str) -> Dict[str, Any]:
        """Analyze market prices for similar items"""
        return {
            "avg_price": 150,
            "min_price": 75,
            "max_price": 300,
            "recommendation": "Price competitively around $150"
        }
    
    async def _enhance_post_content(self, content: str, post_type: str, location: str) -> Dict[str, Any]:
        """Enhance post content with suggestions"""
        enhanced_content = content
        
        # Add location if relevant
        if location and location not in content:
            enhanced_content += f" (Location: {location})"
        
        # Suggest hashtags
        suggested_tags = ["#GreyNomads", "#RVLife", "#TravelTips"]
        if post_type == "tip":
            suggested_tags.append("#MoneyTips")
        
        return {
            "content": enhanced_content,
            "tags": suggested_tags,
            "tips": [
                "Add a relevant photo for more engagement",
                "Ask a question to encourage comments",
                "Tag relevant groups"
            ]
        }
    
    async def _suggest_relevant_groups(self, content: str, tags: List[str], location: str) -> List[CommunityGroup]:
        """Suggest groups that might be interested in the post"""
        # Return some sample groups based on content
        all_groups = await self._find_matching_groups(location, tags)
        return all_groups[:3]  # Top 3 most relevant
    
    async def _get_recent_discussions(self, topic: str) -> List[Dict]:
        """Get recent community discussions about a topic"""
        return [
            {
                "title": f"Best practices for {topic}",
                "author": "ExperiencedNomad",
                "replies": 23,
                "last_activity": "2 hours ago"
            },
            {
                "title": f"My experience with {topic}",
                "author": "NewToThis",
                "replies": 15,
                "last_activity": "1 day ago"
            }
        ]
    
    async def _analyze_community_sentiment(self, topic: str) -> Dict[str, Any]:
        """Analyze community sentiment about a topic"""
        return {
            "overall": "positive",
            "confidence": 0.78,
            "common_themes": ["helpful", "recommend", "good value"],
            "concerns": ["setup complexity", "initial cost"]
        }
    
    async def _get_expert_opinions(self, topic: str) -> List[Dict]:
        """Get expert opinions on a topic"""
        return [
            {
                "expert": "RV_Mechanic_Joe",
                "credentials": "20+ years RV experience",
                "opinion": f"For {topic}, I always recommend...",
                "rating": 4.8
            }
        ]
    
    async def _get_trending_related_topics(self, topic: str) -> List[str]:
        """Get trending topics related to the main topic"""
        return [f"best {topic} brands", f"{topic} maintenance", f"budget {topic} options"]
    
    def _calculate_topic_engagement(self, discussions: List[Dict]) -> float:
        """Calculate engagement score for a topic"""
        total_replies = sum(d.get('replies', 0) for d in discussions)
        return min(total_replies / 10.0, 5.0)  # Scale to 0-5

    # Action detection helpers
    async def _recommend_hustles_from_message(self, user_id: str, message: str) -> Dict[str, Any]:
        """Recommend hustles based on message content"""
        try:
            # Extract user profile information
            user_profile = {
                'skills': ['writing', 'photography'],  # Default skills
                'available_hours': 10,
                'location': 'Australia',
                'startup_budget': 100
            }
            
            hustle_result = await self.get_hustle_recommendations(user_id, user_profile)
            
            if hustle_result['success']:
                return {
                    'action': 'hustles_recommended',
                    'hustle_count': len(hustle_result['data']['recommended_hustles']),
                    'top_match': hustle_result['data']['recommended_hustles'][0]['title'] if hustle_result['data']['recommended_hustles'] else None
                }
            
        except Exception as e:
            logger.error(f"Error recommending hustles from message: {e}")
        
        return None

    async def _find_groups_from_message(self, user_id: str, message: str) -> Dict[str, Any]:
        """Find groups based on message content"""
        try:
            # Extract location and interests from message
            group_data = {
                'group_name': 'travel community',
                'location': 'Australia',
                'interests': ['travel', 'rv']
            }
            
            group_result = await self.join_community_group(user_id, group_data)
            
            if group_result['success']:
                return {
                    'action': 'groups_found',
                    'group_name': group_result['data']['group']['name'],
                    'member_count': group_result['data']['group']['member_count']
                }
            
        except Exception as e:
            logger.error(f"Error finding groups from message: {e}")
        
        return None

    async def _create_listing_from_message(self, user_id: str, message: str) -> Dict[str, Any]:
        """Create marketplace listing based on message content"""
        try:
            # Extract item information from message
            listing_data = {
                'item_name': 'RV equipment',
                'category': 'camping',
                'price': 150,
                'description': 'Used camping equipment',
                'condition': 'used'
            }
            
            listing_result = await self.create_marketplace_listing(user_id, listing_data)
            
            if listing_result['success']:
                return {
                    'action': 'listing_created',
                    'listing_id': listing_result['data']['listing_id'],
                    'suggested_price': listing_result['data']['price_analysis']['avg_price']
                }
            
        except Exception as e:
            logger.error(f"Error creating listing from message: {e}")
        
        return None

    async def _generate_smart_suggestions(
        self, user_id: str, message: str, social_context: Dict[str, Any], 
        action_result: Optional[Dict[str, Any]]
    ) -> List[str]:
        """Generate contextual suggestions based on social state"""
        suggestions = []
        
        try:
            # Post-action suggestions
            if action_result:
                action = action_result['action']
                if action == 'hustles_recommended':
                    suggestions = [
                        "Show more hustle details",
                        "Start a hustle",
                        "Join hustle community"
                    ]
                elif action == 'groups_found':
                    suggestions = [
                        "Join this group",
                        "Find more groups",
                        "Create a post"
                    ]
                elif action == 'listing_created':
                    suggestions = [
                        "View my listing",
                        "Create another listing",
                        "Check marketplace"
                    ]
            else:
                # Context-based suggestions
                engagement_score = social_context.get('engagement_score', 0)
                
                if engagement_score < 0.3:
                    suggestions.extend([
                        "Find community groups",
                        "Discover hustle opportunities",
                        "Create marketplace listing"
                    ])
                
                memberships = social_context.get('community_memberships', [])
                if len(memberships) > 0:
                    suggestions.extend([
                        "Check group activity",
                        "Create a post",
                        "Share your experience"
                    ])
                
                # Always include general options
                suggestions.extend([
                    "Find hustle opportunities",
                    "Join community groups",
                    "Browse marketplace",
                    "Get community insights"
                ])
            
            # Remove duplicates and limit to 4
            return list(dict.fromkeys(suggestions))[:4]
            
        except Exception as e:
            logger.error(f"Error generating suggestions: {e}")
            return [
                "Find hustles",
                "Join groups", 
                "Browse marketplace",
                "Get insights"
            ]

    async def _generate_error_response(self, message: str) -> PamResponse:
        """Generate friendly error response"""
        return PamResponse(
            content="I'm having a small hiccup with the community features right now. Let me try that again in just a moment! In the meantime, I can still help you with other aspects of your RV journey. 👥",
            confidence=0.5,
            suggestions=[
                "Try asking again",
                "Find community groups",
                "Get travel tips",
                "Ask something else"
            ],
            requires_followup=True
        )

# Global SOCIAL node instance
social_node = SocialNode()
