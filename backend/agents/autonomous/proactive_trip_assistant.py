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
from .pattern_learning import TripPatternAnalyzer
from .tiered_autonomy import AutonomyManager
from .pam_conversation_bridge import PamConversationBridge

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

        # Pattern learning system
        self.pattern_analyzer = TripPatternAnalyzer()

        # Tiered autonomy system
        self.autonomy_manager = AutonomyManager()

        # Memory-keeper tools (will be set by dependency injection or mocking)
        self.mcp__memory_keeper__context_save = None
        self.mcp__memory_keeper__context_search = None

        # PAM bridge for conversation initiation
        self.pam_bridge = PamConversationBridge()

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

    async def analyze_user_patterns(self, user_id: str, trip_data: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Analyze user travel patterns and update profile

        Args:
            user_id: User identifier
            trip_data: Optional trip data (if None, will be loaded from memory)

        Returns:
            Analysis results
        """
        try:
            # If no trip data provided, try to load from memory
            if trip_data is None:
                # In full implementation, this would fetch from database
                # For minimal implementation, return empty analysis
                trip_data = []

            # Analyze patterns
            patterns = await self.pattern_analyzer.analyze_trip_patterns(trip_data)

            # Generate user profile
            user_profile = await self.pattern_analyzer.generate_user_profile(user_id, trip_data)

            # Save patterns to memory
            if patterns and user_profile:
                pattern_data = {
                    'user_id': user_id,
                    'patterns': patterns,
                    'profile': user_profile,
                    'last_analyzed': datetime.now().isoformat()
                }
                await self.pattern_analyzer.save_learned_patterns(pattern_data)

            return {
                'patterns': patterns,
                'profile': user_profile,
                'analysis_timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to analyze user patterns: {e}")
            return {
                'patterns': {},
                'profile': {},
                'error': str(e)
            }

    async def execute_proactive_action(self, action_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a proactive action using tiered autonomy controls

        Args:
            action_data: Action data including type, cost, impact, description

        Returns:
            Execution result with autonomy information
        """
        try:
            # Execute through autonomy manager
            result = await self.autonomy_manager.execute_autonomous_action(action_data)

            # Log the result
            action_name = action_data.get('action', 'unknown')
            autonomy_level = result.get('autonomy_level', 'unknown')

            if result.get('executed'):
                self.logger.info(f"✅ Executed {autonomy_level} action: {action_name}")
            elif result.get('requires_approval'):
                self.logger.info(f"⏳ Action requires approval: {action_name}")
            else:
                reason = result.get('blocked_reason', 'unknown')
                self.logger.info(f"🚫 Action blocked: {action_name} - {reason}")

            return {
                'action': action_name,
                'timestamp': datetime.now().isoformat(),
                **result
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to execute proactive action: {e}")
            return {
                'action': action_data.get('action', 'unknown'),
                'executed': False,
                'success': False,
                'error': str(e)
            }

    async def suggest_trip_optimizations(self, user_id: str, trip_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate proactive trip optimization suggestions with autonomy controls

        Args:
            user_id: User identifier
            trip_context: Current trip or planned trip context

        Returns:
            List of optimization suggestions with autonomy classifications
        """
        try:
            suggestions = []

            # Example proactive suggestions (would be more sophisticated in full implementation)
            potential_actions = [
                {
                    'action': 'send_weather_alert',
                    'cost': 0.0,
                    'impact': 'low',
                    'description': 'Send severe weather warning for planned route',
                    'priority': 'high'
                },
                {
                    'action': 'book_backup_campsite',
                    'cost': 35.0,
                    'impact': 'medium',
                    'description': 'Reserve backup campsite due to high demand',
                    'priority': 'medium'
                },
                {
                    'action': 'upgrade_rv_rental',
                    'cost': 120.0,
                    'impact': 'high',
                    'description': 'Upgrade to larger RV for comfort during extended trip',
                    'priority': 'low'
                }
            ]

            # Classify each action and prepare suggestions
            for action_data in potential_actions:
                classification = await self.autonomy_manager.classify_action(action_data)

                suggestion = {
                    **action_data,
                    'autonomy_level': classification['autonomy_level'],
                    'can_execute_automatically': classification['can_execute_immediately'],
                    'requires_approval': classification['requires_approval'],
                    'classification_reasoning': classification.get('reasoning', '')
                }

                suggestions.append(suggestion)

            return suggestions

        except Exception as e:
            self.logger.error(f"❌ Failed to suggest trip optimizations: {e}")
            return []

    async def send_proactive_notification(self, user_id: str, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send proactive notification to user via PAM

        Args:
            user_id: User identifier
            notification_data: Notification data including type, message, context

        Returns:
            Notification result
        """
        try:
            notification_type = notification_data.get('type', 'general')

            if notification_type == 'weather_alert':
                # Format weather alert and send via PAM
                conversation_data = {
                    'user_id': user_id,
                    'topic': 'weather_alert',
                    'context': notification_data.get('context', {}),
                    'suggested_actions': notification_data.get('suggested_actions', [])
                }

                result = await self.pam_bridge.initiate_proactive_conversation(conversation_data)

            elif notification_type == 'fuel_savings':
                # Format fuel savings notification
                conversation_data = {
                    'user_id': user_id,
                    'topic': 'fuel_savings',
                    'context': notification_data.get('context', {}),
                    'suggested_actions': ['Stop for fuel']
                }

                result = await self.pam_bridge.initiate_proactive_conversation(conversation_data)

            elif notification_type == 'campground_deal':
                # Send campground deal suggestion
                suggestion_data = {
                    'user_id': user_id,
                    'suggestion_type': 'campground_booking',
                    'title': notification_data.get('title', 'Great deal found'),
                    'description': notification_data.get('description', ''),
                    'action_url': notification_data.get('action_url', ''),
                    'expires_at': notification_data.get('expires_at', '')
                }

                result = await self.pam_bridge.send_proactive_suggestion(suggestion_data)

            else:
                # Generic notification
                conversation_data = {
                    'user_id': user_id,
                    'topic': notification_type,
                    'context': notification_data.get('context', {}),
                    'message': notification_data.get('message', '')
                }

                result = await self.pam_bridge.initiate_proactive_conversation(conversation_data)

            self.logger.info(f"📱 Sent {notification_type} notification to {user_id}")

            return {
                'notification_sent': True,
                'type': notification_type,
                'user_id': user_id,
                'result': result
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to send proactive notification: {e}")
            return {
                'notification_sent': False,
                'error': str(e)
            }

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