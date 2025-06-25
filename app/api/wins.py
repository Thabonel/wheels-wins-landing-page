from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime
from app.core.security import verify_token
from app.core.logging import setup_logging
from app.nodes.wins_node import wins_node

router = APIRouter()
logger = setup_logging()

# Pydantic models
class BudgetCreate(BaseModel):
    category: str
    amount: float
    period: str = "monthly"
    start_date: Optional[str] = None

class ExpenseCreate(BaseModel):
    amount: float
    category: str
    description: Optional[str] = ""
    date: Optional[str] = None

class IncomeCreate(BaseModel):
    amount: float
    source: str
    description: Optional[str] = ""
    date: Optional[str] = None
    is_recurring: bool = False

class TipCreate(BaseModel):
    title: str
    description: str
    category: str
    potential_savings: Optional[float] = 0

# Budget endpoints
@router.post("/budgets", response_model=Dict[str, Any])
async def create_budget(
    budget: BudgetCreate,
    token_data: dict = Depends(verify_token)
):
    """Create a new budget"""
    user_id = token_data.get("user_id", "demo_user")
    result = await wins_node.create_budget(user_id, budget.dict())
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to create budget")
        )
    
    return result

@router.get("/budgets")
async def get_budgets(
    token_data: dict = Depends(verify_token)
):
    """Get all budgets for the user"""
    user_id = token_data.get("user_id", "demo_user")
    return await wins_node.get_budgets(user_id)

@router.get("/budgets/{category}/status")
async def check_budget_status(
    category: str,
    token_data: dict = Depends(verify_token)
):
    """Check budget status for a category"""
    user_id = token_data.get("user_id", "demo_user")
    return await wins_node.check_budget_status(user_id, category)

# Expense endpoints
@router.post("/expenses", response_model=Dict[str, Any])
async def add_expense(
    expense: ExpenseCreate,
    token_data: dict = Depends(verify_token)
):
    """Add a new expense"""
    user_id = token_data.get("user_id", "demo_user")
    result = await wins_node.add_expense(user_id, expense.dict())
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to add expense")
        )
    
    return result

@router.get("/expenses")
async def get_expenses(
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    token_data: dict = Depends(verify_token)
):
    """Get expenses with optional filters"""
    user_id = token_data.get("user_id", "demo_user")
    filters = {}
    
    if category:
        filters["category"] = category
    if start_date:
        filters["start_date"] = start_date
    if end_date:
        filters["end_date"] = end_date
    
    return await wins_node.get_expenses(user_id, filters if filters else None)

@router.get("/expenses/analytics")
async def get_expense_analytics(
    token_data: dict = Depends(verify_token)
):
    """Get expense analytics and insights"""
    user_id = token_data.get("user_id", "demo_user")
    return await wins_node.get_expense_analytics(user_id)

# Income endpoints
@router.post("/income", response_model=Dict[str, Any])
async def add_income(
    income: IncomeCreate,
    token_data: dict = Depends(verify_token)
):
    """Add income entry"""
    user_id = token_data.get("user_id", "demo_user")
    result = await wins_node.add_income(user_id, income.dict())
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to add income")
        )
    
    return result

# Tips endpoints
@router.get("/tips")
async def get_community_tips(
    category: Optional[str] = None
):
    """Get community money-saving tips"""
    return await wins_node.get_community_tips(category)

@router.post("/tips", response_model=Dict[str, Any])
async def submit_tip(
    tip: TipCreate,
    token_data: dict = Depends(verify_token)
):
    """Submit a money-saving tip"""
    user_id = token_data.get("user_id", "demo_user")
    result = await wins_node.submit_tip(user_id, tip.dict())
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to submit tip")
        )
    
    return result
