"""
Graph Models for PAM AI System
Defines entity and relationship models for converting relational data to graph structures.
"""

from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum
import json

from app.services.knowledge.graph_store import GraphEntity, GraphRelationship


class EntityType(Enum):
    """Standard entity types in the PAM knowledge graph."""
    USER = "User"
    TRIP = "Trip"
    EXPENSE = "Expense"
    VEHICLE = "Vehicle"
    LOCATION = "Location"
    MAINTENANCE = "Maintenance"
    FUEL_RECORD = "FuelRecord"
    CALENDAR_EVENT = "CalendarEvent"
    SOCIAL_POST = "SocialPost"
    SOCIAL_GROUP = "SocialGroup"
    PRODUCT = "Product"
    HUSTLE = "Hustle"
    BUDGET = "Budget"
    INCOME = "Income"


class RelationshipType(Enum):
    """Standard relationship types in the PAM knowledge graph."""
    # Ownership relationships
    OWNS = "OWNS"
    BELONGS_TO = "BELONGS_TO"
    
    # Activity relationships
    VISITED = "VISITED"
    SPENT_ON = "SPENT_ON"
    MAINTAINED = "MAINTAINED"
    FUELED = "FUELED"
    SCHEDULED = "SCHEDULED"
    EARNED_FROM = "EARNED_FROM"
    
    # Social relationships
    POSTED_IN = "POSTED_IN"
    MEMBER_OF = "MEMBER_OF"
    FOLLOWS = "FOLLOWS"
    COMMENTED_ON = "COMMENTED_ON"
    
    # Commerce relationships
    PURCHASED = "PURCHASED"
    INTERESTED_IN = "INTERESTED_IN"
    RECOMMENDED = "RECOMMENDED"
    
    # Semantic relationships
    SIMILAR_TO = "SIMILAR_TO"
    RELATED_TO = "RELATED_TO"
    PART_OF = "PART_OF"
    
    # Temporal relationships
    BEFORE = "BEFORE"
    AFTER = "AFTER"
    DURING = "DURING"
    
    # Spatial relationships
    NEAR = "NEAR"
    AT = "AT"
    FROM = "FROM"
    TO = "TO"


class GraphEntityFactory:
    """Factory for creating graph entities from PAM data."""
    
    @staticmethod
    def create_user_entity(user_data: Dict[str, Any]) -> GraphEntity:
        """Create a User entity from profile data."""
        return GraphEntity(
            id=f"user:{user_data['user_id']}",
            type=EntityType.USER.value,
            properties={
                "user_id": user_data["user_id"],
                "email": user_data.get("email"),
                "full_name": user_data.get("full_name"),
                "role": user_data.get("role", "user"),
                "status": user_data.get("status", "active"),
                "region": user_data.get("region"),
                "created_at": user_data.get("created_at"),
                "travel_experience": user_data.get("travel_experience"),
                "rv_type": user_data.get("rv_type"),
                "preferred_destinations": user_data.get("preferred_destinations", []),
                "budget_range": user_data.get("budget_range"),
                "interests": user_data.get("interests", [])
            },
            labels=[EntityType.USER.value, "Person"]
        )
    
    @staticmethod
    def create_trip_entity(trip_data: Dict[str, Any]) -> GraphEntity:
        """Create a Trip entity from trip planning data."""
        return GraphEntity(
            id=f"trip:{trip_data['trip_id']}",
            type=EntityType.TRIP.value,
            properties={
                "trip_id": trip_data["trip_id"],
                "name": trip_data.get("name"),
                "description": trip_data.get("description"),
                "start_date": trip_data.get("start_date"),
                "end_date": trip_data.get("end_date"),
                "status": trip_data.get("status", "planned"),
                "total_distance": trip_data.get("total_distance"),
                "estimated_cost": trip_data.get("estimated_cost"),
                "actual_cost": trip_data.get("actual_cost"),
                "duration_days": trip_data.get("duration_days"),
                "waypoints": trip_data.get("waypoints", []),
                "created_at": trip_data.get("created_at")
            },
            labels=[EntityType.TRIP.value, "Journey"]
        )
    
    @staticmethod
    def create_location_entity(location_data: Dict[str, Any]) -> GraphEntity:
        """Create a Location entity from geographic data."""
        return GraphEntity(
            id=f"location:{location_data.get('location_id', location_data.get('name', '').replace(' ', '_'))}",
            type=EntityType.LOCATION.value,
            properties={
                "name": location_data.get("name"),
                "type": location_data.get("type", "place"),  # city, campground, attraction, etc.
                "latitude": location_data.get("latitude"),
                "longitude": location_data.get("longitude"),
                "address": location_data.get("address"),
                "country": location_data.get("country"),
                "state": location_data.get("state"),
                "city": location_data.get("city"),
                "zip_code": location_data.get("zip_code"),
                "amenities": location_data.get("amenities", []),
                "rating": location_data.get("rating"),
                "price_range": location_data.get("price_range"),
                "weather_info": location_data.get("weather_info")
            },
            labels=[EntityType.LOCATION.value, "Place"]
        )
    
    @staticmethod
    def create_expense_entity(expense_data: Dict[str, Any]) -> GraphEntity:
        """Create an Expense entity from financial data."""
        return GraphEntity(
            id=f"expense:{expense_data['expense_id']}",
            type=EntityType.EXPENSE.value,
            properties={
                "expense_id": expense_data["expense_id"],
                "amount": expense_data.get("amount"),
                "currency": expense_data.get("currency", "USD"),
                "category": expense_data.get("category"),
                "subcategory": expense_data.get("subcategory"),
                "description": expense_data.get("description"),
                "date": expense_data.get("date"),
                "payment_method": expense_data.get("payment_method"),
                "location": expense_data.get("location"),
                "tags": expense_data.get("tags", []),
                "receipt_url": expense_data.get("receipt_url"),
                "created_at": expense_data.get("created_at")
            },
            labels=[EntityType.EXPENSE.value, "Transaction"]
        )
    
    @staticmethod
    def create_vehicle_entity(vehicle_data: Dict[str, Any]) -> GraphEntity:
        """Create a Vehicle entity from vehicle data."""
        return GraphEntity(
            id=f"vehicle:{vehicle_data['vehicle_id']}",
            type=EntityType.VEHICLE.value,
            properties={
                "vehicle_id": vehicle_data["vehicle_id"],
                "name": vehicle_data.get("name"),
                "type": vehicle_data.get("type"),  # rv, motorhome, travel_trailer, etc.
                "make": vehicle_data.get("make"),
                "model": vehicle_data.get("model"),
                "year": vehicle_data.get("year"),
                "length": vehicle_data.get("length"),
                "weight": vehicle_data.get("weight"),
                "fuel_type": vehicle_data.get("fuel_type"),
                "mpg": vehicle_data.get("mpg"),
                "tank_capacity": vehicle_data.get("tank_capacity"),
                "features": vehicle_data.get("features", []),
                "status": vehicle_data.get("status", "active"),
                "purchase_date": vehicle_data.get("purchase_date"),
                "purchase_price": vehicle_data.get("purchase_price")
            },
            labels=[EntityType.VEHICLE.value, "Asset"]
        )
    
    @staticmethod
    def create_maintenance_entity(maintenance_data: Dict[str, Any]) -> GraphEntity:
        """Create a Maintenance entity from maintenance records."""
        return GraphEntity(
            id=f"maintenance:{maintenance_data['maintenance_id']}",
            type=EntityType.MAINTENANCE.value,
            properties={
                "maintenance_id": maintenance_data["maintenance_id"],
                "type": maintenance_data.get("type"),  # routine, repair, inspection
                "description": maintenance_data.get("description"),
                "date": maintenance_data.get("date"),
                "cost": maintenance_data.get("cost"),
                "mileage": maintenance_data.get("mileage"),
                "service_provider": maintenance_data.get("service_provider"),
                "parts_replaced": maintenance_data.get("parts_replaced", []),
                "next_service_due": maintenance_data.get("next_service_due"),
                "priority": maintenance_data.get("priority", "medium"),
                "status": maintenance_data.get("status", "completed")
            },
            labels=[EntityType.MAINTENANCE.value, "Service"]
        )


class GraphRelationshipFactory:
    """Factory for creating graph relationships from PAM data connections."""
    
    @staticmethod
    def create_user_owns_vehicle(user_id: str, vehicle_id: str, since: datetime = None) -> GraphRelationship:
        """Create ownership relationship between user and vehicle."""
        return GraphRelationship(
            from_entity=f"user:{user_id}",
            to_entity=f"vehicle:{vehicle_id}",
            relationship_type=RelationshipType.OWNS.value,
            properties={
                "since": (since or datetime.utcnow()).isoformat(),
                "primary": True
            },
            weight=1.0
        )
    
    @staticmethod
    def create_trip_visited_location(trip_id: str, location_id: str, 
                                   visit_date: datetime = None, duration: int = None) -> GraphRelationship:
        """Create relationship between trip and visited location."""
        properties = {}
        if visit_date:
            properties["visit_date"] = visit_date.isoformat()
        if duration:
            properties["duration_hours"] = duration
            
        return GraphRelationship(
            from_entity=f"trip:{trip_id}",
            to_entity=f"location:{location_id}",
            relationship_type=RelationshipType.VISITED.value,
            properties=properties,
            weight=0.8
        )
    
    @staticmethod
    def create_user_spent_on_expense(user_id: str, expense_id: str, 
                                   category: str = None, amount: float = None) -> GraphRelationship:
        """Create relationship between user and expense."""
        properties = {}
        if category:
            properties["category"] = category
        if amount:
            properties["amount"] = amount
            
        return GraphRelationship(
            from_entity=f"user:{user_id}",
            to_entity=f"expense:{expense_id}",
            relationship_type=RelationshipType.SPENT_ON.value,
            properties=properties,
            weight=0.6
        )
    
    @staticmethod
    def create_expense_at_location(expense_id: str, location_id: str) -> GraphRelationship:
        """Create relationship between expense and location."""
        return GraphRelationship(
            from_entity=f"expense:{expense_id}",
            to_entity=f"location:{location_id}",
            relationship_type=RelationshipType.AT.value,
            properties={},
            weight=0.5
        )
    
    @staticmethod
    def create_vehicle_maintained_record(vehicle_id: str, maintenance_id: str) -> GraphRelationship:
        """Create relationship between vehicle and maintenance record."""
        return GraphRelationship(
            from_entity=f"vehicle:{vehicle_id}",
            to_entity=f"maintenance:{maintenance_id}",
            relationship_type=RelationshipType.MAINTAINED.value,
            properties={},
            weight=0.7
        )
    
    @staticmethod
    def create_locations_near(location1_id: str, location2_id: str, 
                            distance_km: float) -> GraphRelationship:
        """Create spatial relationship between nearby locations."""
        # Calculate weight based on proximity (closer = higher weight)
        weight = max(0.1, 1.0 - (distance_km / 100.0))  # Normalize distance to weight
        
        return GraphRelationship(
            from_entity=f"location:{location1_id}",
            to_entity=f"location:{location2_id}",
            relationship_type=RelationshipType.NEAR.value,
            properties={
                "distance_km": distance_km,
                "proximity_level": "close" if distance_km < 10 else "nearby" if distance_km < 50 else "distant"
            },
            weight=weight
        )
    
    @staticmethod
    def create_temporal_relationship(entity1_id: str, entity2_id: str, 
                                   temporal_type: str, time_diff_hours: int = None) -> GraphRelationship:
        """Create temporal relationship between entities."""
        rel_type = RelationshipType.BEFORE.value if temporal_type == "before" else RelationshipType.AFTER.value
        
        properties = {}
        if time_diff_hours:
            properties["time_difference_hours"] = time_diff_hours
            
        return GraphRelationship(
            from_entity=entity1_id,
            to_entity=entity2_id,
            relationship_type=rel_type,
            properties=properties,
            weight=0.4
        )


class GraphContextBuilder:
    """Builds rich context from graph relationships for LLM consumption."""
    
    def __init__(self, graph_store):
        self.graph_store = graph_store
    
    async def build_user_context(self, user_id: str, context_depth: int = 2) -> Dict[str, Any]:
        """Build comprehensive user context from graph relationships."""
        user_entity_id = f"user:{user_id}"
        
        # Get the user's graph context
        context = await self.graph_store.get_entity_context(
            user_entity_id,
            max_depth=context_depth
        )
        
        if not context["entity"]:
            return {"context_summary": f"No graph context available for user {user_id}"}
        
        # Organize related entities by type
        organized_context = self._organize_entities_by_type(context["related"])
        
        # Build narrative context for LLM
        context_narrative = self._build_context_narrative(user_id, organized_context)
        
        return {
            "user_entity": context["entity"],
            "organized_context": organized_context,
            "context_narrative": context_narrative,
            "relationship_summary": self._summarize_relationships(context["relationships"]),
            "context_strength": self._calculate_context_strength(context["related"])
        }
    
    async def build_trip_context(self, trip_id: str, user_id: str = None) -> Dict[str, Any]:
        """Build comprehensive trip context including related locations, expenses, etc."""
        trip_entity_id = f"trip:{trip_id}"
        
        context = await self.graph_store.get_entity_context(trip_entity_id, max_depth=2)
        
        if not context["entity"]:
            return {"context_summary": f"No graph context available for trip {trip_id}"}
        
        # Find connections to user if provided
        user_connection = None
        if user_id:
            paths = await self.graph_store.find_paths_between_entities(
                f"user:{user_id}", trip_entity_id, max_hops=3
            )
            user_connection = paths[0] if paths else None
        
        organized_context = self._organize_entities_by_type(context["related"])
        context_narrative = self._build_trip_narrative(trip_id, organized_context, user_connection)
        
        return {
            "trip_entity": context["entity"],
            "organized_context": organized_context,
            "context_narrative": context_narrative,
            "user_connection": user_connection,
            "location_insights": self._extract_location_insights(organized_context.get("Location", [])),
            "expense_summary": self._summarize_trip_expenses(organized_context.get("Expense", []))
        }
    
    def _organize_entities_by_type(self, entities: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Organize entities by their primary type."""
        organized = {}
        for entity in entities:
            entity_type = entity.get("labels", ["Unknown"])[0]
            if entity_type not in organized:
                organized[entity_type] = []
            organized[entity_type].append(entity)
        return organized
    
    def _build_context_narrative(self, user_id: str, organized_context: Dict[str, List[Dict[str, Any]]]) -> str:
        """Build a narrative description of user context for LLM consumption."""
        narrative_parts = [f"User {user_id} context:"]
        
        # Vehicles
        vehicles = organized_context.get("Vehicle", [])
        if vehicles:
            vehicle_desc = []
            for vehicle in vehicles[:3]:
                props = vehicle.get("properties", {})
                desc = f"{props.get('year', '')} {props.get('make', '')} {props.get('model', '')}"
                vehicle_desc.append(desc.strip())
            narrative_parts.append(f"Owns vehicles: {', '.join(vehicle_desc)}")
        
        # Recent trips
        trips = organized_context.get("Trip", [])
        if trips:
            trip_count = len(trips)
            recent_trip = trips[0] if trips else None
            if recent_trip:
                props = recent_trip.get("properties", {})
                narrative_parts.append(f"Has {trip_count} trips, most recent: {props.get('name', 'Unnamed trip')}")
        
        # Locations
        locations = organized_context.get("Location", [])
        if locations:
            location_names = [loc.get("properties", {}).get("name", "Unknown") for loc in locations[:5]]
            narrative_parts.append(f"Connected to locations: {', '.join(location_names)}")
        
        # Expenses
        expenses = organized_context.get("Expense", [])
        if expenses:
            expense_categories = list(set([exp.get("properties", {}).get("category", "Other") for exp in expenses]))
            narrative_parts.append(f"Spending categories: {', '.join(expense_categories[:5])}")
        
        return "; ".join(narrative_parts)
    
    def _build_trip_narrative(self, trip_id: str, organized_context: Dict[str, List[Dict[str, Any]]], 
                            user_connection: Dict[str, Any] = None) -> str:
        """Build a narrative description of trip context."""
        narrative_parts = [f"Trip {trip_id} context:"]
        
        # Locations visited
        locations = organized_context.get("Location", [])
        if locations:
            location_names = [loc.get("properties", {}).get("name", "Unknown") for loc in locations]
            narrative_parts.append(f"Visited locations: {', '.join(location_names)}")
        
        # Expenses incurred
        expenses = organized_context.get("Expense", [])
        if expenses:
            total_amount = sum([exp.get("properties", {}).get("amount", 0) for exp in expenses])
            categories = list(set([exp.get("properties", {}).get("category", "Other") for exp in expenses]))
            narrative_parts.append(f"Total expenses: ${total_amount:.2f} across categories: {', '.join(categories)}")
        
        # Vehicle used
        vehicles = organized_context.get("Vehicle", [])
        if vehicles:
            vehicle = vehicles[0]
            props = vehicle.get("properties", {})
            vehicle_desc = f"{props.get('year', '')} {props.get('make', '')} {props.get('model', '')}"
            narrative_parts.append(f"Vehicle used: {vehicle_desc.strip()}")
        
        return "; ".join(narrative_parts)
    
    def _summarize_relationships(self, relationships: List[Dict[str, Any]]) -> Dict[str, int]:
        """Summarize relationship types and counts."""
        summary = {}
        for rel in relationships:
            rel_type = rel.get("type", "Unknown")
            summary[rel_type] = summary.get(rel_type, 0) + 1
        return summary
    
    def _calculate_context_strength(self, entities: List[Dict[str, Any]]) -> float:
        """Calculate overall context strength based on entity relevance scores."""
        if not entities:
            return 0.0
        
        total_score = sum([entity.get("relevance_score", 0.5) for entity in entities])
        return min(1.0, total_score / len(entities))
    
    def _extract_location_insights(self, locations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract insights from location entities."""
        if not locations:
            return {}
        
        insights = {
            "total_locations": len(locations),
            "location_types": [],
            "countries": set(),
            "states": set(),
            "has_ratings": False
        }
        
        for location in locations:
            props = location.get("properties", {})
            if props.get("type"):
                insights["location_types"].append(props["type"])
            if props.get("country"):
                insights["countries"].add(props["country"])
            if props.get("state"):
                insights["states"].add(props["state"])
            if props.get("rating"):
                insights["has_ratings"] = True
        
        insights["countries"] = list(insights["countries"])
        insights["states"] = list(insights["states"])
        
        return insights
    
    def _summarize_trip_expenses(self, expenses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Summarize expense information for a trip."""
        if not expenses:
            return {}
        
        total_amount = 0
        categories = {}
        currency = "USD"
        
        for expense in expenses:
            props = expense.get("properties", {})
            amount = props.get("amount", 0)
            category = props.get("category", "Other")
            
            total_amount += amount
            categories[category] = categories.get(category, 0) + amount
            
            if props.get("currency"):
                currency = props["currency"]
        
        return {
            "total_amount": total_amount,
            "currency": currency,
            "categories": categories,
            "expense_count": len(expenses),
            "average_expense": total_amount / len(expenses) if expenses else 0
        }