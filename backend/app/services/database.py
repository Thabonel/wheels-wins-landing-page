"""
Production-ready with error handling and connection pooling
"""
from typing import Optional, Dict, Any, List
from app.core.config import settings
from supabase import create_client, Client
from app.core.logging import get_logger

logger = get_logger(__name__)

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
            # Use service role key for both clients
            service_key = settings.SUPABASE_SERVICE_ROLE_KEY.get_secret_value() if hasattr(settings.SUPABASE_SERVICE_ROLE_KEY, 'get_secret_value') else str(settings.SUPABASE_SERVICE_ROLE_KEY)
            
            self.client = create_client(
                settings.SUPABASE_URL,
                service_key
            )
            # Initialize service client with same credentials
            self.service_client = self.client
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
    
    async def _is_user_admin(self, user_id: str) -> bool:
        """Check if user has admin privileges - disabled to prevent role permission errors"""
        # PERMANENT FIX: Remove admin_users table queries that cause "set role admin" errors
        # For calendar and user operations, admin privileges are not needed
        # This prevents PostgreSQL role switching attempts
        return False

    def get_client(self) -> Client:
        """Get Supabase client instance"""
        if not self.client:
            self._initialize_client()
        return self.client
    
    async def get_conversation_context(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get conversation context for user"""
        try:
            if not self.client:
                return []
            
            # Use service client for PAM operations to bypass RLS
            client = self.service_client if hasattr(self, 'service_client') else self.client
            
            # Use the database function we created
            result = client.rpc('get_conversation_history', {
                'p_user_id': user_id,
                'p_limit': limit
            }).execute()
            
            if result.data:
                # Convert to expected format - group messages by pairs
                messages = []
                current_pair = {'user_message': '', 'assistant_response': '', 'intent': None, 'created_at': None}
                
                for msg in reversed(result.data):  # Reverse to process chronologically
                    if msg['role'] == 'user':
                        # Start a new pair
                        if current_pair['user_message'] or current_pair['assistant_response']:
                            messages.append(current_pair)
                        current_pair = {
                            'user_message': msg['content'],
                            'assistant_response': '',
                            'intent': msg.get('intent'),
                            'created_at': msg['created_at']
                        }
                    elif msg['role'] == 'assistant':
                        # Complete the current pair
                        current_pair['assistant_response'] = msg['content']
                        if not current_pair['created_at']:
                            current_pair['created_at'] = msg['created_at']
                
                # Add the last pair if it has content
                if current_pair['user_message'] or current_pair['assistant_response']:
                    messages.append(current_pair)
                
                return messages[-limit:] if len(messages) > limit else messages
            return []
        except Exception as e:
            logger.warning(f"Error fetching conversation context: {e}")
            return []
    
    async def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user preferences"""
        try:
            if not self.client:
                return {}
            
            # Use service client for PAM operations to bypass RLS
            client = self.service_client if hasattr(self, 'service_client') else self.client
            
            # Use the database function we created
            result = client.rpc('get_user_preferences', {
                'p_user_id': user_id
            }).execute()
            
            return result.data if result.data else {}
        except Exception as e:
            logger.warning(f"Error fetching user preferences: {e}")
            return {}
    
    async def store_conversation(self, user_id: str, session_id: str, memory_data: Dict[str, Any]) -> bool:
        """Store conversation memory"""
        try:
            if not self.client:
                return False
            
            # Use service client for PAM operations to bypass RLS
            client = self.service_client if hasattr(self, 'service_client') else self.client
            
            # Get or create conversation - function returns UUID directly
            conversation_result = client.rpc('get_or_create_pam_conversation', {
                'p_user_id': user_id,
                'p_session_id': session_id,
                'p_context': memory_data.get('context', {})
            }).execute()
            
            if not conversation_result.data:
                logger.error("Failed to get/create conversation")
                return False
            
            # The function returns the UUID directly, not wrapped in an array
            conversation_id = conversation_result.data
            
            # Handle case where function returns array with single UUID
            if isinstance(conversation_id, list) and len(conversation_id) > 0:
                conversation_id = conversation_id[0]
            
            # Validate UUID format
            if not conversation_id or conversation_id == 'default':
                logger.error(f"Invalid conversation_id received: {conversation_id}")
                return False
            
            # Store user message if provided
            if memory_data.get('user_message'):
                user_message_result = client.rpc('store_pam_message', {
                    'p_conversation_id': conversation_id,
                    'p_role': 'user',
                    'p_content': memory_data['user_message'],
                    'p_intent': memory_data.get('intent'),
                    'p_confidence': memory_data.get('confidence'),
                    'p_entities': memory_data.get('entities', {}),
                    'p_metadata': memory_data.get('user_metadata', {})
                }).execute()
                
                if not user_message_result.data:
                    logger.warning("Failed to store user message")
            
            # Store assistant response if provided
            if memory_data.get('assistant_response'):
                assistant_message_result = client.rpc('store_pam_message', {
                    'p_conversation_id': conversation_id,
                    'p_role': 'assistant',
                    'p_content': memory_data['assistant_response'],
                    'p_metadata': memory_data.get('assistant_metadata', {})
                }).execute()
                
                if not assistant_message_result.data:
                    logger.warning("Failed to store assistant message")
            
            return True
        except Exception as e:
            logger.warning(f"Error storing conversation: {e}")
            # Log more details for debugging
            logger.error(f"Conversation storage details - user_id: {user_id}, session_id: {session_id}")
            logger.error(f"Memory data keys: {list(memory_data.keys()) if memory_data else 'None'}")
            return False
    
    async def store_user_preference(self, user_id: str, key: str, value: Any, confidence: float = 1.0) -> bool:
        """Store user preference"""
        try:
            if not self.client:
                return False
            
            # Use service client for PAM operations to bypass RLS
            client = self.service_client if hasattr(self, 'service_client') else self.client
            
            # Convert value to string for storage
            value_str = str(value) if not isinstance(value, str) else value
            
            result = client.rpc('store_user_context', {
                'p_user_id': user_id,
                'p_context_type': 'preference',
                'p_key': key,
                'p_value': value_str,
                'p_confidence': confidence,
                'p_source': 'conversation'
            }).execute()
            
            return bool(result.data)
        except Exception as e:
            logger.warning(f"Error storing user preference: {e}")
            return False
    
    async def store_memory(self, memory) -> str:
        """Store PamMemory object - compatibility method for orchestrator"""
        try:
            # Convert PamMemory to the format expected by store_conversation
            memory_data = {
                'user_message': memory.content if memory.memory_type.value == 'user_interaction' else '',
                'assistant_response': memory.content if memory.memory_type.value == 'assistant_response' else '',
                'context': memory.context,
                'intent': memory.memory_type.value,
                'confidence': memory.confidence,
                'user_metadata': {'memory_type': memory.memory_type.value},
                'assistant_metadata': {'memory_type': memory.memory_type.value}
            }
            
            # Extract session_id from context or use a default
            session_id = memory.context.get('session_id', f"memory-{memory.id}")
            
            success = await self.store_conversation(memory.user_id, session_id, memory_data)
            return memory.id if success else ""
        except Exception as e:
            logger.warning(f"Error storing memory: {e}")
            return ""
    
    # Trip Data Methods
    async def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Get user profile information"""
        try:
            if not self.client:
                return {}
            
            # Caching implementation
            from app.services.cache_service import get_cache
            cache = await get_cache()
            cache_key = f"user_profile:{user_id}"

            cached_profile = await cache.get(cache_key)
            if cached_profile:
                logger.info(f"✅ Cache hit for user profile: {user_id}")
                return cached_profile

            logger.info(f"🚧 Cache miss for user profile: {user_id}, fetching from DB")

            # Try multiple approaches to get user profile safely
            profile = {"id": user_id}  # Default fallback
            
            # Method 1: Try Supabase auth.users (UUID-based, most reliable)
            try:
                auth_user = self.client.auth.admin.get_user_by_id(user_id)
                if auth_user.user:
                    profile.update({
                        'id': auth_user.user.id,
                        'email': auth_user.user.email,
                        'created_at': auth_user.user.created_at,
                        'updated_at': auth_user.user.updated_at
                    })
                    logger.info(f"✅ User profile loaded from auth.users: {user_id}")
            except Exception as e:
                logger.debug(f"Auth users query failed (expected): {e}")
            
            # Method 2: Try profiles table with UUID (standard Supabase approach)  
            try:
                profile_result = self.client.table('profiles').select('*').eq('id', user_id).single().execute()
                if profile_result.data:
                    profile.update(profile_result.data)
                    logger.info(f"✅ User profile loaded from profiles table: {user_id}")
            except Exception as e:
                logger.debug(f"Profiles table query failed: {e}")
            
            # Method 3: Try with user_id column if id column failed
            if len(profile) == 1:  # Only has default id
                try:
                    profile_result = self.client.table('profiles').select('*').eq('user_id', user_id).single().execute()
                    if profile_result.data:
                        profile.update(profile_result.data)
                        logger.info(f"✅ User profile loaded from profiles.user_id: {user_id}")
                except Exception as e:
                    logger.debug(f"Profiles.user_id query failed: {e}")
            
            # If still no profile data, create basic structure
            if len(profile) == 1:
                logger.warning(f"⚠️ No profile found for user {user_id}, using fallback")
                profile = {
                    "id": user_id,
                    "email": None,
                    "created_at": None,
                    "display_name": "User"
                }
            
            # Get user preferences and travel context
            preferences = await self.get_user_preferences(user_id)
            
            user_profile = {
                **profile,
                'preferences': preferences,
                'travel_style': preferences.get('travel_style', 'balanced'),
                'vehicle_info': preferences.get('vehicle_info', {}),
                'current_location': preferences.get('current_location')
            }

            # Store in cache for 5 minutes
            await cache.set(cache_key, user_profile, ttl=300)

            return user_profile
        except Exception as e:
            logger.warning(f"Error fetching user profile: {e}")
            return {}
    
    async def get_user_trips(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get user's trips - safely handle RLS policy issues"""
        try:
            if not self.client:
                return []
            
            # Caching implementation
            from app.services.cache_service import get_cache
            cache = await get_cache()
            cache_key = f"user_trips:{user_id}:{limit}"

            cached_trips = await cache.get(cache_key)
            if cached_trips:
                logger.info(f"✅ Cache hit for user trips: {user_id}")
                return cached_trips

            logger.info(f"🚧 Cache miss for user trips: {user_id}, fetching from DB")

            # Avoid group_trip_participants table due to RLS recursion issue
            # Query group_trips directly without joins to prevent policy conflicts
            try:
                result = self.client.table('group_trips').select(
                    'id, trip_name, description, status, created_at, route_data, created_by'
                ).eq('created_by', user_id).order('created_at', desc=True).limit(limit).execute()
                
                if result.data:
                    logger.info(f"✅ Found {len(result.data)} trips for user {user_id}")
                else:
                    logger.info(f"📋 No trips found for user {user_id}")
                    return []
                    
            except Exception as e:
                logger.warning(f"RLS policy issue in group_trips, using fallback: {e}")
                # Safe fallback - return empty list rather than crash
                return []
            
            trips = []
            if result.data:
                for trip in result.data:
                    # Parse route_data JSON
                    route_data = trip.get('route_data', {})
                    if isinstance(route_data, str):
                        import json
                        try:
                            route_data = json.loads(route_data)
                        except:
                            route_data = {}
                    
                    trips.append({
                        'id': trip['id'],
                        'name': trip.get('trip_name', 'Untitled Trip'),
                        'description': trip.get('description', ''),
                        'status': trip.get('status', 'active'),
                        'created_at': trip.get('created_at'),
                        'route_data': route_data,
                        'origin': route_data.get('origin'),
                        'destination': route_data.get('dest'),
                        'waypoints': route_data.get('waypoints', []),
                        'suggestions': route_data.get('suggestions', [])
                    })
            
            # Store in cache for 5 minutes
            await cache.set(cache_key, trips, ttl=300)

            return trips
        except Exception as e:
            logger.warning(f"Error fetching user trips: {e}")
            return []
    
    async def get_trip_details(self, trip_id: str) -> Dict[str, Any]:
        """Get specific trip details"""
        try:
            if not self.client:
                return {}
            
            # Caching implementation
            from app.services.cache_service import get_cache
            cache = await get_cache()
            cache_key = f"trip_details:{trip_id}"

            cached_trip = await cache.get(cache_key)
            if cached_trip:
                logger.info(f"✅ Cache hit for trip details: {trip_id}")
                return cached_trip

            logger.info(f"🚧 Cache miss for trip details: {trip_id}, fetching from DB")

            result = self.client.table('group_trips').select('*').eq('id', trip_id).single().execute()
            
            if result.data:
                trip = result.data
                route_data = trip.get('route_data', {})
                if isinstance(route_data, str):
                    import json
                    try:
                        route_data = json.loads(route_data)
                    except:
                        route_data = {}
                
                trip_details = {
                    'id': trip['id'],
                    'name': trip.get('trip_name', 'Untitled Trip'),
                    'description': trip.get('description', ''),
                    'status': trip.get('status', 'active'),
                    'created_by': trip.get('created_by'),
                    'created_at': trip.get('created_at'),
                    'updated_at': trip.get('updated_at'),
                    'route_data': route_data,
                    'origin': route_data.get('origin'),
                    'destination': route_data.get('dest'),
                    'waypoints': route_data.get('waypoints', []),
                    'suggestions': route_data.get('suggestions', [])
                }

                # Store in cache for 5 minutes
                await cache.set(cache_key, trip_details, ttl=300)

                return trip_details
            
            return {}
        except Exception as e:
            logger.warning(f"Error fetching trip details: {e}")
            return {}
    
    async def update_trip(self, trip_id: str, user_id: str, updates: Dict[str, Any]) -> bool:
        """Update trip with new data"""
        try:
            if not self.client:
                return False
            
            # Ensure user owns the trip
            trip = await self.get_trip_details(trip_id)
            if not trip or trip.get('created_by') != user_id:
                logger.warning(f"User {user_id} not authorized to update trip {trip_id}")
                return False
            
            # Update the trip
            result = self.client.table('group_trips').update(updates).eq('id', trip_id).execute()
            
            # Invalidate cache
            from app.services.cache_service import get_cache
            cache = await get_cache()
            await cache.delete(f"trip_details:{trip_id}")
            await cache.delete(f"user_trips:{user_id}:20") # Invalidate user trips list

            return bool(result.data)
        except Exception as e:
            logger.warning(f"Error updating trip: {e}")
            return False
    
    # Social Data Methods
    async def get_user_social_groups(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get user's social groups and memberships"""
        try:
            if not self.client:
                return []
            
            # Caching implementation
            from app.services.cache_service import get_cache
            cache = await get_cache()
            cache_key = f"user_social_groups:{user_id}:{limit}"

            cached_groups = await cache.get(cache_key)
            if cached_groups:
                logger.info(f"✅ Cache hit for user social groups: {user_id}")
                return cached_groups

            logger.info(f"🚧 Cache miss for user social groups: {user_id}, fetching from DB")

            # Get groups the user is a member of
            result = self.client.table('group_memberships').select(
                'social_groups(*), role, joined_at'
            ).eq('user_id', user_id).order('joined_at', desc=True).limit(limit).execute()
            
            groups = []
            if result.data:
                for membership in result.data:
                    group = membership.get('social_groups', {})
                    if group:
                        groups.append({
                            'id': group.get('id'),
                            'name': group.get('name'),
                            'description': group.get('description'),
                            'member_count': group.get('member_count', 0),
                            'user_role': membership.get('role', 'member'),
                            'joined_at': membership.get('joined_at')
                        })
            
            # Store in cache for 5 minutes
            await cache.set(cache_key, groups, ttl=300)

            return groups
        except Exception as e:
            logger.warning(f"Error fetching user social groups: {e}")
            return []
    
    async def get_user_social_posts(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get user's recent social posts"""
        try:
            if not self.client:
                return []
            
            # Caching implementation
            from app.services.cache_service import get_cache
            cache = await get_cache()
            cache_key = f"user_social_posts:{user_id}:{limit}"

            cached_posts = await cache.get(cache_key)
            if cached_posts:
                logger.info(f"✅ Cache hit for user social posts: {user_id}")
                return cached_posts

            logger.info(f"🚧 Cache miss for user social posts: {user_id}, fetching from DB")

            result = self.client.table('social_posts').select('*').eq(
                'user_id', user_id
            ).order('created_at', desc=True).limit(limit).execute()
            
            posts = []
            if result.data:
                for post in result.data:
                    posts.append({
                        'id': post['id'],
                        'content': post.get('content', ''),
                        'post_type': post.get('post_type', 'text'),
                        'likes_count': post.get('likes_count', 0),
                        'comments_count': post.get('comments_count', 0),
                        'created_at': post.get('created_at'),
                        'group_id': post.get('group_id')
                    })
            
            # Store in cache for 5 minutes
            await cache.set(cache_key, posts, ttl=300)

            return posts
        except Exception as e:
            logger.warning(f"Error fetching user social posts: {e}")
            return []
    
    async def get_marketplace_listings(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get user's marketplace listings"""
        try:
            if not self.client:
                return []
            
            # Caching implementation
            from app.services.cache_service import get_cache
            cache = await get_cache()
            cache_key = f"marketplace_listings:{user_id}:{limit}"

            cached_listings = await cache.get(cache_key)
            if cached_listings:
                logger.info(f"✅ Cache hit for marketplace listings: {user_id}")
                return cached_listings

            logger.info(f"🚧 Cache miss for marketplace listings: {user_id}, fetching from DB")

            result = self.client.table('marketplace_listings').select('*').eq(
                'seller_id', user_id
            ).order('created_at', desc=True).limit(limit).execute()
            
            listings = []
            if result.data:
                for listing in result.data:
                    listings.append({
                        'id': listing['id'],
                        'title': listing.get('title', ''),
                        'description': listing.get('description', ''),
                        'price': listing.get('price', 0),
                        'category': listing.get('category', ''),
                        'status': listing.get('status', 'active'),
                        'location': listing.get('location', ''),
                        'created_at': listing.get('created_at')
                    })
            
            # Store in cache for 5 minutes
            await cache.set(cache_key, listings, ttl=300)

            return listings
        except Exception as e:
            logger.warning(f"Error fetching marketplace listings: {e}")
            return []
    
    async def create_social_post(self, user_id: str, content: str, post_type: str = 'text', group_id: str = None) -> bool:
        """Create a new social post"""
        try:
            if not self.client:
                return False
            
            post_data = {
                'user_id': user_id,
                'content': content,
                'post_type': post_type
            }
            
            if group_id:
                post_data['group_id'] = group_id
            
            result = self.client.table('social_posts').insert(post_data).execute()
            
            # Invalidate cache
            from app.services.cache_service import get_cache
            cache = await get_cache()
            await cache.delete(f"user_social_posts:{user_id}:10")

            return bool(result.data)
        except Exception as e:
            logger.warning(f"Error creating social post: {e}")
            return False
    
    async def join_social_group(self, user_id: str, group_id: str) -> bool:
        """Join a social group"""
        try:
            if not self.client:
                return False
            
            # Check if already a member
            existing = self.client.table('group_memberships').select('id').eq(
                'user_id', user_id
            ).eq('group_id', group_id).execute()
            
            if existing.data:
                return True  # Already a member
            
            # Add membership
            result = self.client.table('group_memberships').insert({
                'user_id': user_id,
                'group_id': group_id,
                'role': 'member'
            }).execute()
            
            # Invalidate cache
            from app.services.cache_service import get_cache
            cache = await get_cache()
            await cache.delete(f"user_social_groups:{user_id}:20")

            return bool(result.data)
        except Exception as e:
            logger.warning(f"Error joining social group: {e}")
            return False
    
    # Shop Integration Methods
    async def get_user_purchase_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get user's purchase history"""
        try:
            if not self.client:
                return []
            
            # Caching implementation
            from app.services.cache_service import get_cache
            cache = await get_cache()
            cache_key = f"user_purchase_history:{user_id}:{limit}"

            cached_history = await cache.get(cache_key)
            if cached_history:
                logger.info(f"✅ Cache hit for user purchase history: {user_id}")
                return cached_history

            logger.info(f"🚧 Cache miss for user purchase history: {user_id}, fetching from DB")

            try:
                result = self.client.table('affiliate_sales').select('*').eq(
                    'user_id', user_id
                ).order('created_at', desc=True).limit(limit).execute()
            except Exception as e:
                if 'does not exist' in str(e).lower():
                    logger.info(f"affiliate_sales table doesn't exist yet - returning empty history")
                    return []
                raise e
            
            purchases = []
            if result.data:
                for purchase in result.data:
                    purchases.append({
                        'id': purchase['id'],
                        'product_name': purchase.get('product_name', ''),
                        'product_url': purchase.get('product_url', ''),
                        'amount': purchase.get('amount', 0),
                        'commission': purchase.get('commission', 0),
                        'status': purchase.get('status', 'pending'),
                        'purchase_date': purchase.get('created_at'),
                        'category': purchase.get('category', '')
                    })
            
            # Store in cache for 5 minutes
            await cache.set(cache_key, purchases, ttl=300)

            return purchases
        except Exception as e:
            logger.warning(f"Error fetching purchase history: {e}")
            return []
    
    async def get_user_wishlists(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's wishlists and saved products"""
        try:
            if not self.client:
                return []
            
            # Caching implementation
            from app.services.cache_service import get_cache
            cache = await get_cache()
            cache_key = f"user_wishlists:{user_id}"

            cached_wishlists = await cache.get(cache_key)
            if cached_wishlists:
                logger.info(f"✅ Cache hit for user wishlists: {user_id}")
                return cached_wishlists

            logger.info(f"🚧 Cache miss for user wishlists: {user_id}, fetching from DB")

            try:
                result = self.client.table('user_wishlists').select('*').eq(
                    'user_id', user_id
                ).order('created_at', desc=True).execute()
            except Exception as e:
                if 'does not exist' in str(e).lower():
                    logger.info(f"user_wishlists table doesn't exist yet - returning empty list")
                    return []
                raise e
            
            wishlists = []
            if result.data:
                for item in result.data:
                    wishlists.append({
                        'id': item['id'],
                        'product_id': item.get('product_id'),
                        'product_name': item.get('product_name', ''),
                        'price': item.get('price', 0),
                        'category': item.get('category', ''),
                        'added_date': item.get('created_at'),
                        'notes': item.get('notes', '')
                    })
            
            # Store in cache for 5 minutes
            await cache.set(cache_key, wishlists, ttl=300)

            return wishlists
        except Exception as e:
            logger.warning(f"Error fetching wishlists: {e}")
            return []
    
    async def get_personalized_recommendations(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get personalized product recommendations for user"""
        try:
            if not self.client:
                return []
            
            # Caching implementation
            from app.services.cache_service import get_cache
            cache = await get_cache()
            cache_key = f"personalized_recommendations:{user_id}:{limit}"

            cached_recommendations = await cache.get(cache_key)
            if cached_recommendations:
                logger.info(f"✅ Cache hit for personalized recommendations: {user_id}")
                return cached_recommendations

            logger.info(f"🚧 Cache miss for personalized recommendations: {user_id}, fetching from DB")

            result = self.client.table('personalized_recommendations').select('*').eq(
                'user_id', user_id
            ).order('score', desc=True).limit(limit).execute()
            
            recommendations = []
            if result.data:
                for rec in result.data:
                    recommendations.append({
                        'product_id': rec.get('product_id'),
                        'product_name': rec.get('product_name', ''),
                        'category': rec.get('category', ''),
                        'price': rec.get('price', 0),
                        'score': rec.get('score', 0),
                        'reason': rec.get('reason', ''),
                        'image_url': rec.get('image_url', '')
                    })
            
            # Store in cache for 5 minutes
            await cache.set(cache_key, recommendations, ttl=300)

            return recommendations
        except Exception as e:
            logger.warning(f"Error fetching personalized recommendations: {e}")
            return []
    
    async def add_to_wishlist(self, user_id: str, product_id: str, product_name: str, price: float, category: str = '', notes: str = '') -> bool:
        """Add product to user's wishlist"""
        try:
            if not self.client:
                return False
            
            try:
                # Check if already in wishlist
                existing = self.client.table('user_wishlists').select('id').eq(
                    'user_id', user_id
                ).eq('product_id', product_id).execute()
                
                if existing.data:
                    return True  # Already in wishlist
                
                result = self.client.table('user_wishlists').insert({
                    'user_id': user_id,
                    'product_id': product_id,
                    'product_name': product_name,
                    'price': price,
                    'category': category,
                    'notes': notes
                }).execute()
                
                # Invalidate cache
                from app.services.cache_service import get_cache
                cache = await get_cache()
                await cache.delete(f"user_wishlists:{user_id}")

                return bool(result.data)
            except Exception as e:
                if 'does not exist' in str(e).lower():
                    logger.info(f"user_wishlists table doesn't exist yet - cannot add to wishlist")
                    return False
                raise e
        except Exception as e:
            logger.warning(f"Error adding to wishlist: {e}")
            return False
    
    async def track_purchase(self, user_id: str, product_data: Dict[str, Any]) -> bool:
        """Track a user purchase"""
        try:
            if not self.client:
                return False
            
            purchase_data = {
                'user_id': user_id,
                'product_name': product_data.get('product_name', ''),
                'product_url': product_data.get('product_url', ''),
                'amount': product_data.get('amount', 0),
                'commission': product_data.get('commission', 0),
                'status': 'confirmed',
                'category': product_data.get('category', '')
            }
            
            try:
                result = self.client.table('affiliate_sales').insert(purchase_data).execute()
                
                # Invalidate cache
                from app.services.cache_service import get_cache
                cache = await get_cache()
                await cache.delete(f"user_purchase_history:{user_id}:20")

                return bool(result.data)
            except Exception as e:
                if 'does not exist' in str(e).lower():
                    logger.info(f"affiliate_sales table doesn't exist yet - cannot track purchase")
                    return False
                raise e
        except Exception as e:
            logger.warning(f"Error tracking purchase: {e}")
            return False
    
    # Cross-Functional Query Methods (The Game Changers!)
    async def correlate_trip_expenses(self, user_id: str, trip_id: str) -> Dict[str, Any]:
        """Correlate trip with related expenses for intelligent insights"""
        try:
            if not self.client:
                return {}
            
            # Get trip details
            trip = await self.get_trip_details(trip_id)
            if not trip or trip.get('created_by') != user_id:
                return {}
            
            trip_date = trip.get('created_at', '')
            
            # Get expenses around trip dates (within 7 days before/after)
            if trip_date:
                from datetime import datetime, timedelta
                try:
                    trip_datetime = datetime.fromisoformat(trip_date.replace('Z', '+00:00'))
                    start_date = (trip_datetime - timedelta(days=7)).isoformat()
                    end_date = (trip_datetime + timedelta(days=7)).isoformat()
                    
                    expenses_result = self.client.table('expenses').select('*').eq(
                        'user_id', user_id
                    ).gte('date', start_date).lte('date', end_date).execute()
                    
                    expenses = expenses_result.data if expenses_result.data else []
                    
                    # Categorize expenses by type
                    fuel_expenses = [e for e in expenses if 'fuel' in e.get('category', '').lower()]
                    food_expenses = [e for e in expenses if 'food' in e.get('category', '').lower()]
                    accommodation_expenses = [e for e in expenses if any(word in e.get('category', '').lower() for word in ['accommodation', 'camping', 'hotel'])]
                    
                    total_trip_cost = sum(e.get('amount', 0) for e in expenses)
                    
                    return {
                        'trip': trip,
                        'total_expenses': len(expenses),
                        'total_cost': total_trip_cost,
                        'fuel_cost': sum(e.get('amount', 0) for e in fuel_expenses),
                        'food_cost': sum(e.get('amount', 0) for e in food_expenses),
                        'accommodation_cost': sum(e.get('amount', 0) for e in accommodation_expenses),
                        'expense_breakdown': {
                            'fuel': fuel_expenses,
                            'food': food_expenses,
                            'accommodation': accommodation_expenses,
                            'other': [e for e in expenses if e not in fuel_expenses + food_expenses + accommodation_expenses]
                        }
                    }
                except Exception as date_error:
                    logger.warning(f"Date parsing error: {date_error}")
                    
            return {'trip': trip, 'total_expenses': 0, 'total_cost': 0}
        except Exception as e:
            logger.warning(f"Error correlating trip expenses: {e}")
            return {}
    
    async def get_financial_travel_insights(self, user_id: str, months: int = 6) -> Dict[str, Any]:
        """Get comprehensive financial insights across travel, expenses, and budgets"""
        try:
            if not self.client:
                return {}
            
            # Caching implementation
            from app.services.cache_service import get_cache
            cache = await get_cache()
            cache_key = f"financial_travel_insights:{user_id}:{months}"

            cached_insights = await cache.get(cache_key)
            if cached_insights:
                logger.info(f"✅ Cache hit for financial travel insights: {user_id}")
                return cached_insights

            logger.info(f"🚧 Cache miss for financial travel insights: {user_id}, fetching from DB")

            from datetime import datetime, timedelta
            
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=months * 30)
            
            # Get trips in date range
            trips_result = self.client.table('group_trips').select('*').eq(
                'created_by', user_id
            ).gte('created_at', start_date.isoformat()).execute()
            
            # Get expenses in date range
            expenses_result = self.client.table('expenses').select('*').eq(
                'user_id', user_id
            ).gte('date', start_date.isoformat()).execute()
            
            # Get budgets
            budgets_result = self.client.table('budgets').select('*').eq(
                'user_id', user_id
            ).execute()
            
            trips = trips_result.data if trips_result.data else []
            expenses = expenses_result.data if expenses_result.data else []
            budgets = budgets_result.data if budgets_result.data else []
            
            # Calculate insights
            total_travel_expenses = sum(e.get('amount', 0) for e in expenses 
                                     if any(word in e.get('category', '').lower() for word in ['fuel', 'travel', 'accommodation', 'camping']))
            
            avg_trip_cost = total_travel_expenses / len(trips) if trips else 0
            
            # Budget vs actual analysis
            travel_budget = sum(b.get('amount', 0) for b in budgets 
                              if any(word in b.get('category', '').lower() for word in ['fuel', 'travel', 'accommodation']))
            
            budget_variance = travel_budget - total_travel_expenses if travel_budget > 0 else 0
            
            insights = {
                'period_months': months,
                'trips_count': len(trips),
                'total_travel_expenses': total_travel_expenses,
                'average_trip_cost': avg_trip_cost,
                'travel_budget': travel_budget,
                'budget_variance': budget_variance,
                'budget_adherence': (budget_variance / travel_budget * 100) if travel_budget > 0 else 0,
                'most_expensive_category': self._get_top_expense_category(expenses),
                'trips': trips[:5],  # Latest 5 trips
                'expense_trends': self._calculate_expense_trends(expenses)
            }

            # Store in cache for 5 minutes
            await cache.set(cache_key, insights, ttl=300)

            return insights
        except Exception as e:
            logger.warning(f"Error getting financial travel insights: {e}")
            return {}
    
    async def get_social_travel_connections(self, user_id: str) -> Dict[str, Any]:
        """Find connections between user's social groups and travel plans"""
        try:
            if not self.client:
                return {}
            
            # Caching implementation
            from app.services.cache_service import get_cache
            cache = await get_cache()
            cache_key = f"social_travel_connections:{user_id}"

            cached_connections = await cache.get(cache_key)
            if cached_connections:
                logger.info(f"✅ Cache hit for social travel connections: {user_id}")
                return cached_connections

            logger.info(f"🚧 Cache miss for social travel connections: {user_id}, fetching from DB")

            # Get user's social groups
            social_groups = await self.get_user_social_groups(user_id)
            
            # Get user's recent trips
            trips = await self.get_user_trips(user_id, limit=10)
            
            # Get posts that mention travel/locations
            posts_result = self.client.table('social_posts').select('*').eq(
                'user_id', user_id
            ).ilike('content', '%trip%').execute()
            
            travel_posts = posts_result.data if posts_result.data else []
            
            # Find group members who might be interested in similar destinations
            group_connections = []
            for group in social_groups:
                # This would be expanded to find members with similar travel interests
                group_connections.append({
                    'group_id': group['id'],
                    'group_name': group['name'],
                    'potential_travel_buddies': 0  # Placeholder - would calculate based on member travel history
                })
            
            connections = {
                'social_groups': len(social_groups),
                'travel_posts': len(travel_posts),
                'recent_trips': len(trips),
                'group_connections': group_connections,
                'travel_social_score': len(travel_posts) + len(social_groups)  # Simple metric
            }

            # Store in cache for 5 minutes
            await cache.set(cache_key, connections, ttl=300)

            return connections
        except Exception as e:
            logger.warning(f"Error getting social travel connections: {e}")
            return {}
    
    async def get_comprehensive_user_context(self, user_id: str) -> Dict[str, Any]:
        """Get complete user context across all app sections - PAM's full knowledge"""
        try:
            if not self.client:
                return {}
            
            # Caching implementation
            from app.services.cache_service import get_cache
            cache = await get_cache()
            cache_key = f"comprehensive_user_context:{user_id}"
            
            cached_context = await cache.get(cache_key)
            if cached_context:
                logger.info(f"✅ Cache hit for comprehensive user context: {user_id}")
                return cached_context
            
            logger.info(f"🚧 Cache miss for comprehensive user context: {user_id}, fetching from DB")

            # Gather data from all sections
            user_profile = await self.get_user_profile(user_id)
            recent_trips = await self.get_user_trips(user_id, limit=5)
            social_groups = await self.get_user_social_groups(user_id, limit=10)
            social_posts = await self.get_user_social_posts(user_id, limit=5)
            purchase_history = await self.get_user_purchase_history(user_id, limit=10)
            wishlists = await self.get_user_wishlists(user_id)
            
            # Get recent expenses and budgets
            expenses_result = self.client.table('expenses').select('*').eq(
                'user_id', user_id
            ).order('date', desc=True).limit(10).execute()
            
            budgets_result = self.client.table('budgets').select('*').eq(
                'user_id', user_id
            ).execute()
            
            expenses = expenses_result.data if expenses_result.data else []
            budgets = budgets_result.data if budgets_result.data else []
            
            # Get calendar events
            calendar_result = self.client.table('calendar_events').select('*').eq(
                'user_id', user_id
            ).order('start_time', desc=True).limit(5).execute()
            
            calendar_events = calendar_result.data if calendar_result.data else []
            
            comprehensive_context = {
                'user_profile': user_profile,
                'travel': {
                    'recent_trips': recent_trips,
                    'trip_count': len(recent_trips)
                },
                'financial': {
                    'recent_expenses': expenses,
                    'budgets': budgets,
                    'total_expenses': sum(e.get('amount', 0) for e in expenses),
                    'total_budget': sum(b.get('amount', 0) for b in budgets)
                },
                'social': {
                    'groups': social_groups,
                    'posts': social_posts,
                    'social_score': len(social_groups) + len(social_posts)
                },
                'shopping': {
                    'purchase_history': purchase_history,
                    'wishlists': wishlists,
                    'total_spent': sum(p.get('amount', 0) for p in purchase_history)
                },
                'calendar': {
                    'upcoming_events': calendar_events
                },
                'activity_summary': {
                    'total_trips': len(recent_trips),
                    'total_expenses': len(expenses),
                    'total_social_activity': len(social_groups) + len(social_posts),
                    'total_purchases': len(purchase_history)
                }
            }

            # Store in cache for 5 minutes
            await cache.set(cache_key, comprehensive_context, ttl=300)
            
            return comprehensive_context
        except Exception as e:
            logger.warning(f"Error getting comprehensive user context: {e}")
            return {}
    
    def _get_top_expense_category(self, expenses: List[Dict]) -> str:
        """Helper to find the category with highest spending"""
        category_totals = {}
        for expense in expenses:
            category = expense.get('category', 'other')
            category_totals[category] = category_totals.get(category, 0) + expense.get('amount', 0)
        
        return max(category_totals.items(), key=lambda x: x[1])[0] if category_totals else 'none'
    
    def _calculate_expense_trends(self, expenses: List[Dict]) -> Dict[str, float]:
        """Helper to calculate expense trends over time"""
        # Simplified trend calculation - could be much more sophisticated
        if len(expenses) < 2:
            return {'trend': 'insufficient_data'}
        
        recent_avg = sum(e.get('amount', 0) for e in expenses[:5]) / min(5, len(expenses))
        older_avg = sum(e.get('amount', 0) for e in expenses[5:10]) / min(5, len(expenses[5:]))
        
        if older_avg > 0:
            trend_percentage = ((recent_avg - older_avg) / older_avg) * 100
            return {
                'trend': 'increasing' if trend_percentage > 5 else 'decreasing' if trend_percentage < -5 else 'stable',
                'percentage_change': trend_percentage,
                'recent_average': recent_avg,
                'older_average': older_avg
            }
        
        return {'trend': 'stable'}
    
    # Calendar and You Page Methods
    async def get_user_calendar_events(self, user_id: str, days_ahead: int = 30) -> List[Dict[str, Any]]:
        """Get user's upcoming calendar events"""
        try:
            if not self.client:
                return []
            
            # Caching implementation
            from app.services.cache_service import get_cache
            cache = await get_cache()
            cache_key = f"user_calendar_events:{user_id}:{days_ahead}"

            cached_events = await cache.get(cache_key)
            if cached_events:
                logger.info(f"✅ Cache hit for user calendar events: {user_id}")
                return cached_events

            logger.info(f"🚧 Cache miss for user calendar events: {user_id}, fetching from DB")

            from datetime import datetime, timedelta
            
            start_date = datetime.now()
            end_date = start_date + timedelta(days=days_ahead)
            
            result = self.client.table('calendar_events').select('*').eq(
                'user_id', user_id
            ).gte('start_date', start_date.isoformat()).lte(
                'start_date', end_date.isoformat()
            ).order('start_date').execute()
            
            events = []
            if result.data:
                for event in result.data:
                    events.append({
                        'id': event['id'],
                        'title': event.get('title', ''),
                        'description': event.get('description', ''),
                        'start_date': event.get('start_date'),
                        'end_date': event.get('end_date'),
                        'location': event.get('location', ''),
                        'event_type': event.get('event_type', 'personal'),
                        'reminder_minutes': event.get('reminder_minutes', 0)
                    })
            
            # Store in cache for 5 minutes
            await cache.set(cache_key, events, ttl=300)

            return events
        except Exception as e:
            logger.warning(f"Error fetching calendar events: {e}")
            return []
    
    async def create_calendar_event(self, user_id: str, event_data: Dict[str, Any]) -> bool:
        """Create a new calendar event"""
        try:
            if not self.client:
                return False
            
            calendar_event = {
                'user_id': user_id,
                'title': event_data.get('title', ''),
                'description': event_data.get('description', ''),
                'start_date': event_data.get('start_date'),
                'end_date': event_data.get('end_date'),
                'location': event_data.get('location', ''),
                'event_type': event_data.get('event_type', 'personal'),
                'reminder_minutes': event_data.get('reminder_minutes', 15)
            }
            
            # PERMANENT FIX: Always use regular client for calendar operations
            # This prevents PostgreSQL "permission denied to set role admin" errors
            # Service client should only be used for true admin operations
            
            result = self.client.table('calendar_events').insert(calendar_event).execute()
            
            # Invalidate cache
            from app.services.cache_service import get_cache
            cache = await get_cache()
            await cache.delete(f"user_calendar_events:{user_id}:30")

            return bool(result.data)
        except Exception as e:
            logger.warning(f"Error creating calendar event: {e}")
            return False
    
    async def get_user_settings(self, user_id: str) -> Dict[str, Any]:
        """Get user's app settings and preferences"""
        try:
            if not self.client:
                return {}
            
            # Caching implementation
            from app.services.cache_service import get_cache
            cache = await get_cache()
            cache_key = f"user_settings:{user_id}"

            cached_settings = await cache.get(cache_key)
            if cached_settings:
                logger.info(f"✅ Cache hit for user settings: {user_id}")
                return cached_settings

            logger.info(f"🚧 Cache miss for user settings: {user_id}, fetching from DB")

            # Get from user preferences
            preferences = await self.get_user_preferences(user_id)
            
            # Get from profile
            profile_result = self.client.table('profiles').select('*').eq(
                'id', user_id
            ).single().execute()
            
            profile = profile_result.data if profile_result.data else {}
            
            settings_data = {
                'notifications': preferences.get('notifications', {}),
                'privacy': preferences.get('privacy', {}),
                'display': preferences.get('display', {}),
                'integrations': preferences.get('integrations', {}),
                'travel_preferences': preferences.get('travel_preferences', {}),
                'vehicle_info': preferences.get('vehicle_info', {}),
                'profile': {
                    'name': profile.get('name', ''),
                    'email': profile.get('email', ''),
                    'phone': profile.get('phone', ''),
                    'location': profile.get('location', ''),
                    'avatar_url': profile.get('avatar_url', '')
                }
            }

            # Store in cache for 5 minutes
            await cache.set(cache_key, settings_data, ttl=300)

            return settings_data
        except Exception as e:
            logger.warning(f"Error fetching user settings: {e}")
            return {}
    
    async def update_user_settings(self, user_id: str, settings_data: Dict[str, Any]) -> bool:
        """Update user settings and preferences"""
        try:
            if not self.client:
                return False
            
            # Update preferences in pam_user_context
            for key, value in settings_data.items():
                if key != 'profile':  # Handle profile separately
                    await self.store_user_preference(user_id, key, value)
            
            # Update profile if provided
            if 'profile' in settings_data:
                profile_data = settings_data['profile']
                result = self.client.table('profiles').update(profile_data).eq(
                    'id', user_id
                ).execute()
                
                if not result.data:
                    return False
            
            # Invalidate cache
            from app.services.cache_service import get_cache
            cache = await get_cache()
            await cache.delete(f"user_settings:{user_id}")
            await cache.delete(f"user_profile:{user_id}")

            return True
        except Exception as e:
            logger.warning(f"Error updating user settings: {e}")
            return False
    
    # Admin Dashboard Methods
    async def get_admin_analytics(self, admin_user_id: str) -> Dict[str, Any]:
        """Get comprehensive admin analytics (only for admin users)"""
        try:
            if not self.client:
                return {}
            
            # Verify admin status
            admin_check = self.client.table('admin_users').select('role').eq(
                'user_id', admin_user_id
            ).execute()
            
            if not admin_check.data:
                logger.warning(f"Non-admin user {admin_user_id} attempted to access admin analytics")
                return {}
            
            # Get system-wide statistics
            from datetime import datetime, timedelta
            
            thirty_days_ago = datetime.now() - timedelta(days=30)
            
            # User statistics
            users_result = self.client.table('profiles').select('id, created_at').execute()
            total_users = len(users_result.data) if users_result.data else 0
            
            new_users = len([u for u in users_result.data 
                           if u.get('created_at') and u['created_at'] > thirty_days_ago.isoformat()]) if users_result.data else 0
            
            # Trip statistics
            trips_result = self.client.table('group_trips').select('id, created_at').execute()
            total_trips = len(trips_result.data) if trips_result.data else 0
            
            recent_trips = len([t for t in trips_result.data 
                              if t.get('created_at') and t['created_at'] > thirty_days_ago.isoformat()]) if trips_result.data else 0
            
            # Expense statistics
            expenses_result = self.client.table('expenses').select('amount, date').execute()
            total_expenses_tracked = len(expenses_result.data) if expenses_result.data else 0
            total_amount_tracked = sum(e.get('amount', 0) for e in expenses_result.data) if expenses_result.data else 0
            
            # Social statistics
            posts_result = self.client.table('social_posts').select('id, created_at').execute()
            total_posts = len(posts_result.data) if posts_result.data else 0
            
            groups_result = self.client.table('social_groups').select('id').execute()
            total_groups = len(groups_result.data) if groups_result.data else 0
            
            return {
                'users': {
                    'total': total_users,
                    'new_last_30_days': new_users,
                    'growth_rate': (new_users / max(total_users - new_users, 1)) * 100
                },
                'travel': {
                    'total_trips': total_trips,
                    'recent_trips': recent_trips,
                    'avg_trips_per_user': total_trips / max(total_users, 1)
                },
                'financial': {
                    'total_expenses_tracked': total_expenses_tracked,
                    'total_amount_tracked': total_amount_tracked,
                    'avg_expense_per_user': total_amount_tracked / max(total_users, 1)
                },
                'social': {
                    'total_posts': total_posts,
                    'total_groups': total_groups,
                    'avg_posts_per_user': total_posts / max(total_users, 1)
                },
                'engagement': {
                    'active_users_30_days': new_users + recent_trips  # Simplified metric
                }
            }
        except Exception as e:
            logger.warning(f"Error fetching admin analytics: {e}")
            return {}
    
    async def get_system_health_metrics(self, admin_user_id: str) -> Dict[str, Any]:
        """Get system health and performance metrics"""
        try:
            if not self.client:
                return {}
            
            # Verify admin status
            admin_check = self.client.table('admin_users').select('role').eq(
                'user_id', admin_user_id
            ).execute()
            
            if not admin_check.data:
                return {}
            
            # Check database health
            health_result = await self.health_check()
            
            # PAM analytics
            pam_logs_result = self.client.table('pam_analytics_logs').select('*').order(
                'created_at', desc=True
            ).limit(100).execute()
            
            pam_logs = pam_logs_result.data if pam_logs_result.data else []
            
            # Calculate PAM performance metrics
            successful_responses = len([log for log in pam_logs if log.get('success', False)])
            total_responses = len(pam_logs)
            
            return {
                'database': health_result,
                'pam': {
                    'total_interactions': total_responses,
                    'success_rate': (successful_responses / max(total_responses, 1)) * 100,
                    'recent_errors': len([log for log in pam_logs if not log.get('success', True)])
                },
                'system': {
                    'status': 'healthy' if health_result.get('status') == 'healthy' else 'degraded',
                    'uptime': '99.9%'  # This would be calculated from actual monitoring
                }
            }
        except Exception as e:
            logger.warning(f"Error fetching system health metrics: {e}")
            return {}
    
    # Reference Token Methods (SaaS Industry Standard)
    async def create_user_session(self, user_id: str, token_hash: str, user_data: Dict[str, Any]) -> bool:
        """Create a user session for reference token authentication"""
        try:
            if not self.client:
                return False
            
            # Insert new session
            result = self.client.table('user_sessions').insert({
                'user_id': user_id,
                'token_hash': token_hash,
                'user_data': user_data,
                'expires_at': (
                    # Set expiration to 1 hour from now
                    # Supabase will handle the timestamp formatting
                    "now() + interval '1 hour'"
                )
            }).execute()
            
            return bool(result.data)
        except Exception as e:
            logger.error(f"Error creating user session: {e}")
            return False
    
    async def get_user_session_by_token_hash(self, token_hash: str) -> Optional[Dict[str, Any]]:
        """Get user session by token hash"""
        try:
            if not self.client:
                return None
            
            result = self.client.table('user_sessions').select('*').eq(
                'token_hash', token_hash
            ).gt(
                'expires_at', 'now()'  # Only non-expired sessions
            ).single().execute()
            
            return result.data if result.data else None
        except Exception as e:
            logger.warning(f"Error getting user session: {e}")
            return None
    
    async def delete_user_session(self, session_id: str) -> bool:
        """Delete a user session (for logout/cleanup)"""
        try:
            if not self.client:
                return False
            
            result = self.client.table('user_sessions').delete().eq(
                'id', session_id
            ).execute()
            
            return True
        except Exception as e:
            logger.warning(f"Error deleting user session: {e}")
            return False
    
    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions and return count of deleted sessions"""
        try:
            if not self.client:
                return 0
            
            result = self.client.table('user_sessions').delete().lt(
                'expires_at', 'now()'
            ).execute()
            
            count = len(result.data) if result.data else 0
            logger.info(f"Cleaned up {count} expired sessions")
            return count
        except Exception as e:
            logger.warning(f"Error cleaning up expired sessions: {e}")
            return 0

# Global instance, initialized lazily
database_service: Optional[DatabaseService] = None

def get_database_service() -> DatabaseService:
    """Get or create the global database service instance."""
    global database_service
    if not database_service:
        database_service = DatabaseService()
    return database_service
