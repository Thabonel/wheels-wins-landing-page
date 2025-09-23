"""
PAM 2.0 Savings Tracker Service
Phase 5 Implementation: Financial Goal Tracking and Recommendations

Key Features:
- Financial goal tracking and monitoring
- Savings recommendations based on spending patterns
- Integration with Wins financial components
- Smart budget analysis and suggestions

Target: <300 lines, modular design
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from decimal import Decimal

from ..core.types import (
    ServiceResponse,
    UserContext
)
from ..core.exceptions import SavingsTrackerError
from ..core.config import pam2_settings

logger = logging.getLogger(__name__)

class SavingsTracker:
    """
    Savings Tracker Service
    Tracks financial goals and provides savings recommendations
    """

    def __init__(self):
        self.mcp_config = pam2_settings.get_mcp_config()

        # Financial analysis settings
        self.analysis_period_days = 30  # Default analysis period
        self.savings_rate_target = 0.20  # 20% savings rate target
        self.emergency_fund_months = 3  # Emergency fund target in months

        # Spending categories for analysis
        self.expense_categories = [
            "transportation", "dining", "entertainment", "shopping",
            "groceries", "utilities", "rent", "insurance", "healthcare"
        ]

        logger.info("SavingsTracker initialized")

    async def analyze_financial_conversation(
        self,
        user_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ServiceResponse:
        """
        Analyze conversation for financial planning content

        Args:
            user_id: User identifier
            message: User message to analyze
            context: Additional context (optional)

        Returns:
            ServiceResponse with financial analysis
        """
        try:
            logger.debug(f"Analyzing financial content for user {user_id}")

            # Analyze message for financial content
            financial_analysis = await self._analyze_financial_content(message, context)

            # Generate recommendations if financial discussion detected
            recommendations = []
            if financial_analysis["is_financial_related"]:
                recommendations = await self._generate_savings_recommendations(user_id, financial_analysis)

            return ServiceResponse(
                success=True,
                data={
                    "financial_content_detected": financial_analysis["is_financial_related"],
                    "topic_type": financial_analysis.get("topic_type"),
                    "confidence": financial_analysis.get("confidence", 0.0),
                    "recommendations": recommendations,
                    "detected_amounts": financial_analysis.get("amounts", [])
                },
                metadata={
                    "user_id": user_id,
                    "analysis_timestamp": datetime.now().isoformat()
                }
            )

        except Exception as e:
            logger.error(f"Error analyzing financial content for user {user_id}: {e}")
            raise SavingsTrackerError(
                message=f"Failed to analyze financial content: {str(e)}",
                details={"user_id": user_id}
            )

    async def _analyze_financial_content(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze message content for financial indicators
        """

        message_lower = message.lower()

        # Financial keywords
        financial_keywords = [
            "money", "budget", "expense", "cost", "price", "save", "savings",
            "spend", "spending", "financial", "income", "salary", "goal",
            "debt", "credit", "bank", "investment", "emergency fund"
        ]

        # Topic type indicators
        topic_indicators = {
            "budgeting": ["budget", "budgeting", "allocate", "plan", "monthly"],
            "savings_goal": ["save", "savings", "goal", "target", "emergency fund"],
            "expense_tracking": ["spent", "expense", "cost", "price", "receipt"],
            "income": ["income", "salary", "earn", "paycheck", "raise"],
            "debt": ["debt", "loan", "credit", "payment", "owe"],
            "investment": ["invest", "investment", "stocks", "401k", "retirement"]
        }

        # Find matching keywords
        keyword_matches = [kw for kw in financial_keywords if kw in message_lower]

        # Determine topic type
        topic_type = "general_financial"
        confidence = 0.0

        for topic, indicators in topic_indicators.items():
            matches = [ind for ind in indicators if ind in message_lower]
            if matches:
                topic_type = topic
                confidence += len(matches) * 0.2

        # Base confidence from financial keywords
        if keyword_matches:
            confidence += len(keyword_matches) * 0.1

        # Extract monetary amounts
        amounts = await self._extract_monetary_amounts(message)
        if amounts:
            confidence += 0.3

        is_financial_related = confidence >= 0.3

        return {
            "is_financial_related": is_financial_related,
            "confidence": min(confidence, 1.0),
            "topic_type": topic_type if is_financial_related else None,
            "keywords_found": keyword_matches,
            "amounts": amounts
        }

    async def _extract_monetary_amounts(self, message: str) -> List[Dict[str, Any]]:
        """
        Extract monetary amounts from message
        Simple regex-based extraction for Phase 5
        """

        import re

        amounts = []

        # Pattern for currency amounts ($123.45, $1,234, etc.)
        money_patterns = [
            r'\$([0-9,]+\.?[0-9]*)',  # $123.45
            r'([0-9,]+\.?[0-9]*)\s*dollars?',  # 123 dollars
            r'([0-9,]+\.?[0-9]*)\s*bucks?',  # 123 bucks
        ]

        for pattern in money_patterns:
            matches = re.findall(pattern, message, re.IGNORECASE)
            for match in matches:
                try:
                    # Clean and convert to decimal
                    amount_str = match.replace(',', '')
                    amount = Decimal(amount_str)
                    amounts.append({
                        "amount": float(amount),
                        "currency": "USD",
                        "context": "extracted"
                    })
                except:
                    pass

        return amounts

    async def _generate_savings_recommendations(
        self,
        user_id: str,
        financial_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generate personalized savings recommendations
        """

        recommendations = []
        topic_type = financial_analysis.get("topic_type")

        # Basic recommendations based on topic
        if topic_type == "budgeting":
            recommendations.extend([
                {
                    "type": "budgeting_tip",
                    "message": "Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings",
                    "action": "create_budget_plan"
                },
                {
                    "type": "tracking_suggestion",
                    "message": "Track your expenses for a week to identify spending patterns",
                    "action": "start_expense_tracking"
                }
            ])

        elif topic_type == "savings_goal":
            recommendations.extend([
                {
                    "type": "goal_setting",
                    "message": "Set specific, measurable savings goals with target dates",
                    "action": "create_savings_goal"
                },
                {
                    "type": "automation_tip",
                    "message": "Automate your savings with direct deposits to reach goals faster",
                    "action": "setup_auto_savings"
                }
            ])

        elif topic_type == "expense_tracking":
            recommendations.extend([
                {
                    "type": "categorization",
                    "message": "Categorize expenses to see where your money goes",
                    "action": "categorize_expenses"
                },
                {
                    "type": "reduction_tip",
                    "message": "Look for subscription services you can cancel or downgrade",
                    "action": "review_subscriptions"
                }
            ])

        # Phase 5: Add personalized recommendations based on user data
        # - Analyze spending patterns
        # - Compare to user goals
        # - Suggest specific amounts and timelines

        return recommendations

    async def get_user_financial_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Get financial summary for user
        Phase 5 implementation placeholder
        """

        # Phase 5: Implement comprehensive financial summary
        # - Connect to Supabase for user financial data
        # - Calculate savings rate
        # - Analyze spending patterns
        # - Track goal progress

        return {
            "total_savings": 0.0,
            "monthly_income": 0.0,
            "monthly_expenses": 0.0,
            "savings_rate": 0.0,
            "active_goals": [],
            "emergency_fund_months": 0.0,
            "spending_trends": {},
            "data_available": False
        }

    async def calculate_savings_potential(
        self,
        user_id: str,
        income: float,
        expenses: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Calculate savings potential based on income and expenses
        """

        total_expenses = sum(expenses.values())
        current_savings = income - total_expenses
        savings_rate = current_savings / income if income > 0 else 0

        # Analyze expense categories for reduction opportunities
        reduction_opportunities = []

        for category, amount in expenses.items():
            if category in ["dining", "entertainment", "shopping"] and amount > 0:
                potential_reduction = amount * 0.20  # 20% reduction suggestion
                reduction_opportunities.append({
                    "category": category,
                    "current_amount": amount,
                    "suggested_reduction": potential_reduction,
                    "new_amount": amount - potential_reduction
                })

        total_potential_reduction = sum([opp["suggested_reduction"] for opp in reduction_opportunities])
        potential_savings = current_savings + total_potential_reduction
        potential_savings_rate = potential_savings / income if income > 0 else 0

        return {
            "current_savings": current_savings,
            "current_savings_rate": savings_rate,
            "potential_savings": potential_savings,
            "potential_savings_rate": potential_savings_rate,
            "reduction_opportunities": reduction_opportunities,
            "monthly_savings_increase": total_potential_reduction
        }

    async def create_savings_goal(
        self,
        user_id: str,
        goal_name: str,
        target_amount: float,
        target_date: datetime,
        category: str = "general"
    ) -> ServiceResponse:
        """
        Create a new savings goal for user
        Phase 5 implementation placeholder
        """

        # Phase 5: Implement goal creation
        # - Validate goal parameters
        # - Store in Supabase
        # - Calculate required monthly savings
        # - Set up tracking

        return ServiceResponse(
            success=True,
            data={
                "goal_created": True,
                "goal_name": goal_name,
                "target_amount": target_amount,
                "monthly_required": 0.0  # Calculate based on timeline
            },
            metadata={"user_id": user_id}
        )

    async def get_service_health(self) -> Dict[str, Any]:
        """Get service health status"""

        return {
            "service": "savings_tracker",
            "status": "healthy",
            "analysis_period_days": self.analysis_period_days,
            "savings_rate_target": self.savings_rate_target,
            "emergency_fund_months": self.emergency_fund_months,
            "expense_categories": len(self.expense_categories),
            "timestamp": datetime.now().isoformat()
        }

# Service factory function
def create_savings_tracker() -> SavingsTracker:
    """Factory function to create SavingsTracker instance"""
    return SavingsTracker()