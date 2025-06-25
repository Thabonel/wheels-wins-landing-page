from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.database.supabase_client import get_supabase
from app.core.logging import setup_logging

logger = setup_logging()

class WinsNode:
    def __init__(self):
        self.supabase = get_supabase()
    
    # Budget Management
    async def create_budget(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new budget"""
        try:
            budget_data = {
                "user_id": user_id,
                "category": data.get("category"),
                "amount": data.get("amount"),
                "period": data.get("period", "monthly"),
                "start_date": data.get("start_date", datetime.now().isoformat()),
                "created_at": datetime.now().isoformat()
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
            # Get budget
            budget_result = self.supabase.table("budgets").select("*").eq("user_id", user_id).eq("category", category).execute()
            if not budget_result.data:
                return {"status": "no_budget", "message": "No budget set for this category"}
            
            budget = budget_result.data[0]
            
            # Get expenses for this category in current period
            start_date = datetime.now().replace(day=1).isoformat()
            expenses_result = self.supabase.table("expenses").select("amount").eq("user_id", user_id).eq("category", category).gte("date", start_date).execute()
            
            total_spent = sum(expense["amount"] for expense in expenses_result.data)
            remaining = budget["amount"] - total_spent
            percentage_used = (total_spent / budget["amount"]) * 100 if budget["amount"] > 0 else 0
            
            return {
                "status": "active",
                "budget_amount": budget["amount"],
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
                "amount": data.get("amount"),
                "category": data.get("category"),
                "description": data.get("description", ""),
                "date": data.get("date", datetime.now().isoformat()),
                "created_at": datetime.now().isoformat()
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
            start_date = datetime.now().replace(day=1).isoformat()
            expenses = await self.get_expenses(user_id, {"start_date": start_date})
            
            # Calculate totals by category
            category_totals = {}
            for expense in expenses:
                category = expense["category"]
                if category not in category_totals:
                    category_totals[category] = 0
                category_totals[category] += expense["amount"]
            
            # Get previous month for comparison
            prev_start = (datetime.now().replace(day=1) - timedelta(days=1)).replace(day=1).isoformat()
            prev_end = datetime.now().replace(day=1).isoformat()
            prev_expenses = await self.get_expenses(user_id, {"start_date": prev_start, "end_date": prev_end})
            prev_total = sum(expense["amount"] for expense in prev_expenses)
            
            current_total = sum(expense["amount"] for expense in expenses)
            
            return {
                "current_month_total": current_total,
                "previous_month_total": prev_total,
                "change_percentage": ((current_total - prev_total) / prev_total * 100) if prev_total > 0 else 0,
                "category_breakdown": category_totals,
                "daily_average": current_total / datetime.now().day,
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
                "amount": data.get("amount"),
                "source": data.get("source"),
                "description": data.get("description", ""),
                "date": data.get("date", datetime.now().isoformat()),
                "is_recurring": data.get("is_recurring", False),
                "created_at": datetime.now().isoformat()
            }
            
            result = self.supabase.table("income").insert(income_data).execute()
            logger.info(f"Added income for user {user_id}")
            return {"success": True, "income": result.data[0]}
        except Exception as e:
            logger.error(f"Error adding income: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # Tips Management
    async def get_community_tips(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get money-saving tips from the community"""
        try:
            query = self.supabase.table("tips").select("*")
            
            if category:
                query = query.eq("category", category)
            
            result = query.order("votes", desc=True).limit(10).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching tips: {str(e)}")
            return []
    
    async def submit_tip(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit a money-saving tip"""
        try:
            tip_data = {
                "user_id": user_id,
                "title": data.get("title"),
                "description": data.get("description"),
                "category": data.get("category"),
                "potential_savings": data.get("potential_savings", 0),
                "votes": 0,
                "created_at": datetime.now().isoformat()
            }
            
            result = self.supabase.table("tips").insert(tip_data).execute()
            logger.info(f"Submitted tip from user {user_id}")
            return {"success": True, "tip": result.data[0]}
        except Exception as e:
            logger.error(f"Error submitting tip: {str(e)}")
            return {"success": False, "error": str(e)}

wins_node = WinsNode()
