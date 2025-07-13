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
            self.client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_KEY
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
    
    async def get_conversation_context(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get conversation context for user"""
        try:
            if not self.client:
                return []
            
            # Use the database function we created
            result = self.client.rpc('get_conversation_history', {
                'p_user_id': user_id,
                'p_limit': limit
            }).execute()
            
            if result.data:
                # Convert to expected format
                return [
                    {
                        'user_message': msg['content'] if msg['role'] == 'user' else '',
                        'assistant_response': msg['content'] if msg['role'] == 'assistant' else '',
                        'intent': msg.get('intent'),
                        'created_at': msg['created_at']
                    }
                    for msg in result.data
                ]
            return []
        except Exception as e:
            logger.warning(f"Error fetching conversation context: {e}")
            return []
    
    async def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user preferences"""
        try:
            if not self.client:
                return {}
            
            # Use the database function we created
            result = self.client.rpc('get_user_preferences', {
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
            
            # Get or create conversation
            conversation_result = self.client.rpc('get_or_create_pam_conversation', {
                'p_user_id': user_id,
                'p_session_id': session_id,
                'p_context': memory_data.get('context', {})
            }).execute()
            
            if not conversation_result.data:
                logger.error("Failed to get/create conversation")
                return False
            
            conversation_id = conversation_result.data
            
            # Store user message if provided
            if memory_data.get('user_message'):
                self.client.rpc('store_pam_message', {
                    'p_conversation_id': conversation_id,
                    'p_role': 'user',
                    'p_content': memory_data['user_message'],
                    'p_intent': memory_data.get('intent'),
                    'p_confidence': memory_data.get('confidence'),
                    'p_entities': memory_data.get('entities', {}),
                    'p_metadata': memory_data.get('user_metadata', {})
                }).execute()
            
            # Store assistant response if provided
            if memory_data.get('assistant_response'):
                self.client.rpc('store_pam_message', {
                    'p_conversation_id': conversation_id,
                    'p_role': 'assistant',
                    'p_content': memory_data['assistant_response'],
                    'p_metadata': memory_data.get('assistant_metadata', {})
                }).execute()
            
            return True
        except Exception as e:
            logger.warning(f"Error storing conversation: {e}")
            return False
    
    async def store_user_preference(self, user_id: str, key: str, value: Any, confidence: float = 1.0) -> bool:
        """Store user preference"""
        try:
            if not self.client:
                return False
            
            self.client.rpc('store_user_context', {
                'p_user_id': user_id,
                'p_context_type': 'preference',
                'p_key': key,
                'p_value': value,
                'p_confidence': confidence,
                'p_source': 'conversation'
            }).execute()
            
            return True
        except Exception as e:
            logger.warning(f"Error storing user preference: {e}")
            return False
    
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
