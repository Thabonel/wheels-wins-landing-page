"""
Knowledge Tool for PAM
Integrates the vector knowledge base with PAM's orchestrator for intelligent query responses
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import json
from pydantic import BaseModel, Field, ValidationError

from ..services.knowledge.vector_store import VectorKnowledgeBase
from ..services.knowledge.ingestion_pipeline import KnowledgeIngestionPipeline
from ..services.scraping.enhanced_scraper import EnhancedScrapingService
from ..services.scraping.api_integrations import APIIntegrationService
from ..core.config import get_settings


class _SearchParams(BaseModel):
    query: str = Field(min_length=1)
    user_location: Optional[Tuple[float, float]] = None
    max_results: int = Field(default=5, ge=1, le=50)


class _RecommendationParams(BaseModel):
    user_location: Tuple[float, float]
    query: str = Field(default="restaurants and attractions", min_length=1)
    radius_km: float = Field(default=10.0, ge=0.1, le=100.0)


class _QuestionParams(BaseModel):
    question: str = Field(min_length=1)
    user_location: Optional[Tuple[float, float]] = None
    context: Optional[Dict[str, Any]] = None

logger = logging.getLogger(__name__)
settings = get_settings()

class KnowledgeTool:
    """Main tool for PAM to access vector knowledge base and real-time data"""
    
    def __init__(self):
        self.vector_store = None
        self.ingestion_pipeline = None
        self.is_initialized = False
        
    async def initialize(self):
        """Initialize the knowledge tool with all required services"""
        try:
            logger.info("🚀 Initializing Knowledge Tool for PAM...")
            
            # Initialize vector store
            self.vector_store = VectorKnowledgeBase()
            await self.vector_store.initialize_collections()
            
            # Initialize scraping and API services
            scraper = EnhancedScrapingService(self.vector_store)
            api_service = APIIntegrationService(self.vector_store)
            
            # Initialize ingestion pipeline
            self.ingestion_pipeline = KnowledgeIngestionPipeline(
                vector_store=self.vector_store,
                scraper=scraper,
                api_service=api_service
            )
            
            # Start continuous ingestion
            await self.ingestion_pipeline.start_continuous_ingestion()
            
            self.is_initialized = True
            logger.info("✅ Knowledge Tool initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Knowledge Tool: {e}")
            raise
    
    async def shutdown(self):
        """Cleanup and shutdown the knowledge tool"""
        try:
            if self.ingestion_pipeline:
                await self.ingestion_pipeline.stop_ingestion()
            
            if self.vector_store:
                # Check if close method exists before calling it
                if hasattr(self.vector_store, 'close'):
                    await self.vector_store.close()
                else:
                    logger.warning("⚠️ VectorKnowledgeBase instance doesn't have close method - cleaning up manually")
                    # Manual cleanup for older instances
                    if hasattr(self.vector_store, 'client'):
                        self.vector_store.client = None
                    if hasattr(self.vector_store, 'encoder'):
                        self.vector_store.encoder = None
                    if hasattr(self.vector_store, '_initialized'):
                        self.vector_store._initialized = False
            
            self.is_initialized = False
            logger.info("🛑 Knowledge Tool shutdown completed")
            
        except Exception as e:
            logger.error(f"❌ Error during Knowledge Tool shutdown: {e}")
    
    async def search_knowledge(
        self,
        query: str,
        user_location: Optional[Tuple[float, float]] = None,
        max_results: int = 5
    ) -> Dict[str, Any]:
        """Search the knowledge base for relevant information"""

        if not self.is_initialized:
            return {"error": "Knowledge Tool not initialized"}

        try:
            try:
                params = _SearchParams(query=query, user_location=user_location, max_results=max_results)
            except ValidationError as ve:
                logger.error(f"Input validation failed: {ve.errors()}")
                return {"error": "Invalid parameters"}

            query = params.query
            user_location = params.user_location
            max_results = params.max_results

            logger.info(f"🔍 Searching knowledge base for: '{query}'")
            
            # Determine appropriate collection to search
            collection_priority = self._determine_search_collections(query, user_location)
            
            all_results = []
            total_searched = 0
            
            # Search collections in priority order
            for collection_name in collection_priority:
                try:
                    results = await self.vector_store.search_similar(
                        collection_name=collection_name,
                        query_text=query,
                        max_results=max_results - len(all_results),
                        metadata_filter=self._build_location_filter(user_location) if user_location else None
                    )
                    
                    if results:
                        all_results.extend(results)
                        total_searched += 1
                        
                        # Stop if we have enough results
                        if len(all_results) >= max_results:
                            break
                            
                except Exception as e:
                    logger.warning(f"⚠️ Error searching collection {collection_name}: {e}")
                    continue
            
            # Process and rank results
            processed_results = self._process_search_results(all_results, query, user_location)
            
            return {
                "success": True,
                "query": query,
                "total_results": len(processed_results),
                "collections_searched": total_searched,
                "results": processed_results,
                "search_time": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Knowledge search failed: {e}")
            return {"error": f"Search failed: {str(e)}"}
    
    async def get_local_recommendations(
        self,
        user_location: Tuple[float, float],
        query: str = "restaurants and attractions",
        radius_km: float = 10.0
    ) -> Dict[str, Any]:
        """Get location-specific recommendations using real-time data"""

        if not self.is_initialized:
            return {"error": "Knowledge Tool not initialized"}

        try:
            try:
                params = _RecommendationParams(
                    user_location=user_location, query=query, radius_km=radius_km
                )
            except ValidationError as ve:
                logger.error(f"Input validation failed: {ve.errors()}")
                return {"error": "Invalid parameters"}

            user_location = params.user_location
            query = params.query
            radius_km = params.radius_km

            logger.info(
                f"📍 Getting local recommendations for ({user_location[0]:.4f}, {user_location[1]:.4f})"
            )
            
            # Add user location for real-time ingestion
            self.ingestion_pipeline.add_user_location(f"temp_{datetime.utcnow().timestamp()}", user_location)
            
            # Get API-based recommendations immediately
            api_service = self.ingestion_pipeline.api_service
            recommendations = await api_service.get_local_recommendations(
                user_location,
                preferences={"price_level": 3},
                radius_km=radius_km
            )
            
            # Search knowledge base for stored local information
            local_knowledge = await self.search_knowledge(
                query=f"local {query} near me",
                user_location=user_location,
                max_results=10
            )
            
            # Combine API results with knowledge base results
            combined_results = {
                "location": user_location,
                "radius_km": radius_km,
                "real_time_data": recommendations,
                "knowledge_base_results": local_knowledge.get("results", []),
                "recommendations": self._combine_recommendations(recommendations, local_knowledge),
                "generated_at": datetime.utcnow().isoformat()
            }
            
            return combined_results
            
        except Exception as e:
            logger.error(f"❌ Local recommendations failed: {e}")
            return {"error": f"Local recommendations failed: {str(e)}"}
    
    async def answer_travel_question(
        self,
        question: str,
        user_location: Optional[Tuple[float, float]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Answer travel-related questions using the knowledge base"""

        if not self.is_initialized:
            return {"error": "Knowledge Tool not initialized"}

        try:
            try:
                params = _QuestionParams(
                    question=question, user_location=user_location, context=context
                )
            except ValidationError as ve:
                logger.error(f"Input validation failed: {ve.errors()}")
                return {"error": "Invalid parameters"}

            question = params.question
            user_location = params.user_location
            context = params.context

            logger.info(f"❓ Answering travel question: '{question}'")
            
            # Search for relevant information
            search_results = await self.search_knowledge(
                query=question,
                user_location=user_location,
                max_results=8
            )
            
            if not search_results.get("success"):
                return {"error": "Failed to search knowledge base"}
            
            # Build context from search results
            knowledge_context = []
            for result in search_results.get("results", []):
                knowledge_context.append({
                    "content": result.get("content", ""),
                    "source": result.get("source", ""),
                    "relevance_score": result.get("distance", 0),
                    "metadata": result.get("metadata", {})
                })
            
            # Get location-specific data if user location provided
            location_data = None
            if user_location:
                location_data = await self.get_local_recommendations(
                    user_location, 
                    query=question,
                    radius_km=20.0
                )
            
            # Prepare structured answer
            answer = {
                "question": question,
                "answer_type": self._classify_question(question),
                "knowledge_sources": knowledge_context[:5],  # Top 5 most relevant
                "location_specific_data": location_data,
                "confidence_score": self._calculate_confidence(knowledge_context),
                "generated_at": datetime.utcnow().isoformat(),
                "has_real_time_data": location_data is not None
            }
            
            return answer
            
        except Exception as e:
            logger.error(f"❌ Travel question answering failed: {e}")
            return {"error": f"Question answering failed: {str(e)}"}
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get status of the knowledge system"""
        
        try:
            status = {
                "initialized": self.is_initialized,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            if self.is_initialized:
                # Get vector store stats
                if self.vector_store:
                    vector_stats = await self.vector_store.get_collection_stats()
                    status["vector_store"] = vector_stats
                
                # Get ingestion pipeline stats
                if self.ingestion_pipeline:
                    pipeline_stats = self.ingestion_pipeline.get_statistics()
                    job_status = self.ingestion_pipeline.get_job_status()
                    status["ingestion_pipeline"] = {
                        "statistics": pipeline_stats,
                        "jobs": job_status
                    }
            
            return status
            
        except Exception as e:
            logger.error(f"❌ Failed to get system status: {e}")
            return {"error": f"Status check failed: {str(e)}"}
    
    def _determine_search_collections(
        self, 
        query: str, 
        user_location: Optional[Tuple[float, float]]
    ) -> List[str]:
        """Determine which collections to search based on query and location"""
        
        query_lower = query.lower()
        collections = []
        
        # Location-dependent queries
        if user_location and any(keyword in query_lower for keyword in 
                               ["near me", "nearby", "local", "restaurant", "hotel", "attraction"]):
            collections.extend(["location_data", "local_businesses"])
        
        # Real-time data queries
        if any(keyword in query_lower for keyword in ["weather", "traffic", "current"]):
            collections.append("real_time_data")
        
        # Travel-specific queries
        if any(keyword in query_lower for keyword in 
               ["travel", "trip", "camping", "rv", "caravan", "road trip"]):
            collections.extend(["travel_guides", "general_knowledge"])
        
        # General knowledge as fallback
        if not collections:
            collections = ["general_knowledge", "travel_guides"]
        
        # Add real-time and location data if available
        if user_location:
            collections.extend(["real_time_data", "location_data"])
        
        # Remove duplicates while preserving order
        seen = set()
        return [col for col in collections if not (col in seen or seen.add(col))]
    
    def _build_location_filter(self, user_location: Tuple[float, float]) -> Dict[str, Any]:
        """Build metadata filter for location-based searches"""
        lat, lon = user_location
        
        # Define search radius (in degrees, roughly 50km)
        radius = 0.45
        
        return {
            "latitude": {"$gte": lat - radius, "$lte": lat + radius},
            "longitude": {"$gte": lon - radius, "$lte": lon + radius}
        }
    
    def _process_search_results(
        self, 
        results: List[Dict[str, Any]], 
        query: str,
        user_location: Optional[Tuple[float, float]]
    ) -> List[Dict[str, Any]]:
        """Process and enhance search results"""
        
        processed = []
        
        for result in results:
            processed_result = {
                "content": result.get("content", ""),
                "source": result.get("source", ""),
                "relevance_score": 1.0 - result.get("distance", 0),  # Convert distance to relevance
                "metadata": result.get("metadata", {}),
                "chunk_id": result.get("chunk_id", "")
            }
            
            # Add location-specific enhancements
            if user_location and "latitude" in processed_result["metadata"]:
                try:
                    item_lat = float(processed_result["metadata"]["latitude"])
                    item_lon = float(processed_result["metadata"]["longitude"])
                    
                    # Calculate distance
                    lat_diff = item_lat - user_location[0]
                    lon_diff = item_lon - user_location[1]
                    distance = (lat_diff**2 + lon_diff**2)**0.5 * 111  # Rough km
                    
                    processed_result["distance_km"] = round(distance, 2)
                    processed_result["location_relevance"] = max(0, 1 - (distance / 50))  # Relevance based on 50km max
                    
                except (ValueError, TypeError):
                    pass
            
            processed.append(processed_result)
        
        # Sort by combined relevance and location scores
        processed.sort(key=lambda x: (
            x.get("relevance_score", 0) * 0.7 + 
            x.get("location_relevance", 0) * 0.3
        ), reverse=True)
        
        return processed
    
    def _combine_recommendations(
        self, 
        api_results: Dict[str, Any], 
        knowledge_results: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Combine API results with knowledge base results"""
        
        combined = []
        
        # Process API results
        for category, items in api_results.items():
            if isinstance(items, list):
                for item in items[:3]:  # Top 3 from each category
                    combined.append({
                        **item,
                        "data_source": "real_time_api",
                        "category": category
                    })
            elif items and category == "current_weather":
                combined.append({
                    **items,
                    "data_source": "real_time_api",
                    "category": "weather"
                })
        
        # Process knowledge base results
        for result in knowledge_results.get("results", [])[:5]:
            combined.append({
                "name": self._extract_name_from_content(result.get("content", "")),
                "description": result.get("content", ""),
                "source": result.get("source", ""),
                "data_source": "knowledge_base",
                "relevance_score": result.get("relevance_score", 0)
            })
        
        # Sort by relevance/rating
        combined.sort(key=lambda x: (
            x.get("rating", 0) if "rating" in x else x.get("relevance_score", 0)
        ), reverse=True)
        
        return combined[:10]  # Return top 10 recommendations
    
    def _classify_question(self, question: str) -> str:
        """Classify the type of travel question"""
        question_lower = question.lower()
        
        if any(word in question_lower for word in ["where", "location", "place"]):
            return "location_inquiry"
        elif any(word in question_lower for word in ["how", "way", "route"]):
            return "travel_guidance"
        elif any(word in question_lower for word in ["weather", "temperature", "rain"]):
            return "weather_inquiry"
        elif any(word in question_lower for word in ["restaurant", "food", "eat"]):
            return "dining_inquiry"
        elif any(word in question_lower for word in ["hotel", "accommodation", "stay"]):
            return "accommodation_inquiry"
        else:
            return "general_travel"
    
    def _calculate_confidence(self, knowledge_context: List[Dict[str, Any]]) -> float:
        """Calculate confidence score based on available knowledge"""
        if not knowledge_context:
            return 0.0
        
        # Base confidence on number and quality of sources
        num_sources = len(knowledge_context)
        avg_relevance = sum(item.get("relevance_score", 0) for item in knowledge_context) / num_sources
        
        # Confidence increases with more sources and higher relevance
        confidence = min(1.0, (num_sources / 5) * 0.5 + avg_relevance * 0.5)
        
        return round(confidence, 2)
    
    def _extract_name_from_content(self, content: str) -> str:
        """Extract a name/title from content text"""
        # Simple extraction - take first part before |, or first sentence
        if "|" in content:
            return content.split("|")[0].strip()
        
        sentences = content.split(".")
        if sentences:
            return sentences[0].strip()[:100]  # Limit length
        
        return content[:50] + "..." if len(content) > 50 else content

# Global instance for PAM
knowledge_tool = KnowledgeTool()