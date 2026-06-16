"""
Pam V2 money adapter: expenses, budgets, and financial tools.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from app.services.pam.tools.budget.categorize_transaction import categorize_transaction
from app.services.pam.tools.budget.create_expense import create_expense
from app.services.pam.tools.budget.get_spending_summary import get_spending_summary
from app.services.pam.tools.budget.update_budget import update_budget

from ..catalog import catalog
from ..handlers import register_handler
from ..namespaces import MONEY
from ..types import (
    ApprovalPolicy,
    ToolContext,
    ToolEffect,
    ToolResult,
    ToolRisk,
    ToolScope,
    ToolSpec,
)


# ---- add_expense (WRITE, requires approval) ----

class AddExpenseInput(BaseModel):
    amount: float = Field(..., gt=0, description="Expense amount")
    category: str = Field(..., min_length=1, max_length=100, description="Expense category")
    description: Optional[str] = Field(default=None, max_length=500)
    date: Optional[str] = Field(default=None, description="ISO date (defaults to today)")


class AddExpenseOutput(BaseModel):
    expense: dict


add_expense_tool = ToolSpec(
    name="add_expense",
    description="Log a new expense. Requires explicit approval.",
    namespace=MONEY.name,
    input_schema=AddExpenseInput,
    output_schema=AddExpenseOutput,
    effect=ToolEffect.WRITE,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.EXPLICIT,
    idempotent=True,
)


@register_handler(add_expense_tool.name)
async def handle_add_expense(context: ToolContext, input: AddExpenseInput) -> ToolResult:
    try:
        result = await create_expense(
            user_id=context.user_id,
            amount=input.amount,
            category=input.category,
            description=input.description,
            date=input.date,
        )
        if not result.get("success"):
            return ToolResult(
                success=False,
                error_code="expense_add_failed",
                error_message=result.get("message", "Could not add expense"),
            )
        return ToolResult(
            success=True,
            data={"expense": result.get("expense", {})},
            summary=result.get("message", f"Added ${input.amount:.2f} expense"),
        )
    except Exception as exc:
        return ToolResult(
            success=False,
            error_code="expense_tool_error",
            error_message=f"Expense creation failed: {type(exc).__name__}",
        )


catalog.register(add_expense_tool)


# ---- get_spending (READ) ----

class GetSpendingInput(BaseModel):
    category: Optional[str] = Field(default=None, max_length=100)
    period: str = Field(default="monthly", pattern="^(daily|weekly|monthly|yearly)$")
    start_date: Optional[str] = Field(default=None, description="ISO start date")
    end_date: Optional[str] = Field(default=None, description="ISO end date")


class GetSpendingOutput(BaseModel):
    total_amount: float
    expense_count: int
    daily_average: float
    by_category: dict
    period: str


get_spending_tool = ToolSpec(
    name="get_spending",
    description="Get spending summary and analysis.",
    namespace=MONEY.name,
    input_schema=GetSpendingInput,
    output_schema=GetSpendingOutput,
    effect=ToolEffect.READ,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(get_spending_tool.name)
async def handle_get_spending(context: ToolContext, input: GetSpendingInput) -> ToolResult:
    try:
        result = await get_spending_summary(
            user_id=context.user_id,
            category=input.category,
            period=input.period,
            start_date=input.start_date,
            end_date=input.end_date,
        )
        if not result.get("success"):
            return ToolResult(
                success=False,
                error_code="spending_failed",
                error_message="Could not retrieve spending summary",
            )
        return ToolResult(
            success=True,
            data={
                "total_amount": result.get("total_amount", 0),
                "expense_count": result.get("expense_count", 0),
                "daily_average": result.get("daily_average", 0),
                "by_category": result.get("by_category", {}),
                "period": result.get("period", input.period),
            },
            summary=f"Spent ${result.get('total_amount', 0):.2f} across {result.get('expense_count', 0)} expenses",
        )
    except Exception as exc:
        return ToolResult(
            success=False,
            error_code="spending_tool_error",
            error_message=f"Spending lookup failed: {type(exc).__name__}",
        )


catalog.register(get_spending_tool)


# ---- set_budget (WRITE, requires approval) ----

class SetBudgetInput(BaseModel):
    category: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0, description="Monthly budget limit")


class SetBudgetOutput(BaseModel):
    action: str
    budget: dict


set_budget_tool = ToolSpec(
    name="set_budget",
    description="Set or update a monthly budget for a category. Requires explicit approval.",
    namespace=MONEY.name,
    input_schema=SetBudgetInput,
    output_schema=SetBudgetOutput,
    effect=ToolEffect.WRITE,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.EXPLICIT,
    idempotent=True,
)


@register_handler(set_budget_tool.name)
async def handle_set_budget(context: ToolContext, input: SetBudgetInput) -> ToolResult:
    try:
        result = await update_budget(
            user_id=context.user_id,
            category=input.category,
            amount=input.amount,
        )
        if not result.get("success"):
            return ToolResult(
                success=False,
                error_code="budget_failed",
                error_message=result.get("message", "Could not set budget"),
            )
        return ToolResult(
            success=True,
            data={
                "action": result.get("action", "updated"),
                "budget": result.get("budget", {}),
            },
            summary=result.get("message", f"Set ${input.amount:.2f}/month budget for {input.category}"),
        )
    except Exception as exc:
        return ToolResult(
            success=False,
            error_code="budget_tool_error",
            error_message=f"Budget update failed: {type(exc).__name__}",
        )


catalog.register(set_budget_tool)


# ---- categorize_expense (WRITE, no approval needed) ----

class CategorizeExpenseInput(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)
    amount: Optional[float] = Field(default=None)
    merchant: Optional[str] = Field(default=None, max_length=200)


class CategorizeExpenseOutput(BaseModel):
    category: str
    confidence: str


categorize_expense_tool = ToolSpec(
    name="categorize_expense",
    description="Auto-categorize an expense based on its description.",
    namespace=MONEY.name,
    input_schema=CategorizeExpenseInput,
    output_schema=CategorizeExpenseOutput,
    effect=ToolEffect.WRITE,
    risk=ToolRisk.LOW,
    scope=ToolScope.OWN,
    approval_policy=ApprovalPolicy.NONE,
    idempotent=True,
)


@register_handler(categorize_expense_tool.name)
async def handle_categorize_expense(context: ToolContext, input: CategorizeExpenseInput) -> ToolResult:
    try:
        result = await categorize_transaction(
            user_id=context.user_id,
            description=input.description,
            amount=input.amount,
            merchant=input.merchant,
        )
        if not result.get("success"):
            return ToolResult(
                success=False,
                error_code="categorize_failed",
                error_message="Could not categorize expense",
            )
        return ToolResult(
            success=True,
            data={
                "category": result.get("category", "other"),
                "confidence": result.get("confidence", "low"),
            },
            summary=f"Categorized as: {result.get('category', 'other')}",
        )
    except Exception as exc:
        return ToolResult(
            success=False,
            error_code="categorize_tool_error",
            error_message=f"Categorization failed: {type(exc).__name__}",
        )


catalog.register(categorize_expense_tool)
