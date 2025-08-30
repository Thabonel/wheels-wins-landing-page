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
    category: str = "general"
    saved_date: Optional[date] = None
    recommendation_id: Optional[str] = None
    metadata: Optional[Dict] = None


@dataclass
class MonthlySavingsSummary:
    """Monthly summary of user's savings and guarantee status"""
    user_id: str
    billing_period_start: date
    billing_period_end: date
    subscription_cost: Decimal
    total_predicted_savings: Decimal
    total_actual_savings: Decimal
    savings_events_count: int
    guarantee_met: bool
    guarantee_amount: Decimal


@dataclass
class GuaranteeStatus:
    """Current guarantee status for a user"""
    guarantee_met: bool
    total_savings: Decimal
    subscription_cost: Decimal
    savings_shortfall: Decimal
    savings_events_count: int
    billing_period_start: date
    billing_period_end: date
    percentage_achieved: float


class PAMSavingsCalculator:
    """
    Core service for PAM Savings Guarantee functionality
    Handles savings tracking, guarantee evaluation, and refund processing
    """
    
    def __init__(self):
        self.supabase = get_supabase_client()
        
    def record_savings_event(self, savings_event: SavingsEvent) -> bool:
        """
        Record a new savings event when PAM helps a user save money
        
        Args:
            savings_event: The savings event to record
            
        Returns:
            bool: Success status
        """
        try:
            # Prepare data for insertion
            event_data = {
                'user_id': savings_event.user_id,
                'savings_type': savings_event.savings_type.value,
                'predicted_savings': float(savings_event.predicted_savings),
                'actual_savings': float(savings_event.actual_savings),
                'baseline_cost': float(savings_event.baseline_cost),
                'optimized_cost': float(savings_event.optimized_cost),
                'savings_description': savings_event.description,
                'verification_method': savings_event.verification_method.value,
                'confidence_score': savings_event.confidence_score,
                'category': savings_event.category,
                'saved_date': savings_event.saved_date or date.today(),
                'recommendation_id': savings_event.recommendation_id,
                'metadata': savings_event.metadata or {}
            }
            
            # Add location if provided
            if savings_event.location:
                event_data['location'] = f"POINT({savings_event.location[1]} {savings_event.location[0]})"
            
            # Insert into database
            result = self.supabase.table('pam_savings_events').insert(event_data).execute()
            
            logger.info(f"Recorded savings event for user {savings_event.user_id}: ${savings_event.actual_savings}")
            
            # Update monthly summary after recording event
            self.update_monthly_summary(savings_event.user_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to record savings event: {str(e)}")
            return False
    
    def get_user_savings_events(self, user_id: str, limit: int = 50) -> List[Dict]:
        """
        Get recent savings events for a user
        
        Args:
            user_id: The user's ID
            limit: Maximum number of events to return
            
        Returns:
            List of savings events
        """
        try:
            result = self.supabase.table('pam_savings_events')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get savings events for user {user_id}: {str(e)}")
            return []
    
    def calculate_monthly_savings(self, user_id: str, 
                                 billing_period_start: date,
                                 billing_period_end: date) -> MonthlySavingsSummary:
        """
        Calculate monthly savings summary for guarantee evaluation
        
        Args:
            user_id: The user's ID
            billing_period_start: Start of billing period
            billing_period_end: End of billing period
            
        Returns:
            MonthlySavingsSummary object
        """
        try:
            # Get savings events for the period
            result = self.supabase.table('pam_savings_events')\
                .select('*')\
                .eq('user_id', user_id)\
                .gte('saved_date', billing_period_start.isoformat())\
                .lte('saved_date', billing_period_end.isoformat())\
                .execute()
            
            events = result.data if result.data else []
            
            # Calculate totals
            total_predicted = sum(Decimal(str(event['predicted_savings'])) for event in events)
            total_actual = sum(Decimal(str(event['actual_savings'])) for event in events)
            events_count = len(events)
            
            # Get subscription cost (could be from user settings or subscription table)
            subscription_cost = self.get_user_subscription_cost(user_id)
            
            # Determine if guarantee is met
            guarantee_met = total_actual >= subscription_cost
            guarantee_amount = max(Decimal('0'), subscription_cost - total_actual)
            
            return MonthlySavingsSummary(
                user_id=user_id,
                billing_period_start=billing_period_start,
                billing_period_end=billing_period_end,
                subscription_cost=subscription_cost,
                total_predicted_savings=total_predicted,
                total_actual_savings=total_actual,
                savings_events_count=events_count,
                guarantee_met=guarantee_met,
                guarantee_amount=guarantee_amount
            )
            
        except Exception as e:
            logger.error(f"Failed to calculate monthly savings for user {user_id}: {str(e)}")
            # Return empty summary
            return MonthlySavingsSummary(
                user_id=user_id,
                billing_period_start=billing_period_start,
                billing_period_end=billing_period_end,
                subscription_cost=Decimal('0'),
                total_predicted_savings=Decimal('0'),
                total_actual_savings=Decimal('0'),
                savings_events_count=0,
                guarantee_met=False,
                guarantee_amount=Decimal('0')
            )
    
    def get_current_guarantee_status(self, user_id: str) -> GuaranteeStatus:
        """
        Get current guarantee status for a user (current billing period)
        
        Args:
            user_id: The user's ID
            
        Returns:
            GuaranteeStatus object
        """
        try:
            # Get current billing period (typically monthly)
            today = date.today()
            billing_start = date(today.year, today.month, 1)
            if today.month == 12:
                billing_end = date(today.year + 1, 1, 1) - timedelta(days=1)
            else:
                billing_end = date(today.year, today.month + 1, 1) - timedelta(days=1)
            
            # Calculate monthly summary
            summary = self.calculate_monthly_savings(user_id, billing_start, billing_end)
            
            # Calculate percentage achieved
            percentage_achieved = 0.0
            if summary.subscription_cost > 0:
                percentage_achieved = float(summary.total_actual_savings / summary.subscription_cost) * 100
            
            return GuaranteeStatus(
                guarantee_met=summary.guarantee_met,
                total_savings=summary.total_actual_savings,
                subscription_cost=summary.subscription_cost,
                savings_shortfall=summary.guarantee_amount,
                savings_events_count=summary.savings_events_count,
                billing_period_start=billing_start,
                billing_period_end=billing_end,
                percentage_achieved=percentage_achieved
            )
            
        except Exception as e:
            logger.error(f"Failed to get guarantee status for user {user_id}: {str(e)}")
            # Return default status
            return GuaranteeStatus(
                guarantee_met=False,
                total_savings=Decimal('0'),
                subscription_cost=Decimal('0'),
                savings_shortfall=Decimal('0'),
                savings_events_count=0,
                billing_period_start=date.today(),
                billing_period_end=date.today(),
                percentage_achieved=0.0
            )
    
    def update_monthly_summary(self, user_id: str) -> bool:
        """
        Update or create monthly summary for current billing period
        
        Args:
            user_id: The user's ID
            
        Returns:
            bool: Success status
        """
        try:
            # Get current billing period
            today = date.today()
            billing_start = date(today.year, today.month, 1)
            if today.month == 12:
                billing_end = date(today.year + 1, 1, 1) - timedelta(days=1)
            else:
                billing_end = date(today.year, today.month + 1, 1) - timedelta(days=1)
            
            # Calculate summary
            summary = self.calculate_monthly_savings(user_id, billing_start, billing_end)
            
            # Prepare data for upsert
            summary_data = {
                'user_id': user_id,
                'billing_period_start': billing_start.isoformat(),
                'billing_period_end': billing_end.isoformat(),
                'subscription_cost': float(summary.subscription_cost),
                'total_predicted_savings': float(summary.total_predicted_savings),
                'total_actual_savings': float(summary.total_actual_savings),
                'savings_events_count': summary.savings_events_count,
                'guarantee_met': summary.guarantee_met,
                'guarantee_amount': float(summary.guarantee_amount)
            }
            
            # Use upsert to create or update
            result = self.supabase.table('pam_monthly_savings_summary')\
                .upsert(summary_data, on_conflict='user_id,billing_period_start,billing_period_end')\
                .execute()
            
            logger.info(f"Updated monthly summary for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update monthly summary for user {user_id}: {str(e)}")
            return False
    
    def get_user_subscription_cost(self, user_id: str) -> Decimal:
        """
        Get user's monthly subscription cost
        
        Args:
            user_id: The user's ID
            
        Returns:
            Monthly subscription cost
        """
        try:
            # This would typically come from subscription management
            # For now, return a default value
            # TODO: Integrate with actual subscription system
            return Decimal('29.99')  # Default monthly subscription
            
        except Exception as e:
            logger.error(f"Failed to get subscription cost for user {user_id}: {str(e)}")
            return Decimal('29.99')  # Default fallback
    
    def create_recommendation(self, user_id: str, title: str, description: str,
                            category: str, predicted_savings: Decimal,
                            confidence: float = 0.8) -> Optional[str]:
        """
        Create a new PAM recommendation with savings potential
        
        Args:
            user_id: The user's ID
            title: Recommendation title
            description: Detailed description
            category: Savings category
            predicted_savings: Predicted savings amount
            confidence: Confidence score (0-1)
            
        Returns:
            Recommendation ID if successful, None otherwise
        """
        try:
            recommendation_data = {
                'user_id': user_id,
                'title': title,
                'description': description,
                'category': category,
                'recommendation_type': 'cost_saving',
                'predicted_savings': float(predicted_savings),
                'savings_confidence': confidence,
                'priority_level': 'medium',
                'tracking_enabled': True
            }
            
            result = self.supabase.table('pam_recommendations')\
                .insert(recommendation_data)\
                .execute()
            
            if result.data and len(result.data) > 0:
                recommendation_id = result.data[0]['id']
                logger.info(f"Created recommendation {recommendation_id} for user {user_id}")
                return recommendation_id
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to create recommendation for user {user_id}: {str(e)}")
            return None
    
    def detect_savings_opportunity(self, user_id: str, expense_amount: Decimal,
                                  category: str, location: Optional[Tuple[float, float]] = None,
                                  description: str = "") -> Optional[Dict]:
        """
        Detect potential savings opportunity based on expense data
        
        Args:
            user_id: The user's ID
            expense_amount: Amount of the expense
            category: Expense category
            location: Optional location coordinates
            description: Optional expense description
            
        Returns:
            Savings opportunity data if found, None otherwise
        """
        try:
            # Simple savings opportunity detection logic
            # In a real implementation, this would use ML models and historical data
            
            savings_opportunities = {
                'fuel': {
                    'threshold': Decimal('50'),
                    'avg_savings_percent': 0.15,
                    'message': 'Found cheaper gas stations nearby'
                },
                'accommodation': {
                    'threshold': Decimal('100'),
                    'avg_savings_percent': 0.20,
                    'message': 'Alternative camping options available'
                },
                'food': {
                    'threshold': Decimal('30'),
                    'avg_savings_percent': 0.10,
                    'message': 'Local grocery stores offer better prices'
                },
                'maintenance': {
                    'threshold': Decimal('100'),
                    'avg_savings_percent': 0.25,
                    'message': 'DIY maintenance tips available'
                }
            }
            
            opportunity = savings_opportunities.get(category.lower())
            if opportunity and expense_amount >= opportunity['threshold']:
                potential_savings = expense_amount * Decimal(str(opportunity['avg_savings_percent']))
                
                # Create recommendation
                recommendation_id = self.create_recommendation(
                    user_id=user_id,
                    title=f"Save on {category}",
                    description=opportunity['message'],
                    category=category,
                    predicted_savings=potential_savings
                )
                
                return {
                    'recommendation_id': recommendation_id,
                    'category': category,
                    'potential_savings': float(potential_savings),
                    'confidence': 0.7,
                    'message': opportunity['message'],
                    'expense_amount': float(expense_amount)
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to detect savings opportunity for user {user_id}: {str(e)}")
            return None
    
    def process_guarantee_evaluation(self, user_id: str,
                                   evaluation_period_start: date,
                                   evaluation_period_end: date) -> bool:
        """
        Process guarantee evaluation for a specific period
        
        Args:
            user_id: The user's ID
            evaluation_period_start: Start of evaluation period
            evaluation_period_end: End of evaluation period
            
        Returns:
            bool: Success status
        """
        try:
            # Calculate savings for the period
            summary = self.calculate_monthly_savings(user_id, evaluation_period_start, evaluation_period_end)
            
            # Determine guarantee status
            guarantee_status = 'met' if summary.guarantee_met else 'not_met'
            refund_amount = summary.guarantee_amount if not summary.guarantee_met else Decimal('0')
            
            # Create evaluation record
            evaluation_data = {
                'user_id': user_id,
                'evaluation_period_start': evaluation_period_start.isoformat(),
                'evaluation_period_end': evaluation_period_end.isoformat(),
                'total_subscription_cost': float(summary.subscription_cost),
                'total_savings_achieved': float(summary.total_actual_savings),
                'savings_shortfall': float(summary.guarantee_amount),
                'guarantee_status': guarantee_status,
                'refund_amount': float(refund_amount),
                'refund_processed': False,
                'evaluation_notes': f"Evaluated {summary.savings_events_count} savings events"
            }
            
            result = self.supabase.table('pam_savings_guarantee_evaluations')\
                .insert(evaluation_data)\
                .execute()
            
            logger.info(f"Processed guarantee evaluation for user {user_id}: {guarantee_status}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to process guarantee evaluation for user {user_id}: {str(e)}")
            return False
    
    def get_savings_analytics(self, user_id: str) -> Dict:
        """
        Get comprehensive savings analytics for a user
        
        Args:
            user_id: The user's ID
            
        Returns:
            Analytics data dictionary
        """
        try:
            # Get all-time savings events
            events = self.get_user_savings_events(user_id, limit=1000)
            
            if not events:
                return {
                    'total_savings': 0,
                    'total_events': 0,
                    'categories': {},
                    'monthly_trend': [],
                    'avg_savings_per_event': 0,
                    'top_categories': []
                }
            
            # Calculate totals
            total_savings = sum(event['actual_savings'] for event in events)
            total_events = len(events)
            avg_savings = total_savings / total_events if total_events > 0 else 0
            
            # Group by category
            categories = {}
            for event in events:
                category = event['category']
                if category not in categories:
                    categories[category] = {'count': 0, 'savings': 0}
                categories[category]['count'] += 1
                categories[category]['savings'] += event['actual_savings']
            
            # Top categories by savings
            top_categories = sorted(
                categories.items(),
                key=lambda x: x[1]['savings'],
                reverse=True
            )[:5]
            
            return {
                'total_savings': total_savings,
                'total_events': total_events,
                'categories': categories,
                'avg_savings_per_event': avg_savings,
                'top_categories': top_categories
            }
            
        except Exception as e:
            logger.error(f"Failed to get savings analytics for user {user_id}: {str(e)}")
            return {}


# Global instance
savings_calculator = PAMSavingsCalculator()