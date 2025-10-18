"""
Usage Tracking Models
Track conversation minutes, tool calls, costs, and retention metrics
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class UsageEvent(BaseModel):
    """Individual usage event"""
    id: Optional[UUID] = None
    user_id: UUID
    event_type: str = Field(
        ...,
        description="Event type: voice_minute, tool_call, session_start, session_end"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None
    cost_estimate: Optional[Decimal] = Field(
        default=None,
        description="Estimated cost in USD for this event"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DailyUsageStats(BaseModel):
    """Aggregated daily usage statistics"""
    id: Optional[UUID] = None
    date: date
    total_voice_minutes: int = 0
    total_tool_calls: int = 0
    unique_users: int = 0
    total_sessions: int = 0
    estimated_cost: Decimal = Decimal('0.00')
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserActivity(BaseModel):
    """User activity and lifetime metrics"""
    user_id: UUID
    first_seen: date
    last_seen: date
    total_sessions: int = 0
    total_voice_minutes: int = 0
    total_tool_calls: int = 0
    lifetime_cost_estimate: Decimal = Decimal('0.00')
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UsageDashboard(BaseModel):
    """Analytics dashboard data for optimization decisions"""
    monthly_cost: Decimal
    cost_per_user: Decimal
    daily_active_users: float
    voice_minutes_per_month: int
    tool_calls_per_month: int
    retention: Dict[str, float] = Field(
        description="Retention rates: d1, d7, d30"
    )
    optimization_trigger: Dict[str, Any] = Field(
        description="Should optimize, reason, estimated savings"
    )


class RetentionMetrics(BaseModel):
    """User retention metrics"""
    d1_retention: float = Field(description="Day 1 retention rate (0-1)")
    d7_retention: float = Field(description="Day 7 retention rate (0-1)")
    d30_retention: float = Field(description="Day 30 retention rate (0-1)")
    cohort_size: int = Field(description="Number of users in cohort")


# Cost estimation constants (OpenAI Realtime API pricing)
COST_PER_MILLION_INPUT_TOKENS = Decimal('32.00')  # $32 per million audio input tokens
COST_PER_MILLION_OUTPUT_TOKENS = Decimal('64.00')  # $64 per million audio output tokens

# Rough estimates (will refine with real data)
AUDIO_TOKENS_PER_MINUTE = Decimal('10000')  # Approximate
COST_PER_VOICE_MINUTE = (
    (AUDIO_TOKENS_PER_MINUTE / Decimal('1000000')) * COST_PER_MILLION_INPUT_TOKENS +
    (AUDIO_TOKENS_PER_MINUTE / Decimal('1000000')) * COST_PER_MILLION_OUTPUT_TOKENS
)  # ~$0.96 per minute (rough estimate)


def estimate_event_cost(event_type: str, metadata: Optional[Dict[str, Any]] = None) -> Decimal:
    """
    Estimate cost for a usage event

    Args:
        event_type: Type of event (voice_minute, tool_call, etc)
        metadata: Event metadata with additional details

    Returns:
        Estimated cost in USD
    """
    if event_type == 'voice_minute':
        # Voice conversation cost
        return COST_PER_VOICE_MINUTE

    elif event_type == 'tool_call':
        # Tool calls have minimal cost (just text tokens)
        # Assume ~500 tokens per tool call (input + output)
        tokens = metadata.get('tokens', 500) if metadata else 500
        return Decimal(str((tokens / 1000000) * 10))  # Rough estimate

    elif event_type in ['session_start', 'session_end']:
        # No direct cost for session events
        return Decimal('0.00')

    else:
        # Unknown event type
        return Decimal('0.00')
