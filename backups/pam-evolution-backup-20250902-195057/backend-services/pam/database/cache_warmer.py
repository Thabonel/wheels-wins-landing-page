"""
Cache Warmer for PAM Database Service
Improves cache hit rate by pre-loading frequently accessed data
"""
import asyncio
from typing import Dict, Any, List
from datetime import datetime, timedelta
from app.services.pam.database.unified_database_service import get_pam_database_service
from app.services.cache import cache_service
from app.core.logging import get_logger
import json

logger = get_logger("pam_cache_warmer")


class CacheWarmer:
    """Warms cache with frequently accessed data patterns"""
    
    def __init__(self):
        self.warming_patterns = {
            "user_profile": {
                "tables": ["profiles"],
                "ttl": 3600,  # 1 hour
                "priority": "high"
            },
            "recent_expenses": {
                "tables": ["expenses"],
                "filters": {"date": {"gte": (datetime.utcnow() - timedelta(days=30)).isoformat()}},
                "ttl": 1800,  # 30 minutes
                "priority": "high"
            },
            "active_budgets": {
                "tables": ["budgets", "budget_categories"],
                "filters": {"is_active": True},
                "ttl": 3600,
                "priority": "high"
            },
            "upcoming_events": {
                "tables": ["calendar_events"],
                "filters": {"start_date": {"gte": datetime.utcnow().isoformat()}},
                "ttl": 1800,
                "priority": "medium"
            },
            "maintenance_due": {
                "tables": ["maintenance_records"],
                "filters": {"status": "pending"},
                "ttl": 3600,
                "priority": "medium"
            },
            "active_hustles": {
                "tables": ["hustle_ideas", "user_hustle_attempts"],
                "filters": {"status": "approved"},
                "ttl": 3600,
                "priority": "low"
            }
        }
        
    async def warm_all_users(self):
        """Warm cache for all active users"""
        try:
            db = await get_pam_database_service()
            
            # Get active users (those with recent activity)
            profiles_table = await db.get_table("profiles")
            recent_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
            
            active_users = await profiles_table.read(
                filters={"updated_at": {"gte": recent_date}},
                limit=100  # Process top 100 active users
            )
            
            if not active_users.get("success"):
                logger.error("Failed to fetch active users")
                return
            
            # Warm cache for each active user
            warm_tasks = []
            for user in active_users.get("data", []):
                user_id = user.get("user_id")
                if user_id:
                    warm_tasks.append(self.warm_user_cache(user_id))
            
            # Process in batches to avoid overload
            batch_size = 10
            for i in range(0, len(warm_tasks), batch_size):
                batch = warm_tasks[i:i + batch_size]
                await asyncio.gather(*batch, return_exceptions=True)
                await asyncio.sleep(0.5)  # Brief pause between batches
            
            logger.info(f"Cache warming completed for {len(warm_tasks)} users")
            
        except Exception as e:
            logger.error(f"Cache warming failed: {e}")
    
    async def warm_user_cache(self, user_id: str):
        """Warm cache for specific user"""
        try:
            db = await get_pam_database_service()
            
            for pattern_name, pattern_config in self.warming_patterns.items():
                if pattern_config.get("priority") not in ["high", "medium"]:
                    continue  # Skip low priority in bulk warming
                
                tables = pattern_config.get("tables", [])
                base_filters = pattern_config.get("filters", {})
                ttl = pattern_config.get("ttl", 1800)
                
                for table_name in tables:
                    # Prepare filters with user_id
                    filters = {**base_filters, "user_id": user_id}
                    
                    # Generate cache key
                    cache_key = f"pam:{table_name}:warm:{user_id}:{pattern_name}"
                    
                    # Check if already cached
                    existing = await cache_service.get(cache_key)
                    if existing:
                        continue  # Skip if already cached
                    
                    # Fetch and cache data
                    table = await db.get_table(table_name)
                    result = await table.read(filters=filters, limit=50)
                    
                    if result.get("success") and result.get("data"):
                        await cache_service.set(cache_key, result["data"], ttl=ttl)
                        logger.debug(f"Warmed cache for {table_name} - user {user_id}")
            
        except Exception as e:
            logger.warning(f"Failed to warm cache for user {user_id}: {e}")
    
    async def get_warming_stats(self) -> Dict[str, Any]:
        """Get statistics about cache warming effectiveness"""
        stats = {
            "patterns": len(self.warming_patterns),
            "tables_covered": set(),
            "estimated_coverage": 0
        }
        
        # Calculate coverage
        for pattern in self.warming_patterns.values():
            stats["tables_covered"].update(pattern.get("tables", []))
        
        stats["tables_covered"] = list(stats["tables_covered"])
        stats["estimated_coverage"] = len(stats["tables_covered"]) / 39 * 100  # 39 total tables
        
        return stats


# Singleton instance
_cache_warmer = None

def get_cache_warmer() -> CacheWarmer:
    """Get or create cache warmer instance"""
    global _cache_warmer
    
    if _cache_warmer is None:
        _cache_warmer = CacheWarmer()
    
    return _cache_warmer


async def run_cache_warming():
    """Run cache warming as a scheduled task"""
    warmer = get_cache_warmer()
    
    while True:
        try:
            logger.info("Starting cache warming cycle")
            await warmer.warm_all_users()
            
            # Get and log stats
            stats = await warmer.get_warming_stats()
            logger.info(f"Cache warming stats: {stats}")
            
            # Run every 15 minutes
            await asyncio.sleep(900)
            
        except Exception as e:
            logger.error(f"Cache warming cycle failed: {e}")
            await asyncio.sleep(300)  # Retry after 5 minutes on error