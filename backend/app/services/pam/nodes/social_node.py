from typing import Dict, List, Any
from datetime import datetime
from dataclasses import dataclass
from app.core.logging import setup_logging

logger = setup_logging("social_node")

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

class SocialNode:
    """Handles all community, social, and hustle-related functionality"""
    
    def __init__(self):
        self.logger = setup_logging("social_node")
        
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
            self.logger.error(f"Error getting hustle recommendations: {e}")
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
            self.logger.error(f"Error joining group: {e}")
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
            self.logger.error(f"Error creating listing: {e}")
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
            self.logger.error(f"Error creating post: {e}")
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
            self.logger.error(f"Error getting insights: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"I couldn't get community insights about {topic}. Please try again."
            }
    
    # Helper methods
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

# Create global instance
social_node = SocialNode()
