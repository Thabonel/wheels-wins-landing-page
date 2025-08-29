"""
Analytics Management Tools - Full control over analytics and monitoring
"""
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from langchain_core.tools import tool
from app.services.pam.database.unified_database_service import get_pam_database_service
from app.core.logging import get_logger
import json

logger = get_logger("pam_analytics_tools")


@tool
async def pam_log_analytics_event(
    event_type: str,
    event_data: Dict[str, Any],
    user_id: Optional[str] = None,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Log an analytics event to track PAM usage and performance.
    
    Args:
        event_type: Type of event (e.g., 'tool_usage', 'query_performance', 'user_interaction')
        event_data: Event-specific data
        user_id: Optional user ID
        session_id: Optional session ID
    
    Returns:
        Created analytics log entry
    """
    try:
        db = await get_pam_database_service()
        table = await db.get_table("pam_analytics_logs")
        
        log_entry = {
            "event_type": event_type,
            "event_data": event_data,
            "user_id": user_id,
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": {
                "version": "1.0",
                "source": "pam_tools"
            }
        }
        
        result = await table.create(log_entry)
        
        if result.get("success"):
            return {"success": True, "log_id": result.get("data", {}).get("id")}
        else:
            return {"success": False, "error": result.get("error")}
            
    except Exception as e:
        logger.error(f"Failed to log analytics event: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_generate_daily_analytics(target_date: Optional[str] = None) -> Dict[str, Any]:
    """
    Generate daily analytics summary for a specific date.
    
    Args:
        target_date: Date to generate analytics for (YYYY-MM-DD format). Defaults to yesterday.
    
    Returns:
        Generated analytics summary
    """
    try:
        db = await get_pam_database_service()
        
        # Default to yesterday if no date provided
        if not target_date:
            target_date = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Get all analytics logs for the target date
        logs_table = await db.get_table("pam_analytics_logs")
        
        start_time = f"{target_date}T00:00:00"
        end_time = f"{target_date}T23:59:59"
        
        logs_result = await logs_table.read(filters={
            "timestamp": {"gte": start_time, "lte": end_time}
        })
        
        if not logs_result.get("success"):
            return {"success": False, "error": "Failed to fetch analytics logs"}
        
        logs = logs_result.get("data", [])
        
        # Calculate metrics
        metrics = {
            "total_events": len(logs),
            "unique_users": len(set(log.get("user_id") for log in logs if log.get("user_id"))),
            "unique_sessions": len(set(log.get("session_id") for log in logs if log.get("session_id"))),
            "event_types": {},
            "hourly_distribution": {str(h): 0 for h in range(24)},
            "tool_usage": {},
            "error_count": 0
        }
        
        # Process logs
        for log in logs:
            event_type = log.get("event_type", "unknown")
            metrics["event_types"][event_type] = metrics["event_types"].get(event_type, 0) + 1
            
            # Hour distribution
            timestamp = log.get("timestamp", "")
            if timestamp:
                hour = datetime.fromisoformat(timestamp.replace("Z", "+00:00")).hour
                metrics["hourly_distribution"][str(hour)] += 1
            
            # Tool usage
            event_data = log.get("event_data", {})
            if event_type == "tool_usage":
                tool_name = event_data.get("tool_name", "unknown")
                metrics["tool_usage"][tool_name] = metrics["tool_usage"].get(tool_name, 0) + 1
            
            # Error tracking
            if event_data.get("error") or event_type == "error":
                metrics["error_count"] += 1
        
        # Save to analytics_daily table
        daily_table = await db.get_table("analytics_daily", use_service_client=True)
        
        daily_summary = {
            "date": target_date,
            "metrics": metrics,
            "generated_at": datetime.utcnow().isoformat(),
            "log_count": len(logs)
        }
        
        result = await daily_table.upsert(daily_summary)
        
        if result.get("success"):
            return {
                "success": True,
                "date": target_date,
                "metrics": metrics,
                "summary_id": result.get("data", [{}])[0].get("id")
            }
        else:
            return {"success": False, "error": result.get("error")}
            
    except Exception as e:
        logger.error(f"Failed to generate daily analytics: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_generate_analytics_summary(
    start_date: str,
    end_date: str,
    summary_type: str = "weekly"
) -> Dict[str, Any]:
    """
    Generate analytics summary for a date range.
    
    Args:
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        summary_type: Type of summary ('weekly', 'monthly', 'custom')
    
    Returns:
        Analytics summary for the period
    """
    try:
        db = await get_pam_database_service()
        
        # Get daily analytics for the date range
        daily_table = await db.get_table("analytics_daily")
        
        daily_result = await daily_table.read(filters={
            "date": {"gte": start_date, "lte": end_date}
        })
        
        if not daily_result.get("success"):
            return {"success": False, "error": "Failed to fetch daily analytics"}
        
        daily_data = daily_result.get("data", [])
        
        # Aggregate metrics
        aggregated = {
            "period": {"start": start_date, "end": end_date, "type": summary_type},
            "total_events": 0,
            "total_unique_users": set(),
            "total_unique_sessions": set(),
            "event_type_totals": {},
            "tool_usage_totals": {},
            "total_errors": 0,
            "daily_averages": {},
            "peak_usage_day": None,
            "peak_usage_count": 0
        }
        
        for day in daily_data:
            metrics = day.get("metrics", {})
            
            # Sum up totals
            day_total = metrics.get("total_events", 0)
            aggregated["total_events"] += day_total
            aggregated["total_errors"] += metrics.get("error_count", 0)
            
            # Track peak day
            if day_total > aggregated["peak_usage_count"]:
                aggregated["peak_usage_count"] = day_total
                aggregated["peak_usage_day"] = day.get("date")
            
            # Aggregate event types
            for event_type, count in metrics.get("event_types", {}).items():
                aggregated["event_type_totals"][event_type] = \
                    aggregated["event_type_totals"].get(event_type, 0) + count
            
            # Aggregate tool usage
            for tool, count in metrics.get("tool_usage", {}).items():
                aggregated["tool_usage_totals"][tool] = \
                    aggregated["tool_usage_totals"].get(tool, 0) + count
        
        # Calculate averages
        num_days = len(daily_data) or 1
        aggregated["daily_averages"] = {
            "events_per_day": aggregated["total_events"] / num_days,
            "errors_per_day": aggregated["total_errors"] / num_days
        }
        
        # Convert sets to counts
        aggregated["total_unique_users"] = len(aggregated["total_unique_users"])
        aggregated["total_unique_sessions"] = len(aggregated["total_unique_sessions"])
        
        # Save to analytics_summary table
        summary_table = await db.get_table("analytics_summary", use_service_client=True)
        
        summary_record = {
            "summary_type": summary_type,
            "start_date": start_date,
            "end_date": end_date,
            "metrics": aggregated,
            "generated_at": datetime.utcnow().isoformat()
        }
        
        result = await summary_table.create(summary_record)
        
        if result.get("success"):
            return {
                "success": True,
                "summary": aggregated,
                "summary_id": result.get("data", {}).get("id")
            }
        else:
            return {"success": False, "error": result.get("error")}
            
    except Exception as e:
        logger.error(f"Failed to generate analytics summary: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_create_recommendation(
    user_id: str,
    recommendation_type: str,
    content: Dict[str, Any],
    priority: str = "medium",
    expires_at: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create an active recommendation for a user.
    
    Args:
        user_id: User to create recommendation for
        recommendation_type: Type of recommendation (e.g., 'trip', 'maintenance', 'budget')
        content: Recommendation details
        priority: Priority level ('low', 'medium', 'high')
        expires_at: Optional expiration timestamp
    
    Returns:
        Created recommendation
    """
    try:
        db = await get_pam_database_service()
        table = await db.get_table("active_recommendations")
        
        recommendation = {
            "user_id": user_id,
            "recommendation_type": recommendation_type,
            "content": content,
            "priority": priority,
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": expires_at
        }
        
        result = await table.create(recommendation)
        
        if result.get("success"):
            return {
                "success": True,
                "recommendation_id": result.get("data", {}).get("id"),
                "data": result.get("data")
            }
        else:
            return {"success": False, "error": result.get("error")}
            
    except Exception as e:
        logger.error(f"Failed to create recommendation: {e}")
        return {"success": False, "error": str(e)}


@tool
async def pam_get_analytics_insights(
    user_id: Optional[str] = None,
    insight_type: str = "general"
) -> Dict[str, Any]:
    """
    Get intelligent insights from analytics data.
    
    Args:
        user_id: Optional user ID for user-specific insights
        insight_type: Type of insights ('general', 'user', 'performance', 'trends')
    
    Returns:
        Analytics insights and recommendations
    """
    try:
        db = await get_pam_database_service()
        
        insights = {
            "insight_type": insight_type,
            "generated_at": datetime.utcnow().isoformat(),
            "insights": []
        }
        
        if insight_type in ["general", "performance"]:
            # Get recent analytics summary
            summary_table = await db.get_table("analytics_summary")
            recent_summaries = await summary_table.read(limit=5)
            
            if recent_summaries.get("success") and recent_summaries.get("data"):
                latest = recent_summaries.get("data")[0]
                metrics = latest.get("metrics", {})
                
                # Generate insights
                if metrics.get("total_errors", 0) > metrics.get("total_events", 1) * 0.05:
                    insights["insights"].append({
                        "type": "warning",
                        "message": "Error rate is above 5% - investigation recommended",
                        "metric": "error_rate",
                        "value": metrics.get("total_errors") / max(metrics.get("total_events", 1), 1)
                    })
                
                # Tool usage insights
                tool_usage = metrics.get("tool_usage_totals", {})
                if tool_usage:
                    most_used = max(tool_usage.items(), key=lambda x: x[1])
                    insights["insights"].append({
                        "type": "info",
                        "message": f"Most used tool: {most_used[0]} ({most_used[1]} uses)",
                        "metric": "tool_usage",
                        "value": most_used
                    })
        
        if insight_type in ["user", "general"] and user_id:
            # Get user-specific analytics
            logs_table = await db.get_table("pam_analytics_logs")
            user_logs = await logs_table.read(
                filters={"user_id": user_id},
                limit=100
            )
            
            if user_logs.get("success") and user_logs.get("data"):
                # Analyze user patterns
                event_types = {}
                for log in user_logs.get("data", []):
                    event_type = log.get("event_type", "unknown")
                    event_types[event_type] = event_types.get(event_type, 0) + 1
                
                insights["insights"].append({
                    "type": "user_pattern",
                    "message": f"User's most common action: {max(event_types.items(), key=lambda x: x[1])[0]}",
                    "metric": "user_behavior",
                    "value": event_types
                })
        
        return {
            "success": True,
            "insights": insights,
            "recommendation_count": len(insights.get("insights", []))
        }
        
    except Exception as e:
        logger.error(f"Failed to get analytics insights: {e}")
        return {"success": False, "error": str(e)}