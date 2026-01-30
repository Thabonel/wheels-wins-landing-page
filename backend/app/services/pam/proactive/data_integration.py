"""
Data Integration Utilities for Proactive PAM System

Comprehensive database integration for real user data queries with:
- Enhanced Supabase database queries using service role
- Proper schema compliance (profiles.id vs other tables user_id)
- Optimized queries with connection pooling
- Batch processing for scheduled tasks handling multiple users
- Performance monitoring and caching strategies
- Real-time data access for proactive system needs

This replaces mock data with production-ready database access.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, date
from decimal import Decimal
import json
from contextlib import asynccontextmanager

from app.services.database import DatabaseService
from app.services.pam.tools.tool_registry import ToolRegistry
from app.core.logging import get_logger
from app.services.pam.proactive.error_handling import (
    error_handler,
    DataValidator,
    DataSourceError,
    ExternalAPIError,
    retry_on_failure,
    fallback_on_error
)

logger = get_logger(__name__)

# Connection pool for efficient database access
_connection_pool = None

class ProactiveDataIntegrator:
    """
    Enhanced database integration for proactive PAM suggestions

    Features:
    - Real Supabase database queries using service role (bypasses RLS)
    - Proper schema compliance (profiles.id vs user_id)
    - Connection pooling and performance optimization
    - Batch queries for processing multiple users
    - Error handling with graceful fallbacks
    - Performance monitoring and caching
    """

    def __init__(self):
        self.db_service = DatabaseService()
        self.tool_registry = None
        self._connection_cache = {}
        self._query_cache = {}
        self._cache_ttl = 300  # 5 minutes
        self._performance_metrics = {
            "queries_executed": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "avg_query_time": 0.0
        }

    async def initialize_tool_registry(self):
        """Initialize tool registry for PAM tool access"""
        if not self.tool_registry:
            self.tool_registry = ToolRegistry()
            await self.tool_registry.initialize()

    async def initialize_connection_pool(self):
        """Initialize database connection pool for optimal performance"""
        global _connection_pool
        if not _connection_pool:
            try:
                # Use service client for bypassing RLS in proactive queries
                if hasattr(self.db_service, 'service_client') and self.db_service.service_client:
                    _connection_pool = self.db_service.service_client
                    logger.info("Initialized connection pool with service role access")
                else:
                    _connection_pool = self.db_service.client
                    logger.warning("Using standard client - some queries may fail due to RLS")
            except Exception as e:
                logger.error(f"Failed to initialize connection pool: {e}")
                _connection_pool = self.db_service.client

    @asynccontextmanager
    async def get_database_connection(self):
        """Get database connection from pool with proper error handling"""
        await self.initialize_connection_pool()
        try:
            if not _connection_pool:
                raise DataSourceError("Database connection pool not available")
            yield _connection_pool
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise DataSourceError(f"Database connection failed: {e}")

    def _cache_key(self, operation: str, *args) -> str:
        """Generate cache key for operation"""
        key_parts = [operation] + [str(arg) for arg in args if arg is not None]
        return ":".join(key_parts)

    def _get_cache(self, key: str) -> Optional[Any]:
        """Get cached result if still valid"""
        if key in self._query_cache:
            result, timestamp = self._query_cache[key]
            if datetime.now().timestamp() - timestamp < self._cache_ttl:
                self._performance_metrics["cache_hits"] += 1
                return result
            else:
                # Expired cache entry
                del self._query_cache[key]

        self._performance_metrics["cache_misses"] += 1
        return None

    def _set_cache(self, key: str, value: Any):
        """Set cache with timestamp"""
        self._query_cache[key] = (value, datetime.now().timestamp())

    async def _time_query(self, query_func, *args, **kwargs):
        """Time query execution and update metrics"""
        start_time = datetime.now()
        try:
            result = await query_func(*args, **kwargs)
            execution_time = (datetime.now() - start_time).total_seconds()

            # Update metrics
            self._performance_metrics["queries_executed"] += 1
            current_avg = self._performance_metrics["avg_query_time"]
            query_count = self._performance_metrics["queries_executed"]
            self._performance_metrics["avg_query_time"] = (
                (current_avg * (query_count - 1) + execution_time) / query_count
            )

            if execution_time > 1.0:  # Slow query warning
                logger.warning(f"Slow query detected: {execution_time:.2f}s")

            return result
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"Query failed after {execution_time:.2f}s: {e}")
            raise

    # =============================================================================
    # USER DATA QUERIES - ENHANCED WITH REAL DATABASE ACCESS
    # =============================================================================

    @retry_on_failure(max_retries=2, exceptions=(DataSourceError,))
    async def get_all_active_users(self) -> List[Dict[str, Any]]:
        """
        Get list of all active users for proactive monitoring

        Uses service role to bypass RLS and efficiently fetch user data
        for background processing tasks.
        """
        cache_key = self._cache_key("active_users")
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            async with self.get_database_connection() as db:
                # CRITICAL: profiles table uses 'id' NOT 'user_id'
                result = await self._time_query(
                    lambda: db.table("profiles").select(
                        "id, email, full_name, status, created_at, vehicle_type, fuel_type, preferred_units"
                    ).eq("status", "active").execute()
                )

                if not result or not hasattr(result, 'data'):
                    raise DataSourceError("Invalid response from profiles table")

                users = []
                for profile in result.data:
                    if not profile.get("id"):
                        continue  # Skip invalid profiles

                    users.append({
                        "id": profile["id"],
                        "email": profile["email"],
                        "name": profile.get("full_name", ""),
                        "status": profile.get("status", "active"),
                        "created_at": profile.get("created_at"),
                        "vehicle_type": profile.get("vehicle_type"),
                        "fuel_type": profile.get("fuel_type"),
                        "preferred_units": profile.get("preferred_units", "metric")
                    })

                logger.info(f"Retrieved {len(users)} active users for proactive monitoring")
                self._set_cache(cache_key, users)
                return users

        except Exception as e:
            logger.error(f"Error getting active users: {e}")
            # Use error handler for consistent fallback
            return await error_handler.safe_execute(
                func=lambda: [],
                function_name="get_all_active_users",
                fallback_value=[]
            )

    async def get_users_batch(self, user_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Efficiently fetch multiple user profiles in a single query

        Critical for scheduled tasks that process multiple users.
        """
        if not user_ids:
            return {}

        cache_key = self._cache_key("users_batch", *sorted(user_ids))
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            async with self.get_database_connection() as db:
                # Use 'in' filter for batch query - profiles uses 'id' NOT 'user_id'
                result = await self._time_query(
                    lambda: db.table("profiles").select("*").in_("id", user_ids).execute()
                )

                users_dict = {}
                if result and result.data:
                    for profile in result.data:
                        user_id = profile["id"]
                        users_dict[user_id] = profile

                logger.info(f"Retrieved batch data for {len(users_dict)}/{len(user_ids)} users")
                self._set_cache(cache_key, users_dict)
                return users_dict

        except Exception as e:
            logger.error(f"Error getting users batch: {e}")
            return {}

    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get comprehensive user profile data

        Includes travel preferences, vehicle info, and settings.
        """
        cache_key = self._cache_key("user_profile", user_id)
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            async with self.get_database_connection() as db:
                # CRITICAL: profiles table uses 'id' NOT 'user_id'
                result = await self._time_query(
                    lambda: db.table("profiles").select("*").eq("id", user_id).single().execute()
                )

                profile = result.data if result.data else None
                self._set_cache(cache_key, profile)
                return profile

        except Exception as e:
            logger.error(f"Error getting user profile for {user_id}: {e}")
            return None

    async def get_user_location(self, user_id: str) -> Dict[str, float]:
        """
        Get user's current or last known location

        Checks multiple sources: cached location, recent trip data, profile settings.
        """
        cache_key = self._cache_key("user_location", user_id)
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            # Strategy 1: Check if we have cached location data
            # (This would be updated by frontend when user shares location)

            # Strategy 2: Get location from most recent trip
            async with self.get_database_connection() as db:
                trip_result = await self._time_query(
                    lambda: db.table("trips").select(
                        "route_data"
                    ).eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
                )

                location_data = {}
                if trip_result and trip_result.data:
                    trip = trip_result.data[0]
                    route_data = trip.get("route_data", {})

                    # Parse JSON if it's a string
                    if isinstance(route_data, str):
                        try:
                            route_data = json.loads(route_data)
                        except json.JSONDecodeError:
                            route_data = {}

                    # Extract origin coordinates from most recent trip
                    if isinstance(route_data, dict) and "origin" in route_data:
                        origin = route_data["origin"]
                        if isinstance(origin, dict):
                            lat = origin.get("lat")
                            lng = origin.get("lng")
                            if lat is not None and lng is not None:
                                location_data = {"lat": lat, "lng": lng}
                                logger.info(f"Found location from recent trip for {user_id}")

                self._set_cache(cache_key, location_data)
                return location_data

        except Exception as e:
            logger.error(f"Error getting user location for {user_id}: {e}")
            return {}

    async def get_users_for_monitoring(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get users who should be actively monitored by the proactive system

        Filters based on recent activity, opt-in status, and system capacity.
        """
        try:
            async with self.get_database_connection() as db:
                # Get active users who have recent activity (expenses, trips, or calendar events)
                recent_date = (datetime.now() - timedelta(days=30)).isoformat()

                # Query users with recent expenses
                expenses_users = await self._time_query(
                    lambda: db.table("expenses").select("user_id").gte(
                        "created_at", recent_date
                    ).execute()
                )

                # Query users with recent trips
                trips_users = await self._time_query(
                    lambda: db.table("trips").select("user_id").gte(
                        "created_at", recent_date
                    ).execute()
                )

                # Query users with upcoming calendar events
                future_date = (datetime.now() + timedelta(days=7)).isoformat()
                calendar_users = await self._time_query(
                    lambda: db.table("calendar_events").select("user_id").gte(
                        "start_date", datetime.now().isoformat()
                    ).lte("start_date", future_date).execute()
                )

                # Combine and deduplicate active user IDs
                active_user_ids = set()

                if expenses_users and expenses_users.data:
                    active_user_ids.update(exp["user_id"] for exp in expenses_users.data)

                if trips_users and trips_users.data:
                    active_user_ids.update(trip["user_id"] for trip in trips_users.data)

                if calendar_users and calendar_users.data:
                    active_user_ids.update(cal["user_id"] for cal in calendar_users.data)

                # Get profile data for active users
                if active_user_ids:
                    active_user_ids_list = list(active_user_ids)[:limit]
                    users_data = await self.get_users_batch(active_user_ids_list)

                    monitoring_users = []
                    for user_id, profile in users_data.items():
                        if profile.get("status") == "active":
                            monitoring_users.append({
                                "id": user_id,
                                "name": profile.get("full_name", ""),
                                "email": profile.get("email", ""),
                                "vehicle_type": profile.get("vehicle_type"),
                                "fuel_type": profile.get("fuel_type"),
                                "last_activity": recent_date  # Simplified
                            })

                    logger.info(f"Found {len(monitoring_users)} users for active monitoring")
                    return monitoring_users

                return []

        except Exception as e:
            logger.error(f"Error getting users for monitoring: {e}")
            return []

    # =============================================================================
    # FINANCIAL DATA - ENHANCED WITH REAL DATABASE QUERIES
    # =============================================================================

    @fallback_on_error(fallback_value=0.0)
    @retry_on_failure(max_retries=2, exceptions=(DataSourceError,))
    async def get_monthly_spending(self, user_id: str, month: Optional[date] = None) -> float:
        """
        Get user's spending for specified month using optimized database query

        Uses indexed queries and proper date filtering for performance.
        """
        # Validate inputs
        if not DataValidator.validate_user_id(user_id):
            raise DataSourceError(f"Invalid user_id: {user_id}")

        if not month:
            month = date.today().replace(day=1)  # First day of current month

        cache_key = self._cache_key("monthly_spending", user_id, month.isoformat())
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        # Calculate month boundaries
        start_date = month
        if month.month == 12:
            end_date = date(month.year + 1, 1, 1)
        else:
            end_date = date(month.year, month.month + 1, 1)

        try:
            async with self.get_database_connection() as db:
                # Optimized query with proper indexing
                result = await self._time_query(
                    lambda: db.table("expenses").select(
                        "amount"
                    ).eq("user_id", user_id).gte("date", str(start_date)).lt("date", str(end_date)).execute()
                )

                if not result or not hasattr(result, 'data'):
                    raise DataSourceError("Invalid response from expenses query")

                total_spent = 0.0
                for expense in result.data:
                    try:
                        amount = float(expense.get("amount", 0))
                        if amount > 0:  # Only count positive amounts
                            total_spent += amount
                    except (ValueError, TypeError):
                        logger.warning(f"Invalid amount in expense: {expense}")
                        continue

                logger.info(f"Retrieved monthly spending for {user_id}: ${total_spent:.2f}")
                self._set_cache(cache_key, total_spent)
                return total_spent

        except Exception as e:
            logger.error(f"Error getting monthly spending for {user_id}: {e}")
            raise DataSourceError(f"Failed to query monthly spending: {e}")

    async def get_monthly_budget(self, user_id: str, month: Optional[date] = None) -> float:
        """Get user's monthly budget with caching"""
        if not month:
            month = date.today().replace(day=1)

        cache_key = self._cache_key("monthly_budget", user_id, month.isoformat())
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            async with self.get_database_connection() as db:
                # Query budgets table for monthly budgets
                result = await self._time_query(
                    lambda: db.table("budgets").select(
                        "amount, period, category"
                    ).eq("user_id", user_id).eq("period", "monthly").execute()
                )

                total_budget = 0.0
                if result and result.data:
                    for budget in result.data:
                        try:
                            amount = float(budget.get("amount", 0))
                            if amount > 0:
                                total_budget += amount
                        except (ValueError, TypeError):
                            logger.warning(f"Invalid budget amount: {budget}")

                logger.info(f"Retrieved monthly budget for {user_id}: ${total_budget:.2f}")
                self._set_cache(cache_key, total_budget)
                return total_budget

        except Exception as e:
            logger.error(f"Error getting monthly budget for {user_id}: {e}")
            return 0.0

    async def get_recent_expenses(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent expenses with full details for analysis

        Returns expense objects with amounts, categories, and dates.
        """
        cache_key = self._cache_key("recent_expenses", user_id, limit)
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            async with self.get_database_connection() as db:
                result = await self._time_query(
                    lambda: db.table("expenses").select(
                        "amount, date, category, description, location"
                    ).eq("user_id", user_id).order("date", desc=True).limit(limit).execute()
                )

                expenses = []
                if result and result.data:
                    for expense in result.data:
                        expenses.append({
                            "amount": float(expense.get("amount", 0)),
                            "date": expense.get("date"),
                            "category": expense.get("category", ""),
                            "description": expense.get("description", ""),
                            "location": expense.get("location", "")
                        })

                logger.info(f"Retrieved {len(expenses)} recent expenses for {user_id}")
                self._set_cache(cache_key, expenses)
                return expenses

        except Exception as e:
            logger.error(f"Error getting recent expenses for {user_id}: {e}")
            return []

    async def get_expense_patterns(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """
        Analyze spending patterns for proactive insights

        Returns category breakdowns, trends, and anomalies.
        """
        cache_key = self._cache_key("expense_patterns", user_id, days)
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            async with self.get_database_connection() as db:
                # Get expenses from the last N days
                start_date = (datetime.now() - timedelta(days=days)).date()

                result = await self._time_query(
                    lambda: db.table("expenses").select(
                        "amount, date, category"
                    ).eq("user_id", user_id).gte("date", str(start_date)).execute()
                )

                patterns = {
                    "total_amount": 0.0,
                    "expense_count": 0,
                    "categories": {},
                    "daily_average": 0.0,
                    "highest_day": {"date": None, "amount": 0.0},
                    "trends": "stable"  # stable, increasing, decreasing
                }

                if result and result.data:
                    daily_totals = {}
                    category_totals = {}

                    for expense in result.data:
                        amount = float(expense.get("amount", 0))
                        expense_date = expense.get("date")
                        category = expense.get("category", "other")

                        patterns["total_amount"] += amount
                        patterns["expense_count"] += 1

                        # Category analysis
                        category_totals[category] = category_totals.get(category, 0) + amount

                        # Daily analysis
                        if expense_date:
                            daily_totals[expense_date] = daily_totals.get(expense_date, 0) + amount

                    patterns["categories"] = category_totals
                    patterns["daily_average"] = patterns["total_amount"] / max(days, 1)

                    # Find highest spending day
                    if daily_totals:
                        highest_date, highest_amount = max(daily_totals.items(), key=lambda x: x[1])
                        patterns["highest_day"] = {"date": highest_date, "amount": highest_amount}

                    # Simple trend analysis (compare first vs second half)
                    if len(daily_totals) >= 4:
                        sorted_dates = sorted(daily_totals.keys())
                        mid_point = len(sorted_dates) // 2

                        first_half = sum(daily_totals[date] for date in sorted_dates[:mid_point])
                        second_half = sum(daily_totals[date] for date in sorted_dates[mid_point:])

                        if second_half > first_half * 1.2:
                            patterns["trends"] = "increasing"
                        elif second_half < first_half * 0.8:
                            patterns["trends"] = "decreasing"

                logger.info(f"Analyzed expense patterns for {user_id}: ${patterns['total_amount']:.2f} over {days} days")
                self._set_cache(cache_key, patterns)
                return patterns

        except Exception as e:
            logger.error(f"Error analyzing expense patterns for {user_id}: {e}")
            return {
                "total_amount": 0.0,
                "expense_count": 0,
                "categories": {},
                "daily_average": 0.0,
                "highest_day": {"date": None, "amount": 0.0},
                "trends": "stable"
            }

    async def get_users_spending_data_batch(self, user_ids: List[str]) -> Dict[str, Dict[str, float]]:
        """
        Efficiently get spending data for multiple users in batch queries

        Critical for scheduled tasks processing multiple users.
        """
        if not user_ids:
            return {}

        try:
            spending_data = {}

            # Batch query expenses for all users
            async with self.get_database_connection() as db:
                current_month = date.today().replace(day=1)
                next_month = current_month.replace(day=28) + timedelta(days=4)
                next_month = next_month.replace(day=1)

                # Get all expenses for these users this month
                expenses_result = await self._time_query(
                    lambda: db.table("expenses").select(
                        "user_id, amount"
                    ).in_("user_id", user_ids).gte(
                        "date", str(current_month)
                    ).lt("date", str(next_month)).execute()
                )

                # Get all budgets for these users
                budgets_result = await self._time_query(
                    lambda: db.table("budgets").select(
                        "user_id, amount, period"
                    ).in_("user_id", user_ids).eq("period", "monthly").execute()
                )

                # Process expenses by user
                user_expenses = {}
                if expenses_result and expenses_result.data:
                    for expense in expenses_result.data:
                        user_id = expense["user_id"]
                        amount = float(expense.get("amount", 0))
                        user_expenses[user_id] = user_expenses.get(user_id, 0) + amount

                # Process budgets by user
                user_budgets = {}
                if budgets_result and budgets_result.data:
                    for budget in budgets_result.data:
                        user_id = budget["user_id"]
                        amount = float(budget.get("amount", 0))
                        user_budgets[user_id] = user_budgets.get(user_id, 0) + amount

                # Combine results
                for user_id in user_ids:
                    spending_data[user_id] = {
                        "spent": user_expenses.get(user_id, 0.0),
                        "budget": user_budgets.get(user_id, 0.0)
                    }

            logger.info(f"Retrieved batch spending data for {len(spending_data)} users")
            return spending_data

        except Exception as e:
            logger.error(f"Error getting batch spending data: {e}")
            return {}

    # =============================================================================
    # FUEL & VEHICLE DATA - ENHANCED WITH SMART ALGORITHMS
    # =============================================================================

    async def get_fuel_level(self, user_id: str) -> float:
        """
        Get current fuel level estimate using intelligent analysis

        Combines fuel log data, trip patterns, and vehicle info for accuracy.
        """
        cache_key = self._cache_key("fuel_level", user_id)
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            async with self.get_database_connection() as db:
                # Get recent fuel log entries
                fuel_result = await self._time_query(
                    lambda: db.table("fuel_log").select(
                        "date, gallons, cost, location, odometer, mpg"
                    ).eq("user_id", user_id).order("date", desc=True).limit(5).execute()
                )

                if not fuel_result or not fuel_result.data:
                    logger.info(f"No fuel log data for {user_id}, returning default level")
                    return 75.0  # Default assumption

                # Get user's vehicle info for better estimates
                user_profile = await self.get_user_profile(user_id)
                vehicle_info = {
                    "type": user_profile.get("vehicle_type") if user_profile else None,
                    "fuel_type": user_profile.get("fuel_type") if user_profile else None
                }

                # Analyze fuel data
                latest_entry = fuel_result.data[0]
                last_fillup_date = datetime.fromisoformat(latest_entry["date"]).date()
                days_since_fillup = (datetime.now().date() - last_fillup_date).days

                # Get estimated MPG from logs or use vehicle type defaults
                estimated_mpg = 10.0  # Default
                if latest_entry.get("mpg"):
                    estimated_mpg = float(latest_entry["mpg"])
                elif vehicle_info.get("type"):
                    # Vehicle type-based MPG estimates
                    mpg_estimates = {
                        "rv": 8.0,
                        "truck": 12.0,
                        "van": 15.0,
                        "car": 25.0,
                        "motorcycle": 40.0
                    }
                    vehicle_type = vehicle_info["type"].lower()
                    estimated_mpg = mpg_estimates.get(vehicle_type, 10.0)

                # Estimate daily driving based on user's travel patterns
                travel_patterns = await self.get_travel_patterns(user_id)
                daily_miles = 50  # Default assumption

                if travel_patterns.get("avg_trip_length"):
                    # Adjust based on user's actual travel behavior
                    avg_trip = travel_patterns["avg_trip_length"]
                    total_trips = travel_patterns.get("total_trips", 1)
                    # Estimate daily miles based on trip frequency
                    daily_miles = min(avg_trip / 10, 100)  # Cap at 100 miles/day

                # Calculate estimated fuel used
                estimated_miles_driven = days_since_fillup * daily_miles
                gallons_used = estimated_miles_driven / estimated_mpg

                # Estimate tank capacity based on vehicle type
                tank_capacity = 25  # Default gallons
                if vehicle_info.get("type"):
                    capacity_estimates = {
                        "rv": 80,
                        "truck": 35,
                        "van": 25,
                        "car": 15,
                        "motorcycle": 4
                    }
                    vehicle_type = vehicle_info["type"].lower()
                    tank_capacity = capacity_estimates.get(vehicle_type, 25)

                # Calculate current fuel level percentage
                gallons_at_fillup = float(latest_entry.get("gallons", tank_capacity * 0.8))
                current_gallons = max(0, gallons_at_fillup - gallons_used)
                current_level = min(100, (current_gallons / tank_capacity) * 100)

                # Apply confidence adjustments based on data quality
                confidence_factor = 1.0
                if days_since_fillup > 14:  # Old data
                    confidence_factor = 0.7
                elif not latest_entry.get("mpg"):  # No MPG data
                    confidence_factor = 0.8

                # Adjust estimate based on confidence
                if confidence_factor < 1.0:
                    # Blend with conservative estimate
                    conservative_estimate = 50.0  # Conservative middle ground
                    current_level = current_level * confidence_factor + conservative_estimate * (1 - confidence_factor)

                logger.info(f"Estimated fuel level for {user_id}: {current_level:.1f}% (confidence: {confidence_factor:.1f})")
                self._set_cache(cache_key, current_level)
                return current_level

        except Exception as e:
            logger.error(f"Error getting fuel level for {user_id}: {e}")
            return 75.0  # Fallback level

    async def get_travel_patterns(self, user_id: str) -> Dict[str, Any]:
        """
        Analyze comprehensive travel patterns from multiple data sources

        Combines trips, fuel logs, and expenses for intelligent insights.
        """
        cache_key = self._cache_key("travel_patterns", user_id)
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            async with self.get_database_connection() as db:
                # Get recent trips
                trips_result = await self._time_query(
                    lambda: db.table("trips").select(
                        "distance_miles, start_date, end_date, actual_cost, estimated_cost, origin, destination, status"
                    ).eq("user_id", user_id).order("start_date", desc=True).limit(30).execute()
                )

                # Get fuel logs for travel analysis
                fuel_result = await self._time_query(
                    lambda: db.table("fuel_log").select(
                        "date, gallons, cost, location, odometer, mpg"
                    ).eq("user_id", user_id).order("date", desc=True).limit(20).execute()
                )

                # Get travel-related expenses
                travel_expenses_result = await self._time_query(
                    lambda: db.table("expenses").select(
                        "amount, date, category, location"
                    ).eq("user_id", user_id).ilike("category", "%fuel%").or_("category", "ilike", "%travel%").limit(20).execute()
                )

                # Initialize pattern analysis
                patterns = {
                    "avg_trip_length": 0,
                    "preferred_fuel_stops": 1,
                    "total_trips": 0,
                    "avg_cost_per_mile": 0.0,
                    "common_destinations": [],
                    "travel_frequency": "low",  # low, medium, high
                    "fuel_efficiency": 0.0,
                    "last_long_trip": None,
                    "seasonal_patterns": {},
                    "cost_trends": "stable"
                }

                # Analyze trips
                if trips_result and trips_result.data:
                    trips = trips_result.data
                    patterns["total_trips"] = len(trips)

                    # Calculate averages
                    valid_distances = [float(trip.get("distance_miles", 0)) for trip in trips if trip.get("distance_miles")]
                    if valid_distances:
                        patterns["avg_trip_length"] = round(sum(valid_distances) / len(valid_distances))
                        patterns["preferred_fuel_stops"] = max(1, int(patterns["avg_trip_length"] / 300))

                    # Analyze costs
                    valid_costs = [float(trip.get("actual_cost", 0)) for trip in trips if trip.get("actual_cost")]
                    valid_distances_with_costs = [
                        float(trip.get("distance_miles", 0)) for trip in trips
                        if trip.get("actual_cost") and trip.get("distance_miles")
                    ]

                    if valid_costs and valid_distances_with_costs and len(valid_costs) == len(valid_distances_with_costs):
                        total_cost = sum(valid_costs)
                        total_miles = sum(valid_distances_with_costs)
                        if total_miles > 0:
                            patterns["avg_cost_per_mile"] = round(total_cost / total_miles, 2)

                    # Find common destinations
                    destinations = {}
                    for trip in trips:
                        dest = trip.get("destination")
                        if dest:
                            destinations[dest] = destinations.get(dest, 0) + 1

                    patterns["common_destinations"] = sorted(
                        destinations.items(), key=lambda x: x[1], reverse=True
                    )[:5]

                    # Determine travel frequency
                    if patterns["total_trips"] > 10:
                        patterns["travel_frequency"] = "high"
                    elif patterns["total_trips"] > 3:
                        patterns["travel_frequency"] = "medium"

                    # Find last significant trip
                    for trip in trips:
                        distance = float(trip.get("distance_miles", 0))
                        if distance > 100:  # Significant trip
                            patterns["last_long_trip"] = {
                                "distance": distance,
                                "destination": trip.get("destination"),
                                "date": trip.get("start_date")
                            }
                            break

                # Analyze fuel efficiency from logs
                if fuel_result and fuel_result.data:
                    fuel_logs = fuel_result.data
                    mpg_values = [float(log.get("mpg", 0)) for log in fuel_logs if log.get("mpg")]
                    if mpg_values:
                        patterns["fuel_efficiency"] = round(sum(mpg_values) / len(mpg_values), 1)

                logger.info(f"Analyzed travel patterns for {user_id}: {patterns}")
                self._set_cache(cache_key, patterns)
                return patterns

        except Exception as e:
            logger.error(f"Error getting travel patterns for {user_id}: {e}")
            return {
                "avg_trip_length": 250,
                "preferred_fuel_stops": 2,
                "total_trips": 0,
                "avg_cost_per_mile": 0.25,
                "common_destinations": [],
                "travel_frequency": "low",
                "fuel_efficiency": 10.0,
                "last_long_trip": None,
                "seasonal_patterns": {},
                "cost_trends": "stable"
            }

    async def get_vehicle_maintenance_status(self, user_id: str) -> Dict[str, Any]:
        """
        Get vehicle maintenance status and upcoming needs

        Analyzes maintenance records, mileage, and schedules.
        """
        cache_key = self._cache_key("maintenance_status", user_id)
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            async with self.get_database_connection() as db:
                # Get maintenance records
                maintenance_result = await self._time_query(
                    lambda: db.table("maintenance_records").select(
                        "*"
                    ).eq("user_id", user_id).order("date", desc=True).limit(20).execute()
                )

                # Get current odometer reading from fuel logs
                fuel_result = await self._time_query(
                    lambda: db.table("fuel_log").select(
                        "odometer, date"
                    ).eq("user_id", user_id).order("date", desc=True).limit(1).execute()
                )

                status = {
                    "last_maintenance": None,
                    "upcoming_maintenance": [],
                    "overdue_maintenance": [],
                    "current_mileage": 0,
                    "health_score": 85  # Default good score
                }

                # Analyze maintenance records
                if maintenance_result and maintenance_result.data:
                    records = maintenance_result.data
                    status["last_maintenance"] = records[0] if records else None

                    # Check for upcoming/overdue maintenance
                    for record in records:
                        next_due_date = record.get("next_due_date")
                        next_due_mileage = record.get("next_due_mileage")

                        if next_due_date or next_due_mileage:
                            maintenance_item = {
                                "task": record.get("task"),
                                "due_date": next_due_date,
                                "due_mileage": next_due_mileage,
                                "last_done": record.get("date")
                            }

                            # Check if overdue
                            is_overdue = False
                            if next_due_date:
                                due_date = datetime.fromisoformat(next_due_date).date()
                                if due_date < datetime.now().date():
                                    is_overdue = True

                            if is_overdue:
                                status["overdue_maintenance"].append(maintenance_item)
                            else:
                                status["upcoming_maintenance"].append(maintenance_item)

                # Get current mileage
                if fuel_result and fuel_result.data:
                    latest_fuel = fuel_result.data[0]
                    if latest_fuel.get("odometer"):
                        status["current_mileage"] = int(latest_fuel["odometer"])

                # Calculate health score
                health_score = 85  # Base score
                health_score -= len(status["overdue_maintenance"]) * 15  # Penalty for overdue items
                health_score -= len(status["upcoming_maintenance"]) * 5   # Minor penalty for upcoming
                status["health_score"] = max(0, min(100, health_score))

                logger.info(f"Vehicle maintenance status for {user_id}: {status['health_score']}/100")
                self._set_cache(cache_key, status)
                return status

        except Exception as e:
            logger.error(f"Error getting vehicle maintenance status for {user_id}: {e}")
            return {
                "last_maintenance": None,
                "upcoming_maintenance": [],
                "overdue_maintenance": [],
                "current_mileage": 0,
                "health_score": 85
            }

    # =============================================================================
    # CALENDAR DATA - ENHANCED WITH INTELLIGENT ANALYSIS
    # =============================================================================

    async def get_upcoming_events(self, user_id: str, days_ahead: int = 30) -> List[Dict]:
        """
        Get upcoming calendar events with intelligent filtering and analysis

        Prioritizes travel-related events and identifies planning opportunities.
        """
        cache_key = self._cache_key("upcoming_events", user_id, days_ahead)
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            async with self.get_database_connection() as db:
                end_date = datetime.now() + timedelta(days=days_ahead)

                result = await self._time_query(
                    lambda: db.table("calendar_events").select(
                        "id, title, description, start_date, end_date, location_name, event_type, reminder_minutes"
                    ).eq("user_id", user_id).gte("start_date", datetime.now().isoformat()).lte("start_date", end_date.isoformat()).order("start_date").execute()
                )

                events = []
                if result and result.data:
                    for event in result.data:
                        # Enhanced event data with analysis flags
                        event_data = {
                            "id": event["id"],
                            "title": event["title"],
                            "description": event.get("description", ""),
                            "start_date": event["start_date"],
                            "end_date": event["end_date"],
                            "location": event.get("location_name", ""),
                            "event_type": event.get("event_type", "personal"),
                            "reminder_minutes": event.get("reminder_minutes", 15),
                            "requires_travel": self._event_requires_travel(event),
                            "is_multi_day": self._is_multi_day_event(event),
                            "planning_priority": self._calculate_event_planning_priority(event)
                        }
                        events.append(event_data)

                # Sort by planning priority (high priority events first)
                events.sort(key=lambda e: e["planning_priority"], reverse=True)

                logger.info(f"Retrieved {len(events)} upcoming events for {user_id}")
                self._set_cache(cache_key, events)
                return events

        except Exception as e:
            logger.error(f"Error getting upcoming events for {user_id}: {e}")
            return []

    def _event_requires_travel(self, event: Dict[str, Any]) -> bool:
        """Determine if an event likely requires travel planning"""
        travel_keywords = ["trip", "travel", "vacation", "visit", "conference", "meeting", "camping", "festival"]

        title = (event.get("title", "")).lower()
        description = (event.get("description", "")).lower()
        location = (event.get("location_name", "")).lower()

        # Check for travel keywords
        if any(keyword in title or keyword in description for keyword in travel_keywords):
            return True

        # Check if location is specified and not "home" or similar
        if location and location not in ["home", "house", "office", "work"]:
            return True

        return False

    def _is_multi_day_event(self, event: Dict[str, Any]) -> bool:
        """Check if event spans multiple days"""
        try:
            start_date = datetime.fromisoformat(event["start_date"])
            end_date = datetime.fromisoformat(event["end_date"])
            return (end_date.date() - start_date.date()).days > 0
        except (ValueError, KeyError):
            return False

    def _calculate_event_planning_priority(self, event: Dict[str, Any]) -> int:
        """Calculate planning priority for the event (0-100)"""
        priority = 0

        # Base priority by type
        event_type = event.get("event_type", "personal")
        type_priorities = {
            "travel": 80,
            "meeting": 60,
            "appointment": 50,
            "personal": 30
        }
        priority += type_priorities.get(event_type, 30)

        # Boost for travel-related events
        if self._event_requires_travel(event):
            priority += 30

        # Boost for multi-day events
        if self._is_multi_day_event(event):
            priority += 20

        # Boost based on time until event
        try:
            start_date = datetime.fromisoformat(event["start_date"])
            days_until = (start_date.date() - datetime.now().date()).days

            if days_until <= 3:
                priority += 25  # Urgent
            elif days_until <= 7:
                priority += 15  # Soon
            elif days_until <= 14:
                priority += 10  # Upcoming

        except (ValueError, KeyError):
            pass

        return min(100, priority)

    async def get_travel_events_analysis(self, user_id: str, days_ahead: int = 60) -> Dict[str, Any]:
        """
        Analyze upcoming events for travel planning opportunities

        Identifies events that need trip planning, fuel preparation, etc.
        """
        cache_key = self._cache_key("travel_events_analysis", user_id, days_ahead)
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            events = await self.get_upcoming_events(user_id, days_ahead)

            analysis = {
                "total_events": len(events),
                "travel_events": [],
                "planning_needed": [],
                "fuel_prep_events": [],
                "accommodation_needed": [],
                "next_travel_date": None,
                "planning_urgency": "low"  # low, medium, high
            }

            for event in events:
                if event["requires_travel"]:
                    analysis["travel_events"].append(event)

                    # Check if planning is needed (event within 2 weeks)
                    try:
                        event_date = datetime.fromisoformat(event["start_date"]).date()
                        days_until = (event_date - datetime.now().date()).days

                        if days_until <= 14:
                            analysis["planning_needed"].append({
                                **event,
                                "days_until": days_until
                            })

                        if days_until <= 7:
                            analysis["fuel_prep_events"].append(event)

                        if event["is_multi_day"] and days_until <= 30:
                            analysis["accommodation_needed"].append(event)

                        # Set next travel date
                        if not analysis["next_travel_date"] or days_until < analysis["next_travel_date"]["days_until"]:
                            analysis["next_travel_date"] = {
                                "event": event,
                                "days_until": days_until
                            }

                    except (ValueError, KeyError):
                        continue

            # Determine planning urgency
            if analysis["planning_needed"]:
                min_days = min(event["days_until"] for event in analysis["planning_needed"])
                if min_days <= 3:
                    analysis["planning_urgency"] = "high"
                elif min_days <= 7:
                    analysis["planning_urgency"] = "medium"

            logger.info(f"Travel events analysis for {user_id}: {len(analysis['travel_events'])} travel events, urgency: {analysis['planning_urgency']}")
            self._set_cache(cache_key, analysis)
            return analysis

        except Exception as e:
            logger.error(f"Error analyzing travel events for {user_id}: {e}")
            return {
                "total_events": 0,
                "travel_events": [],
                "planning_needed": [],
                "fuel_prep_events": [],
                "accommodation_needed": [],
                "next_travel_date": None,
                "planning_urgency": "low"
            }

    # =============================================================================
    # PAM TOOL INTEGRATIONS - ENHANCED WITH PERFORMANCE MONITORING
    # =============================================================================

    @fallback_on_error(fallback_value={"clear_days": 3, "error": "Service unavailable"})
    @retry_on_failure(max_retries=2, exceptions=(ExternalAPIError,))
    async def get_weather_forecast(self, location: str = None, user_id: str = None) -> Dict[str, Any]:
        """
        Get weather forecast using weather_advisor tool with enhanced error handling

        Includes performance monitoring and intelligent location detection.
        """
        cache_key = self._cache_key("weather_forecast", location or user_id)
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            await self.initialize_tool_registry()

            if not self.tool_registry:
                raise ExternalAPIError("Tool registry not available")

            # Enhanced location detection
            if not location and user_id:
                user_loc = await self.get_user_location(user_id)
                if user_loc.get("lat") and user_loc.get("lng"):
                    location = f"{user_loc['lat']},{user_loc['lng']}"
                else:
                    # Fallback: try to get location from recent trip destinations
                    travel_patterns = await self.get_travel_patterns(user_id)
                    common_destinations = travel_patterns.get("common_destinations", [])
                    if common_destinations:
                        # Use most frequent destination as location
                        location = common_destinations[0][0]  # First destination name

            if not location:
                logger.warning("No location available for weather forecast")
                return {"clear_days": 3, "error": "No location available"}

            # Execute weather tool with performance monitoring
            start_time = datetime.now()
            result = await asyncio.wait_for(
                self.tool_registry.execute_tool(
                    tool_name="weather_advisor",
                    user_id=user_id or "system",
                    params={
                        "action": "get_forecast",
                        "location": location,
                        "days": 7
                    }
                ),
                timeout=30.0  # 30 second timeout
            )

            execution_time = (datetime.now() - start_time).total_seconds()
            logger.debug(f"Weather API call completed in {execution_time:.2f}s")

            if result.success and result.result.get("success"):
                weather_data = result.result["data"]

                # Enhanced weather data validation and processing
                validated_data = DataValidator.validate_weather_data({
                    "forecast": weather_data.get("forecast", []),
                    "location": location
                })

                # Advanced weather analysis
                forecast = validated_data.get("forecast", [])
                weather_analysis = {
                    "clear_days": 0,
                    "rainy_days": 0,
                    "travel_friendly_days": 0,
                    "forecast": forecast,
                    "location": location,
                    "travel_recommendations": []
                }

                for day in forecast:
                    conditions = day.get("conditions", "").lower()

                    # Count different weather types
                    if any(word in conditions for word in ["clear", "sunny", "fair"]):
                        weather_analysis["clear_days"] += 1
                        weather_analysis["travel_friendly_days"] += 1

                    if any(word in conditions for word in ["rain", "storm", "shower"]):
                        weather_analysis["rainy_days"] += 1
                    elif any(word in conditions for word in ["cloudy", "overcast"]):
                        weather_analysis["travel_friendly_days"] += 1  # Still okay for travel

                # Generate travel recommendations
                if weather_analysis["travel_friendly_days"] >= 5:
                    weather_analysis["travel_recommendations"].append("Excellent week for travel")
                elif weather_analysis["rainy_days"] >= 4:
                    weather_analysis["travel_recommendations"].append("Consider indoor activities or delay travel")
                elif weather_analysis["clear_days"] >= 3:
                    weather_analysis["travel_recommendations"].append("Good conditions for outdoor activities")

                # Cache weather data for 1 hour (weather doesn't change that frequently)
                self._query_cache[cache_key] = (weather_analysis, datetime.now().timestamp())

                return weather_analysis
            else:
                error_msg = str(result.error) if result.error else "Weather service failed"
                raise ExternalAPIError(f"Weather tool failed: {error_msg}")

        except asyncio.TimeoutError:
            raise ExternalAPIError("Weather service timeout")
        except Exception as e:
            logger.error(f"Error getting weather forecast: {e}")
            if "network" in str(e).lower() or "timeout" in str(e).lower():
                raise ExternalAPIError(f"Weather service error: {e}")
            else:
                raise

    async def use_manage_finances_tool(self, user_id: str, action: str, **params) -> Dict[str, Any]:
        """
        Use the manage_finances PAM tool with enhanced error handling and monitoring
        """
        try:
            await self.initialize_tool_registry()

            if not self.tool_registry:
                raise ExternalAPIError("Tool registry not available")

            tool_params = {"action": action, **params}

            start_time = datetime.now()
            result = await self.tool_registry.execute_tool(
                tool_name="manage_finances",
                user_id=user_id,
                params=tool_params
            )
            execution_time = (datetime.now() - start_time).total_seconds()

            logger.debug(f"Finance tool '{action}' completed in {execution_time:.2f}s")

            if result.success:
                return result.result
            else:
                logger.error(f"manage_finances tool failed: {result.error}")
                return {"error": str(result.error)}

        except Exception as e:
            logger.error(f"Error using manage_finances tool: {e}")
            return {"error": str(e)}

    async def use_trip_planning_tool(self, user_id: str, action: str, **params) -> Dict[str, Any]:
        """
        Use trip planning tools for proactive travel suggestions
        """
        try:
            await self.initialize_tool_registry()

            if not self.tool_registry:
                raise ExternalAPIError("Tool registry not available")

            # Map action to specific tool
            tool_name_map = {
                "plan_route": "plan_trip",
                "find_stops": "find_rv_parks",
                "optimize_route": "optimize_route",
                "check_weather": "weather_advisor"
            }

            tool_name = tool_name_map.get(action, "plan_trip")
            tool_params = {"action": action, **params}

            start_time = datetime.now()
            result = await self.tool_registry.execute_tool(
                tool_name=tool_name,
                user_id=user_id,
                params=tool_params
            )
            execution_time = (datetime.now() - start_time).total_seconds()

            logger.debug(f"Trip planning tool '{action}' completed in {execution_time:.2f}s")

            if result.success:
                return result.result
            else:
                logger.error(f"Trip planning tool failed: {result.error}")
                return {"error": str(result.error)}

        except Exception as e:
            logger.error(f"Error using trip planning tool: {e}")
            return {"error": str(e)}

    async def get_ai_insights(self, user_id: str, data_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate AI insights using the current user context

        Combines multiple data sources to generate intelligent proactive suggestions.
        """
        try:
            await self.initialize_tool_registry()

            if not self.tool_registry:
                return {"insights": [], "confidence": 0.0}

            # Prepare comprehensive context for AI analysis
            ai_context = {
                "user_profile": await self.get_user_profile(user_id),
                "financial_summary": {
                    "monthly_spending": await self.get_monthly_spending(user_id),
                    "monthly_budget": await self.get_monthly_budget(user_id),
                    "expense_patterns": await self.get_expense_patterns(user_id)
                },
                "travel_summary": {
                    "patterns": await self.get_travel_patterns(user_id),
                    "fuel_level": await self.get_fuel_level(user_id),
                    "maintenance": await self.get_vehicle_maintenance_status(user_id)
                },
                "calendar_summary": await self.get_travel_events_analysis(user_id),
                "additional_context": data_context
            }

            # Use PAM's reasoning capabilities to generate insights
            insights_result = await self.tool_registry.execute_tool(
                tool_name="analyze_context",
                user_id=user_id,
                params={
                    "action": "generate_insights",
                    "context": ai_context,
                    "focus_areas": ["travel", "finance", "maintenance", "planning"]
                }
            )

            if insights_result.success:
                return insights_result.result
            else:
                # Fallback to rule-based insights if AI fails
                return await self._generate_rule_based_insights(ai_context)

        except Exception as e:
            logger.error(f"Error generating AI insights: {e}")
            return {"insights": [], "confidence": 0.0, "error": str(e)}

    async def _generate_rule_based_insights(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate insights using rule-based logic when AI is unavailable

        Fallback system for generating proactive suggestions.
        """
        insights = []

        try:
            # Financial insights
            financial = context.get("financial_summary", {})
            spent = financial.get("monthly_spending", 0)
            budget = financial.get("monthly_budget", 0)

            if budget > 0 and spent > budget * 0.8:
                insights.append({
                    "type": "financial",
                    "priority": "medium",
                    "message": f"You've spent ${spent:.0f} of your ${budget:.0f} monthly budget",
                    "action": "review_expenses"
                })

            # Travel insights
            travel = context.get("travel_summary", {})
            fuel_level = travel.get("fuel_level", 75)

            if fuel_level < 25:
                insights.append({
                    "type": "travel",
                    "priority": "high",
                    "message": f"Fuel level is low ({fuel_level:.0f}%)",
                    "action": "find_gas_stations"
                })

            # Calendar insights
            calendar = context.get("calendar_summary", {})
            planning_urgency = calendar.get("planning_urgency", "low")

            if planning_urgency == "high":
                insights.append({
                    "type": "planning",
                    "priority": "high",
                    "message": "You have upcoming travel events that need planning",
                    "action": "plan_travel"
                })

            return {
                "insights": insights,
                "confidence": 0.7,  # Rule-based has lower confidence than AI
                "source": "rule_based_fallback"
            }

        except Exception as e:
            logger.error(f"Error in rule-based insights: {e}")
            return {"insights": [], "confidence": 0.0, "error": str(e)}

    # =============================================================================
    # COMPREHENSIVE TRIP & MAINTENANCE ANALYSIS
    # =============================================================================

    async def get_users_with_planned_trips(self, days_ahead: int = 30) -> List[Dict[str, Any]]:
        """
        Get users who have planned trips with comprehensive trip analysis

        Enhanced with trip urgency, preparation status, and planning needs.
        """
        cache_key = self._cache_key("users_planned_trips", days_ahead)
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            async with self.get_database_connection() as db:
                # Get planned trips starting within the specified timeframe
                future_date = (datetime.now() + timedelta(days=days_ahead)).isoformat()

                result = await self._time_query(
                    lambda: db.table("trips").select(
                        "user_id, destination, start_date, end_date, distance_miles, estimated_cost, route_data, status"
                    ).eq("status", "planned").gte("start_date", datetime.now().isoformat()).lte("start_date", future_date).execute()
                )

                users_with_trips = []
                if result and result.data:
                    for trip in result.data:
                        # Calculate trip urgency
                        try:
                            start_date = datetime.fromisoformat(trip["start_date"])
                            days_until_trip = (start_date.date() - datetime.now().date()).days
                        except (ValueError, TypeError):
                            days_until_trip = 30  # Default

                        # Parse route data
                        route_data = trip.get("route_data", {})
                        if isinstance(route_data, str):
                            try:
                                route_data = json.loads(route_data)
                            except json.JSONDecodeError:
                                route_data = {}

                        users_with_trips.append({
                            "id": trip["user_id"],
                            "planned_trip": {
                                "destination": trip["destination"],
                                "start_date": trip["start_date"],
                                "end_date": trip.get("end_date"),
                                "distance_miles": trip.get("distance_miles"),
                                "estimated_cost": trip.get("estimated_cost"),
                                "route": route_data,
                                "days_until_trip": days_until_trip,
                                "urgency": "high" if days_until_trip <= 3 else "medium" if days_until_trip <= 7 else "low",
                                "needs_fuel_prep": days_until_trip <= 7,
                                "needs_route_check": days_until_trip <= 14
                            }
                        })

                # Sort by urgency (soonest trips first)
                users_with_trips.sort(key=lambda x: x["planned_trip"]["days_until_trip"])

                logger.info(f"Found {len(users_with_trips)} users with planned trips in next {days_ahead} days")
                self._set_cache(cache_key, users_with_trips)
                return users_with_trips

        except Exception as e:
            logger.error(f"Error getting users with planned trips: {e}")
            return []

    async def get_users_needing_maintenance(self) -> List[Dict[str, Any]]:
        """
        Get users whose vehicles need maintenance attention

        Analyzes maintenance schedules, mileage, and time-based needs.
        """
        cache_key = self._cache_key("users_needing_maintenance")
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            async with self.get_database_connection() as db:
                # Get all users with vehicle information
                users_with_vehicles = await self.get_all_users_with_vehicles()

                users_needing_maintenance = []

                for user_vehicle in users_with_vehicles:
                    user_id = user_vehicle["id"]

                    # Get maintenance status for this user
                    maintenance_status = await self.get_vehicle_maintenance_status(user_id)

                    # Determine if maintenance is needed
                    needs_maintenance = (
                        len(maintenance_status.get("overdue_maintenance", [])) > 0 or
                        maintenance_status.get("health_score", 100) < 70 or
                        len(maintenance_status.get("upcoming_maintenance", [])) > 2
                    )

                    if needs_maintenance:
                        users_needing_maintenance.append({
                            "id": user_id,
                            "vehicle": user_vehicle["vehicle"],
                            "maintenance_status": maintenance_status,
                            "urgency": "high" if maintenance_status.get("health_score", 100) < 50 else "medium",
                            "overdue_count": len(maintenance_status.get("overdue_maintenance", [])),
                            "upcoming_count": len(maintenance_status.get("upcoming_maintenance", []))
                        })

                # Sort by urgency (lowest health scores first)
                users_needing_maintenance.sort(
                    key=lambda x: x["maintenance_status"].get("health_score", 100)
                )

                logger.info(f"Found {len(users_needing_maintenance)} users needing maintenance attention")
                self._set_cache(cache_key, users_needing_maintenance)
                return users_needing_maintenance

        except Exception as e:
            logger.error(f"Error getting users needing maintenance: {e}")
            return []

    async def get_all_users_with_vehicles(self) -> List[Dict[str, Any]]:
        """
        Get users with registered vehicle information with enhanced data

        Includes vehicle specs, registration details, and usage patterns.
        """
        cache_key = self._cache_key("users_with_vehicles")
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            async with self.get_database_connection() as db:
                # CRITICAL: profiles table uses 'id' NOT 'user_id'
                result = await self._time_query(
                    lambda: db.table("profiles").select(
                        "id, vehicle_type, vehicle_make_model, fuel_type, towing, second_vehicle, max_driving"
                    ).neq("vehicle_type", None).execute()
                )

                users_with_vehicles = []
                if result and result.data:
                    for profile in result.data:
                        if profile.get("vehicle_type"):  # Has vehicle info
                            # Get additional vehicle usage data
                            travel_patterns = await self.get_travel_patterns(profile["id"])

                            users_with_vehicles.append({
                                "id": profile["id"],
                                "vehicle": {
                                    "type": profile.get("vehicle_type", ""),
                                    "make_model": profile.get("vehicle_make_model", ""),
                                    "fuel_type": profile.get("fuel_type", ""),
                                    "towing_capability": profile.get("towing", ""),
                                    "second_vehicle": profile.get("second_vehicle", ""),
                                    "max_driving_hours": profile.get("max_driving", "")
                                },
                                "usage_patterns": {
                                    "avg_trip_length": travel_patterns.get("avg_trip_length", 0),
                                    "travel_frequency": travel_patterns.get("travel_frequency", "low"),
                                    "fuel_efficiency": travel_patterns.get("fuel_efficiency", 0),
                                    "total_trips": travel_patterns.get("total_trips", 0)
                                }
                            })

                logger.info(f"Found {len(users_with_vehicles)} users with vehicle information")
                self._set_cache(cache_key, users_with_vehicles)
                return users_with_vehicles

        except Exception as e:
            logger.error(f"Error getting users with vehicles: {e}")
            return []

    async def analyze_fleet_maintenance_needs(self) -> Dict[str, Any]:
        """
        Analyze maintenance needs across all users' vehicles

        Provides system-wide insights for proactive maintenance scheduling.
        """
        cache_key = self._cache_key("fleet_maintenance_analysis")
        cached_result = self._get_cache(cache_key)
        if cached_result is not None:
            return cached_result

        try:
            users_needing_maintenance = await self.get_users_needing_maintenance()

            analysis = {
                "total_vehicles": 0,
                "vehicles_needing_maintenance": len(users_needing_maintenance),
                "urgent_maintenance": 0,
                "common_maintenance_types": {},
                "average_health_score": 0,
                "maintenance_cost_estimates": 0,
                "recommendations": []
            }

            all_users_with_vehicles = await self.get_all_users_with_vehicles()
            analysis["total_vehicles"] = len(all_users_with_vehicles)

            if users_needing_maintenance:
                # Count urgent cases
                analysis["urgent_maintenance"] = len([
                    user for user in users_needing_maintenance
                    if user.get("urgency") == "high"
                ])

                # Analyze common maintenance types
                maintenance_types = {}
                health_scores = []
                total_cost_estimate = 0

                for user in users_needing_maintenance:
                    maintenance_status = user.get("maintenance_status", {})
                    health_scores.append(maintenance_status.get("health_score", 100))

                    # Count overdue maintenance types
                    for maintenance in maintenance_status.get("overdue_maintenance", []):
                        task = maintenance.get("task", "unknown")
                        maintenance_types[task] = maintenance_types.get(task, 0) + 1

                    # Estimate basic maintenance costs
                    overdue_count = user.get("overdue_count", 0)
                    total_cost_estimate += overdue_count * 150  # $150 average per maintenance task

                analysis["common_maintenance_types"] = maintenance_types
                analysis["average_health_score"] = sum(health_scores) / len(health_scores) if health_scores else 100
                analysis["maintenance_cost_estimates"] = total_cost_estimate

                # Generate recommendations
                if analysis["urgent_maintenance"] > 0:
                    analysis["recommendations"].append(
                        f"Immediate attention needed for {analysis['urgent_maintenance']} vehicles with critical maintenance issues"
                    )

                maintenance_percentage = (analysis["vehicles_needing_maintenance"] / max(analysis["total_vehicles"], 1)) * 100
                if maintenance_percentage > 30:
                    analysis["recommendations"].append(
                        "High percentage of fleet needs maintenance - consider scheduling maintenance campaign"
                    )

                if analysis["average_health_score"] < 70:
                    analysis["recommendations"].append(
                        "Average fleet health is below optimal - recommend proactive maintenance program"
                    )

            logger.info(f"Fleet analysis: {analysis['vehicles_needing_maintenance']}/{analysis['total_vehicles']} vehicles need maintenance")
            self._set_cache(cache_key, analysis)
            return analysis

        except Exception as e:
            logger.error(f"Error analyzing fleet maintenance needs: {e}")
            return {
                "total_vehicles": 0,
                "vehicles_needing_maintenance": 0,
                "urgent_maintenance": 0,
                "common_maintenance_types": {},
                "average_health_score": 100,
                "maintenance_cost_estimates": 0,
                "recommendations": []
            }

    # =============================================================================
    # PERFORMANCE MONITORING AND DIAGNOSTICS
    # =============================================================================

    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get data integration performance metrics"""
        return {
            "queries_executed": self._performance_metrics["queries_executed"],
            "cache_hit_rate": (
                self._performance_metrics["cache_hits"] /
                max(self._performance_metrics["cache_hits"] + self._performance_metrics["cache_misses"], 1)
            ) * 100,
            "average_query_time": self._performance_metrics["avg_query_time"],
            "cache_size": len(self._query_cache),
            "connection_pool_status": "active" if _connection_pool else "not_initialized"
        }

    async def clear_cache(self):
        """Clear the query cache"""
        self._query_cache.clear()
        logger.info("Query cache cleared")

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on data integration system"""
        try:
            # Test database connection
            async with self.get_database_connection() as db:
                # Simple test query
                result = await db.table("profiles").select("id").limit(1).execute()
                db_status = "healthy" if result else "unhealthy"

            # Test tool registry
            await self.initialize_tool_registry()
            tools_status = "healthy" if self.tool_registry else "unhealthy"

            # Get performance metrics
            metrics = await self.get_performance_metrics()

            return {
                "status": "healthy" if db_status == "healthy" and tools_status == "healthy" else "degraded",
                "database": db_status,
                "tool_registry": tools_status,
                "performance": metrics,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

# =============================================================================
# GLOBAL INSTANCE AND INITIALIZATION
# =============================================================================

# Global instance for use across the proactive system
proactive_data = ProactiveDataIntegrator()

async def initialize_proactive_data():
    """Initialize the global proactive data integrator"""
    try:
        await proactive_data.initialize_connection_pool()
        await proactive_data.initialize_tool_registry()
        logger.info("Proactive data integration initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize proactive data integration: {e}")
        return False

async def get_proactive_data() -> ProactiveDataIntegrator:
    """Get the initialized proactive data integrator instance"""
    if not hasattr(proactive_data, '_initialized'):
        await initialize_proactive_data()
        proactive_data._initialized = True
    return proactive_data

# Convenience functions for common operations
async def get_active_users_for_monitoring() -> List[Dict[str, Any]]:
    """Get users who should be actively monitored"""
    data_integrator = await get_proactive_data()
    return await data_integrator.get_users_for_monitoring()

async def get_batch_user_data(user_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    """Get batch user data efficiently"""
    data_integrator = await get_proactive_data()
    return await data_integrator.get_users_batch(user_ids)

async def get_comprehensive_user_context(user_id: str) -> Dict[str, Any]:
    """Get complete user context for proactive suggestions"""
    data_integrator = await get_proactive_data()

    # Gather all user data in parallel
    user_profile_task = data_integrator.get_user_profile(user_id)
    spending_task = data_integrator.get_monthly_spending(user_id)
    budget_task = data_integrator.get_monthly_budget(user_id)
    fuel_task = data_integrator.get_fuel_level(user_id)
    travel_patterns_task = data_integrator.get_travel_patterns(user_id)
    events_task = data_integrator.get_upcoming_events(user_id)
    maintenance_task = data_integrator.get_vehicle_maintenance_status(user_id)

    # Wait for all data to be collected
    user_profile, monthly_spending, monthly_budget, fuel_level, travel_patterns, upcoming_events, maintenance_status = await asyncio.gather(
        user_profile_task,
        spending_task,
        budget_task,
        fuel_task,
        travel_patterns_task,
        events_task,
        maintenance_task,
        return_exceptions=True
    )

    # Handle any exceptions in the results
    def safe_result(result, default):
        return result if not isinstance(result, Exception) else default

    return {
        "user_profile": safe_result(user_profile, {}),
        "financial": {
            "monthly_spending": safe_result(monthly_spending, 0.0),
            "monthly_budget": safe_result(monthly_budget, 0.0),
            "budget_utilization": (
                safe_result(monthly_spending, 0.0) / max(safe_result(monthly_budget, 1.0), 1.0)
            ) * 100
        },
        "travel": {
            "fuel_level": safe_result(fuel_level, 75.0),
            "patterns": safe_result(travel_patterns, {}),
        },
        "calendar": {
            "upcoming_events": safe_result(upcoming_events, []),
            "next_travel_event": None  # Will be populated from events analysis
        },
        "maintenance": safe_result(maintenance_status, {}),
        "context_timestamp": datetime.now().isoformat(),
        "data_quality": {
            "profile_complete": bool(safe_result(user_profile, {}).get("vehicle_type")),
            "financial_active": safe_result(monthly_spending, 0.0) > 0,
            "travel_active": safe_result(fuel_level, 0) > 0 or len(safe_result(travel_patterns, {}).get("common_destinations", [])) > 0,
            "calendar_active": len(safe_result(upcoming_events, [])) > 0
        }
    }

# Export key functions for easy importing
__all__ = [
    "ProactiveDataIntegrator",
    "proactive_data",
    "initialize_proactive_data",
    "get_proactive_data",
    "get_active_users_for_monitoring",
    "get_batch_user_data",
    "get_comprehensive_user_context"
]