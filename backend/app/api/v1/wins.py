
"""
WINS API Endpoints
Financial management and budget tracking endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, date

from app.models.schemas.wins import (
    BudgetCreateRequest, ExpenseCreateRequest, IncomeSourceCreateRequest,
    BudgetResponse, ExpenseAnalyticsResponse, FinancialSummaryResponse
)
from app.services.database import get_database_service
from app.services.analytics.analytics import analytics, FeatureUsageEvent
from app.core.logging import setup_logging, get_logger

router = APIRouter()
setup_logging()
logger = get_logger(__name__)

@router.post("/budgets", response_model=BudgetResponse)
async def create_budget(request: BudgetCreateRequest):
    """Create a new budget"""
    try:
        db_service = get_database_service()
        
        # Create budget
        query = """
            INSERT INTO budgets (user_id, name, start_date, end_date, category, budgeted_amount)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        """
        
        result = await db_service.execute_single(
            query, request.user_id, request.name, request.start_date,
            request.end_date, request.category, request.budgeted_amount
        )
        
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create budget")

        await analytics.track_feature_usage(
            FeatureUsageEvent(
                feature_name="create_budget",
                feature_category="wins",
                user_id=request.user_id,
                usage_context="api"
            )
        )
        
        return BudgetResponse(
            id=result['id'],
            user_id=request.user_id,
            name=request.name,
            start_date=request.start_date,
            end_date=request.end_date,
            total_budgeted=request.budgeted_amount,
            total_spent=0,
            created_at=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Budget creation error: {e}")
        raise HTTPException(status_code=500, detail="Could not create budget")

@router.get("/budgets/{user_id}")
async def get_user_budgets(user_id: str):
    """Get all budgets for a user"""
    try:
        db_service = get_database_service()
        
        query = """
            SELECT name, total_budget, total_spent, total_remaining
            FROM budget_summary
            WHERE user_id = $1
            ORDER BY name
        """
        
        budgets = await db_service.execute_query(query, user_id)
        
        return {
            "user_id": user_id,
            "budgets": budgets,
            "total_budgets": len(budgets)
        }
        
    except Exception as e:
        logger.error(f"Budget retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve budgets")

@router.post("/expenses")
async def create_expense(request: ExpenseCreateRequest):
    """Log a new expense"""
    try:
        db_service = get_database_service()
        
        query = """
            INSERT INTO expenses (user_id, amount, category, description, date)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        """
        
        result = await db_service.execute_single(
            query, request.user_id, request.amount, request.category,
            request.description, request.date or date.today()
        )
        
        if not result:
            raise HTTPException(status_code=400, detail="Failed to log expense")
        
        # Update budget if exists
        update_query = """
            UPDATE budget_categories 
            SET spent_amount = spent_amount + $3, updated_at = NOW()
            WHERE user_id = $1 AND name = $2
        """
        
        await db_service.execute_mutation(
            update_query, request.user_id, request.category, request.amount
        )

        await analytics.track_feature_usage(
            FeatureUsageEvent(
                feature_name="create_expense",
                feature_category="wins",
                user_id=request.user_id,
                usage_context="api",
                parameters={"category": request.category}
            )
        )
        
        return {
            "id": result['id'],
            "status": "success",
            "message": f"Logged ${request.amount} expense in {request.category}"
        }
        
    except Exception as e:
        logger.error(f"Expense creation error: {e}")
        raise HTTPException(status_code=500, detail="Could not log expense")

@router.get("/expenses/{user_id}")
async def get_user_expenses(
    user_id: str,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 50
):
    """Get expenses for a user with optional filters"""
    try:
        db_service = get_database_service()
        
        # Validate limit parameter to prevent abuse
        if limit < 1 or limit > 1000:
            limit = 50
        
        # Use parameterized query with conditional WHERE clauses
        query = """
            SELECT id, amount, category, description, date, created_at
            FROM expenses 
            WHERE user_id = $1
            AND ($2::text IS NULL OR category = $2)
            AND ($3::date IS NULL OR date >= $3)
            AND ($4::date IS NULL OR date <= $4)
            ORDER BY date DESC 
            LIMIT $5
        """
        
        params = [user_id, category, start_date, end_date, limit]
        expenses = await db_service.execute_query(query, *params)
        
        # Calculate totals
        total_amount = sum(float(exp['amount']) for exp in expenses)
        
        return {
            "user_id": user_id,
            "expenses": expenses,
            "total_expenses": len(expenses),
            "total_amount": total_amount,
            "filters": {
                "category": category,
                "start_date": start_date,
                "end_date": end_date
            }
        }
        
    except Exception as e:
        logger.error(f"Expense retrieval error: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve expenses")

@router.post("/income")
async def create_income_entry(request: IncomeSourceCreateRequest):
    """Log income entry"""
    try:
        db_service = get_database_service()
        
        query = """
            INSERT INTO income_entries (user_id, amount, source, description, date, type)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        """
        
        result = await db_service.execute_single(
            query, request.user_id, request.amount, request.source_name,
            request.description, date.today(), request.income_type
        )
        
        if not result:
            raise HTTPException(status_code=400, detail="Failed to log income")

        await analytics.track_feature_usage(
            FeatureUsageEvent(
                feature_name="create_income",
                feature_category="wins",
                user_id=request.user_id,
                usage_context="api",
                parameters={"source": request.source_name}
            )
        )

        return {
            "id": result['id'],
            "status": "success",
            "message": f"Logged ${request.amount} income from {request.source_name}"
        }
        
    except Exception as e:
        logger.error(f"Income creation error: {e}")
        raise HTTPException(status_code=500, detail="Could not log income")

@router.get("/financial-summary/{user_id}")
async def get_financial_summary(user_id: str, days: int = 30):
    """Get financial summary for user"""
    try:
        db_service = get_database_service()
        
        # Get expenses summary
        expense_query = """
            SELECT 
                SUM(amount) as total_expenses,
                COUNT(*) as expense_count,
                category,
                SUM(amount) as category_total
            FROM expenses 
            WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL $2
            GROUP BY category
            ORDER BY category_total DESC
        """
        
        # Use parameterized query with proper interval construction
        interval_days = f"{days} days"
        expenses = await db_service.execute_query(expense_query, user_id, interval_days)
        
        # Get income summary  
        income_query = """
            SELECT 
                SUM(amount) as total_income,
                COUNT(*) as income_count
            FROM income_entries 
            WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL $2
        """
        
        income_result = await db_service.execute_single(income_query, user_id, interval_days)
        
        total_expenses = sum(float(exp['category_total']) for exp in expenses)
        total_income = float(income_result['total_income']) if income_result['total_income'] else 0
        net_income = total_income - total_expenses

        await analytics.track_feature_usage(
            FeatureUsageEvent(
                feature_name="financial_summary",
                feature_category="wins",
                user_id=user_id,
                usage_context="api",
                parameters={"days": days}
            )
        )

        return FinancialSummaryResponse(
            user_id=user_id,
            period_days=days,
            total_income=total_income,
            total_expenses=total_expenses,
            net_income=net_income,
            expense_categories=[
                {
                    "category": exp['category'],
                    "amount": float(exp['category_total']),
                    "count": exp['expense_count']
                }
                for exp in expenses
            ],
            generated_at=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Financial summary error: {e}")
        raise HTTPException(status_code=500, detail="Could not generate financial summary")
