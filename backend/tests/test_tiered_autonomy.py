import pytest
from unittest.mock import Mock, AsyncMock, patch
from decimal import Decimal
from agents.autonomous.tiered_autonomy import AutonomyManager, ActionClassifier

class TestAutonomyManager:
    @pytest.fixture
    def autonomy_manager(self):
        return AutonomyManager()

    def test_autonomy_manager_initialization(self, autonomy_manager):
        """Test autonomy manager initializes with correct spending controls"""
        assert autonomy_manager.free_action_limit == 0.0
        assert autonomy_manager.notify_action_limit == 50.0
        assert autonomy_manager.approval_required_limit == 50.01
        assert autonomy_manager.daily_spending_limit == 200.0
        assert autonomy_manager.current_daily_spending == 0.0

    @pytest.mark.asyncio
    async def test_classify_action_free(self, autonomy_manager):
        """Test classification of free actions"""
        action_data = {
            'action': 'send_notification',
            'cost': 0.0,
            'impact': 'low',
            'description': 'Send weather alert to user'
        }

        classification = await autonomy_manager.classify_action(action_data)

        assert classification['autonomy_level'] == 'auto'
        assert classification['requires_approval'] is False
        assert classification['can_execute_immediately'] is True

    @pytest.mark.asyncio
    async def test_classify_action_notify(self, autonomy_manager):
        """Test classification of notify-level actions"""
        action_data = {
            'action': 'book_campsite',
            'cost': 25.0,
            'impact': 'medium',
            'description': 'Book campsite for upcoming trip'
        }

        classification = await autonomy_manager.classify_action(action_data)

        assert classification['autonomy_level'] == 'notify'
        assert classification['requires_approval'] is False
        assert classification['can_execute_immediately'] is True
        assert classification['notification_required'] is True

    @pytest.mark.asyncio
    async def test_classify_action_approval_required(self, autonomy_manager):
        """Test classification of approval-required actions"""
        action_data = {
            'action': 'book_rv_rental',
            'cost': 150.0,
            'impact': 'high',
            'description': 'Book RV rental for extended trip'
        }

        classification = await autonomy_manager.classify_action(action_data)

        assert classification['autonomy_level'] == 'approval'
        assert classification['requires_approval'] is True
        assert classification['can_execute_immediately'] is False

    @pytest.mark.asyncio
    async def test_check_spending_limits(self, autonomy_manager):
        """Test daily spending limit checks"""
        # Should pass under limit
        result = await autonomy_manager.check_spending_limits(50.0)
        assert result['within_limits'] is True

        # Should fail over limit
        result = await autonomy_manager.check_spending_limits(250.0)
        assert result['within_limits'] is False
        assert 'daily limit' in result['reason'].lower()

    @pytest.mark.asyncio
    async def test_execute_autonomous_action(self, autonomy_manager):
        """Test autonomous action execution with spending tracking"""
        action_data = {
            'action': 'send_fuel_alert',
            'cost': 0.0,
            'impact': 'low',
            'description': 'Notify about cheap gas nearby'
        }

        # Mock the actual action execution
        autonomy_manager.execute_action = AsyncMock(return_value={'success': True, 'result': 'Alert sent'})

        result = await autonomy_manager.execute_autonomous_action(action_data)

        assert result['executed'] is True
        assert result['autonomy_level'] == 'auto'
        assert result['success'] is True
        autonomy_manager.execute_action.assert_called_once()

    @pytest.mark.asyncio
    async def test_request_user_approval(self, autonomy_manager):
        """Test user approval request for high-cost actions"""
        action_data = {
            'action': 'book_premium_campsite',
            'cost': 85.0,
            'impact': 'high',
            'description': 'Book premium campsite with full hookups'
        }

        # Mock PAM bridge for approval request
        autonomy_manager.pam_bridge = AsyncMock()
        autonomy_manager.pam_bridge.request_user_approval = AsyncMock(return_value={
            'approval_granted': True,
            'user_response': 'approved'
        })

        approval = await autonomy_manager.request_user_approval(action_data)

        assert approval['approval_granted'] is True
        autonomy_manager.pam_bridge.request_user_approval.assert_called_once()


class TestActionClassifier:
    @pytest.fixture
    def action_classifier(self):
        return ActionClassifier()

    def test_action_classifier_initialization(self, action_classifier):
        """Test action classifier initializes with correct rules"""
        assert len(action_classifier.classification_rules) > 0
        assert 'notification_actions' in action_classifier.action_categories
        assert 'booking_actions' in action_classifier.action_categories
        assert 'research_actions' in action_classifier.action_categories

    def test_classify_by_cost(self, action_classifier):
        """Test classification based on cost thresholds"""
        # Free action
        result = action_classifier.classify_by_cost(0.0)
        assert result == 'auto'

        # Low-cost action
        result = action_classifier.classify_by_cost(15.0)
        assert result == 'notify'

        # High-cost action
        result = action_classifier.classify_by_cost(75.0)
        assert result == 'approval'

    def test_classify_by_impact(self, action_classifier):
        """Test classification based on impact level"""
        result = action_classifier.classify_by_impact('low')
        assert result == 'auto'

        result = action_classifier.classify_by_impact('medium')
        assert result == 'notify'

        result = action_classifier.classify_by_impact('high')
        assert result == 'approval'

    def test_classify_by_action_type(self, action_classifier):
        """Test classification based on action type"""
        # Notification action
        result = action_classifier.classify_by_action_type('send_weather_alert')
        assert result == 'auto'

        # Booking action
        result = action_classifier.classify_by_action_type('book_campsite')
        assert result == 'notify'

        # Financial action
        result = action_classifier.classify_by_action_type('purchase_equipment')
        assert result == 'approval'

    def test_determine_final_classification(self, action_classifier):
        """Test final classification logic with multiple factors"""
        action_data = {
            'action': 'book_campsite',
            'cost': 45.0,
            'impact': 'medium',
            'category': 'booking'
        }

        classification = action_classifier.determine_final_classification(action_data)

        # Should take the most restrictive classification
        assert classification['autonomy_level'] == 'notify'
        assert 'cost_classification' in classification
        assert 'impact_classification' in classification
        assert 'type_classification' in classification