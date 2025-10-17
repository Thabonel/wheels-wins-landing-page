"""
Usage Tracking Service
Core service for tracking PAM usage metrics
"""

import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, Optional
from uuid import UUID

from app.models.usage_tracking import (
    UsageEvent,
    estimate_event_cost,
    RetentionMetrics,
    UsageDashboard
)
from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


class UsageTrackingService:
    """Service for tracking and analyzing PAM usage"""

    def __init__(self):
        self.supabase = get_supabase_client()

    async def track_event(
        self,
        user_id: UUID,
        event_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> UsageEvent:
        """
        Track a usage event

        Args:
            user_id: User ID
            event_type: Type of event (voice_minute, tool_call, session_start, session_end)
            metadata: Additional event metadata

        Returns:
            Created usage event
        """
        try:
            # Estimate cost for this event
            cost_estimate = estimate_event_cost(event_type, metadata)

            # Create event
            event = UsageEvent(
                user_id=user_id,
                event_type=event_type,
                metadata=metadata or {},
                cost_estimate=cost_estimate
            )

            # Insert into database
            result = await self.supabase.table('usage_events').insert({
                'user_id': str(user_id),
                'event_type': event_type,
                'timestamp': event.timestamp.isoformat(),
                'metadata': event.metadata,
                'cost_estimate': float(cost_estimate)
            }).execute()

            logger.info(f"📊 Tracked {event_type} event for user {user_id}, cost: ${cost_estimate:.4f}")

            return event

        except Exception as e:
            logger.error(f"❌ Failed to track usage event: {e}")
            # Don't fail the main operation if tracking fails
            return event

    async def get_daily_stats(self, days: int = 30) -> list[Dict[str, Any]]:
        """
        Get daily usage statistics

        Args:
            days: Number of days to retrieve

        Returns:
            List of daily stats
        """
        try:
            start_date = (datetime.utcnow() - timedelta(days=days)).date()

            result = await self.supabase.table('daily_usage_stats')\
                .select('*')\
                .gte('date', start_date.isoformat())\
                .order('date', desc=True)\
                .execute()

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"❌ Failed to get daily stats: {e}")
            return []

    async def get_user_activity(self, user_id: UUID) -> Optional[Dict[str, Any]]:
        """
        Get activity summary for a specific user

        Args:
            user_id: User ID

        Returns:
            User activity data
        """
        try:
            result = await self.supabase.table('user_activity')\
                .select('*')\
                .eq('user_id', str(user_id))\
                .single()\
                .execute()

            return result.data if result.data else None

        except Exception as e:
            logger.error(f"❌ Failed to get user activity: {e}")
            return None

    async def calculate_retention_rates(self) -> RetentionMetrics:
        """
        Calculate retention rates (D1, D7, D30)

        Returns:
            Retention metrics
        """
        try:
            # Get users who first appeared 1, 7, and 30 days ago
            today = date.today()

            # D1 retention: users from yesterday who came back today
            d1_cohort = await self.supabase.table('user_activity')\
                .select('user_id')\
                .eq('first_seen', (today - timedelta(days=1)).isoformat())\
                .execute()

            d1_returned = await self.supabase.table('user_activity')\
                .select('user_id')\
                .eq('first_seen', (today - timedelta(days=1)).isoformat())\
                .eq('last_seen', today.isoformat())\
                .execute()

            # D7 retention
            d7_cohort = await self.supabase.table('user_activity')\
                .select('user_id')\
                .eq('first_seen', (today - timedelta(days=7)).isoformat())\
                .execute()

            d7_returned = await self.supabase.table('user_activity')\
                .select('user_id')\
                .eq('first_seen', (today - timedelta(days=7)).isoformat())\
                .gte('last_seen', (today - timedelta(days=1)).isoformat())\
                .execute()

            # D30 retention
            d30_cohort = await self.supabase.table('user_activity')\
                .select('user_id')\
                .eq('first_seen', (today - timedelta(days=30)).isoformat())\
                .execute()

            d30_returned = await self.supabase.table('user_activity')\
                .select('user_id')\
                .eq('first_seen', (today - timedelta(days=30)).isoformat())\
                .gte('last_seen', (today - timedelta(days=7)).isoformat())\
                .execute()

            # Calculate rates
            d1_rate = len(d1_returned.data) / len(d1_cohort.data) if d1_cohort.data else 0
            d7_rate = len(d7_returned.data) / len(d7_cohort.data) if d7_cohort.data else 0
            d30_rate = len(d30_returned.data) / len(d30_cohort.data) if d30_cohort.data else 0

            return RetentionMetrics(
                d1_retention=d1_rate,
                d7_retention=d7_rate,
                d30_retention=d30_rate,
                cohort_size=len(d1_cohort.data) if d1_cohort.data else 0
            )

        except Exception as e:
            logger.error(f"❌ Failed to calculate retention rates: {e}")
            return RetentionMetrics(
                d1_retention=0,
                d7_retention=0,
                d30_retention=0,
                cohort_size=0
            )

    async def get_usage_dashboard(self) -> UsageDashboard:
        """
        Get comprehensive usage dashboard for optimization decisions

        Returns:
            Usage dashboard data
        """
        try:
            # Last 30 days stats
            daily_stats = await self.get_daily_stats(days=30)

            # Calculate aggregates
            total_cost = sum(Decimal(str(s.get('estimated_cost', 0))) for s in daily_stats)
            total_voice_minutes = sum(s.get('total_voice_minutes', 0) for s in daily_stats)
            total_tool_calls = sum(s.get('total_tool_calls', 0) for s in daily_stats)

            # Average daily active users (exclude days with 0 users)
            user_counts = [s.get('unique_users', 0) for s in daily_stats if s.get('unique_users', 0) > 0]
            avg_dau = sum(user_counts) / len(user_counts) if user_counts else 0

            # Cost per user
            cost_per_user = (total_cost / avg_dau) if avg_dau > 0 else Decimal('0')

            # Retention metrics
            retention = await self.calculate_retention_rates()

            # Optimization trigger logic
            should_optimize = total_cost > 150 and avg_dau > 50
            estimated_savings = total_cost * Decimal('0.66')  # 66% savings with optimization

            return UsageDashboard(
                monthly_cost=total_cost,
                cost_per_user=cost_per_user,
                daily_active_users=avg_dau,
                voice_minutes_per_month=total_voice_minutes,
                tool_calls_per_month=total_tool_calls,
                retention={
                    'd1': retention.d1_retention,
                    'd7': retention.d7_retention,
                    'd30': retention.d30_retention
                },
                optimization_trigger={
                    'should_optimize': should_optimize,
                    'reason': (
                        f'Cost (${total_cost:.2f}) and scale ({avg_dau:.0f} DAU) justify engineering investment'
                        if should_optimize
                        else 'Keep using OpenAI - not cost-effective to optimize yet'
                    ),
                    'estimated_savings_per_month': float(estimated_savings),
                    'estimated_savings_per_year': float(estimated_savings * 12),
                    'engineering_budget': '5000-10000',  # One-time engineering cost
                    'roi_months': int((Decimal('7500') / estimated_savings)) if estimated_savings > 0 else 999
                }
            )

        except Exception as e:
            logger.error(f"❌ Failed to get usage dashboard: {e}")
            raise


# Global instance
usage_tracking = UsageTrackingService()


# Helper functions for easy usage tracking
async def track_voice_minute(user_id: UUID, duration_seconds: float):
    """Track voice conversation minute"""
    return await usage_tracking.track_event(
        user_id,
        'voice_minute',
        {'duration_seconds': duration_seconds}
    )


async def track_tool_call(user_id: UUID, tool_name: str, tokens: Optional[int] = None):
    """Track tool/function call"""
    return await usage_tracking.track_event(
        user_id,
        'tool_call',
        {'tool_name': tool_name, 'tokens': tokens}
    )


async def track_session_start(user_id: UUID):
    """Track session start"""
    return await usage_tracking.track_event(user_id, 'session_start')


async def track_session_end(user_id: UUID, duration_seconds: float):
    """Track session end"""
    return await usage_tracking.track_event(
        user_id,
        'session_end',
        {'duration_seconds': duration_seconds}
    )
