"""
Neo4j Graph Knowledge Store
Enhanced knowledge storage with graph relationships for PAM AI system.
"""

import asyncio
from typing import Dict, List, Any, Optional, Tuple, Set
from datetime import datetime
import json
import logging
from dataclasses import dataclass, asdict

try:
    from neo4j import AsyncGraphDatabase, AsyncDriver
    from neo4j.exceptions import Neo4jError
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False
    AsyncGraphDatabase = None
    AsyncDriver = None
    Neo4jError = Exception

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class GraphEntity:
    """Represents an entity in the knowledge graph."""
    id: str
    type: str  # User, Trip, Expense, Vehicle, Location, etc.
    properties: Dict[str, Any]
    labels: List[str] = None
    
    def __post_init__(self):
        if self.labels is None:
            self.labels = [self.type]


@dataclass 
class GraphRelationship:
    """Represents a relationship between entities."""
    from_entity: str
    to_entity: str
    relationship_type: str
    properties: Dict[str, Any] = None
    weight: float = 1.0
    created_at: datetime = None
    
    def __post_init__(self):
        if self.properties is None:
            self.properties = {}
        if self.created_at is None:
            self.created_at = datetime.utcnow()


class GraphKnowledgeStore:
    """Neo4j-powered graph knowledge store for PAM AI system."""
    
    def __init__(self):
        self.driver: Optional[AsyncDriver] = None
        self.connected = False
        
        # Entity type mappings for PAM domains
        self.entity_types = {
            'user': 'User',
            'trip': 'Trip', 
            'expense': 'Expense',
            'vehicle': 'Vehicle',
            'location': 'Location',
            'maintenance': 'Maintenance',
            'fuel': 'FuelRecord',
            'calendar_event': 'CalendarEvent',
            'social_post': 'SocialPost',
            'group': 'SocialGroup',
            'product': 'Product',
            'hustle': 'Hustle'
        }
        
        # Relationship types for domain connections
        self.relationship_types = {
            'owns': 'OWNS',
            'visited': 'VISITED', 
            'spent_on': 'SPENT_ON',
            'maintained': 'MAINTAINED',
            'fueled': 'FUELED',
            'scheduled': 'SCHEDULED',
            'posted_in': 'POSTED_IN',
            'member_of': 'MEMBER_OF',
            'purchased': 'PURCHASED',
            'interested_in': 'INTERESTED_IN',
            'similar_to': 'SIMILAR_TO',
            'near': 'NEAR',
            'before': 'BEFORE',
            'after': 'AFTER'
        }

    async def initialize(self) -> bool:
        """Initialize Neo4j connection and create indexes."""
        if not NEO4J_AVAILABLE:
            logger.warning("Neo4j driver not available, falling back to mock implementation")
            return False
            
        try:
            neo4j_uri = getattr(settings, 'NEO4J_URI', 'bolt://localhost:7687')
            neo4j_user = getattr(settings, 'NEO4J_USER', 'neo4j')
            neo4j_password = getattr(settings, 'NEO4J_PASSWORD', 'password')
            
            self.driver = AsyncGraphDatabase.driver(
                neo4j_uri,
                auth=(neo4j_user, neo4j_password)
            )
            
            # Test connection
            await self.driver.verify_connectivity()
            self.connected = True
            
            # Create indexes and constraints
            await self._create_indexes()
            
            logger.info("✅ Neo4j graph store initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Neo4j: {e}")
            self.connected = False
            return False

    async def _create_indexes(self):
        """Create necessary indexes and constraints."""
        async with self.driver.session() as session:
            
            # Create uniqueness constraints
            constraints = [
                "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
                "CREATE CONSTRAINT trip_id IF NOT EXISTS FOR (t:Trip) REQUIRE t.id IS UNIQUE", 
                "CREATE CONSTRAINT expense_id IF NOT EXISTS FOR (e:Expense) REQUIRE e.id IS UNIQUE",
                "CREATE CONSTRAINT vehicle_id IF NOT EXISTS FOR (v:Vehicle) REQUIRE v.id IS UNIQUE",
                "CREATE CONSTRAINT location_id IF NOT EXISTS FOR (l:Location) REQUIRE l.id IS UNIQUE"
            ]
            
            for constraint in constraints:
                try:
                    await session.run(constraint)
                except Neo4jError as e:
                    if "already exists" not in str(e):
                        logger.warning(f"Failed to create constraint: {e}")
            
            # Create performance indexes
            indexes = [
                "CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email)",
                "CREATE INDEX trip_date IF NOT EXISTS FOR (t:Trip) ON (t.start_date)",
                "CREATE INDEX expense_date IF NOT EXISTS FOR (e:Expense) ON (e.date)",
                "CREATE INDEX location_name IF NOT EXISTS FOR (l:Location) ON (l.name)"
            ]
            
            for index in indexes:
                try:
                    await session.run(index)
                except Neo4jError as e:
                    if "already exists" not in str(e):
                        logger.warning(f"Failed to create index: {e}")

    async def create_entity(self, entity: GraphEntity) -> bool:
        """Create or update an entity in the graph."""
        if not self.connected:
            return False
            
        try:
            async with self.driver.session() as session:
                # Build Cypher query for entity creation
                labels = ":".join(entity.labels)
                properties_str = ", ".join([f"{k}: ${k}" for k in entity.properties.keys()])
                
                query = f"""
                MERGE (e:{labels} {{id: $id}})
                SET e += {{{properties_str}}}
                SET e.updated_at = datetime()
                RETURN e
                """
                
                params = {"id": entity.id, **entity.properties}
                result = await session.run(query, params)
                
                return bool(await result.single())
                
        except Exception as e:
            logger.error(f"Failed to create entity {entity.id}: {e}")
            return False

    async def create_relationship(self, relationship: GraphRelationship) -> bool:
        """Create a relationship between entities."""
        if not self.connected:
            return False
            
        try:
            async with self.driver.session() as session:
                query = f"""
                MATCH (from {{id: $from_id}})
                MATCH (to {{id: $to_id}})
                MERGE (from)-[r:{relationship.relationship_type}]->(to)
                SET r += $properties
                SET r.weight = $weight
                SET r.created_at = $created_at
                RETURN r
                """
                
                params = {
                    "from_id": relationship.from_entity,
                    "to_id": relationship.to_entity,
                    "properties": relationship.properties,
                    "weight": relationship.weight,
                    "created_at": relationship.created_at.isoformat()
                }
                
                result = await session.run(query, params)
                return bool(await result.single())
                
        except Exception as e:
            logger.error(f"Failed to create relationship: {e}")
            return False

    async def find_related_entities(
        self, 
        entity_id: str, 
        relationship_types: List[str] = None,
        max_hops: int = 2,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Find entities related to the given entity through graph traversal."""
        if not self.connected:
            return []
            
        try:
            async with self.driver.session() as session:
                # Build relationship filter
                rel_filter = ""
                if relationship_types:
                    rel_types = "|".join(relationship_types)
                    rel_filter = f":{rel_types}"
                
                query = f"""
                MATCH path = (start {{id: $entity_id}})-[r{rel_filter}*1..{max_hops}]-(related)
                WITH related, relationships(path) as rels, length(path) as distance
                RETURN DISTINCT 
                    related.id as id,
                    labels(related) as labels,
                    properties(related) as properties,
                    distance,
                    avg([rel in rels | rel.weight]) as avg_weight
                ORDER BY distance ASC, avg_weight DESC
                LIMIT $limit
                """
                
                result = await session.run(query, {"entity_id": entity_id, "limit": limit})
                
                entities = []
                async for record in result:
                    entities.append({
                        "id": record["id"],
                        "labels": record["labels"],
                        "properties": dict(record["properties"]),
                        "distance": record["distance"],
                        "relevance_score": record["avg_weight"]
                    })
                
                return entities
                
        except Exception as e:
            logger.error(f"Failed to find related entities for {entity_id}: {e}")
            return []

    async def find_paths_between_entities(
        self,
        entity1_id: str,
        entity2_id: str,
        max_hops: int = 4
    ) -> List[Dict[str, Any]]:
        """Find paths connecting two entities."""
        if not self.connected:
            return []
            
        try:
            async with self.driver.session() as session:
                query = f"""
                MATCH path = shortestPath((e1 {{id: $entity1_id}})-[*1..{max_hops}]-(e2 {{id: $entity2_id}}))
                WITH path, relationships(path) as rels
                RETURN 
                    [node in nodes(path) | {{id: node.id, labels: labels(node), properties: properties(node)}}] as path_nodes,
                    [rel in rels | {{type: type(rel), properties: properties(rel)}}] as path_relationships,
                    length(path) as path_length,
                    avg([rel in rels | rel.weight]) as path_strength
                ORDER BY path_length ASC, path_strength DESC
                LIMIT 5
                """
                
                result = await session.run(query, {
                    "entity1_id": entity1_id,
                    "entity2_id": entity2_id
                })
                
                paths = []
                async for record in result:
                    paths.append({
                        "nodes": record["path_nodes"],
                        "relationships": record["path_relationships"],
                        "length": record["path_length"],
                        "strength": record["path_strength"]
                    })
                
                return paths
                
        except Exception as e:
            logger.error(f"Failed to find paths between {entity1_id} and {entity2_id}: {e}")
            return []

    async def get_entity_context(
        self,
        entity_id: str,
        context_types: List[str] = None,
        max_depth: int = 2
    ) -> Dict[str, Any]:
        """Get rich context for an entity including related entities and relationships."""
        if not self.connected:
            return {"entity": None, "related": [], "relationships": []}
            
        try:
            # Get the main entity
            entity = await self._get_entity_by_id(entity_id)
            if not entity:
                return {"entity": None, "related": [], "relationships": []}
            
            # Get related entities
            related_entities = await self.find_related_entities(
                entity_id, 
                relationship_types=context_types,
                max_hops=max_depth
            )
            
            # Get direct relationships
            relationships = await self._get_entity_relationships(entity_id)
            
            return {
                "entity": entity,
                "related": related_entities,
                "relationships": relationships,
                "context_summary": self._build_context_summary(entity, related_entities)
            }
            
        except Exception as e:
            logger.error(f"Failed to get entity context for {entity_id}: {e}")
            return {"entity": None, "related": [], "relationships": []}

    async def _get_entity_by_id(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get entity by ID."""
        try:
            async with self.driver.session() as session:
                query = "MATCH (e {id: $entity_id}) RETURN e.id as id, labels(e) as labels, properties(e) as properties"
                result = await session.run(query, {"entity_id": entity_id})
                record = await result.single()
                
                if record:
                    return {
                        "id": record["id"],
                        "labels": record["labels"], 
                        "properties": dict(record["properties"])
                    }
                return None
                
        except Exception as e:
            logger.error(f"Failed to get entity {entity_id}: {e}")
            return None

    async def _get_entity_relationships(self, entity_id: str) -> List[Dict[str, Any]]:
        """Get all relationships for an entity."""
        try:
            async with self.driver.session() as session:
                query = """
                MATCH (e {id: $entity_id})-[r]-(other)
                RETURN 
                    type(r) as relationship_type,
                    other.id as other_entity_id,
                    labels(other) as other_labels,
                    properties(r) as properties,
                    r.weight as weight
                """
                
                result = await session.run(query, {"entity_id": entity_id})
                
                relationships = []
                async for record in result:
                    relationships.append({
                        "type": record["relationship_type"],
                        "other_entity_id": record["other_entity_id"],
                        "other_labels": record["other_labels"],
                        "properties": dict(record["properties"]),
                        "weight": record["weight"]
                    })
                
                return relationships
                
        except Exception as e:
            logger.error(f"Failed to get relationships for {entity_id}: {e}")
            return []

    def _build_context_summary(self, entity: Dict[str, Any], related_entities: List[Dict[str, Any]]) -> str:
        """Build a human-readable context summary for LLM consumption."""
        if not entity:
            return ""
            
        summary_parts = []
        
        # Entity description
        entity_type = entity.get("labels", ["Entity"])[0]
        entity_name = entity.get("properties", {}).get("name", entity.get("id", "Unknown"))
        summary_parts.append(f"{entity_type}: {entity_name}")
        
        # Group related entities by type
        by_type = {}
        for related in related_entities[:10]:  # Limit for context window
            rel_type = related.get("labels", ["Unknown"])[0]
            if rel_type not in by_type:
                by_type[rel_type] = []
            by_type[rel_type].append(related)
        
        # Add related entity summaries
        for rel_type, entities in by_type.items():
            entity_names = [e.get("properties", {}).get("name", e.get("id", "Unknown")) for e in entities[:3]]
            if len(entities) > 3:
                entity_names.append(f"and {len(entities) - 3} more")
            summary_parts.append(f"Related {rel_type}s: {', '.join(entity_names)}")
        
        return "; ".join(summary_parts)

    async def query_graph(self, cypher_query: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Execute a custom Cypher query."""
        if not self.connected:
            return []
            
        try:
            async with self.driver.session() as session:
                result = await session.run(cypher_query, parameters or {})
                
                records = []
                async for record in result:
                    records.append(dict(record))
                
                return records
                
        except Exception as e:
            logger.error(f"Failed to execute query: {e}")
            return []

    async def close(self):
        """Close the Neo4j connection."""
        if self.driver:
            await self.driver.close()
            self.connected = False
            logger.info("Neo4j connection closed")


# Global instance
graph_store = GraphKnowledgeStore()