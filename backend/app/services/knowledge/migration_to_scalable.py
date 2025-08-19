"""
Migration script to transition from per-user ChromaDB to scalable shared architecture
"""

import logging
from typing import Optional
from pathlib import Path
import asyncio

from .vector_store import VectorKnowledgeBase
from .scalable_vector_store import ScalableVectorKnowledgeBase

logger = logging.getLogger(__name__)

class KnowledgeBaseMigration:
    """Handles migration from old to new knowledge base architecture"""
    
    def __init__(self):
        self.old_kb: Optional[VectorKnowledgeBase] = None
        self.new_kb: Optional[ScalableVectorKnowledgeBase] = None
        
    async def migrate(self, persist_directory: str = "./data/chroma_db"):
        """
        Migrate existing ChromaDB data to scalable architecture
        
        Args:
            persist_directory: Directory where old ChromaDB data is stored
        """
        try:
            logger.info("🔄 Starting knowledge base migration...")
            
            # Initialize old knowledge base
            self.old_kb = VectorKnowledgeBase(persist_directory)
            if hasattr(self.old_kb, 'initialize_collections'):
                await self.old_kb.initialize_collections()
            
            # Initialize new scalable knowledge base
            self.new_kb = ScalableVectorKnowledgeBase()
            await self.new_kb.initialize()
            
            # Check if old KB has data
            if self.old_kb._fallback_mode:
                logger.info("Old knowledge base in fallback mode - no data to migrate")
                return
            
            # Migrate each collection
            await self._migrate_collections()
            
            # Verify migration
            await self._verify_migration()
            
            logger.info("✅ Migration completed successfully")
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            raise
        finally:
            # Cleanup
            if self.old_kb and hasattr(self.old_kb, 'close'):
                await self.old_kb.close()
            if self.new_kb:
                await self.new_kb.close()
    
    async def _migrate_collections(self):
        """Migrate data from old collections to new architecture"""
        
        if not self.old_kb or not self.old_kb.client:
            logger.warning("No ChromaDB client available for migration")
            return
        
        try:
            # Get all collections from old KB
            collections = self.old_kb.client.list_collections()
            
            for collection in collections:
                logger.info(f"Migrating collection: {collection.name}")
                
                # Determine category based on collection name
                category = self._map_collection_to_category(collection.name)
                
                # Get all documents from collection
                results = collection.get(
                    include=['documents', 'metadatas', 'embeddings']
                )
                
                if not results['documents']:
                    logger.info(f"No documents in collection {collection.name}")
                    continue
                
                # Migrate each document
                for i, doc in enumerate(results['documents']):
                    metadata = results['metadatas'][i] if results['metadatas'] else {}
                    
                    # Determine if this is user-specific or public knowledge
                    user_id = metadata.get('user_id')
                    is_public = not user_id or metadata.get('is_public', False)
                    
                    # Add to new knowledge base
                    await self.new_kb.add_knowledge(
                        content=doc,
                        category=category,
                        metadata=metadata,
                        source=metadata.get('source', 'migrated'),
                        user_id=user_id,
                        is_public=is_public
                    )
                
                logger.info(f"Migrated {len(results['documents'])} documents from {collection.name}")
                
        except Exception as e:
            logger.error(f"Error migrating collections: {e}")
            raise
    
    def _map_collection_to_category(self, collection_name: str) -> str:
        """Map old collection names to new categories"""
        
        mapping = {
            'campgrounds': 'campgrounds',
            'camp_knowledge': 'campgrounds',
            'routes': 'routes',
            'trip_knowledge': 'routes',
            'tips': 'tips',
            'money_tips': 'tips',
            'regulations': 'regulations',
            'rv_regulations': 'regulations',
            'maintenance': 'maintenance',
            'user_notes': 'user_notes',
            'personal': 'user_notes',
            'community': 'community',
            'shared': 'community'
        }
        
        # Check for matches
        for key, value in mapping.items():
            if key in collection_name.lower():
                return value
        
        # Default category
        return 'community'
    
    async def _verify_migration(self):
        """Verify that migration was successful"""
        
        if not self.new_kb:
            return
        
        try:
            # Get statistics from new KB
            stats = await self.new_kb.get_statistics()
            
            logger.info("Migration verification:")
            logger.info(f"  Total documents: {stats.get('total_documents', 0)}")
            logger.info(f"  Public documents: {stats.get('public_documents', 0)}")
            
            for category in ScalableVectorKnowledgeBase.CATEGORIES:
                count = stats.get(category, 0)
                if count > 0:
                    logger.info(f"  {category}: {count} documents")
            
            # Test search functionality
            test_results = await self.new_kb.search(
                query="campground",
                limit=1,
                include_public=True
            )
            
            if test_results:
                logger.info("✅ Search functionality verified")
            else:
                logger.warning("⚠️ No search results found - may be normal if no campground data")
                
        except Exception as e:
            logger.error(f"Verification failed: {e}")
            raise


async def run_migration():
    """Run the migration process"""
    migration = KnowledgeBaseMigration()
    await migration.migrate()


if __name__ == "__main__":
    # Run migration when script is executed directly
    asyncio.run(run_migration())