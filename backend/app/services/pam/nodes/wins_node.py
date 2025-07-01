from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, date
from app.core.database import get_supabase_client
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

    # Hustle Recommendations
    async def recommend_hustles(self, user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Recommend hustles based on user skills and available time"""
        try:
            # Get user's available time and skills from preferences
            available_hours = preferences.get("available_hours_per_day", 2)
            skills = preferences.get("skills", [])
            experience_level = preferences.get("experience_level", "beginner")
            
            # Get all available hustles from youtube_hustles table
            result = self.supabase.table("youtube_hustles").select("*").execute()
            all_hustles = result.data
            
            if not all_hustles:
                return {"success": False, "message": "No hustles available"}
            
            # Score hustles based on user preferences
            recommended_hustles = []
            for hustle in all_hustles:
                score = 0
                
                # Check if hustle matches user skills (if any provided)
                if skills:
                    hustle_description = (hustle.get("description", "") + " " + hustle.get("title", "")).lower()
                    for skill in skills:
                        if skill.lower() in hustle_description:
                            score += 10
                
                # Factor in initial results if available
                initial_results = hustle.get("initial_results", {})
                if initial_results:
                    earnings = initial_results.get("earnings", 0)
                    time_spent = initial_results.get("time_spent_hours", 1)
                    if time_spent > 0:
                        hourly_rate = earnings / time_spent
                        score += min(hourly_rate / 10, 20)  # Cap at 20 points
                
                # Adjust for time requirements (prefer hustles that fit available time)
                estimated_time = initial_results.get("time_spent_hours", available_hours)
                if estimated_time <= available_hours:
                    score += 5
                
                recommended_hustles.append({
                    **hustle,
                    "recommendation_score": score,
                    "estimated_hourly_rate": initial_results.get("earnings", 0) / max(initial_results.get("time_spent_hours", 1), 1) if initial_results else 0
                })
            
            # Sort by recommendation score
            recommended_hustles.sort(key=lambda x: x["recommendation_score"], reverse=True)
            
            # Get top 5 recommendations
            top_recommendations = recommended_hustles[:5]
            
            logger.info(f"Generated {len(top_recommendations)} hustle recommendations for user {user_id}")
            return {
                "success": True,
                "recommendations": top_recommendations,
                "total_available": len(all_hustles),
                "user_preferences": preferences
            }
            
        except Exception as e:
            logger.error(f"Error recommending hustles: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def track_hustle_progress(self, user_id: str, hustle_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Track daily earnings and progress for a hustle attempt"""
        try:
            # Check if user has an active attempt for this hustle
            attempt_result = self.supabase.table("user_hustle_attempts").select("*").eq("user_id", user_id).eq("hustle_id", hustle_id).execute()
            
            if not attempt_result.data:
                # Create new attempt if none exists
                attempt_data = {
                    "user_id": user_id,
                    "hustle_id": hustle_id,
                    "start_date": data.get("date", date.today()),
                    "earnings": float(data.get("earnings", 0)),
                    "hours_spent": float(data.get("hours_spent", 0)),
                    "status": data.get("status", "active"),
                    "notes": data.get("notes", "")
                }
                result = self.supabase.table("user_hustle_attempts").insert(attempt_data).execute()
                attempt = result.data[0]
            else:
                # Update existing attempt
                attempt = attempt_result.data[0]
                update_data = {
                    "earnings": float(attempt["earnings"]) + float(data.get("earnings", 0)),
                    "hours_spent": float(attempt["hours_spent"]) + float(data.get("hours_spent", 0)),
                    "status": data.get("status", attempt["status"]),
                    "notes": data.get("notes", attempt.get("notes", ""))
                }
                
                result = self.supabase.table("user_hustle_attempts").update(update_data).eq("id", attempt["id"]).execute()
                attempt = result.data[0]
            
            # Calculate performance metrics
            total_earnings = float(attempt["earnings"])
            total_hours = float(attempt["hours_spent"])
            hourly_rate = total_earnings / total_hours if total_hours > 0 else 0
            
            logger.info(f"Updated hustle progress for user {user_id}, hustle {hustle_id}")
            return {
                "success": True,
                "attempt": attempt,
                "metrics": {
                    "total_earnings": total_earnings,
                    "total_hours": total_hours,
                    "hourly_rate": hourly_rate,
                    "days_active": (date.today() - date.fromisoformat(str(attempt["start_date"]))).days + 1
                }
            }
            
        except Exception as e:
            logger.error(f"Error tracking hustle progress: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_hustle_leaderboard(self, hustle_id: Optional[str] = None, limit: int = 10) -> Dict[str, Any]:
        """Get hustle leaderboard showing community success"""
        try:
            query = self.supabase.table("hustle_leaderboard").select("*, youtube_hustles(title)")
            
            if hustle_id:
                query = query.eq("hustle_id", hustle_id)
            
            result = query.order("total_earnings", desc=True).limit(limit).execute()
            leaderboard = result.data
            
            # Get user profiles for display names (if profiles table exists)
            user_ids = [entry["user_id"] for entry in leaderboard]
            if user_ids:
                try:
                    profiles_result = self.supabase.table("profiles").select("user_id, email").in_("user_id", user_ids).execute()
                    profiles_map = {profile["user_id"]: profile for profile in profiles_result.data}
                    
                    # Merge profile data with leaderboard
                    for entry in leaderboard:
                        profile = profiles_map.get(entry["user_id"], {})
                        entry["user_email"] = profile.get("email", "Anonymous")
                except:
                    # If profiles table doesn't exist or query fails, use anonymous
                    for entry in leaderboard:
                        entry["user_email"] = "Anonymous"
            
            # Calculate additional stats
            if leaderboard:
                total_participants = len(set(entry["user_id"] for entry in leaderboard))
                avg_earnings = sum(entry["total_earnings"] for entry in leaderboard) / len(leaderboard)
                top_success_rate = max(entry["success_rate"] for entry in leaderboard)
            else:
                total_participants = 0
                avg_earnings = 0
                top_success_rate = 0
            
            logger.info(f"Retrieved hustle leaderboard with {len(leaderboard)} entries")
            return {
                "success": True,
                "leaderboard": leaderboard,
                "stats": {
                    "total_participants": total_participants,
                    "average_earnings": avg_earnings,
                    "top_success_rate": top_success_rate
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting hustle leaderboard: {str(e)}")
            return {"success": False, "error": str(e)}


wins_node = WinsNode()
