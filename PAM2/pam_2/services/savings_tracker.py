"""
PAM 2.0 Savings Tracker
=======================

Clean financial analysis and savings tracking service.
Analyzes user messages for financial content and provides recommendations.

Key Features:
- Financial content detection
- Savings calculations and recommendations
- Budget analysis
- Cost optimization suggestions

Design: <300 lines, single responsibility, easily testable
"""

import re
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

from ..core.types import (
    ChatMessage, UserContext, ServiceResponse,
    FinancialData, MessageType
)
from ..core.config import pam2_settings
from ..core.exceptions import SavingsTrackerError, handle_async_service_error

logger = logging.getLogger(__name__)


class SavingsTracker:
    """
    Clean financial analysis and savings tracking service

    Analyzes conversations for financial content and provides
    personalized savings recommendations and budget insights.
    """

    def __init__(self):
        self.enabled = pam2_settings.enable_savings_tracker

        # Financial keywords and patterns
        self.financial_keywords = {
            'spending': ['spend', 'spent', 'cost', 'price', 'expensive', 'cheap', 'buy', 'purchase'],
            'saving': ['save', 'saving', 'savings', 'budget', 'goal', 'target'],
            'income': ['income', 'salary', 'earn', 'paycheck', 'revenue'],
            'expenses': ['expense', 'bill', 'payment', 'rent', 'mortgage', 'utilities'],
            'categories': ['food', 'gas', 'groceries', 'entertainment', 'shopping', 'travel']
        }

        # Money amount patterns
        self.money_patterns = [
            r'\$([0-9,]+(?:\.[0-9]{2})?)',
            r'([0-9,]+(?:\.[0-9]{2})?)\s*dollars?',
            r'([0-9,]+(?:\.[0-9]{2})?)\s*bucks?',
        ]

        # Percentage patterns
        self.percentage_patterns = [
            r'([0-9]+(?:\.[0-9]+)?)\s*%',
            r'([0-9]+(?:\.[0-9]+)?)\s*percent',
        ]

        # Savings goal patterns
        self.goal_patterns = [
            r'save\s+\$?([0-9,]+)',
            r'goal\s+(?:of\s+)?\$?([0-9,]+)',
            r'target\s+(?:of\s+)?\$?([0-9,]+)',
        ]

        logger.info(f"SavingsTracker initialized (enabled: {self.enabled})")

    @handle_async_service_error
    async def analyze_financial_content(
        self,
        message: ChatMessage,
        user_context: Optional[UserContext] = None
    ) -> ServiceResponse:
        """
        Analyze message for financial content and provide recommendations

        Args:
            message: User message to analyze
            user_context: Optional user context for personalized advice

        Returns:
            ServiceResponse with financial analysis and recommendations
        """
        if not self.enabled:
            return ServiceResponse(
                success=True,
                data={"financial_content_detected": False, "reason": "savings_tracker_disabled"},
                service_name="savings_tracker"
            )

        if message.type != MessageType.USER:
            return ServiceResponse(
                success=True,
                data={"financial_content_detected": False, "reason": "not_user_message"},
                service_name="savings_tracker"
            )

        try:
            content = message.content.lower()

            # Detect financial content
            financial_score = self._calculate_financial_score(content)
            is_financial_content = financial_score > 0.2  # Threshold for financial content

            if not is_financial_content:
                return ServiceResponse(
                    success=True,
                    data={
                        "financial_content_detected": False,
                        "financial_score": financial_score,
                        "reason": "low_financial_score"
                    },
                    service_name="savings_tracker"
                )

            # Extract financial entities
            financial_entities = self._extract_financial_entities(message.content)

            # Generate recommendations
            recommendations = self._generate_recommendations(
                financial_entities, user_context
            )

            # Calculate potential savings
            savings_analysis = self._analyze_savings_potential(
                financial_entities, user_context
            )

            return ServiceResponse(
                success=True,
                data={
                    "financial_content_detected": True,
                    "financial_score": financial_score,
                    "entities": financial_entities,
                    "recommendations": recommendations,
                    "savings_analysis": savings_analysis,
                    "confidence": self._calculate_confidence(financial_entities)
                },
                metadata={
                    "user_id": message.user_id,
                    "message_id": message.id,
                    "analysis_timestamp": datetime.now().isoformat()
                },
                service_name="savings_tracker"
            )

        except Exception as e:
            logger.error(f"Financial content analysis failed: {e}")
            raise SavingsTrackerError(
                f"Financial analysis failed: {str(e)}",
                operation="analyze_financial_content",
                context={"user_id": message.user_id, "message_id": message.id}
            )

    def _calculate_financial_score(self, content: str) -> float:
        """Calculate financial content score based on keyword presence"""
        total_score = 0.0
        total_categories = len(self.financial_keywords)

        for category, keywords in self.financial_keywords.items():
            category_score = 0.0
            for keyword in keywords:
                if keyword in content:
                    category_score += 1.0

            # Normalize category score
            if len(keywords) > 0:
                category_score = min(category_score / len(keywords), 1.0)

            total_score += category_score

        return total_score / total_categories if total_categories > 0 else 0.0

    def _extract_financial_entities(self, content: str) -> Dict[str, List[str]]:
        """Extract financial entities from message content"""
        entities = {
            "amounts": [],
            "percentages": [],
            "goals": [],
            "categories": []
        }

        # Extract money amounts
        for pattern in self.money_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                amount = match.replace(',', '').strip()
                if amount and amount not in entities["amounts"]:
                    entities["amounts"].append(amount)

        # Extract percentages
        for pattern in self.percentage_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                if match not in entities["percentages"]:
                    entities["percentages"].append(match)

        # Extract savings goals
        for pattern in self.goal_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                goal = match.replace(',', '').strip()
                if goal and goal not in entities["goals"]:
                    entities["goals"].append(goal)

        # Extract expense categories
        for category in self.financial_keywords['categories']:
            if category in content.lower():
                if category not in entities["categories"]:
                    entities["categories"].append(category)

        return entities

    def _generate_recommendations(
        self,
        entities: Dict[str, List[str]],
        user_context: Optional[UserContext]
    ) -> List[str]:
        """Generate personalized financial recommendations"""
        recommendations = []

        # Budget recommendations
        if entities["amounts"]:
            amounts = [float(amt) for amt in entities["amounts"] if amt.replace('.', '').isdigit()]
            if amounts:
                avg_amount = sum(amounts) / len(amounts)
                if avg_amount > 100:
                    recommendations.append(
                        f"Consider setting a monthly budget for expenses around ${avg_amount:.0f} "
                        "to better track your spending patterns."
                    )

        # Savings goal recommendations
        if entities["goals"]:
            goals = [float(goal) for goal in entities["goals"] if goal.replace('.', '').isdigit()]
            if goals:
                largest_goal = max(goals)
                recommendations.append(
                    f"To reach your ${largest_goal:.0f} goal, consider saving "
                    f"${largest_goal/12:.0f} per month over a year."
                )

        # Category-specific recommendations
        categories = entities["categories"]
        if "food" in categories or "groceries" in categories:
            recommendations.append(
                "Try meal planning and cooking at home to reduce food expenses by 20-30%."
            )

        if "gas" in categories:
            recommendations.append(
                "Consider carpooling, public transport, or trip consolidation to save on fuel costs."
            )

        if "travel" in categories:
            recommendations.append(
                "Book travel in advance, use travel rewards, and consider off-peak times for better deals."
            )

        # Default recommendation if no specific ones generated
        if not recommendations:
            recommendations.append(
                "Track your expenses for a month to identify areas where you can optimize spending."
            )

        return recommendations[:3]  # Limit to top 3 recommendations

    def _analyze_savings_potential(
        self,
        entities: Dict[str, List[str]],
        user_context: Optional[UserContext]
    ) -> Dict[str, Any]:
        """Analyze potential savings opportunities"""
        analysis = {
            "potential_monthly_savings": 0.0,
            "optimization_areas": [],
            "savings_rate_suggestion": "20%"
        }

        # Calculate potential savings based on mentioned amounts
        if entities["amounts"]:
            amounts = [float(amt) for amt in entities["amounts"] if amt.replace('.', '').isdigit()]
            if amounts:
                total_mentioned = sum(amounts)
                # Assume 10-15% savings potential on mentioned expenses
                potential_savings = total_mentioned * 0.125  # 12.5% average
                analysis["potential_monthly_savings"] = round(potential_savings, 2)

        # Identify optimization areas based on categories
        for category in entities["categories"]:
            if category in ["food", "groceries"]:
                analysis["optimization_areas"].append({
                    "category": "Food & Groceries",
                    "potential_savings": "20-30%",
                    "method": "Meal planning and home cooking"
                })
            elif category in ["gas", "travel"]:
                analysis["optimization_areas"].append({
                    "category": "Transportation",
                    "potential_savings": "15-25%",
                    "method": "Route optimization and alternative transport"
                })
            elif category in ["entertainment", "shopping"]:
                analysis["optimization_areas"].append({
                    "category": "Discretionary Spending",
                    "potential_savings": "10-20%",
                    "method": "Budget limits and comparison shopping"
                })

        return analysis

    def _calculate_confidence(self, entities: Dict[str, List[str]]) -> float:
        """Calculate confidence score based on extracted financial entities"""
        entity_weights = {
            "amounts": 0.4,
            "goals": 0.3,
            "categories": 0.2,
            "percentages": 0.1
        }

        confidence = 0.0
        for entity_type, values in entities.items():
            if values and entity_type in entity_weights:
                confidence += entity_weights[entity_type]

        return min(confidence, 1.0)

    async def get_savings_summary(self, user_id: str) -> ServiceResponse:
        """Get savings summary for user (placeholder)"""
        try:
            # This would query stored financial data in a real implementation
            summary = {
                "total_tracked_expenses": 0.0,
                "savings_goals": [],
                "monthly_trends": {},
                "recommendations_followed": 0
            }

            return ServiceResponse(
                success=True,
                data=summary,
                metadata={"user_id": user_id},
                service_name="savings_tracker"
            )

        except Exception as e:
            logger.error(f"Failed to get savings summary: {e}")
            raise SavingsTrackerError(
                f"Savings summary retrieval failed: {str(e)}",
                operation="get_savings_summary",
                context={"user_id": user_id}
            )

    async def get_service_health(self) -> Dict[str, Any]:
        """Get service health status"""
        return {
            "service": "savings_tracker",
            "enabled": self.enabled,
            "configuration": {
                "keyword_categories": len(self.financial_keywords),
                "money_patterns": len(self.money_patterns),
                "goal_patterns": len(self.goal_patterns)
            }
        }


def create_savings_tracker() -> SavingsTracker:
    """Factory function to create SavingsTracker instance"""
    return SavingsTracker()