"""
PAM Agent Memory System
Handles user preferences, conversation history, and contextual memory
Enhanced with vector embeddings for semantic search and context retrieval
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json
import logging
import os
from supabase import create_client
from app.services.embeddings import VectorEmbeddingService
from app.services.vector_memory import VectorMemoryService

logger = logging.getLogger(__name__)


class PAMAgentMemory:
    """
    Enhanced memory system for PAM agents with vector embeddings
    Integrates with Supabase vector storage for semantic search
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        self.short_term_cache = {}  # In-memory cache for current session
        self.cache_ttl = timedelta(minutes=30)
        
        # Initialize vector capabilities if OpenAI key is available
        self.vector_enabled = False
        self.embedding_service = None
        self.vector_memory_service = None
        
        if openai_api_key:
            try:
                # Initialize embedding service
                self.embedding_service = VectorEmbeddingService(openai_api_key)
                
                # Initialize Supabase client for vector operations
                supabase_url = os.getenv('SUPABASE_URL')
                supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
                
                if supabase_url and supabase_key:
                    supabase_client = create_client(supabase_url, supabase_key)
                    self.vector_memory_service = VectorMemoryService(supabase_client, self.embedding_service)
                    self.vector_enabled = True
                    logger.info("Vector-enhanced memory system initialized")
                else:
                    logger.warning("Supabase credentials not available, vector memory disabled")
                    
            except Exception as e:
                logger.error(f"Failed to initialize vector memory: {e}")
                logger.info("Falling back to basic memory system")
        else:
            logger.info("OpenAI API key not provided, using basic memory system")
    
    async def get_relevant_memories(self, user_id: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieve relevant memories for the user based on query
        Uses vector similarity search when available, falls back to basic matching
        """
        try:
            # Check cache first
            cache_key = f"memories_{user_id}_{hash(query) % 1000}"
            
            if cache_key in self.short_term_cache:
                cached_data, timestamp = self.short_term_cache[cache_key]
                if datetime.now() - timestamp < self.cache_ttl:
                    return cached_data
            
            memories = []
            
            if self.vector_enabled and self.vector_memory_service:
                # Use vector-based memory retrieval
                try:
                    context_data = await self.vector_memory_service.get_comprehensive_user_context(
                        user_id=user_id,
                        query_text=query
                    )
                    
                    # Transform vector results into memory format
                    memories = []
                    
                    # Add conversation memories
                    for conv in context_data.get('conversations', []):
                        memories.append({
                            'type': 'conversation_memory',
                            'content': f"Previous conversation: User said '{conv['user_message'][:100]}...', PAM responded with relevant advice",
                            'relevance_score': conv.get('similarity_score', 0.8),
                            'created_at': conv.get('created_at', datetime.utcnow().isoformat()),
                            'source': 'vector_search'
                        })
                    
                    # Add preference memories  
                    for pref in context_data.get('preferences', []):
                        memories.append({
                            'type': 'preference_memory',
                            'content': f"User preference: {pref['preference_key']} - {pref['preference_value']}",
                            'relevance_score': pref.get('similarity_score', 0.7),
                            'created_at': datetime.utcnow().isoformat(),
                            'source': 'vector_search'
                        })
                    
                    # Add contextual memories
                    for memory in context_data.get('memories', []):
                        memories.append({
                            'type': memory.get('memory_type', 'contextual_memory'),
                            'content': memory.get('memory_content', ''),
                            'summary': memory.get('memory_summary', ''),
                            'relevance_score': memory.get('similarity_score', 0.6),
                            'importance_score': memory.get('importance_score', 1.0),
                            'created_at': memory.get('created_at', datetime.utcnow().isoformat()),
                            'source': 'vector_search'
                        })
                    
                    # Sort by relevance score and limit
                    memories.sort(key=lambda x: x.get('relevance_score', 0), reverse=True)
                    memories = memories[:limit]
                    
                    logger.info(f"Retrieved {len(memories)} vector-based memories for user {user_id}")
                    
                except Exception as e:
                    logger.warning(f"Vector memory retrieval failed, falling back to basic: {e}")
                    memories = await self._fetch_memories_from_storage(user_id, query, limit)
            else:
                # Fall back to basic memory retrieval
                memories = await self._fetch_memories_from_storage(user_id, query, limit)
            
            # Cache the result
            self.short_term_cache[cache_key] = (memories, datetime.now())
            
            return memories
            
        except Exception as e:
            logger.warning(f"Failed to retrieve memories for user {user_id}: {e}")
            return []
    
    async def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user preferences from storage"""
        try:
            cache_key = f"preferences_{user_id}"
            
            if cache_key in self.short_term_cache:
                cached_data, timestamp = self.short_term_cache[cache_key]
                if datetime.now() - timestamp < self.cache_ttl:
                    return cached_data
            
            # Simulate preference retrieval
            preferences = await self._fetch_user_preferences(user_id)
            
            # Cache preferences
            self.short_term_cache[cache_key] = (preferences, datetime.now())
            
            return preferences
            
        except Exception as e:
            logger.warning(f"Failed to retrieve preferences for user {user_id}: {e}")
            return {}
    
    async def store_interaction(
        self, 
        user_id: str, 
        user_message: str, 
        agent_response: str,
        context: Dict[str, Any] = None
    ):
        """Store user interaction for future reference with vector embeddings"""
        try:
            intent = await self._classify_intent(user_message)
            
            interaction_data = {
                'user_id': user_id,
                'user_message': user_message,
                'agent_response': agent_response,
                'context': context or {},
                'timestamp': datetime.now().isoformat(),
                'intent': intent
            }
            
            # Store in vector database if available
            if self.vector_enabled and self.vector_memory_service:
                try:
                    # Store conversation with vector embeddings
                    storage_result = await self.vector_memory_service.store_conversation_memory(
                        user_id=user_id,
                        user_message=user_message,
                        agent_response=agent_response,
                        context=context,
                        intent=intent,
                        confidence_score=0.9
                    )
                    
                    if storage_result.get('success'):
                        logger.info(f"Stored vector interaction {storage_result['memory_id']} for user {user_id}")
                    else:
                        logger.warning(f"Vector storage failed: {storage_result.get('error', 'Unknown error')}")
                        
                    # Also extract and store any new preferences learned
                    await self._extract_and_store_preferences(user_id, user_message, context)
                    
                    # Store contextual memories if relevant
                    await self._extract_and_store_context(user_id, user_message, agent_response, context, intent)
                    
                except Exception as vector_e:
                    logger.warning(f"Vector storage failed, continuing with basic storage: {vector_e}")
            else:
                logger.info(f"Storing basic interaction for user {user_id}: {user_message[:50]}...")
            
            # Update short-term memory (always do this)
            await self._update_short_term_memory(user_id, interaction_data)
            
        except Exception as e:
            logger.error(f"Failed to store interaction: {e}")
    
    async def learn_preference(self, user_id: str, preference_key: str, preference_value: Any):
        """Learn and store a user preference"""
        try:
            # Update preferences in storage (would be Supabase)
            logger.info(f"Learning preference for {user_id}: {preference_key} = {preference_value}")
            
            # Update cache
            cache_key = f"preferences_{user_id}"
            if cache_key in self.short_term_cache:
                preferences, _ = self.short_term_cache[cache_key]
                preferences[preference_key] = preference_value
                self.short_term_cache[cache_key] = (preferences, datetime.now())
            
        except Exception as e:
            logger.error(f"Failed to learn preference: {e}")
    
    async def _fetch_memories_from_storage(self, user_id: str, query: str, limit: int) -> List[Dict[str, Any]]:
        """Fetch memories from storage (placeholder implementation)"""
        # This would integrate with Supabase vector search
        # For now, return relevant placeholder memories
        
        sample_memories = [
            {
                'type': 'trip_memory',
                'content': 'User frequently travels to Queensland coastal areas',
                'relevance_score': 0.9,
                'created_at': '2025-08-15T10:30:00Z'
            },
            {
                'type': 'expense_pattern',
                'content': 'User typically budgets $150/day for fuel and accommodation',
                'relevance_score': 0.8,
                'created_at': '2025-08-20T14:15:00Z'
            },
            {
                'type': 'preference',
                'content': 'User prefers caravan parks with powered sites and wifi',
                'relevance_score': 0.85,
                'created_at': '2025-08-25T09:45:00Z'
            }
        ]
        
        # Filter based on query relevance (simple keyword matching for now)
        query_lower = query.lower()
        relevant_memories = []
        
        for memory in sample_memories:
            content_lower = memory['content'].lower()
            
            # Simple relevance scoring
            if any(word in content_lower for word in query_lower.split()):
                relevant_memories.append(memory)
        
        return relevant_memories[:limit] if relevant_memories else sample_memories[:limit]
    
    async def _fetch_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Fetch user preferences from storage"""
        # This would integrate with Supabase user_preferences table
        # For now, return sample preferences
        
        return {
            'vehicle_type': 'caravan',
            'accommodation_preference': 'caravan_parks',
            'budget_category': 'moderate',
            'travel_style': 'leisurely',
            'dietary_requirements': None,
            'accessibility_needs': False,
            'preferred_regions': ['queensland', 'new_south_wales'],
            'notification_frequency': 'daily',
            'privacy_level': 'standard'
        }
    
    async def _classify_intent(self, message: str) -> str:
        """Simple intent classification for messages"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['spend', 'cost', 'expense', 'paid', 'bought']):
            return 'expense'
        elif any(word in message_lower for word in ['trip', 'travel', 'route', 'plan', 'destination']):
            return 'travel'
        elif any(word in message_lower for word in ['budget', 'money', 'afford', 'save', 'financial']):
            return 'budget'
        elif any(word in message_lower for word in ['campground', 'accommodation', 'stay', 'park']):
            return 'accommodation'
        elif any(word in message_lower for word in ['weather', 'conditions', 'forecast']):
            return 'weather'
        else:
            return 'general'
    
    async def _update_short_term_memory(self, user_id: str, interaction_data: Dict[str, Any]):
        """Update short-term memory with new interaction"""
        cache_key = f"recent_interactions_{user_id}"
        
        if cache_key not in self.short_term_cache:
            self.short_term_cache[cache_key] = ([], datetime.now())
        
        interactions, _ = self.short_term_cache[cache_key]
        interactions.append(interaction_data)
        
        # Keep only last 10 interactions in short-term memory
        if len(interactions) > 10:
            interactions = interactions[-10:]
        
        self.short_term_cache[cache_key] = (interactions, datetime.now())
    
    def clear_cache(self):
        """Clear the memory cache"""
        self.short_term_cache.clear()
    
    async def get_session_summary(self, user_id: str) -> Dict[str, Any]:
        """Get summary of current session"""
        cache_key = f"recent_interactions_{user_id}"
        
        if cache_key not in self.short_term_cache:
            return {'interaction_count': 0, 'primary_intents': []}
        
        interactions, _ = self.short_term_cache[cache_key]
        
        # Analyze session
        intents = [interaction['intent'] for interaction in interactions]
        intent_counts = {}
        for intent in intents:
            intent_counts[intent] = intent_counts.get(intent, 0) + 1
        
        return {
            'interaction_count': len(interactions),
            'primary_intents': sorted(intent_counts.items(), key=lambda x: x[1], reverse=True),
            'session_start': interactions[0]['timestamp'] if interactions else None,
            'last_activity': interactions[-1]['timestamp'] if interactions else None
        }
    
    async def _extract_and_store_preferences(
        self, 
        user_id: str, 
        user_message: str, 
        context: Optional[Dict[str, Any]] = None
    ):
        """Extract and store user preferences from conversation"""
        try:
            if not self.vector_memory_service:
                return
            
            message_lower = user_message.lower()
            preferences_to_store = []
            
            # Extract vehicle type preferences
            if any(word in message_lower for word in ['caravan', 'rv', 'motorhome', 'camper']):
                vehicle_type = None
                if 'caravan' in message_lower:
                    vehicle_type = 'caravan'
                elif any(word in message_lower for word in ['rv', 'motorhome']):
                    vehicle_type = 'motorhome'
                elif 'camper' in message_lower:
                    vehicle_type = 'camper'
                
                if vehicle_type:
                    preferences_to_store.append(('vehicle_type', vehicle_type))
            
            # Extract accommodation preferences
            if any(word in message_lower for word in ['powered site', 'unpowered', 'cabin', 'ensuite']):
                if 'powered' in message_lower:
                    preferences_to_store.append(('accommodation_preference', 'powered_sites'))
                elif 'cabin' in message_lower:
                    preferences_to_store.append(('accommodation_preference', 'cabins'))
            
            # Extract budget preferences
            budget_indicators = ['budget', 'spend', 'afford', '$']
            if any(indicator in message_lower for indicator in budget_indicators):
                if any(word in message_lower for word in ['tight', 'cheap', 'low', 'save']):
                    preferences_to_store.append(('budget_category', 'budget_conscious'))
                elif any(word in message_lower for word in ['luxury', 'premium', 'high-end']):
                    preferences_to_store.append(('budget_category', 'luxury'))
            
            # Store extracted preferences
            for pref_key, pref_value in preferences_to_store:
                await self.vector_memory_service.store_user_preference_memory(
                    user_id=user_id,
                    preference_key=pref_key,
                    preference_value=pref_value,
                    user_context=context,
                    confidence=0.7,
                    source="inferred"
                )
                
            if preferences_to_store:
                logger.info(f"Extracted and stored {len(preferences_to_store)} preferences for user {user_id}")
                
        except Exception as e:
            logger.warning(f"Failed to extract preferences: {e}")
    
    async def _extract_and_store_context(
        self, 
        user_id: str, 
        user_message: str, 
        agent_response: str,
        context: Optional[Dict[str, Any]] = None,
        intent: str = "general"
    ):
        """Extract and store contextual memories from conversation"""
        try:
            if not self.vector_memory_service:
                return
            
            message_lower = user_message.lower()
            memories_to_store = []
            
            # Store location-based memories
            if context and context.get('user_location'):
                location_data = context['user_location']
                if intent == 'travel' or any(word in message_lower for word in ['going to', 'visiting', 'travel']):
                    memory_content = f"User discussed travel plans involving location: {location_data.get('latitude', 'unknown')}, {location_data.get('longitude', 'unknown')}"
                    memories_to_store.append(('travel_location', memory_content, location_data))
            
            # Store expense-related memories
            if intent == 'expense' or any(word in message_lower for word in ['spent', 'cost', 'paid']):
                memory_content = f"User discussed expenses: {user_message}"
                memories_to_store.append(('expense_pattern', memory_content, {}))
            
            # Store travel experiences
            if any(word in message_lower for word in ['visited', 'stayed at', 'loved', 'enjoyed', 'hated', 'avoided']):
                sentiment = 'positive' if any(pos in message_lower for pos in ['loved', 'enjoyed', 'great', 'amazing']) else 'negative'
                memory_content = f"User shared {sentiment} travel experience: {user_message}"
                memories_to_store.append(('travel_experience', memory_content, {'sentiment': sentiment}))
            
            # Store memories with appropriate importance scores
            for memory_type, memory_content, additional_context in memories_to_store:
                importance_score = 1.0 if intent in ['travel', 'expense'] else 0.8
                
                await self.vector_memory_service.store_contextual_memory(
                    user_id=user_id,
                    memory_type=memory_type,
                    memory_content=memory_content,
                    location_data=context.get('user_location') if context else None,
                    temporal_data={'timestamp': datetime.utcnow().isoformat()},
                    importance_score=importance_score,
                    source="conversation"
                )
                
            if memories_to_store:
                logger.info(f"Extracted and stored {len(memories_to_store)} contextual memories for user {user_id}")
                
        except Exception as e:
            logger.warning(f"Failed to extract contextual memories: {e}")
    
    def get_vector_status(self) -> Dict[str, Any]:
        """Get status of vector memory capabilities"""
        return {
            "vector_enabled": self.vector_enabled,
            "embedding_service_available": self.embedding_service is not None,
            "vector_memory_service_available": self.vector_memory_service is not None,
            "embedding_model": self.embedding_service.embedding_model if self.embedding_service else None,
            "cache_stats": self.embedding_service.get_cache_stats() if self.embedding_service else {}
        }