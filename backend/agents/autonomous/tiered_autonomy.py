"""
Tiered Autonomy System for Trip Assistant
Manages permission-based action execution with spending controls.
"""
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.core.logging import get_logger

logger = get_logger(__name__)


class ActionClassifier:
    """
    Classifies actions based on cost, impact, and type for autonomy decisions
    """

    def __init__(self):
        """
        Initialize Action Classifier
        """
        self.logger = logger

        # Classification rules
        self.classification_rules = {
            'cost_thresholds': {
                'free': 0.0,
                'low': 50.0,
                'high': float('inf')
            },
            'impact_levels': {
                'low': 'auto',
                'medium': 'notify',
                'high': 'approval'
            }
        }

        # Action categories
        self.action_categories = {
            'notification_actions': [
                'send_notification', 'send_alert', 'send_weather_alert',
                'send_fuel_alert', 'send_traffic_alert'
            ],
            'research_actions': [
                'search_destinations', 'check_weather', 'find_fuel_prices',
                'research_rv_parks', 'analyze_routes'
            ],
            'booking_actions': [
                'book_campsite', 'reserve_rv_park', 'book_activity',
                'make_reservation', 'schedule_service', 'book_backup_campsite'
            ],
            'financial_actions': [
                'purchase_equipment', 'book_rv_rental', 'pay_fees',
                'buy_supplies', 'make_payment', 'upgrade_rv_rental'
            ]
        }

    def classify_by_cost(self, cost: float) -> str:
        """
        Classify action based on cost

        Args:
            cost: Action cost in dollars

        Returns:
            Classification level
        """
        if cost <= self.classification_rules['cost_thresholds']['free']:
            return 'auto'
        elif cost <= self.classification_rules['cost_thresholds']['low']:
            return 'notify'
        else:
            return 'approval'

    def classify_by_impact(self, impact: str) -> str:
        """
        Classify action based on impact level

        Args:
            impact: Impact level (low, medium, high)

        Returns:
            Classification level
        """
        return self.classification_rules['impact_levels'].get(impact, 'approval')

    def classify_by_action_type(self, action: str) -> str:
        """
        Classify action based on action type

        Args:
            action: Action name

        Returns:
            Classification level
        """
        # Check each category
        for category, actions in self.action_categories.items():
            if action in actions:
                if category == 'notification_actions' or category == 'research_actions':
                    return 'auto'
                elif category == 'booking_actions':
                    return 'notify'
                elif category == 'financial_actions':
                    return 'approval'

        # Default to approval for unknown actions
        return 'approval'

    def determine_final_classification(self, action_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Determine final classification considering all factors

        Args:
            action_data: Action data with cost, impact, type info

        Returns:
            Final classification result
        """
        try:
            cost = action_data.get('cost', 0.0)
            impact = action_data.get('impact', 'medium')
            action = action_data.get('action', '')

            # Get classifications from each factor
            cost_classification = self.classify_by_cost(cost)
            impact_classification = self.classify_by_impact(impact)
            type_classification = self.classify_by_action_type(action)

            # Take the most restrictive classification
            all_classifications = [cost_classification, impact_classification, type_classification]
            priority_order = ['approval', 'notify', 'auto']

            final_level = 'auto'
            for level in priority_order:
                if level in all_classifications:
                    final_level = level
                    break

            return {
                'autonomy_level': final_level,
                'cost_classification': cost_classification,
                'impact_classification': impact_classification,
                'type_classification': type_classification,
                'reasoning': f"Cost: {cost_classification}, Impact: {impact_classification}, Type: {type_classification}"
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to classify action: {e}")
            return {
                'autonomy_level': 'approval',  # Default to most restrictive
                'error': str(e)
            }


class AutonomyManager:
    """
    Manages tiered autonomy and action execution with spending controls
    """

    def __init__(self):
        """
        Initialize Autonomy Manager
        """
        self.logger = logger

        # Spending limits
        self.free_action_limit = 0.0
        self.notify_action_limit = 50.0
        self.approval_required_limit = 50.01
        self.daily_spending_limit = 200.0

        # Current spending tracking
        self.current_daily_spending = 0.0
        self.spending_date = datetime.now().date()

        # Action classifier
        self.action_classifier = ActionClassifier()

        # PAM bridge for user interaction (will be initialized lazily)
        self.pam_bridge = None

    def _reset_daily_spending_if_needed(self):
        """Reset daily spending counter if it's a new day"""
        current_date = datetime.now().date()
        if current_date != self.spending_date:
            self.current_daily_spending = 0.0
            self.spending_date = current_date
            self.logger.info("📅 Reset daily spending counter for new day")

    async def classify_action(self, action_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Classify action for autonomy level determination

        Args:
            action_data: Action data including cost, impact, description

        Returns:
            Classification result
        """
        try:
            classification = self.action_classifier.determine_final_classification(action_data)

            # Add execution permissions
            autonomy_level = classification['autonomy_level']

            result = {
                **classification,
                'requires_approval': autonomy_level == 'approval',
                'can_execute_immediately': autonomy_level != 'approval',
                'notification_required': autonomy_level == 'notify'
            }

            return result

        except Exception as e:
            self.logger.error(f"❌ Failed to classify action: {e}")
            return {
                'autonomy_level': 'approval',
                'requires_approval': True,
                'can_execute_immediately': False,
                'error': str(e)
            }

    async def check_spending_limits(self, cost: float) -> Dict[str, Any]:
        """
        Check if action cost is within spending limits

        Args:
            cost: Action cost

        Returns:
            Spending limit check result
        """
        try:
            self._reset_daily_spending_if_needed()

            total_after_action = self.current_daily_spending + cost

            if total_after_action > self.daily_spending_limit:
                return {
                    'within_limits': False,
                    'reason': f'Would exceed daily limit (${total_after_action:.2f} > ${self.daily_spending_limit:.2f})',
                    'current_spending': self.current_daily_spending,
                    'limit': self.daily_spending_limit
                }

            return {
                'within_limits': True,
                'current_spending': self.current_daily_spending,
                'remaining_budget': self.daily_spending_limit - total_after_action,
                'limit': self.daily_spending_limit
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to check spending limits: {e}")
            return {
                'within_limits': False,
                'reason': f'Error checking limits: {str(e)}',
                'error': str(e)
            }

    async def execute_action(self, action_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a specific action (placeholder for actual implementation)

        Args:
            action_data: Action to execute

        Returns:
            Execution result
        """
        # This is a placeholder for actual action execution
        # In full implementation, this would route to specific action handlers
        action_name = action_data.get('action', 'unknown')

        self.logger.info(f"🔧 Executing action: {action_name}")

        return {
            'success': True,
            'action': action_name,
            'result': f'{action_name} executed successfully',
            'timestamp': datetime.now().isoformat()
        }

    async def execute_autonomous_action(self, action_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute action with autonomy controls and spending tracking

        Args:
            action_data: Action to execute

        Returns:
            Execution result with autonomy info
        """
        try:
            # Classify the action
            classification = await self.classify_action(action_data)

            # Check spending limits
            cost = action_data.get('cost', 0.0)
            spending_check = await self.check_spending_limits(cost)

            if not spending_check['within_limits']:
                return {
                    'executed': False,
                    'autonomy_level': classification['autonomy_level'],
                    'blocked_reason': spending_check['reason'],
                    'success': False
                }

            # Check if approval is required
            if classification['requires_approval']:
                return {
                    'executed': False,
                    'autonomy_level': classification['autonomy_level'],
                    'requires_approval': True,
                    'approval_pending': True,
                    'success': False
                }

            # Execute the action
            execution_result = await self.execute_action(action_data)

            # Update spending tracking if successful
            if execution_result['success'] and cost > 0:
                self.current_daily_spending += cost
                self.logger.info(f"💰 Updated daily spending: ${self.current_daily_spending:.2f}")

            return {
                'executed': True,
                'autonomy_level': classification['autonomy_level'],
                'success': execution_result['success'],
                'result': execution_result.get('result'),
                'cost_charged': cost if execution_result['success'] else 0.0,
                'remaining_budget': self.daily_spending_limit - self.current_daily_spending
            }

        except Exception as e:
            self.logger.error(f"❌ Failed to execute autonomous action: {e}")
            return {
                'executed': False,
                'success': False,
                'error': str(e)
            }

    async def request_user_approval(self, action_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Request user approval for high-cost/high-impact actions

        Args:
            action_data: Action requiring approval

        Returns:
            Approval result
        """
        try:
            if not self.pam_bridge:
                self.logger.warning("⚠️ PAM bridge not available for approval request")
                return {
                    'approval_granted': False,
                    'reason': 'PAM bridge unavailable'
                }

            # Request approval via PAM
            approval_result = await self.pam_bridge.request_user_approval(action_data)

            return approval_result

        except Exception as e:
            self.logger.error(f"❌ Failed to request user approval: {e}")
            return {
                'approval_granted': False,
                'reason': f'Approval request failed: {str(e)}',
                'error': str(e)
            }