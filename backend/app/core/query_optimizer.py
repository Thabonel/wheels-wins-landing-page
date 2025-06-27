
"""
Database Query Optimizer
Provides optimized queries and lazy loading utilities.
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from app.core.database_pool import get_db_pool
from app.services.cache_service import get_cache
from app.core.logging import setup_logging

logger = setup_logging()

class QueryOptimizer:
    """Database query optimization utilities"""
    
    def __init__(self):
        self.query_cache_ttl = 300  # 5 minutes
    
    async def get_expenses_optimized(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Optimized expense retrieval with pagination and caching"""
        cache_key = f"expenses:{user_id}:{limit}:{offset}"
        
        try:
            cache = await get_cache()
            cached_result = await cache.get(cache_key)
            if cached_result:
                return cached_result
        except Exception as e:
            logger.warning(f"Cache error in get_expenses_optimized: {e}")
        
        # Optimized query with indexing hints
        query = """
            SELECT id, amount, category, description, date, created_at
            FROM expenses 
            WHERE user_id = $1 
            ORDER BY date DESC, created_at DESC
            LIMIT $2 OFFSET $3
        """
        
        try:
            db_pool = await get_db_pool()
            results = await db_pool.fetch(query, user_id, limit, offset)
            
            # Convert to list of dicts
            expenses = [dict(row) for row in results]
            
            # Cache result
            try:
                cache = await get_cache()
                await cache.set(cache_key, expenses, ttl=self.query_cache_ttl)
            except Exception as e:
                logger.warning(f"Failed to cache expenses: {e}")
            
            return expenses
            
        except Exception as e:
            logger.error(f"Database error in get_expenses_optimized: {e}")
            return []
    
    async def get_budget_summary_optimized(self, user_id: str) -> Dict[str, Any]:
        """Optimized budget summary with aggregation"""
        cache_key = f"budget_summary:{user_id}"
        
        try:
            cache = await get_cache()
            cached_result = await cache.get(cache_key)
            if cached_result:
                return cached_result
        except Exception as e:
            logger.warning(f"Cache error in get_budget_summary_optimized: {e}")
        
        # Single optimized query for budget summary
        query = """
            WITH budget_totals AS (
                SELECT 
                    bc.id,
                    bc.name,
                    bc.budgeted_amount,
                    bc.color,
                    COALESCE(SUM(e.amount), 0) as spent_amount
                FROM budget_categories bc
                LEFT JOIN expenses e ON e.category = bc.name AND e.user_id = bc.user_id
                WHERE bc.user_id = $1
                GROUP BY bc.id, bc.name, bc.budgeted_amount, bc.color
            )
            SELECT 
                json_agg(
                    json_build_object(
                        'id', id,
                        'name', name,
                        'budgeted_amount', budgeted_amount,
                        'spent_amount', spent_amount,
                        'remaining_amount', budgeted_amount - spent_amount,
                        'percentage_used', CASE 
                            WHEN budgeted_amount > 0 
                            THEN (spent_amount / budgeted_amount * 100)::numeric(5,2)
                            ELSE 0 
                        END,
                        'color', color
                    )
                ) as categories,
                SUM(budgeted_amount) as total_budgeted,
                SUM(spent_amount) as total_spent,
                SUM(budgeted_amount - spent_amount) as total_remaining
            FROM budget_totals
        """
        
        try:
            db_pool = await get_db_pool()
            result = await db_pool.fetchrow(query, user_id)
            
            if not result or not result['categories']:
                summary = {
                    'categories': [],
                    'total_budgeted': 0,
                    'total_spent': 0,
                    'total_remaining': 0
                }
            else:
                summary = {
                    'categories': result['categories'],
                    'total_budgeted': float(result['total_budgeted'] or 0),
                    'total_spent': float(result['total_spent'] or 0),
                    'total_remaining': float(result['total_remaining'] or 0)
                }
            
            # Cache result
            try:
                cache = await get_cache()
                await cache.set(cache_key, summary, ttl=self.query_cache_ttl)
            except Exception as e:
                logger.warning(f"Failed to cache budget summary: {e}")
            
            return summary
            
        except Exception as e:
            logger.error(f"Database error in get_budget_summary_optimized: {e}")
            return {'categories': [], 'total_budgeted': 0, 'total_spent': 0, 'total_remaining': 0}
    
    async def get_fuel_stations_nearby(self, lat: float, lng: float, radius_miles: int = 25, limit: int = 20) -> List[Dict]:
        """Optimized nearby fuel stations query with spatial indexing"""
        cache_key = f"fuel_stations:{lat}:{lng}:{radius_miles}:{limit}"
        
        try:
            cache = await get_cache()
            cached_result = await cache.get(cache_key)
            if cached_result:
                return cached_result
        except Exception as e:
            logger.warning(f"Cache error in get_fuel_stations_nearby: {e}")
        
        # Optimized spatial query using haversine formula
        query = """
            SELECT 
                id, station_name, address, brand,
                latitude, longitude,
                regular_price, diesel_price, premium_price,
                rv_friendly, user_ratings, amenities,
                (
                    3959 * acos(
                        cos(radians($1)) * 
                        cos(radians(latitude)) * 
                        cos(radians(longitude) - radians($2)) + 
                        sin(radians($1)) * 
                        sin(radians(latitude))
                    )
                )::DECIMAL(8, 2) as distance_miles
            FROM fuel_stations
            WHERE 
                latitude BETWEEN $1 - ($3 / 69.0) AND $1 + ($3 / 69.0)
                AND longitude BETWEEN $2 - ($3 / 69.0) AND $2 + ($3 / 69.0)
                AND (
                    3959 * acos(
                        cos(radians($1)) * 
                        cos(radians(latitude)) * 
                        cos(radians(longitude) - radians($2)) + 
                        sin(radians($1)) * 
                        sin(radians(latitude))
                    )
                ) <= $3
            ORDER BY distance_miles ASC
            LIMIT $4
        """
        
        try:
            db_pool = await get_db_pool()
            results = await db_pool.fetch(query, lat, lng, radius_miles, limit)
            
            stations = [dict(row) for row in results]
            
            # Cache result for 10 minutes (fuel prices change frequently)
            try:
                cache = await get_cache()
                await cache.set(cache_key, stations, ttl=600)
            except Exception as e:
                logger.warning(f"Failed to cache fuel stations: {e}")
            
            return stations
            
        except Exception as e:
            logger.error(f"Database error in get_fuel_stations_nearby: {e}")
            return []
    
    async def batch_insert_expenses(self, user_id: str, expenses: List[Dict]) -> bool:
        """Optimized batch expense insertion"""
        if not expenses:
            return True
        
        # Prepare batch insert query
        values_placeholder = ",".join([f"(${i*5+1}, ${i*5+2}, ${i*5+3}, ${i*5+4}, ${i*5+5})" 
                                      for i in range(len(expenses))])
        
        query = f"""
            INSERT INTO expenses (user_id, amount, category, description, date)
            VALUES {values_placeholder}
        """
        
        # Flatten expense data
        args = []
        for expense in expenses:
            args.extend([
                user_id,
                expense['amount'],
                expense['category'],
                expense.get('description', ''),
                expense['date']
            ])
        
        try:
            db_pool = await get_db_pool()
            await db_pool.execute(query, *args)
            
            # Invalidate related caches
            try:
                cache = await get_cache()
                await cache.delete(f"expenses:{user_id}:*")
                await cache.delete(f"budget_summary:{user_id}")
            except Exception as e:
                logger.warning(f"Failed to invalidate caches: {e}")
            
            return True
            
        except Exception as e:
            logger.error(f"Database error in batch_insert_expenses: {e}")
            return False
    
    async def get_user_analytics_optimized(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Optimized user analytics with pre-calculated aggregations"""
        cache_key = f"user_analytics:{user_id}:{days}"
        
        try:
            cache = await get_cache()
            cached_result = await cache.get(cache_key)
            if cached_result:
                return cached_result
        except Exception as e:
            logger.warning(f"Cache error in get_user_analytics_optimized: {e}")
        
        start_date = datetime.now() - timedelta(days=days)
        
        # Complex analytics query with CTEs for optimization
        query = """
            WITH expense_stats AS (
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(amount) as total_spent,
                    AVG(amount) as avg_transaction,
                    category,
                    COUNT(*) as category_count
                FROM expenses 
                WHERE user_id = $1 AND date >= $2
                GROUP BY category
            ),
            daily_spending AS (
                SELECT 
                    date,
                    SUM(amount) as daily_total,
                    COUNT(*) as daily_transactions
                FROM expenses 
                WHERE user_id = $1 AND date >= $2
                GROUP BY date
                ORDER BY date
            )
            SELECT 
                (SELECT json_agg(row_to_json(es)) FROM expense_stats es) as category_stats,
                (SELECT json_agg(row_to_json(ds)) FROM daily_spending ds) as daily_stats,
                (SELECT SUM(total_spent) FROM expense_stats) as grand_total,
                (SELECT SUM(total_transactions) FROM expense_stats) as total_count
        """
        
        try:
            db_pool = await get_db_pool()
            result = await db_pool.fetchrow(query, user_id, start_date.date())
            
            analytics = {
                'category_breakdown': result['category_stats'] or [],
                'daily_spending': result['daily_stats'] or [],
                'total_spent': float(result['grand_total'] or 0),
                'total_transactions': int(result['total_count'] or 0),
                'period_days': days
            }
            
            # Cache for 1 hour
            try:
                cache = await get_cache()
                await cache.set(cache_key, analytics, ttl=3600)
            except Exception as e:
                logger.warning(f"Failed to cache analytics: {e}")
            
            return analytics
            
        except Exception as e:
            logger.error(f"Database error in get_user_analytics_optimized: {e}")
            return {'category_breakdown': [], 'daily_spending': [], 'total_spent': 0, 'total_transactions': 0}

# Global optimizer instance
query_optimizer = QueryOptimizer()

async def get_query_optimizer() -> QueryOptimizer:
    """Get query optimizer instance"""
    return query_optimizer
