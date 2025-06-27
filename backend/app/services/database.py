
"""
Database Service
Centralized database operations with connection pooling and caching.
"""

import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import asyncpg
from app.core.database_pool import db_pool
from app.core.logging import setup_logging
from app.services.cache_service import cache_service
from app.models.domain.pam import PamMemory, IntentType, MemoryType

logger = setup_logging()

class DatabaseService:
    """Enhanced database service with pooling and caching"""
    
    def __init__(self):
        self.pool = None
        self.cache = cache_service
    
    async def initialize(self):
        """Initialize database connection pool"""
        self.pool = await db_pool.get_pool()
        logger.info("Database service initialized with connection pool")
    
    async def get_connection(self):
        """Get database connection from pool"""
        if not self.pool:
            await self.initialize()
        return await self.pool.acquire()
    
    async def release_connection(self, connection):
        """Release connection back to pool"""
        if self.pool:
            await self.pool.release(connection)
    
    async def execute_query(self, query: str, *args, cache_key: str = None, cache_ttl: int = 300):
        """Execute query with optional caching"""
        if cache_key:
            cached_result = await self.cache.get(cache_key)
            if cached_result:
                return cached_result
        
        connection = await self.get_connection()
        try:
            result = await connection.fetch(query, *args)
            
            if cache_key and result:
                await self.cache.set(cache_key, result, cache_ttl)
            
            return result
        finally:
            await self.release_connection(connection)
    
    async def execute_single(self, query: str, *args):
        """Execute query returning single result"""
        connection = await self.get_connection()
        try:
            return await connection.fetchrow(query, *args)
        finally:
            await self.release_connection(connection)
    
    async def execute_mutation(self, query: str, *args):
        """Execute insert/update/delete query"""
        connection = await self.get_connection()
        try:
            return await connection.execute(query, *args)
        finally:
            await self.release_connection(connection)
    
    # PAM-specific methods
    async def get_user_memories(self, user_id: str, memory_type: MemoryType = None, limit: int = 100):
        """Get user memories with caching"""
        cache_key = f"memories:{user_id}:{memory_type}:{limit}"
        
        if memory_type:
            query = """
                SELECT * FROM pam_memory 
                WHERE user_id = $1 AND memory_type = $2 
                ORDER BY created_at DESC LIMIT $3
            """
            return await self.execute_query(query, user_id, memory_type.value, limit, cache_key=cache_key)
        else:
            query = """
                SELECT * FROM pam_memory 
                WHERE user_id = $1 
                ORDER BY created_at DESC LIMIT $2
            """
            return await self.execute_query(query, user_id, limit, cache_key=cache_key)
    
    async def store_memory(self, memory: PamMemory):
        """Store new memory and invalidate cache"""
        query = """
            INSERT INTO pam_memory (user_id, memory_type, content, context, confidence, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        """
        
        result = await self.execute_single(
            query,
            memory.user_id,
            memory.memory_type.value,
            memory.content,
            memory.context,
            memory.confidence,
            memory.expires_at
        )
        
        # Invalidate related caches
        await self.cache.delete_pattern(f"memories:{memory.user_id}:*")
        
        return result['id'] if result else None
    
    async def get_conversation_context(self, user_id: str, limit: int = 10):
        """Get recent conversation context"""
        cache_key = f"context:{user_id}:{limit}"
        
        query = """
            SELECT user_message, pam_response, detected_intent, created_at
            FROM pam_conversation_memory 
            WHERE user_id = $1 
            ORDER BY created_at DESC LIMIT $2
        """
        
        return await self.execute_query(query, user_id, limit, cache_key=cache_key, cache_ttl=60)
    
    async def store_conversation(self, user_id: str, session_id: str, message_data: Dict[str, Any]):
        """Store conversation with cache invalidation"""
        query = """
            INSERT INTO pam_conversation_memory 
            (user_id, session_id, user_message, pam_response, detected_intent, 
             intent_confidence, context_used, entities_extracted, node_used, response_time_ms)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        """
        
        await self.execute_mutation(
            query,
            user_id,
            session_id,
            message_data.get('user_message'),
            message_data.get('pam_response'),
            message_data.get('detected_intent'),
            message_data.get('intent_confidence'),
            message_data.get('context_used'),
            message_data.get('entities_extracted'),
            message_data.get('node_used'),
            message_data.get('response_time_ms')
        )
        
        # Invalidate context cache
        await self.cache.delete_pattern(f"context:{user_id}:*")
    
    async def get_user_preferences(self, user_id: str):
        """Get user preferences with caching"""
        cache_key = f"preferences:{user_id}"
        
        query = """
            SELECT preferences FROM user_profiles WHERE user_id = $1
        """
        
        result = await self.execute_single(query, user_id)
        return result['preferences'] if result else {}
    
    async def update_user_preferences(self, user_id: str, preferences: Dict[str, Any]):
        """Update user preferences and invalidate cache"""
        query = """
            UPDATE user_profiles 
            SET preferences = preferences || $2, updated_at = NOW()
            WHERE user_id = $1
        """
        
        await self.execute_mutation(query, user_id, preferences)
        await self.cache.delete(f"preferences:{user_id}")
    
    async def cleanup_expired_data(self):
        """Clean up expired memories and sessions"""
        queries = [
            "DELETE FROM pam_memory WHERE expires_at < NOW()",
            "DELETE FROM pam_conversation_sessions WHERE session_end < NOW() - INTERVAL '7 days'",
            "DELETE FROM audio_cache WHERE expires_at < NOW()"
        ]
        
        for query in queries:
            await self.execute_mutation(query)
        
        logger.info("Cleanup completed for expired data")

# Global database service instance
database_service = DatabaseService()

async def get_database_service() -> DatabaseService:
    """Get database service instance"""
    if not database_service.pool:
        await database_service.initialize()
    return database_service
