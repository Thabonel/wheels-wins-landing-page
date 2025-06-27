"""
WINS Node - Agentic Financial Management
Handles budget queries, expense logging, income tracking with full AI integration.
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal
import logging
import re

from app.services.database import get_database_service
from app.models.domain.pam import PamResponse
from app.services.pam.nodes.base_node import BaseNode
from app.services.pam.intelligent_conversation import IntelligentConversationService

logger = logging.getLogger(__name__)

class WinsNode(BaseNode):
    """Agentic WINS node for intelligent financial management"""
    
    def __init__(self):
        super().__init__("wins")
        self.database_service = None
        self.ai_service = IntelligentConversationService()
    
    async def initialize(self):
        """Initialize WINS node"""
        self.database_service = await get_database_service()
        logger.info("Agentic WINS node initialized")
    
    async def process(self, input_data: Dict[str, Any]) -> PamResponse:
        """Process financial requests with full AI intelligence"""
        if not self.database_service:
            await self.initialize()
        
        user_id = input_data.get('user_id')
        message = input_data.get('message', '')
        conversation_history = input_data.get('conversation_history', [])
        user_context = input_data.get('user_context', {})
        
        try:
            # Get comprehensive financial data for AI context
            financial_context = await self._get_financial_context(user_id)
            
            # Build AI context with financial data
            ai_context = {
                **user_context,
                'financial_data': financial_context,
                'domain': 'financial_management',
                'capabilities': [
                    'budget_tracking', 'expense_logging', 'income_tracking',
                    'financial_analysis', 'savings_tips', 'money_making_ideas',
                    'spending_optimization', 'financial_goals'
                ]
            }
            
            # Check if this requires a financial action
            action_result = await self._detect_and_execute_financial_action(
                user_id, message, financial_context
            )
            
            if action_result:
                # Action was performed, get updated financial context
                financial_context = await self._get_financial_context(user_id)
                ai_context['financial_data'] = financial_context
                ai_context['action_performed'] = action_result
            
            # Generate intelligent response using AI
            ai_response = await self.ai_service.generate_response(
                message=message,
                context=ai_context,
                conversation_history=conversation_history,
                system_prompt=self._get_financial_system_prompt()
            )
            
            # Generate contextual suggestions
            suggestions = await self._generate_smart_suggestions(
                user_id, message, financial_context, action_result
            )
            
            return PamResponse(
                content=ai_response,
                confidence=0.9,
                suggestions=suggestions,
                requires_followup=False,
                metadata={
                    'financial_action': action_result.get('action') if action_result else None,
                    'budget_status': financial_context.get('budget_summary', {}),
                    'spending_trends': financial_context.get('spending_trends', [])
                }
            )
            
        except Exception as e:
            logger.error(f"WINS node processing error: {e}")
            return await self._generate_error_response(message)
    
    async def _get_financial_context(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive financial context for AI"""
        try:
            context = {}
            
            # Budget summary
            budget_query = """
                SELECT name, total_budget, total_spent, total_remaining,
                       CASE 
                           WHEN total_budget > 0 THEN (total_spent / total_budget * 100)
                           ELSE 0 
                       END as percentage_used
                FROM budget_summary 
                WHERE user_id = $1 AND total_budget > 0
                ORDER BY percentage_used DESC
            """
            context['budgets'] = await self.database_service.execute_query(
                budget_query, user_id, cache_key=f"budget_context:{user_id}", cache_ttl=300
            )
            
            # Calculate budget totals
            if context['budgets']:
                context['budget_summary'] = {
                    'total_budget': sum(float(b['total_budget']) for b in context['budgets']),
                    'total_spent': sum(float(b['total_spent']) for b in context['budgets']),
                    'total_remaining': sum(float(b['total_remaining']) for b in context['budgets']),
                    'overspent_categories': [b for b in context['budgets'] if float(b['percentage_used']) > 100],
                    'warning_categories': [b for b in context['budgets'] if 80 <= float(b['percentage_used']) <= 100]
                }
            
            # Recent expenses (last 30 days)
            expenses_query = """
                SELECT category, SUM(amount) as total, COUNT(*) as count,
                       AVG(amount) as avg_amount, MAX(date) as last_expense
                FROM expenses 
                WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY category 
                ORDER BY total DESC
            """
            context['recent_expenses'] = await self.database_service.execute_query(
                expenses_query, user_id, cache_key=f"expenses_context:{user_id}", cache_ttl=300
            )
            
            # Income tracking
            income_query = """
                SELECT source, SUM(amount) as total, COUNT(*) as count,
                       AVG(amount) as avg_amount, MAX(date) as last_income
                FROM income_entries 
                WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY source 
                ORDER BY total DESC
            """
            context['recent_income'] = await self.database_service.execute_query(
                income_query, user_id, cache_key=f"income_context:{user_id}", cache_ttl=300
            )
            
            # Spending trends (last 6 months)
            trends_query = """
                SELECT 
                    DATE_TRUNC('month', date) as month,
                    SUM(amount) as total_spent,
                    COUNT(*) as transaction_count
                FROM expenses 
                WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '6 months'
                GROUP BY DATE_TRUNC('month', date)
                ORDER BY month DESC
            """
            context['spending_trends'] = await self.database_service.execute_query(
                trends_query, user_id, cache_key=f"trends_context:{user_id}", cache_ttl=3600
            )
            
            # Financial goals and money-making ideas
            goals_query = """
                SELECT * FROM financial_goals 
                WHERE user_id = $1 AND status = 'active'
                ORDER BY target_date ASC
            """
            context['financial_goals'] = await self.database_service.execute_query(
                goals_query, user_id, cache_key=f"goals_context:{user_id}", cache_ttl=1800
            )
            
            ideas_query = """
                SELECT * FROM income_ideas 
                WHERE user_id = $1 AND status = 'active'
                ORDER BY estimated_monthly_income DESC
            """
            context['income_ideas'] = await self.database_service.execute_query(
                ideas_query, user_id, cache_key=f"ideas_context:{user_id}", cache_ttl=1800
            )
            
            return context
            
        except Exception as e:
            logger.error(f"Error getting financial context: {e}")
            return {}
    
    async def _detect_and_execute_financial_action(
        self, user_id: str, message: str, financial_context: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Detect and execute financial actions from natural language"""
        message_lower = message.lower()
        
        # Extract amounts using regex
        amount_pattern = r'\$?(\d+(?:\.\d{2})?)'
        amounts = re.findall(amount_pattern, message)
        
        try:
            # Expense logging detection
            expense_keywords = ['spent', 'paid', 'cost', 'bought', 'expense', 'charged']
            if any(keyword in message_lower for keyword in expense_keywords) and amounts:
                return await self._log_expense_from_message(user_id, message, amounts[0])
            
            # Income logging detection
            income_keywords = ['earned', 'made', 'received', 'income', 'paid me', 'got paid']
            if any(keyword in message_lower for keyword in income_keywords) and amounts:
                return await self._log_income_from_message(user_id, message, amounts[0])
            
            # Budget creation/update detection
            budget_keywords = ['budget', 'set aside', 'allocate', 'limit spending']
            if any(keyword in message_lower for keyword in budget_keywords) and amounts:
                return await self._update_budget_from_message(user_id, message, amounts[0])
            
            return None
            
        except Exception as e:
            logger.error(f"Error executing financial action: {e}")
            return None
    
    async def _log_expense_from_message(self, user_id: str, message: str, amount: str) -> Dict[str, Any]:
        """Log expense from natural language message"""
        try:
            # Smart category detection
            category_keywords = {
                'fuel': ['gas', 'fuel', 'diesel', 'station', 'fill up'],
                'food': ['food', 'grocery', 'restaurant', 'meal', 'coffee', 'lunch', 'dinner'],
                'camp': ['camping', 'camp', 'rv park', 'campground', 'site'],
                'maintenance': ['repair', 'maintenance', 'oil', 'tire', 'mechanic'],
                'fun': ['entertainment', 'fun', 'activity', 'attraction', 'tour']
            }
            
            category = 'other'
            message_lower = message.lower()
            for cat, keywords in category_keywords.items():
                if any(keyword in message_lower for keyword in keywords):
                    category = cat
                    break
            
            # Insert expense
            query = """
                INSERT INTO expenses (user_id, amount, category, description, date)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            """
            
            result = await self.database_service.execute_single(
                query, user_id, float(amount), category, message, date.today()
            )
            
            if result:
                # Update budget if exists
                await self._update_budget_spent(user_id, category, float(amount))
                
                return {
                    'action': 'expense_logged',
                    'amount': float(amount),
                    'category': category,
                    'description': message
                }
            
        except Exception as e:
            logger.error(f"Error logging expense: {e}")
            
        return None
    
    async def _log_income_from_message(self, user_id: str, message: str, amount: str) -> Dict[str, Any]:
        """Log income from natural language message"""
        try:
            # Smart source detection
            source_keywords = {
                'work': ['work', 'job', 'salary', 'paycheck'],
                'freelance': ['freelance', 'client', 'project', 'contract'],
                'content': ['youtube', 'blog', 'content', 'social media'],
                'selling': ['sold', 'selling', 'marketplace', 'ebay'],
                'investment': ['investment', 'dividend', 'stock', 'crypto']
            }
            
            source = 'other'
            message_lower = message.lower()
            for src, keywords in source_keywords.items():
                if any(keyword in message_lower for keyword in keywords):
                    source = src
                    break
            
            query = """
                INSERT INTO income_entries (user_id, amount, source, description, date)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            """
            
            result = await self.database_service.execute_single(
                query, user_id, float(amount), source, message, date.today()
            )
            
            if result:
                return {
                    'action': 'income_logged',
                    'amount': float(amount),
                    'source': source,
                    'description': message
                }
            
        except Exception as e:
            logger.error(f"Error logging income: {e}")
            
        return None
    
    async def _update_budget_from_message(self, user_id: str, message: str, amount: str) -> Dict[str, Any]:
        """Update budget from natural language message"""
        try:
            # Smart category detection for budget
            category_keywords = {
                'fuel': ['gas', 'fuel'],
                'food': ['food', 'grocery'],
                'camp': ['camping', 'camp'],
                'fun': ['entertainment', 'fun']
            }
            
            category = 'other'
            message_lower = message.lower()
            for cat, keywords in category_keywords.items():
                if any(keyword in message_lower for keyword in keywords):
                    category = cat
                    break
            
            # Upsert budget
            query = """
                INSERT INTO budget_categories (user_id, name, budget_amount, created_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (user_id, name) 
                DO UPDATE SET budget_amount = $3, updated_at = NOW()
                RETURNING id
            """
            
            result = await self.database_service.execute_single(
                query, user_id, category, float(amount)
            )
            
            if result:
                return {
                    'action': 'budget_updated',
                    'category': category,
                    'amount': float(amount)
                }
            
        except Exception as e:
            logger.error(f"Error updating budget: {e}")
            
        return None
    
    async def _generate_smart_suggestions(
        self, user_id: str, message: str, financial_context: Dict[str, Any], 
        action_result: Optional[Dict[str, Any]]
    ) -> List[str]:
        """Generate contextual suggestions based on financial state"""
        suggestions = []
        
        try:
            # Post-action suggestions
            if action_result:
                action = action_result['action']
                if action == 'expense_logged':
                    suggestions = [
                        "Show my budget status",
                        "Give me savings tips",
                        "Log another expense"
                    ]
                elif action == 'income_logged':
                    suggestions = [
                        "Show my income summary",
                        "Update my financial goals",
                        "Track more income"
                    ]
                elif action == 'budget_updated':
                    suggestions = [
                        "Show my budget breakdown",
                        "Track expenses for this category",
                        "Set more budget limits"
                    ]
            else:
                # Context-based suggestions
                budget_summary = financial_context.get('budget_summary', {})
                
                if budget_summary.get('overspent_categories'):
                    suggestions.extend([
                        "Show where I'm overspending",
                        "Give me cost-cutting tips",
                        "Adjust my budget limits"
                    ])
                
                if budget_summary.get('total_remaining', 0) > 0:
                    suggestions.extend([
                        "Show my remaining budget",
                        "Plan upcoming expenses",
                        "Set aside money for goals"
                    ])
                
                # Always include general options
                suggestions.extend([
                    "Log a new expense",
                    "Track some income",
                    "Show money-saving tips",
                    "See my financial summary"
                ])
            
            # Remove duplicates and limit to 4
            return list(dict.fromkeys(suggestions))[:4]
            
        except Exception as e:
            logger.error(f"Error generating suggestions: {e}")
            return [
                "Show my budget",
                "Log an expense", 
                "Track income",
                "Get savings tips"
            ]
    
    def _get_financial_system_prompt(self) -> str:
        """Get specialized system prompt for financial conversations"""
        return """You are PAM (Personal Assistant & Motivator), a friendly AI assistant specializing in RV travel financial management. You help users track expenses, manage budgets, log income, and optimize their financial life on the road.

Key capabilities:
- Analyze spending patterns and budget health
- Provide personalized money-saving tips for RV travelers  
- Help track income from various road-based sources
- Suggest financial optimizations and goals
- Offer encouragement and practical advice

Communication style:
- Friendly, supportive, and encouraging
- Use emojis appropriately for financial topics (💰, 💸, 🎉, ⚠️)
- Provide specific, actionable advice
- Celebrate financial wins and progress
- Be understanding about financial challenges

When provided with financial_data context:
- Reference specific budget categories and spending
- Mention overspending alerts if relevant
- Celebrate income achievements
- Provide targeted advice based on their patterns

Always be helpful, encouraging, and focused on practical RV travel financial management."""
    
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
            from app.services.cache import cache_service
            await cache_service.delete_pattern(f"*context:{user_id}")
            
        except Exception as e:
            logger.warning(f"Could not update budget for category {category}: {e}")
    
    async def _generate_error_response(self, message: str) -> PamResponse:
        """Generate friendly error response"""
        return PamResponse(
            content="I'm having a small hiccup with your financial data right now. Let me try that again in just a moment! In the meantime, I can still help you with budgeting tips or answer questions about managing money on the road. 😊",
            confidence=0.5,
            suggestions=[
                "Try asking again",
                "Get money-saving tips",
                "Ask about RV budgeting",
                "Show general financial advice"
            ],
            requires_followup=True
        )

# Global WINS node instance
wins_node = WinsNode()
