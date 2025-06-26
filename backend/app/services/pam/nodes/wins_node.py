
"""
Wins Node - Financial management and budget tracking
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, date

from app.models.domain.pam import PamResponse, PamContext, PamMemory
from app.services.pam.nodes.base_node import BaseNode
from app.services.database import DatabaseService
from app.services.cache import CacheService
from app.core.exceptions import ValidationError, DatabaseError
from pydantic import BaseModel, Field, validator

logger = logging.getLogger("pam.wins_node")

class ExpenseRequest(BaseModel):
    amount: float = Field(..., gt=0)
    category: str = Field(..., min_length=1)
    description: Optional[str] = None
    date: Optional[date] = None

class BudgetRequest(BaseModel):
    category: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    period: str = Field(default="monthly")

class WinsNode(BaseNode):
    """Node for handling financial wins and budget management"""
    
    def __init__(self):
        super().__init__("wins")
        self.db_service = DatabaseService()
        self.cache_service = CacheService()
    
    async def process(self, message: str, intent: Any, context: PamContext, 
                     memories: List[PamMemory]) -> PamResponse:
        """Process wins-related requests"""
        start_time = datetime.now()
        
        try:
            # Input validation
            if not message or not message.strip():
                raise ValidationError("Message cannot be empty")
            
            action = getattr(intent, 'action', None)
            if action:
                action = action.value if hasattr(action, 'value') else str(action)
            else:
                action = 'view'
            
            self.logger.info(f"Processing wins request with action: {action}")
            
            if action == 'create':
                response = await self._handle_create_budget(message, context)
            elif action == 'track':
                response = await self._handle_track_expense(message, context)
            else:
                response = await self._handle_view_financial(message, context)
            
            # Performance logging
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            self.logger.info(f"Wins node processed request in {processing_time:.2f}ms")
            
            self._log_processing(message, response)
            return response
                
        except ValidationError as e:
            logger.error(f"Validation error in wins node: {str(e)}")
            return self._create_error_response(f"Invalid input: {str(e)}")
        except DatabaseError as e:
            logger.error(f"Database error in wins node: {str(e)}")
            return self._create_error_response("I had trouble accessing your financial data. Please try again.")
        except Exception as e:
            logger.error(f"Wins node processing failed: {str(e)}")
            return self._create_error_response("I had trouble with your financial request. Please try again.")
    
    async def _handle_create_budget(self, message: str, context: PamContext) -> PamResponse:
        """Handle budget creation request with real data"""
        try:
            user_id = context.user_id
            if not user_id:
                raise ValidationError("User ID is required for budget operations")
            
            # Get existing budget categories
            cache_key = f"budget_categories:{user_id}"
            cached_categories = await self.cache_service.get(cache_key)
            
            if not cached_categories:
                categories = await self.db_service.get_budget_categories(user_id)
                await self.cache_service.set(cache_key, [cat.model_dump() for cat in categories], ttl=300)
            else:
                categories = cached_categories
            
            suggestions = [
                "Set fuel budget: $300/month",
                "Create food budget: $400/month", 
                "Add camping fees: $150/month",
                "Track entertainment: $100/month"
            ]
            
            if categories:
                existing_names = [cat.get('name', '') for cat in categories]
                suggestions.extend([f"Update {name} budget" for name in existing_names[:2]])
            
            return PamResponse(
                content="I'd be happy to help you create a budget! What categories would you like to include?",
                intent=None,
                confidence=0.9,
                suggestions=suggestions,
                actions=[
                    {"type": "navigate", "target": "/wins", "label": "Go to Budget Page"}
                ],
                requires_followup=True,
                context_updates={"budget_creation_started": True},
                voice_enabled=True
            )
            
        except Exception as e:
            logger.error(f"Error in budget creation: {str(e)}")
            return self._create_error_response("I had trouble accessing your budget data.")
    
    async def _handle_track_expense(self, message: str, context: PamContext) -> PamResponse:
        """Handle expense tracking request with real data"""
        try:
            user_id = context.user_id
            if not user_id:
                raise ValidationError("User ID is required for expense tracking")
            
            # Get recent expenses for suggestions
            recent_expenses = await self.db_service.get_recent_expenses(user_id, limit=5)
            
            suggestions = [
                "Fuel: $45.60",
                "Groceries: $85.30", 
                "Camping: $25.00",
                "Restaurant: $32.50"
            ]
            
            if recent_expenses:
                # Add suggestions based on recent expense patterns
                for expense in recent_expenses[:2]:
                    suggestions.append(f"{expense.category}: ${expense.amount:.2f}")
            
            return PamResponse(
                content="Let's log that expense! What did you spend money on and how much?",
                intent=None,
                confidence=0.9,
                suggestions=suggestions,
                actions=[
                    {"type": "navigate", "target": "/wins", "label": "Add Expense"}
                ],
                requires_followup=True,
                context_updates={"expense_tracking_started": True},
                voice_enabled=True
            )
            
        except Exception as e:
            logger.error(f"Error in expense tracking: {str(e)}")
            return self._create_error_response("I had trouble accessing your expense data.")
    
    async def _handle_view_financial(self, message: str, context: PamContext) -> PamResponse:
        """Handle financial overview request with real data"""
        try:
            user_id = context.user_id
            if not user_id:
                return PamResponse(
                    content="I need you to be logged in to show your financial overview.",
                    intent=None,
                    confidence=0.8,
                    suggestions=["Log in to view finances"],
                    actions=[],
                    requires_followup=False,
                    context_updates={},
                    voice_enabled=True
                )
            
            # Get real financial data
            cache_key = f"financial_overview:{user_id}"
            cached_data = await self.cache_service.get(cache_key)
            
            if not cached_data:
                budget_summary = await self.db_service.get_budget_summary(user_id)
                monthly_spending = await self.db_service.get_monthly_spending(user_id)
                
                financial_data = {
                    'budget_summary': budget_summary,
                    'monthly_spending': monthly_spending
                }
                await self.cache_service.set(cache_key, financial_data, ttl=300)
            else:
                financial_data = cached_data
            
            # Build content based on real data
            content = "Here's your financial overview:\n"
            
            if financial_data.get('budget_summary'):
                summary = financial_data['budget_summary']
                content += f"• Total budget: ${summary.get('total_budget', 0):.2f}\n"
                content += f"• Spent this month: ${summary.get('total_spent', 0):.2f}\n"
                content += f"• Remaining: ${summary.get('total_remaining', 0):.2f}"
            else:
                content += "No budget data available. Would you like to create a budget?"
            
            suggestions = [
                "Show expense breakdown",
                "Create new budget", 
                "Add recent expense",
                "View spending trends"
            ]
            
            return PamResponse(
                content=content,
                intent=None,
                confidence=0.8,
                suggestions=suggestions,
                actions=[
                    {"type": "navigate", "target": "/wins", "label": "View Full Dashboard"}
                ],
                requires_followup=False,
                context_updates={},
                voice_enabled=True
            )
            
        except Exception as e:
            logger.error(f"Error in financial overview: {str(e)}")
            return self._create_error_response("I had trouble accessing your financial data.")

# Create singleton instance
wins_node = WinsNode()
