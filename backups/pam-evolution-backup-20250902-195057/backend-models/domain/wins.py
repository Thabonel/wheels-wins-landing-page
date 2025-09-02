
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
from decimal import Decimal

class BudgetStatus(str, Enum):
    ON_TRACK = "on_track"
    OVER_BUDGET = "over_budget"
    UNDER_BUDGET = "under_budget"
    WARNING = "warning"

class IncomeType(str, Enum):
    WORK = "work"
    SIDE_HUSTLE = "side_hustle" 
    PASSIVE = "passive"
    CONTENT = "content"
    OTHER = "other"

class HustleStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"
    PLANNING = "planning"

class ExpenseCategory(BaseModel):
    id: str
    user_id: str
    name: str
    budgeted_amount: Decimal
    spent_amount: Decimal = Decimal('0')
    color: str = "#8B5CF6"
    created_at: datetime
    updated_at: datetime
    
    @property
    def remaining_amount(self) -> Decimal:
        return self.budgeted_amount - self.spent_amount
    
    @property
    def progress_percentage(self) -> float:
        if self.budgeted_amount == 0:
            return 0.0
        return float((self.spent_amount / self.budgeted_amount) * 100)
    
    @property
    def status(self) -> BudgetStatus:
        if self.spent_amount > self.budgeted_amount:
            return BudgetStatus.OVER_BUDGET
        elif self.progress_percentage >= 90:
            return BudgetStatus.WARNING
        elif self.progress_percentage <= 50:
            return BudgetStatus.UNDER_BUDGET
        else:
            return BudgetStatus.ON_TRACK

class Expense(BaseModel):
    id: str
    user_id: str
    amount: Decimal
    category: str
    description: str
    date: date
    location: Optional[str] = None
    receipt_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

class Budget(BaseModel):
    id: str
    user_id: str
    name: str
    start_date: date
    end_date: date
    categories: List[ExpenseCategory] = Field(default_factory=list)
    total_budgeted: Decimal = Decimal('0')
    total_spent: Decimal = Decimal('0')
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    
    @property
    def total_remaining(self) -> Decimal:
        return self.total_budgeted - self.total_spent
    
    @property
    def overall_progress(self) -> float:
        if self.total_budgeted == 0:
            return 0.0
        return float((self.total_spent / self.total_budgeted) * 100)

class IncomeSource(BaseModel):
    id: str
    user_id: str
    source_name: str
    income_type: IncomeType
    monthly_amount: Decimal = Decimal('0')
    description: Optional[str] = None
    is_active: bool = True
    started_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

class IncomeEntry(BaseModel):
    id: str
    user_id: str
    source_id: Optional[str] = None
    amount: Decimal
    source_name: str
    income_type: IncomeType
    date: date
    description: Optional[str] = None
    tax_category: Optional[str] = None
    created_at: datetime

class HustleIdea(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    category: str
    status: HustleStatus = HustleStatus.PLANNING
    monthly_income: Decimal = Decimal('0')
    time_investment_hours: Optional[int] = None
    startup_cost: Optional[Decimal] = None
    difficulty_level: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None
    started_date: Optional[date] = None
    paused_date: Optional[date] = None
    archived_date: Optional[date] = None
    tags: List[str] = Field(default_factory=list)
    resources: List[str] = Field(default_factory=list)
    progress_percentage: int = Field(0, ge=0, le=100)
    created_at: datetime
    updated_at: datetime

class FinancialTip(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    category: str
    savings_amount: Optional[Decimal] = None
    votes: int = 0
    is_shared: bool = False
    tags: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

class BudgetSummary(BaseModel):
    user_id: str
    period_start: date
    period_end: date
    total_budgeted: Decimal
    total_spent: Decimal
    total_remaining: Decimal
    categories_count: int
    over_budget_categories: List[str] = Field(default_factory=list)
    top_expense_category: Optional[str] = None
    savings_rate: Optional[float] = None
    generated_at: datetime

class FinancialGoal(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    target_amount: Decimal
    current_amount: Decimal = Decimal('0')
    target_date: Optional[date] = None
    category: str
    is_achieved: bool = False
    created_at: datetime
    updated_at: datetime
    
    @property
    def progress_percentage(self) -> float:
        if self.target_amount == 0:
            return 0.0
        return float((self.current_amount / self.target_amount) * 100)
