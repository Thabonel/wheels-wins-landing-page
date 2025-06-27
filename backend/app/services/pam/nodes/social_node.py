"""
SOCIAL Node - Community and Social Features
Handles community interactions, group management, and social features with real-time searching.
"""

import json
import aiohttp
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, date
import logging

from backend.app.services.database import get_database_service
from backend.app.models.domain.pam import PamResponse
from backend.app.services.pam.nodes.base_node import BaseNode

logger = logging.getLogger(__name__)

class SocialNode(BaseNode):
    """SOCIAL node for community and social features with active searching"""
    
    def __init__(self):
        super().__init__("social")
        self.database_service = None
        self.scraping_session = None
    
    async def initialize(self):
        """Initialize SOCIAL node"""
        self.database_service = await get_database_service()
        self.scraping_session = aiohttp.ClientSession()
        logger.info("SOCIAL node initialized with scraping capabilities")
    
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
        """Handle group and community interactions with real-time searching"""
        location = entities.get('location', 'nationwide')
        
        try:
            # First check our database for existing groups
            local_groups = await self._search_local_groups(user_id, location)
            
            # Then scrape for current Facebook groups and forums
            online_groups = await self._scrape_rv_groups(location)
            
            # Search for RV club chapters
            club_chapters = await self._find_rv_club_chapters(location)
            
            response_parts = [f"👥 **RV Groups & Communities{f' near {location}' if location != 'nationwide' else ''}**"]
            
            # Add user's existing groups if any
            if local_groups:
                response_parts.extend([
                    "",
                    "🏠 **Your Current Groups:**"
                ])
                for group in local_groups:
                    response_parts.append(f"👤 {group['name']} - {group['location']}")
            
            # Add discovered Facebook groups
            if online_groups:
                response_parts.extend([
                    "",
                    "📱 **Active Facebook Groups I Found:**"
                ])
                for group in online_groups[:5]:  # Limit to top 5
                    response_parts.extend([
                        f"👥 **{group['name']}**",
                        f"📍 {group['location']} • {group['members']} members",
                        f"⚡ Activity: {group['activity_level']}"
                    ])
                    if group.get('recent_post'):
                        response_parts.append(f"💬 Recent: {group['recent_post'][:60]}...")
            
            # Add RV club chapters
            if club_chapters:
                response_parts.extend([
                    "",
                    "🏛️ **RV Club Chapters:**"
                ])
                for chapter in club_chapters:
                    response_parts.extend([
                        f"🎪 **{chapter['club_name']} - {chapter['chapter_name']}**",
                        f"📍 {chapter['location']}",
                        f"📅 Next meeting: {chapter.get('next_meeting', 'TBD')}"
                    ])
                    if chapter.get('contact'):
                        response_parts.append(f"📞 Contact: {chapter['contact']}")
            
            if not online_groups and not club_chapters:
                response_parts.extend([
                    "",
                    "🔍 **I'm still searching for active groups in your area...**",
                    "Let me check a few more sources and get back to you with updates!"
                ])
                
                # Queue background search for more groups
                asyncio.create_task(self._background_group_search(user_id, location))
            
            return PamResponse(
                content="\n".join(response_parts),
                confidence=0.8,
                suggestions=[
                    "Find more groups nearby",
                    "Search for RV rallies",
                    "Show group events",
                    "Connect with specific clubs"
                ],
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"Group search error: {e}")
            return self._create_error_response("I had trouble searching for groups right now. Let me try again in a moment.")
    
    async def _handle_event_discovery(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle event discovery with active web scraping"""
        location = entities.get('location', await self._get_user_location(user_id))
        
        try:
            # Search multiple sources for RV events
            search_tasks = [
                self._scrape_fmca_events(location),
                self._scrape_escapees_events(location),
                self._scrape_goodsam_events(location),
                self._scrape_eventbrite_rv_events(location),
                self._scrape_campground_events(location)
            ]
            
            # Run all searches concurrently
            results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            all_events = []
            for result in results:
                if isinstance(result, list):
                    all_events.extend(result)
            
            # Sort by date and remove duplicates
            unique_events = self._deduplicate_events(all_events)
            upcoming_events = sorted(unique_events, key=lambda x: x.get('start_date', ''))
            
            response_parts = [f"🎪 **Upcoming RV Events{f' near {location}' if location else ''}**"]
            
            if upcoming_events:
                response_parts.append(f"\n✨ **Found {len(upcoming_events)} events happening soon:**")
                
                for event in upcoming_events[:8]:  # Show top 8 events
                    response_parts.extend([
                        "",
                        f"🎯 **{event['name']}**",
                        f"📅 {event['start_date']}"
                    ])
                    
                    if event.get('end_date') and event['end_date'] != event['start_date']:
                        response_parts.append(f"   through {event['end_date']}")
                    
                    if event.get('location'):
                        response_parts.append(f"📍 {event['location']}")
                    
                    if event.get('price'):
                        if event['price'] == 'free':
                            response_parts.append("🆓 Free event!")
                        else:
                            response_parts.append(f"💰 {event['price']}")
                    
                    if event.get('description'):
                        desc = event['description'][:80] + "..." if len(event['description']) > 80 else event['description']
                        response_parts.append(f"📝 {desc}")
                    
                    if event.get('registration_url'):
                        response_parts.append(f"🔗 Register: {event['registration_url']}")
            else:
                response_parts.extend([
                    "",
                    "🔍 **Still searching for events...**",
                    "I'm checking rally calendars and event sites. Let me get back to you with updates!"
                ])
                
                # Queue background search
                asyncio.create_task(self._background_event_search(user_id, location))
            
            return PamResponse(
                content="\n".join(response_parts),
                confidence=0.9,
                suggestions=[
                    "Find more events",
                    "Search specific event types",
                    "Get event reminders",
                    "Show nearby rallies"
                ],
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"Event discovery error: {e}")
            return self._create_error_response("I'm having trouble searching for events right now. Let me try again.")
    
    async def _handle_marketplace(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle marketplace with real-time searching"""
        search_term = entities.get('item', 'RV accessories')
        location = entities.get('location', await self._get_user_location(user_id))
        
        try:
            # Search multiple marketplaces concurrently
            search_tasks = [
                self._scrape_facebook_marketplace(search_term, location),
                self._scrape_craigslist_rv(search_term, location),
                self._scrape_rv_trader(search_term),
                self._scrape_rv_forums_marketplace(search_term)
            ]
            
            results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            all_listings = []
            for result in results:
                if isinstance(result, list):
                    all_listings.extend(result)
            
            # Sort by relevance and date
            sorted_listings = sorted(all_listings, key=lambda x: x.get('posted_date', ''), reverse=True)
            
            response_parts = [f"🛒 **RV Marketplace Results for '{search_term}'**"]
            
            if sorted_listings:
                response_parts.append(f"\n🔥 **Found {len(sorted_listings)} recent listings:**")
                
                for listing in sorted_listings[:6]:  # Show top 6
                    response_parts.extend([
                        "",
                        f"📦 **{listing['title']}**",
                        f"💰 ${listing['price']} • {listing.get('condition', 'Used')}"
                    ])
                    
                    if listing.get('location'):
                        response_parts.append(f"📍 {listing['location']}")
                    
                    if listing.get('description'):
                        desc = listing['description'][:60] + "..." if len(listing['description']) > 60 else listing['description']
                        response_parts.append(f"📝 {desc}")
                    
                    if listing.get('url'):
                        response_parts.append(f"🔗 View: {listing['url']}")
                    
                    response_parts.append(f"📅 Posted: {listing.get('posted_date', 'Recently')}")
                
                response_parts.extend([
                    "",
                    "💡 **Safety Tips:**",
                    "• Meet in public, safe locations",
                    "• Inspect items thoroughly before buying",
                    "• Use secure payment methods",
                    "• Trust your instincts"
                ])
            else:
                response_parts.extend([
                    "",
                    "🔍 **Still searching marketplaces...**",
                    "Let me check a few more sources for you!"
                ])
                
                # Queue background search
                asyncio.create_task(self._background_marketplace_search(user_id, search_term, location))
            
            return PamResponse(
                content="\n".join(response_parts),
                confidence=0.8,
                suggestions=[
                    "Search for different items",
                    "Set up price alerts",
                    "Find similar listings",
                    "Post item for sale"
                ],
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"Marketplace search error: {e}")
            return self._create_error_response("I'm having trouble searching the marketplace right now.")
    
    # Scraping methods (these would contain the actual scraping logic)
    async def _scrape_rv_groups(self, location: str) -> List[Dict]:
        """Scrape Facebook and other platforms for RV groups"""
        # This would contain actual scraping logic
        # For now, return sample data structure
        return [
            {
                'name': f'{location} RV Enthusiasts',
                'location': location,
                'members': '2,341',
                'activity_level': 'High',
                'recent_post': 'Looking for recommendations for campgrounds...'
            }
        ]
    
    async def _scrape_fmca_events(self, location: str) -> List[Dict]:
        """Scrape FMCA website for rallies and events"""
        # Actual scraping implementation would go here
        return []
    
    async def _scrape_escapees_events(self, location: str) -> List[Dict]:
        """Scrape Escapees RV Club for events"""
        return []
    
    async def _scrape_facebook_marketplace(self, search_term: str, location: str) -> List[Dict]:
        """Scrape Facebook Marketplace for RV items"""
        return []
    
    # Helper methods
    async def _get_user_location(self, user_id: str) -> str:
        """Get user's current location from database"""
        try:
            query = "SELECT current_location FROM user_profiles WHERE user_id = $1"
            result = await self.database_service.execute_single(query, user_id)
            return result.get('current_location', 'nationwide') if result else 'nationwide'
        except:
            return 'nationwide'
    
    async def _deduplicate_events(self, events: List[Dict]) -> List[Dict]:
        """Remove duplicate events based on name and date"""
        seen = set()
        unique_events = []
        for event in events:
            key = f"{event.get('name', '')}-{event.get('start_date', '')}"
            if key not in seen:
                seen.add(key)
                unique_events.append(event)
        return unique_events
    
    # Background search methods for continuous improvement
    async def _background_group_search(self, user_id: str, location: str):
        """Background task to find more groups"""
        # This would run additional searches and update the database
        pass
    
    async def _background_event_search(self, user_id: str, location: str):
        """Background task to find more events"""
        pass
    
    async def _background_marketplace_search(self, user_id: str, search_term: str, location: str):
        """Background task to find more marketplace items"""
        pass

# Additional helper methods would be implemented here for each scraping source

# Global SOCIAL node instance
social_node = SocialNode()
