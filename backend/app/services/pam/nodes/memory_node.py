
"""
Memory Node - Memory storage and retrieval with enhanced functionality
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from app.models.domain.pam import PamMemory, IntentType, MemoryType
from app.services.database import DatabaseService
from app.services.cache import CacheService
from app.core.exceptions import DatabaseError, ValidationError
from pydantic import BaseModel, Field

logger = logging.getLogger("pam.memory_node")

class MemorySearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    intent_type: Optional[IntentType] = None
    limit: int = Field(default=5, ge=1, le=20)

class MemoryNode:
    """Node for handling memory storage and retrieval with enhanced performance"""
    
    def __init__(self):
        self.db_service = DatabaseService()
        self.cache_service = CacheService()
        self.logger = logging.getLogger("pam.memory_node")
    
    async def store_memory(self, memory: PamMemory) -> bool:
        """Store a memory in the database with validation and caching"""
        start_time = datetime.now()
        
        try:
            # Input validation
            if not memory.user_id:
                raise ValidationError("Memory must have a user_id")
            if not memory.content or not memory.content.strip():
                raise ValidationError("Memory content cannot be empty")
            
            # Store in database
            success = await self.db_service.store_memory(memory)
            
            if success:
                # Invalidate relevant caches
                cache_keys = [
                    f"user_memories:{memory.user_id}",
                    f"user_memories:{memory.user_id}:*",
                    f"memory_search:{memory.user_id}:*"
                ]
                
                for cache_key in cache_keys:
                    await self.cache_service.delete_pattern(cache_key)
                
                # Performance logging
                processing_time = (datetime.now() - start_time).total_seconds() * 1000
                self.logger.info(f"Memory stored for user {memory.user_id} in {processing_time:.2f}ms")
                
                return True
            else:
                raise DatabaseError("Failed to store memory in database")
            
        except ValidationError as e:
            self.logger.error(f"Memory validation failed: {str(e)}")
            raise
        except Exception as e:
            self.logger.error(f"Failed to store memory: {str(e)}")
            raise DatabaseError(f"Memory storage failed: {str(e)}")
    
    async def search_memories(self, user_id: str, query: str, 
                            intent_type: Optional[IntentType] = None,
                            limit: int = 5) -> List[PamMemory]:
        """Search for relevant memories with enhanced caching"""
        start_time = datetime.now()
        
        try:
            # Input validation
            if not user_id:
                raise ValidationError("User ID is required for memory search")
            if not query or not query.strip():
                raise ValidationError("Search query cannot be empty")
            if limit < 1 or limit > 20:
                raise ValidationError("Limit must be between 1 and 20")
            
            # Try cache first
            cache_key = f"memory_search:{user_id}:{hash(query)}:{intent_type}:{limit}"
            cached_result = await self.cache_service.get(cache_key)
            
            if cached_result:
                self.logger.debug(f"Memory search cache hit for user {user_id}")
                return [PamMemory(**mem) for mem in cached_result]
            
            # Search in database
            memories = await self.db_service.search_memories(
                user_id=user_id,
                query=query,
                intent_type=intent_type,
                limit=limit
            )
            
            # Cache results with shorter TTL for search results
            if memories:
                memory_dicts = [mem.model_dump() for mem in memories]
                await self.cache_service.set(cache_key, memory_dicts, ttl=300)
            
            # Performance logging
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            self.logger.info(f"Memory search completed for user {user_id} in {processing_time:.2f}ms, found {len(memories)} results")
            
            return memories
            
        except ValidationError as e:
            self.logger.error(f"Memory search validation failed: {str(e)}")
            return []
        except Exception as e:
            self.logger.error(f"Memory search failed: {str(e)}")
            return []
    
    async def get_user_memories(self, user_id: str, memory_type: Optional[MemoryType] = None,
                              limit: int = 10) -> List[PamMemory]:
        """Get recent memories for a user with enhanced caching"""
        start_time = datetime.now()
        
        try:
            # Input validation
            if not user_id:
                raise ValidationError("User ID is required")
            if limit < 1 or limit > 50:
                raise ValidationError("Limit must be between 1 and 50")
            
            cache_key = f"user_memories:{user_id}:{memory_type}:{limit}"
            cached_result = await self.cache_service.get(cache_key)
            
            if cached_result:
                self.logger.debug(f"User memories cache hit for user {user_id}")
                return [PamMemory(**mem) for mem in cached_result]
            
            memories = await self.db_service.get_user_memories(
                user_id=user_id,
                memory_type=memory_type,
                limit=limit
            )
            
            # Cache results with longer TTL for user memories
            if memories:
                memory_dicts = [mem.model_dump() for mem in memories]
                await self.cache_service.set(cache_key, memory_dicts, ttl=600)
            
            # Performance logging
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            self.logger.info(f"Retrieved {len(memories)} memories for user {user_id} in {processing_time:.2f}ms")
            
            return memories
            
        except ValidationError as e:
            self.logger.error(f"Get user memories validation failed: {str(e)}")
            return []
        except Exception as e:
            self.logger.error(f"Failed to get user memories: {str(e)}")
            return []
    
    async def get_memory_statistics(self, user_id: str) -> Dict[str, Any]:
        """Get memory usage statistics for a user"""
        try:
            if not user_id:
                raise ValidationError("User ID is required")
            
            cache_key = f"memory_stats:{user_id}"
            cached_stats = await self.cache_service.get(cache_key)
            
            if cached_stats:
                return cached_stats
            
            stats = await self.db_service.get_memory_statistics(user_id)
            
            # Cache stats for 1 hour
            await self.cache_service.set(cache_key, stats, ttl=3600)
            
            return stats
            
        except Exception as e:
            self.logger.error(f"Failed to get memory statistics: {str(e)}")
            return {}
    
    async def cleanup_old_memories(self, user_id: str, days_old: int = 90) -> int:
        """Clean up old memories for a user"""
        try:
            if not user_id:
                raise ValidationError("User ID is required")
            if days_old < 1:
                raise ValidationError("Days old must be positive")
            
            deleted_count = await self.db_service.cleanup_old_memories(user_id, days_old)
            
            # Invalidate caches after cleanup
            cache_keys = [
                f"user_memories:{user_id}:*",
                f"memory_search:{user_id}:*",
                f"memory_stats:{user_id}"
            ]
            
            for cache_key in cache_keys:
                await self.cache_service.delete_pattern(cache_key)
            
            self.logger.info(f"Cleaned up {deleted_count} old memories for user {user_id}")
            return deleted_count
            
        except Exception as e:
            self.logger.error(f"Failed to cleanup old memories: {str(e)}")
            return 0

# Create singleton instance
memory_node = MemoryNode()
