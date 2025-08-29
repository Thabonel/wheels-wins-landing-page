"""
Context Store Module
Unified context management for user profiles, preferences, and conversation state.
Provides consistent context handling across all PAM orchestrators.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import json

logger = logging.getLogger(__name__)


class ContextScope(Enum):
    """Scope levels for context storage"""
    SESSION = "session"           # Current conversation session
    USER = "user"                # User profile and preferences
    GLOBAL = "global"            # Application-wide context
    TEMPORARY = "temporary"       # Short-term context (expires)


@dataclass
class ContextEntry:
    """Individual context entry with metadata"""
    key: str
    value: Any
    scope: ContextScope
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None
    metadata: Dict[str, Any] = None
    
    def is_expired(self) -> bool:
        """Check if this context entry has expired"""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        data = asdict(self)
        # Convert datetime objects to ISO strings
        data["created_at"] = self.created_at.isoformat()
        data["updated_at"] = self.updated_at.isoformat()
        if self.expires_at:
            data["expires_at"] = self.expires_at.isoformat()
        data["scope"] = self.scope.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ContextEntry":
        """Create from dictionary"""
        return cls(
            key=data["key"],
            value=data["value"],
            scope=ContextScope(data["scope"]),
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
            expires_at=datetime.fromisoformat(data["expires_at"]) if data.get("expires_at") else None,
            metadata=data.get("metadata")
        )


class ContextStore:
    """
    Unified context management system for PAM orchestrators.
    
    This store provides consistent context handling across different orchestrators,
    ensuring that user preferences, conversation state, and application context
    are managed uniformly throughout the system.
    """
    
    def __init__(self, redis_client=None, database_service=None):
        self.redis_client = redis_client
        self.database_service = database_service
        self.memory_store = {}  # In-memory fallback
        self.context_schemas = self._initialize_schemas()
        
    def _initialize_schemas(self) -> Dict[str, Dict[str, Any]]:
        """Initialize context schemas for validation"""
        return {
            "user_profile": {
                "type": "object",
                "scope": ContextScope.USER,
                "required": ["user_id", "created_at"],
                "properties": {
                    "user_id": {"type": "string"},
                    "display_name": {"type": "string"},
                    "email": {"type": "string"},
                    "experience_level": {"type": "string", "enum": ["beginner", "intermediate", "expert"]},
                    "age_group": {"type": "string", "enum": ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]},
                    "tech_comfort": {"type": "string", "enum": ["low", "medium", "high"]},
                    "travel_frequency": {"type": "string", "enum": ["occasional", "frequent", "seasonal", "full-time"]},
                    "vehicle_info": {"type": "object"},
                    "preferences": {"type": "object"},
                    "created_at": {"type": "string"},
                    "updated_at": {"type": "string"}
                }
            },
            
            "conversation_state": {
                "type": "object", 
                "scope": ContextScope.SESSION,
                "properties": {
                    "session_id": {"type": "string"},
                    "user_id": {"type": "string"},
                    "current_intent": {"type": "string"},
                    "conversation_history": {"type": "array"},
                    "extracted_entities": {"type": "object"},
                    "pending_actions": {"type": "array"},
                    "context_memory": {"type": "object"},
                    "last_interaction": {"type": "string"}
                }
            },
            
            "user_preferences": {
                "type": "object",
                "scope": ContextScope.USER,
                "properties": {
                    "communication_style": {"type": "string", "enum": ["brief", "detailed", "adaptive"]},
                    "voice_enabled": {"type": "boolean"},
                    "preferred_voice": {"type": "string"},
                    "notification_preferences": {"type": "object"},
                    "privacy_settings": {"type": "object"},
                    "feature_flags": {"type": "object"},
                    "ui_preferences": {"type": "object"}
                }
            },
            
            "trip_context": {
                "type": "object",
                "scope": ContextScope.SESSION,
                "properties": {
                    "current_location": {"type": "object"},
                    "destination": {"type": "object"},
                    "travel_dates": {"type": "object"},
                    "trip_type": {"type": "string"},
                    "companions": {"type": "array"},
                    "budget_info": {"type": "object"},
                    "vehicle_status": {"type": "object"},
                    "route_preferences": {"type": "object"}
                }
            }
        }
    
    async def set_context(
        self,
        user_id: str,
        key: str,
        value: Any,
        scope: ContextScope = ContextScope.SESSION,
        expires_in_minutes: Optional[int] = None,
        metadata: Dict[str, Any] = None
    ) -> bool:
        """
        Set a context value.
        
        Args:
            user_id: User identifier
            key: Context key
            value: Context value
            scope: Context scope (session, user, global, temporary)
            expires_in_minutes: Optional expiration time in minutes
            metadata: Optional metadata for the context entry
            
        Returns:
            True if successful, False otherwise
        """
        try:
            now = datetime.utcnow()
            expires_at = None
            
            if expires_in_minutes:
                expires_at = now + timedelta(minutes=expires_in_minutes)
            elif scope == ContextScope.TEMPORARY:
                # Default temporary context to 1 hour
                expires_at = now + timedelta(hours=1)
            
            # Create context entry
            entry = ContextEntry(
                key=key,
                value=value,
                scope=scope,
                created_at=now,
                updated_at=now,
                expires_at=expires_at,
                metadata=metadata or {}
            )
            
            # Validate if schema exists
            if key in self.context_schemas:
                if not self._validate_context(key, value):
                    logger.warning(f"Context validation failed for key: {key}")
                    return False
            
            # Store based on scope and available backends
            storage_key = self._build_storage_key(user_id, key, scope)
            
            if scope in [ContextScope.SESSION, ContextScope.TEMPORARY] and self.redis_client:
                # Use Redis for session/temporary data
                await self._store_in_redis(storage_key, entry)
            elif scope == ContextScope.USER and self.database_service:
                # Use database for persistent user data
                await self._store_in_database(user_id, entry)
            else:
                # Fallback to memory store
                self._store_in_memory(storage_key, entry)
            
            logger.debug(f"Set context: {storage_key} = {type(value).__name__}")
            return True
            
        except Exception as e:
            logger.error(f"Error setting context {key}: {e}")
            return False
    
    async def get_context(
        self,
        user_id: str,
        key: str,
        scope: ContextScope = ContextScope.SESSION,
        default: Any = None
    ) -> Any:
        """
        Get a context value.
        
        Args:
            user_id: User identifier
            key: Context key
            scope: Context scope
            default: Default value if not found
            
        Returns:
            Context value or default
        """
        try:
            storage_key = self._build_storage_key(user_id, key, scope)
            entry = None
            
            # Retrieve based on scope and available backends
            if scope in [ContextScope.SESSION, ContextScope.TEMPORARY] and self.redis_client:
                entry = await self._retrieve_from_redis(storage_key)
            elif scope == ContextScope.USER and self.database_service:
                entry = await self._retrieve_from_database(user_id, key)
            else:
                entry = self._retrieve_from_memory(storage_key)
            
            if entry is None:
                return default
            
            # Check expiration
            if entry.is_expired():
                await self.delete_context(user_id, key, scope)
                return default
            
            return entry.value
            
        except Exception as e:
            logger.error(f"Error getting context {key}: {e}")
            return default
    
    async def get_user_context(self, user_id: str) -> Dict[str, Any]:
        """
        Get comprehensive user context including profile, preferences, and current session.
        
        Args:
            user_id: User identifier
            
        Returns:
            Dictionary containing all user context
        """
        try:
            context = {
                "user_id": user_id,
                "retrieved_at": datetime.utcnow().isoformat()
            }
            
            # Get user profile
            profile = await self.get_context(user_id, "user_profile", ContextScope.USER)
            if profile:
                context["profile"] = profile
            
            # Get user preferences
            preferences = await self.get_context(user_id, "user_preferences", ContextScope.USER)
            if preferences:
                context["preferences"] = preferences
            
            # Get current session context
            session_keys = ["conversation_state", "trip_context", "current_intent", "extracted_entities"]
            for key in session_keys:
                value = await self.get_context(user_id, key, ContextScope.SESSION)
                if value is not None:
                    context[key] = value
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting user context for {user_id}: {e}")
            return {"user_id": user_id, "error": str(e)}
    
    async def update_context(
        self,
        user_id: str,
        key: str,
        updates: Dict[str, Any],
        scope: ContextScope = ContextScope.SESSION
    ) -> bool:
        """
        Update specific fields in a context object.
        
        Args:
            user_id: User identifier
            key: Context key
            updates: Dictionary of field updates
            scope: Context scope
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get current context
            current_value = await self.get_context(user_id, key, scope, {})
            
            if not isinstance(current_value, dict):
                logger.warning(f"Cannot update non-dict context: {key}")
                return False
            
            # Apply updates
            updated_value = current_value.copy()
            updated_value.update(updates)
            updated_value["updated_at"] = datetime.utcnow().isoformat()
            
            # Save updated context
            return await self.set_context(user_id, key, updated_value, scope)
            
        except Exception as e:
            logger.error(f"Error updating context {key}: {e}")
            return False
    
    async def delete_context(
        self,
        user_id: str,
        key: str,
        scope: ContextScope = ContextScope.SESSION
    ) -> bool:
        """Delete a context entry"""
        try:
            storage_key = self._build_storage_key(user_id, key, scope)
            
            if scope in [ContextScope.SESSION, ContextScope.TEMPORARY] and self.redis_client:
                await self.redis_client.delete(storage_key)
            elif scope == ContextScope.USER and self.database_service:
                # Delete from database
                await self._delete_from_database(user_id, key)
            else:
                self.memory_store.pop(storage_key, None)
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting context {key}: {e}")
            return False
    
    async def clear_user_session(self, user_id: str) -> bool:
        """Clear all session context for a user"""
        try:
            # Get all session keys for this user
            pattern = self._build_storage_key(user_id, "*", ContextScope.SESSION)
            
            if self.redis_client:
                keys = await self.redis_client.keys(pattern)
                if keys:
                    await self.redis_client.delete(*keys)
            
            # Clear from memory store
            to_delete = [k for k in self.memory_store.keys() if k.startswith(f"session:{user_id}:")]
            for key in to_delete:
                del self.memory_store[key]
            
            return True
            
        except Exception as e:
            logger.error(f"Error clearing session for {user_id}: {e}")
            return False
    
    async def cleanup_expired_context(self) -> int:
        """Clean up expired context entries"""
        cleaned_count = 0
        
        try:
            # Clean memory store
            expired_keys = []
            for key, entry in self.memory_store.items():
                if isinstance(entry, ContextEntry) and entry.is_expired():
                    expired_keys.append(key)
            
            for key in expired_keys:
                del self.memory_store[key]
                cleaned_count += 1
            
            # Note: Redis TTL handles expiration automatically
            # Database cleanup would need a separate scheduled task
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} expired context entries")
            
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error during context cleanup: {e}")
            return 0
    
    def _build_storage_key(self, user_id: str, key: str, scope: ContextScope) -> str:
        """Build storage key for context entry"""
        return f"{scope.value}:{user_id}:{key}"
    
    def _validate_context(self, key: str, value: Any) -> bool:
        """Validate context value against schema"""
        try:
            schema = self.context_schemas.get(key)
            if not schema:
                return True  # No schema = no validation
            
            # Basic type validation
            expected_type = schema.get("type")
            if expected_type == "object" and not isinstance(value, dict):
                return False
            elif expected_type == "array" and not isinstance(value, list):
                return False
            
            # Required fields validation for objects
            if expected_type == "object" and isinstance(value, dict):
                required = schema.get("required", [])
                for field in required:
                    if field not in value:
                        return False
            
            return True
            
        except Exception as e:
            logger.warning(f"Error validating context: {e}")
            return True  # Default to allow if validation fails
    
    async def _store_in_redis(self, key: str, entry: ContextEntry):
        """Store context entry in Redis"""
        data = json.dumps(entry.to_dict())
        
        if entry.expires_at:
            # Set with TTL
            ttl_seconds = int((entry.expires_at - datetime.utcnow()).total_seconds())
            await self.redis_client.setex(key, ttl_seconds, data)
        else:
            await self.redis_client.set(key, data)
    
    async def _retrieve_from_redis(self, key: str) -> Optional[ContextEntry]:
        """Retrieve context entry from Redis"""
        data = await self.redis_client.get(key)
        if data:
            return ContextEntry.from_dict(json.loads(data))
        return None
    
    async def _store_in_database(self, user_id: str, entry: ContextEntry):
        """Store context entry in database"""
        if not self.database_service:
            return
        
        # This would use the database service to store user context
        # Implementation depends on database schema
        context_data = {
            "user_id": user_id,
            "context_key": entry.key,
            "context_value": json.dumps(entry.value),
            "scope": entry.scope.value,
            "created_at": entry.created_at,
            "updated_at": entry.updated_at,
            "expires_at": entry.expires_at,
            "metadata": json.dumps(entry.metadata or {})
        }
        
        # Would call database service here
        # await self.database_service.upsert_user_context(context_data)
    
    async def _retrieve_from_database(self, user_id: str, key: str) -> Optional[ContextEntry]:
        """Retrieve context entry from database"""
        if not self.database_service:
            return None
        
        # Would retrieve from database service
        # data = await self.database_service.get_user_context(user_id, key)
        # if data:
        #     return ContextEntry.from_dict(data)
        return None
    
    async def _delete_from_database(self, user_id: str, key: str):
        """Delete context entry from database"""
        if not self.database_service:
            return
        
        # Would delete from database service
        # await self.database_service.delete_user_context(user_id, key)
    
    def _store_in_memory(self, key: str, entry: ContextEntry):
        """Store context entry in memory"""
        self.memory_store[key] = entry
    
    def _retrieve_from_memory(self, key: str) -> Optional[ContextEntry]:
        """Retrieve context entry from memory"""
        return self.memory_store.get(key)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get context store statistics"""
        memory_entries = len(self.memory_store)
        
        # Count by scope
        scope_counts = {}
        for entry in self.memory_store.values():
            if isinstance(entry, ContextEntry):
                scope = entry.scope.value
                scope_counts[scope] = scope_counts.get(scope, 0) + 1
        
        return {
            "memory_entries": memory_entries,
            "scope_distribution": scope_counts,
            "schemas_defined": len(self.context_schemas),
            "redis_available": self.redis_client is not None,
            "database_available": self.database_service is not None
        }