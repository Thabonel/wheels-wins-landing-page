"""
Secure Session Management Service
Implements Redis-based server-side session tracking with JWT ID management
"""

import os
import json
import uuid
import redis.asyncio as redis
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from app.core.logging import get_logger

logger = get_logger(__name__)

@dataclass
class SessionInfo:
    """Session information stored in Redis"""
    session_id: str
    user_id: str
    jti: str  # JWT ID for token blacklisting
    created_at: datetime
    last_activity: datetime
    device_info: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    expires_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Redis storage"""
        data = asdict(self)
        # Convert datetimes to ISO format
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.last_activity:
            data['last_activity'] = self.last_activity.isoformat()
        if self.expires_at:
            data['expires_at'] = self.expires_at.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SessionInfo':
        """Create SessionInfo from dictionary"""
        # Parse datetime strings
        if 'created_at' in data:
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if 'last_activity' in data:
            data['last_activity'] = datetime.fromisoformat(data['last_activity'])
        if 'expires_at' in data and data['expires_at']:
            data['expires_at'] = datetime.fromisoformat(data['expires_at'])
        return cls(**data)

class SecureSessionManager:
    """Redis-based secure session manager with JWT blacklisting"""

    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis_client: Optional[redis.Redis] = None
        self.max_sessions_per_user = int(os.getenv('MAX_SESSIONS_PER_USER', '3'))
        self.session_timeout = timedelta(hours=int(os.getenv('SESSION_TIMEOUT_HOURS', '24')))
        self.cleanup_interval = timedelta(hours=1)

        # Redis key prefixes
        self.session_prefix = "session:"
        self.user_sessions_prefix = "user_sessions:"
        self.blacklist_prefix = "blacklist_jti:"
        self.cleanup_key = "session_cleanup:last_run"

    async def initialize(self) -> bool:
        """Initialize Redis connection"""
        try:
            self.redis_client = await redis.from_url(
                self.redis_url,
                encoding='utf-8',
                decode_responses=True
            )

            # Test connection
            await self.redis_client.ping()
            logger.info("✅ Session manager Redis connection established")

            # Schedule cleanup if needed
            await self._schedule_cleanup_if_needed()

            return True

        except Exception as e:
            logger.error(f"❌ Failed to initialize session manager: {e}")
            return False

    async def create_session(
        self,
        user_id: str,
        jti: str,
        device_info: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> SessionInfo:
        """Create new session with automatic cleanup of oldest sessions if limit exceeded"""
        if not self.redis_client:
            raise RuntimeError("Session manager not initialized")

        session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        expires_at = now + self.session_timeout

        session_info = SessionInfo(
            session_id=session_id,
            user_id=user_id,
            jti=jti,
            created_at=now,
            last_activity=now,
            device_info=device_info,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at
        )

        # Store session
        session_key = f"{self.session_prefix}{session_id}"
        await self.redis_client.setex(
            session_key,
            int(self.session_timeout.total_seconds()),
            json.dumps(session_info.to_dict())
        )

        # Track session for user
        user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
        await self.redis_client.zadd(
            user_sessions_key,
            {session_id: now.timestamp()}
        )

        # Enforce session limit
        await self._enforce_session_limit(user_id)

        logger.info(f"✅ Session created for user {user_id}: {session_id}")
        return session_info

    async def get_session(self, session_id: str) -> Optional[SessionInfo]:
        """Get session by ID"""
        if not self.redis_client:
            return None

        session_key = f"{self.session_prefix}{session_id}"
        session_data = await self.redis_client.get(session_key)

        if not session_data:
            return None

        try:
            return SessionInfo.from_dict(json.loads(session_data))
        except (json.JSONDecodeError, TypeError, ValueError) as e:
            logger.warning(f"Invalid session data for {session_id}: {e}")
            return None

    async def update_session_activity(self, session_id: str) -> bool:
        """Update last activity timestamp for session"""
        if not self.redis_client:
            return False

        session_info = await self.get_session(session_id)
        if not session_info:
            return False

        session_info.last_activity = datetime.now(timezone.utc)

        session_key = f"{self.session_prefix}{session_id}"
        await self.redis_client.setex(
            session_key,
            int(self.session_timeout.total_seconds()),
            json.dumps(session_info.to_dict())
        )

        return True

    async def invalidate_session(self, session_id: str) -> bool:
        """Invalidate a specific session and blacklist its JWT"""
        if not self.redis_client:
            return False

        session_info = await self.get_session(session_id)
        if not session_info:
            return False

        # Remove session
        session_key = f"{self.session_prefix}{session_id}"
        await self.redis_client.delete(session_key)

        # Remove from user sessions
        user_sessions_key = f"{self.user_sessions_prefix}{session_info.user_id}"
        await self.redis_client.zrem(user_sessions_key, session_id)

        # Blacklist the JWT
        await self.blacklist_jwt(session_info.jti)

        logger.info(f"🔒 Session invalidated: {session_id}")
        return True

    async def invalidate_all_user_sessions(self, user_id: str) -> int:
        """Invalidate all sessions for a user (logout all devices)"""
        if not self.redis_client:
            return 0

        user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
        session_ids = await self.redis_client.zrange(user_sessions_key, 0, -1)

        invalidated_count = 0
        for session_id in session_ids:
            if await self.invalidate_session(session_id):
                invalidated_count += 1

        logger.info(f"🔒 All sessions invalidated for user {user_id}: {invalidated_count}")
        return invalidated_count

    async def get_user_sessions(self, user_id: str) -> List[SessionInfo]:
        """Get all active sessions for a user"""
        if not self.redis_client:
            return []

        user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
        session_ids = await self.redis_client.zrange(user_sessions_key, 0, -1)

        sessions = []
        for session_id in session_ids:
            session_info = await self.get_session(session_id)
            if session_info:
                sessions.append(session_info)

        # Sort by last activity (most recent first)
        sessions.sort(key=lambda s: s.last_activity, reverse=True)
        return sessions

    async def blacklist_jwt(self, jti: str, expires_at: Optional[datetime] = None) -> bool:
        """Add JWT ID to blacklist"""
        if not self.redis_client:
            return False

        blacklist_key = f"{self.blacklist_prefix}{jti}"

        if expires_at:
            # Set expiry to match JWT expiry
            ttl = int((expires_at - datetime.now(timezone.utc)).total_seconds())
            if ttl > 0:
                await self.redis_client.setex(blacklist_key, ttl, "1")
            else:
                # Already expired, don't add to blacklist
                return True
        else:
            # Default expiry (24 hours)
            await self.redis_client.setex(blacklist_key, 86400, "1")

        logger.info(f"🚫 JWT blacklisted: {jti}")
        return True

    async def is_jwt_blacklisted(self, jti: str) -> bool:
        """Check if JWT ID is blacklisted"""
        if not self.redis_client:
            return False

        blacklist_key = f"{self.blacklist_prefix}{jti}"
        exists = await self.redis_client.exists(blacklist_key)
        return bool(exists)

    async def _enforce_session_limit(self, user_id: str) -> None:
        """Enforce maximum sessions per user by removing oldest sessions"""
        if not self.redis_client:
            return

        user_sessions_key = f"{self.user_sessions_prefix}{user_id}"
        session_count = await self.redis_client.zcard(user_sessions_key)

        if session_count > self.max_sessions_per_user:
            # Remove oldest sessions
            sessions_to_remove = session_count - self.max_sessions_per_user
            oldest_sessions = await self.redis_client.zrange(
                user_sessions_key, 0, sessions_to_remove - 1
            )

            for session_id in oldest_sessions:
                await self.invalidate_session(session_id)
                logger.info(f"🔄 Removed oldest session for user {user_id}: {session_id}")

    async def _schedule_cleanup_if_needed(self) -> None:
        """Schedule cleanup of expired sessions if not done recently"""
        if not self.redis_client:
            return

        last_cleanup = await self.redis_client.get(self.cleanup_key)
        now = datetime.now(timezone.utc)

        if not last_cleanup:
            await self._cleanup_expired_sessions()
        else:
            last_cleanup_time = datetime.fromisoformat(last_cleanup)
            if now - last_cleanup_time > self.cleanup_interval:
                await self._cleanup_expired_sessions()

    async def _cleanup_expired_sessions(self) -> None:
        """Clean up expired sessions and blacklisted JWTs"""
        if not self.redis_client:
            return

        try:
            now = datetime.now(timezone.utc)

            # Find all user session keys
            user_session_keys = await self.redis_client.keys(f"{self.user_sessions_prefix}*")

            cleaned_sessions = 0
            for user_sessions_key in user_session_keys:
                # Get all sessions for this user
                session_ids = await self.redis_client.zrange(user_sessions_key, 0, -1)

                for session_id in session_ids:
                    session_info = await self.get_session(session_id)

                    # If session doesn't exist or is expired, remove it
                    if not session_info or (
                        session_info.expires_at and session_info.expires_at < now
                    ):
                        await self.redis_client.zrem(user_sessions_key, session_id)
                        cleaned_sessions += 1

                # Remove empty user session sets
                if await self.redis_client.zcard(user_sessions_key) == 0:
                    await self.redis_client.delete(user_sessions_key)

            # Update cleanup timestamp
            await self.redis_client.setex(
                self.cleanup_key,
                86400,  # Store for 24 hours
                now.isoformat()
            )

            logger.info(f"🧹 Session cleanup completed: {cleaned_sessions} expired sessions removed")

        except Exception as e:
            logger.error(f"❌ Session cleanup error: {e}")

    async def get_session_stats(self) -> Dict[str, Any]:
        """Get session statistics for monitoring"""
        if not self.redis_client:
            return {}

        try:
            # Count total sessions
            session_keys = await self.redis_client.keys(f"{self.session_prefix}*")
            total_sessions = len(session_keys)

            # Count users with sessions
            user_session_keys = await self.redis_client.keys(f"{self.user_sessions_prefix}*")
            active_users = len(user_session_keys)

            # Count blacklisted tokens
            blacklist_keys = await self.redis_client.keys(f"{self.blacklist_prefix}*")
            blacklisted_tokens = len(blacklist_keys)

            return {
                "total_sessions": total_sessions,
                "active_users": active_users,
                "blacklisted_tokens": blacklisted_tokens,
                "max_sessions_per_user": self.max_sessions_per_user,
                "session_timeout_hours": self.session_timeout.total_seconds() / 3600,
                "redis_connected": True
            }

        except Exception as e:
            logger.error(f"❌ Error getting session stats: {e}")
            return {"redis_connected": False, "error": str(e)}

# Global session manager instance
_session_manager: Optional[SecureSessionManager] = None

async def get_session_manager() -> SecureSessionManager:
    """Get or create session manager instance"""
    global _session_manager

    if _session_manager is None:
        _session_manager = SecureSessionManager()
        await _session_manager.initialize()

    return _session_manager