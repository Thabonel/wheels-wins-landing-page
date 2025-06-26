
"""
SOCIAL Node - Community and Social Features
Handles community interactions, group management, and social features.
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime, date

from backend.app.core.logging import setup_logging
from backend.app.services.database import get_database_service
from backend.app.models.domain.pam import PamResponse
from backend.app.services.pam.nodes.base_node import BaseNode

logger = setup_logging()

class SocialNode(BaseNode):
    """SOCIAL node for community and social features"""
    
    def __init__(self):
        super().__init__("social")
        self.database_service = None
    
    async def initialize(self):
        """Initialize SOCIAL node"""
        self.database_service = await get_database_service()
        logger.info("SOCIAL node initialized")
    
    async def process(self, input_data: Dict[str, Any]) -> PamResponse:
        """Process social and community requests"""
        if not self.database_service:
            await self.initialize()
        
        user_id = input_data.get('user_id')
        message = input_data.get('message', '').lower()
        intent = input_data.get('intent')
        entities = input_data.get('entities', {})
        
        try:
            if 'group' in message or 'community' in message:
                return await self._handle_group_interactions(user_id, message, entities)
            elif 'event' in message or 'meetup' in message:
                return await self._handle_event_discovery(user_id, message, entities)
            elif 'marketplace' in message or 'buy' in message or 'sell' in message:
                return await self._handle_marketplace(user_id, message, entities)
            elif 'friends' in message or 'connect' in message:
                return await self._handle_social_connections(user_id, message, entities)
            else:
                return await self._handle_general_social_query(user_id, message)
                
        except Exception as e:
            logger.error(f"SOCIAL node processing error: {e}")
            return PamResponse(
                content="I'm having trouble accessing community features right now. Please try again in a moment.",
                confidence=0.3,
                requires_followup=True
            )
    
    async def _handle_group_interactions(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle group and community interactions"""
        location = entities.get('location')
        group_type = entities.get('group_type')
        
        try:
            # Get user's groups
            query = """
                SELECT fg.group_name, fg.location, fg.member_count, fg.group_type,
                       fg.description, gm.role, gm.joined_at
                FROM group_memberships gm
                JOIN facebook_groups fg ON fg.id = gm.group_id
                WHERE gm.user_id = $1 AND gm.is_active = true
                ORDER BY gm.joined_at DESC
            """
            
            user_groups = await self.database_service.execute_query(
                query, user_id,
                cache_key=f"user_groups:{user_id}", cache_ttl=3600
            )
            
            # Search for groups if location specified
            if location:
                search_query = """
                    SELECT group_name, location, member_count, group_type, description,
                           admin_contact, activity_level
                    FROM facebook_groups 
                    WHERE location ILIKE $1 
                    ORDER BY member_count DESC 
                    LIMIT 5
                """
                
                nearby_groups = await self.database_service.execute_query(
                    search_query, f"%{location}%",
                    cache_key=f"groups_location:{location}", cache_ttl=1800
                )
            else:
                nearby_groups = []
            
            response_parts = ["👥 **RV Community Groups**"]
            
            if user_groups:
                response_parts.extend([
                    "",
                    "🏠 **Your Groups:**"
                ])
                for group in user_groups:
                    role_emoji = "👑" if group['role'] == 'admin' else "👤"
                    response_parts.extend([
                        f"{role_emoji} **{group['group_name']}**",
                        f"📍 {group['location']} • {group['member_count']} members",
                        f"📝 {group['description'][:100]}..." if group['description'] else ""
                    ])
            
            if nearby_groups:
                response_parts.extend([
                    "",
                    f"🔍 **Groups near {location}:**"
                ])
                for group in nearby_groups:
                    response_parts.extend([
                        f"👥 **{group['group_name']}** ({group['group_type']})",
                        f"📍 {group['location']} • {group['member_count']} members",
                        f"⚡ Activity: {group['activity_level']}"
                    ])
                    if group['description']:
                        response_parts.append(f"📝 {group['description'][:80]}...")
            elif location:
                response_parts.extend([
                    "",
                    f"🔍 I don't have specific groups for {location} yet.",
                    "Try searching Facebook for 'RV groups [your area]' or check:",
                    "• Escapees RV Club chapters",
                    "• Good Sam Club chapters", 
                    "• Local RV dealer communities",
                    "• Campground Facebook pages"
                ])
            
            if not user_groups and not nearby_groups:
                response_parts.extend([
                    "",
                    "🌟 **Finding RV Communities:**",
                    "• Search Facebook for '[Your Area] RV Group'",
                    "• Join Escapees or Good Sam chapters",
                    "• Connect at campgrounds and RV shows",
                    "• Use apps like Nomad Internet or RV Trip Wizard"
                ])
            
            return PamResponse(
                content="\n".join(response_parts),
                confidence=0.8,
                suggestions=[
                    "Find RV groups near me",
                    "Show local RV events",
                    "Connect with other RVers",
                    "Join a community"
                ],
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"Group interactions error: {e}")
            return PamResponse(
                content="I can help you find RV communities! Try looking for local Facebook groups, Escapees chapters, or Good Sam clubs in your area. RV shows and campgrounds are also great places to meet fellow RVers!",
                confidence=0.6,
                requires_followup=False
            )
    
    async def _handle_event_discovery(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle event discovery and meetups"""
        location = entities.get('location')
        event_type = entities.get('event_type')
        
        try:
            # Search for local events
            query = """
                SELECT event_name, event_type, start_date, end_date, venue_name,
                       description, ticket_price, is_free, registration_required
                FROM local_events 
                WHERE start_date >= CURRENT_DATE
                AND (address ILIKE $1 OR venue_name ILIKE $1)
                ORDER BY start_date ASC 
                LIMIT 8
            """
            
            events = await self.database_service.execute_query(
                query, f"%{location or ''}%",
                cache_key=f"events:{location or 'general'}", cache_ttl=3600
            )
            
            if not events and location:
                return PamResponse(
                    content=f"""🎪 I don't have specific events for {location} yet, but here are great ways to find RV events:

📅 **RV Event Resources:**
• FMCA Rally schedules
• Escapees Rallies and Convergences  
• Good Sam Rally calendar
• State/National park events
• RV show schedules

🌐 **Where to Look:**
• RVLife Event Calendar
• Eventbrite (search "RV" + your area)
• Facebook Events in RV groups
• Campground activity calendars
• Local visitor bureau websites""",
                    confidence=0.6,
                    suggestions=[
                        "Find RV rallies",
                        "Check campground events",
                        "Look for RV shows",
                        "Search Facebook events"
                    ],
                    requires_followup=False
                )
            
            response_parts = [f"🎪 **Upcoming Events{f' near {location}' if location else ''}:**"]
            
            if events:
                for event in events:
                    response_parts.extend([
                        "",
                        f"🎯 **{event['event_name']}**",
                        f"📅 {event['start_date']}"
                    ])
                    
                    if event['end_date'] and event['end_date'] != event['start_date']:
                        response_parts.append(f"   to {event['end_date']}")
                    
                    if event['venue_name']:
                        response_parts.append(f"📍 {event['venue_name']}")
                    
                    if event['is_free']:
                        response_parts.append("🆓 Free event!")
                    elif event['ticket_price']:
                        response_parts.append(f"💰 ${event['ticket_price']}")
                    
                    if event['registration_required']:
                        response_parts.append("📝 Registration required")
                    
                    if event['description']:
                        desc = event['description'][:100] + "..." if len(event['description']) > 100 else event['description']
                        response_parts.append(f"📝 {desc}")
            else:
                response_parts.extend([
                    "",
                    "🔍 **Popular RV Event Types:**",
                    "• Rally gatherings and convergences",
                    "• RV shows and exhibitions", 
                    "• Campground social hours",
                    "• Outdoor recreation events",
                    "• Educational seminars and workshops"
                ])
            
            return PamResponse(
                content="\n".join(response_parts),
                confidence=0.7,
                suggestions=[
                    "Find RV rallies",
                    "Show RV club events",
                    "Look for workshops",
                    "Check campground activities"
                ],
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"Event discovery error: {e}")
            return PamResponse(
                content="For RV events, I recommend checking FMCA and Escapees rally calendars, RV show schedules, and local campground activity boards!",
                confidence=0.5,
                requires_followup=False
            )
    
    async def _handle_marketplace(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle marketplace interactions"""
        try:
            # Get recent marketplace listings
            query = """
                SELECT title, description, price, category, location, condition,
                       seller, posted, status
                FROM marketplace_listings 
                WHERE status = 'approved'
                ORDER BY updated_at DESC 
                LIMIT 6
            """
            
            listings = await self.database_service.execute_query(
                query, cache_key="marketplace_recent", cache_ttl=1800
            )
            
            response_parts = ["🛒 **RV Marketplace**"]
            
            if listings:
                response_parts.extend([
                    "",
                    "🔥 **Recent Listings:**"
                ])
                
                for listing in listings:
                    response_parts.extend([
                        "",
                        f"📦 **{listing['title']}**",
                        f"💰 ${listing['price']} • {listing['condition']}",
                        f"📍 {listing['location']} • Posted {listing['posted']}"
                    ])
                    
                    if listing['description']:
                        desc = listing['description'][:80] + "..." if len(listing['description']) > 80 else listing['description']
                        response_parts.append(f"📝 {desc}")
            
            response_parts.extend([
                "",
                "🛍️ **Popular RV Marketplace Categories:**",
                "• RV accessories and upgrades",
                "• Camping gear and equipment",
                "• Electronics and solar equipment", 
                "• Tools and maintenance supplies",
                "• Furniture and decor",
                "",
                "💡 **Buying/Selling Tips:**",
                "• Meet at safe, public locations",
                "• Verify items work before purchasing",
                "• Check Facebook Marketplace and RV groups",
                "• Consider RVTrader for larger items"
            ])
            
            return PamResponse(
                content="\n".join(response_parts),
                confidence=0.7,
                suggestions=[
                    "Post item for sale",
                    "Search for RV accessories",
                    "Find camping gear",
                    "Browse electronics"
                ],
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"Marketplace error: {e}")
            return PamResponse(
                content="For buying/selling RV items, I recommend Facebook Marketplace, RV-specific Facebook groups, RVTrader, and Craigslist. Always meet safely and verify items before purchasing!",
                confidence=0.6,
                requires_followup=False
            )
    
    async def _handle_social_connections(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle social connections and networking"""
        return PamResponse(
            content="""👋 **Connecting with Fellow RVers**

🤝 **Best Ways to Meet RVers:**
• Join campground social hours and potlucks
• Participate in RV rallies and convergences
• Visit RV shows and exhibitions
• Use apps like RV Trip Wizard or Nomad Internet
• Join Facebook groups for your area/interests

📱 **RV Social Apps & Platforms:**
• RV Life App - Trip planning with social features
• iRV2 Forums - Q&A and discussions
• RVillage - RV social network
• Campendium - Reviews and community
• Facebook RV groups by region/brand

🏕️ **Campground Networking:**
• Attend campground activities
• Offer help to fellow RVers
• Share meals and experiences
• Exchange contact information
• Plan group outings

⭐ **Building RV Friendships:**
• Be helpful and friendly
• Share knowledge and experiences  
• Respect personal space and schedules
• Follow up after meetings
• Plan future meetups""",
            confidence=0.8,
            suggestions=[
                "Find RV groups near me",
                "Locate upcoming rallies",
                "Check campground events",
                "Join online communities"
            ],
            requires_followup=False
        )
    
    async def _handle_general_social_query(self, user_id: str, message: str) -> PamResponse:
        """Handle general social questions"""
        return PamResponse(
            content="""👥 **RV Community & Social Features**

I can help you with:
• 🏘️ Finding RV groups and communities
• 🎪 Discovering local events and rallies  
• 🛒 Marketplace for buying/selling
• 🤝 Connecting with other RVers
• 📅 Event planning and coordination

The RVing community is incredibly welcoming! Most RVers are happy to help newcomers and share their experiences.

What aspect of RV community life interests you most?""",
            confidence=0.7,
            suggestions=[
                "Find RV groups",
                "Discover local events",
                "Browse marketplace",
                "Connect with RVers"
            ],
            requires_followup=True
        )

# Global SOCIAL node instance
social_node = SocialNode()
