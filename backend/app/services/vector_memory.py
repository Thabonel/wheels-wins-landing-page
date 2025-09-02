"""
Vector Memory Service for PAM Agent
Handles storage and retrieval of conversation embeddings and contextual memories
"""

import asyncio
import logging
import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from supabase import create_client, Client
from .embeddings import VectorEmbeddingService, embed_conversation_turn, embed_user_preference

logger = logging.getLogger(__name__)


class VectorMemoryService:
    """
    Service for storing and retrieving vector-based memories for PAM agents
    Integrates with Supabase vector storage and embedding generation
    """
    
    def __init__(self, supabase_client: Client, embedding_service: VectorEmbeddingService):
        self.supabase = supabase_client
        self.embedding_service = embedding_service
        
        logger.info("VectorMemoryService initialized")
    
    async def store_conversation_memory(
        self,
        user_id: str,
        user_message: str,
        agent_response: str,
        context: Optional[Dict[str, Any]] = None,
        conversation_id: Optional[str] = None,
        intent: Optional[str] = None,
        confidence_score: float = 1.0
    ) -> Dict[str, Any]:
        """
        Store a conversation turn with vector embeddings
        
        Args:
            user_id: User identifier
            user_message: User's message
            agent_response: Agent's response
            context: Optional conversation context
            conversation_id: Optional conversation thread ID
            intent: Classified intent of the conversation
            confidence_score: Confidence in the response
            
        Returns:
            Dict with storage result and metadata
        """
        try:
            # Generate embeddings for the conversation
            embedding_data = await embed_conversation_turn(
                self.embedding_service,
                user_message,
                agent_response,
                context
            )
            
            if not embedding_data or not embedding_data.get('combined_embedding'):
                logger.error("Failed to generate embeddings for conversation")
                return {"success": False, "error": "Embedding generation failed"}
            
            # Prepare data for storage
            storage_data = {
                "user_id": user_id,
                "conversation_id": conversation_id or str(uuid.uuid4()),
                "user_message": user_message,
                "agent_response": agent_response,
                "message_context": context or {},
                "user_message_embedding": embedding_data['user_embedding'],
                "agent_response_embedding": embedding_data['response_embedding'],
                "combined_embedding": embedding_data['combined_embedding'],
                "embedding_model": embedding_data['embedding_model'],
                "intent": intent,
                "confidence_score": confidence_score,
                "processing_metadata": {
                    "stored_at": datetime.utcnow().isoformat(),
                    "embedding_dimensions": len(embedding_data['combined_embedding'])
                }
            }
            
            # Store in Supabase
            result = self.supabase.table("pam_conversation_embeddings").insert(storage_data).execute()
            
            if result.data:
                stored_record = result.data[0]
                logger.info(f"Stored conversation memory: {stored_record['id']}")
                
                return {
                    "success": True,
                    "memory_id": stored_record['id'],
                    "embedding_dimensions": len(embedding_data['combined_embedding']),
                    "stored_at": stored_record['created_at']
                }
            else:
                logger.error("Failed to store conversation in database")
                return {"success": False, "error": "Database storage failed"}
                
        except Exception as e:
            logger.error(f"Error storing conversation memory: {e}")
            return {"success": False, "error": str(e)}
    
    async def store_user_preference_memory(
        self,
        user_id: str,
        preference_key: str,
        preference_value: Any,
        user_context: Optional[Dict[str, Any]] = None,
        confidence: float = 1.0,
        source: str = "explicit"
    ) -> Dict[str, Any]:
        """
        Store a user preference with vector embedding
        
        Args:
            user_id: User identifier
            preference_key: Key identifying the preference
            preference_value: Value of the preference
            user_context: Additional user context
            confidence: Confidence in the preference (0-1)
            source: Source of preference (explicit, inferred, learned)
            
        Returns:
            Dict with storage result and metadata
        """
        try:
            # Generate embedding for the preference
            preference_data = await embed_user_preference(
                self.embedding_service,
                preference_key,
                preference_value,
                user_context
            )
            
            if not preference_data or not preference_data.get('embedding'):
                logger.error("Failed to generate embedding for preference")
                return {"success": False, "error": "Embedding generation failed"}
            
            # Prepare data for storage (upsert to handle updates)
            storage_data = {
                "user_id": user_id,
                "preference_key": preference_key,
                "preference_value": preference_value,
                "preference_text": preference_data['preference_text'],
                "preference_embedding": preference_data['embedding'],
                "embedding_model": preference_data['embedding_model'],
                "user_context": user_context or {},
                "confidence": confidence,
                "source": source,
                "frequency_score": 1.0
            }
            
            # Upsert to Supabase (update if exists, insert if not)
            result = self.supabase.table("pam_user_preferences_embeddings").upsert(
                storage_data,
                on_conflict="user_id, preference_key"
            ).execute()
            
            if result.data:
                stored_record = result.data[0]
                logger.info(f"Stored preference memory: {preference_key} for user {user_id}")
                
                return {
                    "success": True,
                    "preference_id": stored_record['id'],
                    "preference_key": preference_key,
                    "stored_at": stored_record.get('created_at')
                }
            else:
                logger.error("Failed to store preference in database")
                return {"success": False, "error": "Database storage failed"}
                
        except Exception as e:
            logger.error(f"Error storing preference memory: {e}")
            return {"success": False, "error": str(e)}
    
    async def store_contextual_memory(
        self,
        user_id: str,
        memory_type: str,
        memory_content: str,
        memory_summary: Optional[str] = None,
        location_data: Optional[Dict[str, Any]] = None,
        temporal_data: Optional[Dict[str, Any]] = None,
        importance_score: float = 1.0,
        source: str = "conversation"
    ) -> Dict[str, Any]:
        """
        Store a contextual memory (location, experience, pattern)
        
        Args:
            user_id: User identifier
            memory_type: Type of memory (trip, expense, location, experience, pattern)
            memory_content: Full content of the memory
            memory_summary: Optional summary
            location_data: Location context (lat/lng, place names)
            temporal_data: Temporal context (dates, seasons)
            importance_score: Importance of this memory (0-1)
            source: Source of memory (conversation, system, import)
            
        Returns:
            Dict with storage result and metadata
        """
        try:
            # Generate embedding for the memory content
            memory_embedding = await self.embedding_service.generate_embedding(
                memory_content,
                metadata={"type": memory_type, "user_id": user_id}
            )
            
            if not memory_embedding:
                logger.error("Failed to generate embedding for contextual memory")
                return {"success": False, "error": "Embedding generation failed"}
            
            # Prepare data for storage
            storage_data = {
                "user_id": user_id,
                "memory_type": memory_type,
                "memory_content": memory_content,
                "memory_summary": memory_summary or memory_content[:200],
                "memory_embedding": memory_embedding,
                "embedding_model": self.embedding_service.embedding_model,
                "location_data": location_data or {},
                "temporal_data": temporal_data or {},
                "importance_score": importance_score,
                "access_frequency": 0,
                "source": source
            }
            
            # Store in Supabase
            result = self.supabase.table("pam_contextual_memories").insert(storage_data).execute()
            
            if result.data:
                stored_record = result.data[0]
                logger.info(f"Stored contextual memory: {memory_type} for user {user_id}")
                
                return {
                    "success": True,
                    "memory_id": stored_record['id'],
                    "memory_type": memory_type,
                    "importance_score": importance_score,
                    "stored_at": stored_record['created_at']
                }
            else:
                logger.error("Failed to store contextual memory in database")
                return {"success": False, "error": "Database storage failed"}
                
        except Exception as e:
            logger.error(f"Error storing contextual memory: {e}")
            return {"success": False, "error": str(e)}
    
    async def find_similar_conversations(
        self,
        user_id: str,
        query_text: str,
        similarity_threshold: float = 0.7,
        max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find similar past conversations using vector similarity
        
        Args:
            user_id: User identifier
            query_text: Text to find similar conversations for
            similarity_threshold: Minimum similarity score (0-1)
            max_results: Maximum number of results
            
        Returns:
            List of similar conversation records
        """
        try:
            # Generate embedding for the query
            query_embedding = await self.embedding_service.generate_embedding(query_text)
            
            if not query_embedding:
                logger.warning("Failed to generate query embedding")
                return []
            
            # Use Supabase function for vector similarity search
            result = self.supabase.rpc(
                "find_similar_conversations",
                {
                    "target_user_id": user_id,
                    "query_embedding": query_embedding,
                    "similarity_threshold": similarity_threshold,
                    "max_results": max_results
                }
            ).execute()
            
            if result.data:
                logger.info(f"Found {len(result.data)} similar conversations for user {user_id}")
                return result.data
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error finding similar conversations: {e}")
            return []
    
    async def find_relevant_preferences(
        self,
        user_id: str,
        query_text: str,
        similarity_threshold: float = 0.6,
        max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find relevant user preferences using vector similarity
        
        Args:
            user_id: User identifier
            query_text: Text to find relevant preferences for
            similarity_threshold: Minimum similarity score (0-1)
            max_results: Maximum number of results
            
        Returns:
            List of relevant preference records
        """
        try:
            # Generate embedding for the query
            query_embedding = await self.embedding_service.generate_embedding(query_text)
            
            if not query_embedding:
                logger.warning("Failed to generate query embedding")
                return []
            
            # Use Supabase function for vector similarity search
            result = self.supabase.rpc(
                "find_relevant_preferences",
                {
                    "target_user_id": user_id,
                    "query_embedding": query_embedding,
                    "similarity_threshold": similarity_threshold,
                    "max_results": max_results
                }
            ).execute()
            
            if result.data:
                logger.info(f"Found {len(result.data)} relevant preferences for user {user_id}")
                return result.data
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error finding relevant preferences: {e}")
            return []
    
    async def find_contextual_memories(
        self,
        user_id: str,
        query_text: str,
        memory_types: Optional[List[str]] = None,
        similarity_threshold: float = 0.6,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Find contextual memories using vector similarity
        
        Args:
            user_id: User identifier
            query_text: Text to find relevant memories for
            memory_types: Optional filter by memory types
            similarity_threshold: Minimum similarity score (0-1)
            max_results: Maximum number of results
            
        Returns:
            List of relevant contextual memory records
        """
        try:
            # Generate embedding for the query
            query_embedding = await self.embedding_service.generate_embedding(query_text)
            
            if not query_embedding:
                logger.warning("Failed to generate query embedding")
                return []
            
            # Use Supabase function for vector similarity search
            result = self.supabase.rpc(
                "find_contextual_memories",
                {
                    "target_user_id": user_id,
                    "query_embedding": query_embedding,
                    "memory_types": memory_types,
                    "similarity_threshold": similarity_threshold,
                    "max_results": max_results
                }
            ).execute()
            
            if result.data:
                logger.info(f"Found {len(result.data)} contextual memories for user {user_id}")
                
                # Update access frequency for retrieved memories
                memory_ids = [record['id'] for record in result.data]
                await self._update_memory_access(memory_ids)
                
                return result.data
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error finding contextual memories: {e}")
            return []
    
    async def get_comprehensive_user_context(
        self,
        user_id: str,
        query_text: str,
        include_conversations: bool = True,
        include_preferences: bool = True,
        include_memories: bool = True
    ) -> Dict[str, Any]:
        """
        Get comprehensive context for a user query including all memory types
        
        Args:
            user_id: User identifier
            query_text: Text to find context for
            include_conversations: Whether to include conversation history
            include_preferences: Whether to include user preferences
            include_memories: Whether to include contextual memories
            
        Returns:
            Comprehensive context dictionary
        """
        try:
            context = {
                "user_id": user_id,
                "query": query_text,
                "retrieved_at": datetime.utcnow().isoformat(),
                "conversations": [],
                "preferences": [],
                "memories": []
            }
            
            # Gather all context types in parallel
            tasks = []
            
            if include_conversations:
                tasks.append(self.find_similar_conversations(user_id, query_text, max_results=3))
            
            if include_preferences:
                tasks.append(self.find_relevant_preferences(user_id, query_text, max_results=3))
            
            if include_memories:
                tasks.append(self.find_contextual_memories(user_id, query_text, max_results=5))
            
            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                result_index = 0
                if include_conversations:
                    context["conversations"] = results[result_index] if not isinstance(results[result_index], Exception) else []
                    result_index += 1
                
                if include_preferences:
                    context["preferences"] = results[result_index] if not isinstance(results[result_index], Exception) else []
                    result_index += 1
                
                if include_memories:
                    context["memories"] = results[result_index] if not isinstance(results[result_index], Exception) else []
            
            # Calculate total context items
            total_items = len(context["conversations"]) + len(context["preferences"]) + len(context["memories"])
            context["total_context_items"] = total_items
            
            logger.info(f"Retrieved comprehensive context with {total_items} items for user {user_id}")
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting comprehensive user context: {e}")
            return {
                "user_id": user_id,
                "query": query_text,
                "error": str(e),
                "conversations": [],
                "preferences": [],
                "memories": []
            }
    
    async def _update_memory_access(self, memory_ids: List[str]):
        """Update access frequency and last accessed time for memories"""
        try:
            if not memory_ids:
                return
            
            # Update access frequency and last accessed time
            update_result = self.supabase.table("pam_contextual_memories").update({
                "access_frequency": "access_frequency + 1",
                "last_accessed": datetime.utcnow().isoformat()
            }).in_("id", memory_ids).execute()
            
            logger.debug(f"Updated access frequency for {len(memory_ids)} memories")
            
        except Exception as e:
            logger.warning(f"Failed to update memory access: {e}")
    
    async def cleanup_old_memories(
        self,
        user_id: str,
        days_threshold: int = 90,
        importance_threshold: float = 0.3
    ) -> Dict[str, Any]:
        """
        Clean up old, low-importance memories to manage storage
        
        Args:
            user_id: User identifier
            days_threshold: Delete memories older than this many days
            importance_threshold: Delete memories with importance below this
            
        Returns:
            Cleanup statistics
        """
        try:
            # Calculate cutoff date
            cutoff_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            cutoff_date = cutoff_date.replace(day=cutoff_date.day - days_threshold)
            
            # Delete old, low-importance memories
            delete_result = self.supabase.table("pam_contextual_memories").delete().match({
                "user_id": user_id
            }).lt("created_at", cutoff_date.isoformat()).lt("importance_score", importance_threshold).execute()
            
            deleted_count = len(delete_result.data) if delete_result.data else 0
            
            logger.info(f"Cleaned up {deleted_count} old memories for user {user_id}")
            
            return {
                "success": True,
                "deleted_count": deleted_count,
                "cutoff_date": cutoff_date.isoformat(),
                "importance_threshold": importance_threshold
            }
            
        except Exception as e:
            logger.error(f"Error cleaning up memories: {e}")
            return {"success": False, "error": str(e)}