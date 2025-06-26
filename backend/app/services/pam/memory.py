
"""
PAM Memory Service - Conversation history and context management
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import json

from app.services.database import DatabaseService
from app.services.cache import CacheService
from app.models.domain.pam import PamMemory, PamContext, MemoryType
from app.core.exceptions import PAMError, DatabaseError

logger = logging.getLogger("pam.memory")

class MemoryService:
    """Manages PAM conversation memory, context, and learning patterns"""
    
    def __init__(self):
        self.db_service = DatabaseService()
        self.cache_service = CacheService()
        self.max_context_length = 4000  # Max characters for context summary
        self.conversation_window = timedelta(hours=24)  # Active conversation window
    
    async def store_conversation_turn(self, user_id: str, session_id: str, 
                                    user_message: str, pam_response: str,
                                    intent: str = None, confidence: float = None,
                                    entities: Dict[str, Any] = None) -> str:
        """Store a conversation turn in memory"""
        try:
            # Store in conversation memory table
            memory_data = {
                'user_id': user_id,
                'session_id': session_id,
                'user_message': user_message,
                'pam_response': pam_response,
                'detected_intent': intent,
                'intent_confidence': confidence,
                'entities_extracted': entities or {},
                'message_timestamp': datetime.utcnow(),
                'context_used': await self._get_current_context(user_id)
            }
            
            memory_id = await self.db_service.insert_data(
                'pam_conversation_memory', 
                memory_data
            )
            
            # Update session activity
            await self._update_session_activity(session_id, user_id)
            
            # Extract and store learning patterns
            await self._extract_learning_patterns(user_id, user_message, pam_response, intent)
            
            # Cache recent conversation for quick access
            await self._cache_recent_conversation(user_id, user_message, pam_response)
            
            logger.info(f"Stored conversation turn for user {user_id}")
            return memory_id
            
        except Exception as e:
            logger.error(f"Failed to store conversation turn: {str(e)}")
            raise PAMError(f"Memory storage failed: {str(e)}")
    
    async def get_conversation_history(self, user_id: str, session_id: str = None,
                                     limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieve conversation history for a user/session"""
        try:
            # Try cache first for recent messages
            cache_key = f"conversation_history:{user_id}:{session_id or 'all'}"
            cached_history = await self.cache_service.get(cache_key)
            
            if cached_history and len(cached_history) >= min(limit, 5):
                return cached_history[:limit]
            
            # Build query conditions
            conditions = {'user_id': user_id}
            if session_id:
                conditions['session_id'] = session_id
            
            # Get from database
            history = await self.db_service.fetch_data(
                'pam_conversation_memory',
                conditions=conditions,
                order_by='message_timestamp DESC',
                limit=limit
            )
            
            # Cache the results
            await self.cache_service.set(cache_key, history, ttl=300)  # 5 minutes
            
            return history
            
        except Exception as e:
            logger.error(f"Failed to get conversation history: {str(e)}")
            return []
    
    async def get_user_context(self, user_id: str) -> PamContext:
        """Get comprehensive user context"""
        try:
            # Try cache first
            cache_key = f"user_context:{user_id}"
            cached_context = await self.cache_service.get(cache_key)
            
            if cached_context:
                return PamContext(**cached_context)
            
            # Build context from multiple sources
            context_data = {
                'user_id': user_id,
                'timestamp': datetime.utcnow()
            }
            
            # Get recent expenses
            recent_expenses = await self.db_service.fetch_data(
                'expenses',
                conditions={'user_id': user_id},
                order_by='date DESC',
                limit=10
            )
            context_data['recent_expenses'] = recent_expenses
            
            # Get budget status
            budget_data = await self.db_service.fetch_data(
                'budget_categories',
                conditions={'user_id': user_id}
            )
            context_data['budget_status'] = self._summarize_budget_status(budget_data)
            
            # Get travel plans
            travel_plans = await self.db_service.fetch_data(
                'calendar_events',
                conditions={'user_id': user_id, 'type': 'travel'},
                order_by='date ASC',
                limit=5
            )
            context_data['travel_plans'] = travel_plans
            
            # Get user preferences from conversation history
            preferences = await self._extract_user_preferences(user_id)
            context_data['preferences'] = preferences
            
            # Get conversation history for context
            recent_conversations = await self.get_conversation_history(user_id, limit=5)
            context_data['conversation_history'] = [
                f"{msg['user_message'][:100]}..." for msg in recent_conversations
            ]
            
            context = PamContext(**context_data)
            
            # Cache the context
            await self.cache_service.set(
                cache_key, 
                context.dict(), 
                ttl=600  # 10 minutes
            )
            
            return context
            
        except Exception as e:
            logger.error(f"Failed to get user context: {str(e)}")
            # Return minimal context
            return PamContext(
                user_id=user_id,
                timestamp=datetime.utcnow()
            )
    
    async def update_user_preferences(self, user_id: str, 
                                    preferences: Dict[str, Any]) -> None:
        """Update user preferences based on conversation patterns"""
        try:
            # Get existing preferences
            existing = await self.db_service.fetch_data(
                'pam_conversation_memory',
                conditions={'user_id': user_id},
                order_by='created_at DESC',
                limit=1
            )
            
            current_prefs = {}
            if existing:
                current_prefs = existing[0].get('user_preferences_learned', {})
            
            # Merge new preferences
            updated_prefs = {**current_prefs, **preferences}
            
            # Store learning event
            await self.db_service.insert_data(
                'pam_learning_events',
                {
                    'user_id': user_id,
                    'event_type': 'preference_update',
                    'user_preference_change': updated_prefs,
                    'context_data': {'previous_preferences': current_prefs}
                }
            )
            
            # Invalidate context cache
            await self.cache_service.delete(f"user_context:{user_id}")
            
            logger.info(f"Updated preferences for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to update user preferences: {str(e)}")
            raise PAMError(f"Preference update failed: {str(e)}")
    
    async def summarize_long_conversation(self, user_id: str, 
                                        session_id: str) -> str:
        """Summarize long conversations to maintain context"""
        try:
            # Get full conversation history
            full_history = await self.get_conversation_history(
                user_id, session_id, limit=100
            )
            
            if len(full_history) < 10:  # Not long enough to summarize
                return ""
            
            # Extract key themes and topics
            themes = await self._extract_conversation_themes(full_history)
            
            # Create summary
            summary_parts = []
            
            # User interests and topics discussed
            if themes.get('topics'):
                summary_parts.append(f"Topics discussed: {', '.join(themes['topics'])}")
            
            # Key decisions or actions
            if themes.get('actions'):
                summary_parts.append(f"Actions planned: {', '.join(themes['actions'])}")
            
            # User preferences revealed
            if themes.get('preferences'):
                prefs_text = ", ".join([f"{k}: {v}" for k, v in themes['preferences'].items()])
                summary_parts.append(f"User preferences: {prefs_text}")
            
            # Recent focus area
            if themes.get('recent_focus'):
                summary_parts.append(f"Recent focus: {themes['recent_focus']}")
            
            summary = " | ".join(summary_parts)
            
            # Store summary
            await self.db_service.insert_data(
                'pam_conversation_memory',
                {
                    'user_id': user_id,
                    'session_id': session_id,
                    'user_message': '[CONVERSATION_SUMMARY]',
                    'pam_response': summary,
                    'detected_intent': 'conversation_summary',
                    'message_timestamp': datetime.utcnow()
                }
            )
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to summarize conversation: {str(e)}")
            return ""
    
    async def get_relevant_memories(self, user_id: str, query: str, 
                                  limit: int = 5) -> List[Dict[str, Any]]:
        """Get memories relevant to current query"""
        try:
            # Simple keyword matching for now
            # In production, this would use vector similarity
            keywords = query.lower().split()
            
            # Search in conversation history
            all_memories = await self.get_conversation_history(user_id, limit=100)
            
            relevant_memories = []
            for memory in all_memories:
                relevance_score = 0
                content = f"{memory.get('user_message', '')} {memory.get('pam_response', '')}".lower()
                
                for keyword in keywords:
                    if keyword in content:
                        relevance_score += content.count(keyword)
                
                if relevance_score > 0:
                    memory['relevance_score'] = relevance_score
                    relevant_memories.append(memory)
            
            # Sort by relevance and recency
            relevant_memories.sort(
                key=lambda x: (x['relevance_score'], x.get('message_timestamp', datetime.min)),
                reverse=True
            )
            
            return relevant_memories[:limit]
            
        except Exception as e:
            logger.error(f"Failed to get relevant memories: {str(e)}")
            return []
    
    async def cleanup_old_memories(self, days_old: int = 30) -> int:
        """Clean up old conversation memories"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            # Delete old conversation memories
            deleted_count = await self.db_service.execute_query(
                """
                DELETE FROM pam_conversation_memory 
                WHERE message_timestamp < %s 
                AND detected_intent != 'conversation_summary'
                """,
                (cutoff_date,)
            )
            
            logger.info(f"Cleaned up {deleted_count} old memories")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup old memories: {str(e)}")
            return 0
    
    # Private helper methods
    
    async def _get_current_context(self, user_id: str) -> Dict[str, Any]:
        """Get current context summary for storage"""
        try:
            context = await self.get_user_context(user_id)
            return {
                'budget_summary': context.budget_status,
                'recent_activity': len(context.recent_expenses),
                'travel_plans_count': len(context.travel_plans.get('upcoming', [])) if context.travel_plans else 0
            }
        except Exception:
            return {}
    
    async def _update_session_activity(self, session_id: str, user_id: str) -> None:
        """Update session activity timestamp"""
        try:
            # Update or create session record
            await self.db_service.upsert_data(
                'pam_conversation_sessions',
                {'id': session_id},
                {
                    'user_id': user_id,
                    'session_start': datetime.utcnow(),
                    'updated_at': datetime.utcnow(),
                    'is_active': True
                }
            )
        except Exception as e:
            logger.warning(f"Failed to update session activity: {str(e)}")
    
    async def _extract_learning_patterns(self, user_id: str, user_message: str,
                                       pam_response: str, intent: str) -> None:
        """Extract learning patterns from conversation"""
        try:
            # Simple pattern extraction
            patterns = {}
            
            # Detect user interests
            interest_keywords = ['like', 'love', 'prefer', 'enjoy', 'interested in']
            if any(keyword in user_message.lower() for keyword in interest_keywords):
                patterns['interest_expressed'] = user_message
            
            # Detect complaints or issues
            complaint_keywords = ['problem', 'issue', 'difficult', 'hard', 'frustrated']
            if any(keyword in user_message.lower() for keyword in complaint_keywords):
                patterns['issue_mentioned'] = user_message
            
            # Store patterns if found
            if patterns:
                await self.db_service.insert_data(
                    'pam_learning_events',
                    {
                        'user_id': user_id,
                        'event_type': 'pattern_detected',
                        'context_data': patterns,
                        'related_intent': intent
                    }
                )
                
        except Exception as e:
            logger.warning(f"Failed to extract learning patterns: {str(e)}")
    
    async def _cache_recent_conversation(self, user_id: str, 
                                       user_message: str, pam_response: str) -> None:
        """Cache recent conversation for quick access"""
        try:
            cache_key = f"recent_conversation:{user_id}"
            
            # Get existing cached conversation
            recent = await self.cache_service.get(cache_key) or []
            
            # Add new turn
            recent.insert(0, {
                'user_message': user_message,
                'pam_response': pam_response,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # Keep only last 10 turns
            recent = recent[:10]
            
            # Cache for 1 hour
            await self.cache_service.set(cache_key, recent, ttl=3600)
            
        except Exception as e:
            logger.warning(f"Failed to cache recent conversation: {str(e)}")
    
    def _summarize_budget_status(self, budget_data: List[Dict]) -> Dict[str, Any]:
        """Summarize budget status from budget categories"""
        if not budget_data:
            return {}
        
        total_budgeted = sum(item.get('budgeted_amount', 0) for item in budget_data)
        total_spent = sum(item.get('spent_amount', 0) for item in budget_data)
        
        return {
            'total_budgeted': total_budgeted,
            'total_spent': total_spent,
            'remaining': total_budgeted - total_spent,
            'categories_count': len(budget_data),
            'over_budget_categories': [
                item['name'] for item in budget_data 
                if item.get('spent_amount', 0) > item.get('budgeted_amount', 0)
            ]
        }
    
    async def _extract_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Extract user preferences from conversation history"""
        try:
            # Get learning events
            learning_events = await self.db_service.fetch_data(
                'pam_learning_events',
                conditions={'user_id': user_id, 'event_type': 'preference_update'},
                order_by='created_at DESC',
                limit=10
            )
            
            preferences = {}
            for event in learning_events:
                if event.get('user_preference_change'):
                    preferences.update(event['user_preference_change'])
            
            return preferences
            
        except Exception as e:
            logger.warning(f"Failed to extract user preferences: {str(e)}")
            return {}
    
    async def _extract_conversation_themes(self, conversation_history: List[Dict]) -> Dict[str, Any]:
        """Extract themes and patterns from conversation history"""
        themes = {
            'topics': set(),
            'actions': set(), 
            'preferences': {},
            'recent_focus': None
        }
        
        # Simple keyword-based theme extraction
        topic_keywords = {
            'budget': ['budget', 'money', 'expense', 'spending'],
            'travel': ['travel', 'route', 'destination', 'camp'],
            'maintenance': ['maintenance', 'repair', 'service'],
            'social': ['group', 'meet', 'friend', 'community']
        }
        
        action_keywords = ['plan', 'book', 'reserve', 'schedule', 'remind']
        
        for msg in conversation_history[:20]:  # Focus on recent messages
            content = f"{msg.get('user_message', '')} {msg.get('pam_response', '')}".lower()
            
            # Extract topics
            for topic, keywords in topic_keywords.items():
                if any(keyword in content for keyword in keywords):
                    themes['topics'].add(topic)
            
            # Extract actions
            for keyword in action_keywords:
                if keyword in content:
                    themes['actions'].add(f"{keyword} mentioned")
        
        # Convert sets to lists for JSON serialization
        themes['topics'] = list(themes['topics'])
        themes['actions'] = list(themes['actions'])
        
        # Determine recent focus
        if themes['topics']:
            themes['recent_focus'] = themes['topics'][0]
        
        return themes

# Create singleton instance
memory_service = MemoryService()
