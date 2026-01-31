import pytest
from unittest.mock import Mock, AsyncMock, patch
from agents.autonomous.pam_conversation_bridge import PamConversationBridge, PamNotificationBridge

class TestPamConversationBridge:
    @pytest.fixture
    def pam_bridge(self):
        return PamConversationBridge()

    def test_pam_bridge_initialization(self, pam_bridge):
        """Test PAM bridge initializes with correct configuration"""
        assert pam_bridge.pam_service_url is not None
        assert pam_bridge.max_retries == 3
        assert pam_bridge.timeout == 30
        assert pam_bridge.conversation_templates is not None

    @pytest.mark.asyncio
    async def test_initiate_proactive_conversation(self, pam_bridge):
        """Test initiating proactive conversation with PAM"""
        conversation_data = {
            'user_id': 'test-user',
            'topic': 'weather_alert',
            'context': {
                'warning': 'Severe thunderstorm warning',
                'location': 'Yellowstone',
                'recommendation': 'Delay departure by 2 hours'
            },
            'suggested_actions': [
                'Delay departure until weather clears',
                'Find covered parking for RV'
            ]
        }

        # Mock PAM service call
        pam_bridge.send_to_pam_service = AsyncMock(return_value={
            'conversation_id': 'conv-123',
            'status': 'initiated',
            'message_sent': True
        })

        result = await pam_bridge.initiate_proactive_conversation(conversation_data)

        assert result['conversation_initiated'] is True
        assert result['conversation_id'] == 'conv-123'
        pam_bridge.send_to_pam_service.assert_called_once()

    @pytest.mark.asyncio
    async def test_format_trip_optimization_message(self, pam_bridge):
        """Test formatting trip optimization messages"""
        optimization_data = {
            'type': 'fuel_savings',
            'opportunity': 'Cheap fuel 5 miles ahead',
            'savings': 15.50,
            'action_required': 'Stop at Shell station on Exit 42'
        }

        message = await pam_bridge.format_trip_optimization_message(optimization_data)

        assert 'fuel' in message.lower()
        assert '15.50' in message or '$15.5' in message
        assert 'shell' in message.lower()


class TestPamNotificationBridge:
    @pytest.fixture
    def notification_bridge(self):
        return PamNotificationBridge()

    def test_notification_bridge_initialization(self, notification_bridge):
        """Test notification bridge initializes correctly"""
        assert notification_bridge.delivery_metrics is not None
        assert notification_bridge.notification_queue is not None
        assert notification_bridge.batch_size == 10

    @pytest.mark.asyncio
    async def test_send_system_alert(self, notification_bridge):
        """Test sending system alerts through PAM"""
        alert_data = {
            'component': 'memory',
            'severity': 'critical',
            'message': 'Memory usage at 95%',
            'action_taken': 'cleanup_disk_space'
        }

        # Mock notification delivery
        notification_bridge.deliver_notification = AsyncMock(return_value={
            'delivered': True,
            'notification_id': 'notif-789'
        })

        result = await notification_bridge.send_system_alert(**alert_data)

        assert result['delivered'] is True
        notification_bridge.deliver_notification.assert_called_once()

    def test_get_delivery_metrics(self, notification_bridge):
        """Test getting delivery metrics"""
        metrics = notification_bridge.get_delivery_metrics()

        assert 'total_sent' in metrics
        assert 'successful_deliveries' in metrics
        assert 'failed_deliveries' in metrics
        assert 'success_rate' in metrics
        assert 'pam_available' in metrics