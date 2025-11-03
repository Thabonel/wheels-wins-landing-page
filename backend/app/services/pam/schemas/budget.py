"""
Pydantic validation schemas for Budget tools

Amendment #4: Input validation for all 10 budget tools
"""

from pydantic import Field, validator
from typing import Optional, List
from enum import Enum

from app.services.pam.schemas.base import BaseToolInput, AmountInput, DateInput


class ExpenseCategory(str, Enum):
    """Valid expense categories"""
    GAS = "gas"
    DIESEL = "diesel"
    PROPANE = "propane"
    FOOD = "food"
    GROCERIES = "groceries"
    RESTAURANT = "restaurant"
    CAMPGROUND = "campground"
    RV_PARK = "rv_park"
    MAINTENANCE = "maintenance"
    REPAIR = "repair"
    INSURANCE = "insurance"
    REGISTRATION = "registration"
    TOLLS = "tolls"
    PARKING = "parking"
    ENTERTAINMENT = "entertainment"
    SHOPPING = "shopping"
    MEDICAL = "medical"
    PET = "pet"
    UTILITIES = "utilities"
    INTERNET = "internet"
    PHONE = "phone"
    OTHER = "other"


class BudgetPeriod(str, Enum):
    """Valid budget periods"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class CreateExpenseInput(BaseToolInput, AmountInput, DateInput):
    """Validation for create_expense tool"""

    category: ExpenseCategory = Field(..., description="Expense category")
    description: Optional[str] = Field(None, max_length=500, description="Expense description")
    location: Optional[str] = Field(None, max_length=200, description="Where expense occurred")

    @validator("description")
    def validate_description(cls, v):
        """Clean up description"""
        if v:
            return v.strip()
        return v


class UpdateBudgetInput(BaseToolInput):
    """Validation for update_budget tool"""

    category: ExpenseCategory = Field(..., description="Budget category to update")
    amount: float = Field(..., gt=0, description="New budget amount (must be positive)")
    period: BudgetPeriod = Field(BudgetPeriod.MONTHLY, description="Budget period")

    @validator("amount")
    def validate_budget_amount(cls, v):
        """Ensure reasonable budget amount"""
        if v > 100_000:
            raise ValueError("Budget amount must be less than $100,000 per period")
        return round(v, 2)


class GetSpendingSummaryInput(BaseToolInput):
    """Validation for get_spending_summary tool"""

    category: Optional[ExpenseCategory] = Field(None, description="Filter by category (optional)")
    period: BudgetPeriod = Field(BudgetPeriod.MONTHLY, description="Summary period")
    start_date: Optional[str] = Field(None, description="Start date (ISO format)")
    end_date: Optional[str] = Field(None, description="End date (ISO format)")

    @validator("start_date", "end_date")
    def validate_dates(cls, v):
        """Validate date format"""
        if v is None:
            return None
        from datetime import datetime
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except (ValueError, AttributeError):
            raise ValueError("Dates must be in ISO format")


class CompareVsBudgetInput(BaseToolInput):
    """Validation for compare_vs_budget tool"""

    category: Optional[ExpenseCategory] = Field(None, description="Compare specific category (optional)")
    period: BudgetPeriod = Field(BudgetPeriod.MONTHLY, description="Comparison period")


class PredictEndOfMonthInput(BaseToolInput):
    """Validation for predict_end_of_month tool"""

    category: Optional[ExpenseCategory] = Field(None, description="Predict specific category (optional)")
    include_trends: bool = Field(True, description="Include spending trends in prediction")


class FindSavingsOpportunitiesInput(BaseToolInput):
    """Validation for find_savings_opportunities tool"""

    min_savings: float = Field(10.0, gt=0, description="Minimum savings to recommend ($)")
    categories: Optional[List[ExpenseCategory]] = Field(None, description="Focus on specific categories")

    @validator("min_savings")
    def validate_min_savings(cls, v):
        """Ensure reasonable minimum"""
        if v > 1000:
            raise ValueError("min_savings must be less than $1,000")
        return round(v, 2)


class CategorizeTransactionInput(BaseToolInput, AmountInput):
    """Validation for categorize_transaction tool"""

    description: str = Field(..., min_length=1, max_length=500, description="Transaction description")
    merchant: Optional[str] = Field(None, max_length=200, description="Merchant name")

    @validator("description")
    def validate_description(cls, v):
        """Ensure non-empty description"""
        v = v.strip()
        if not v:
            raise ValueError("description cannot be empty")
        return v


class ExportBudgetReportInput(BaseToolInput):
    """Validation for export_budget_report tool"""

    format: str = Field("pdf", description="Export format (pdf, csv, json)")
    period: BudgetPeriod = Field(BudgetPeriod.MONTHLY, description="Report period")
    start_date: Optional[str] = Field(None, description="Start date (ISO format)")
    end_date: Optional[str] = Field(None, description="End date (ISO format)")

    @validator("format")
    def validate_format(cls, v):
        """Ensure valid export format"""
        valid_formats = ["pdf", "csv", "json", "xlsx"]
        v = v.lower()
        if v not in valid_formats:
            raise ValueError(f"format must be one of: {', '.join(valid_formats)}")
        return v


class AnalyzeBudgetInput(BaseToolInput):
    """Validation for analyze_budget tool"""

    include_predictions: bool = Field(True, description="Include spending predictions")
    include_recommendations: bool = Field(True, description="Include savings recommendations")
    period: BudgetPeriod = Field(BudgetPeriod.MONTHLY, description="Analysis period")


class TrackSavingsInput(BaseToolInput, AmountInput):
    """Validation for track_savings tool"""

    category: str = Field(..., min_length=1, max_length=100, description="Savings category (gas, campground, etc)")
    description: Optional[str] = Field(None, max_length=500, description="How money was saved")
    event_type: str = Field("other", description="Type of savings event")

    @validator("category")
    def validate_category(cls, v):
        """Clean up category"""
        return v.strip().lower()

    @validator("event_type")
    def validate_event_type(cls, v):
        """Ensure valid event type"""
        valid_types = ["gas", "campground", "route", "other"]
        v = v.lower()
        if v not in valid_types:
            return "other"
        return v
