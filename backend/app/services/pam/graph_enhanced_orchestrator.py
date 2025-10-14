"""
Graph-Enhanced PAM Orchestrator
Integrates Neo4j knowledge graph with existing PAM AI system for enhanced context and reasoning.
"""

import asyncio
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import json
import logging

from app.core.logging import get_logger
from app.services.knowledge.graph_store import graph_store, GraphEntity, GraphRelationship
from app.services.knowledge.graph_models import (
    GraphEntityFactory, GraphRelationshipFactory, GraphContextBuilder,
    EntityType, RelationshipType
)
from app.services.pam.enhanced_orchestrator import EnhancedOrchestrator
from app.services.pam.intelligence.cross_domain_service import CrossDomainIntelligenceService
from app.core.database import get_supabase_client

logger = get_logger(__name__)


class GraphEnhancedOrchestrator(EnhancedOrchestrator):
    """Enhanced PAM orchestrator with graph-based context and reasoning."""
    
    def __init__(self):
        super().__init__()
        self.graph_store = graph_store
        self.context_builder = GraphContextBuilder(graph_store)
        self.graph_sync_enabled = False
        
    async def initialize(self):
        """Initialize the graph-enhanced orchestrator."""
        await super().initialize()
        
        # Initialize graph store
        self.graph_sync_enabled = await self.graph_store.initialize()
        
        if self.graph_sync_enabled:
            logger.info("✅ Graph-enhanced orchestrator initialized with Neo4j")
            # Optionally sync existing data to graph
            # await self._initial_graph_sync()
        else:
            logger.warning("⚠️ Graph store not available, falling back to standard orchestrator")
    
    async def process_user_message(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process user message with graph-enhanced context."""
        
        # Get graph-enhanced context if available
        enhanced_context = context or {}
        if self.graph_sync_enabled:
            try:
                graph_context = await self._get_graph_enhanced_context(user_id, message, session_id)
                enhanced_context.update(graph_context)
                logger.debug(f"Enhanced context with graph data: {len(graph_context)} graph entities")
            except Exception as e:
                logger.error(f"Failed to get graph context: {e}")
        
        # Process with enhanced context
        response = await super().process_user_message(user_id, message, session_id, enhanced_context)
        
        # Update graph with new information if enabled
        if self.graph_sync_enabled:
            asyncio.create_task(self._update_graph_from_conversation(user_id, message, response))
        
        return response
    
    async def _get_graph_enhanced_context(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get enhanced context using graph relationships."""
        
        # Extract entities from user message
        entities = await self._extract_message_entities(message)
        
        # Get user's graph context
        user_context = await self.context_builder.build_user_context(user_id, context_depth=2)
        
        # Get context for any entities mentioned in the message
        entity_contexts = []
        for entity in entities:
            if entity.get("type") and entity.get("id"):
                entity_context = await self.graph_store.get_entity_context(
                    entity["id"], max_depth=1
                )
                if entity_context["entity"]:
                    entity_contexts.append(entity_context)
        
        # Find relationships between user and mentioned entities
        entity_relationships = []
        if entities:
            for entity in entities:
                if entity.get("id"):
                    paths = await self.graph_store.find_paths_between_entities(
                        f"user:{user_id}", entity["id"], max_hops=3
                    )
                    entity_relationships.extend(paths)
        
        # Build enhanced context summary
        graph_context = {
            "graph_user_context": user_context.get("context_narrative", ""),
            "graph_entity_contexts": [ctx.get("context_summary", "") for ctx in entity_contexts],
            "graph_relationships": self._summarize_entity_relationships(entity_relationships),
            "graph_insights": await self._generate_graph_insights(user_id, entities, user_context)
        }
        
        return {"graph_enhanced_context": graph_context}
    
    async def _extract_message_entities(self, message: str) -> List[Dict[str, Any]]:
        """Extract entities from user message that might exist in the graph."""
        entities = []
        
        # Use existing entity extraction but map to graph entity IDs
        extracted = await self.extract_entities(message)
        
        # Map locations
        if extracted.get("locations"):
            for location in extracted["locations"]:
                entities.append({
                    "type": EntityType.LOCATION.value,
                    "id": f"location:{location.replace(' ', '_')}",
                    "mention": location
                })
        
        # Map vehicle references
        if extracted.get("vehicle_mentions"):
            # This would need to be enhanced to identify specific vehicles
            # For now, just note that vehicles were mentioned
            entities.append({
                "type": EntityType.VEHICLE.value,
                "id": None,  # Would need vehicle resolution
                "mention": "vehicle_mentioned"
            })
        
        # Map trip references
        if any(word in message.lower() for word in ["trip", "travel", "journey", "vacation"]):
            entities.append({
                "type": EntityType.TRIP.value,
                "id": None,  # Would need trip resolution
                "mention": "trip_mentioned"
            })
        
        # Map expense/budget references
        if any(word in message.lower() for word in ["cost", "expense", "budget", "spend", "money", "$"]):
            entities.append({
                "type": EntityType.EXPENSE.value,
                "id": None,
                "mention": "financial_mentioned"
            })
        
        return entities
    
    async def _generate_graph_insights(
        self,
        user_id: str,
        mentioned_entities: List[Dict[str, Any]],
        user_context: Dict[str, Any]
    ) -> List[str]:
        """Generate insights from graph relationships."""
        insights = []
        
        # Insights from user's graph connections
        organized_context = user_context.get("organized_context", {})
        
        # Travel pattern insights
        trips = organized_context.get("Trip", [])
        locations = organized_context.get("Location", [])
        if trips and locations:
            insights.append(f"User has visited {len(locations)} locations across {len(trips)} trips")
        
        # Spending pattern insights
        expenses = organized_context.get("Expense", [])
        if expenses:
            total_expenses = len(expenses)
            # Get expense categories from properties
            categories = set()
            for expense in expenses:
                category = expense.get("properties", {}).get("category")
                if category:
                    categories.add(category)
            
            if categories:
                insights.append(f"User has {total_expenses} expense records across categories: {', '.join(list(categories)[:3])}")
        
        # Vehicle insights
        vehicles = organized_context.get("Vehicle", [])
        if vehicles:
            vehicle_types = [v.get("properties", {}).get("type", "unknown") for v in vehicles]
            insights.append(f"User owns {len(vehicles)} vehicles: {', '.join(vehicle_types)}")
        
        # Cross-entity insights
        if trips and expenses:
            insights.append("User has linked trip and expense data available for financial trip analysis")
        
        if vehicles and organized_context.get("Maintenance", []):
            insights.append("User has vehicle maintenance history for predictive maintenance insights")
        
        return insights
    
    def _summarize_entity_relationships(self, relationships: List[Dict[str, Any]]) -> str:
        """Create a summary of entity relationships for context."""
        if not relationships:
            return "No direct relationships found"
        
        # Group by relationship strength (path length)
        direct = [r for r in relationships if r.get("length", 999) == 1]
        indirect = [r for r in relationships if r.get("length", 999) > 1]
        
        summary_parts = []
        if direct:
            summary_parts.append(f"{len(direct)} direct connections")
        if indirect:
            summary_parts.append(f"{len(indirect)} indirect connections")
        
        return ", ".join(summary_parts)
    
    async def _update_graph_from_conversation(
        self,
        user_id: str,
        user_message: str,
        pam_response: Dict[str, Any]
    ):
        """Update graph with new information from conversation."""
        try:
            # Extract any new entities or relationships from the conversation
            entities_to_create = []
            relationships_to_create = []
            
            # Check if new trip information was discussed
            if any(word in user_message.lower() for word in ["planning", "trip to", "going to", "visit"]):
                trip_info = await self._extract_trip_info_from_message(user_message, pam_response)
                if trip_info:
                    entities_to_create.extend(trip_info["entities"])
                    relationships_to_create.extend(trip_info["relationships"])
            
            # Check if expense information was mentioned
            if any(word in user_message.lower() for word in ["spent", "cost", "paid", "$"]):
                expense_info = await self._extract_expense_info_from_message(user_message, pam_response)
                if expense_info:
                    entities_to_create.extend(expense_info["entities"])
                    relationships_to_create.extend(expense_info["relationships"])
            
            # Create new entities and relationships
            for entity in entities_to_create:
                await self.graph_store.create_entity(entity)
            
            for relationship in relationships_to_create:
                await self.graph_store.create_relationship(relationship)
            
            if entities_to_create or relationships_to_create:
                logger.info(f"Updated graph: {len(entities_to_create)} entities, {len(relationships_to_create)} relationships")
        
        except Exception as e:
            logger.error(f"Failed to update graph from conversation: {e}")
    
    async def _extract_trip_info_from_message(
        self,
        message: str,
        response: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Extract trip information that should be added to the graph."""
        # This is a simplified extraction - in practice, you'd use more sophisticated NLP
        entities = []
        relationships = []
        
        # Look for location mentions
        extracted = await self.extract_entities(message)
        locations = extracted.get("locations", [])
        
        if locations:
            # Create location entities
            for location_name in locations:
                location_entity = GraphEntityFactory.create_location_entity({
                    "name": location_name,
                    "type": "destination"
                })
                entities.append(location_entity)
                
                # Create user interest relationship
                interest_rel = GraphRelationshipFactory.create_user_spent_on_expense(
                    user_id=extracted.get("user_id", "unknown"),
                    expense_id=location_entity.id,
                    category="travel_interest"
                )
                # Note: This would need to be a different relationship type for interests
                relationships.append(interest_rel)
        
        return {"entities": entities, "relationships": relationships} if entities else None
    
    async def _extract_expense_info_from_message(
        self,
        message: str,
        response: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Extract expense information that should be added to the graph."""
        # Simplified expense extraction
        entities = []
        relationships = []
        
        # Look for dollar amounts and expense context
        import re
        dollar_matches = re.findall(r'\$(\d+(?:\.\d{2})?)', message)
        
        if dollar_matches:
            # This would need more sophisticated parsing to create actual expense entities
            # For now, just log that expense information was mentioned
            logger.debug(f"Expense amounts mentioned: {dollar_matches}")
        
        return {"entities": entities, "relationships": relationships} if entities else None
    
    async def sync_user_data_to_graph(self, user_id: str) -> bool:
        """Sync existing user data from relational database to graph."""
        if not self.graph_sync_enabled:
            return False
        
        try:
            supabase = await get_supabase_client()

            # Sync user profile
            user_profile = await supabase.table("profiles").select("*").eq("id", user_id).single()
            if user_profile.data:
                user_entity = GraphEntityFactory.create_user_entity(user_profile.data)
                await self.graph_store.create_entity(user_entity)
            
            # Sync user's trips
            trips = await supabase.table("trips").select("*").eq("user_id", user_id)
            for trip in trips.data or []:
                trip_entity = GraphEntityFactory.create_trip_entity(trip)
                await self.graph_store.create_entity(trip_entity)
                
                # Create user-trip relationship
                user_trip_rel = GraphRelationship(
                    from_entity=f"user:{user_id}",
                    to_entity=trip_entity.id,
                    relationship_type=RelationshipType.OWNS.value,
                    properties={"created_at": trip.get("created_at")},
                    weight=1.0
                )
                await self.graph_store.create_relationship(user_trip_rel)
            
            # Sync expenses
            expenses = await supabase.table("expenses").select("*").eq("user_id", user_id)
            for expense in expenses.data or []:
                expense_entity = GraphEntityFactory.create_expense_entity(expense)
                await self.graph_store.create_entity(expense_entity)
                
                # Create user-expense relationship
                user_expense_rel = GraphRelationshipFactory.create_user_spent_on_expense(
                    user_id, expense["expense_id"], 
                    expense.get("category"), expense.get("amount")
                )
                await self.graph_store.create_relationship(user_expense_rel)
            
            # Sync vehicles
            vehicles = await supabase.table("vehicles").select("*").eq("user_id", user_id)
            for vehicle in vehicles.data or []:
                vehicle_entity = GraphEntityFactory.create_vehicle_entity(vehicle)
                await self.graph_store.create_entity(vehicle_entity)
                
                # Create user-vehicle relationship
                user_vehicle_rel = GraphRelationshipFactory.create_user_owns_vehicle(
                    user_id, vehicle["vehicle_id"]
                )
                await self.graph_store.create_relationship(user_vehicle_rel)
            
            logger.info(f"✅ Synced user {user_id} data to graph")
            return True
            
        except Exception as e:
            logger.error(f"Failed to sync user data to graph: {e}")
            return False
    
    async def get_graph_recommendations(self, user_id: str, context: str = "general") -> List[Dict[str, Any]]:
        """Get recommendations based on graph relationships."""
        if not self.graph_sync_enabled:
            return []
        
        try:
            # Find similar users based on graph patterns
            similar_users = await self._find_similar_users(user_id)
            
            # Get recommendations from similar users' activities
            recommendations = []
            for similar_user in similar_users[:3]:  # Top 3 similar users
                user_activities = await self.graph_store.find_related_entities(
                    similar_user["id"],
                    relationship_types=[RelationshipType.VISITED.value, RelationshipType.OWNS.value],
                    max_hops=2,
                    limit=5
                )
                
                for activity in user_activities:
                    if activity["labels"][0] in ["Location", "Product"]:
                        recommendations.append({
                            "type": "recommendation",
                            "entity": activity,
                            "reason": f"Similar to users with comparable travel patterns",
                            "confidence": activity.get("relevance_score", 0.5)
                        })
            
            return recommendations[:10]  # Top 10 recommendations
            
        except Exception as e:
            logger.error(f"Failed to get graph recommendations: {e}")
            return []
    
    async def _find_similar_users(self, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Find users with similar graph patterns."""
        try:
            # This is a simplified similarity algorithm
            # In practice, you'd use more sophisticated graph similarity measures
            
            query = """
            MATCH (user1:User {id: $user_id})-[:OWNS|VISITED|SPENT_ON]-(shared)-[:OWNS|VISITED|SPENT_ON]-(user2:User)
            WHERE user1 <> user2
            WITH user2, count(shared) as shared_entities
            RETURN user2.id as id, user2.full_name as name, shared_entities
            ORDER BY shared_entities DESC
            LIMIT $limit
            """
            
            similar_users = await self.graph_store.query_graph(query, {
                "user_id": f"user:{user_id}",
                "limit": limit
            })
            
            return similar_users
            
        except Exception as e:
            logger.error(f"Failed to find similar users: {e}")
            return []


# Global instance
graph_enhanced_orchestrator = GraphEnhancedOrchestrator()