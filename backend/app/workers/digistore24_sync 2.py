"""
Digistore24 Product Sync Worker
Scheduled task to sync products from Digistore24 marketplace.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from app.core.config import get_settings
from app.services.digistore24_marketplace import marketplace_service
from app.db.supabase import get_supabase_client

logger = logging.getLogger(__name__)
settings = get_settings()


class Digistore24SyncWorker:
    """Worker for syncing Digistore24 products."""
    
    def __init__(self):
        self.is_running = False
        self.last_sync: Optional[datetime] = None
        self.sync_interval = timedelta(hours=24)  # Daily sync
        
    async def start(self):
        """Start the sync worker."""
        if not settings.DIGISTORE24_SYNC_ENABLED:
            logger.info("Digistore24 sync is disabled")
            return
        
        if not settings.DIGISTORE24_API_KEY:
            logger.warning("Digistore24 API key not configured, sync disabled")
            return
        
        self.is_running = True
        logger.info("Starting Digistore24 sync worker")
        
        # Run initial sync
        await self.run_sync()
        
        # Schedule periodic syncs
        while self.is_running:
            try:
                # Wait for next sync interval
                await asyncio.sleep(self.sync_interval.total_seconds())
                
                # Run sync
                await self.run_sync()
                
            except Exception as e:
                logger.error(f"Sync worker error: {str(e)}")
                # Wait 5 minutes before retrying
                await asyncio.sleep(300)
    
    async def stop(self):
        """Stop the sync worker."""
        logger.info("Stopping Digistore24 sync worker")
        self.is_running = False
    
    async def run_sync(self):
        """Run a product sync."""
        logger.info("Starting Digistore24 product sync")
        start_time = datetime.utcnow()
        
        try:
            # Get database client
            db = await get_supabase_client()
            
            # Run sync
            stats = await marketplace_service.sync_products_to_database(db)
            
            # Update last sync time
            self.last_sync = datetime.utcnow()
            
            # Log results
            duration = (datetime.utcnow() - start_time).total_seconds()
            logger.info(
                f"Digistore24 sync completed in {duration:.2f}s - "
                f"Added: {stats['products_added']}, "
                f"Updated: {stats['products_updated']}, "
                f"Removed: {stats['products_removed']}, "
                f"Errors: {stats['errors']}"
            )
            
        except Exception as e:
            logger.error(f"Product sync failed: {str(e)}")
            raise
    
    async def force_sync(self) -> dict:
        """Force an immediate sync (called via API)."""
        logger.info("Force sync requested")
        await self.run_sync()
        
        # Get latest sync stats
        db = await get_supabase_client()
        result = await db.table('digistore24_sync_logs').select('*').order(
            'created_at', desc=True
        ).limit(1).execute()
        
        if result.data:
            return result.data[0]
        return {'status': 'completed', 'message': 'Sync completed'}


# Create global worker instance
sync_worker = Digistore24SyncWorker()


# FastAPI startup/shutdown hooks
async def start_sync_worker():
    """Start the sync worker on app startup."""
    asyncio.create_task(sync_worker.start())


async def stop_sync_worker():
    """Stop the sync worker on app shutdown."""
    await sync_worker.stop()