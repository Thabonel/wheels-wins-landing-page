"""
User Location Service for PAM 2.0
Retrieves user location information from user settings and provides it to PAM conversations
"""

import logging
from typing import Optional, Dict, Any
from app.integrations.supabase.client import supabase

logger = logging.getLogger(__name__)


class UserLocationService:
    """Service to get user location context for PAM conversations"""

    @staticmethod
    async def get_user_location_context(user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user location context from their settings

        Args:
            user_id: User identifier

        Returns:
            Location context dict or None if not available
        """
        try:
            logger.debug(f"Getting location context for user {user_id}")

            # Get user settings from Supabase
            response = supabase.table('user_settings').select('location_preferences').eq('user_id', user_id).single().execute()

            if not response.data or not response.data.get('location_preferences'):
                logger.debug(f"No location preferences found for user {user_id}")
                return None

            location_prefs = response.data['location_preferences']
            default_location = location_prefs.get('default_location')

            if not default_location:
                logger.debug(f"No default location set for user {user_id}")
                return None

            # Format location context for Gemini
            location_context = {}

            if default_location.get('city') and default_location.get('state'):
                location_context['location_name'] = f"{default_location['city']}, {default_location['state']}"
            elif default_location.get('city'):
                location_context['location_name'] = default_location['city']

            if default_location.get('latitude') and default_location.get('longitude'):
                location_context['coordinates'] = {
                    'latitude': default_location['latitude'],
                    'longitude': default_location['longitude']
                }

            if default_location.get('country'):
                location_context['country'] = default_location['country']

            if location_context:
                logger.info(f"Found location context for user {user_id}: {location_context.get('location_name', 'coordinates only')}")
                return location_context
            else:
                logger.debug(f"Location preferences exist but no usable location data for user {user_id}")
                return None

        except Exception as e:
            logger.error(f"Error getting location context for user {user_id}: {e}")
            return None

    @staticmethod
    def format_location_for_gemini(location_context: Dict[str, Any]) -> str:
        """
        Format location context as a string for inclusion in Gemini system prompt

        Args:
            location_context: Location context dictionary

        Returns:
            Formatted location string for Gemini
        """
        if not location_context:
            return ""

        parts = []

        if location_context.get('location_name'):
            parts.append(f"User's location: {location_context['location_name']}")

        if location_context.get('country'):
            parts.append(f"Country: {location_context['country']}")

        if location_context.get('coordinates'):
            coords = location_context['coordinates']
            parts.append(f"Coordinates: {coords['latitude']}, {coords['longitude']}")

        location_str = ". ".join(parts)

        if location_str:
            return f"\n\nUser Location Context: {location_str}. Use this information when providing weather updates, local recommendations, or location-specific advice. The user does not need to specify their location for weather queries."

        return ""