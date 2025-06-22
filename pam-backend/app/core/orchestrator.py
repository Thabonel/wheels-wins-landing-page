# app/core/orchestrator.py
from typing import Dict, List, Any, Optional
from enum import Enum
import json
import logging
import sys
import os
from app.core.config import settings
from app.nodes.wins_node import wins_node

logger = logging.getLogger("pam")

# Try to import scraper service - make it optional for local development
try:
    # Add parent directory to path to find scraper_service
    parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    if parent_dir not in sys.path:
        sys.path.append(parent_dir)
    
    from scraper_service.main import fetch_and_parse
    SCRAPER_AVAILABLE = True
    logger.info("Scraper service imported successfully")
except ImportError as e:
    logger.warning(f"Scraper service not available: {e}")
    SCRAPER_AVAILABLE = False
    
    # Create a dummy function for local development
    def fetch_and_parse(*args, **kwargs):
        return {
            "success": False,
            "message": "Scraper service not available in local development",
            "data": None,
            "local_development": True
        }

# Try to import other nodes - make them optional too
try:
    from app.nodes.wheels_node import wheels_node
except ImportError as e:
    logger.warning(f"Wheels node not available: {e}")
    wheels_node = None

try:
    from app.nodes.social_node import social_node
except ImportError as e:
    logger.warning(f"Social node not available: {e}")
    social_node = None

try:
    from app.nodes.you_node import you_node
except ImportError as e:
    logger.warning(f"You node not available: {e}")
    you_node = None

class Domain(Enum):
    WHEELS = "wheels"
    WINS = "wins"
    SOCIAL = "social"
    YOU = "you"

class PAMOrchestrator:
    def __init__(self):
        self.nodes = {
            Domain.WINS: wins_node,
            Domain.WHEELS: wheels_node,
            Domain.SOCIAL: social_node,
            Domain.YOU: you_node
        }
        
    async def process_query(self, query: str, user_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process a user query and route to appropriate nodes"""
        try:
            # Determine domain based on query keywords
            domain = self._classify_query(query)
            
            # Get the appropriate node
            node = self.nodes.get(domain)
            if not node:
                return {
                    "success": False,
                    "message": f"Node for domain {domain.value} not available in local development",
                    "domain": domain.value,
                    "local_development": True
                }
            
            # Route to the appropriate node
            if domain == Domain.WINS:
                return await self._handle_wins_query(query, user_context)
            elif domain == Domain.WHEELS:
                return await self._handle_wheels_query(query, user_context)
            elif domain == Domain.SOCIAL:
                return await self._handle_social_query(query, user_context)
            elif domain == Domain.YOU:
                return await self._handle_you_query(query, user_context)
            else:
                return {"success": False, "error": "Unknown domain"}
                
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _classify_query(self, query: str) -> Domain:
        """Classify query into appropriate domain"""
        query_lower = query.lower()
        
        # Budget and financial keywords
        if any(keyword in query_lower for keyword in ['budget', 'expense', 'money', 'finance', 'income', 'cost', 'spending', 'save', 'tip']):
            return Domain.WINS
        
        # Vehicle and travel keywords
        elif any(keyword in query_lower for keyword in ['car', 'vehicle', 'trip', 'travel', 'route', 'drive', 'fuel', 'parking']):
            return Domain.WHEELS
        
        # Social and communication keywords
        elif any(keyword in query_lower for keyword in ['message', 'chat', 'social', 'friend', 'contact', 'share']):
            return Domain.SOCIAL
        
        # Personal keywords
        elif any(keyword in query_lower for keyword in ['personal', 'profile', 'setting', 'preference', 'me', 'my']):
            return Domain.YOU
        
        # Default to WINS for general queries
        else:
            return Domain.WINS
    
    async def _handle_wins_query(self, query: str, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle financial/budget related queries"""
        query_lower = query.lower()
        user_id = user_context.get("user_id", "anonymous") if user_context else "anonymous"
        
        try:
            if "budget" in query_lower and "create" in query_lower:
                # Extract budget data from query (simplified for demo)
                return await wins_node.create_budget(user_id, {
                    "category": "general",
                    "amount": 1000,
                    "period": "monthly"
                })
            elif "budget" in query_lower:
                return await wins_node.get_budgets(user_id)
            elif "expense" in query_lower and "add" in query_lower:
                return await wins_node.add_expense(user_id, {
                    "amount": 50,
                    "category": "general",
                    "description": "Sample expense"
                })
            elif "expense" in query_lower:
                return await wins_node.get_expenses(user_id)
            elif "tip" in query_lower:
                return await wins_node.get_financial_tips(user_id)
            else:
                return {
                    "success": True,
                    "message": "This is a financial query. Available commands: budget, expense, tips",
                    "domain": "wins"
                }
        except Exception as e:
            logger.error(f"Error in wins query: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _handle_wheels_query(self, query: str, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle vehicle/travel related queries"""
        if not SCRAPER_AVAILABLE:
            return {
                "success": False,
                "message": "Wheels functionality requires scraper service - not available in local development",
                "domain": "wheels",
                "local_development": True
            }
        
        # Use scraper service for wheels queries
        try:
            result = fetch_and_parse(query)
            return {
                "success": True,
                "data": result,
                "domain": "wheels"
            }
        except Exception as e:
            logger.error(f"Error in wheels query: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _handle_social_query(self, query: str, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle social/communication related queries"""
        return {
            "success": False,
            "message": "Social functionality not implemented yet",
            "domain": "social",
            "local_development": True
        }
    
    async def _handle_you_query(self, query: str, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle personal/profile related queries"""
        return {
            "success": False,
            "message": "Personal profile functionality not implemented yet",
            "domain": "you",
            "local_development": True
        }

# Create global orchestrator instance
orchestrator = PAMOrchestrator()
