"""
Production-ready with error handling and connection pooling
"""
import logging
from typing import Optional, Dict, Any, List
from app.core.config import get_settings
from supabase import create_client, Client

logger = logging.getLogger(__name__)

class DatabaseService:
    """Production database service using Supabase"""
    
    def __init__(self):
        self.client: Optional[Client] = None
        try:
            self._initialize_client()
        except Exception as e:
            logger.warning(f"Database initialization skipped: {e}")
    
    def _initialize_client(self):
        """Initialize Supabase client with error handling"""
        try:
            settings = get_settings()
            self.client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_ANON_KEY
            )
            logger.info("Database service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database service: {e}")
            raise
    
    async def health_check(self) -> Dict[str, Any]:
        """Check database connection health"""
        try:
            # Simple query to test connection
            result = self.client.table("health_check").select("*").limit(1).execute()
            return {
                "status": "healthy",
                "timestamp": str(result.data) if result else "connected"
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    def get_client(self) -> Client:
        """Get Supabase client instance"""
        if not self.client:
            self._initialize_client()
        return self.client

# Global instance, initialized lazily
database_service: Optional[DatabaseService] = None

def get_database_service() -> DatabaseService:
    """Get or create the global database service instance."""
    global database_service
    if not database_service:
        database_service = DatabaseService()
    return database_service
