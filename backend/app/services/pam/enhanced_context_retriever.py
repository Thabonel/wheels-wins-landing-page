"""
Enhanced Context Retriever for PAM
Bridges vector database capabilities with main conversation orchestrator
Provides intelligent context retrieval using semantic similarity and RAG patterns
"""

import asyncio
import logging
import uuid
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass

from app.services.vector_memory import VectorMemoryService
from app.services.embeddings import VectorEmbeddingService
from app.services.database import get_database_service
from app.services.pam.nodes.memory_node import MemoryNode
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

@dataclass
class EnhancedContext:
    """Enhanced context with vector-retrieved information"""
    similar_conversations: List[Dict[str, Any]]
    relevant_preferences: List[Dict[str, Any]]
    contextual_memories: List[Dict[str, Any]]
    user_knowledge: List[Dict[str, Any]]
    context_summary: str
    confidence_score: float
    retrieval_time_ms: int

class EnhancedContextRetriever:
    """
    Enhanced context retriever that combines traditional database queries
    with vector similarity search for intelligent context building
    """
    
    def __init__(self):
        self.database_service = None
        self.vector_memory_service = None
        self.embedding_service = None
        self.memory_node = None
        self.initialized = False
        
        # Performance tuning
        self.max_similar_conversations = 5
        self.max_relevant_preferences = 3
        self.max_contextual_memories = 4
        self.similarity_threshold = 0.7
        self.context_window_hours = 72
        
    async def initialize(self):
        """Initialize services and connections"""
        try:
            self.database_service = get_database_service()
            self.memory_node = MemoryNode()
            
            # Initialize vector services if available
            try:
                from supabase import create_client
                
                supabase_url = settings.SUPABASE_URL
                supabase_key = settings.SUPABASE_SERVICE_ROLE_KEY
                
                if supabase_url and supabase_key:
                    supabase_client = create_client(supabase_url, supabase_key)
                    self.embedding_service = VectorEmbeddingService()
                    self.vector_memory_service = VectorMemoryService(
                        supabase_client, 
                        self.embedding_service
                    )
                    logger.info("✅ Vector-enhanced context retrieval initialized")
                else:
                    logger.warning("⚠️ Supabase credentials not available - using traditional context only")
                    
            except Exception as vector_error:
                logger.error(f"❌ Failed to initialize vector services: {vector_error}")
                logger.info("Continuing with traditional context retrieval")
            
            self.initialized = True
            
        except Exception as e:
            logger.error(f"Failed to initialize enhanced context retriever: {e}")
            raise

    async def retrieve_enhanced_context(
        self,
        user_id: str,
        current_message: str,
        session_id: str = None,
        include_vector_search: bool = True,
        context_depth: str = "standard"  # "minimal", "standard", "deep"
    ) -> EnhancedContext:
        """
        Retrieve comprehensive context using both traditional and vector-based methods
        
        Args:
            user_id: User identifier
            current_message: Current user message for semantic matching
            session_id: Optional session identifier
            include_vector_search: Whether to use vector similarity search
            context_depth: Level of context to retrieve
            
        Returns:
            EnhancedContext with all relevant information
        """
        start_time = datetime.now()
        
        if not self.initialized:
            await self.initialize()
        
        try:
            # Parallel retrieval for performance
            retrieval_tasks = []
            
            # Traditional context retrieval (always included)
            retrieval_tasks.append(
                self._get_recent_conversation_history(user_id, session_id)
            )
            
            # Vector-based retrieval (if available and requested)
            if include_vector_search and self.vector_memory_service:
                retrieval_tasks.extend([
                    self._get_similar_conversations(user_id, current_message),
                    self._get_relevant_preferences(user_id, current_message),
                    self._get_contextual_memories(user_id, current_message),
                ])
            
            # User knowledge search (through memory node)
            if self.memory_node:
                retrieval_tasks.append(
                    self._get_user_knowledge_context(user_id, current_message)
                )
            
            # Execute all retrieval tasks in parallel
            results = await asyncio.gather(*retrieval_tasks, return_exceptions=True)
            
            # Process results
            conversation_history = results[0] if not isinstance(results[0], Exception) else []
            similar_conversations = []
            relevant_preferences = []
            contextual_memories = []
            user_knowledge = []
            
            if include_vector_search and self.vector_memory_service and len(results) >= 4:
                similar_conversations = results[1] if not isinstance(results[1], Exception) else []
                relevant_preferences = results[2] if not isinstance(results[2], Exception) else []
                contextual_memories = results[3] if not isinstance(results[3], Exception) else []
                
                if len(results) >= 5:
                    knowledge_result = results[4] if not isinstance(results[4], Exception) else {}
                    user_knowledge = knowledge_result.get('results', []) if knowledge_result else []
            
            # Build context summary
            context_summary = self._build_context_summary(
                conversation_history=conversation_history,
                similar_conversations=similar_conversations,
                relevant_preferences=relevant_preferences,
                contextual_memories=contextual_memories,
                user_knowledge=user_knowledge,
                current_message=current_message
            )
            
            # Calculate confidence score
            confidence_score = self._calculate_context_confidence(
                similar_conversations, relevant_preferences, 
                contextual_memories, user_knowledge
            )
            
            # Calculate retrieval time
            retrieval_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            enhanced_context = EnhancedContext(
                similar_conversations=similar_conversations,
                relevant_preferences=relevant_preferences,
                contextual_memories=contextual_memories,
                user_knowledge=user_knowledge,
                context_summary=context_summary,
                confidence_score=confidence_score,
                retrieval_time_ms=retrieval_time_ms
            )
            
            logger.info(f"🧠 Enhanced context retrieved in {retrieval_time_ms}ms for user {user_id}")
            logger.debug(f"Context: {len(similar_conversations)} conversations, "
                        f"{len(relevant_preferences)} preferences, "
                        f"{len(contextual_memories)} memories, "
                        f"{len(user_knowledge)} knowledge items")
            
            return enhanced_context
            
        except Exception as e:
            logger.error(f"Failed to retrieve enhanced context: {e}")
            # Return minimal context on failure
            return EnhancedContext(
                similar_conversations=[],
                relevant_preferences=[],
                contextual_memories=[],
                user_knowledge=[],
                context_summary=f"User is asking: {current_message}",
                confidence_score=0.1,
                retrieval_time_ms=int((datetime.now() - start_time).total_seconds() * 1000)
            )

    async def _get_recent_conversation_history(
        self, 
        user_id: str, 
        session_id: str = None
    ) -> List[Dict[str, Any]]:
        """Get recent conversation history from traditional database"""
        try:
            # Get recent conversations within context window
            cutoff_time = datetime.utcnow() - timedelta(hours=self.context_window_hours)
            
            query = self.database_service.supabase.table("pam_memory")\
                .select("*")\
                .eq("user_id", user_id)\
                .gte("created_at", cutoff_time.isoformat())\
                .order("created_at", desc=True)\
                .limit(10)
            
            if session_id:
                query = query.eq("session_id", session_id)
            
            result = query.execute()
            return result.data or []
            
        except Exception as e:
            logger.error(f"Failed to get conversation history: {e}")
            return []

    async def _get_similar_conversations(
        self, 
        user_id: str, 
        current_message: str
    ) -> List[Dict[str, Any]]:
        """Get semantically similar conversations using vector search"""
        try:
            if not self.vector_memory_service:
                return []
            
            # Generate embedding for current message
            embedding = await self.embedding_service.embed_text(current_message)
            if not embedding:
                return []
            
            # Use the Supabase function for similarity search
            result = await self.vector_memory_service.supabase.rpc(
                'find_similar_conversations',
                {
                    'target_user_id': user_id,
                    'query_embedding': embedding,
                    'similarity_threshold': self.similarity_threshold,
                    'max_results': self.max_similar_conversations
                }
            ).execute()
            
            return result.data or []
            
        except Exception as e:
            logger.error(f"Failed to get similar conversations: {e}")
            return []

    async def _get_relevant_preferences(
        self, 
        user_id: str, 
        current_message: str
    ) -> List[Dict[str, Any]]:
        """Get relevant user preferences using vector search"""
        try:
            if not self.vector_memory_service:
                return []
            
            embedding = await self.embedding_service.embed_text(current_message)
            if not embedding:
                return []
            
            result = await self.vector_memory_service.supabase.rpc(
                'find_relevant_preferences',
                {
                    'target_user_id': user_id,
                    'query_embedding': embedding,
                    'similarity_threshold': 0.6,  # Lower threshold for preferences
                    'max_results': self.max_relevant_preferences
                }
            ).execute()
            
            return result.data or []
            
        except Exception as e:
            logger.error(f"Failed to get relevant preferences: {e}")
            return []

    async def _get_contextual_memories(
        self, 
        user_id: str, 
        current_message: str
    ) -> List[Dict[str, Any]]:
        """Get contextual memories using vector search"""
        try:
            if not self.vector_memory_service:
                return []
            
            embedding = await self.embedding_service.embed_text(current_message)
            if not embedding:
                return []
            
            result = await self.vector_memory_service.supabase.rpc(
                'find_contextual_memories',
                {
                    'target_user_id': user_id,
                    'query_embedding': embedding,
                    'similarity_threshold': self.similarity_threshold,
                    'max_results': self.max_contextual_memories
                }
            ).execute()
            
            return result.data or []
            
        except Exception as e:
            logger.error(f"Failed to get contextual memories: {e}")
            return []

    async def _get_user_knowledge_context(
        self, 
        user_id: str, 
        current_message: str
    ) -> Dict[str, Any]:
        """Get user knowledge context through memory node"""
        try:
            if not self.memory_node:
                return {}
            
            return await self.memory_node.semantic_memory_search(
                user_id, current_message, limit=3
            )
            
        except Exception as e:
            logger.error(f"Failed to get user knowledge context: {e}")
            return {}

    def _build_context_summary(
        self,
        conversation_history: List[Dict[str, Any]],
        similar_conversations: List[Dict[str, Any]],
        relevant_preferences: List[Dict[str, Any]],
        contextual_memories: List[Dict[str, Any]],
        user_knowledge: List[Dict[str, Any]],
        current_message: str
    ) -> str:
        """Build intelligent context summary for LLM consumption"""
        
        summary_parts = [f"User is asking: {current_message}"]
        
        # Recent conversation context
        if conversation_history:
            recent_topics = []
            for conv in conversation_history[:3]:
                if conv.get('message'):
                    recent_topics.append(conv['message'][:100])
            if recent_topics:
                summary_parts.append(f"Recent conversation topics: {'; '.join(recent_topics)}")
        
        # Similar past conversations
        if similar_conversations:
            similar_topics = []
            for conv in similar_conversations[:2]:
                if conv.get('user_message'):
                    similar_topics.append(f"Previously discussed: {conv['user_message'][:80]}")
            if similar_topics:
                summary_parts.append(f"Related past discussions: {'; '.join(similar_topics)}")
        
        # User preferences
        if relevant_preferences:
            prefs = []
            for pref in relevant_preferences:
                if pref.get('preference_key') and pref.get('preference_value'):
                    prefs.append(f"{pref['preference_key']}: {str(pref['preference_value'])[:50]}")
            if prefs:
                summary_parts.append(f"Relevant preferences: {'; '.join(prefs)}")
        
        # Contextual memories
        if contextual_memories:
            memories = []
            for mem in contextual_memories[:2]:
                if mem.get('memory_summary'):
                    memories.append(mem['memory_summary'][:80])
                elif mem.get('memory_content'):
                    memories.append(mem['memory_content'][:80])
            if memories:
                summary_parts.append(f"Relevant experiences: {'; '.join(memories)}")
        
        # User knowledge
        if user_knowledge:
            knowledge_topics = []
            for knowledge in user_knowledge[:2]:
                if knowledge.get('content'):
                    knowledge_topics.append(knowledge['content'][:60])
            if knowledge_topics:
                summary_parts.append(f"Personal knowledge: {'; '.join(knowledge_topics)}")
        
        return " | ".join(summary_parts)

    def _calculate_context_confidence(
        self,
        similar_conversations: List[Dict[str, Any]],
        relevant_preferences: List[Dict[str, Any]],
        contextual_memories: List[Dict[str, Any]],
        user_knowledge: List[Dict[str, Any]]
    ) -> float:
        """Calculate confidence score based on available context"""
        
        confidence = 0.1  # Base confidence
        
        # Similar conversations contribute most to confidence
        if similar_conversations:
            avg_similarity = sum(conv.get('similarity_score', 0) for conv in similar_conversations) / len(similar_conversations)
            confidence += min(avg_similarity * 0.4, 0.4)
        
        # Preferences add moderate confidence
        if relevant_preferences:
            avg_pref_confidence = sum(pref.get('confidence', 0) for pref in relevant_preferences) / len(relevant_preferences)
            confidence += min(avg_pref_confidence * 0.2, 0.2)
        
        # Contextual memories add context richness
        if contextual_memories:
            confidence += min(len(contextual_memories) * 0.05, 0.2)
        
        # User knowledge adds domain expertise
        if user_knowledge:
            confidence += min(len(user_knowledge) * 0.05, 0.1)
        
        return min(confidence, 1.0)

    async def store_conversation_context(
        self,
        user_id: str,
        user_message: str,
        pam_response: str,
        session_id: str,
        context_used: EnhancedContext,
        intent: str = None,
        confidence: float = None
    ) -> bool:
        """Store conversation with enhanced context for future retrieval"""
        try:
            # Store in traditional memory through memory node
            if self.memory_node:
                await self.memory_node.store_interaction(
                    user_id=user_id,
                    user_message=user_message,
                    pam_response=pam_response,
                    session_id=session_id,
                    intent=intent,
                    intent_confidence=confidence,
                    context_used={
                        'enhanced_context_used': True,
                        'context_confidence': context_used.confidence_score,
                        'retrieval_time_ms': context_used.retrieval_time_ms,
                        'context_sources': {
                            'similar_conversations': len(context_used.similar_conversations),
                            'relevant_preferences': len(context_used.relevant_preferences),
                            'contextual_memories': len(context_used.contextual_memories),
                            'user_knowledge': len(context_used.user_knowledge)
                        }
                    }
                )
            
            # Store in vector memory if available
            if self.vector_memory_service:
                await self.vector_memory_service.store_conversation_memory(
                    user_id=user_id,
                    user_message=user_message,
                    agent_response=pam_response,
                    context={
                        'session_id': session_id,
                        'enhanced_context_confidence': context_used.confidence_score,
                        'context_summary': context_used.context_summary[:500]  # Truncate for embedding
                    },
                    intent=intent,
                    confidence_score=confidence or 1.0
                )
            
            logger.debug(f"✅ Stored enhanced conversation context for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store conversation context: {e}")
            return False

    def get_service_status(self) -> Dict[str, Any]:
        """Get status of enhanced context retrieval services"""
        return {
            "initialized": self.initialized,
            "vector_memory_available": self.vector_memory_service is not None,
            "embedding_service_available": self.embedding_service is not None,
            "memory_node_available": self.memory_node is not None,
            "database_service_available": self.database_service is not None,
            "performance_config": {
                "max_similar_conversations": self.max_similar_conversations,
                "max_relevant_preferences": self.max_relevant_preferences,
                "max_contextual_memories": self.max_contextual_memories,
                "similarity_threshold": self.similarity_threshold,
                "context_window_hours": self.context_window_hours
            }
        }


# Global instance for reuse
_enhanced_context_retriever = None

async def get_enhanced_context_retriever() -> EnhancedContextRetriever:
    """Get singleton instance of enhanced context retriever"""
    global _enhanced_context_retriever
    
    if _enhanced_context_retriever is None:
        _enhanced_context_retriever = EnhancedContextRetriever()
        await _enhanced_context_retriever.initialize()
    
    return _enhanced_context_retriever