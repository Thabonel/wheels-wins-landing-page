"""
Vector Knowledge Base Service
Provides vector-based knowledge storage and retrieval using ChromaDB
"""

import asyncio
import logging
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta

# Optional imports for deployment compatibility
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    chromadb = None
    Settings = None

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    SentenceTransformer = None

import numpy as np
from pydantic import BaseModel

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

class SearchResult(BaseModel):
    """Represents a search result from the vector store"""
    content: str
    metadata: Dict[str, Any]
    score: float
    source: str
    chunk_id: str

class VectorKnowledgeBase:
    """Vector-based knowledge storage and retrieval system"""
    
    def __init__(self, persist_directory: str = "./data/chroma_db"):
        self.persist_directory = Path(persist_directory)
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        
        # Check for required dependencies
        if not CHROMADB_AVAILABLE:
            logger.warning("⚠️ ChromaDB not available - vector knowledge base will use fallback mode")
            self.client = None
            self.encoder = None
            self._fallback_mode = True
            self.collections = {}
            self._initialized = False
            return
        
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            logger.warning("⚠️ Sentence Transformers not available - vector knowledge base will use fallback mode")
            self.client = None
            self.encoder = None
            self._fallback_mode = True
            self.collections = {}
            self._initialized = False
            return
        
        self._fallback_mode = False
        
        # Initialize ChromaDB with persistence
        try:
            self.client = chromadb.PersistentClient(
                path=str(self.persist_directory),
                settings=Settings(
                    allow_reset=True,
                    anonymized_telemetry=False
                )
            )
        except Exception as e:
            logger.error(f"❌ Failed to initialize ChromaDB: {e}")
            self._fallback_mode = True
            self.client = None
            self.encoder = None
            self.collections = {}
            self._initialized = False
            return
        
        # Initialize sentence transformer for embeddings
        try:
            self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("✅ Sentence transformer model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load sentence transformer: {e}")
            self._fallback_mode = True
            self.client = None
            self.encoder = None
            self.collections = {}
            self._initialized = False
            return
        
        # Define collections for different types of knowledge
        self.collections = {
            'general_knowledge': None,
            'local_businesses': None,
            'travel_guides': None,
            'user_conversations': None,
            'real_time_data': None,
            'location_data': None
        }
        
        self._initialized = False
    
    async def initialize_collections(self) -> bool:
        """Initialize all knowledge collections"""
        if self._fallback_mode:
            logger.info("📚 Knowledge base running in fallback mode - skipping vector collections")
            self._initialized = True
            return True
            
        try:
            for collection_name in self.collections.keys():
                try:
                    # Try to get existing collection
                    collection = self.client.get_collection(name=collection_name)
                    logger.info(f"📚 Found existing collection: {collection_name}")
                except ValueError:
                    # Create new collection if it doesn't exist
                    collection = self.client.create_collection(
                        name=collection_name,
                        metadata={
                            "hnsw:space": "cosine",
                            "hnsw:construction_ef": 100,
                            "hnsw:M": 16
                        }
                    )
                    logger.info(f"🆕 Created new collection: {collection_name}")
                
                self.collections[collection_name] = collection
            
            self._initialized = True
            logger.info("✅ All vector collections initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize collections: {e}")
            return False
    
    async def add_documents(
        self, 
        collection_name: str, 
        documents: List[DocumentChunk]
    ) -> List[str]:
        """Add documents to specified collection"""
        if self._fallback_mode:
            logger.info(f"📚 Knowledge base in fallback mode - skipping document addition to {collection_name}")
            return []
            
        if not self._initialized:
            await self.initialize_collections()
        
        if collection_name not in self.collections:
            raise ValueError(f"Collection {collection_name} not found")
        
        collection = self.collections[collection_name]
        
        try:
            # Prepare data for ChromaDB
            chunk_ids = []
            contents = []
            metadatas = []
            
            for doc in documents:
                chunk_id = doc.chunk_id or str(uuid.uuid4())
                chunk_ids.append(chunk_id)
                contents.append(doc.content)
                
                # Prepare metadata with required fields
                metadata = {
                    **doc.metadata,
                    "source": doc.source,
                    "created_at": (doc.created_at or datetime.utcnow()).isoformat(),
                    "content_length": len(doc.content)
                }
                metadatas.append(metadata)
            
            # Generate embeddings
            logger.info(f"🔢 Generating embeddings for {len(documents)} documents...")
            embeddings = self.encoder.encode(contents).tolist()
            
            # Add to collection
            collection.add(
                documents=contents,
                metadatas=metadatas,
                ids=chunk_ids,
                embeddings=embeddings
            )
            
            logger.info(f"✅ Added {len(documents)} documents to {collection_name}")
            return chunk_ids
            
        except Exception as e:
            logger.error(f"❌ Failed to add documents to {collection_name}: {e}")
            raise
    
    async def similarity_search(
        self,
        query: str,
        collection_name: str,
        k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[SearchResult]:
        """Search for similar documents in the specified collection"""
        if self._fallback_mode:
            logger.info(f"📚 Knowledge base in fallback mode - returning empty search results for: {query}")
            return []
            
        if not self._initialized:
            await self.initialize_collections()
        
        if collection_name not in self.collections:
            raise ValueError(f"Collection {collection_name} not found")
        
        collection = self.collections[collection_name]
        
        try:
            # Generate query embedding
            query_embedding = self.encoder.encode([query]).tolist()[0]
            
            # Prepare where clause for filtering
            where_clause = filter_metadata if filter_metadata else None
            
            # Search in collection
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=k,
                where=where_clause,
                include=["documents", "metadatas", "distances"]
            )
            
            # Process results
            search_results = []
            if results['documents'] and results['documents'][0]:
                for i, doc in enumerate(results['documents'][0]):
                    search_result = SearchResult(
                        content=doc,
                        metadata=results['metadatas'][0][i],
                        score=1.0 - results['distances'][0][i],  # Convert distance to similarity
                        source=results['metadatas'][0][i].get('source', 'unknown'),
                        chunk_id=results['ids'][0][i]
                    )
                    search_results.append(search_result)
            
            logger.info(f"🔍 Found {len(search_results)} results for query in {collection_name}")
            return search_results
            
        except Exception as e:
            logger.error(f"❌ Failed to search in {collection_name}: {e}")
            raise
    
    async def location_aware_search(
        self,
        query: str,
        user_lat: float,
        user_lon: float,
        radius_km: float = 10.0,
        k: int = 5
    ) -> List[SearchResult]:
        """Search for location-relevant documents"""
        # Search in location_data collection with geographic filtering
        filter_metadata = {
            "$and": [
                {"latitude": {"$gte": user_lat - (radius_km / 111.0)}},
                {"latitude": {"$lte": user_lat + (radius_km / 111.0)}},
                {"longitude": {"$gte": user_lon - (radius_km / 111.0)}},
                {"longitude": {"$lte": user_lon + (radius_km / 111.0)}}
            ]
        }
        
        # First try location-specific search
        location_results = await self.similarity_search(
            query, 
            "location_data", 
            k=k//2, 
            filter_metadata=filter_metadata
        )
        
        # Then get general business results
        business_results = await self.similarity_search(
            query,
            "local_businesses",
            k=k//2
        )
        
        # Combine and sort by relevance
        all_results = location_results + business_results
        all_results.sort(key=lambda x: x.score, reverse=True)
        
        return all_results[:k]
    
    async def get_recent_conversations(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[SearchResult]:
        """Get recent conversation history for a user"""
        filter_metadata = {"user_id": user_id}
        
        results = await self.similarity_search(
            "", 
            "user_conversations", 
            k=limit,
            filter_metadata=filter_metadata
        )
        
        # Sort by creation time (most recent first)
        results.sort(
            key=lambda x: x.metadata.get('created_at', ''), 
            reverse=True
        )
        
        return results
    
    async def add_conversation_memory(
        self,
        user_id: str,
        conversation_text: str,
        intent: str,
        entities: Dict[str, Any]
    ) -> str:
        """Add conversation to memory for future reference"""
        doc = DocumentChunk(
            content=conversation_text,
            metadata={
                "user_id": user_id,
                "intent": intent,
                "entities": entities,
                "conversation_type": "user_interaction"
            },
            source="conversation_memory",
            created_at=datetime.utcnow()
        )
        
        chunk_ids = await self.add_documents("user_conversations", [doc])
        return chunk_ids[0]
    
    async def cleanup_old_data(self, days_old: int = 30):
        """Clean up old data from collections"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        cutoff_iso = cutoff_date.isoformat()
        
        for collection_name, collection in self.collections.items():
            if collection_name == "real_time_data":
                try:
                    # Delete old real-time data
                    results = collection.get(
                        where={"created_at": {"$lt": cutoff_iso}},
                        include=["documents"]
                    )
                    
                    if results['ids']:
                        collection.delete(ids=results['ids'])
                        logger.info(f"🧹 Cleaned {len(results['ids'])} old records from {collection_name}")
                        
                except Exception as e:
                    logger.error(f"❌ Failed to cleanup {collection_name}: {e}")
    
    async def get_collection_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all collections"""
        stats = {}
        
        for collection_name, collection in self.collections.items():
            try:
                count = collection.count()
                stats[collection_name] = {
                    "document_count": count,
                    "status": "healthy" if count >= 0 else "error"
                }
            except Exception as e:
                stats[collection_name] = {
                    "document_count": 0,
                    "status": "error",
                    "error": str(e)
                }
        
        return stats
    
    async def health_check(self) -> Dict[str, Any]:
        """Check the health of the vector knowledge base"""
        try:
            # Test basic operations
            if not self._initialized:
                await self.initialize_collections()
            
            # Test embedding generation
            test_embedding = self.encoder.encode(["test query"])
            
            # Get collection stats
            stats = await self.get_collection_stats()
            
            total_docs = sum(
                stat["document_count"] 
                for stat in stats.values() 
                if stat["status"] == "healthy"
            )
            
            return {
                "status": "healthy",
                "initialized": self._initialized,
                "total_documents": total_docs,
                "collections": stats,
                "embedding_model": "all-MiniLM-L6-v2",
                "embedding_dimensions": len(test_embedding[0])
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "initialized": self._initialized
            }

    async def close(self):
        """Close the vector knowledge base and cleanup resources"""
        try:
            logger.info("🛑 Closing vector knowledge base...")
            
            if self._fallback_mode:
                logger.info("✅ Fallback mode - no resources to cleanup")
                return
            
            # Reset ChromaDB client to close connections
            if self.client:
                try:
                    # ChromaDB doesn't have explicit close method, but we can reset
                    # Clear our references
                    self.collections.clear()
                    self.client = None
                    logger.info("✅ ChromaDB client closed")
                except Exception as e:
                    logger.warning(f"⚠️ ChromaDB cleanup warning: {e}")
            
            # Clear encoder reference
            if self.encoder:
                self.encoder = None
                logger.info("✅ Sentence transformer encoder cleared")
            
            self._initialized = False
            logger.info("✅ Vector knowledge base closed successfully")
            
        except Exception as e:
            logger.error(f"❌ Error closing vector knowledge base: {e}")

# Global instance
vector_kb = VectorKnowledgeBase()