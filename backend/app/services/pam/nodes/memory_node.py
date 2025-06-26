
"""
Memory Node - Memory storage and retrieval
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from app.models.domain.pam import PamMemory, IntentType, MemoryType
from app.services.database import DatabaseService
from app.services.cache import CacheService
from app.core.exceptions import DatabaseError

logger = logging.getLogger("pam.memory_node")

class MemoryNode:
    """Node for handling memory storage and retrieval"""
    
    def __init__(self):
        self.db_service = DatabaseService()
        self.cache_service = CacheService()
    
    async def store_memory(self, memory: PamMemory) -> bool:
        """Store a memory in the database"""
        try:
            await self.db_service.store_memory(memory)
            
            # Invalidate relevant caches
            cache_key = f"user_memories:{memory.user_id}"
            await self.cache_service.delete(cache_key)
            
            logger.debug(f"Memory stored for user {memory.user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store memory: {str(e)}")
            raise DatabaseError(f"Memory storage failed: {str(e)}")
    
    async def search_memories(self, user_id: str, query: str, 
                            intent_type: Optional[IntentType] = None,
                            limit: int = 5) -> List[PamMemory]:
        """Search for relevant memories"""
        try:
            # Try cache first
            cache_key = f"memory_search:{user_id}:{hash(query)}:{intent_type}:{limit}"
            cached_result = await self.cache_service.get(cache_key)
            
            if cached_result:
                return [PamMemory(**mem) for mem in cached_result]
            
            # Search in database
            memories = await self.db_service.search_memories(
                user_id=user_id,
                query=query,
                intent_type=intent_type,
                limit=limit
            )
            
            # Cache results
            memory_dicts = [mem.model_dump() for mem in memories]
            await self.cache_service.set(cache_key, memory_dicts, ttl=300)
            
            return memories
            
        except Exception as e:
            logger.error(f"Memory search failed: {str(e)}")
            return []
    
    async def get_user_memories(self, user_id: str, memory_type: Optional[MemoryType] = None,
                              limit: int = 10) -> List[PamMemory]:
        """Get recent memories for a user"""
        try:
            cache_key = f"user_memories:{user_id}:{memory_type}:{limit}"
            cached_result = await self.cache_service.get(cache_key)
            
            if cached_result:
                return [PamMemory(**mem) for mem in cached_result]
            
            memories = await self.db_service.get_user_memories(
                user_id=user_id,
                memory_type=memory_type,
                limit=limit
            )
            
            # Cache results
            memory_dicts = [mem.model_dump() for mem in memories]
            await self.cache_service.set(cache_key, memory_dicts, ttl=600)
            
            return memories
            
        except Exception as e:
            logger.error(f"Failed to get user memories: {str(e)}")
            return []
