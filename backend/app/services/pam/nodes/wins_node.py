
"""
Wins Node - Financial management and budget tracking
"""

import logging
from typing import Dict, List, Any
from datetime import datetime

from app.models.domain.pam import PamResponse, PamContext, PamMemory
from app.services.pam.nodes.base_node import BaseNode

logger = logging.getLogger("pam.wins_node")

class WinsNode(BaseNode):
    """Node for handling financial wins and budget management"""
    
    def __init__(self):
        super().__init__("wins")
    
    async def process(self, message: str, intent: Any, context: PamContext, 
                     memories: List[PamMemory]) -> PamResponse:
        """Process wins-related requests"""
        try:
            action = intent.action.value if hasattr(intent, 'action') else 'view'
            
            if action == 'create':
                return await self._handle_create_budget(message, context)
            elif action == 'track':
                return await self._handle_track_expense(message, context)
            else:
                return await self._handle_view_financial(message, context)
                
        except Exception as e:
            logger.error(f"Wins node processing failed: {str(e)}")
            return self._create_error_response("I had trouble with your financial request. Please try again.")
    
    async def _handle_create_budget(self, message: str, context: PamContext) -> PamResponse:
        """Handle budget creation request"""
        return PamResponse(
            content="I'd be happy to help you create a budget! What categories would you like to include?",
            intent=None,
            confidence=0.9,
            suggestions=[
                "Include fuel expenses",
                "Add food budget",
                "Set camping fees limit",
                "Track entertainment costs"
            ],
            actions=[
                {"type": "navigate", "target": "/wins", "label": "Go to Budget Page"}
            ],
            requires_followup=True,
            context_updates={"budget_creation_started": True},
            voice_enabled=True
        )
    
    async def _handle_track_expense(self, message: str, context: PamContext) -> PamResponse:
        """Handle expense tracking request"""
        return PamResponse(
            content="Let's log that expense! What did you spend money on and how much?",
            intent=None,
            confidence=0.9,
            suggestions=[
                "Fuel: $45.60",
                "Groceries: $85.30",
                "Camping: $25.00",
                "Restaurant: $32.50"
            ],
            actions=[
                {"type": "navigate", "target": "/wins", "label": "Add Expense"}
            ],
            requires_followup=True,
            context_updates={"expense_tracking_started": True},
            voice_enabled=True
        )
    
    async def _handle_view_financial(self, message: str, context: PamContext) -> PamResponse:
        """Handle financial overview request"""
        budget_status = context.budget_status or {}
        
        content = "Here's your financial overview:\n"
        if budget_status:
            content += f"• Budget remaining: ${budget_status.get('remaining', 'N/A')}\n"
            content += f"• This month's spending: ${budget_status.get('spent', 'N/A')}"
        else:
            content += "No budget data available. Would you like to create a budget?"
        
        return PamResponse(
            content=content,
            intent=None,
            confidence=0.8,
            suggestions=[
                "Show expense breakdown",
                "Create new budget",
                "Add recent expense",
                "View spending trends"
            ],
            actions=[
                {"type": "navigate", "target": "/wins", "label": "View Full Dashboard"}
            ],
            requires_followup=False,
            context_updates={},
            voice_enabled=True
        )

# Create singleton instance
wins_node = WinsNode()
