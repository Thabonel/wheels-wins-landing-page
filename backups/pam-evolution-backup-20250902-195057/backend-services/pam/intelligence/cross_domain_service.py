"""
Cross-Domain Intelligence Service - Correlates data across all domains
Provides intelligent insights by connecting trips, expenses, maintenance, social, etc.
"""
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from app.services.pam.database.unified_database_service import get_pam_database_service
from app.services.pam.database.performance_optimizer import get_performance_optimizer
from app.core.logging import get_logger
import asyncio

logger = get_logger("pam_cross_domain_intelligence")


class CrossDomainIntelligenceService:
    """Service that provides intelligent insights across all PAM domains"""
    
    def __init__(self):
        self.db = None
        self.logger = logger
        
    async def initialize(self):
        """Initialize the service"""
        if not self.db:
            self.db = await get_pam_database_service()
            self.logger.info("Cross-Domain Intelligence Service initialized")
    
    async def get_user_360_view(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive 360-degree view of user across all domains"""
        try:
            await self.initialize()
            
            # Warm cache for user data
            optimizer = get_performance_optimizer()
            await optimizer.warm_cache(user_id)
            
            # Fetch data from all domains in parallel
            tasks = [
                self._get_profile_data(user_id),
                self._get_financial_summary(user_id),
                self._get_travel_patterns(user_id),
                self._get_vehicle_health(user_id),
                self._get_social_engagement(user_id),
                self._get_hustle_performance(user_id)
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Combine results
            user_360 = {
                "user_id": user_id,
                "generated_at": datetime.utcnow().isoformat(),
                "profile": results[0] if not isinstance(results[0], Exception) else {},
                "financial": results[1] if not isinstance(results[1], Exception) else {},
                "travel": results[2] if not isinstance(results[2], Exception) else {},
                "vehicle": results[3] if not isinstance(results[3], Exception) else {},
                "social": results[4] if not isinstance(results[4], Exception) else {},
                "hustles": results[5] if not isinstance(results[5], Exception) else {},
                "insights": []
            }
            
            # Generate cross-domain insights
            user_360["insights"] = await self._generate_cross_domain_insights(user_360)
            
            return user_360
            
        except Exception as e:
            self.logger.error(f"Failed to get user 360 view: {e}")
            return {"error": str(e)}
    
    async def correlate_trip_expenses(self, user_id: str, trip_id: Optional[str] = None) -> Dict[str, Any]:
        """Correlate trip data with expenses to provide cost insights"""
        try:
            await self.initialize()
            
            # Get recent trips
            calendar_table = await self.db.get_table("calendar_events")
            trips = await calendar_table.read(
                filters={"user_id": user_id, "event_type": "trip"},
                limit=10
            )
            
            if not trips.get("success"):
                return {"error": "Failed to fetch trips"}
            
            trip_data = trips.get("data", [])
            
            # Get expenses for the same period
            expense_table = await self.db.get_table("expenses")
            fuel_table = await self.db.get_table("fuel_log")
            
            correlations = []
            
            for trip in trip_data:
                if trip_id and trip.get("id") != trip_id:
                    continue
                
                trip_start = trip.get("start_date")
                trip_end = trip.get("end_date")
                
                if not trip_start:
                    continue
                
                # Find expenses during trip period
                trip_expenses = await expense_table.read(
                    filters={
                        "user_id": user_id,
                        "date": {"gte": trip_start, "lte": trip_end or trip_start}
                    }
                )
                
                # Find fuel purchases during trip
                trip_fuel = await fuel_table.read(
                    filters={
                        "user_id": user_id,
                        "logged_at": {"gte": trip_start, "lte": trip_end or trip_start}
                    }
                )
                
                # Calculate trip costs
                total_expenses = sum(e.get("amount", 0) for e in trip_expenses.get("data", []))
                total_fuel = sum(f.get("cost", 0) for f in trip_fuel.get("data", []))
                
                correlation = {
                    "trip_id": trip.get("id"),
                    "trip_title": trip.get("title"),
                    "trip_dates": {"start": trip_start, "end": trip_end},
                    "total_cost": total_expenses + total_fuel,
                    "expense_breakdown": {
                        "fuel": total_fuel,
                        "other_expenses": total_expenses,
                        "daily_average": (total_expenses + total_fuel) / max(1, self._days_between(trip_start, trip_end))
                    },
                    "expense_categories": self._categorize_expenses(trip_expenses.get("data", [])),
                    "fuel_efficiency": self._calculate_trip_fuel_efficiency(trip_fuel.get("data", []))
                }
                
                correlations.append(correlation)
            
            # Generate insights
            insights = self._generate_trip_expense_insights(correlations)
            
            return {
                "correlations": correlations,
                "insights": insights,
                "summary": {
                    "total_trips_analyzed": len(correlations),
                    "average_trip_cost": sum(c["total_cost"] for c in correlations) / max(1, len(correlations))
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to correlate trip expenses: {e}")
            return {"error": str(e)}
    
    async def predict_maintenance_costs(self, user_id: str, months_ahead: int = 6) -> Dict[str, Any]:
        """Predict upcoming maintenance costs based on history and vehicle usage"""
        try:
            await self.initialize()
            
            # Get maintenance history
            maint_table = await self.db.get_table("maintenance_records")
            maintenance = await maint_table.read(filters={"user_id": user_id})
            
            # Get fuel logs for mileage tracking
            fuel_table = await self.db.get_table("fuel_log")
            fuel_logs = await fuel_table.read(filters={"user_id": user_id})
            
            if not maintenance.get("success") or not fuel_logs.get("success"):
                return {"error": "Failed to fetch data"}
            
            maint_records = maintenance.get("data", [])
            fuel_records = fuel_logs.get("data", [])
            
            # Calculate average monthly mileage
            monthly_mileage = self._calculate_monthly_mileage(fuel_records)
            
            # Analyze maintenance patterns
            maintenance_patterns = {}
            for record in maint_records:
                maint_type = record.get("maintenance_type", "unknown")
                if maint_type not in maintenance_patterns:
                    maintenance_patterns[maint_type] = {
                        "costs": [],
                        "intervals": [],
                        "last_service": None
                    }
                
                maintenance_patterns[maint_type]["costs"].append(record.get("cost", 0))
                if record.get("service_date"):
                    maintenance_patterns[maint_type]["last_service"] = record.get("service_date")
            
            # Predict upcoming maintenance
            predictions = []
            current_date = datetime.utcnow()
            
            for maint_type, pattern in maintenance_patterns.items():
                if pattern["costs"] and pattern["last_service"]:
                    avg_cost = sum(pattern["costs"]) / len(pattern["costs"])
                    
                    # Simple prediction based on typical intervals
                    typical_intervals = {
                        "oil_change": 90,  # days
                        "tire_rotation": 180,
                        "service": 365,
                        "brake_service": 730
                    }
                    
                    interval = typical_intervals.get(maint_type, 180)
                    last_service = datetime.fromisoformat(pattern["last_service"].replace("Z", "+00:00"))
                    next_due = last_service + timedelta(days=interval)
                    
                    if next_due <= current_date + timedelta(days=months_ahead * 30):
                        predictions.append({
                            "maintenance_type": maint_type,
                            "predicted_date": next_due.isoformat(),
                            "estimated_cost": round(avg_cost * 1.05, 2),  # 5% inflation
                            "confidence": "high" if len(pattern["costs"]) > 2 else "medium"
                        })
            
            # Calculate total predicted costs
            total_predicted = sum(p["estimated_cost"] for p in predictions)
            
            return {
                "predictions": predictions,
                "summary": {
                    "total_predicted_cost": total_predicted,
                    "monthly_average": total_predicted / months_ahead,
                    "maintenance_items": len(predictions),
                    "analysis_period_months": months_ahead
                },
                "vehicle_usage": {
                    "average_monthly_mileage": monthly_mileage,
                    "maintenance_cost_per_km": total_predicted / (monthly_mileage * months_ahead) if monthly_mileage else None
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to predict maintenance costs: {e}")
            return {"error": str(e)}
    
    async def analyze_hustle_roi(self, user_id: str) -> Dict[str, Any]:
        """Analyze return on investment for user's hustles"""
        try:
            await self.initialize()
            
            # Get hustle data
            hustles_table = await self.db.get_table("hustle_ideas")
            attempts_table = await self.db.get_table("user_hustle_attempts")
            income_table = await self.db.get_table("income_entries")
            expense_table = await self.db.get_table("expenses")
            
            # Fetch all relevant data
            hustles = await hustles_table.read(filters={"user_id": user_id})
            attempts = await attempts_table.read(filters={"user_id": user_id})
            income = await income_table.read(filters={"user_id": user_id})
            expenses = await expense_table.read(filters={"user_id": user_id, "category": "hustle"})
            
            hustle_analysis = {}
            
            # Analyze each hustle
            for hustle in hustles.get("data", []):
                hustle_id = hustle.get("id")
                hustle_title = hustle.get("title")
                
                # Find related attempts
                hustle_attempts = [a for a in attempts.get("data", []) if a.get("hustle_id") == hustle_id]
                
                # Calculate income and expenses
                hustle_income = sum(i.get("amount", 0) for i in income.get("data", []) 
                                  if i.get("source") == hustle_title)
                hustle_expenses = sum(e.get("amount", 0) for e in expenses.get("data", [])
                                    if hustle_title in e.get("description", ""))
                
                # Calculate ROI
                profit = hustle_income - hustle_expenses
                roi = (profit / hustle_expenses * 100) if hustle_expenses > 0 else 0
                
                hustle_analysis[hustle_id] = {
                    "title": hustle_title,
                    "status": hustle.get("status"),
                    "total_income": hustle_income,
                    "total_expenses": hustle_expenses,
                    "profit": profit,
                    "roi_percentage": roi,
                    "attempt_count": len(hustle_attempts),
                    "success_rate": self._calculate_success_rate(hustle_attempts),
                    "time_invested": sum(a.get("time_spent", 0) for a in hustle_attempts),
                    "hourly_rate": profit / max(1, sum(a.get("time_spent", 0) for a in hustle_attempts))
                }
            
            # Generate recommendations
            recommendations = self._generate_hustle_recommendations(hustle_analysis)
            
            return {
                "hustle_analysis": hustle_analysis,
                "summary": {
                    "total_hustles": len(hustle_analysis),
                    "total_profit": sum(h["profit"] for h in hustle_analysis.values()),
                    "best_performing": max(hustle_analysis.items(), key=lambda x: x[1]["profit"])[0] if hustle_analysis else None,
                    "average_roi": sum(h["roi_percentage"] for h in hustle_analysis.values()) / max(1, len(hustle_analysis))
                },
                "recommendations": recommendations
            }
            
        except Exception as e:
            self.logger.error(f"Failed to analyze hustle ROI: {e}")
            return {"error": str(e)}
    
    async def generate_intelligent_recommendations(self, user_id: str) -> Dict[str, Any]:
        """Generate intelligent recommendations across all domains"""
        try:
            await self.initialize()
            
            # Get comprehensive user data
            user_360 = await self.get_user_360_view(user_id)
            
            recommendations = []
            
            # Financial recommendations
            if user_360.get("financial", {}).get("budget_utilization", 0) > 90:
                recommendations.append({
                    "type": "financial",
                    "priority": "high",
                    "title": "Budget Alert",
                    "description": "You're using over 90% of your budget. Consider reviewing expenses.",
                    "action": "Review and adjust budget categories"
                })
            
            # Vehicle recommendations
            vehicle_data = user_360.get("vehicle", {})
            if vehicle_data.get("overdue_maintenance"):
                recommendations.append({
                    "type": "maintenance",
                    "priority": "high",
                    "title": "Overdue Maintenance",
                    "description": f"{len(vehicle_data['overdue_maintenance'])} maintenance items are overdue",
                    "action": "Schedule maintenance appointments"
                })
            
            # Travel recommendations
            travel_data = user_360.get("travel", {})
            if travel_data.get("average_daily_cost", 0) > 150:
                recommendations.append({
                    "type": "travel",
                    "priority": "medium",
                    "title": "Travel Cost Optimization",
                    "description": "Your average daily travel cost is high. Consider budget-friendly options.",
                    "action": "Explore free camping and cooking options"
                })
            
            # Hustle recommendations
            hustle_data = user_360.get("hustles", {})
            if hustle_data.get("inactive_count", 0) > 2:
                recommendations.append({
                    "type": "hustle",
                    "priority": "medium",
                    "title": "Inactive Hustles",
                    "description": "You have inactive hustles that could generate income",
                    "action": "Reactivate or remove inactive hustles"
                })
            
            # Store recommendations in database
            rec_table = await self.db.get_table("active_recommendations")
            for rec in recommendations:
                await rec_table.create({
                    "user_id": user_id,
                    "recommendation_type": rec["type"],
                    "content": rec,
                    "priority": rec["priority"],
                    "created_at": datetime.utcnow().isoformat()
                })
            
            return {
                "recommendations": recommendations,
                "user_context": {
                    "financial_health": self._calculate_financial_health_score(user_360),
                    "vehicle_health": self._calculate_vehicle_health_score(user_360),
                    "hustle_performance": self._calculate_hustle_performance_score(user_360)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to generate recommendations: {e}")
            return {"error": str(e)}
    
    # Helper methods
    
    async def _get_profile_data(self, user_id: str) -> Dict[str, Any]:
        """Get user profile data"""
        table = await self.db.get_table("profiles")
        result = await table.read(filters={"user_id": user_id}, limit=1)
        return result.get("data", [{}])[0] if result.get("success") else {}
    
    async def _get_financial_summary(self, user_id: str) -> Dict[str, Any]:
        """Get financial summary"""
        # Get budgets
        budget_table = await self.db.get_table("budgets")
        budgets = await budget_table.read(filters={"user_id": user_id})
        
        # Get expenses
        expense_table = await self.db.get_table("expenses")
        expenses = await expense_table.read(filters={"user_id": user_id})
        
        # Get income
        income_table = await self.db.get_table("income_entries")
        income = await income_table.read(filters={"user_id": user_id})
        
        total_budget = sum(b.get("budgeted_amount", 0) for b in budgets.get("data", []))
        total_expenses = sum(e.get("amount", 0) for e in expenses.get("data", []))
        total_income = sum(i.get("amount", 0) for i in income.get("data", []))
        
        return {
            "total_budget": total_budget,
            "total_expenses": total_expenses,
            "total_income": total_income,
            "budget_utilization": (total_expenses / total_budget * 100) if total_budget > 0 else 0,
            "net_income": total_income - total_expenses
        }
    
    async def _get_travel_patterns(self, user_id: str) -> Dict[str, Any]:
        """Get travel patterns"""
        calendar_table = await self.db.get_table("calendar_events")
        events = await calendar_table.read(
            filters={"user_id": user_id, "event_type": "trip"}
        )
        
        trips = events.get("data", [])
        
        return {
            "total_trips": len(trips),
            "upcoming_trips": len([t for t in trips if t.get("date", "") > datetime.utcnow().isoformat()]),
            "favorite_destinations": self._extract_destinations(trips)
        }
    
    async def _get_vehicle_health(self, user_id: str) -> Dict[str, Any]:
        """Get vehicle health status"""
        maint_table = await self.db.get_table("maintenance_records")
        maintenance = await maint_table.read(filters={"user_id": user_id})
        
        records = maintenance.get("data", [])
        overdue = []
        
        for record in records:
            if record.get("next_due_date"):
                due_date = datetime.fromisoformat(record["next_due_date"].replace("Z", "+00:00"))
                if due_date < datetime.utcnow():
                    overdue.append(record)
        
        return {
            "total_maintenance": len(records),
            "overdue_maintenance": overdue,
            "maintenance_up_to_date": len(overdue) == 0
        }
    
    async def _get_social_engagement(self, user_id: str) -> Dict[str, Any]:
        """Get social engagement metrics"""
        posts_table = await self.db.get_table("social_posts")
        groups_table = await self.db.get_table("group_memberships")
        
        posts = await posts_table.read(filters={"user_id": user_id})
        memberships = await groups_table.read(filters={"user_id": user_id})
        
        return {
            "total_posts": len(posts.get("data", [])),
            "group_memberships": len(memberships.get("data", [])),
            "engagement_level": "high" if len(posts.get("data", [])) > 10 else "medium"
        }
    
    async def _get_hustle_performance(self, user_id: str) -> Dict[str, Any]:
        """Get hustle performance"""
        hustles_table = await self.db.get_table("hustle_ideas")
        hustles = await hustles_table.read(filters={"user_id": user_id})
        
        hustle_data = hustles.get("data", [])
        
        return {
            "total_hustles": len(hustle_data),
            "active_hustles": len([h for h in hustle_data if h.get("status") == "approved"]),
            "inactive_count": len([h for h in hustle_data if h.get("status") != "approved"])
        }
    
    async def _generate_cross_domain_insights(self, user_360: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate insights from 360 view"""
        insights = []
        
        # Financial vs Travel insight
        if user_360["financial"].get("budget_utilization", 0) > 80 and user_360["travel"].get("upcoming_trips", 0) > 0:
            insights.append({
                "type": "warning",
                "message": "High budget utilization with upcoming trips. Consider trip budget planning.",
                "domains": ["financial", "travel"]
            })
        
        # Vehicle vs Travel insight  
        if user_360["vehicle"].get("overdue_maintenance") and user_360["travel"].get("upcoming_trips", 0) > 0:
            insights.append({
                "type": "critical",
                "message": "Vehicle maintenance overdue with upcoming trips. Schedule service before traveling.",
                "domains": ["vehicle", "travel"]
            })
        
        return insights
    
    def _days_between(self, start: str, end: Optional[str]) -> int:
        """Calculate days between dates"""
        try:
            start_date = datetime.fromisoformat(start.replace("Z", "+00:00"))
            end_date = datetime.fromisoformat(end.replace("Z", "+00:00")) if end else start_date
            return max(1, (end_date - start_date).days)
        except:
            return 1
    
    def _categorize_expenses(self, expenses: List[Dict[str, Any]]) -> Dict[str, float]:
        """Categorize expenses"""
        categories = {}
        for expense in expenses:
            category = expense.get("category", "other")
            categories[category] = categories.get(category, 0) + expense.get("amount", 0)
        return categories
    
    def _calculate_trip_fuel_efficiency(self, fuel_logs: List[Dict[str, Any]]) -> Optional[float]:
        """Calculate fuel efficiency for trip"""
        if not fuel_logs:
            return None
        
        efficiencies = [f.get("fuel_efficiency") for f in fuel_logs if f.get("fuel_efficiency")]
        return sum(efficiencies) / len(efficiencies) if efficiencies else None
    
    def _generate_trip_expense_insights(self, correlations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate insights from trip expense correlations"""
        insights = []
        
        if not correlations:
            return insights
        
        # Find most expensive trip
        most_expensive = max(correlations, key=lambda x: x["total_cost"])
        insights.append({
            "type": "info",
            "message": f"Most expensive trip: {most_expensive['trip_title']} at ${most_expensive['total_cost']:.2f}"
        })
        
        # Average daily cost insight
        avg_daily_costs = [c["expense_breakdown"]["daily_average"] for c in correlations]
        overall_avg = sum(avg_daily_costs) / len(avg_daily_costs)
        
        if overall_avg > 100:
            insights.append({
                "type": "suggestion",
                "message": f"Average daily trip cost is ${overall_avg:.2f}. Consider budget camping options."
            })
        
        return insights
    
    def _calculate_monthly_mileage(self, fuel_records: List[Dict[str, Any]]) -> float:
        """Calculate average monthly mileage from fuel records"""
        if len(fuel_records) < 2:
            return 0
        
        # Sort by odometer
        sorted_records = sorted(fuel_records, key=lambda x: x.get("odometer", 0))
        
        first = sorted_records[0]
        last = sorted_records[-1]
        
        if not first.get("odometer") or not last.get("odometer"):
            return 0
        
        total_distance = last["odometer"] - first["odometer"]
        
        # Calculate time span
        first_date = datetime.fromisoformat(first.get("logged_at", "").replace("Z", "+00:00"))
        last_date = datetime.fromisoformat(last.get("logged_at", "").replace("Z", "+00:00"))
        
        months = max(1, (last_date - first_date).days / 30)
        
        return total_distance / months
    
    def _calculate_success_rate(self, attempts: List[Dict[str, Any]]) -> float:
        """Calculate success rate of hustle attempts"""
        if not attempts:
            return 0
        
        successful = len([a for a in attempts if a.get("outcome") == "success"])
        return (successful / len(attempts)) * 100
    
    def _generate_hustle_recommendations(self, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate recommendations based on hustle analysis"""
        recommendations = []
        
        # Find underperforming hustles
        for hustle_id, data in analysis.items():
            if data["roi_percentage"] < 20 and data["attempt_count"] > 3:
                recommendations.append({
                    "hustle_id": hustle_id,
                    "recommendation": f"Consider dropping {data['title']} - ROI is only {data['roi_percentage']:.1f}%"
                })
            
            if data["hourly_rate"] < 15:
                recommendations.append({
                    "hustle_id": hustle_id,
                    "recommendation": f"{data['title']} earns ${data['hourly_rate']:.2f}/hour - below minimum wage"
                })
        
        return recommendations
    
    def _calculate_financial_health_score(self, user_360: Dict[str, Any]) -> float:
        """Calculate financial health score (0-100)"""
        financial = user_360.get("financial", {})
        
        # Factors: budget utilization, net income, expense control
        utilization_score = max(0, 100 - financial.get("budget_utilization", 100))
        income_score = min(100, (financial.get("net_income", 0) / 1000) * 100)
        
        return (utilization_score + income_score) / 2
    
    def _calculate_vehicle_health_score(self, user_360: Dict[str, Any]) -> float:
        """Calculate vehicle health score (0-100)"""
        vehicle = user_360.get("vehicle", {})
        
        # Deduct points for overdue maintenance
        base_score = 100
        overdue_count = len(vehicle.get("overdue_maintenance", []))
        
        return max(0, base_score - (overdue_count * 20))
    
    def _calculate_hustle_performance_score(self, user_360: Dict[str, Any]) -> float:
        """Calculate hustle performance score (0-100)"""
        hustles = user_360.get("hustles", {})
        
        if hustles.get("total_hustles", 0) == 0:
            return 50  # Neutral score
        
        active_ratio = hustles.get("active_hustles", 0) / hustles.get("total_hustles", 1)
        
        return active_ratio * 100
    
    def _extract_destinations(self, trips: List[Dict[str, Any]]) -> List[str]:
        """Extract popular destinations from trips"""
        destinations = {}
        
        for trip in trips:
            location = trip.get("location", "Unknown")
            destinations[location] = destinations.get(location, 0) + 1
        
        # Return top 3 destinations
        sorted_destinations = sorted(destinations.items(), key=lambda x: x[1], reverse=True)
        return [dest[0] for dest in sorted_destinations[:3]]


# Singleton instance
_cross_domain_intelligence = None

async def get_cross_domain_intelligence() -> CrossDomainIntelligenceService:
    """Get or create the cross-domain intelligence service"""
    global _cross_domain_intelligence
    
    if _cross_domain_intelligence is None:
        _cross_domain_intelligence = CrossDomainIntelligenceService()
        await _cross_domain_intelligence.initialize()
    
    return _cross_domain_intelligence