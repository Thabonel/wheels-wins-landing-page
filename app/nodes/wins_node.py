from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, date
from app.database.supabase_client import get_supabase_client
from app.core.logging import setup_logging

logger = setup_logging("wins_node")

class WinsNode:
    def __init__(self):
        self.supabase = get_supabase_client()
    
    # Budget Management
    async def create_budget(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new budget"""
        try:
            budget_data = {
                "user_id": user_id,
                "category": data.get("category"),
                "budgeted_amount": float(data.get("amount", 0)),
                "start_date": data.get("start_date", date.today()),
                "end_date": data.get("end_date", date.today().replace(month=12, day=31)),
                "name": data.get("name", f"{data.get('category', 'Budget')} Budget")
            }
            
            result = self.supabase.table("budgets").insert(budget_data).execute()
            logger.info(f"Created budget for user {user_id}")
            return {"success": True, "budget": result.data[0]}
        except Exception as e:
            logger.error(f"Error creating budget: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_budgets(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all budgets for a user"""
        try:
            result = self.supabase.table("budgets").select("*").eq("user_id", user_id).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching budgets: {str(e)}")
            return []
    
    async def check_budget_status(self, user_id: str, category: str) -> Dict[str, Any]:
        """Check budget status and remaining amount"""
        try:
            # Get budget for this category
            budget_result = self.supabase.table("budgets").select("*").eq("user_id", user_id).eq("category", category).execute()
            if not budget_result.data:
                return {"status": "no_budget", "message": "No budget set for this category"}
            
            budget = budget_result.data[0]
            
            # Get expenses for this category in current budget period
            start_date = budget.get("start_date", date.today().replace(day=1))
            end_date = budget.get("end_date", date.today())
            
            expenses_result = self.supabase.table("expenses").select("amount").eq("user_id", user_id).eq("category", category).gte("date", start_date).lte("date", end_date).execute()
            
            total_spent = sum(float(expense["amount"]) for expense in expenses_result.data)
            budget_amount = float(budget["budgeted_amount"])
            remaining = budget_amount - total_spent
            percentage_used = (total_spent / budget_amount) * 100 if budget_amount > 0 else 0
            
            return {
                "status": "active",
                "budget_amount": budget_amount,
                "spent": total_spent,
                "remaining": remaining,
                "percentage_used": percentage_used,
                "alert": percentage_used > 90
            }
        except Exception as e:
            logger.error(f"Error checking budget status: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    # Expense Tracking
    async def add_expense(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new expense"""
        try:
            expense_data = {
                "user_id": user_id,
                "amount": float(data.get("amount", 0)),
                "category": data.get("category"),
                "description": data.get("description", ""),
                "date": data.get("date", date.today())
            }
            
            result = self.supabase.table("expenses").insert(expense_data).execute()
            
            # Check budget after adding expense
            budget_status = await self.check_budget_status(user_id, data.get("category"))
            
            response = {
                "success": True,
                "expense": result.data[0],
                "budget_status": budget_status
            }
            
            if budget_status.get("alert"):
                response["alert"] = f"Warning: You've used {budget_status['percentage_used']:.1f}% of your {data.get('category')} budget!"
            
            logger.info(f"Added expense for user {user_id}")
            return response
        except Exception as e:
            logger.error(f"Error adding expense: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_expenses(self, user_id: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get expenses with optional filters"""
        try:
            query = self.supabase.table("expenses").select("*").eq("user_id", user_id)
            
            if filters:
                if filters.get("category"):
                    query = query.eq("category", filters["category"])
                if filters.get("start_date"):
                    query = query.gte("date", filters["start_date"])
                if filters.get("end_date"):
                    query = query.lte("date", filters["end_date"])
            
            result = query.order("date", desc=True).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching expenses: {str(e)}")
            return []
    
    async def get_expense_analytics(self, user_id: str) -> Dict[str, Any]:
        """Get expense analytics and insights"""
        try:
            # Get current month expenses
            start_date = date.today().replace(day=1)
            expenses = await self.get_expenses(user_id, {"start_date": start_date.isoformat()})
            
            # Calculate totals by category
            category_totals = {}
            for expense in expenses:
                category = expense["category"]
                if category not in category_totals:
                    category_totals[category] = 0
                category_totals[category] += float(expense["amount"])
            
            # Get previous month for comparison
            prev_month = start_date.replace(month=start_date.month-1) if start_date.month > 1 else start_date.replace(year=start_date.year-1, month=12)
            prev_start = prev_month.replace(day=1)
            prev_end = start_date - timedelta(days=1)
            
            prev_expenses = await self.get_expenses(user_id, {
                "start_date": prev_start.isoformat(),
                "end_date": prev_end.isoformat()
            })
            prev_total = sum(float(expense["amount"]) for expense in prev_expenses)
            
            current_total = sum(float(expense["amount"]) for expense in expenses)
            
            return {
                "current_month_total": current_total,
                "previous_month_total": prev_total,
                "change_percentage": ((current_total - prev_total) / prev_total * 100) if prev_total > 0 else 0,
                "category_breakdown": category_totals,
                "daily_average": current_total / date.today().day,
                "top_category": max(category_totals.items(), key=lambda x: x[1])[0] if category_totals else None
            }
        except Exception as e:
            logger.error(f"Error getting expense analytics: {str(e)}")
            return {}
    
    # Income Management
    async def add_income(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Add income entry"""
        try:
            income_data = {
                "user_id": user_id,
                "amount": float(data.get("amount", 0)),
                "source": data.get("source"),
                "description": data.get("description", ""),
                "date": data.get("date", date.today()),
                "type": data.get("type", "regular")
            }
            
            result = self.supabase.table("income_entries").insert(income_data).execute()
            logger.info(f"Added income for user {user_id}")
            return {"success": True, "income": result.data[0]}
        except Exception as e:
            logger.error(f"Error adding income: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_income_entries(self, user_id: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get income entries with optional filters"""
        try:
            query = self.supabase.table("income_entries").select("*").eq("user_id", user_id)
            
            if filters:
                if filters.get("source"):
                    query = query.eq("source", filters["source"])
                if filters.get("start_date"):
                    query = query.gte("date", filters["start_date"])
                if filters.get("end_date"):
                    query = query.lte("date", filters["end_date"])
            
            result = query.order("date", desc=True).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching income entries: {str(e)}")
            return []
    
    async def get_financial_summary(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive financial summary"""
        try:
            # Get current month data
            start_date = date.today().replace(day=1)
            
            # Get expenses
            expenses = await self.get_expenses(user_id, {"start_date": start_date.isoformat()})
            total_expenses = sum(float(expense["amount"]) for expense in expenses)
            
            # Get income
            income_entries = await self.get_income_entries(user_id, {"start_date": start_date.isoformat()})
            total_income = sum(float(income["amount"]) for income_entries in income_entries)
            
            # Get budgets
            budgets = await self.get_budgets(user_id)
            total_budget = sum(float(budget["budgeted_amount"]) for budget in budgets)
            
            # Calculate savings and ratios
            net_income = total_income - total_expenses
            savings_rate = (net_income / total_income * 100) if total_income > 0 else 0
            budget_utilization = (total_expenses / total_budget * 100) if total_budget > 0 else 0
            
            return {
                "total_income": total_income,
                "total_expenses": total_expenses,
                "net_income": net_income,
                "total_budget": total_budget,
                "savings_rate": savings_rate,
                "budget_utilization": budget_utilization,
                "expense_count": len(expenses),
                "income_count": len(income_entries)
            }
        except Exception as e:
            logger.error(f"Error getting financial summary: {str(e)}")
            return {}

    
    async def categorize_expense(self, description: str, amount: float) -> str:
        """Automatically categorize expense based on description and amount"""
        try:
            description_lower = description.lower()
            
            # Define category keywords
            category_keywords = {
                "fuel": ["fuel", "petrol", "diesel", "gas", "bp", "shell", "caltex", "mobil"],
                "food": ["groceries", "supermarket", "restaurant", "cafe", "food", "woolworths", "coles", "iga"],
                "accommodation": ["camp", "caravan", "hotel", "motel", "accommodation", "site fee"],
                "maintenance": ["service", "repair", "mechanic", "oil", "tyres", "battery", "brake"],
                "insurance": ["insurance", "policy", "premium"],
                "registration": ["registration", "rego", "license", "permit"],
                "entertainment": ["cinema", "movie", "pub", "bar", "entertainment", "attraction"],
                "shopping": ["shopping", "retail", "store", "purchase"],
                "utilities": ["phone", "internet", "water", "electricity", "gas bill"]
            }
            
            # Check for keyword matches
            for category, keywords in category_keywords.items():
                if any(keyword in description_lower for keyword in keywords):
                    return category
            
            # Amount-based categorization for unclear descriptions
            if amount > 200:
                return "major_expense"
            elif amount > 50:
                return "moderate_expense"
            else:
                return "miscellaneous"
                
        except Exception as e:
            logger.error(f"Error categorizing expense: {str(e)}")
            return "miscellaneous"


wins_node = WinsNode()
