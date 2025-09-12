"""
RAG Integration Mixin for PAM Orchestrators
Provides plug-and-play RAG capabilities for any orchestrator
Can be mixed into existing orchestrators without major refactoring
"""

import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import asyncio

from app.services.pam.enhanced_context_retriever import (
    get_enhanced_context_retriever, 
    EnhancedContext
)

logger = logging.getLogger(__name__)

class RAGIntegrationMixin:
    """
    Mixin class that adds RAG (Retrieval-Augmented Generation) capabilities
    to any PAM orchestrator. Can be mixed into existing classes without
    breaking changes.
    
    Usage:
        class MyEnhancedOrchestrator(RAGIntegrationMixin, ExistingOrchestrator):
            pass
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._context_retriever = None
        self._rag_enabled = True
        self._context_cache = {}  # Simple session-based caching
        self._cache_ttl_seconds = 300  # 5 minutes
        
        # Performance settings
        self.rag_config = {
            'enable_vector_search': True,
            'enable_context_caching': True,
            'context_depth': 'standard',  # minimal, standard, deep
            'max_context_age_hours': 72,
            'similarity_threshold': 0.7,
            'use_parallel_retrieval': True
        }
        
        logger.info("🧠 RAG Integration Mixin initialized")

    async def _ensure_context_retriever(self):
        """Lazy initialization of context retriever"""
        if self._context_retriever is None:
            try:
                self._context_retriever = await get_enhanced_context_retriever()
                logger.info("✅ Enhanced context retriever ready")
            except Exception as e:
                logger.error(f"❌ Failed to initialize context retriever: {e}")
                self._rag_enabled = False

    async def enhance_message_with_rag(
        self,
        message: str,
        user_id: str,
        session_id: str = None,
        context: Dict[str, Any] = None,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Enhance a message with RAG-retrieved context
        
        Args:
            message: User's message
            user_id: User identifier
            session_id: Session identifier
            context: Existing context to enhance
            force_refresh: Skip cache and fetch fresh context
            
        Returns:
            Enhanced context dictionary with RAG information
        """
        if not self._rag_enabled:
            return context or {}
        
        try:
            await self._ensure_context_retriever()
            
            if not self._context_retriever:
                return context or {}
            
            # Check cache first (unless forcing refresh)
            cache_key = f"{user_id}:{session_id}:{hash(message)}"
            if not force_refresh and self.rag_config['enable_context_caching']:
                cached_context = self._get_cached_context(cache_key)
                if cached_context:
                    logger.debug(f"🎯 Using cached RAG context for user {user_id}")
                    return self._merge_contexts(context or {}, cached_context)
            
            # Retrieve enhanced context
            enhanced_context = await self._context_retriever.retrieve_enhanced_context(
                user_id=user_id,
                current_message=message,
                session_id=session_id,
                include_vector_search=self.rag_config['enable_vector_search'],
                context_depth=self.rag_config['context_depth']
            )
            
            # Convert to context dictionary
            rag_context = self._enhanced_context_to_dict(enhanced_context)
            
            # Cache the result
            if self.rag_config['enable_context_caching']:
                self._cache_context(cache_key, rag_context)
            
            # Merge with existing context
            final_context = self._merge_contexts(context or {}, rag_context)
            
            logger.info(f"🧠 RAG enhancement complete for user {user_id} "
                       f"(confidence: {enhanced_context.confidence_score:.2f}, "
                       f"time: {enhanced_context.retrieval_time_ms}ms)")
            
            return final_context
            
        except Exception as e:
            logger.error(f"Failed to enhance message with RAG: {e}")
            return context or {}

    async def store_rag_enhanced_conversation(
        self,
        user_id: str,
        user_message: str,
        assistant_response: str,
        session_id: str,
        enhanced_context: EnhancedContext = None,
        intent: str = None,
        confidence: float = None
    ) -> bool:
        """
        Store conversation with RAG context for future retrieval
        
        Args:
            user_id: User identifier
            user_message: User's message
            assistant_response: Assistant's response
            session_id: Session identifier
            enhanced_context: Enhanced context used
            intent: Detected intent
            confidence: Response confidence
            
        Returns:
            Success status
        """
        if not self._rag_enabled or not enhanced_context:
            return False
        
        try:
            await self._ensure_context_retriever()
            
            if self._context_retriever:
                return await self._context_retriever.store_conversation_context(
                    user_id=user_id,
                    user_message=user_message,
                    pam_response=assistant_response,
                    session_id=session_id,
                    context_used=enhanced_context,
                    intent=intent,
                    confidence=confidence
                )
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to store RAG-enhanced conversation: {e}")
            return False

    def _enhanced_context_to_dict(self, enhanced_context: EnhancedContext) -> Dict[str, Any]:
        """Convert EnhancedContext to dictionary format for orchestrator use"""
        return {
            'rag_enabled': True,
            'context_summary': enhanced_context.context_summary,
            'confidence_score': enhanced_context.confidence_score,
            'retrieval_time_ms': enhanced_context.retrieval_time_ms,
            'similar_conversations': enhanced_context.similar_conversations,
            'relevant_preferences': enhanced_context.relevant_preferences,
            'contextual_memories': enhanced_context.contextual_memories,
            'user_knowledge': enhanced_context.user_knowledge,
            'context_stats': {
                'similar_conversations_count': len(enhanced_context.similar_conversations),
                'preferences_count': len(enhanced_context.relevant_preferences),
                'memories_count': len(enhanced_context.contextual_memories),
                'knowledge_items_count': len(enhanced_context.user_knowledge)
            }
        }

    def _merge_contexts(self, base_context: Dict[str, Any], rag_context: Dict[str, Any]) -> Dict[str, Any]:
        """Intelligently merge base context with RAG-enhanced context"""
        merged = base_context.copy()
        
        # Add RAG-specific information
        merged.update(rag_context)
        
        # Create enhanced context summary
        if 'context_summary' in rag_context and rag_context['context_summary']:
            if 'user_context' in base_context:
                merged['user_context'] = f"{base_context['user_context']} | {rag_context['context_summary']}"
            else:
                merged['user_context'] = rag_context['context_summary']
        
        # Enhance conversation history if available
        if 'similar_conversations' in rag_context and rag_context['similar_conversations']:
            merged['conversation_memory'] = {
                'recent_history': base_context.get('conversation_history', []),
                'similar_past_conversations': rag_context['similar_conversations'][:3]
            }
        
        # Add preference context
        if 'relevant_preferences' in rag_context and rag_context['relevant_preferences']:
            merged['user_preferences_context'] = {
                'preferences': rag_context['relevant_preferences'],
                'preference_summary': self._summarize_preferences(rag_context['relevant_preferences'])
            }
        
        return merged

    def _summarize_preferences(self, preferences: List[Dict[str, Any]]) -> str:
        """Create a summary of user preferences for LLM consumption"""
        if not preferences:
            return ""
        
        pref_strings = []
        for pref in preferences:
            key = pref.get('preference_key', '')
            value = pref.get('preference_value', '')
            if key and value:
                pref_strings.append(f"{key}: {value}")
        
        return "; ".join(pref_strings) if pref_strings else ""

    def _get_cached_context(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached context if still valid"""
        if cache_key in self._context_cache:
            cached_data = self._context_cache[cache_key]
            cache_time = cached_data.get('timestamp', datetime.min)
            age_seconds = (datetime.now() - cache_time).total_seconds()
            
            if age_seconds < self._cache_ttl_seconds:
                return cached_data.get('context')
            else:
                # Remove expired cache
                del self._context_cache[cache_key]
        
        return None

    def _cache_context(self, cache_key: str, context: Dict[str, Any]):
        """Cache context with timestamp"""
        self._context_cache[cache_key] = {
            'context': context,
            'timestamp': datetime.now()
        }
        
        # Simple cache cleanup - keep only recent entries
        if len(self._context_cache) > 100:
            # Remove oldest entries
            sorted_keys = sorted(
                self._context_cache.keys(),
                key=lambda k: self._context_cache[k]['timestamp']
            )
            for key in sorted_keys[:-50]:  # Keep only most recent 50
                del self._context_cache[key]

    def configure_rag(self, config: Dict[str, Any]):
        """Update RAG configuration"""
        self.rag_config.update(config)
        logger.info(f"🔧 RAG configuration updated: {config}")

    def disable_rag(self):
        """Disable RAG functionality"""
        self._rag_enabled = False
        logger.info("❌ RAG functionality disabled")

    def enable_rag(self):
        """Enable RAG functionality"""
        self._rag_enabled = True
        logger.info("✅ RAG functionality enabled")

    def get_rag_status(self) -> Dict[str, Any]:
        """Get current RAG status and configuration"""
        return {
            'rag_enabled': self._rag_enabled,
            'context_retriever_available': self._context_retriever is not None,
            'config': self.rag_config,
            'cache_entries': len(self._context_cache),
            'cache_ttl_seconds': self._cache_ttl_seconds
        }

    async def process_message_with_rag(
        self,
        message: str,
        user_id: str,
        session_id: str = None,
        base_context: Dict[str, Any] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Process message with RAG enhancement
        This method should be called by orchestrators to add RAG capabilities
        
        Returns:
            Processing result with enhanced context
        """
        try:
            # Enhance context with RAG
            enhanced_context = await self.enhance_message_with_rag(
                message=message,
                user_id=user_id,
                session_id=session_id,
                context=base_context
            )
            
            # If the orchestrator has a standard process_message method, call it with enhanced context
            if hasattr(self, 'process_message'):
                result = await self.process_message(
                    message=message,
                    user_id=user_id,
                    context=enhanced_context,
                    **kwargs
                )
            else:
                # Fallback result structure
                result = {
                    'response': f"I understand you're asking about: {message}",
                    'context': enhanced_context,
                    'rag_enhanced': True
                }
            
            # Store the conversation if result contains a response
            if isinstance(result, dict) and 'response' in result:
                # Extract enhanced context object for storage
                if enhanced_context and enhanced_context.get('rag_enabled'):
                    # Convert back to EnhancedContext for storage (simplified)
                    from app.services.pam.enhanced_context_retriever import EnhancedContext
                    enhanced_obj = EnhancedContext(
                        similar_conversations=enhanced_context.get('similar_conversations', []),
                        relevant_preferences=enhanced_context.get('relevant_preferences', []),
                        contextual_memories=enhanced_context.get('contextual_memories', []),
                        user_knowledge=enhanced_context.get('user_knowledge', []),
                        context_summary=enhanced_context.get('context_summary', ''),
                        confidence_score=enhanced_context.get('confidence_score', 0.0),
                        retrieval_time_ms=enhanced_context.get('retrieval_time_ms', 0)
                    )
                    
                    await self.store_rag_enhanced_conversation(
                        user_id=user_id,
                        user_message=message,
                        assistant_response=result['response'],
                        session_id=session_id,
                        enhanced_context=enhanced_obj
                    )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to process message with RAG: {e}")
            # Fallback to base processing if available
            if hasattr(self, 'process_message'):
                return await self.process_message(message=message, user_id=user_id, **kwargs)
            else:
                return {
                    'response': f"I'm having trouble processing your request right now. You asked: {message}",
                    'error': str(e),
                    'rag_enhanced': False
                }


class RAGEnhancedUnifiedOrchestrator(RAGIntegrationMixin):
    """
    Example implementation showing how to create a RAG-enhanced orchestrator
    This can serve as a template for enhancing existing orchestrators
    """
    
    def __init__(self):
        super().__init__()
        logger.info("🚀 RAG-Enhanced Unified Orchestrator initialized")
    
    async def process_message(
        self,
        message: str,
        user_id: str,
        context: Dict[str, Any] = None,
        session_id: str = None
    ) -> Dict[str, Any]:
        """Process message with full RAG capabilities"""
        
        # Use the mixin's RAG-enhanced processing
        return await self.process_message_with_rag(
            message=message,
            user_id=user_id,
            session_id=session_id,
            base_context=context
        )

    async def simple_response(self, message: str, context: Dict[str, Any] = None) -> str:
        """Generate a simple response using enhanced context"""
        if not context:
            return f"I understand you're asking about: {message}"
        
        # Use RAG context to create more informed responses
        context_summary = context.get('context_summary', '')
        relevant_prefs = context.get('relevant_preferences', [])
        
        response_parts = [f"Based on your question: {message}"]
        
        if context_summary:
            response_parts.append(f"Given your context: {context_summary}")
        
        if relevant_prefs:
            pref_summary = "; ".join([
                f"{p.get('preference_key')}: {p.get('preference_value')}" 
                for p in relevant_prefs[:2] 
                if p.get('preference_key')
            ])
            if pref_summary:
                response_parts.append(f"Considering your preferences: {pref_summary}")
        
        return ". ".join(response_parts) + "."