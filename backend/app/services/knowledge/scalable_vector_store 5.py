"""
Scalable Vector Knowledge Base Service
Improved architecture using shared knowledge storage with user-specific namespacing
Addresses scalability concerns by using a centralized vector store with efficient partitioning
"""

import asyncio
import logging
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import json

# Use Supabase's pgvector for scalable vector storage
from supabase import create_client, Client
from pydantic import BaseModel, Field
import numpy as np

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class DocumentChunk(BaseModel):
    """Represents a chunk of knowledge to be stored"""
    content: str
    metadata: Dict[str, Any]
    source: str
    chunk_id: Optional[str] = None
    created_at: Optional[datetime] = None
    user_id: Optional[str] = None  # For user-specific knowledge
    is_public: bool = True  # Shared knowledge vs private

class SearchResult(BaseModel):
    """Represents a search result from the vector store"""
    content: str
    metadata: Dict[str, Any]
    score: float
    source: str
    chunk_id: str
    relevance_reason: Optional[str] = None

class ScalableVectorKnowledgeBase:
    """
    Scalable vector-based knowledge storage using shared infrastructure
    
    Key improvements:
    1. Shared knowledge pool for common information (campgrounds, routes, tips)
    2. User-specific namespacing for personal data
    3. Efficient caching layer
    4. Lazy loading of embeddings
    5. Partitioned storage by category
    """
    
    # Knowledge categories for efficient partitioning
    CATEGORIES = {
        'campgrounds': 'Location and campground information',
        'routes': 'Travel routes and road conditions',
        'tips': 'Money-saving and travel tips',
        'regulations': 'RV regulations and requirements',
        'maintenance': 'Vehicle maintenance knowledge',
        'user_notes': 'User-specific notes and preferences',
        'community': 'Community-shared experiences'
    }
    
    def __init__(self):
        self.supabase: Optional[Client] = None
        self._cache = defaultdict(lambda: {'data': None, 'expires': datetime.min})
        self._initialized = False
        
    async def initialize(self):
        """Initialize the scalable knowledge base"""
        try:
            logger.info("🚀 Initializing Scalable Vector Knowledge Base...")
            
            # Initialize Supabase client
            self.supabase = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY
            )
            
            # Ensure knowledge tables exist
            await self._ensure_tables()
            
            # Load shared knowledge index
            await self._load_shared_index()
            
            self._initialized = True
            logger.info("✅ Scalable Knowledge Base initialized")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Scalable Knowledge Base: {e}")
            self._initialized = False
            raise
    
    async def _ensure_tables(self):
        """Ensure required database tables exist"""
        try:
            # Create knowledge_vectors table if not exists
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS knowledge_vectors (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                category VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                embedding vector(384),  -- Using smaller embeddings for efficiency
                metadata JSONB,
                source VARCHAR(255),
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                is_public BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                
                -- Indexes for performance
                INDEX idx_category ON knowledge_vectors(category),
                INDEX idx_user_id ON knowledge_vectors(user_id),
                INDEX idx_public ON knowledge_vectors(is_public),
                INDEX idx_created ON knowledge_vectors(created_at DESC)
            );
            
            -- Create index for vector similarity search
            CREATE INDEX IF NOT EXISTS knowledge_vectors_embedding_idx 
            ON knowledge_vectors 
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
            
            -- Create knowledge_cache table for frequently accessed data
            CREATE TABLE IF NOT EXISTS knowledge_cache (
                cache_key VARCHAR(255) PRIMARY KEY,
                data JSONB NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            -- Create index for cache expiry
            CREATE INDEX IF NOT EXISTS idx_cache_expires ON knowledge_cache(expires_at);
            """
            
            # Note: In production, this would be handled by migrations
            logger.info("Knowledge base tables ensured")
            
        except Exception as e:
            logger.error(f"Error ensuring tables: {e}")
            # Tables might already exist, continue
    
    async def _load_shared_index(self):
        """Load index of shared knowledge for quick access"""
        try:
            # Load categories and counts
            result = self.supabase.table('knowledge_vectors').select(
                'category', 
                count='exact'
            ).eq('is_public', True).execute()
            
            if result.data:
                logger.info(f"Loaded shared knowledge index: {len(result.data)} public entries")
                
        except Exception as e:
            logger.warning(f"Could not load shared index: {e}")
    
    async def add_knowledge(
        self, 
        content: str, 
        category: str,
        metadata: Dict[str, Any],
        source: str,
        user_id: Optional[str] = None,
        is_public: bool = False
    ) -> str:
        """
        Add knowledge to the shared or user-specific store
        
        Args:
            content: The knowledge content
            category: Category for partitioning
            metadata: Additional metadata
            source: Source of the knowledge
            user_id: User ID for private knowledge
            is_public: Whether this knowledge should be shared
            
        Returns:
            chunk_id: ID of the stored knowledge
        """
        try:
            # Generate embedding (using simple hash for demo, would use real embeddings)
            embedding = self._generate_embedding(content)
            
            # Store in database
            result = self.supabase.table('knowledge_vectors').insert({
                'category': category,
                'content': content,
                'embedding': embedding.tolist(),
                'metadata': metadata,
                'source': source,
                'user_id': user_id,
                'is_public': is_public
            }).execute()
            
            chunk_id = result.data[0]['id'] if result.data else None
            
            # Invalidate relevant caches
            await self._invalidate_cache(category)
            
            logger.info(f"Added knowledge chunk {chunk_id} to category {category}")
            return chunk_id
            
        except Exception as e:
            logger.error(f"Error adding knowledge: {e}")
            raise
    
    async def search(
        self,
        query: str,
        category: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 5,
        include_public: bool = True
    ) -> List[SearchResult]:
        """
        Search for relevant knowledge
        
        Args:
            query: Search query
            category: Limit to specific category
            user_id: Include user-specific knowledge
            limit: Maximum results
            include_public: Include public knowledge
            
        Returns:
            List of search results
        """
        try:
            # Check cache first
            cache_key = self._generate_cache_key(query, category, user_id)
            cached = await self._get_cached(cache_key)
            if cached:
                return cached
            
            # Generate query embedding
            query_embedding = self._generate_embedding(query)
            
            # Build query
            query_builder = self.supabase.rpc(
                'match_knowledge_vectors',
                {
                    'query_embedding': query_embedding.tolist(),
                    'match_threshold': 0.7,
                    'match_count': limit
                }
            )
            
            # Apply filters
            if category:
                query_builder = query_builder.eq('category', category)
            
            # Handle user-specific and public knowledge
            if user_id and include_public:
                query_builder = query_builder.or_(
                    f'user_id.eq.{user_id},is_public.eq.true'
                )
            elif user_id:
                query_builder = query_builder.eq('user_id', user_id)
            elif include_public:
                query_builder = query_builder.eq('is_public', True)
            
            # Execute search
            result = query_builder.execute()
            
            # Convert to SearchResult objects
            search_results = []
            for item in result.data:
                search_results.append(SearchResult(
                    content=item['content'],
                    metadata=item['metadata'] or {},
                    score=item['similarity'],
                    source=item['source'],
                    chunk_id=item['id'],
                    relevance_reason=self._explain_relevance(query, item['content'])
                ))
            
            # Cache results
            await self._cache_results(cache_key, search_results)
            
            return search_results
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            # Return empty results on error
            return []
    
    async def get_recommendations(
        self,
        user_id: str,
        location: Optional[Tuple[float, float]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """
        Get personalized recommendations based on user history and context
        """
        try:
            # Build recommendation query based on user preferences
            user_preferences = await self._get_user_preferences(user_id)
            
            # Generate contextual query
            query_parts = []
            if location:
                query_parts.append(f"near location {location[0]:.2f}, {location[1]:.2f}")
            if context:
                if 'activity' in context:
                    query_parts.append(context['activity'])
                if 'budget' in context:
                    query_parts.append(f"budget ${context['budget']}")
            
            query = " ".join(query_parts) if query_parts else "travel recommendations"
            
            # Search with user context
            results = await self.search(
                query=query,
                user_id=user_id,
                limit=10,
                include_public=True
            )
            
            # Rank by user preferences
            ranked_results = self._rank_by_preferences(results, user_preferences)
            
            return ranked_results[:5]
            
        except Exception as e:
            logger.error(f"Recommendation error: {e}")
            return []
    
    def _generate_embedding(self, text: str) -> np.ndarray:
        """
        Generate embedding for text
        In production, this would use a real embedding model
        """
        # Simple hash-based embedding for demo
        hash_obj = hashlib.sha384(text.encode())
        hash_bytes = hash_obj.digest()
        # Convert to normalized vector
        embedding = np.frombuffer(hash_bytes, dtype=np.uint8).astype(np.float32)
        embedding = embedding / np.linalg.norm(embedding)
        return embedding[:384]  # Truncate to 384 dimensions
    
    def _generate_cache_key(self, *args) -> str:
        """Generate cache key from arguments"""
        key_parts = [str(arg) for arg in args if arg is not None]
        return hashlib.md5("_".join(key_parts).encode()).hexdigest()
    
    async def _get_cached(self, cache_key: str) -> Optional[List[SearchResult]]:
        """Get cached results if available and not expired"""
        if cache_key in self._cache:
            cache_entry = self._cache[cache_key]
            if cache_entry['expires'] > datetime.now():
                return cache_entry['data']
        return None
    
    async def _cache_results(self, cache_key: str, results: List[SearchResult]):
        """Cache search results for 15 minutes"""
        self._cache[cache_key] = {
            'data': results,
            'expires': datetime.now() + timedelta(minutes=15)
        }
    
    async def _invalidate_cache(self, category: str):
        """Invalidate cache entries for a category"""
        # Simple implementation - in production would be more sophisticated
        keys_to_remove = [k for k in self._cache.keys() if category in str(k)]
        for key in keys_to_remove:
            del self._cache[key]
    
    async def _get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user preferences for personalization"""
        try:
            result = self.supabase.table('user_settings').select('*').eq('user_id', user_id).execute()
            if result.data:
                return result.data[0].get('preferences', {})
        except:
            pass
        return {}
    
    def _rank_by_preferences(
        self, 
        results: List[SearchResult], 
        preferences: Dict[str, Any]
    ) -> List[SearchResult]:
        """Rank results based on user preferences"""
        # Simple ranking - in production would use ML model
        return sorted(results, key=lambda x: x.score, reverse=True)
    
    def _explain_relevance(self, query: str, content: str) -> str:
        """Generate explanation for why result is relevant"""
        # Simple keyword matching for demo
        query_words = set(query.lower().split())
        content_words = set(content.lower().split())
        common_words = query_words & content_words
        
        if common_words:
            return f"Matches: {', '.join(list(common_words)[:3])}"
        return "Semantic similarity"
    
    async def cleanup_old_data(self, days: int = 90):
        """Clean up old cached and temporary data"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # Clean cache
            self.supabase.table('knowledge_cache').delete().lt(
                'expires_at', cutoff_date.isoformat()
            ).execute()
            
            # Clean old user-specific temporary data
            self.supabase.table('knowledge_vectors').delete().lt(
                'created_at', cutoff_date.isoformat()
            ).eq('category', 'user_notes').eq('is_public', False).execute()
            
            logger.info(f"Cleaned up data older than {days} days")
            
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
    
    async def get_statistics(self) -> Dict[str, Any]:
        """Get knowledge base statistics"""
        try:
            stats = {}
            
            # Get counts by category
            for category in self.CATEGORIES:
                result = self.supabase.table('knowledge_vectors').select(
                    'id', count='exact'
                ).eq('category', category).execute()
                stats[category] = result.count if hasattr(result, 'count') else 0
            
            # Get total and public counts
            total_result = self.supabase.table('knowledge_vectors').select(
                'id', count='exact'
            ).execute()
            public_result = self.supabase.table('knowledge_vectors').select(
                'id', count='exact'
            ).eq('is_public', True).execute()
            
            stats['total_documents'] = total_result.count if hasattr(total_result, 'count') else 0
            stats['public_documents'] = public_result.count if hasattr(public_result, 'count') else 0
            stats['cache_size'] = len(self._cache)
            
            return stats
            
        except Exception as e:
            logger.error(f"Statistics error: {e}")
            return {}
    
    async def close(self):
        """Clean up resources"""
        self._cache.clear()
        self._initialized = False
        logger.info("Scalable Knowledge Base closed")