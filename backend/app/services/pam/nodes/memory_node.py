"""
Memory Node - Memory storage and retrieval with enhanced functionality
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from app.models.domain.pam import PamMemory, IntentType, MemoryType, PamResponse
from app.services.database import get_database_service
from app.services.cache import cache_service
from app.core.exceptions import PAMError
from app.services.pam.nodes.base_node import BaseNode
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class MemorySearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    intent_type: Optional[IntentType] = None
    limit: int = Field(default=5, ge=1, le=20)

class MemoryNode(BaseNode):
    """Node for handling memory storage and retrieval with enhanced performance"""
    
    def __init__(self):
        super().__init__("memory")
        self.database_service = None
    
    async def initialize(self):
        """Initialize memory node"""
        self.database_service = await get_database_service()
        logger.info("Memory node initialized")
    
    async def process(self, input_data: Dict[str, Any]) -> PamResponse:
        """Process memory-related requests"""
        if not self.database_service:
            await self.initialize()
        
        user_id = input_data.get('user_id')
        message = input_data.get('message', '').lower()
        intent = input_data.get('intent')
        entities = input_data.get('entities', {})
        
        try:
            if 'remember' in message or 'save' in message:
                return await self._handle_memory_storage(user_id, message, entities)
            elif 'recall' in message or 'what did' in message or 'do you remember' in message:
                return await self._handle_memory_recall(user_id, message, entities)
            else:
                return await self._handle_general_memory_query(user_id, message)
                
        except Exception as e:
            logger.error(f"Memory node processing error: {e}")
            return PamResponse(
                content="I'm having trouble accessing memory right now. Please try again.",
                confidence=0.3,
                requires_followup=True
            )
    
    async def _handle_memory_storage(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle storing new memories"""
        content = entities.get('content', message)
        memory_type = entities.get('memory_type', MemoryType.PREFERENCE)
        
        try:
            memory = PamMemory(
                user_id=user_id,
                memory_type=memory_type,
                content=content,
                context={},
                confidence=0.8,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            success = await self.store_memory(memory)
            
            if success:
                return PamResponse(
                    content="Got it! I'll remember that for future conversations.",
                    confidence=0.9,
                    suggestions=[
                        "What else should I remember?",
                        "Show me what you remember about me",
                        "Help me with something else"
                    ],
                    requires_followup=False
                )
            else:
                return PamResponse(
                    content="I had trouble saving that memory. Please try again.",
                    confidence=0.3,
                    requires_followup=True
                )
                
        except Exception as e:
            logger.error(f"Memory storage error: {e}")
            return PamResponse(
                content="I couldn't save that memory right now. Please try again later.",
                confidence=0.3,
                requires_followup=True
            )
    
    async def _handle_memory_recall(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle recalling memories"""
        query = entities.get('query', message)
        
        try:
            memories = await self.search_memories(user_id, query, limit=5)
            
            if not memories:
                return PamResponse(
                    content="I don't have any specific memories about that. What would you like me to remember?",
                    confidence=0.6,
                    suggestions=[
                        "Tell me something to remember",
                        "Show me all my preferences",
                        "Help me with something else"
                    ],
                    requires_followup=True
                )
            
            response_parts = ["Here's what I remember:"]
            
            for i, memory in enumerate(memories[:3], 1):
                response_parts.append(f"{i}. {memory.content}")
            
            if len(memories) > 3:
                response_parts.append(f"...and {len(memories) - 3} more memories")
            
            return PamResponse(
                content="\n".join(response_parts),
                confidence=0.8,
                suggestions=[
                    "Tell me more about this",
                    "Update this memory",
                    "Show me other memories"
                ],
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"Memory recall error: {e}")
            return PamResponse(
                content="I'm having trouble accessing those memories right now.",
                confidence=0.3,
                requires_followup=True
            )
    
    async def _handle_general_memory_query(self, user_id: str, message: str) -> PamResponse:
        """Handle general memory-related questions"""
        return PamResponse(
            content="I can help you remember important information! I can store your preferences, past conversations, and anything else you'd like me to remember for future chats.",
            confidence=0.7,
            suggestions=[
                "Remember my travel preferences",
                "Show me what you remember about me",
                "Remember my budget goals",
                "Save this information"
            ],
            requires_followup=True
        )
    
    async def store_memory(self, memory: PamMemory) -> bool:
        """Store a memory in the database with validation and caching"""
        start_time = datetime.now()
        
        try:
            # Input validation
            if not memory.user_id:
                raise PAMError("Memory must have a user_id")
            if not memory.content or not memory.content.strip():
                raise PAMError("Memory content cannot be empty")
            
            # Store in database
            memory_id = await self.database_service.store_memory(memory)
            
            if memory_id:
                # Invalidate relevant caches
                cache_keys = [
                    f"user_memories:{memory.user_id}",
                    f"memory_search:{memory.user_id}"
                ]
                
                for cache_key in cache_keys:
                    await cache_service.delete_pattern(cache_key)
                
                # Performance logging
                processing_time = (datetime.now() - start_time).total_seconds() * 1000
                logger.info(f"Memory stored for user {memory.user_id} in {processing_time:.2f}ms")
                
                return True
            else:
                raise PAMError("Failed to store memory in database")
            
        except Exception as e:
            logger.error(f"Failed to store memory: {str(e)}")
            raise PAMError(f"Memory storage failed: {str(e)}")
    
    async def search_memories(self, user_id: str, query: str, 
                            intent_type: Optional[IntentType] = None,
                            limit: int = 5) -> List[PamMemory]:
        """Search for relevant memories with enhanced caching"""
        start_time = datetime.now()
        
        try:
            # Input validation
            if not user_id:
                raise PAMError("User ID is required for memory search")
            if not query or not query.strip():
                raise PAMError("Search query cannot be empty")
            if limit < 1 or limit > 20:
                raise PAMError("Limit must be between 1 and 20")
            
            # Try cache first
            cache_key = f"memory_search:{user_id}:{hash(query)}:{intent_type}:{limit}"
            cached_result = await cache_service.get(cache_key)
            
            if cached_result:
                logger.debug(f"Memory search cache hit for user {user_id}")
                return [PamMemory(**mem) for mem in cached_result]
            
            # Search in database
            memories = await self.database_service.get_user_memories(
                user_id=user_id,
                memory_type=None,
                limit=limit
            )
            
            # Simple text search for now
            filtered_memories = []
            query_lower = query.lower()
            for memory in memories:
                if query_lower in memory.content.lower():
                    filtered_memories.append(memory)
            
            # Cache results with shorter TTL for search results
            if filtered_memories:
                memory_dicts = [mem.dict() for mem in filtered_memories]
                await cache_service.set(cache_key, memory_dicts, ttl=300)
            
            # Performance logging
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            logger.info(f"Memory search completed for user {user_id} in {processing_time:.2f}ms, found {len(filtered_memories)} results")
            
            return filtered_memories
            
        except Exception as e:
            logger.error(f"Memory search failed: {str(e)}")
            return []
    
    async def get_user_memories(self, user_id: str, memory_type: Optional[MemoryType] = None,
                              limit: int = 10) -> List[PamMemory]:
        """Get recent memories for a user with enhanced caching"""
        start_time = datetime.now()
        
        try:
            # Input validation
            if not user_id:
                raise PAMError("User ID is required")
            if limit < 1 or limit > 50:
                raise PAMError("Limit must be between 1 and 50")
            
            cache_key = f"user_memories:{user_id}:{memory_type}:{limit}"
            cached_result = await cache_service.get(cache_key)
            
            if cached_result:
                logger.debug(f"User memories cache hit for user {user_id}")
                return [PamMemory(**mem) for mem in cached_result]
            
            memories = await self.database_service.get_user_memories(
                user_id=user_id,
                memory_type=memory_type,
                limit=limit
            )
            
            # Cache results with longer TTL for user memories
            if memories:
                memory_dicts = [mem.dict() for mem in memories]
                await cache_service.set(cache_key, memory_dicts, ttl=600)
            
            # Performance logging
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            logger.info(f"Retrieved {len(memories)} memories for user {user_id} in {processing_time:.2f}ms")
            
            return memories
            
        except Exception as e:
            logger.error(f"Failed to get user memories: {str(e)}")
            return []

# Create singleton instance
memory_node = MemoryNode()
