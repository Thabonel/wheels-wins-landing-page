"""
PAM Cache Warming Service
Pre-loads user context into Redis on login for instant PAM access
"""

import json
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import redis.asyncio as redis

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.database import DatabaseService

logger = get_logger(__name__)
settings = get_settings()


class CacheWarmingService:
    """
    Warms Redis cache with user context on login
    Enables instant PAM access to profile, conversations, preferences
    """

    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.database_service = DatabaseService()

        # TTL configurations (seconds)
        self.ttl_config = {
            'profile': 3600,        # 1 hour (static data)
            'conversations': 1800,  # 30 minutes (semi-dynamic)
            'preferences': 3600,    # 1 hour (static data)
            'context': 900,         # 15 minutes (dynamic data)
        }

    async def initialize(self):
        """Initialize Redis connection"""
        try:
            if hasattr(settings, 'REDIS_URL') and settings.REDIS_URL:
                self.redis_client = await redis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True
                )
                await self.redis_client.ping()
                logger.info("✅ Cache Warming Service initialized with Redis")
                return True
            else:
                logger.warning("⚠️ Redis URL not configured - cache warming disabled")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to initialize cache warming: {e}")
            return False

    async def warm_user_cache(self, user_id: str) -> Dict[str, Any]:
        """
        Pre-load ALL user context into Redis for instant PAM access

        Args:
            user_id: User ID to warm cache for

        Returns:
            Dict with warming status and stats
        """
        start_time = time.time()
        results = {
            'success': False,
            'cached_items': [],
            'failed_items': [],
            'total_size_bytes': 0,
            'warming_time_ms': 0
        }

        try:
            if not self.redis_client:
                logger.warning(f"Redis not available for user {user_id}")
                return results

            # 1. Fetch and cache user profile
            profile_result = await self._cache_user_profile(user_id)
            if profile_result['success']:
                results['cached_items'].append('profile')
                results['total_size_bytes'] += profile_result['size_bytes']
            else:
                results['failed_items'].append('profile')

            # 2. Fetch and cache recent conversations
            conv_result = await self._cache_conversations(user_id)
            if conv_result['success']:
                results['cached_items'].append('conversations')
                results['total_size_bytes'] += conv_result['size_bytes']
            else:
                results['failed_items'].append('conversations')

            # 3. Fetch and cache user preferences
            pref_result = await self._cache_preferences(user_id)
            if pref_result['success']:
                results['cached_items'].append('preferences')
                results['total_size_bytes'] += pref_result['size_bytes']
            else:
                results['failed_items'].append('preferences')

            # 4. Fetch and cache user context (expenses, trips, etc.)
            context_result = await self._cache_user_context(user_id)
            if context_result['success']:
                results['cached_items'].append('context')
                results['total_size_bytes'] += context_result['size_bytes']
            else:
                results['failed_items'].append('context')

            # Calculate warming time
            results['warming_time_ms'] = int((time.time() - start_time) * 1000)
            results['success'] = len(results['cached_items']) > 0

            logger.info(
                f"✅ Cache warmed for user {user_id}: "
                f"{len(results['cached_items'])} items, "
                f"{results['total_size_bytes']} bytes, "
                f"{results['warming_time_ms']}ms"
            )

            return results

        except Exception as e:
            logger.error(f"❌ Cache warming failed for user {user_id}: {e}")
            results['warming_time_ms'] = int((time.time() - start_time) * 1000)
            return results

    async def _cache_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Fetch and cache user profile (ENRICHED format for PAM compatibility)"""
        try:
            # CRITICAL FIX: Use LoadUserProfileTool to get ENRICHED profile
            # This ensures cached format matches what PAM expects (vehicle_info, travel_preferences, etc.)
            from app.services.pam.tools.load_user_profile import LoadUserProfileTool

            profile_tool = LoadUserProfileTool()
            profile_result = await profile_tool.execute(user_id)

            if not profile_result.get("success") or not profile_result.get("result", {}).get("profile_exists"):
                logger.warning(f"No profile found for user {user_id} during cache warming")
                return {'success': False, 'size_bytes': 0}

            # Get the ENRICHED profile (with nested vehicle_info, travel_preferences, etc.)
            enriched_profile = profile_result["result"]

            # Store ENRICHED profile in Redis (not raw Supabase data)
            # Write to both legacy and primary keys for compatibility
            legacy_key = f"user_profile:{user_id}"
            primary_key = f"pam:profile:{user_id}"
            profile_json = json.dumps(enriched_profile)

            await self.redis_client.setex(
                primary_key,
                self.ttl_config['profile'],
                profile_json
            )

            await self.redis_client.setex(
                legacy_key,
                self.ttl_config['profile'],
                profile_json
            )

            logger.info(f"✅ Cached ENRICHED profile for user {user_id} (vehicle: {enriched_profile.get('vehicle_info', {}).get('type', 'unknown')})")

            return {
                'success': True,
                'size_bytes': len(profile_json.encode('utf-8'))
            }

        except Exception as e:
            logger.error(f"Failed to cache profile for {user_id}: {e}")
            return {'success': False, 'size_bytes': 0}

    async def _cache_conversations(self, user_id: str, limit: int = 20) -> Dict[str, Any]:
        """Fetch and cache recent conversations"""
        try:
            supabase = self.database_service.client

            # Fetch recent conversations
            conv_result = supabase.table('pam_conversations') \
                .select('*') \
                .eq('user_id', user_id) \
                .order('created_at', desc=True) \
                .limit(limit) \
                .execute()

            conversations = conv_result.data if conv_result.data else []

            # For each conversation, fetch recent messages
            conversations_with_messages = []
            for conv in conversations:
                msg_result = supabase.table('pam_messages') \
                    .select('*') \
                    .eq('conversation_id', conv['id']) \
                    .order('created_at', desc=True) \
                    .limit(10) \
                    .execute()

                conv['recent_messages'] = msg_result.data if msg_result.data else []
                conversations_with_messages.append(conv)

            # Store in Redis
            cache_key = f"user_conversations:{user_id}"
            conv_json = json.dumps(conversations_with_messages)

            await self.redis_client.setex(
                cache_key,
                self.ttl_config['conversations'],
                conv_json
            )

            return {
                'success': True,
                'size_bytes': len(conv_json.encode('utf-8'))
            }

        except Exception as e:
            logger.error(f"Failed to cache conversations for {user_id}: {e}")
            return {'success': False, 'size_bytes': 0}

    async def _cache_preferences(self, user_id: str) -> Dict[str, Any]:
        """Fetch and cache user preferences"""
        try:
            supabase = self.database_service.client

            # Fetch profile for preferences
            profile_result = supabase.table('profiles').select('*').eq('id', user_id).single().execute()

            if not profile_result.data:
                return {'success': False, 'size_bytes': 0}

            # Extract preference fields
            profile = profile_result.data
            preferences = {
                'preferred_units': profile.get('preferred_units', 'metric'),
                'fuel_type': profile.get('fuel_type'),
                'travel_style': profile.get('travel_style'),
                'camp_types': profile.get('camp_types'),
                'accessibility': profile.get('accessibility'),
                'pets': profile.get('pets'),
                'region': profile.get('region'),
                'max_driving': profile.get('max_driving')
            }

            # Store in Redis
            cache_key = f"user_preferences:{user_id}"
            pref_json = json.dumps(preferences)

            await self.redis_client.setex(
                cache_key,
                self.ttl_config['preferences'],
                pref_json
            )

            return {
                'success': True,
                'size_bytes': len(pref_json.encode('utf-8'))
            }

        except Exception as e:
            logger.error(f"Failed to cache preferences for {user_id}: {e}")
            return {'success': False, 'size_bytes': 0}

    async def _cache_user_context(self, user_id: str) -> Dict[str, Any]:
        """Fetch and cache user context (recent activity, expenses, trips)"""
        try:
            supabase = self.database_service.client

            # Fetch recent expenses (last 30 days)
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            expenses_result = supabase.table('expenses') \
                .select('*') \
                .eq('user_id', user_id) \
                .gte('date', thirty_days_ago) \
                .order('date', desc=True) \
                .limit(50) \
                .execute()

            # Fetch recent trips
            trips_result = supabase.table('trips') \
                .select('*') \
                .eq('user_id', user_id) \
                .order('created_at', desc=True) \
                .limit(10) \
                .execute()

            # Fetch recent maintenance
            maintenance_result = supabase.table('maintenance_records') \
                .select('*') \
                .eq('user_id', user_id) \
                .order('date', desc=True) \
                .limit(10) \
                .execute()

            # Build context
            context = {
                'recent_expenses': expenses_result.data if expenses_result.data else [],
                'recent_trips': trips_result.data if trips_result.data else [],
                'recent_maintenance': maintenance_result.data if maintenance_result.data else [],
                'cached_at': datetime.now().isoformat()
            }

            # Store in Redis
            cache_key = f"user_context:{user_id}"
            context_json = json.dumps(context)

            await self.redis_client.setex(
                cache_key,
                self.ttl_config['context'],
                context_json
            )

            return {
                'success': True,
                'size_bytes': len(context_json.encode('utf-8'))
            }

        except Exception as e:
            logger.error(f"Failed to cache context for {user_id}: {e}")
            return {'success': False, 'size_bytes': 0}

    async def get_cached_user_context(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached user context (profile + preferences + conversations)
        Falls back to database if cache miss

        Returns:
            Dict with user context or None if not available
        """
        try:
            if not self.redis_client:
                # No Redis, fallback to database
                return await self._fallback_get_user_context(user_id)

            # Fetch from cache
            profile_key = f"user_profile:{user_id}"
            pref_key = f"user_preferences:{user_id}"

            profile_json = await self.redis_client.get(profile_key)
            pref_json = await self.redis_client.get(pref_key)

            if not profile_json:
                # Cache miss, fallback to database
                logger.info(f"Cache miss for user {user_id}, fetching from database")
                return await self._fallback_get_user_context(user_id)

            # Parse cached data
            profile = json.loads(profile_json)
            preferences = json.loads(pref_json) if pref_json else {}

            # Build context for PAM - include FULL profile structure for tool access
            # Tools expect nested structures like vehicle_info, travel_preferences, etc.
            context = {
                # Full enriched profile for tool access (matches LoadUserProfileTool output)
                'user_profile': profile,
                'preferences': preferences,
                # Common flat fields for convenience
                'language': profile.get('language', 'en'),
                'full_name': profile.get('personal_details', {}).get('full_name') or profile.get('full_name'),
                'nickname': profile.get('personal_details', {}).get('nickname') or profile.get('nickname'),
                'location': profile.get('personal_details', {}).get('region') or profile.get('region'),
                # Nested structures that tools expect
                'vehicle_info': profile.get('vehicle_info', {}),
                'travel_preferences': profile.get('travel_preferences', {}),
                'budget_preferences': profile.get('budget_preferences', {}),
            }

            logger.info(f"Loaded cached context for {user_id}: keys={list(context.keys())}")
            return context

        except Exception as e:
            logger.error(f"Failed to get cached context for {user_id}: {e}")
            return None

    async def _fallback_get_user_context(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fallback to database if cache miss"""
        try:
            supabase = self.database_service.client
            profile_result = supabase.table('profiles').select('*').eq('id', user_id).single().execute()

            if not profile_result.data:
                return None

            profile = profile_result.data

            # Return structure consistent with cached version
            return {
                'user_profile': profile,
                'preferences': {},
                'language': profile.get('language', 'en'),
                'full_name': profile.get('full_name'),
                'nickname': profile.get('nickname'),
                'location': profile.get('region'),
                'vehicle_info': {
                    'type': profile.get('vehicle_type'),
                    'make_model': profile.get('vehicle_make_model'),
                    'fuel_type': profile.get('fuel_type'),
                },
                'travel_preferences': {
                    'travel_style': profile.get('travel_style'),
                },
                'budget_preferences': {},
            }

        except Exception as e:
            logger.error(f"Fallback failed for {user_id}: {e}")
            return None

    async def invalidate_user_cache(self, user_id: str, cache_type: str = 'all'):
        """
        Invalidate user cache (call after profile update, new expense, etc.)

        Args:
            user_id: User ID
            cache_type: 'all', 'profile', 'conversations', 'preferences', 'context'
        """
        try:
            if not self.redis_client:
                return

            if cache_type == 'all':
                keys = [
                    f"user_profile:{user_id}",
                    f"user_conversations:{user_id}",
                    f"user_preferences:{user_id}",
                    f"user_context:{user_id}"
                ]
            else:
                keys = [f"user_{cache_type}:{user_id}"]

            for key in keys:
                await self.redis_client.delete(key)

            logger.info(f"Invalidated {cache_type} cache for user {user_id}")

        except Exception as e:
            logger.error(f"Failed to invalidate cache for {user_id}: {e}")


# Global instance
_cache_warming_service: Optional[CacheWarmingService] = None


async def get_cache_warming_service() -> CacheWarmingService:
    """Get or create cache warming service instance"""
    global _cache_warming_service

    if _cache_warming_service is None:
        _cache_warming_service = CacheWarmingService()
        await _cache_warming_service.initialize()

    return _cache_warming_service
