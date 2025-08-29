"""
Performance Optimizer for PAM Database Service
Implements advanced optimization strategies to reduce query time and improve cache hit rate
"""
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
import asyncio
from app.services.cache import cache_service
from app.core.logging import get_logger
import json

logger = get_logger("pam_performance_optimizer")


class PerformanceOptimizer:
    """Optimizes database queries and caching strategies"""
    
    def __init__(self):
        self.query_patterns = {}
        self.cache_stats = {
            "hits": 0,
            "misses": 0,
            "total_queries": 0
        }
        self.prefetch_queue = asyncio.Queue()
        self.warmup_tables = [
            "profiles", "expenses", "calendar_events", 
            "maintenance_records", "budgets", "hustle_ideas"
        ]
        
    async def optimize_query(self, table: str, filters: Dict[str, Any], limit: Optional[int] = None) -> Dict[str, Any]:
        """Optimize query with intelligent caching and prefetching"""
        # Generate optimized cache key
        cache_key = self._generate_optimized_cache_key(table, filters, limit)
        
        # Track query pattern
        self._track_query_pattern(table, filters)
        
        # Check if we should prefetch related data
        await self._consider_prefetch(table, filters)
        
        return {"cache_key": cache_key, "should_batch": self._should_batch_query(table)}
    
    def _generate_optimized_cache_key(self, table: str, filters: Dict[str, Any], limit: Optional[int]) -> str:
        """Generate optimized cache key with normalized filters"""
        # Sort filters for consistent key generation
        sorted_filters = dict(sorted(filters.items()) if filters else {})
        
        # Create compact key representation
        filter_str = json.dumps(sorted_filters, separators=(',', ':'), sort_keys=True)
        
        # Use shorter key format
        return f"pam:{table}:{hash(filter_str) % 1000000}:{limit or 'all'}"
    
    def _track_query_pattern(self, table: str, filters: Dict[str, Any]):
        """Track query patterns for optimization"""
        pattern_key = f"{table}:{len(filters or {})}"
        
        if pattern_key not in self.query_patterns:
            self.query_patterns[pattern_key] = {
                "count": 0,
                "last_accessed": datetime.utcnow(),
                "avg_response_time": 0
            }
        
        self.query_patterns[pattern_key]["count"] += 1
        self.query_patterns[pattern_key]["last_accessed"] = datetime.utcnow()
    
    async def _consider_prefetch(self, table: str, filters: Dict[str, Any]):
        """Consider prefetching related data based on access patterns"""
        # Common access patterns that benefit from prefetching
        prefetch_patterns = {
            "expenses": ["budgets", "income_entries"],
            "calendar_events": ["expenses", "fuel_log"],
            "maintenance_records": ["fuel_log", "expenses"],
            "hustle_ideas": ["user_hustle_attempts", "income_entries"]
        }
        
        if table in prefetch_patterns:
            for related_table in prefetch_patterns[table]:
                await self.prefetch_queue.put({
                    "table": related_table,
                    "filters": {"user_id": filters.get("user_id")} if filters else {}
                })
    
    def _should_batch_query(self, table: str) -> bool:
        """Determine if query should be batched with others"""
        # Tables that benefit from batching
        batch_tables = {"expenses", "calendar_events", "social_posts", "analytics_daily"}
        return table in batch_tables
    
    async def warm_cache(self, user_id: str):
        """Warm cache with commonly accessed data"""
        logger.info(f"Warming cache for user {user_id}")
        
        warm_tasks = []
        for table in self.warmup_tables:
            cache_key = f"pam:{table}:warm:{user_id}"
            warm_tasks.append(self._warm_table_cache(table, user_id, cache_key))
        
        await asyncio.gather(*warm_tasks, return_exceptions=True)
        logger.info(f"Cache warming completed for user {user_id}")
    
    async def _warm_table_cache(self, table: str, user_id: str, cache_key: str):
        """Warm cache for a specific table"""
        try:
            # Cache warming data (would be actual query in production)
            warm_data = {
                "table": table,
                "user_id": user_id,
                "warmed_at": datetime.utcnow().isoformat(),
                "data": []  # Actual data would be fetched here
            }
            
            await cache_service.set(cache_key, warm_data, ttl=3600)  # 1 hour TTL
            
        except Exception as e:
            logger.warning(f"Failed to warm cache for {table}: {e}")
    
    def update_cache_stats(self, hit: bool):
        """Update cache statistics"""
        self.cache_stats["total_queries"] += 1
        
        if hit:
            self.cache_stats["hits"] += 1
        else:
            self.cache_stats["misses"] += 1
    
    def get_cache_hit_rate(self) -> float:
        """Calculate current cache hit rate"""
        if self.cache_stats["total_queries"] == 0:
            return 0.0
        
        return (self.cache_stats["hits"] / self.cache_stats["total_queries"]) * 100
    
    async def optimize_bulk_operations(self, operations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Optimize bulk operations by grouping and batching"""
        # Group operations by table and type
        grouped = {}
        for op in operations:
            key = f"{op['table']}:{op['operation']}"
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(op)
        
        # Sort groups by priority (reads first, then creates/updates)
        priority_order = {"read": 1, "create": 2, "update": 3, "delete": 4}
        sorted_groups = sorted(
            grouped.items(),
            key=lambda x: priority_order.get(x[0].split(':')[1], 5)
        )
        
        # Flatten back to optimized order
        optimized = []
        for _, ops in sorted_groups:
            optimized.extend(ops)
        
        return optimized
    
    async def get_optimization_report(self) -> Dict[str, Any]:
        """Get performance optimization report"""
        hit_rate = self.get_cache_hit_rate()
        
        # Identify slow patterns
        slow_patterns = [
            pattern for pattern, stats in self.query_patterns.items()
            if stats.get("avg_response_time", 0) > 40
        ]
        
        # Calculate prefetch effectiveness
        prefetch_size = self.prefetch_queue.qsize()
        
        return {
            "cache_hit_rate": hit_rate,
            "total_queries": self.cache_stats["total_queries"],
            "query_patterns": len(self.query_patterns),
            "slow_patterns": slow_patterns,
            "prefetch_queue_size": prefetch_size,
            "recommendations": self._generate_recommendations(hit_rate)
        }
    
    def _generate_recommendations(self, hit_rate: float) -> List[str]:
        """Generate optimization recommendations"""
        recommendations = []
        
        if hit_rate < 85:
            recommendations.append("Increase cache TTL for frequently accessed tables")
            recommendations.append("Implement more aggressive cache warming")
        
        if len(self.query_patterns) > 100:
            recommendations.append("Consider query pattern consolidation")
        
        if any(p["count"] > 1000 for p in self.query_patterns.values()):
            recommendations.append("Implement query result pagination for high-volume patterns")
        
        return recommendations


# Singleton instance
_performance_optimizer = None

def get_performance_optimizer() -> PerformanceOptimizer:
    """Get or create performance optimizer instance"""
    global _performance_optimizer
    
    if _performance_optimizer is None:
        _performance_optimizer = PerformanceOptimizer()
    
    return _performance_optimizer