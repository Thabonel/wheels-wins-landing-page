
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal
from ..domain.wins import (
    Budget, Expense, ExpenseCategory, IncomeSource, IncomeEntry, 
    HustleIdea, FinancialTip, FinancialGoal, BudgetStatus, IncomeType, HustleStatus
)

class BudgetCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    start_date: date
    end_date: date
    categories: List[Dict[str, Any]] = Field(..., min_items=1)
    
    @validator('end_date')
    def end_date_after_start(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v

class BudgetUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    end_date: Optional[date] = None
    is_active: Optional[bool] = None

class ExpenseCategoryRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    budgeted_amount: Decimal = Field(..., gt=0)
    color: str = Field("#8B5CF6", regex="^#[0-9A-Fa-f]{6}$")

class ExpenseCreateRequest(BaseModel):
    amount: Decimal = Field(..., gt=0)
    category: str = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1, max_length=200)
    date: date
    location: Optional[str] = Field(None, max_length=100)
    tags: List[str] = Field(default_factory=list)
    receipt_url: Optional[str] = None

class ExpenseUpdateRequest(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, min_length=1, max_length=200)
    date: Optional[date] = None
    location: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = None

class ExpenseSearchRequest(BaseModel):
    category: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    min_amount: Optional[Decimal] = Field(None, ge=0)
    max_amount: Optional[Decimal] = Field(None, ge=0)
    tags: Optional[List[str]] = None
    location: Optional[str] = None

class IncomeSourceCreateRequest(BaseModel):
    source_name: str = Field(..., min_length=1, max_length=100)
    income_type: IncomeType
    monthly_amount: Decimal = Field(Decimal('0'), ge=0)
    description: Optional[str] = Field(None, max_length=500)
    started_date: Optional[date] = None

class IncomeSourceUpdateRequest(BaseModel):
    source_name: Optional[str] = Field(None, min_length=1, max_length=100)
    monthly_amount: Optional[Decimal] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None

class IncomeEntryCreateRequest(BaseModel):
    source_id: Optional[str] = None
    amount: Decimal = Field(..., gt=0)
    source_name: str = Field(..., min_length=1, max_length=100)
    income_type: IncomeType
    date: date
    description: Optional[str] = Field(None, max_length=200)
    tax_category: Optional[str] = Field(None, max_length=50)

class HustleIdeaCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=1000)
    category: str = Field(..., min_length=1, max_length=50)
    time_investment_hours: Optional[int] = Field(None, ge=1)
    startup_cost: Optional[Decimal] = Field(None, ge=0)
    difficulty_level: Optional[int] = Field(None, ge=1, le=5)
    tags: List[str] = Field(default_factory=list)
    resources: List[str] = Field(default_factory=list)

class HustleIdeaUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=1000)
    status: Optional[HustleStatus] = None
    monthly_income: Optional[Decimal] = Field(None, ge=0)
    progress_percentage: Optional[int] = Field(None, ge=0, le=100)
    notes: Optional[str] = Field(None, max_length=1000)

class FinancialGoalCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    target_amount: Decimal = Field(..., gt=0)
    target_date: Optional[date] = None
    category: str = Field(..., min_length=1, max_length=50)

class FinancialGoalUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    current_amount: Optional[Decimal] = Field(None, ge=0)
    target_amount: Optional[Decimal] = Field(None, gt=0)
    target_date: Optional[date] = None
    is_achieved: Optional[bool] = None

class BudgetResponse(BaseModel):
    budget: Budget
    progress_summary: Dict[str, Any]
    spending_trends: List[Dict[str, Any]]
    recommendations: List[str] = Field(default_factory=list)

class ExpenseAnalyticsResponse(BaseModel):
    total_expenses: Decimal
    category_breakdown: Dict[str, Decimal]
    monthly_trends: List[Dict[str, Any]]
    top_merchants: List[Dict[str, Any]]
    budget_comparison: Dict[str, Any]

class IncomeAnalyticsResponse(BaseModel):
    total_income: Decimal
    source_breakdown: Dict[str, Decimal]
    monthly_trends: List[Dict[str, Any]]
    growth_rate: Optional[float] = None
    projections: List[Dict[str, Any]] = Field(default_factory=list)

class FinancialSummaryResponse(BaseModel):
    period_start: date
    period_end: date
    total_income: Decimal
    total_expenses: Decimal
    net_savings: Decimal
    savings_rate: float
    budget_status: BudgetStatus
    goals_progress: List[Dict[str, Any]]
    recommendations: List[str] = Field(default_factory=list)

class HustleTrackingResponse(BaseModel):
    active_hustles: List[HustleIdea]
    total_monthly_income: Decimal
    success_rate: float
    top_categories: List[str]
    progress_summary: Dict[str, Any]
