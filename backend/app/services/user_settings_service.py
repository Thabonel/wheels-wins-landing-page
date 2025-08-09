"""
User Settings Service
Handles all user settings operations through backend API
"""
from typing import Dict, Any, Optional
from app.services.database import database_service
from app.core.logging import get_logger

logger = get_logger(__name__)

class UserSettingsService:
    """Service for managing user settings"""

    async def get_user_settings(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user settings by user ID"""
        try:
            if not database_service.client:
                raise Exception("Database not initialized")

            response = database_service.client.table('user_settings').select('*').eq('user_id', user_id).single().execute()
            
            if response.data:
                return response.data
            else:
                # Return default settings if none exist
                return await self.create_default_settings(user_id)
                
        except Exception as e:
            logger.error(f"Error getting user settings for {user_id}: {e}")
            return None

    async def create_default_settings(self, user_id: str) -> Dict[str, Any]:
        """Create default settings for a new user"""
        default_settings = {
            'user_id': user_id,
            'notification_preferences': {
                'email_notifications': True,
                'push_notifications': True,
                'marketing_emails': False,
                'trip_reminders': True,
                'maintenance_alerts': True,
                'weather_warnings': True
            },
            'privacy_preferences': {
                'profile_visibility': 'public',
                'location_sharing': True,
                'activity_tracking': True,
                'data_collection': True
            },
            'display_preferences': {
                'theme': 'system',
                'font_size': 'medium',
                'language': 'en',
                'high_contrast': False,
                'reduced_motion': False
            },
            'regional_preferences': {
                'currency': 'USD',
                'units': 'imperial',
                'timezone': 'America/New_York',
                'date_format': 'MM/DD/YYYY'
            },
            'pam_preferences': {
                'voice_enabled': True,
                'proactive_suggestions': True,
                'response_style': 'balanced',
                'expertise_level': 'intermediate',
                'knowledge_sources': True
            },
            'integration_preferences': {
                'shop_travel_integration': True,
                'auto_add_purchases_to_storage': False
            }
        }

        try:
            if not database_service.client:
                raise Exception("Database not initialized")

            response = database_service.client.table('user_settings').insert(default_settings).select().single().execute()
            
            if response.data:
                return response.data
            else:
                raise Exception("Failed to create default settings")
                
        except Exception as e:
            logger.error(f"Error creating default settings for {user_id}: {e}")
            return default_settings  # Return defaults even if DB insert fails

    async def update_user_settings(self, user_id: str, settings_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user settings"""
        try:
            if not database_service.client:
                raise Exception("Database not initialized")

            # First check if settings exist
            existing = await self.get_user_settings(user_id)
            if not existing:
                # Create new settings with provided data
                settings_data['user_id'] = user_id
                return await self.create_default_settings(user_id)

            # Update existing settings
            response = database_service.client.table('user_settings').update(settings_data).eq('user_id', user_id).select().single().execute()
            
            if response.data:
                return response.data
            else:
                raise Exception("Failed to update settings")
                
        except Exception as e:
            logger.error(f"Error updating user settings for {user_id}: {e}")
            return None

# Global instance
user_settings_service = UserSettingsService()