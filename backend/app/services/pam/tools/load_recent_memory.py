"""
Load Recent Memory Tool - Retrieves conversation history and context
"""
from typing import Dict, Any, List
from datetime import datetime, timedelta
from pydantic import ValidationError as PydanticValidationError
from .base_tool import BaseTool
from app.services.database import get_database_service
from app.core.database import get_user_context_supabase_client
from app.services.cache import cache_service
from .validation_models import RecentMemoryParams
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import validate_uuid

class LoadRecentMemoryTool(BaseTool):
    """Tool to load recent conversation memory and context"""

    def __init__(self, user_jwt: str = None):
        super().__init__("load_recent_memory", user_jwt=user_jwt)
        self.database_service = None
        self.user_jwt = user_jwt
    
    def initialize_sync(self):
        """Initialize with database service"""
        if not self.database_service:
            self.database_service = get_database_service()
        self.logger.info(f"{self.tool_name} tool initialized")
    
    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Load recent conversation memory"""
        try:
            if not self.database_service:
                self.initialize_sync()

            try:
                validated = RecentMemoryParams(**(parameters or {}))
            except ValidationError as ve:
                self.logger.error(f"Input validation failed: {ve.errors()}")
                return self._create_error_response("Invalid parameters")

            limit = validated.limit
            days_back = validated.days_back
            
            self.logger.info(f"Loading recent memory for user {user_id} (last {days_back} days, limit {limit})")
            
            # Get recent conversations
            recent_conversations = await self._get_recent_conversations(user_id, limit, days_back)
            
            # Get conversation patterns
            conversation_patterns = await self._analyze_conversation_patterns(user_id, recent_conversations)
            
            # Get user's mentioned interests and topics
            topics_discussed = await self._extract_topics_discussed(recent_conversations)
            
            # Get relationship context
            relationship_context = await self._build_relationship_context(recent_conversations)
            
            # Get pending items or follow-ups
            pending_items = await self._identify_pending_items(recent_conversations)
            
            memory_data = {
                "conversations": recent_conversations,
                "conversation_patterns": conversation_patterns,
                "topics_discussed": topics_discussed,
                "relationship_context": relationship_context,
                "pending_items": pending_items,
                "memory_summary": await self._create_memory_summary(recent_conversations),
                "last_interaction": await self._get_last_interaction_details(user_id)
            }
            
            self.logger.info(f"Successfully loaded memory for user {user_id}: {len(recent_conversations)} conversations")
            return self._create_success_response(memory_data)
            
        except Exception as e:
            self.logger.error(f"Error loading recent memory: {e}")
            return self._create_error_response(f"Could not load recent memory: {str(e)}")
    
    async def _get_recent_conversations(self, user_id: str, limit: int, days_back: int) -> List[Dict[str, Any]]:
        """Get recent conversations from database"""
        try:
            # Try cache first
            cache_key = f"recent_conversations:{user_id}:{days_back}:{limit}"
            cached_conversations = await cache_service.get(cache_key)
            
            if cached_conversations:
                return cached_conversations
            
            # Get from database
            conversations = await self.database_service.get_conversation_context(user_id, limit)
            
            # Filter by date
            cutoff_date = datetime.now() - timedelta(days=days_back)
            filtered_conversations = [
                conv for conv in conversations 
                if conv.get('timestamp') and datetime.fromisoformat(conv['timestamp'].replace('Z', '+00:00')) > cutoff_date
            ]
            
            # Cache the result
            await cache_service.set(cache_key, filtered_conversations, ttl=300)
            
            return filtered_conversations
            
        except Exception as e:
            self.logger.warning(f"Could not get recent conversations: {e}")
            return []
    
    async def _analyze_conversation_patterns(self, user_id: str, conversations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze patterns in user's conversations"""
        if not conversations:
            return {"patterns": [], "insights": []}
        
        patterns = {
            "common_intents": {},
            "preferred_times": [],
            "conversation_length": "medium",
            "response_style": "detailed",
            "frequent_topics": []
        }
        
        # Analyze intents
        intent_counts = {}
        for conv in conversations:
            intent = conv.get('detected_intent', 'general_chat')
            intent_counts[intent] = intent_counts.get(intent, 0) + 1
        
        patterns["common_intents"] = dict(sorted(intent_counts.items(), key=lambda x: x[1], reverse=True)[:3])
        
        # Analyze timing (simplified)
        times = []
        for conv in conversations:
            if conv.get('timestamp'):
                try:
                    dt = datetime.fromisoformat(conv['timestamp'].replace('Z', '+00:00'))
                    times.append(dt.hour)
                except:
                    continue
        
        if times:
            avg_hour = sum(times) / len(times)
            if avg_hour < 10:
                patterns["preferred_times"] = ["morning"]
            elif avg_hour < 17:
                patterns["preferred_times"] = ["afternoon"]  
            else:
                patterns["preferred_times"] = ["evening"]
        
        return patterns
    
    async def _extract_topics_discussed(self, conversations: List[Dict[str, Any]]) -> List[str]:
        """Extract topics and interests from conversations"""
        topics = set()
        
        for conv in conversations:
            user_message = conv.get('user_message', '').lower()
            pam_response = conv.get('pam_response', '').lower()
            
            # Simple keyword extraction (could be enhanced with NLP)
            travel_keywords = ['trip', 'travel', 'camping', 'caravan', 'route', 'destination', 'fuel', 'budget']
            location_keywords = ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'hobart', 'darwin', 'queensland', 'nsw', 'victoria']
            activity_keywords = ['fishing', 'hiking', 'sightseeing', 'beach', 'museum', 'restaurant', 'shopping']
            
            for keyword in travel_keywords + location_keywords + activity_keywords:
                if keyword in user_message or keyword in pam_response:
                    topics.add(keyword)
        
        return list(topics)[:10]  # Limit to top 10 topics
    
    async def _build_relationship_context(self, conversations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build context about the relationship with the user"""
        if not conversations:
            return {"relationship_stage": "new", "interaction_count": 0}
        
        return {
            "relationship_stage": "established" if len(conversations) > 5 else "developing",
            "interaction_count": len(conversations),
            "last_personal_details_shared": None,  # Could extract from conversations
            "ongoing_plans": [],  # Could extract from conversations
            "user_sentiment": "neutral"  # Could analyze sentiment
        }
    
    async def _identify_pending_items(self, conversations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify items that need follow-up"""
        pending = []
        
        for conv in conversations:
            user_message = conv.get('user_message', '').lower()
            pam_response = conv.get('pam_response', '').lower()
            
            # Look for incomplete tasks or promises
            if 'plan' in user_message and 'when' not in user_message:
                pending.append({
                    "type": "trip_planning",
                    "description": "Trip planning discussion needs dates/details",
                    "priority": "medium"
                })
            
            if 'budget' in user_message and 'track' in pam_response:
                pending.append({
                    "type": "budget_setup", 
                    "description": "Budget tracking setup mentioned",
                    "priority": "low"
                })
        
        return pending[:5]  # Limit to 5 pending items
    
    async def _create_memory_summary(self, conversations: List[Dict[str, Any]]) -> str:
        """Create a summary of recent memory"""
        if not conversations:
            return "No recent conversations to summarize."
        
        recent_count = len(conversations)
        recent_topics = await self._extract_topics_discussed(conversations)
        
        summary = f"Recent activity: {recent_count} conversations"
        if recent_topics:
            summary += f", discussed: {', '.join(recent_topics[:3])}"
        
        return summary
    
    async def _get_last_interaction_details(self, user_id: str) -> Dict[str, Any]:
        """Get details about the last interaction"""
        try:
            # Get most recent conversation
            recent = await self.database_service.get_conversation_context(user_id, 1)
            
            if recent:
                last_conv = recent[0]
                return {
                    "last_message": last_conv.get('user_message', ''),
                    "last_response": last_conv.get('pam_response', ''),
                    "timestamp": last_conv.get('timestamp'),
                    "intent": last_conv.get('detected_intent', 'general_chat')
                }
            
            return {"no_previous_interaction": True}
            
        except Exception as e:
            self.logger.warning(f"Could not get last interaction: {e}")
            return {"error": "Could not retrieve last interaction"}