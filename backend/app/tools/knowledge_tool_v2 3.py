"""
Knowledge Tool V2 - Scalable Architecture
Improved version using shared knowledge base with efficient partitioning
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from pydantic import BaseModel, Field

from ..services.knowledge.scalable_vector_store import ScalableVectorKnowledgeBase
from ..core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class SearchParams(BaseModel):
    """Parameters for knowledge search"""
    query: str = Field(min_length=1, description="Search query")
    category: Optional[str] = Field(None, description="Limit to specific category")
    user_id: Optional[str] = Field(None, description="User ID for personalized results")
    location: Optional[Tuple[float, float]] = Field(None, description="Location for geo-relevant results")
    max_results: int = Field(default=5, ge=1, le=20, description="Maximum results to return")

class AddKnowledgeParams(BaseModel):
    """Parameters for adding knowledge"""
    content: str = Field(min_length=1, description="Knowledge content")
    category: str = Field(description="Category for organization")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    source: str = Field(description="Source of knowledge")
    user_id: Optional[str] = Field(None, description="User ID for private knowledge")
    is_public: bool = Field(default=False, description="Share with community")

class KnowledgeToolV2:
    """
    Scalable Knowledge Tool for PAM
    
    Key improvements over V1:
    - Shared knowledge base for common information
    - User-specific namespacing without separate DBs
    - Efficient caching and lazy loading
    - Better resource utilization
    """
    
    def __init__(self):
        self.kb: Optional[ScalableVectorKnowledgeBase] = None
        self.is_initialized = False
        
    async def initialize(self):
        """Initialize the knowledge tool"""
        try:
            logger.info("🚀 Initializing Knowledge Tool V2...")
            
            # Initialize scalable knowledge base
            self.kb = ScalableVectorKnowledgeBase()
            await self.kb.initialize()
            
            self.is_initialized = True
            logger.info("✅ Knowledge Tool V2 initialized with scalable architecture")
            
            # Log statistics
            stats = await self.kb.get_statistics()
            logger.info(f"📊 Knowledge base stats: {stats}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Knowledge Tool V2: {e}")
            self.is_initialized = False
            raise
    
    async def search(self, params: SearchParams) -> List[Dict[str, Any]]:
        """
        Search for relevant knowledge
        
        Args:
            params: Search parameters
            
        Returns:
            List of search results with content and metadata
        """
        if not self.is_initialized or not self.kb:
            logger.warning("Knowledge Tool not initialized")
            return []
        
        try:
            # Perform search
            results = await self.kb.search(
                query=params.query,
                category=params.category,
                user_id=params.user_id,
                limit=params.max_results,
                include_public=True
            )
            
            # Format results for PAM
            formatted_results = []
            for result in results:
                formatted_results.append({
                    'content': result.content,
                    'metadata': result.metadata,
                    'source': result.source,
                    'score': result.score,
                    'relevance': result.relevance_reason,
                    'chunk_id': result.chunk_id
                })
            
            logger.info(f"Found {len(formatted_results)} results for query: {params.query}")
            return formatted_results
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []
    
    async def add_knowledge(self, params: AddKnowledgeParams) -> Dict[str, Any]:
        """
        Add new knowledge to the base
        
        Args:
            params: Knowledge parameters
            
        Returns:
            Result with chunk_id and status
        """
        if not self.is_initialized or not self.kb:
            logger.warning("Knowledge Tool not initialized")
            return {'success': False, 'error': 'Not initialized'}
        
        try:
            # Add knowledge
            chunk_id = await self.kb.add_knowledge(
                content=params.content,
                category=params.category,
                metadata=params.metadata,
                source=params.source,
                user_id=params.user_id,
                is_public=params.is_public
            )
            
            logger.info(f"Added knowledge chunk {chunk_id} to {params.category}")
            
            return {
                'success': True,
                'chunk_id': chunk_id,
                'category': params.category,
                'is_public': params.is_public
            }
            
        except Exception as e:
            logger.error(f"Add knowledge error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_recommendations(
        self,
        user_id: str,
        location: Optional[Tuple[float, float]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get personalized recommendations for a user
        
        Args:
            user_id: User identifier
            location: Current location
            context: Additional context (activity, budget, etc.)
            
        Returns:
            List of recommendations
        """
        if not self.is_initialized or not self.kb:
            logger.warning("Knowledge Tool not initialized")
            return []
        
        try:
            # Get recommendations
            results = await self.kb.get_recommendations(
                user_id=user_id,
                location=location,
                context=context
            )
            
            # Format for PAM
            recommendations = []
            for result in results:
                recommendations.append({
                    'content': result.content,
                    'metadata': result.metadata,
                    'source': result.source,
                    'score': result.score,
                    'reason': result.relevance_reason
                })
            
            logger.info(f"Generated {len(recommendations)} recommendations for user {user_id}")
            return recommendations
            
        except Exception as e:
            logger.error(f"Recommendation error: {e}")
            return []
    
    async def answer_question(
        self,
        question: str,
        user_id: Optional[str] = None,
        location: Optional[Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        """
        Answer a question using knowledge base
        
        Args:
            question: User's question
            user_id: User identifier for personalization
            location: Current location for context
            
        Returns:
            Answer with sources and confidence
        """
        if not self.is_initialized or not self.kb:
            return {
                'answer': "I'm not able to access my knowledge base right now.",
                'sources': [],
                'confidence': 0.0
            }
        
        try:
            # Search for relevant information
            search_params = SearchParams(
                query=question,
                user_id=user_id,
                max_results=5
            )
            
            results = await self.search(search_params)
            
            if not results:
                return {
                    'answer': "I don't have specific information about that in my knowledge base.",
                    'sources': [],
                    'confidence': 0.0
                }
            
            # Synthesize answer from top results
            top_result = results[0]
            answer = top_result['content']
            
            # Calculate confidence based on scores
            avg_score = sum(r['score'] for r in results) / len(results)
            
            return {
                'answer': answer,
                'sources': [r['source'] for r in results[:3]],
                'confidence': avg_score,
                'context': results
            }
            
        except Exception as e:
            logger.error(f"Question answering error: {e}")
            return {
                'answer': "I encountered an error while searching for information.",
                'sources': [],
                'confidence': 0.0
            }
    
    async def get_statistics(self) -> Dict[str, Any]:
        """Get knowledge base statistics"""
        if not self.is_initialized or not self.kb:
            return {'status': 'not_initialized'}
        
        try:
            stats = await self.kb.get_statistics()
            stats['status'] = 'operational'
            stats['version'] = 'v2-scalable'
            return stats
        except Exception as e:
            logger.error(f"Statistics error: {e}")
            return {'status': 'error', 'error': str(e)}
    
    async def cleanup(self):
        """Cleanup old data and optimize storage"""
        if not self.is_initialized or not self.kb:
            return
        
        try:
            await self.kb.cleanup_old_data(days=90)
            logger.info("Completed knowledge base cleanup")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
    
    async def shutdown(self):
        """Shutdown the knowledge tool"""
        try:
            if self.kb:
                await self.kb.close()
            
            self.is_initialized = False
            logger.info("🛑 Knowledge Tool V2 shutdown completed")
            
        except Exception as e:
            logger.error(f"Shutdown error: {e}")

# Singleton instance
knowledge_tool_v2 = KnowledgeToolV2()