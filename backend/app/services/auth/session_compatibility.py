"""
Session Compatibility Layer for Smooth Authentication Transition
Supports dual-mode authentication: localStorage tokens and httpOnly cookies
Enables gradual migration with fallback capabilities
"""

import os
import json
import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Union, Tuple
from enum import Enum
from dataclasses import dataclass

import redis.asyncio as redis
from fastapi import Request, Response, HTTPException, status
import jwt

from app.core.config import settings
from app.core.logging import get_logger
from app.services.auth.session_manager import get_session_manager, SessionInfo

logger = get_logger(__name__)

class AuthMethod(str, Enum):
    """Authentication method types"""
    LOCALSTORAGE = "localStorage"
    HTTP_COOKIE = "httpOnly"
    AUTHORIZATION_HEADER = "bearerToken"

@dataclass
class AuthContext:
    """Authentication context with method tracking"""
    user_id: str
    token: str
    method: AuthMethod
    session_id: Optional[str] = None
    requires_migration: bool = False
    jwt_payload: Optional[Dict[str, Any]] = None
    device_fingerprint: Optional[str] = None

class SessionCompatibilityLayer:
    """
    Compatibility layer for smooth transition from localStorage to httpOnly cookies

    Features:
    - Dual-mode authentication support
    - Automatic token migration scheduling
    - Device fingerprinting for security
    - Feature flag controlled rollout
    - Rollback capability
    """

    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.migration_enabled = self._get_feature_flag("ENABLE_COOKIE_AUTH", default=False)
        self.migration_schedule_key = "migration:scheduled:"
        self.migration_stats_key = "migration:stats"
        self.device_tracking_enabled = True

        # Cookie settings
        self.cookie_name = "auth_session"
        self.cookie_secure = settings.is_production()
        self.cookie_samesite = "strict" if settings.is_production() else "lax"
        self.cookie_max_age = 86400  # 24 hours

    async def initialize(self) -> bool:
        """Initialize Redis connection and migration tracking"""
        try:
            redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379')
            self.redis_client = await redis.from_url(
                redis_url,
                encoding='utf-8',
                decode_responses=True
            )

            await self.redis_client.ping()
            logger.info("✅ Session compatibility layer initialized")

            # Initialize migration stats if not exists
            if not await self.redis_client.exists(self.migration_stats_key):
                stats = {
                    "total_users": 0,
                    "migrated_users": 0,
                    "migration_attempts": 0,
                    "migration_failures": 0,
                    "rollback_count": 0,
                    "started_at": datetime.now(timezone.utc).isoformat()
                }
                await self.redis_client.hset(
                    self.migration_stats_key,
                    mapping={k: json.dumps(v) if isinstance(v, (dict, list)) else str(v) for k, v in stats.items()}
                )

            return True

        except Exception as e:
            logger.error(f"❌ Failed to initialize compatibility layer: {e}")
            return False

    def _get_feature_flag(self, flag_name: str, default: bool = False) -> bool:
        """Get feature flag value with fallback"""
        return bool(os.getenv(flag_name, str(default)).lower() in ('true', '1', 'yes', 'on'))

    def _generate_device_fingerprint(self, request: Request) -> str:
        """Generate device fingerprint for security tracking"""
        components = [
            request.headers.get("User-Agent", ""),
            request.headers.get("Accept-Language", ""),
            request.headers.get("Accept-Encoding", ""),
            request.client.host if request.client else "unknown",
            request.headers.get("X-Forwarded-For", ""),
        ]

        fingerprint_data = "|".join(components)
        return hashlib.sha256(fingerprint_data.encode()).hexdigest()[:16]

    async def detect_auth_method(self, request: Request) -> Tuple[Optional[str], AuthMethod]:
        """
        Detect authentication method and extract token
        Priority: httpOnly cookie > Authorization header > localStorage (via body)
        """
        # Method 1: Check httpOnly cookie (preferred)
        if self.migration_enabled:
            cookie_token = request.cookies.get(self.cookie_name)
            if cookie_token:
                logger.debug("🍪 Found httpOnly cookie authentication")
                return cookie_token, AuthMethod.HTTP_COOKIE

        # Method 2: Check Authorization header (standard)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]  # Remove "Bearer " prefix
            logger.debug("🔑 Found Bearer token authentication")
            return token, AuthMethod.AUTHORIZATION_HEADER

        # Method 3: Check request body for localStorage token (migration workaround)
        if request.method == "POST":
            try:
                body = await request.body()
                if body:
                    body_data = json.loads(body.decode())
                    if "auth_token" in body_data:
                        logger.debug("📱 Found localStorage token in request body")
                        return body_data["auth_token"], AuthMethod.LOCALSTORAGE
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass

        logger.debug("❌ No authentication token found")
        return None, AuthMethod.LOCALSTORAGE

    async def authenticate_request(self, request: Request) -> Optional[AuthContext]:
        """
        Authenticate request using dual-mode authentication
        Returns AuthContext with migration information
        """
        token, auth_method = await self.detect_auth_method(request)

        if not token:
            return None

        try:
            # Verify JWT token
            jwt_payload = await self._verify_jwt_token(token)
            user_id = jwt_payload.get('sub')

            if not user_id:
                logger.warning(f"🔐 Invalid JWT: missing user ID")
                return None

            # Generate device fingerprint
            device_fingerprint = self._generate_device_fingerprint(request)

            # Check if user requires migration
            requires_migration = await self._should_migrate_user(user_id, auth_method)

            # Get session manager for session tracking
            session_manager = await get_session_manager()

            # Create or update session tracking
            session_id = None
            if auth_method != AuthMethod.LOCALSTORAGE or self.migration_enabled:
                jti = jwt_payload.get('jti') or str(uuid.uuid4())
                device_info = {
                    "fingerprint": device_fingerprint,
                    "user_agent": request.headers.get("User-Agent"),
                    "auth_method": auth_method.value
                }

                session_info = await session_manager.create_session(
                    user_id=user_id,
                    jti=jti,
                    device_info=device_info,
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("User-Agent")
                )
                session_id = session_info.session_id

            auth_context = AuthContext(
                user_id=user_id,
                token=token,
                method=auth_method,
                session_id=session_id,
                requires_migration=requires_migration,
                jwt_payload=jwt_payload,
                device_fingerprint=device_fingerprint
            )

            logger.info(f"✅ Authentication successful: {user_id} via {auth_method.value}")
            return auth_context

        except Exception as e:
            logger.error(f"❌ Authentication failed: {e}")
            return None

    async def _verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """Verify JWT token with existing logic"""
        try:
            # First check if token is blacklisted
            unverified_payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": False}
            )

            jti = unverified_payload.get('jti')
            if jti:
                session_manager = await get_session_manager()
                if await session_manager.is_jwt_blacklisted(jti):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token has been revoked"
                    )

            # Verify token signature and expiration
            payload = jwt.decode(
                token,
                settings.SUPABASE_SERVICE_ROLE_KEY.get_secret_value(),
                algorithms=["HS256"],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": False,
                    "verify_iss": False
                }
            )

            return payload

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )

    async def _should_migrate_user(self, user_id: str, auth_method: AuthMethod) -> bool:
        """Determine if user should be migrated to cookie-based auth"""
        if not self.migration_enabled:
            return False

        if auth_method == AuthMethod.HTTP_COOKIE:
            return False  # Already using cookies

        # Check if user is already scheduled for migration
        migration_key = f"{self.migration_schedule_key}{user_id}"
        scheduled = await self.redis_client.get(migration_key)

        return scheduled is None  # Migrate if not already scheduled

    async def schedule_token_migration(
        self,
        auth_context: AuthContext,
        response: Response
    ) -> bool:
        """
        Schedule token migration from localStorage to httpOnly cookie
        Returns True if migration was scheduled/completed
        """
        if not self.migration_enabled or not auth_context.requires_migration:
            return False

        try:
            user_id = auth_context.user_id
            migration_key = f"{self.migration_schedule_key}{user_id}"

            # Check if already scheduled
            if await self.redis_client.get(migration_key):
                return False

            # Generate secure session token for cookie
            session_token = self._generate_session_token(auth_context)

            # Set httpOnly cookie
            response.set_cookie(
                key=self.cookie_name,
                value=session_token,
                max_age=self.cookie_max_age,
                httponly=True,
                secure=self.cookie_secure,
                samesite=self.cookie_samesite
            )

            # Mark user as migrated
            migration_data = {
                "user_id": user_id,
                "migrated_at": datetime.now(timezone.utc).isoformat(),
                "auth_method": auth_context.method.value,
                "device_fingerprint": auth_context.device_fingerprint
            }

            # Store migration record (expires in 30 days)
            await self.redis_client.setex(
                migration_key,
                2592000,  # 30 days
                json.dumps(migration_data)
            )

            # Update migration stats
            await self._update_migration_stats("migration_attempts", 1)
            await self._update_migration_stats("migrated_users", 1)

            logger.info(f"🔄 Token migration scheduled for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"❌ Migration scheduling failed for {auth_context.user_id}: {e}")
            await self._update_migration_stats("migration_failures", 1)
            return False

    def _generate_session_token(self, auth_context: AuthContext) -> str:
        """Generate secure session token for httpOnly cookie"""
        # Create new JWT with extended expiry for cookie
        payload = {
            **auth_context.jwt_payload,
            'method': 'httpOnly',
            'migrated_at': datetime.now(timezone.utc).isoformat(),
            'device': auth_context.device_fingerprint,
            'exp': datetime.now(timezone.utc) + timedelta(days=7)  # 7 day expiry
        }

        return jwt.encode(
            payload,
            settings.SUPABASE_SERVICE_ROLE_KEY.get_secret_value(),
            algorithm="HS256"
        )

    async def handle_logout(
        self,
        auth_context: AuthContext,
        response: Response,
        invalidate_all_sessions: bool = False
    ) -> bool:
        """
        Handle logout with session cleanup and cookie clearing
        """
        try:
            session_manager = await get_session_manager()

            if invalidate_all_sessions:
                # Logout from all devices
                count = await session_manager.invalidate_all_user_sessions(auth_context.user_id)
                logger.info(f"🔒 Logged out from {count} sessions for user {auth_context.user_id}")
            elif auth_context.session_id:
                # Logout from current session only
                await session_manager.invalidate_session(auth_context.session_id)
                logger.info(f"🔒 Session invalidated: {auth_context.session_id}")

            # Clear httpOnly cookie
            response.delete_cookie(
                key=self.cookie_name,
                secure=self.cookie_secure,
                samesite=self.cookie_samesite
            )

            # Blacklist current JWT if available
            if auth_context.jwt_payload and auth_context.jwt_payload.get('jti'):
                await session_manager.blacklist_jwt(auth_context.jwt_payload['jti'])

            return True

        except Exception as e:
            logger.error(f"❌ Logout error for {auth_context.user_id}: {e}")
            return False

    async def rollback_migration(self, user_id: str) -> bool:
        """Rollback migration for specific user (emergency feature)"""
        try:
            migration_key = f"{self.migration_schedule_key}{user_id}"
            await self.redis_client.delete(migration_key)

            await self._update_migration_stats("rollback_count", 1)

            logger.warning(f"🔄 Migration rollback completed for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"❌ Rollback failed for {user_id}: {e}")
            return False

    async def _update_migration_stats(self, stat_key: str, increment: int = 1) -> None:
        """Update migration statistics"""
        if not self.redis_client:
            return

        try:
            current_value = await self.redis_client.hget(self.migration_stats_key, stat_key)
            new_value = (int(current_value) if current_value else 0) + increment
            await self.redis_client.hset(self.migration_stats_key, stat_key, str(new_value))
        except Exception as e:
            logger.error(f"❌ Failed to update migration stats: {e}")

    async def get_migration_stats(self) -> Dict[str, Any]:
        """Get migration statistics for monitoring"""
        if not self.redis_client:
            return {}

        try:
            stats_raw = await self.redis_client.hgetall(self.migration_stats_key)
            stats = {}

            for key, value in stats_raw.items():
                try:
                    # Try to parse as JSON first, then as int, then as string
                    stats[key] = json.loads(value)
                except json.JSONDecodeError:
                    try:
                        stats[key] = int(value)
                    except ValueError:
                        stats[key] = value

            # Calculate migration rate
            if stats.get("total_users", 0) > 0:
                stats["migration_rate"] = stats.get("migrated_users", 0) / stats["total_users"] * 100
            else:
                stats["migration_rate"] = 0.0

            stats["migration_enabled"] = self.migration_enabled

            return stats

        except Exception as e:
            logger.error(f"❌ Error getting migration stats: {e}")
            return {"error": str(e)}

# Global compatibility layer instance
_compatibility_layer: Optional[SessionCompatibilityLayer] = None

async def get_compatibility_layer() -> SessionCompatibilityLayer:
    """Get or create compatibility layer instance"""
    global _compatibility_layer

    if _compatibility_layer is None:
        _compatibility_layer = SessionCompatibilityLayer()
        await _compatibility_layer.initialize()

    return _compatibility_layer