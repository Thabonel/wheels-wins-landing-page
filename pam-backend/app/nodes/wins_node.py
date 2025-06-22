from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.database.supabase_client import get_supabase
from app.core.logging import setup_logging

logger = setup_logging()

class WinsNode:
    def __init__(self):
        self.supabase = get_supabase()
    
    def _check_supabase_available(self) -> bool:
        """Check if Supabase client is available"""
        if not self.supabase:
            logger.warning("Supabase not available - running in local development mode")
            return False
        return True
    
    def _local_dev_response(self, message: str = "Feature not available in local development") -> Dict[str, Any]:
        """Return a standard response for local development"""
        return {
            "success": False,
            "message": message,
            "data": None,
            "local_development": True
        }
    
    # Budget Management
    async def create_budget(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new budget"""
        if not self._check_supabase_available():
            return self._local_dev_response("Budget creation not available in local development")
            
        try:
            budget_data = {
                "user_id": user_id,
                "category": data.get("category"),
                "amount": data.get("amount"),
                "period": data.get("period", "monthly"),
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("budgets").insert(budget_data).execute()
            return {"success": True, "data": result.data}
        except Exception as e:
            logger.error(f"Failed to create budget: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_budgets(self, user_id: str) -> Dict[str, Any]:
        """Get all budgets for a user"""
        if not self._check_supabase_available():
            return self._local_dev_response("Budget retrieval not available in local development")
            
        try:
            result = self.supabase.table("budgets").select("*").eq("user_id", user_id).execute()
            return {"success": True, "data": result.data}
        except Exception as e:
            logger.error(f"Failed to get budgets: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def check_budget_status(self, user_id: str, category: str) -> Dict[str, Any]:
        """Check budget status for a category"""
        if not self._check_supabase_available():
            return self._local_dev_response("Budget status check not available in local development")
            
        try:
            budget_result = self.supabase.table("budgets").select("*").eq("user_id", user_id).eq("category", category).execute()
            
            if not budget_result.data:
                return {"success": False, "error": "No budget found for this category"}
            
            budget = budget_result.data[0]
            
            # Calculate period start based on budget period
            now = datetime.utcnow()
            if budget["period"] == "monthly":
                start_date = now.replace(day=1).isoformat()
            elif budget["period"] == "weekly":
                start_date = (now - timedelta(days=now.weekday())).isoformat()
            else:  # yearly
                start_date = now.replace(month=1, day=1).isoformat()
            
            expenses_result = self.supabase.table("expenses").select("amount").eq("user_id", user_id).eq("category", category).gte("date", start_date).execute()
            
            total_spent = sum(expense["amount"] for expense in expenses_result.data)
            budget_amount = budget["amount"]
            remaining = budget_amount - total_spent
            percentage_used = (total_spent / budget_amount) * 100 if budget_amount > 0 else 0
            
            status = {
                "budget_amount": budget_amount,
                "spent": total_spent,
                "remaining": remaining,
                "percentage_used": percentage_used,
                "over_budget": total_spent > budget_amount,
                "period": budget["period"]
            }
            
            return {"success": True, "data": status}
        except Exception as e:
            logger.error(f"Failed to check budget status: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # Expense Management
    async def add_expense(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new expense"""
        if not self._check_supabase_available():
            return self._local_dev_response("Expense tracking not available in local development")
            
        try:
            expense_data = {
                "user_id": user_id,
                "amount": data.get("amount"),
                "category": data.get("category"),
                "description": data.get("description", ""),
                "date": data.get("date", datetime.utcnow().isoformat()),
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("expenses").insert(expense_data).execute()
            
            # Check if this expense puts user over budget
            budget_status = await self.check_budget_status(user_id, data.get("category"))
            
            response = {"success": True, "data": result.data}
            if budget_status.get("success") and budget_status["data"]["over_budget"]:
                response["budget_warning"] = f"You're over budget for {data.get('category')}!"
            
            return response
        except Exception as e:
            logger.error(f"Failed to add expense: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_expenses(self, user_id: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Get expenses with optional filters"""
        if not self._check_supabase_available():
            return self._local_dev_response("Expense retrieval not available in local development")
            
        try:
            query = self.supabase.table("expenses").select("*").eq("user_id", user_id)
            
            if filters:
                if filters.get("category"):
                    query = query.eq("category", filters["category"])
                if filters.get("start_date"):
                    query = query.gte("date", filters["start_date"])
                if filters.get("end_date"):
                    query = query.lte("date", filters["end_date"])
                if filters.get("min_amount"):
                    query = query.gte("amount", filters["min_amount"])
                if filters.get("max_amount"):
                    query = query.lte("amount", filters["max_amount"])
            
            result = query.order("date", desc=True).execute()
            return {"success": True, "data": result.data}
        except Exception as e:
            logger.error(f"Failed to get expenses: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_expense_analytics(self, user_id: str, period: str = "monthly") -> Dict[str, Any]:
        """Get expense analytics for a user"""
        if not self._check_supabase_available():
            return self._local_dev_response("Expense analytics not available in local development")
            
        try:
            # Calculate period start
            now = datetime.utcnow()
            if period == "monthly":
                start_date = now.replace(day=1).isoformat()
            elif period == "weekly":
                start_date = (now - timedelta(days=now.weekday())).isoformat()
            elif period == "yearly":
                start_date = now.replace(month=1, day=1).isoformat()
            else:
                start_date = (now - timedelta(days=30)).isoformat()
            
            result = self.supabase.table("expenses").select("*").eq("user_id", user_id).gte("date", start_date).execute()
            
            expenses = result.data
            total_amount = sum(expense["amount"] for expense in expenses)
            
            # Group by category
            category_totals = {}
            for expense in expenses:
                category = expense["category"]
                category_totals[category] = category_totals.get(category, 0) + expense["amount"]
            
            # Calculate daily averages
            days_in_period = (now - datetime.fromisoformat(start_date.replace('Z', '+00:00'))).days + 1
            daily_average = total_amount / days_in_period if days_in_period > 0 else 0
            
            analytics = {
                "total_expenses": total_amount,
                "expense_count": len(expenses),
                "daily_average": daily_average,
                "category_breakdown": category_totals,
                "period": period,
                "period_start": start_date
            }
            
            return {"success": True, "data": analytics}
        except Exception as e:
            logger.error(f"Failed to get expense analytics: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # Income Management
    async def add_income(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Add income record"""
        if not self._check_supabase_available():
            return self._local_dev_response("Income tracking not available in local development")
            
        try:
            income_data = {
                "user_id": user_id,
                "amount": data.get("amount"),
                "source": data.get("source"),
                "description": data.get("description", ""),
                "date": data.get("date", datetime.utcnow().isoformat()),
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("income").insert(income_data).execute()
            return {"success": True, "data": result.data}
        except Exception as e:
            logger.error(f"Failed to add income: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # Tips Management
    async def get_financial_tips(self, user_id: str, category: Optional[str] = None) -> Dict[str, Any]:
        """Get personalized financial tips"""
        if not self._check_supabase_available():
            return self._local_dev_response("Financial tips not available in local development")
            
        try:
            query = self.supabase.table("tips").select("*")
            
            if category:
                query = query.eq("category", category)
            
            result = query.limit(5).execute()
            return {"success": True, "data": result.data}
        except Exception as e:
            logger.error(f"Failed to get financial tips: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def save_financial_tip(self, tip_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save a new financial tip"""
        if not self._check_supabase_available():
            return self._local_dev_response("Tip saving not available in local development")
            
        try:
            tip_data["created_at"] = datetime.utcnow().isoformat()
            result = self.supabase.table("tips").insert(tip_data).execute()
            return {"success": True, "data": result.data}
        except Exception as e:
            logger.error(f"Failed to save financial tip: {str(e)}")
            return {"success": False, "error": str(e)}

# Create global instance
wins_node = WinsNode()
