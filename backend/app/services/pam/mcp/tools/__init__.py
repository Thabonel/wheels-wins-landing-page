from .plan_trip import plan_trip
from .track_expense import track_expense
from .get_user_context import get_user_context
from .finance import log_expense, suggest_budget_adjustment, fetch_summary
from .social import post_update, suggest_groups
from .moneymaker import (
    add_idea,
    list_active_ideas,
    estimate_monthly_income,
)
from .shop import suggest_affiliate_product
from .feedback import record_user_feedback

# New comprehensive database management tools
from .database_management import (
    pam_create_record,
    pam_read_records,
    pam_update_records,
    pam_delete_records,
    pam_upsert_records,
    pam_count_records,
    pam_bulk_database_operation,
    pam_get_database_stats,
    pam_check_database_health,
)

# Analytics management tools
from .analytics_management import (
    pam_log_analytics_event,
    pam_generate_daily_analytics,
    pam_generate_analytics_summary,
    pam_create_recommendation,
    pam_get_analytics_insights,
)

# Session management tools
from .session_management import (
    pam_create_chat_session,
    pam_update_chat_session,
    pam_manage_user_session,
    pam_get_session_analytics,
    pam_clean_expired_sessions,
)

# Maintenance and vehicle tools
from .maintenance_vehicle import (
    pam_log_maintenance,
    pam_log_fuel,
    pam_manage_fuel_stations,
    pam_get_maintenance_schedule,
)

__all__ = [
    # Original tools
    "plan_trip",
    "track_expense",
    "get_user_context",
    "log_expense",
    "suggest_budget_adjustment",
    "fetch_summary",
    "post_update",
    "suggest_groups",
    "add_idea",
    "list_active_ideas",
    "estimate_monthly_income",
    "suggest_affiliate_product",
    "record_user_feedback",
    
    # Database management tools
    "pam_create_record",
    "pam_read_records",
    "pam_update_records",
    "pam_delete_records",
    "pam_upsert_records",
    "pam_count_records",
    "pam_bulk_database_operation",
    "pam_get_database_stats",
    "pam_check_database_health",
    
    # Analytics management tools
    "pam_log_analytics_event",
    "pam_generate_daily_analytics",
    "pam_generate_analytics_summary",
    "pam_create_recommendation",
    "pam_get_analytics_insights",
    
    # Session management tools
    "pam_create_chat_session",
    "pam_update_chat_session",
    "pam_manage_user_session",
    "pam_get_session_analytics",
    "pam_clean_expired_sessions",
    
    # Maintenance and vehicle tools
    "pam_log_maintenance",
    "pam_log_fuel",
    "pam_manage_fuel_stations",
    "pam_get_maintenance_schedule",
]
