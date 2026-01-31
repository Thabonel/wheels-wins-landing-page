"""
PAM Conversation Bridge for Trip Assistant
Handles proactive conversation initiation and notification delivery through PAM.
"""
import asyncio
import aiohttp
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.core.logging import get_logger

logger = get_logger(__name__)


class PamConversationBridge:
    """
    Bridge for initiating proactive conversations through PAM message bus
    """

    def __init__(self, pam_service_url: str = "http://localhost:8000"):
        """
        Initialize PAM Conversation Bridge

        Args:
            pam_service_url: URL of PAM service
        """
        self.logger = logger
        self.pam_service_url = pam_service_url
        self.max_retries = 3
        self.timeout = 30

        # Conversation templates
        self.conversation_templates = {
            'weather_alert': "🌦️ Weather Alert: {warning}\n\nLocation: {location}\n\nRecommendation: {recommendation}",
            'fuel_savings': "⛽ Fuel Savings Opportunity: {opportunity}\n\nEstimated savings: ${savings}\n\nAction: {action_required}",
            'campground_deal': "🏕️ Great Deal Found: {title}\n\n{description}\n\nExpires: {expires_at}",
            'route_optimization': "🗺️ Route Optimization: {optimization}\n\nTime saved: {time_saved}\n\nDetails: {details}"
        }

        self.session = None

    async def _get_session(self):
        """Get or create aiohttp session"""
        if not self.session:
            self.session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout))
        return self.session

    async def send_to_pam_service(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send data to PAM service

        Args:
            payload: Data to send to PAM

        Returns:
            PAM service response
        """
        try:
            session = await self._get_session()

            # For minimal implementation, return mock response
            # In full implementation, this would make actual HTTP request to PAM
            self.logger.debug(f"📤 Sending to PAM: {payload}")

            return {
                'conversation_id': f"conv-{datetime.now().timestamp()}",
                'status': 'initiated',
                'message_sent': True
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to send to PAM service: {e}")
            return {
                'conversation_id': None,
                'status': 'failed',
                'message_sent': False,
                'error': str(e)
            }

    async def initiate_proactive_conversation(self, conversation_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Initiate proactive conversation with PAM

        Args:
            conversation_data: Conversation data with user_id, topic, context, etc.

        Returns:
            Conversation initiation result
        """
        try:
            user_id = conversation_data.get('user_id')
            topic = conversation_data.get('topic')
            context = conversation_data.get('context', {})

            # Format the message based on topic
            if topic in self.conversation_templates:
                template = self.conversation_templates[topic]
                try:
                    message = template.format(**context)
                except KeyError as e:
                    # If template formatting fails, use a fallback message
                    self.logger.warning(f"Template formatting failed for {topic}: {e}")
                    message = f"Proactive {topic.replace('_', ' ')}: {context}"
            else:
                message = f"Proactive notification: {context}"

            # Prepare PAM payload
            pam_payload = {
                'user_id': user_id,
                'message_type': 'proactive',
                'topic': topic,
                'message': message,
                'context': context,
                'suggested_actions': conversation_data.get('suggested_actions', []),
                'timestamp': datetime.now().isoformat()
            }

            # Send to PAM service
            pam_response = await self.send_to_pam_service(pam_payload)

            self.logger.info(f"💬 Initiated conversation for {user_id}: {topic}")

            return {
                'conversation_initiated': pam_response.get('message_sent', False),
                'conversation_id': pam_response.get('conversation_id'),
                'topic': topic,
                'user_id': user_id
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to initiate conversation: {e}")
            return {
                'conversation_initiated': False,
                'conversation_id': None,
                'error': str(e)
            }

    async def format_trip_optimization_message(self, optimization_data: Dict[str, Any]) -> str:
        """
        Format trip optimization message

        Args:
            optimization_data: Optimization data

        Returns:
            Formatted message string
        """
        try:
            opt_type = optimization_data.get('type', 'general')
            opportunity = optimization_data.get('opportunity', '')
            savings = optimization_data.get('savings', 0)
            action = optimization_data.get('action_required', '')

            if opt_type == 'fuel_savings':
                return f"⛽ Fuel Savings: {opportunity}. Save ${savings:.2f}. Action: {action}"
            elif opt_type == 'route_optimization':
                return f"🗺️ Route Optimization: {opportunity}. {action}"
            else:
                return f"🚐 Trip Optimization: {opportunity}. {action}"

        except Exception as e:
            self.logger.error(f"❌ Failed to format optimization message: {e}")
            return "Trip optimization opportunity available"

    async def format_weather_alert_message(self, weather_data: Dict[str, Any]) -> str:
        """
        Format weather alert message

        Args:
            weather_data: Weather alert data

        Returns:
            Formatted message string
        """
        try:
            warning = weather_data.get('warning', 'Weather warning')
            location = weather_data.get('location', 'your area')
            recommendation = weather_data.get('recommendation', 'Stay safe')

            return f"🌦️ Weather Alert: {warning} in {location}. Recommendation: {recommendation}"

        except Exception as e:
            self.logger.error(f"❌ Failed to format weather message: {e}")
            return "Weather alert for your travel route"

    async def send_proactive_suggestion(self, suggestion_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send proactive suggestion to PAM

        Args:
            suggestion_data: Suggestion data

        Returns:
            Send result
        """
        try:
            # Prepare suggestion payload
            payload = {
                'type': 'suggestion',
                'user_id': suggestion_data.get('user_id'),
                'suggestion_type': suggestion_data.get('suggestion_type'),
                'title': suggestion_data.get('title'),
                'description': suggestion_data.get('description'),
                'action_url': suggestion_data.get('action_url'),
                'expires_at': suggestion_data.get('expires_at'),
                'timestamp': datetime.now().isoformat()
            }

            # Send to PAM
            response = await self.send_to_pam_service(payload)

            return {
                'suggestion_sent': response.get('message_sent', False),
                'message_id': response.get('conversation_id'),
                'status': response.get('status')
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to send suggestion: {e}")
            return {
                'suggestion_sent': False,
                'error': str(e)
            }

    async def handle_pam_response(self, pam_response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle response from PAM conversation

        Args:
            pam_response: Response from PAM

        Returns:
            Response processing result
        """
        try:
            response_type = pam_response.get('response_type')
            action_approved = pam_response.get('action_approved', False)

            self.logger.info(f"📥 Received PAM response: {response_type}")

            return {
                'response_processed': True,
                'response_type': response_type,
                'action_approved': action_approved,
                'conversation_id': pam_response.get('conversation_id'),
                'user_message': pam_response.get('user_message')
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to handle PAM response: {e}")
            return {
                'response_processed': False,
                'error': str(e)
            }

    async def close(self):
        """Close aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None


class PamNotificationBridge:
    """
    Bridge for sending notifications through PAM (used by technical monitoring)
    """

    def __init__(self):
        """
        Initialize PAM Notification Bridge
        """
        self.logger = logger
        self.batch_size = 10

        # Delivery metrics tracking
        self.delivery_metrics = {
            'total_sent': 0,
            'successful_deliveries': 0,
            'failed_deliveries': 0,
            'queued_notifications': 0
        }

        # Notification queue
        self.notification_queue = []

    async def deliver_notification(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Deliver notification through PAM

        Args:
            notification_data: Notification data

        Returns:
            Delivery result
        """
        try:
            # For minimal implementation, simulate delivery
            self.logger.debug(f"🔔 Delivering notification: {notification_data}")

            # Update metrics
            self.delivery_metrics['total_sent'] += 1
            self.delivery_metrics['successful_deliveries'] += 1

            return {
                'delivered': True,
                'notification_id': f"notif-{datetime.now().timestamp()}",
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to deliver notification: {e}")
            self.delivery_metrics['failed_deliveries'] += 1

            return {
                'delivered': False,
                'error': str(e)
            }

    async def send_system_alert(self, component: str, severity: str, message: str, action_taken: Optional[str] = None) -> Dict[str, Any]:
        """
        Send system alert through PAM

        Args:
            component: System component
            severity: Alert severity
            message: Alert message
            action_taken: Action taken (optional)

        Returns:
            Alert delivery result
        """
        try:
            notification_data = {
                'type': 'system_alert',
                'component': component,
                'severity': severity,
                'message': message,
                'action_taken': action_taken,
                'timestamp': datetime.now().isoformat()
            }

            return await self.deliver_notification(notification_data)

        except Exception as e:
            self.logger.error(f"❌ Failed to send system alert: {e}")
            return {
                'delivered': False,
                'error': str(e)
            }

    async def send_approval_request(self, approval_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send approval request through PAM

        Args:
            approval_data: Approval request data

        Returns:
            Approval result (mock for minimal implementation)
        """
        try:
            # For minimal implementation, return mock approval
            self.logger.info(f"🔐 Approval request: {approval_data}")

            return {
                'approval_granted': True,
                'user_response': 'approved'
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to send approval request: {e}")
            return {
                'approval_granted': False,
                'error': str(e)
            }

    async def request_user_approval(self, approval_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Request user approval through PAM

        Args:
            approval_data: Data requiring approval

        Returns:
            Approval result
        """
        return await self.send_approval_request(approval_data)

    async def send_remediation_result(self, action: str, success: bool, details: str, component: Optional[str] = None) -> Dict[str, Any]:
        """
        Send remediation result notification

        Args:
            action: Remediation action performed
            success: Whether action succeeded
            details: Result details
            component: Affected component

        Returns:
            Notification delivery result
        """
        try:
            notification_data = {
                'type': 'remediation_result',
                'action': action,
                'success': success,
                'details': details,
                'component': component,
                'timestamp': datetime.now().isoformat()
            }

            return await self.deliver_notification(notification_data)

        except Exception as e:
            self.logger.error(f"❌ Failed to send remediation result: {e}")
            return {
                'delivered': False,
                'error': str(e)
            }

    def get_delivery_metrics(self) -> Dict[str, Any]:
        """
        Get delivery metrics

        Returns:
            Current delivery metrics
        """
        metrics = self.delivery_metrics.copy()

        # Calculate success rate
        total_sent = metrics['total_sent']
        if total_sent > 0:
            metrics['success_rate'] = metrics['successful_deliveries'] / total_sent
        else:
            metrics['success_rate'] = 0.0

        metrics['pam_available'] = True
        return metrics