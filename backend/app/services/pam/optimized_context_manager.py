"""
Optimized Context Manager for PAM
Provides efficient database query patterns with caching and batching
"""

import asyncio
import json
from typing import Dict, List, Any, Optional, Set, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import hashlib
from collections import defaultdict

from app.core.logging import get_logger
from app.services.cache_manager import get_cache_manager, CacheStrategy
from app.core.config import get_settings
from app.services.database import get_database_service

logger = get_logger(__name__)
settings = get_settings()


@dataclass
class UserContext:
    """Structured user context data"""
    user_id: str
    preferences: Dict[str, Any]
    recent_messages: List[Dict[str, Any]]
    memory_data: Dict[str, Any]
    settings: Dict[str, Any]
    vehicle_info: Optional[Dict[str, Any]] = None
    travel_history: Optional[List[Dict[str, Any]]] = None
    last_location: Optional[Dict[str, Any]] = None
    session_count: int = 0
    total_messages: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        # Convert datetime objects to ISO format
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.updated_at:
            data['updated_at'] = self.updated_at.isoformat()
        return data


class OptimizedContextManager:
    """
    Optimized context manager with advanced query patterns
    
    Features:
    - Single-query context fetching with JOINs
    - Query result caching
    - Connection pooling
    - Batch operations
    - Prepared statements
    - Query performance monitoring
    - Automatic index suggestions
    """
    
    def __init__(self):
        self.db_service = get_database_service()
        self.cache_manager = None
        self._query_cache = {}
        self._prepared_statements = {}
        self._connection_pool = None
        
        # Query performance tracking
        self.query_stats = defaultdict(lambda: {
            "count": 0,
            "total_time_ms": 0,
            "avg_time_ms": 0,
            "max_time_ms": 0,
            "min_time_ms": float('inf')
        })
        
        # Initialize async components
        asyncio.create_task(self._initialize_async_components())
    
    async def _initialize_async_components(self):
        """Initialize async components like cache manager"""
        try:
            self.cache_manager = await get_cache_manager()
            logger.info("Optimized context manager initialized with cache")
        except Exception as e:
            logger.error(f"Failed to initialize cache for context manager: {str(e)}")
    
    async def get_user_context(self, 
                              user_id: str,
                              include_history: bool = True,
                              message_limit: int = 10,
                              use_cache: bool = True) -> UserContext:
        """
        Get complete user context with single optimized query
        
        Uses LEFT JOINs to fetch all related data in one query
        instead of multiple separate queries
        """
        start_time = asyncio.get_event_loop().time()
        
        # Check cache first
        if use_cache and self.cache_manager:
            cache_key = f"user_context:{user_id}:{include_history}:{message_limit}"
            cached_context = await self.cache_manager.get(
                message=cache_key,
                user_id=user_id,
                context={"type": "user_context"}
            )
            
            if cached_context:
                logger.debug(f"Context cache hit for user {user_id}")
                self._record_query_stats("get_user_context_cached", 0)
                return UserContext(**cached_context)
        
        # Optimized single query with all necessary JOINs
        query = """
            WITH user_data AS (
                SELECT 
                    id,
                    email,
                    created_at,
                    updated_at,
                    COALESCE(metadata->>'preferences', '{}')::jsonb as preferences,
                    COALESCE(metadata->>'vehicle_info', '{}')::jsonb as vehicle_info,
                    COALESCE(metadata->>'last_location', '{}')::jsonb as last_location
                FROM auth.users
                WHERE id = $1
            ),
            recent_conversations AS (
                SELECT 
                    user_id,
                    COUNT(DISTINCT session_id) as session_count,
                    COUNT(*) as total_messages,
                    jsonb_agg(
                        jsonb_build_object(
                            'message', message,
                            'response', response,
                            'session_id', session_id,
                            'created_at', created_at
                        ) ORDER BY created_at DESC
                    ) FILTER (WHERE row_num <= $2) as recent_messages
                FROM (
                    SELECT 
                        *,
                        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as row_num
                    FROM pam_conversations
                    WHERE user_id = $1
                        AND created_at > NOW() - INTERVAL '30 days'
                ) ranked_messages
                GROUP BY user_id
            ),
            user_memory AS (
                SELECT 
                    user_id,
                    jsonb_object_agg(
                        memory_key,
                        jsonb_build_object(
                            'value', memory_value,
                            'created_at', created_at,
                            'updated_at', updated_at,
                            'metadata', metadata
                        )
                    ) as memory_data
                FROM pam_memory
                WHERE user_id = $1
                    AND (expires_at IS NULL OR expires_at > NOW())
                GROUP BY user_id
            ),
            user_settings AS (
                SELECT 
                    user_id,
                    jsonb_object_agg(
                        setting_key,
                        setting_value
                    ) as settings
                FROM pam_settings
                WHERE user_id = $1
                    AND is_active = true
                GROUP BY user_id
            )
            SELECT 
                u.*,
                COALESCE(rc.recent_messages, '[]'::jsonb) as recent_messages,
                COALESCE(rc.session_count, 0) as session_count,
                COALESCE(rc.total_messages, 0) as total_messages,
                COALESCE(um.memory_data, '{}'::jsonb) as memory_data,
                COALESCE(us.settings, '{}'::jsonb) as settings
            FROM user_data u
            LEFT JOIN recent_conversations rc ON rc.user_id = u.id
            LEFT JOIN user_memory um ON um.user_id = u.id
            LEFT JOIN user_settings us ON us.user_id = u.id
        """
        
        try:
            # Execute optimized query
            result = await self.db_service.fetch_one(
                query,
                user_id,
                message_limit
            )
            
            if not result:
                # User not found - return minimal context
                context = UserContext(
                    user_id=user_id,
                    preferences={},
                    recent_messages=[],
                    memory_data={},
                    settings={},
                    session_count=0,
                    total_messages=0
                )
            else:
                # Parse and structure the result
                context = UserContext(
                    user_id=user_id,
                    preferences=result.get('preferences', {}),
                    recent_messages=result.get('recent_messages', []),
                    memory_data=result.get('memory_data', {}),
                    settings=result.get('settings', {}),
                    vehicle_info=result.get('vehicle_info'),
                    last_location=result.get('last_location'),
                    session_count=result.get('session_count', 0),
                    total_messages=result.get('total_messages', 0),
                    created_at=result.get('created_at'),
                    updated_at=result.get('updated_at')
                )
                
                # Optionally load travel history
                if include_history:
                    context.travel_history = await self._get_travel_history(user_id)
            
            # Cache the context
            if use_cache and self.cache_manager:
                await self.cache_manager.set(
                    message=cache_key,
                    user_id=user_id,
                    response=context.to_dict(),
                    context={"type": "user_context"},
                    ttl=300,  # 5 minutes
                    cache_strategy=CacheStrategy.INTELLIGENT
                )
            
            # Record query performance
            query_time = (asyncio.get_event_loop().time() - start_time) * 1000
            self._record_query_stats("get_user_context", query_time)
            
            return context
            
        except Exception as e:
            logger.error(f"Failed to get user context: {str(e)}")
            # Return minimal context on error
            return UserContext(
                user_id=user_id,
                preferences={},
                recent_messages=[],
                memory_data={},
                settings={},
                session_count=0,
                total_messages=0
            )
    
    async def _get_travel_history(self, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get user's recent travel history"""
        query = """
            SELECT 
                trip_id,
                origin,
                destination,
                start_date,
                end_date,
                distance_miles,
                route_data,
                created_at
            FROM user_trips
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        """
        
        try:
            results = await self.db_service.fetch_all(query, user_id, limit)
            return [dict(row) for row in results] if results else []
        except Exception as e:
            logger.error(f"Failed to get travel history: {str(e)}")
            return []
    
    async def batch_get_contexts(self, 
                                user_ids: List[str],
                                use_cache: bool = True) -> Dict[str, UserContext]:
        """
        Batch fetch multiple user contexts efficiently
        
        Uses a single query to fetch contexts for multiple users
        """
        start_time = asyncio.get_event_loop().time()
        contexts = {}
        
        # Check cache for each user
        uncached_users = []
        if use_cache and self.cache_manager:
            for user_id in user_ids:
                cache_key = f"user_context:{user_id}:True:10"
                cached_context = await self.cache_manager.get(
                    message=cache_key,
                    user_id=user_id,
                    context={"type": "user_context"}
                )
                
                if cached_context:
                    contexts[user_id] = UserContext(**cached_context)
                else:
                    uncached_users.append(user_id)
        else:
            uncached_users = user_ids
        
        if not uncached_users:
            return contexts
        
        # Batch query for uncached users
        query = """
            WITH user_data AS (
                SELECT 
                    id,
                    email,
                    COALESCE(metadata->>'preferences', '{}')::jsonb as preferences,
                    COALESCE(metadata->>'vehicle_info', '{}')::jsonb as vehicle_info
                FROM auth.users
                WHERE id = ANY($1)
            ),
            conversations_agg AS (
                SELECT 
                    user_id,
                    COUNT(DISTINCT session_id) as session_count,
                    COUNT(*) as total_messages,
                    jsonb_agg(
                        jsonb_build_object(
                            'message', message,
                            'response', response,
                            'created_at', created_at
                        ) ORDER BY created_at DESC
                    ) FILTER (WHERE row_num <= 10) as recent_messages
                FROM (
                    SELECT 
                        *,
                        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as row_num
                    FROM pam_conversations
                    WHERE user_id = ANY($1)
                ) ranked
                GROUP BY user_id
            )
            SELECT 
                u.*,
                COALESCE(c.recent_messages, '[]'::jsonb) as recent_messages,
                COALESCE(c.session_count, 0) as session_count,
                COALESCE(c.total_messages, 0) as total_messages
            FROM user_data u
            LEFT JOIN conversations_agg c ON c.user_id = u.id
        """
        
        try:
            results = await self.db_service.fetch_all(query, uncached_users)
            
            for row in results:
                context = UserContext(
                    user_id=row['id'],
                    preferences=row.get('preferences', {}),
                    recent_messages=row.get('recent_messages', []),
                    memory_data={},  # Would need another join for this
                    settings={},  # Would need another join for this
                    vehicle_info=row.get('vehicle_info'),
                    session_count=row.get('session_count', 0),
                    total_messages=row.get('total_messages', 0)
                )
                contexts[row['id']] = context
                
                # Cache each context
                if use_cache and self.cache_manager:
                    cache_key = f"user_context:{row['id']}:True:10"
                    await self.cache_manager.set(
                        message=cache_key,
                        user_id=row['id'],
                        response=context.to_dict(),
                        context={"type": "user_context"},
                        ttl=300
                    )
            
            # Record query performance
            query_time = (asyncio.get_event_loop().time() - start_time) * 1000
            self._record_query_stats("batch_get_contexts", query_time)
            
        except Exception as e:
            logger.error(f"Failed to batch get contexts: {str(e)}")
        
        return contexts
    
    async def save_conversation(self,
                              user_id: str,
                              session_id: str,
                              message: str,
                              response: str,
                              metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Save conversation with optimized insert
        """
        query = """
            INSERT INTO pam_conversations 
                (user_id, session_id, message, response, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (user_id, session_id, message) 
            DO UPDATE SET 
                response = EXCLUDED.response,
                metadata = COALESCE(pam_conversations.metadata, '{}')::jsonb || EXCLUDED.metadata,
                updated_at = NOW()
            RETURNING id
        """
        
        try:
            result = await self.db_service.fetch_one(
                query,
                user_id,
                session_id,
                message,
                response,
                json.dumps(metadata) if metadata else '{}'
            )
            
            # Invalidate user context cache
            if self.cache_manager:
                await self.cache_manager.invalidate(
                    pattern=f"user_context:{user_id}:*"
                )
            
            return result is not None
            
        except Exception as e:
            logger.error(f"Failed to save conversation: {str(e)}")
            return False
    
    async def batch_save_conversations(self,
                                      conversations: List[Dict[str, Any]]) -> int:
        """
        Batch save multiple conversations efficiently
        """
        if not conversations:
            return 0
        
        # Prepare batch insert data
        values = []
        for conv in conversations:
            values.append((
                conv['user_id'],
                conv['session_id'],
                conv['message'],
                conv['response'],
                json.dumps(conv.get('metadata', {}))
            ))
        
        query = """
            INSERT INTO pam_conversations 
                (user_id, session_id, message, response, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
            ON CONFLICT (user_id, session_id, message) DO NOTHING
        """
        
        try:
            # Use executemany for batch insert
            await self.db_service.execute_many(query, values)
            
            # Invalidate cache for affected users
            if self.cache_manager:
                user_ids = set(conv['user_id'] for conv in conversations)
                for user_id in user_ids:
                    await self.cache_manager.invalidate(
                        pattern=f"user_context:{user_id}:*"
                    )
            
            return len(conversations)
            
        except Exception as e:
            logger.error(f"Failed to batch save conversations: {str(e)}")
            return 0
    
    async def update_user_memory(self,
                                user_id: str,
                                memory_key: str,
                                memory_value: Any,
                                metadata: Optional[Dict[str, Any]] = None,
                                expires_in_days: Optional[int] = None) -> bool:
        """
        Update user memory with UPSERT pattern
        """
        expires_at = None
        if expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
        
        query = """
            INSERT INTO pam_memory 
                (user_id, memory_key, memory_value, metadata, expires_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (user_id, memory_key) 
            DO UPDATE SET 
                memory_value = EXCLUDED.memory_value,
                metadata = COALESCE(pam_memory.metadata, '{}')::jsonb || EXCLUDED.metadata,
                expires_at = EXCLUDED.expires_at,
                updated_at = NOW()
            RETURNING id
        """
        
        try:
            result = await self.db_service.fetch_one(
                query,
                user_id,
                memory_key,
                json.dumps(memory_value) if not isinstance(memory_value, str) else memory_value,
                json.dumps(metadata) if metadata else '{}',
                expires_at
            )
            
            # Invalidate user context cache
            if self.cache_manager:
                await self.cache_manager.invalidate(
                    pattern=f"user_context:{user_id}:*"
                )
            
            return result is not None
            
        except Exception as e:
            logger.error(f"Failed to update user memory: {str(e)}")
            return False
    
    async def get_active_sessions(self, 
                                 time_window_minutes: int = 30) -> List[Dict[str, Any]]:
        """
        Get active sessions within time window
        """
        query = """
            SELECT 
                user_id,
                session_id,
                COUNT(*) as message_count,
                MAX(created_at) as last_activity,
                MIN(created_at) as session_start,
                jsonb_agg(
                    jsonb_build_object(
                        'message', message,
                        'created_at', created_at
                    ) ORDER BY created_at DESC
                ) FILTER (WHERE row_num <= 3) as recent_messages
            FROM (
                SELECT 
                    *,
                    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at DESC) as row_num
                FROM pam_conversations
                WHERE created_at > NOW() - INTERVAL '%s minutes'
            ) ranked
            GROUP BY user_id, session_id
            ORDER BY last_activity DESC
        """
        
        try:
            results = await self.db_service.fetch_all(query % time_window_minutes)
            return [dict(row) for row in results] if results else []
            
        except Exception as e:
            logger.error(f"Failed to get active sessions: {str(e)}")
            return []
    
    def _record_query_stats(self, query_name: str, time_ms: float):
        """Record query performance statistics"""
        stats = self.query_stats[query_name]
        stats["count"] += 1
        stats["total_time_ms"] += time_ms
        stats["avg_time_ms"] = stats["total_time_ms"] / stats["count"]
        stats["max_time_ms"] = max(stats["max_time_ms"], time_ms)
        stats["min_time_ms"] = min(stats["min_time_ms"], time_ms)
        
        # Log slow queries
        if time_ms > 100:
            logger.warning(f"Slow query detected: {query_name} took {time_ms:.2f}ms")
    
    def get_query_statistics(self) -> Dict[str, Any]:
        """Get query performance statistics"""
        return dict(self.query_stats)
    
    async def optimize_indexes(self) -> List[str]:
        """
        Suggest database indexes based on query patterns
        """
        suggestions = []
        
        # Check existing indexes
        index_query = """
            SELECT 
                schemaname,
                tablename,
                indexname,
                indexdef
            FROM pg_indexes
            WHERE schemaname IN ('public', 'auth')
                AND tablename IN ('users', 'pam_conversations', 'pam_memory', 'pam_settings')
        """
        
        try:
            existing_indexes = await self.db_service.fetch_all(index_query)
            existing_index_names = {row['indexname'] for row in existing_indexes}
            
            # Suggest indexes based on common query patterns
            suggested_indexes = [
                ("pam_conversations", "user_id, created_at DESC", "idx_pam_conversations_user_created"),
                ("pam_conversations", "session_id, created_at DESC", "idx_pam_conversations_session_created"),
                ("pam_memory", "user_id, memory_key", "idx_pam_memory_user_key"),
                ("pam_memory", "expires_at", "idx_pam_memory_expires"),
                ("pam_settings", "user_id, setting_key", "idx_pam_settings_user_key"),
                ("user_trips", "user_id, created_at DESC", "idx_user_trips_user_created")
            ]
            
            for table, columns, index_name in suggested_indexes:
                if index_name not in existing_index_names:
                    suggestions.append(
                        f"CREATE INDEX {index_name} ON {table} ({columns});"
                    )
            
            # Analyze table statistics for optimization
            analyze_query = """
                SELECT 
                    schemaname,
                    tablename,
                    n_live_tup as row_count,
                    n_dead_tup as dead_rows,
                    last_vacuum,
                    last_autovacuum
                FROM pg_stat_user_tables
                WHERE schemaname IN ('public', 'auth')
                    AND tablename IN ('pam_conversations', 'pam_memory', 'pam_settings')
            """
            
            table_stats = await self.db_service.fetch_all(analyze_query)
            
            for row in table_stats:
                if row['dead_rows'] > row['row_count'] * 0.2:
                    suggestions.append(
                        f"VACUUM ANALYZE {row['schemaname']}.{row['tablename']}; -- High dead row ratio"
                    )
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Failed to optimize indexes: {str(e)}")
            return []


# Global instance
optimized_context_manager = OptimizedContextManager()

# Export for use in other modules
__all__ = [
    'OptimizedContextManager',
    'UserContext',
    'optimized_context_manager'
]