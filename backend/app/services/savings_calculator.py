"""
PAM Savings Calculator Service
Handles savings tracking, guarantee evaluation, and refund processing
"""

from typing import Dict, List, Optional, Tuple, Any
from decimal import Decimal
from datetime import datetime, date, timedelta
from dataclasses import dataclass
from enum import Enum
import logging
from uuid import UUID

from app.database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class SavingsType(Enum):
    """Types of savings that PAM can generate"""
    FUEL_OPTIMIZATION = "fuel_optimization"
    CAMPING_ALTERNATIVE = "camping_alternative"
    ROUTE_OPTIMIZATION = "route_optimization"
    BUDGET_REALLOCATION = "budget_reallocation"
    PRICE_COMPARISON = "price_comparison"
    TIMING_OPTIMIZATION = "timing_optimization"
    MAINTENANCE_PREVENTION = "maintenance_prevention"
    GROUP_BOOKING_DISCOUNT = "group_booking_discount"


class VerificationMethod(Enum):
    """Methods for verifying savings claims"""
    EXPENSE_COMPARISON = "expense_comparison"
    RECEIPT_ANALYSIS = "receipt_analysis"
    USER_CONFIRMATION = "user_confirmation"
    AUTOMATIC_DETECTION = "automatic_detection"
    PRICE_API_VERIFICATION = "price_api_verification"


@dataclass
class SavingsEvent:
    """Data structure for a savings event"""
    user_id: str
    savings_type: SavingsType
    predicted_savings: Decimal
    actual_savings: Decimal
    baseline_cost: Decimal
    optimized_cost: Decimal
    description: str
    verification_method: VerificationMethod
    confidence_score: float = 0.8
    location: Optional[Tuple[float, float]] = None
    category: str = "other"
    recommendation_id: Optional[str] = None


@dataclass
class GuaranteeStatus:
    """Savings guarantee status for a user"""
    guarantee_met: bool
    total_savings: Decimal
    subscription_cost: Decimal
    savings_shortfall: Decimal
    savings_events_count: int
    billing_period_start: date
    billing_period_end: date
    percentage_achieved: float


class PamSavingsCalculator:
    """
    Service for calculating and tracking PAM-generated savings
    """
    
    def __init__(self):
        """Initialize the savings calculator with Supabase client"""
        self.supabase = get_supabase_client()
        self.logger = logger
        # Default subscription costs
        self.MONTHLY_SUBSCRIPTION = Decimal("29.99")
        self.ANNUAL_SUBSCRIPTION = Decimal("299.99")
    
    async def record_savings_event(self, savings_event: SavingsEvent) -> str:
        """
        Record a savings event when PAM helps a user save money
        
        Args:
            savings_event: The savings event to record
            
        Returns:
            The ID of the created savings event
        """
        try:
            # Prepare location data for PostGIS if provided
            location_data = None
            if savings_event.location:
                lat, lng = savings_event.location
                location_data = f"POINT({lng} {lat})"
            
            event_data = {
                "user_id": str(savings_event.user_id),
                "recommendation_id": savings_event.recommendation_id,
                "savings_type": savings_event.savings_type.value,
                "predicted_savings": float(savings_event.predicted_savings),
                "actual_savings": float(savings_event.actual_savings),
                "baseline_cost": float(savings_event.baseline_cost),
                "optimized_cost": float(savings_event.optimized_cost),
                "savings_description": savings_event.description,
                "verification_method": savings_event.verification_method.value,
                "confidence_score": savings_event.confidence_score,
                "category": savings_event.category,
                "saved_date": date.today().isoformat()
            }
            
            # Note: PostGIS location would need special handling via SQL function
            # For now, we'll store location as JSON if needed
            if location_data:
                event_data["metadata"] = {"location": {"lat": savings_event.location[0], "lng": savings_event.location[1]}}
            
            result = self.supabase.table("pam_savings_events").insert(event_data).execute()
            
            if result.data:
                event_id = result.data[0]["id"]
                self.logger.info(f"Recorded savings event {event_id} for user {savings_event.user_id}")
                return str(event_id)
            else:
                raise Exception("No data returned from insert")
                
        except Exception as e:
            self.logger.error(f"Failed to record savings event: {str(e)}")
            raise
    
    async def calculate_baseline_spending(
        self,
        user_id: str,
        category: str,
        location: Optional[Tuple[float, float]] = None,
        lookback_days: int = 90
    ) -> Decimal:
        """
        Calculate user's baseline spending for a category
        
        Args:
            user_id: The user's ID
            category: Expense category to analyze
            location: Optional location for geographic filtering
            lookback_days: Number of days to look back for baseline
            
        Returns:
            Average spending amount for the category
        """
        try:
            # Calculate cutoff date
            cutoff_date = (datetime.now() - timedelta(days=lookback_days)).isoformat()
            
            # Query expenses for baseline calculation
            query = (
                self.supabase.table("expenses")
                .select("amount")
                .eq("user_id", user_id)
                .eq("category", category)
                .gte("created_at", cutoff_date)
            )
            
            result = query.execute()
            
            if result.data:
                amounts = [Decimal(str(expense["amount"])) for expense in result.data]
                if amounts:
                    return sum(amounts) / len(amounts)
            
            return Decimal("0")
            
        except Exception as e:
            self.logger.error(f"Failed to calculate baseline spending: {str(e)}")
            return Decimal("0")
    
    async def detect_fuel_savings(
        self,
        user_id: str,
        expense_amount: Decimal,
        location: Tuple[float, float],
        description: str
    ) -> Optional[SavingsEvent]:
        """
        Detect potential fuel savings based on expense patterns
        
        Args:
            user_id: The user's ID
            expense_amount: Amount of the fuel expense
            location: Location of the expense
            description: Description of the expense
            
        Returns:
            SavingsEvent if savings detected, None otherwise
        """
        try:
            # Calculate baseline fuel spending
            baseline_cost = await self.calculate_baseline_spending(user_id, "fuel", location)
            
            if baseline_cost > 0 and expense_amount < baseline_cost * Decimal("0.95"):
                # User spent at least 5% less than baseline
                actual_savings = baseline_cost - expense_amount
                
                return SavingsEvent(
                    user_id=user_id,
                    savings_type=SavingsType.FUEL_OPTIMIZATION,
                    predicted_savings=actual_savings,
                    actual_savings=actual_savings,
                    baseline_cost=baseline_cost,
                    optimized_cost=expense_amount,
                    description=f"Fuel savings detected: {description}",
                    verification_method=VerificationMethod.AUTOMATIC_DETECTION,
                    confidence_score=0.85,
                    location=location,
                    category="fuel"
                )
            
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to detect fuel savings: {str(e)}")
            return None
    
    async def detect_camping_savings(
        self,
        user_id: str,
        expense_amount: Decimal,
        location: Tuple[float, float],
        description: str
    ) -> Optional[SavingsEvent]:
        """
        Detect potential camping/lodging savings
        
        Args:
            user_id: The user's ID
            expense_amount: Amount of the camping/lodging expense
            location: Location of the expense
            description: Description of the expense
            
        Returns:
            SavingsEvent if savings detected, None otherwise
        """
        try:
            # Calculate baseline camping/lodging spending
            baseline_cost = await self.calculate_baseline_spending(user_id, "camping", location)
            
            # Check if this is significantly lower than baseline
            if baseline_cost > 0 and expense_amount < baseline_cost * Decimal("0.8"):
                # User spent at least 20% less than baseline
                actual_savings = baseline_cost - expense_amount
                
                return SavingsEvent(
                    user_id=user_id,
                    savings_type=SavingsType.CAMPING_ALTERNATIVE,
                    predicted_savings=actual_savings,
                    actual_savings=actual_savings,
                    baseline_cost=baseline_cost,
                    optimized_cost=expense_amount,
                    description=f"Camping savings: {description}",
                    verification_method=VerificationMethod.AUTOMATIC_DETECTION,
                    confidence_score=0.9,
                    location=location,
                    category="camping"
                )
            
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to detect camping savings: {str(e)}")
            return None
    
    async def get_monthly_savings_summary(self, user_id: str, month: date) -> Dict[str, Any]:
        """
        Get monthly savings summary for guarantee evaluation
        
        Args:
            user_id: The user's ID
            month: The billing month to check
            
        Returns:
            Dictionary containing monthly savings summary
        """
        try:
            # Try to get existing summary
            result = (
                self.supabase.table("monthly_savings_summary")
                .select("*")
                .eq("user_id", user_id)
                .eq("billing_period_start", month.isoformat())
                .execute()
            )
            
            if result.data:
                return result.data[0]
            
            # Generate summary if it doesn't exist
            await self.update_monthly_summary(user_id, month)
            
            # Retry after generation
            result = (
                self.supabase.table("monthly_savings_summary")
                .select("*")
                .eq("user_id", user_id)
                .eq("billing_period_start", month.isoformat())
                .execute()
            )
            
            return result.data[0] if result.data else {}
            
        except Exception as e:
            self.logger.error(f"Failed to get monthly savings summary: {str(e)}")
            return {}
    
    async def update_monthly_summary(self, user_id: str, billing_date: date) -> None:
        """
        Update monthly savings summary for guarantee evaluation
        
        Args:
            user_id: The user's ID
            billing_date: The billing period start date
        """
        try:
            # Calculate billing period
            period_start = billing_date
            period_end = billing_date + timedelta(days=30)
            
            # Get user's subscription cost
            subscription_result = (
                self.supabase.table("user_subscriptions")
                .select("plan_type")
                .eq("user_id", user_id)
                .eq("subscription_status", "active")
                .execute()
            )
            
            if subscription_result.data:
                plan_type = subscription_result.data[0]["plan_type"]
                subscription_cost = (
                    self.MONTHLY_SUBSCRIPTION if plan_type == "monthly"
                    else self.ANNUAL_SUBSCRIPTION / 12 if plan_type == "annual"
                    else self.MONTHLY_SUBSCRIPTION
                )
            else:
                subscription_cost = self.MONTHLY_SUBSCRIPTION
            
            # Aggregate savings for the period
            savings_result = (
                self.supabase.table("pam_savings_events")
                .select("actual_savings, predicted_savings")
                .eq("user_id", user_id)
                .gte("saved_date", period_start.isoformat())
                .lt("saved_date", period_end.isoformat())
                .execute()
            )
            
            total_actual = Decimal("0")
            total_predicted = Decimal("0")
            events_count = 0
            
            if savings_result.data:
                for event in savings_result.data:
                    total_actual += Decimal(str(event["actual_savings"]))
                    total_predicted += Decimal(str(event["predicted_savings"]))
                    events_count += 1
            
            # Determine if guarantee is met
            guarantee_met = total_actual >= subscription_cost
            
            # Prepare summary data
            summary_data = {
                "user_id": user_id,
                "billing_period_start": period_start.isoformat(),
                "billing_period_end": period_end.isoformat(),
                "subscription_cost": float(subscription_cost),
                "total_actual_savings": float(total_actual),
                "total_predicted_savings": float(total_predicted),
                "savings_events_count": events_count,
                "guarantee_met": guarantee_met,
                "guarantee_amount": float(subscription_cost if not guarantee_met else 0),
                "evaluation_date": datetime.utcnow().isoformat()
            }
            
            # Upsert the monthly summary
            self.supabase.table("monthly_savings_summary").upsert(
                summary_data,
                on_conflict="user_id,billing_period_start"
            ).execute()
            
            self.logger.info(f"Updated monthly summary for user {user_id}, period {billing_date}")
            
        except Exception as e:
            self.logger.error(f"Failed to update monthly summary: {str(e)}")
            raise
    
    async def evaluate_savings_guarantee(self, user_id: str, billing_period: date) -> GuaranteeStatus:
        """
        Evaluate if savings guarantee should be triggered
        
        Args:
            user_id: The user's ID
            billing_period: The billing period start date
            
        Returns:
            GuaranteeStatus object with evaluation results
        """
        try:
            # Get or generate monthly summary
            summary = await self.get_monthly_savings_summary(user_id, billing_period)
            
            if not summary:
                # Return default status if no data
                return GuaranteeStatus(
                    guarantee_met=False,
                    total_savings=Decimal("0"),
                    subscription_cost=self.MONTHLY_SUBSCRIPTION,
                    savings_shortfall=self.MONTHLY_SUBSCRIPTION,
                    savings_events_count=0,
                    billing_period_start=billing_period,
                    billing_period_end=billing_period + timedelta(days=30),
                    percentage_achieved=0.0
                )
            
            total_savings = Decimal(str(summary.get("total_actual_savings", 0)))
            subscription_cost = Decimal(str(summary.get("subscription_cost", 0)))
            guarantee_met = total_savings >= subscription_cost
            savings_shortfall = max(subscription_cost - total_savings, Decimal("0"))
            percentage_achieved = (
                float(total_savings / subscription_cost * 100) 
                if subscription_cost > 0 else 0.0
            )
            
            status = GuaranteeStatus(
                guarantee_met=guarantee_met,
                total_savings=total_savings,
                subscription_cost=subscription_cost,
                savings_shortfall=savings_shortfall,
                savings_events_count=summary.get("savings_events_count", 0),
                billing_period_start=date.fromisoformat(summary.get("billing_period_start")),
                billing_period_end=date.fromisoformat(summary.get("billing_period_end")),
                percentage_achieved=percentage_achieved
            )
            
            self.logger.info(f"Guarantee evaluation for user {user_id}: {status}")
            return status
            
        except Exception as e:
            self.logger.error(f"Failed to evaluate savings guarantee: {str(e)}")
            # Return safe default
            return GuaranteeStatus(
                guarantee_met=False,
                total_savings=Decimal("0"),
                subscription_cost=self.MONTHLY_SUBSCRIPTION,
                savings_shortfall=self.MONTHLY_SUBSCRIPTION,
                savings_events_count=0,
                billing_period_start=billing_period,
                billing_period_end=billing_period + timedelta(days=30),
                percentage_achieved=0.0
            )
    
    async def create_recommendation_with_savings(
        self,
        user_id: str,
        title: str,
        description: str,
        category: str,
        predicted_savings: Decimal,
        confidence: float = 0.7
    ) -> str:
        """
        Create a PAM recommendation with savings prediction
        
        Args:
            user_id: The user's ID
            title: Recommendation title
            description: Recommendation description
            category: Category of the recommendation
            predicted_savings: Predicted savings amount
            confidence: Confidence score for the prediction
            
        Returns:
            The ID of the created recommendation
        """
        try:
            recommendation_data = {
                "user_id": user_id,
                "title": title,
                "description": description,
                "category": category,
                "recommendation_type": "cost_saving",
                "predicted_savings": float(predicted_savings),
                "savings_confidence": confidence,
                "priority_level": "high" if predicted_savings > 20 else "medium",
                "tracking_enabled": True,
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("pam_recommendations").insert(recommendation_data).execute()
            
            if result.data:
                rec_id = result.data[0]["id"]
                self.logger.info(f"Created recommendation {rec_id} with ${predicted_savings} predicted savings")
                return str(rec_id)
            else:
                raise Exception("Failed to create recommendation")
                
        except Exception as e:
            self.logger.error(f"Failed to create recommendation: {str(e)}")
            raise
    
    async def get_recent_savings_events(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get recent savings events for a user
        
        Args:
            user_id: The user's ID
            limit: Maximum number of events to return
            
        Returns:
            List of recent savings events
        """
        try:
            result = (
                self.supabase.table("pam_savings_events")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            
            return result.data if result.data else []
            
        except Exception as e:
            self.logger.error(f"Failed to get recent savings events: {str(e)}")
            return []
    
    async def get_savings_by_category(
        self,
        user_id: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Decimal]:
        """
        Get savings breakdown by category for a date range
        
        Args:
            user_id: The user's ID
            start_date: Start date for the range
            end_date: End date for the range
            
        Returns:
            Dictionary mapping categories to total savings
        """
        try:
            result = (
                self.supabase.table("pam_savings_events")
                .select("category, actual_savings")
                .eq("user_id", user_id)
                .gte("saved_date", start_date.isoformat())
                .lte("saved_date", end_date.isoformat())
                .execute()
            )
            
            savings_by_category = {}
            if result.data:
                for event in result.data:
                    category = event["category"]
                    savings = Decimal(str(event["actual_savings"]))
                    if category in savings_by_category:
                        savings_by_category[category] += savings
                    else:
                        savings_by_category[category] = savings
            
            return savings_by_category
            
        except Exception as e:
            self.logger.error(f"Failed to get savings by category: {str(e)}")
            return {}


# Export the main class
__all__ = ["PamSavingsCalculator", "SavingsEvent", "GuaranteeStatus", "SavingsType", "VerificationMethod"]