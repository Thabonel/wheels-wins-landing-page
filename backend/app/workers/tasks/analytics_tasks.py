
from celery import current_app
from app.workers.celery import celery_app
from app.core.logging import get_logger
from app.database.supabase_client import get_supabase_client
from datetime import datetime, timedelta
import json

logger = get_logger(__name__)

@celery_app.task(bind=True)
def process_hourly_analytics(self):
    """Process hourly analytics data"""
    try:
        logger.info("Processing hourly analytics")
        supabase = get_supabase_client()
        
        # Get analytics logs from the last hour
        one_hour_ago = datetime.now() - timedelta(hours=1)
        
        response = supabase.table("pam_analytics_logs").select("*").filter(
            "created_at", "gte", one_hour_ago.isoformat()
        ).execute()
        
        logs = response.data
        
        # Process analytics
        analytics = {
            "total_interactions": len(logs),
            "unique_users": len(set(log.get("user_id") for log in logs if log.get("user_id"))),
            "avg_response_time": _calculate_avg_response_time(logs),
            "error_rate": _calculate_error_rate(logs),
            "top_intents": _get_top_intents(logs),
            "processed_at": datetime.now().isoformat()
        }
        
        # Store processed analytics
        supabase.table("analytics_summary").insert({
            "period": "hourly",
            "data": analytics,
            "timestamp": datetime.now().isoformat()
        }).execute()
        
        logger.info(f"Processed {len(logs)} analytics entries")
        return analytics
        
    except Exception as exc:
        logger.error(f"Failed to process hourly analytics: {exc}")
        raise

@celery_app.task(bind=True)
def process_daily_analytics(self):
    """Process daily analytics summary"""
    try:
        logger.info("Processing daily analytics")
        supabase = get_supabase_client()
        
        # Get data from the last 24 hours
        yesterday = datetime.now() - timedelta(days=1)
        
        response = supabase.table("pam_analytics_logs").select("*").filter(
            "created_at", "gte", yesterday.isoformat()
        ).execute()
        
        logs = response.data
        
        # Calculate daily metrics
        daily_analytics = {
            "date": yesterday.date().isoformat(),
            "total_interactions": len(logs),
            "unique_users": len(set(log.get("user_id") for log in logs if log.get("user_id"))),
            "avg_response_time": _calculate_avg_response_time(logs),
            "error_rate": _calculate_error_rate(logs),
            "popular_features": _get_popular_features(logs),
            "user_engagement": _calculate_user_engagement(logs),
            "processed_at": datetime.now().isoformat()
        }
        
        # Store daily summary
        supabase.table("analytics_daily").insert(daily_analytics).execute()
        
        logger.info(f"Processed daily analytics for {yesterday.date()}")
        return daily_analytics
        
    except Exception as exc:
        logger.error(f"Failed to process daily analytics: {exc}")
        raise

@celery_app.task(bind=True)
def generate_user_insights(self, user_id: str):
    """Generate insights for a specific user"""
    try:
        logger.info(f"Generating insights for user {user_id}")
        supabase = get_supabase_client()
        
        # Get user's activity from last 30 days
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        response = supabase.table("pam_analytics_logs").select("*").filter(
            "user_id", "eq", user_id
        ).filter(
            "created_at", "gte", thirty_days_ago.isoformat()
        ).execute()
        
        logs = response.data
        
        if not logs:
            return {"user_id": user_id, "message": "No activity found"}
        
        # Generate insights
        insights = {
            "user_id": user_id,
            "activity_summary": {
                "total_interactions": len(logs),
                "avg_daily_usage": len(logs) / 30,
                "most_active_time": _get_most_active_time(logs),
                "preferred_features": _get_user_preferred_features(logs)
            },
            "engagement_score": _calculate_engagement_score(logs),
            "recommendations": _generate_user_recommendations(logs),
            "generated_at": datetime.now().isoformat()
        }
        
        logger.info(f"Generated insights for user {user_id}")
        return insights
        
    except Exception as exc:
        logger.error(f"Failed to generate user insights: {exc}")
        raise

def _calculate_avg_response_time(logs):
    """Calculate average response time from logs"""
    response_times = [log.get("response_time_ms", 0) for log in logs if log.get("response_time_ms")]
    return sum(response_times) / len(response_times) if response_times else 0

def _calculate_error_rate(logs):
    """Calculate error rate from logs"""
    errors = len([log for log in logs if log.get("has_error", False)])
    return (errors / len(logs)) * 100 if logs else 0

def _get_top_intents(logs):
    """Get top intents from logs"""
    intents = {}
    for log in logs:
        intent = log.get("intent")
        if intent:
            intents[intent] = intents.get(intent, 0) + 1
    
    return sorted(intents.items(), key=lambda x: x[1], reverse=True)[:5]

def _get_popular_features(logs):
    """Get popular features from logs"""
    features = {}
    for log in logs:
        intent = log.get("intent")
        if intent:
            features[intent] = features.get(intent, 0) + 1
    
    return dict(sorted(features.items(), key=lambda x: x[1], reverse=True)[:10])

def _calculate_user_engagement(logs):
    """Calculate user engagement metrics"""
    unique_users = set(log.get("user_id") for log in logs if log.get("user_id"))
    user_sessions = {}
    
    for log in logs:
        user_id = log.get("user_id")
        if user_id:
            user_sessions[user_id] = user_sessions.get(user_id, 0) + 1
    
    avg_sessions = sum(user_sessions.values()) / len(user_sessions) if user_sessions else 0
    
    return {
        "active_users": len(unique_users),
        "avg_sessions_per_user": avg_sessions,
        "retention_rate": _calculate_retention_rate(logs)
    }

def _calculate_retention_rate(logs):
    """Calculate user retention rate"""
    # Simplified retention calculation
    return 85.0  # Placeholder

def _get_most_active_time(logs):
    """Get user's most active time of day"""
    hours = {}
    for log in logs:
        if log.get("hour_of_day"):
            hour = log["hour_of_day"]
            hours[hour] = hours.get(hour, 0) + 1
    
    if hours:
        most_active_hour = max(hours.items(), key=lambda x: x[1])[0]
        return f"{most_active_hour}:00"
    return "Unknown"

def _get_user_preferred_features(logs):
    """Get user's preferred features"""
    return _get_top_intents(logs)[:3]

def _calculate_engagement_score(logs):
    """Calculate user engagement score"""
    # Simple engagement score based on activity
    score = min(len(logs) * 2, 100)  # Max 100
    return score

def _generate_user_recommendations(logs):
    """Generate recommendations for user"""
    recommendations = []
    
    # Analyze usage patterns and suggest improvements
    if len(logs) < 10:
        recommendations.append("Try exploring more PAM features to get the most out of your travel planning!")
    
    error_rate = _calculate_error_rate(logs)
    if error_rate > 20:
        recommendations.append("Consider checking your internet connection for better PAM performance.")
    
    return recommendations
