#!/usr/bin/env python3
"""
Neo4j Setup Script for Wheels & Wins PAM Graph RAG
Sets up Neo4j database and initializes the graph schema for enhanced AI reasoning.
"""

import asyncio
import os
import subprocess
import sys
from typing import Optional
import json

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.knowledge.graph_store import graph_store
from app.services.pam.graph_enhanced_orchestrator import graph_enhanced_orchestrator
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class Neo4jSetup:
    """Neo4j setup and configuration for PAM Graph RAG."""
    
    def __init__(self):
        self.neo4j_available = False
        
    def check_neo4j_installation(self) -> bool:
        """Check if Neo4j is installed and available."""
        try:
            # Check if neo4j command is available
            result = subprocess.run(
                ["neo4j", "version"], 
                capture_output=True, 
                text=True, 
                timeout=10
            )
            if result.returncode == 0:
                print(f"✅ Neo4j found: {result.stdout.strip()}")
                return True
            else:
                print("❌ Neo4j command not found")
                return False
        except (subprocess.TimeoutExpired, FileNotFoundError):
            print("❌ Neo4j not installed or not in PATH")
            return False
    
    def print_docker_instructions(self):
        """Print instructions for running Neo4j with Docker."""
        print("\n" + "="*60)
        print("🐳 DOCKER SETUP INSTRUCTIONS")
        print("="*60)
        print("""
To run Neo4j with Docker (recommended for development):

1. Pull and run Neo4j container:
   docker run -d \\
     --name neo4j-pam \\
     -p 7474:7474 -p 7687:7687 \\
     -e NEO4J_AUTH=neo4j/password123 \\
     -e NEO4J_PLUGINS='["apoc"]' \\
     neo4j:5.14

2. Wait for startup (30-60 seconds), then visit:
   http://localhost:7474

3. Login with:
   Username: neo4j
   Password: password123

4. Set environment variables:
   export NEO4J_URI="bolt://localhost:7687"
   export NEO4J_USER="neo4j"
   export NEO4J_PASSWORD="password123"

5. Re-run this script to test connection
        """)
    
    def print_cloud_instructions(self):
        """Print instructions for cloud Neo4j setup."""
        print("\n" + "="*60)
        print("☁️ CLOUD SETUP INSTRUCTIONS")
        print("="*60)
        print("""
For production deployment with Neo4j AuraDB (managed cloud):

1. Go to https://neo4j.com/cloud/platform/aura-graph-database/

2. Create a free AuraDB instance

3. Download connection details and set environment variables:
   export NEO4J_URI="neo4j+s://your-instance.databases.neo4j.io"
   export NEO4J_USER="neo4j" 
   export NEO4J_PASSWORD="your-generated-password"

4. Add to your Render environment variables:
   - NEO4J_URI
   - NEO4J_USER
   - NEO4J_PASSWORD
   - GRAPH_ENABLED=true

5. Re-deploy your backend service
        """)
    
    async def test_connection(self) -> bool:
        """Test connection to Neo4j database."""
        print("\n🔍 Testing Neo4j connection...")
        
        try:
            success = await graph_store.initialize()
            if success:
                print("✅ Successfully connected to Neo4j!")
                
                # Test basic functionality
                await self._test_basic_operations()
                return True
            else:
                print("❌ Failed to connect to Neo4j")
                return False
                
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    async def _test_basic_operations(self):
        """Test basic graph operations."""
        try:
            print("🧪 Testing basic graph operations...")
            
            # Test query execution
            result = await graph_store.query_graph("RETURN 'Hello Graph!' as message")
            if result:
                print(f"✅ Query test: {result[0].get('message', 'Success')}")
            
            # Test entity creation
            from app.services.knowledge.graph_models import GraphEntityFactory
            test_user = GraphEntityFactory.create_user_entity({
                "user_id": "test_user_123",
                "email": "test@example.com",
                "full_name": "Test User"
            })
            
            success = await graph_store.create_entity(test_user)
            if success:
                print("✅ Entity creation test passed")
            
            # Clean up test data
            await graph_store.query_graph(
                "MATCH (u:User {id: 'user:test_user_123'}) DELETE u"
            )
            
        except Exception as e:
            print(f"⚠️ Basic operations test failed: {e}")
    
    async def initialize_schema(self):
        """Initialize the graph schema with indexes and constraints."""
        print("\n📊 Initializing graph schema...")
        
        try:
            # This is handled automatically in graph_store.initialize()
            # But we can add additional schema setup here if needed
            
            print("✅ Graph schema initialized")
            
        except Exception as e:
            print(f"❌ Schema initialization failed: {e}")
    
    async def sync_sample_data(self):
        """Sync some sample data to demonstrate graph functionality."""
        print("\n📥 Would you like to sync sample data? (y/n): ", end="")
        response = input().lower().strip()
        
        if response in ['y', 'yes']:
            try:
                print("🔄 Syncing sample data...")
                
                # This would sync actual user data in practice
                # For demo, we'll create some sample entities
                await self._create_sample_entities()
                
                print("✅ Sample data synced successfully")
                
            except Exception as e:
                print(f"❌ Sample data sync failed: {e}")
    
    async def _create_sample_entities(self):
        """Create sample entities for demonstration."""
        from app.services.knowledge.graph_models import (
            GraphEntityFactory, GraphRelationshipFactory
        )
        
        # Sample user
        sample_user = GraphEntityFactory.create_user_entity({
            "user_id": "demo_user_001",
            "email": "demo@wheelsandwins.com",
            "full_name": "Demo User",
            "travel_experience": "intermediate",
            "rv_type": "motorhome"
        })
        await graph_store.create_entity(sample_user)
        
        # Sample location
        sample_location = GraphEntityFactory.create_location_entity({
            "name": "Yellowstone National Park",
            "type": "national_park",
            "latitude": 44.4280,
            "longitude": -110.5885,
            "state": "Wyoming",
            "country": "USA"
        })
        await graph_store.create_entity(sample_location)
        
        # Sample relationship
        user_location_rel = GraphRelationshipFactory.create_trip_visited_location(
            "demo_trip_001", 
            "Yellowstone_National_Park"
        )
        user_location_rel.from_entity = "user:demo_user_001"
        await graph_store.create_relationship(user_location_rel)
        
        print("📍 Created: Demo user, Yellowstone location, and visit relationship")


async def main():
    """Main setup workflow."""
    print("🚀 Wheels & Wins PAM Graph RAG Setup")
    print("="*50)
    
    setup = Neo4jSetup()
    
    # Check current configuration
    print(f"Neo4j URI: {getattr(settings, 'NEO4J_URI', 'Not set')}")
    print(f"Neo4j User: {getattr(settings, 'NEO4J_USER', 'Not set')}")
    print(f"Neo4j Password: {'Set' if getattr(settings, 'NEO4J_PASSWORD', None) else 'Not set'}")
    print(f"Graph Enabled: {getattr(settings, 'GRAPH_ENABLED', False)}")
    
    # Test connection
    connection_success = await setup.test_connection()
    
    if connection_success:
        print("\n🎉 Neo4j is ready for Graph RAG!")
        
        # Initialize schema
        await setup.initialize_schema()
        
        # Optionally sync sample data
        await setup.sync_sample_data()
        
        print("\n" + "="*50)
        print("✅ SETUP COMPLETE!")
        print("="*50)
        print("""
Your PAM AI system now has Graph RAG capabilities:

• Enhanced context from entity relationships
• Multi-hop reasoning across your data
• Personalized recommendations based on graph patterns
• Cross-domain intelligence linking trips, expenses, vehicles

To enable in production, set:
  GRAPH_ENABLED=true
  
The system will automatically fall back to standard RAG if Neo4j is unavailable.
        """)
        
    else:
        print("\n⚠️ Neo4j Setup Required")
        print("="*30)
        
        print("\nChoose your setup method:")
        print("1. Docker (recommended for development)")
        print("2. Cloud (recommended for production)")
        print("3. Local installation")
        
        choice = input("\nEnter choice (1-3): ").strip()
        
        if choice == "1":
            setup.print_docker_instructions()
        elif choice == "2":
            setup.print_cloud_instructions()
        else:
            print("\nFor local installation, visit: https://neo4j.com/download/")
        
        print(f"\nAfter setup, run this script again to test the connection.")


if __name__ == "__main__":
    asyncio.run(main())