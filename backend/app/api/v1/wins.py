
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Dict, Any, Optional, List
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field, validator
from app.core.security import verify_token
from app.core.logging import setup_logging
from app.core.rate_limiting import rate_limit
from app.database.supabase_client import get_supabase_client

router = APIRouter()
logger = setup_logging()
supabase = get_supabase_client()

# Request/Response Models
class ExpenseCreateRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Expense amount")
    category: str = Field(..., min_length=1, max_length=50, description="Expense category")
    description: str = Field(..., min_length=1, max_length=200, description="Expense description")
    date: date = Field(..., description="Expense date")
    location: Optional[str] = Field(None, max_length=100, description="Location of expense")

class ExpenseUpdateRequest(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, min_length=1, max_length=200)
    date: Optional[date] = None
    location: Optional[str] = Field(None, max_length=100)

class BudgetUpdateRequest(BaseModel):
    categories: List[Dict[str, Any]] = Field(..., min_items=1)
    
    @validator('categories')
    def validate_categories(cls, v):
        for category in v:
            if 'name' not in category or 'budgeted_amount' not in category:
                raise ValueError('Each category must have name and budgeted_amount')
            if not isinstance(category['budgeted_amount'], (int, float, Decimal)):
                raise ValueError('budgeted_amount must be a number')
        return v

class IncomeCreateRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Income amount")
    source: str = Field(..., min_length=1, max_length=100, description="Income source")
    description: Optional[str] = Field(None, max_length=200)
    date: date = Field(default_factory=date.today)
    type: str = Field(default="regular", description="Income type")

class HustleTrackRequest(BaseModel):
    hustle_id: str = Field(..., min_length=1, description="Hustle opportunity ID")
    earnings: Optional[Decimal] = Field(None, ge=0, description="Earnings from attempt")
    time_spent: Optional[int] = Field(None, ge=0, description="Time spent in minutes")
    status: str = Field(..., regex="^(completed|attempted|failed)$", description="Attempt status")
    notes: Optional[str] = Field(None, max_length=500)

# Expense endpoints
@router.post("/expenses", response_model=Dict[str, Any])
@rate_limit(calls=30, period=60)
async def create_expense(
    expense: ExpenseCreateRequest,
    token_data: dict = Depends(verify_token)
):
    """Create a new expense"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    
    try:
        # Insert expense
        expense_data = {
            "user_id": user_id,
            "amount": float(expense.amount),
            "category": expense.category,
            "description": expense.description,
            "date": expense.date.isoformat(),
            "location": expense.location
        }
        
        result = supabase.table("expenses").insert(expense_data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create expense"
            )
        
        # Update budget category spent amount
        category_result = supabase.table("budget_categories").select("*").eq("user_id", user_id).eq("name", expense.category).execute()
        
        if category_result.data:
            new_spent = float(category_result.data[0]["spent_amount"]) + float(expense.amount)
            supabase.table("budget_categories").update({
                "spent_amount": new_spent,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", category_result.data[0]["id"]).execute()
        
        logger.info(f"Expense created successfully for user {user_id}")
        return {
            "success": True,
            "data": result.data[0],
            "message": "Expense created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating expense: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create expense"
        )

@router.get("/expenses")
@rate_limit(calls=60, period=60)
async def get_expenses(
    category: Optional[str] = Query(None, description="Filter by category"),
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    limit: int = Query(50, ge=1, le=100, description="Number of expenses to return"),
    offset: int = Query(0, ge=0, description="Number of expenses to skip"),
    token_data: dict = Depends(verify_token)
):
    """Get expenses with optional filters"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    
    try:
        query = supabase.table("expenses").select("*").eq("user_id", user_id)
        
        if category:
            query = query.eq("category", category)
        if start_date:
            query = query.gte("date", start_date.isoformat())
        if end_date:
            query = query.lte("date", end_date.isoformat())
        
        result = query.order("date", desc=True).range(offset, offset + limit - 1).execute()
        
        # Get total count for pagination
        count_query = supabase.table("expenses").select("id", count="exact").eq("user_id", user_id)
        if category:
            count_query = count_query.eq("category", category)
        if start_date:
            count_query = count_query.gte("date", start_date.isoformat())
        if end_date:
            count_query = count_query.lte("date", end_date.isoformat())
        
        count_result = count_query.execute()
        total_count = count_result.count if count_result.count is not None else 0
        
        return {
            "success": True,
            "data": result.data,
            "pagination": {
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total_count
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching expenses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch expenses"
        )

@router.put("/expenses/{expense_id}")
@rate_limit(calls=30, period=60)
async def update_expense(
    expense_id: str,
    expense_update: ExpenseUpdateRequest,
    token_data: dict = Depends(verify_token)
):
    """Update an expense"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    
    try:
        # Check if expense exists and belongs to user
        existing = supabase.table("expenses").select("*").eq("id", expense_id).eq("user_id", user_id).execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )
        
        # Build update data
        update_data = {}
        if expense_update.amount is not None:
            update_data["amount"] = float(expense_update.amount)
        if expense_update.category is not None:
            update_data["category"] = expense_update.category
        if expense_update.description is not None:
            update_data["description"] = expense_update.description
        if expense_update.date is not None:
            update_data["date"] = expense_update.date.isoformat()
        if expense_update.location is not None:
            update_data["location"] = expense_update.location
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No update data provided"
            )
        
        result = supabase.table("expenses").update(update_data).eq("id", expense_id).execute()
        
        logger.info(f"Expense {expense_id} updated successfully for user {user_id}")
        return {
            "success": True,
            "data": result.data[0] if result.data else None,
            "message": "Expense updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating expense: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update expense"
        )

@router.delete("/expenses/{expense_id}")
@rate_limit(calls=30, period=60)
async def delete_expense(
    expense_id: str,
    token_data: dict = Depends(verify_token)
):
    """Delete an expense"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    
    try:
        # Check if expense exists and belongs to user
        existing = supabase.table("expenses").select("*").eq("id", expense_id).eq("user_id", user_id).execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )
        
        expense_data = existing.data[0]
        
        # Delete expense
        supabase.table("expenses").delete().eq("id", expense_id).execute()
        
        # Update budget category spent amount
        category_result = supabase.table("budget_categories").select("*").eq("user_id", user_id).eq("name", expense_data["category"]).execute()
        
        if category_result.data:
            new_spent = max(0, float(category_result.data[0]["spent_amount"]) - float(expense_data["amount"]))
            supabase.table("budget_categories").update({
                "spent_amount": new_spent,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", category_result.data[0]["id"]).execute()
        
        logger.info(f"Expense {expense_id} deleted successfully for user {user_id}")
        return {
            "success": True,
            "message": "Expense deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting expense: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete expense"
        )

# Budget endpoints
@router.get("/budgets")
@rate_limit(calls=60, period=60)
async def get_budgets(token_data: dict = Depends(verify_token)):
    """Get user's budget categories and summary"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    
    try:
        # Get budget categories
        categories_result = supabase.table("budget_categories").select("*").eq("user_id", user_id).execute()
        
        # Calculate summary
        total_budgeted = sum(float(cat["budgeted_amount"]) for cat in categories_result.data)
        total_spent = sum(float(cat["spent_amount"]) for cat in categories_result.data)
        
        return {
            "success": True,
            "data": {
                "categories": categories_result.data,
                "summary": {
                    "total_budgeted": total_budgeted,
                    "total_spent": total_spent,
                    "total_remaining": total_budgeted - total_spent,
                    "progress_percentage": (total_spent / total_budgeted * 100) if total_budgeted > 0 else 0
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching budgets: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch budgets"
        )

@router.put("/budgets")
@rate_limit(calls=20, period=60)
async def update_budgets(
    budget_update: BudgetUpdateRequest,
    token_data: dict = Depends(verify_token)
):
    """Update budget categories"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    
    try:
        # Get existing categories
        existing_result = supabase.table("budget_categories").select("*").eq("user_id", user_id).execute()
        existing_categories = {cat["name"]: cat for cat in existing_result.data}
        
        updated_categories = []
        
        for category_data in budget_update.categories:
            category_name = category_data["name"]
            budgeted_amount = float(category_data["budgeted_amount"])
            
            if category_name in existing_categories:
                # Update existing category
                result = supabase.table("budget_categories").update({
                    "budgeted_amount": budgeted_amount,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", existing_categories[category_name]["id"]).execute()
                updated_categories.extend(result.data)
            else:
                # Create new category
                result = supabase.table("budget_categories").insert({
                    "user_id": user_id,
                    "name": category_name,
                    "budgeted_amount": budgeted_amount,
                    "spent_amount": 0,
                    "color": category_data.get("color", "#8B5CF6")
                }).execute()
                updated_categories.extend(result.data)
        
        logger.info(f"Budgets updated successfully for user {user_id}")
        return {
            "success": True,
            "data": updated_categories,
            "message": "Budgets updated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error updating budgets: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update budgets"
        )

# Income endpoints
@router.get("/income")
@rate_limit(calls=60, period=60)
async def get_income(
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    limit: int = Query(50, ge=1, le=100, description="Number of entries to return"),
    offset: int = Query(0, ge=0, description="Number of entries to skip"),
    token_data: dict = Depends(verify_token)
):
    """Get income entries"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    
    try:
        query = supabase.table("income_entries").select("*").eq("user_id", user_id)
        
        if start_date:
            query = query.gte("date", start_date.isoformat())
        if end_date:
            query = query.lte("date", end_date.isoformat())
        
        result = query.order("date", desc=True).range(offset, offset + limit - 1).execute()
        
        # Get total count
        count_query = supabase.table("income_entries").select("id", count="exact").eq("user_id", user_id)
        if start_date:
            count_query = count_query.gte("date", start_date.isoformat())
        if end_date:
            count_query = count_query.lte("date", end_date.isoformat())
        
        count_result = count_query.execute()
        total_count = count_result.count if count_result.count is not None else 0
        
        # Calculate total income
        total_income = sum(float(entry["amount"]) for entry in result.data)
        
        return {
            "success": True,
            "data": {
                "entries": result.data,
                "total_income": total_income,
                "pagination": {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "has_more": offset + limit < total_count
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching income: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch income"
        )

@router.post("/income")
@rate_limit(calls=30, period=60)
async def create_income(
    income: IncomeCreateRequest,
    token_data: dict = Depends(verify_token)
):
    """Log new income entry"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    
    try:
        income_data = {
            "user_id": user_id,
            "amount": float(income.amount),
            "source": income.source,
            "description": income.description,
            "date": income.date.isoformat(),
            "type": income.type
        }
        
        result = supabase.table("income_entries").insert(income_data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create income entry"
            )
        
        logger.info(f"Income entry created successfully for user {user_id}")
        return {
            "success": True,
            "data": result.data[0],
            "message": "Income entry created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating income: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create income entry"
        )

# Hustle endpoints
@router.get("/hustles")
@rate_limit(calls=60, period=60)
async def get_hustles(
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, ge=1, le=50, description="Number of hustles to return"),
    offset: int = Query(0, ge=0, description="Number of hustles to skip"),
    token_data: dict = Depends(verify_token)
):
    """Get money-making opportunities and user's tracked hustles"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    
    try:
        # Get user's money maker ideas
        query = supabase.table("money_maker_ideas").select("*").eq("user_id", user_id)
        
        if category:
            query = query.eq("category", category)
        if status:
            query = query.eq("status", status)
        
        result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        # Get hustle opportunities (general marketplace)
        opportunities_query = supabase.table("hustle_opportunities").select("*")
        if category:
            opportunities_query = opportunities_query.eq("category", category)
        
        opportunities_result = opportunities_query.limit(10).execute()
        
        return {
            "success": True,
            "data": {
                "user_hustles": result.data,
                "opportunities": opportunities_result.data,
                "total_monthly_income": sum(float(hustle["monthly_income"]) for hustle in result.data if hustle["status"] == "Active")
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching hustles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch hustles"
        )

@router.post("/hustles/track")
@rate_limit(calls=20, period=60)
async def track_hustle_attempt(
    attempt: HustleTrackRequest,
    token_data: dict = Depends(verify_token)
):
    """Track a hustle attempt and earnings"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    
    try:
        # Check if hustle exists and belongs to user
        hustle_result = supabase.table("money_maker_ideas").select("*").eq("id", attempt.hustle_id).eq("user_id", user_id).execute()
        
        if not hustle_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hustle not found"
            )
        
        # Create attempt record (you may need to create this table)
        attempt_data = {
            "user_id": user_id,
            "hustle_id": attempt.hustle_id,
            "earnings": float(attempt.earnings) if attempt.earnings else 0,
            "time_spent": attempt.time_spent,
            "status": attempt.status,
            "notes": attempt.notes,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # For now, update the hustle's monthly income if earnings were made
        if attempt.earnings and attempt.status == "completed":
            current_income = float(hustle_result.data[0]["monthly_income"])
            updated_income = current_income + float(attempt.earnings)
            
            supabase.table("money_maker_ideas").update({
                "monthly_income": updated_income,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", attempt.hustle_id).execute()
        
        logger.info(f"Hustle attempt tracked successfully for user {user_id}")
        return {
            "success": True,
            "data": attempt_data,
            "message": "Hustle attempt tracked successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking hustle attempt: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track hustle attempt"
        )
