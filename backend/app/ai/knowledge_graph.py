"""
PAM Knowledge Graph Integration System
Implements advanced knowledge representation, semantic relationships,
and graph-based reasoning for enhanced AI understanding and inference.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union, Set
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
import networkx as nx
from collections import defaultdict, deque
import hashlib
import openai
from openai import AsyncOpenAI
import uuid

from app.core.config import get_settings
from app.services.database import get_database
from app.services.embeddings import VectorEmbeddingService

settings = get_settings()
logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

class EntityType(Enum):
    """Types of entities in the knowledge graph"""
    PERSON = "person"
    PLACE = "place"
    CONCEPT = "concept"
    EVENT = "event"
    ORGANIZATION = "organization"
    OBJECT = "object"
    SKILL = "skill"
    GOAL = "goal"
    PREFERENCE = "preference"
    MEMORY = "memory"
    TOPIC = "topic"
    RELATIONSHIP = "relationship"

class RelationType(Enum):
    """Types of relationships in the knowledge graph"""
    # Hierarchical relationships
    IS_A = "is_a"
    PART_OF = "part_of"
    CONTAINS = "contains"
    
    # Associative relationships
    RELATES_TO = "relates_to"
    SIMILAR_TO = "similar_to"
    OPPOSITE_TO = "opposite_to"
    
    # Temporal relationships
    BEFORE = "before"
    AFTER = "after"
    DURING = "during"
    
    # Causal relationships
    CAUSES = "causes"
    ENABLES = "enables"
    PREVENTS = "prevents"
    
    # Social relationships
    KNOWS = "knows"
    WORKS_WITH = "works_with"
    FRIEND_OF = "friend_of"
    
    # Functional relationships
    USES = "uses"
    CREATES = "creates"
    MODIFIES = "modifies"
    
    # Preferential relationships
    LIKES = "likes"
    DISLIKES = "dislikes"
    INTERESTED_IN = "interested_in"

class ConfidenceLevel(Enum):
    """Confidence levels for knowledge assertions"""
    VERY_LOW = 0.1
    LOW = 0.3
    MODERATE = 0.5
    HIGH = 0.7
    VERY_HIGH = 0.9

@dataclass
class KnowledgeEntity:
    """Represents an entity in the knowledge graph"""
    entity_id: str
    entity_type: EntityType
    name: str
    description: str
    properties: Dict[str, Any]
    embedding: Optional[List[float]]
    confidence: float
    created_at: datetime
    last_updated: datetime
    source: str
    user_id: Optional[str]

@dataclass
class KnowledgeRelationship:
    """Represents a relationship between entities"""
    relationship_id: str
    source_entity_id: str
    target_entity_id: str
    relation_type: RelationType
    properties: Dict[str, Any]
    confidence: float
    weight: float
    created_at: datetime
    last_updated: datetime
    source: str
    evidence: List[str]

@dataclass
class GraphQuery:
    """Represents a query against the knowledge graph"""
    query_id: str
    query_text: str
    query_type: str
    parameters: Dict[str, Any]
    user_id: Optional[str]
    created_at: datetime

@dataclass
class GraphQueryResult:
    """Results from a knowledge graph query"""
    query_id: str
    entities: List[KnowledgeEntity]
    relationships: List[KnowledgeRelationship]
    subgraph: Dict[str, Any]
    reasoning_path: List[str]
    confidence: float
    execution_time: float
    metadata: Dict[str, Any]

@dataclass
class KnowledgeInsight:
    """Insights derived from knowledge graph analysis"""
    insight_id: str
    insight_type: str
    description: str
    entities_involved: List[str]
    relationships_involved: List[str]
    confidence: float
    supporting_evidence: List[str]
    implications: List[str]
    generated_at: datetime

class PAMKnowledgeGraphSystem:
    """
    Advanced knowledge graph system for PAM.
    
    Features:
    - Dynamic knowledge entity extraction and creation
    - Multi-type relationship modeling and inference
    - Graph-based reasoning and query processing
    - Semantic similarity and clustering
    - Temporal knowledge evolution tracking
    - User-specific knowledge personalization
    - Cross-domain knowledge integration
    - Automated knowledge validation and confidence scoring
    """
    
    def __init__(self):
        self.db = get_database()
        self.embedding_service = VectorEmbeddingService()
        
        # In-memory knowledge graph for fast access
        self.knowledge_graph = nx.MultiDiGraph()
        self.entity_cache = {}
        self.relationship_cache = {}
        
        # Knowledge extraction patterns
        self.entity_extraction_patterns = self._initialize_extraction_patterns()
        
        # Graph analysis tools
        self.centrality_cache = {}
        self.community_cache = {}
        self.path_cache = {}
        
        # Configuration
        self.max_graph_size = 10000
        self.similarity_threshold = 0.8
        self.confidence_threshold = 0.6
        self.max_reasoning_depth = 5
        self.entity_merge_threshold = 0.9
        
        # Initialize knowledge graph
        asyncio.create_task(self._initialize_knowledge_graph())
    
    async def _initialize_knowledge_graph(self):
        """Initialize the knowledge graph system"""
        try:
            # Load existing knowledge graph from database
            await self._load_knowledge_graph()
            
            # Initialize core domain knowledge
            await self._initialize_core_knowledge()
            
            logger.info(f"Knowledge graph initialized with {len(self.entity_cache)} entities and {len(self.relationship_cache)} relationships")
            
        except Exception as e:
            logger.error(f"Error initializing knowledge graph: {e}")
    
    async def extract_knowledge_from_text(
        self,
        text: str,
        user_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        source: str = "conversation"
    ) -> Tuple[List[KnowledgeEntity], List[KnowledgeRelationship]]:
        """
        Extract knowledge entities and relationships from text.
        
        Args:
            text: Text to extract knowledge from
            user_id: User identifier for personalized knowledge
            context: Additional context information
            source: Source of the knowledge
            
        Returns:
            Tuple of extracted entities and relationships
        """
        try:
            # Use AI to extract structured knowledge
            extraction_result = await self._ai_knowledge_extraction(text, context)
            
            # Create knowledge entities
            entities = []
            for entity_data in extraction_result.get("entities", []):
                entity = await self._create_knowledge_entity(
                    entity_data, user_id, source
                )
                if entity:
                    entities.append(entity)
            
            # Create knowledge relationships
            relationships = []
            for rel_data in extraction_result.get("relationships", []):
                relationship = await self._create_knowledge_relationship(
                    rel_data, source
                )
                if relationship:
                    relationships.append(relationship)
            
            # Add to knowledge graph
            await self._add_to_knowledge_graph(entities, relationships)
            
            # Update embeddings
            await self._update_entity_embeddings(entities)
            
            # Detect and merge similar entities
            await self._detect_and_merge_similar_entities(entities)
            
            # Store in database
            await self._store_knowledge_batch(entities, relationships)
            
            return entities, relationships
            
        except Exception as e:
            logger.error(f"Error extracting knowledge from text: {e}")
            return [], []
    
    async def query_knowledge_graph(
        self,
        query: str,
        query_type: str = "semantic_search",
        user_id: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None
    ) -> GraphQueryResult:
        """
        Query the knowledge graph with natural language or structured queries.
        
        Args:
            query: Natural language query
            query_type: Type of query (semantic_search, path_finding, reasoning)
            user_id: User identifier for personalized results
            parameters: Additional query parameters
            
        Returns:
            Query results with entities, relationships, and reasoning
        """
        try:
            start_time = datetime.utcnow()
            query_id = f"query_{start_time.strftime('%Y%m%d_%H%M%S_%f')}"
            
            # Create graph query record
            graph_query = GraphQuery(
                query_id=query_id,
                query_text=query,
                query_type=query_type,
                parameters=parameters or {},
                user_id=user_id,
                created_at=start_time
            )
            
            # Process query based on type
            if query_type == "semantic_search":
                result = await self._semantic_search(query, user_id, parameters)
            elif query_type == "path_finding":
                result = await self._find_knowledge_paths(query, parameters)
            elif query_type == "reasoning":
                result = await self._graph_reasoning(query, user_id, parameters)
            elif query_type == "exploration":
                result = await self._explore_knowledge_neighborhood(query, parameters)
            else:
                result = await self._generic_graph_query(query, user_id, parameters)
            
            # Calculate execution time
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Create query result
            query_result = GraphQueryResult(
                query_id=query_id,
                entities=result.get("entities", []),
                relationships=result.get("relationships", []),
                subgraph=result.get("subgraph", {}),
                reasoning_path=result.get("reasoning_path", []),
                confidence=result.get("confidence", 0.5),
                execution_time=execution_time,
                metadata={
                    "query_type": query_type,
                    "parameters": parameters or {},
                    "user_specific": user_id is not None,
                    "graph_size_at_query": len(self.entity_cache)
                }
            )
            
            # Store query for learning
            await self._store_graph_query(graph_query, query_result)
            
            return query_result
            
        except Exception as e:
            logger.error(f"Error querying knowledge graph: {e}")
            return self._create_empty_query_result(query)
    
    async def perform_knowledge_inference(
        self,
        premise_entities: List[str],
        inference_type: str = "transitive",
        max_depth: int = None
    ) -> List[KnowledgeInsight]:
        """
        Perform knowledge inference to derive new insights.
        
        Args:
            premise_entities: Starting entities for inference
            inference_type: Type of inference to perform
            max_depth: Maximum depth for inference chains
            
        Returns:
            List of derived knowledge insights
        """
        try:
            insights = []
            max_depth = max_depth or self.max_reasoning_depth
            
            for entity_id in premise_entities:
                if entity_id not in self.entity_cache:
                    continue
                
                # Perform different types of inference
                if inference_type == "transitive":
                    entity_insights = await self._transitive_inference(entity_id, max_depth)
                elif inference_type == "analogical":
                    entity_insights = await self._analogical_inference(entity_id)
                elif inference_type == "causal":
                    entity_insights = await self._causal_inference(entity_id, max_depth)
                elif inference_type == "similarity":
                    entity_insights = await self._similarity_inference(entity_id)
                else:
                    entity_insights = await self._general_inference(entity_id, max_depth)
                
                insights.extend(entity_insights)
            
            # Rank insights by confidence and uniqueness
            insights = await self._rank_insights(insights)
            
            # Store insights
            await self._store_insights(insights)
            
            return insights
            
        except Exception as e:
            logger.error(f"Error performing knowledge inference: {e}")
            return []
    
    async def update_knowledge_confidence(
        self,
        entity_id: str,
        new_confidence: float,
        evidence: List[str],
        source: str = "validation"
    ) -> bool:
        """
        Update confidence level of knowledge based on validation or evidence.
        
        Args:
            entity_id: Entity to update
            new_confidence: New confidence score
            evidence: Supporting evidence
            source: Source of the update
            
        Returns:
            Success status
        """
        try:
            if entity_id not in self.entity_cache:
                return False
            
            entity = self.entity_cache[entity_id]
            old_confidence = entity.confidence
            
            # Update confidence using weighted average
            entity.confidence = (old_confidence + new_confidence) / 2
            entity.last_updated = datetime.utcnow()
            
            # Update in graph
            if self.knowledge_graph.has_node(entity_id):
                self.knowledge_graph.nodes[entity_id]['confidence'] = entity.confidence
                self.knowledge_graph.nodes[entity_id]['last_updated'] = entity.last_updated
            
            # Log confidence change
            confidence_change = {
                "entity_id": entity_id,
                "old_confidence": old_confidence,
                "new_confidence": entity.confidence,
                "evidence": evidence,
                "source": source,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Store update in database
            await self._store_confidence_update(confidence_change)
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating knowledge confidence: {e}")
            return False
    
    async def get_knowledge_analytics(
        self,
        user_id: Optional[str] = None,
        analytics_type: str = "overview"
    ) -> Dict[str, Any]:
        """
        Get analytics about the knowledge graph.
        
        Args:
            user_id: Optional user filter
            analytics_type: Type of analytics to generate
            
        Returns:
            Knowledge graph analytics
        """
        try:
            analytics = {
                "total_entities": len(self.entity_cache),
                "total_relationships": len(self.relationship_cache),
                "graph_density": nx.density(self.knowledge_graph),
                "entity_type_distribution": await self._get_entity_type_distribution(user_id),
                "relationship_type_distribution": await self._get_relationship_type_distribution(user_id),
                "average_confidence": await self._calculate_average_confidence(user_id),
                "knowledge_sources": await self._get_knowledge_sources(user_id),
                "temporal_distribution": await self._get_temporal_distribution(user_id)
            }
            
            if analytics_type == "detailed":
                analytics.update({
                    "centrality_metrics": await self._calculate_centrality_metrics(),
                    "community_detection": await self._detect_communities(),
                    "knowledge_gaps": await self._identify_knowledge_gaps(user_id),
                    "inference_opportunities": await self._identify_inference_opportunities()
                })
            
            if analytics_type == "user_specific" and user_id:
                analytics.update({
                    "user_knowledge_profile": await self._get_user_knowledge_profile(user_id),
                    "personalized_insights": await self._get_personalized_insights(user_id),
                    "knowledge_growth": await self._analyze_knowledge_growth(user_id)
                })
            
            return analytics
            
        except Exception as e:
            logger.error(f"Error getting knowledge analytics: {e}")
            return {"error": "Failed to generate knowledge analytics"}
    
    # Private methods for knowledge graph implementation
    
    async def _ai_knowledge_extraction(
        self,
        text: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Extract knowledge using AI"""
        try:
            context_str = json.dumps(context, indent=2) if context else "No additional context"
            
            extraction_prompt = f"""
            Extract structured knowledge from the following text. Identify entities and their relationships.
            
            Text: "{text}"
            Context: {context_str}
            
            Return a JSON object with:
            1. "entities": List of entities with name, type, description, and properties
            2. "relationships": List of relationships with source, target, relation_type, and properties
            
            Entity types: person, place, concept, event, organization, object, skill, goal, preference, memory, topic
            Relation types: is_a, part_of, relates_to, causes, enables, likes, knows, uses, creates, before, after, during
            
            Example format:
            {{
                "entities": [
                    {{"name": "Python", "type": "skill", "description": "Programming language", "properties": {{"difficulty": "intermediate"}}}},
                    {{"name": "Machine Learning", "type": "concept", "description": "AI subset", "properties": {{"field": "computer_science"}}}}
                ],
                "relationships": [
                    {{"source": "Python", "target": "Machine Learning", "relation_type": "enables", "properties": {{"strength": "high"}}}}
                ]
            }}
            """
            
            response = await client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert knowledge extraction system. Extract structured knowledge from text and return valid JSON."},
                    {"role": "user", "content": extraction_prompt}
                ],
                temperature=0.2,
                max_tokens=2000
            )
            
            # Parse JSON response
            extraction_result = json.loads(response.choices[0].message.content)
            return extraction_result
            
        except Exception as e:
            logger.error(f"Error in AI knowledge extraction: {e}")
            return {"entities": [], "relationships": []}
    
    async def _create_knowledge_entity(
        self,
        entity_data: Dict[str, Any],
        user_id: Optional[str],
        source: str
    ) -> Optional[KnowledgeEntity]:
        """Create a knowledge entity from extracted data"""
        try:
            entity_id = f"entity_{hashlib.md5(entity_data['name'].encode()).hexdigest()[:8]}"
            
            # Check if entity already exists
            if entity_id in self.entity_cache:
                # Update existing entity
                existing_entity = self.entity_cache[entity_id]
                existing_entity.properties.update(entity_data.get("properties", {}))
                existing_entity.last_updated = datetime.utcnow()
                return existing_entity
            
            # Create new entity
            entity = KnowledgeEntity(
                entity_id=entity_id,
                entity_type=EntityType(entity_data.get("type", "concept")),
                name=entity_data["name"],
                description=entity_data.get("description", ""),
                properties=entity_data.get("properties", {}),
                embedding=None,  # Will be generated later
                confidence=0.7,  # Default confidence for extracted entities
                created_at=datetime.utcnow(),
                last_updated=datetime.utcnow(),
                source=source,
                user_id=user_id
            )
            
            return entity
            
        except Exception as e:
            logger.error(f"Error creating knowledge entity: {e}")
            return None
    
    async def _create_knowledge_relationship(
        self,
        rel_data: Dict[str, Any],
        source: str
    ) -> Optional[KnowledgeRelationship]:
        """Create a knowledge relationship from extracted data"""
        try:
            # Find source and target entities
            source_entity_id = None
            target_entity_id = None
            
            for entity_id, entity in self.entity_cache.items():
                if entity.name == rel_data["source"]:
                    source_entity_id = entity_id
                if entity.name == rel_data["target"]:
                    target_entity_id = entity_id
            
            if not source_entity_id or not target_entity_id:
                return None
            
            relationship_id = f"rel_{source_entity_id}_{target_entity_id}_{rel_data['relation_type']}"
            
            relationship = KnowledgeRelationship(
                relationship_id=relationship_id,
                source_entity_id=source_entity_id,
                target_entity_id=target_entity_id,
                relation_type=RelationType(rel_data["relation_type"]),
                properties=rel_data.get("properties", {}),
                confidence=0.6,  # Default confidence for extracted relationships
                weight=rel_data.get("properties", {}).get("strength", 0.5),
                created_at=datetime.utcnow(),
                last_updated=datetime.utcnow(),
                source=source,
                evidence=[rel_data.get("evidence", "")]
            )
            
            return relationship
            
        except Exception as e:
            logger.error(f"Error creating knowledge relationship: {e}")
            return None
    
    async def _semantic_search(
        self,
        query: str,
        user_id: Optional[str],
        parameters: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Perform semantic search on the knowledge graph"""
        try:
            # Generate query embedding
            query_embedding = await self.embedding_service.generate_embedding(query)
            
            # Find similar entities
            similar_entities = []
            for entity_id, entity in self.entity_cache.items():
                if entity.embedding:
                    similarity = np.dot(query_embedding, entity.embedding)
                    if similarity > self.similarity_threshold:
                        similar_entities.append((entity, similarity))
            
            # Sort by similarity
            similar_entities.sort(key=lambda x: x[1], reverse=True)
            
            # Get top entities
            top_entities = [entity for entity, _ in similar_entities[:10]]
            
            # Find related relationships
            related_relationships = []
            for entity in top_entities:
                entity_relationships = [
                    rel for rel in self.relationship_cache.values()
                    if rel.source_entity_id == entity.entity_id or rel.target_entity_id == entity.entity_id
                ]
                related_relationships.extend(entity_relationships)
            
            # Create subgraph
            subgraph = await self._create_subgraph(top_entities, related_relationships)
            
            return {
                "entities": top_entities,
                "relationships": related_relationships,
                "subgraph": subgraph,
                "reasoning_path": [f"semantic_search: {query}"],
                "confidence": np.mean([e[1] for e in similar_entities[:5]]) if similar_entities else 0.5
            }
            
        except Exception as e:
            logger.error(f"Error in semantic search: {e}")
            return {"entities": [], "relationships": [], "subgraph": {}}
    
    def _initialize_extraction_patterns(self) -> Dict[str, List[str]]:
        """Initialize patterns for entity extraction"""
        return {
            "person": [r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', r'\b(?:Mr|Mrs|Dr|Professor)\. [A-Z][a-z]+\b'],
            "place": [r'\b[A-Z][a-z]+ (?:City|State|Country|Street|Avenue)\b', r'\bin [A-Z][a-z]+\b'],
            "organization": [r'\b[A-Z][a-z]+ (?:Inc|Corp|LLC|Company|University)\b'],
            "skill": [r'\b(?:programming|coding|writing|speaking|managing)\b', r'\bknow (?:how to )?([a-z]+)\b'],
            "goal": [r'\bwant to ([a-z ]+)\b', r'\bplan to ([a-z ]+)\b', r'\bgoal (?:is )?to ([a-z ]+)\b']
        }
    
    async def _store_knowledge_batch(
        self,
        entities: List[KnowledgeEntity],
        relationships: List[KnowledgeRelationship]
    ):
        """Store batch of knowledge entities and relationships"""
        try:
            # Store entities
            for entity in entities:
                await self._store_knowledge_entity(entity)
            
            # Store relationships
            for relationship in relationships:
                await self._store_knowledge_relationship(relationship)
                
        except Exception as e:
            logger.error(f"Error storing knowledge batch: {e}")
    
    async def _store_knowledge_entity(self, entity: KnowledgeEntity):
        """Store knowledge entity in database"""
        try:
            query = """
            INSERT INTO pam_knowledge_entities (
                entity_id, entity_type, name, description, properties,
                embedding, confidence, created_at, last_updated, source, user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (entity_id) DO UPDATE SET
                properties = EXCLUDED.properties,
                embedding = EXCLUDED.embedding,
                confidence = EXCLUDED.confidence,
                last_updated = EXCLUDED.last_updated
            """
            
            await self.db.execute(
                query,
                entity.entity_id,
                entity.entity_type.value,
                entity.name,
                entity.description,
                json.dumps(entity.properties),
                entity.embedding,
                entity.confidence,
                entity.created_at,
                entity.last_updated,
                entity.source,
                entity.user_id
            )
            
        except Exception as e:
            logger.error(f"Error storing knowledge entity: {e}")
    
    def _create_empty_query_result(self, query: str) -> GraphQueryResult:
        """Create empty query result for error cases"""
        return GraphQueryResult(
            query_id=f"empty_{datetime.utcnow().timestamp()}",
            entities=[],
            relationships=[],
            subgraph={},
            reasoning_path=[],
            confidence=0.0,
            execution_time=0.0,
            metadata={"error": True, "query": query}
        )


# Global knowledge graph system instance
knowledge_graph_system = PAMKnowledgeGraphSystem()

# Utility functions for easy integration

async def extract_knowledge(
    text: str,
    user_id: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
    source: str = "conversation"
) -> Tuple[List[KnowledgeEntity], List[KnowledgeRelationship]]:
    """Convenience function for knowledge extraction"""
    return await knowledge_graph_system.extract_knowledge_from_text(
        text=text,
        user_id=user_id,
        context=context,
        source=source
    )

async def query_knowledge(
    query: str,
    query_type: str = "semantic_search",
    user_id: Optional[str] = None,
    parameters: Optional[Dict[str, Any]] = None
) -> GraphQueryResult:
    """Convenience function for knowledge querying"""
    return await knowledge_graph_system.query_knowledge_graph(
        query=query,
        query_type=query_type,
        user_id=user_id,
        parameters=parameters
    )

async def infer_knowledge(
    premise_entities: List[str],
    inference_type: str = "transitive",
    max_depth: int = 3
) -> List[KnowledgeInsight]:
    """Convenience function for knowledge inference"""
    return await knowledge_graph_system.perform_knowledge_inference(
        premise_entities=premise_entities,
        inference_type=inference_type,
        max_depth=max_depth
    )

async def get_knowledge_analytics(
    user_id: Optional[str] = None,
    analytics_type: str = "overview"
) -> Dict[str, Any]:
    """Convenience function for knowledge analytics"""
    return await knowledge_graph_system.get_knowledge_analytics(
        user_id=user_id,
        analytics_type=analytics_type
    )