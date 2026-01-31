"""
PAM Proactive Trip Assistant - Core Monitoring Foundation
Autonomous agent that monitors travel patterns and proactively initiates trip optimization conversations.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from app.core.logging import get_logger
from .external_api_client import ExternalApiClient

logger = get_logger(__name__)


class ProactiveTripAssistant:
    """
    Proactive Trip Assistant that monitors user calendar, location, and travel patterns
    to autonomously initiate helpful trip planning conversations and optimization.
    """

    def __init__(self):
        """
        Initialize Proactive Trip Assistant
        """
        self.logger = logger

        # Monitoring intervals
        self.monitoring_interval = 300  # 5 minutes general monitoring
        self.calendar_check_interval = 3600  # 1 hour for calendar events
        self.location_check_interval = 600  # 10 minutes for location changes

        # Location tracking
        self.last_known_location = None

        # External API client
        self.external_api_client = ExternalApiClient()

        # Memory-keeper tools (will be set by dependency injection or mocking)
        self.mcp__memory_keeper__context_save = None
        self.mcp__memory_keeper__context_search = None

        # PAM bridge for conversation initiation (will be initialized lazily)
        self.pam_bridge = None

    async def detect_calendar_travel_events(self) -> List[Dict[str, Any]]:
        """
        Detect travel events from calendar data

        Returns:
            List of detected travel events
        """
        try:
            # Get calendar events (this will be implemented in Task 2)
            events = await self.fetch_calendar_events()

            travel_events = []
            travel_keywords = ['trip', 'travel', 'vacation', 'road', 'camping', 'rv', 'national park']

            for event in events:
                summary = event.get('summary', '').lower()
                location = event.get('location', '')

                # Check if event contains travel indicators
                if any(keyword in summary for keyword in travel_keywords) or location:
                    travel_events.append(event)

            return travel_events

        except Exception as e:
            self.logger.error(f"❌ Failed to detect calendar travel events: {e}")
            return []

    async def detect_location_changes(self) -> bool:
        """
        Detect significant location changes indicating travel

        Returns:
            True if location change detected, False otherwise
        """
        try:
            current_location = await self.get_current_location()

            if not self.last_known_location or not current_location:
                if current_location:
                    self.last_known_location = current_location
                return False

            # Calculate distance between locations (simplified)
            lat_diff = abs(current_location['lat'] - self.last_known_location['lat'])
            lng_diff = abs(current_location['lng'] - self.last_known_location['lng'])

            # Consider significant if moved more than ~10 miles (rough approximation)
            significant_change = lat_diff > 0.1 or lng_diff > 0.1

            if significant_change:
                self.last_known_location = current_location
                return True

            return False

        except Exception as e:
            self.logger.error(f"❌ Failed to detect location changes: {e}")
            return False

    async def fetch_calendar_events(self) -> List[Dict[str, Any]]:
        """
        Fetch calendar events from user's calendar

        Returns:
            List of calendar events
        """
        # This will be implemented in Task 2 with actual calendar API integration
        # For now, return empty list for minimal implementation
        return []

    async def get_current_location(self) -> Optional[Dict[str, float]]:
        """
        Get current location from device/GPS

        Returns:
            Current location as {'lat': float, 'lng': float} or None
        """
        # This will be implemented in Task 2 with actual location services
        # For now, return None for minimal implementation
        return None

    async def check_external_apis(self) -> Dict[str, Any]:
        """
        Check external APIs for travel-related data

        Returns:
            Dictionary of external API data
        """
        try:
            # If we have a current location, fetch relevant data
            if self.last_known_location:
                location = self.last_known_location

                # Gather fuel, weather, and RV park data
                fuel_data = await self.external_api_client.get_fuel_prices(location)
                weather_data = await self.external_api_client.get_weather_data(location)

                # For RV parks, use sample dates (would be dynamic in full implementation)
                check_in = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
                check_out = (datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d')
                rv_parks_data = await self.external_api_client.get_rv_parks(location, check_in, check_out)

                return {
                    'fuel_prices': fuel_data,
                    'weather': weather_data,
                    'rv_parks': rv_parks_data
                }

            return {}

        except Exception as e:
            self.logger.error(f"❌ Failed to check external APIs: {e}")
            return {'error': str(e)}

    async def run_monitoring_cycle(self) -> Dict[str, Any]:
        """
        Run a single monitoring cycle: calendar → location → external APIs

        Returns:
            Monitoring cycle results
        """
        cycle_start = datetime.now()

        try:
            # Check calendar for travel events
            calendar_events = await self.detect_calendar_travel_events()

            # Check for location changes
            location_changed = await self.detect_location_changes()

            # Check external APIs
            external_data = await self.check_external_apis()

            return {
                'calendar_events': calendar_events,
                'location_changed': location_changed,
                'external_data': external_data,
                'timestamp': cycle_start.isoformat()
            }

        except Exception as e:
            self.logger.error(f"❌ Monitoring cycle failed: {e}")
            return {
                'calendar_events': [],
                'location_changed': False,
                'external_data': {},
                'timestamp': cycle_start.isoformat(),
                'error': str(e)
            }