"""
Vector Embedding Service for PAM Agent Memory
Handles OpenAI embeddings generation, vector operations, and persistent storage.

Extended for Agentic Context Engineering:
- Persist embeddings to Supabase memories table (Tier 3)
- Retrieve similar memories via pgvector search
- Support for different memory types (fact, preference, pattern, instruction, correction)
"""

import asyncio
import hashlib
import logging
import os
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

import numpy as np
from openai import AsyncOpenAI
from supabase import create_client

logger = logging.getLogger(__name__)


class VectorEmbeddingService:
    """
    Service for generating and managing vector embeddings for PAM memories.
    Uses OpenAI's text-embedding-3-small for cost-effective, high-quality embeddings.

    Extended for Agentic Context Engineering:
    - Persist memories with embeddings to Supabase (Tier 3 Durable Memory)
    - Retrieve similar memories via pgvector semantic search
    - Support memory types: fact, preference, pattern, instruction, correction
    """

    # Valid memory types
    MEMORY_TYPES = ("fact", "preference", "pattern", "instruction", "correction")

    def __init__(self, openai_api_key: str):
        self.openai_client = AsyncOpenAI(api_key=openai_api_key)
        self.embedding_model = "text-embedding-3-small"  # 1536 dimensions, cost-effective
        self.embedding_cache = {}  # Simple in-memory cache for frequently used embeddings
        self.cache_ttl = timedelta(hours=1)  # Cache embeddings for 1 hour

        # Rate limiting for OpenAI API
        self.last_request_time = 0
        self.min_request_interval = 0.1  # 10 requests per second max

        # Supabase client for persistence
        self.supabase = create_client(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        )

        logger.info(f"VectorEmbeddingService initialized with model: {self.embedding_model}")
    
    async def generate_embedding(
        self, 
        text: str, 
        use_cache: bool = True,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[float]:
        """
        Generate vector embedding for a single text
        
        Args:
            text: Text to embed
            use_cache: Whether to use/store in cache
            metadata: Optional metadata for logging
            
        Returns:
            List of floats representing the embedding vector
        """
        try:
            # Validate input
            if not text or not text.strip():
                logger.warning("Empty text provided for embedding")
                return []
            
            text = text.strip()
            
            # Check cache first
            if use_cache:
                cache_key = self._get_cache_key(text)
                cached_result = self._get_from_cache(cache_key)
                if cached_result:
                    logger.debug(f"Using cached embedding for text: {text[:50]}...")
                    return cached_result
            
            # Rate limiting
            await self._rate_limit()
            
            # Generate embedding
            start_time = time.time()
            
            response = await self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text,
                encoding_format="float"
            )
            
            embedding = response.data[0].embedding
            processing_time = (time.time() - start_time) * 1000
            
            logger.info(f"Generated embedding in {processing_time:.1f}ms for text: {text[:50]}...")
            
            # Cache the result
            if use_cache:
                self._store_in_cache(cache_key, embedding)
            
            return embedding
            
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            logger.error(f"Text: {text[:100]}...")
            return []
    
    async def generate_batch_embeddings(
        self, 
        texts: List[str], 
        batch_size: int = 10,
        use_cache: bool = True
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts efficiently
        
        Args:
            texts: List of texts to embed
            batch_size: Number of texts to process in each batch
            use_cache: Whether to use/store in cache
            
        Returns:
            List of embedding vectors
        """
        try:
            if not texts:
                return []
            
            # Filter out empty texts
            valid_texts = [text.strip() for text in texts if text and text.strip()]
            if not valid_texts:
                logger.warning("No valid texts provided for batch embedding")
                return []
            
            embeddings = []
            
            # Process in batches
            for i in range(0, len(valid_texts), batch_size):
                batch = valid_texts[i:i + batch_size]
                
                # Check cache for batch items
                batch_embeddings = []
                uncached_texts = []
                uncached_indices = []
                
                if use_cache:
                    for j, text in enumerate(batch):
                        cache_key = self._get_cache_key(text)
                        cached_result = self._get_from_cache(cache_key)
                        if cached_result:
                            batch_embeddings.append((j, cached_result))
                        else:
                            uncached_texts.append(text)
                            uncached_indices.append(j)
                else:
                    uncached_texts = batch
                    uncached_indices = list(range(len(batch)))
                
                # Generate embeddings for uncached texts
                if uncached_texts:
                    await self._rate_limit()
                    
                    start_time = time.time()
                    
                    response = await self.openai_client.embeddings.create(
                        model=self.embedding_model,
                        input=uncached_texts,
                        encoding_format="float"
                    )
                    
                    processing_time = (time.time() - start_time) * 1000
                    logger.info(f"Generated {len(uncached_texts)} embeddings in {processing_time:.1f}ms")
                    
                    # Add uncached embeddings to batch
                    for idx, embedding_data in enumerate(response.data):
                        original_index = uncached_indices[idx]
                        embedding = embedding_data.embedding
                        batch_embeddings.append((original_index, embedding))
                        
                        # Cache the result
                        if use_cache:
                            cache_key = self._get_cache_key(uncached_texts[idx])
                            self._store_in_cache(cache_key, embedding)
                
                # Sort batch embeddings by original index and add to results
                batch_embeddings.sort(key=lambda x: x[0])
                embeddings.extend([emb for _, emb in batch_embeddings])
            
            logger.info(f"Generated total {len(embeddings)} embeddings for {len(valid_texts)} texts")
            return embeddings
            
        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            return []
    
    async def compute_similarity(
        self, 
        embedding1: List[float], 
        embedding2: List[float]
    ) -> float:
        """
        Compute cosine similarity between two embeddings
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Cosine similarity score between -1 and 1
        """
        try:
            if not embedding1 or not embedding2:
                return 0.0
            
            # Convert to numpy arrays
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Compute cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Failed to compute similarity: {e}")
            return 0.0
    
    async def find_most_similar(
        self, 
        query_embedding: List[float], 
        candidate_embeddings: List[Tuple[str, List[float]]], 
        top_k: int = 5,
        min_similarity: float = 0.5
    ) -> List[Tuple[str, float]]:
        """
        Find most similar embeddings to a query embedding
        
        Args:
            query_embedding: The query embedding to compare against
            candidate_embeddings: List of (id, embedding) tuples to compare
            top_k: Number of top results to return
            min_similarity: Minimum similarity threshold
            
        Returns:
            List of (id, similarity_score) tuples, sorted by similarity desc
        """
        try:
            if not query_embedding or not candidate_embeddings:
                return []
            
            similarities = []
            
            for candidate_id, candidate_embedding in candidate_embeddings:
                similarity = await self.compute_similarity(query_embedding, candidate_embedding)
                
                if similarity >= min_similarity:
                    similarities.append((candidate_id, similarity))
            
            # Sort by similarity in descending order
            similarities.sort(key=lambda x: x[1], reverse=True)
            
            # Return top_k results
            return similarities[:top_k]
            
        except Exception as e:
            logger.error(f"Failed to find most similar embeddings: {e}")
            return []
    
    def _get_cache_key(self, text: str) -> str:
        """Generate cache key for text"""
        return hashlib.md5(text.encode('utf-8')).hexdigest()
    
    def _get_from_cache(self, cache_key: str) -> Optional[List[float]]:
        """Get embedding from cache if still valid"""
        if cache_key in self.embedding_cache:
            embedding, timestamp = self.embedding_cache[cache_key]
            if datetime.now() - timestamp < self.cache_ttl:
                return embedding
            else:
                # Remove expired cache entry
                del self.embedding_cache[cache_key]
        return None
    
    def _store_in_cache(self, cache_key: str, embedding: List[float]):
        """Store embedding in cache"""
        self.embedding_cache[cache_key] = (embedding, datetime.now())
        
        # Simple cache size management (keep last 1000 entries)
        if len(self.embedding_cache) > 1000:
            # Remove oldest entries (simple FIFO)
            oldest_keys = list(self.embedding_cache.keys())[:100]
            for key in oldest_keys:
                del self.embedding_cache[key]
    
    async def _rate_limit(self):
        """Simple rate limiting for OpenAI API"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last
            await asyncio.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def clear_cache(self):
        """Clear the embedding cache"""
        self.embedding_cache.clear()
        logger.info("Embedding cache cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "cache_size": len(self.embedding_cache),
            "model": self.embedding_model,
            "cache_ttl_hours": self.cache_ttl.total_seconds() / 3600
        }

    # =========================================================================
    # Agentic Context Engineering: Persistent Memory Methods (Tier 3)
    # =========================================================================

    async def persist_memory(
        self,
        user_id: UUID,
        content: str,
        memory_type: str = "fact",
        importance_score: float = 0.5,
        source_session_id: Optional[UUID] = None,
        expires_at: Optional[datetime] = None,
    ) -> Optional[str]:
        """
        Persist a memory with its embedding to the memories table (Tier 3).

        Args:
            user_id: User identifier
            content: Memory content to store
            memory_type: Type of memory (fact, preference, pattern, instruction, correction)
            importance_score: Importance score 0.0-1.0
            source_session_id: Optional session this memory came from
            expires_at: Optional expiration datetime

        Returns:
            Memory ID if successful, None otherwise
        """
        try:
            if memory_type not in self.MEMORY_TYPES:
                logger.warning(f"Invalid memory type: {memory_type}, defaulting to 'fact'")
                memory_type = "fact"

            # Generate embedding
            embedding = await self.generate_embedding(content, use_cache=False)
            if not embedding:
                logger.error("Failed to generate embedding for memory")
                return None

            # Prepare data
            memory_data = {
                "user_id": str(user_id),
                "content": content,
                "memory_type": memory_type,
                "embedding": embedding,
                "importance_score": importance_score,
            }

            if source_session_id:
                memory_data["source_session_id"] = str(source_session_id)

            if expires_at:
                memory_data["expires_at"] = expires_at.isoformat()

            # Insert into database
            result = self.supabase.table("memories").insert(memory_data).execute()

            if result.data:
                memory_id = result.data[0].get("id")
                logger.info(
                    f"Persisted memory {memory_id} for user {user_id}: "
                    f"type={memory_type}, importance={importance_score}"
                )
                return memory_id

            return None

        except Exception as e:
            logger.error(f"Failed to persist memory: {e}")
            return None

    async def search_memories(
        self,
        user_id: UUID,
        query: str,
        max_results: int = 10,
        min_similarity: float = 0.75,
        memory_types: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for similar memories using pgvector semantic search.

        Args:
            user_id: User identifier
            query: Search query text
            max_results: Maximum number of results
            min_similarity: Minimum similarity threshold (0.0-1.0)
            memory_types: Optional list of memory types to filter

        Returns:
            List of matching memories with similarity scores
        """
        try:
            # Generate query embedding
            query_embedding = await self.generate_embedding(query)
            if not query_embedding:
                logger.error("Failed to generate query embedding")
                return []

            # Call pgvector search function
            result = self.supabase.rpc(
                "search_memories",
                {
                    "query_embedding": query_embedding,
                    "match_user_id": str(user_id),
                    "match_threshold": min_similarity,
                    "match_count": max_results,
                },
            ).execute()

            memories = result.data or []

            # Filter by memory types if specified
            if memory_types:
                memories = [m for m in memories if m.get("memory_type") in memory_types]

            logger.info(
                f"Found {len(memories)} memories for user {user_id} "
                f"(query: {query[:50]}..., threshold: {min_similarity})"
            )

            return memories

        except Exception as e:
            logger.error(f"Memory search failed: {e}")
            return []

    async def get_user_memories(
        self,
        user_id: UUID,
        memory_type: Optional[str] = None,
        limit: int = 50,
        include_inactive: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Get all memories for a user, optionally filtered by type.

        Args:
            user_id: User identifier
            memory_type: Optional memory type filter
            limit: Maximum number of results
            include_inactive: Whether to include inactive memories

        Returns:
            List of memories
        """
        try:
            query = (
                self.supabase.table("memories")
                .select("id, content, memory_type, importance_score, access_count, created_at, updated_at")
                .eq("user_id", str(user_id))
            )

            if not include_inactive:
                query = query.eq("is_active", True)

            if memory_type:
                query = query.eq("memory_type", memory_type)

            result = query.order("importance_score", desc=True).limit(limit).execute()

            return result.data or []

        except Exception as e:
            logger.error(f"Failed to get user memories: {e}")
            return []

    async def update_memory_importance(
        self,
        memory_id: str,
        importance_score: float,
    ) -> bool:
        """
        Update the importance score of a memory.

        Args:
            memory_id: Memory identifier
            importance_score: New importance score (0.0-1.0)

        Returns:
            True if successful
        """
        try:
            importance_score = max(0.0, min(1.0, importance_score))

            self.supabase.table("memories").update(
                {
                    "importance_score": importance_score,
                    "updated_at": datetime.utcnow().isoformat(),
                }
            ).eq("id", memory_id).execute()

            logger.debug(f"Updated memory {memory_id} importance to {importance_score}")
            return True

        except Exception as e:
            logger.error(f"Failed to update memory importance: {e}")
            return False

    async def deactivate_memory(self, memory_id: str) -> bool:
        """
        Deactivate a memory (soft delete).

        Args:
            memory_id: Memory identifier

        Returns:
            True if successful
        """
        try:
            self.supabase.table("memories").update(
                {"is_active": False, "updated_at": datetime.utcnow().isoformat()}
            ).eq("id", memory_id).execute()

            logger.info(f"Deactivated memory {memory_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to deactivate memory: {e}")
            return False

    async def extract_and_persist_memories(
        self,
        user_id: UUID,
        conversation_text: str,
        session_id: Optional[UUID] = None,
    ) -> List[str]:
        """
        Extract memories from conversation text and persist them.

        This is a simple extraction - for schema-driven extraction,
        use SessionCompactor instead.

        Args:
            user_id: User identifier
            conversation_text: Text to extract memories from
            session_id: Optional session identifier

        Returns:
            List of created memory IDs
        """
        try:
            # Simple extraction: look for explicit preferences and facts
            memory_ids = []

            # Check for explicit preferences
            preference_keywords = ["i prefer", "i like", "i don't like", "i want", "my favorite"]
            for keyword in preference_keywords:
                if keyword in conversation_text.lower():
                    # Extract sentence containing preference
                    sentences = conversation_text.split(".")
                    for sentence in sentences:
                        if keyword in sentence.lower():
                            memory_id = await self.persist_memory(
                                user_id=user_id,
                                content=sentence.strip(),
                                memory_type="preference",
                                importance_score=0.7,
                                source_session_id=session_id,
                            )
                            if memory_id:
                                memory_ids.append(memory_id)
                            break  # Only extract first match per keyword

            logger.info(f"Extracted {len(memory_ids)} memories from conversation")
            return memory_ids

        except Exception as e:
            logger.error(f"Failed to extract memories: {e}")
            return []


# Utility functions for PAM-specific embedding operations
async def embed_conversation_turn(
    embedding_service: VectorEmbeddingService,
    user_message: str,
    agent_response: str,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create embeddings for a conversation turn (user message + agent response)
    
    Returns:
        Dict containing embeddings and metadata
    """
    try:
        # Combine user message and response for context embedding
        combined_text = f"User: {user_message}\nPAM: {agent_response}"
        
        # Generate embeddings
        user_embedding = await embedding_service.generate_embedding(user_message)
        response_embedding = await embedding_service.generate_embedding(agent_response)
        combined_embedding = await embedding_service.generate_embedding(combined_text)
        
        return {
            "user_message": user_message,
            "agent_response": agent_response,
            "user_embedding": user_embedding,
            "response_embedding": response_embedding,
            "combined_embedding": combined_embedding,
            "context": context or {},
            "timestamp": datetime.utcnow().isoformat(),
            "embedding_model": embedding_service.embedding_model
        }
        
    except Exception as e:
        logger.error(f"Failed to embed conversation turn: {e}")
        return {}


async def embed_user_preference(
    embedding_service: VectorEmbeddingService,
    preference_key: str,
    preference_value: Any,
    user_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create embeddings for user preferences
    
    Returns:
        Dict containing preference embeddings and metadata
    """
    try:
        # Create text representation of preference
        preference_text = f"User preference: {preference_key} is {preference_value}"
        
        # Add context if available
        if user_context:
            context_text = " ".join([f"{k}: {v}" for k, v in user_context.items() if isinstance(v, str)])
            preference_text += f". Context: {context_text}"
        
        # Generate embedding
        embedding = await embedding_service.generate_embedding(preference_text)
        
        return {
            "preference_key": preference_key,
            "preference_value": preference_value,
            "preference_text": preference_text,
            "embedding": embedding,
            "user_context": user_context or {},
            "timestamp": datetime.utcnow().isoformat(),
            "embedding_model": embedding_service.embedding_model
        }
        
    except Exception as e:
        logger.error(f"Failed to embed user preference: {e}")
        return {}