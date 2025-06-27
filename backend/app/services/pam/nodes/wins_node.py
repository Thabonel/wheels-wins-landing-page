"""
WINS Node - Financial Management
Handles budget queries, expense logging, and income tracking.
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from decimal import Decimal
import logging

from backend.app.services.database import get_database_service
from backend.app.models.domain.pam import PamResponse
from backend.app.services.pam.nodes.base_node import BaseNode

logger = logging.getLogger(__name__)

class WinsNode(BaseNode):
    """WINS node for financial management"""
    
    def __init__(self):
        super().__init__("wins")
        self.database_service = None
    
    async def initialize(self):
        """Initialize WINS node"""
        self.database_service = await get_database_service()
        logger.info("WINS node initialized")
    
    async def process(self, input_data: Dict[str, Any]) -> PamResponse:
        """Process financial-related requests"""
        if not self.database_service:
            await self.initialize()
        
        user_id = input_data.get('user_id')
        message = input_data.get('message', '').lower()
        intent = input_data.get('intent')
        entities = input_data.get('entities', {})
        
        try:
            if 'budget' in message or 'spent' in message or 'spending' in message:
                return await self._handle_budget_query(user_id, message, entities)
            elif 'expense' in message or 'cost' in message or 'paid' in message:
                return await self._handle_expense_logging(user_id, message, entities)
            elif 'income' in message or 'earned' in message or 'made money' in message:
                return await self._handle_income_tracking(user_id, message, entities)
            elif 'save' in message or 'saving' in message:
                return await self._handle_savings_tips(user_id, message)
            else:
                return await self._handle_general_financial_query(user_id, message)
                
        except Exception as e:
            logger.error(f"WINS node processing error: {e}")
            return PamResponse(
                content="I'm having trouble accessing your financial information right now. Please try again in a moment.",
                confidence=0.3,
                requires_followup=True
            )
    
    async def _handle_budget_query(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle budget-related queries"""
        try:
            # Get budget summary from database
            query = """
                SELECT name, total_budget, total_spent, total_remaining 
                FROM budget_summary 
                WHERE user_id = $1 AND total_budget > 0
                ORDER BY name
            """
            
            budgets = await self.database_service.execute_query(
                query, user_id, cache_key=f"budget_summary:{user_id}", cache_ttl=300
            )
            
            if not budgets:
                return PamResponse(
                    content="I don't see any budgets set up yet. Would you like me to help you create one?",
                    confidence=0.8,
                    suggestions=[
                        "Set up a monthly budget",
                        "Track my expenses",
                        "Show me savings tips"
                    ],
                    requires_followup=True
                )
            
            # Build budget summary response
            total_budgeted = sum(float(b['total_budget']) for b in budgets)
            total_spent = sum(float(b['total_spent']) for b in budgets)
            remaining = total_budgeted - total_spent
            
            response_parts = [
                f"Here's your budget overview:",
                f"💰 Total Budget: ${total_budgeted:,.2f}",
                f"💸 Total Spent: ${total_spent:,.2f}",
                f"🏦 Remaining: ${remaining:,.2f}",
                ""
            ]
            
            # Add category breakdown
            if len(budgets) > 1:
                response_parts.append("By category:")
                for budget in budgets:
                    spent = float(budget['total_spent'])
                    budgeted = float(budget['total_budget'])
                    percentage = (spent / budgeted * 100) if budgeted > 0 else 0
                    
                    status_emoji = "🟢" if percentage < 75 else "🟡" if percentage < 95 else "🔴"
                    response_parts.append(
                        f"{status_emoji} {budget['name']}: ${spent:,.2f} / ${budgeted:,.2f} ({percentage:.1f}%)"
                    )
            
            suggestions = []
            if remaining < 0:
                suggestions.extend([
                    "Show me where I'm overspending",
                    "Give me money-saving tips",
                    "How can I cut expenses?"
                ])
            else:
                suggestions.extend([
                    "Log a new expense",
                    "Show this month's spending",
                    "Track my income"
                ])
            
            return PamResponse(
                content="\n".join(response_parts),
                confidence=0.9,
                suggestions=suggestions,
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"Budget query error: {e}")
            raise
    
    async def _handle_expense_logging(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle expense logging requests"""
        # Extract amount and category from message
        amount = entities.get('amount')
        category = entities.get('category', 'Other')
        description = entities.get('description', message)
        
        if not amount:
            return PamResponse(
                content="I'd be happy to log an expense for you! What amount did you spend and on what category?",
                confidence=0.7,
                suggestions=[
                    "I spent $25 on groceries",
                    "Paid $60 for fuel",
                    "Camping fee was $35"
                ],
                requires_followup=True
            )
        
        try:
            # Store the expense
            query = """
                INSERT INTO expenses (user_id, amount, category, description, date)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            """
            
            result = await self.database_service.execute_single(
                query, user_id, amount, category, description, date.today()
            )
            
            if result:
                # Update budget if exists
                await self._update_budget_spent(user_id, category, amount)
                
                return PamResponse(
                    content=f"✅ Logged ${amount} expense in {category}. Your expense has been recorded!",
                    confidence=0.9,
                    suggestions=[
                        "Show my budget status",
                        "Log another expense",
                        "See this month's spending"
                    ],
                    requires_followup=False
                )
            else:
                raise Exception("Failed to store expense")
                
        except Exception as e:
            logger.error(f"Expense logging error: {e}")
            return PamResponse(
                content="I had trouble logging that expense. Please try again.",
                confidence=0.3,
                requires_followup=True
            )
    
    async def _handle_income_tracking(self, user_id: str, message: str, entities: Dict[str, Any]) -> PamResponse:
        """Handle income tracking requests"""
        amount = entities.get('amount')
        source = entities.get('source', 'Other')
        
        if not amount:
            return PamResponse(
                content="Great! I can help you track your income. How much did you earn and from what source?",
                confidence=0.7,
                suggestions=[
                    "Earned $500 from work",
                    "Made $150 from side hustle",
                    "Got $75 from content creation"
                ],
                requires_followup=True
            )
        
        try:
            query = """
                INSERT INTO income_entries (user_id, amount, source, date)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            """
            
            result = await self.database_service.execute_single(
                query, user_id, amount, source, date.today()
            )
            
            if result:
                return PamResponse(
                    content=f"🎉 Recorded ${amount} income from {source}! Keep up the great work earning on the road!",
                    confidence=0.9,
                    suggestions=[
                        "Show my total income this month",
                        "Track another income source",
                        "See my money-making ideas"
                    ],
                    requires_followup=False
                )
            else:
                raise Exception("Failed to store income")
                
        except Exception as e:
            logger.error(f"Income tracking error: {e}")
            return PamResponse(
                content="I had trouble recording that income. Please try again.",
                confidence=0.3,
                requires_followup=True
            )
    
    async def _handle_savings_tips(self, user_id: str, message: str) -> PamResponse:
        """Provide savings tips and financial advice"""
        try:
            # Get user's spending patterns
            query = """
                SELECT category, SUM(amount) as total 
                FROM expenses 
                WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY category 
                ORDER BY total DESC 
                LIMIT 5
            """
            
            spending = await self.database_service.execute_query(
                query, user_id, cache_key=f"spending_patterns:{user_id}", cache_ttl=3600
            )
            
            tips = [
                "💡 Here are some RV money-saving tips:",
                "",
                "⛽ Fuel: Use GasBuddy to find cheapest gas stations",
                "🏕️ Camping: Try boondocking or state parks vs private campgrounds",
                "🛒 Groceries: Shop at discount stores like Walmart or Aldi",
                "🔧 Maintenance: Learn basic repairs to avoid shop fees",
                "📱 Internet: Use library WiFi when possible"
            ]
            
            if spending:
                tips.append("")
                tips.append("Based on your spending:")
                top_category = spending[0]
                tips.append(f"💰 Your biggest expense is {top_category['category']} (${float(top_category['total']):.2f} this month)")
                
                # Category-specific tips
                category_tips = {
                    'Fuel': 'Consider slower driving speeds to improve MPG',
                    'Food': 'Meal planning and cooking in your RV saves a lot!',
                    'Camp': 'Mix free camping with paid sites to balance cost and amenities'
                }
                
                if top_category['category'] in category_tips:
                    tips.append(f"💡 Tip: {category_tips[top_category['category']]}")
            
            return PamResponse(
                content="\n".join(tips),
                confidence=0.8,
                suggestions=[
                    "Show me money-making ideas",
                    "Track my expenses",
                    "Find free camping spots"
                ],
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"Savings tips error: {e}")
            return PamResponse(
                content="Here are some great ways to save money while RVing: Use apps like GasBuddy for fuel, try boondocking, cook your own meals, and maintain your RV yourself when possible!",
                confidence=0.6,
                requires_followup=False
            )
    
    async def _handle_general_financial_query(self, user_id: str, message: str) -> PamResponse:
        """Handle general financial questions"""
        try:
            # Get recent financial summary
            queries = {
                'expenses': "SELECT SUM(amount) FROM expenses WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'",
                'income': "SELECT SUM(amount) FROM income_entries WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'"
            }
            
            results = {}
            for key, query in queries.items():
                result = await self.database_service.execute_single(query, user_id)
                results[key] = float(result['sum']) if result and result['sum'] else 0.0
            
            monthly_expenses = results['expenses']
            monthly_income = results['income']
            net_income = monthly_income - monthly_expenses
            
            response_parts = [
                "Here's your financial snapshot for this month:",
                f"💰 Income: ${monthly_income:,.2f}",
                f"💸 Expenses: ${monthly_expenses:,.2f}",
                f"📊 Net: ${net_income:,.2f}"
            ]
            
            if net_income > 0:
                response_parts.append("🎉 You're in the green! Great job managing your finances on the road!")
            elif net_income < 0:
                response_parts.append("⚠️ You're spending more than earning this month. Let's look at ways to cut costs or boost income.")
            else:
                response_parts.append("📊 You're breaking even this month.")
            
            suggestions = [
                "Show my budget breakdown",
                "Give me money-saving tips",
                "Track a new expense",
                "Log some income"
            ]
            
            return PamResponse(
                content="\n".join(response_parts),
                confidence=0.8,
                suggestions=suggestions,
                requires_followup=False
            )
            
        except Exception as e:
            logger.error(f"General financial query error: {e}")
            return PamResponse(
                content="I can help you track expenses, manage budgets, log income, and give you money-saving tips for RV life! What would you like to know about your finances?",
                confidence=0.6,
                suggestions=[
                    "Show my budget",
                    "Log an expense",
                    "Track my income",
                    "Give me savings tips"
                ],
                requires_followup=True
            )
    
    async def _update_budget_spent(self, user_id: str, category: str, amount: float):
        """Update budget spent amount for category"""
        try:
            query = """
                UPDATE budget_categories 
                SET spent_amount = spent_amount + $3, updated_at = NOW()
                WHERE user_id = $1 AND name = $2
            """
            
            await self.database_service.execute_mutation(query, user_id, category, amount)
            
            # Invalidate cache
            from backend.app.services.cache import cache_service
            await cache_service.delete_pattern(f"budget_summary:{user_id}")
            
        except Exception as e:
            logger.warning(f"Could not update budget for category {category}: {e}")

# Global WINS node instance
wins_node = WinsNode()
