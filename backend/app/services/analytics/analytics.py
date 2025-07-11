import asyncio
import time
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from enum import Enum
from dataclasses import dataclass, asdict
from app.core.database import get_supabase_client
try:
    from app.core.logging import setup_logging, get_logger  # type: ignore
except Exception:  # pragma: no cover - fallback without optional deps
    import logging

    def setup_logging() -> None:
        pass
    
    def get_logger(name: str = "analytics") -> logging.Logger:
        return logging.getLogger(name)

setup_logging()
logger = get_logger("analytics")

class EventType(Enum):
    """Analytics event types"""
    USER_MESSAGE = "user_message"
    PAM_RESPONSE = "pam_response"
    TASK_COMPLETION = "task_completion"
    FEATURE_USAGE = "feature_usage"
    ERROR_OCCURRED = "error_occurred"
    SESSION_START = "session_start"
    SESSION_END = "session_end"
    INTENT_DETECTED = "intent_detected"
    NODE_EXECUTION = "node_execution"
    API_CALL = "api_call"

class TaskStatus(Enum):
    """Task completion status"""
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"
    TIMEOUT = "timeout"

@dataclass
class AnalyticsEvent:
    """Analytics event data structure"""
    event_type: EventType
    user_id: str
    timestamp: datetime
    event_data: Dict[str, Any]
    session_id: Optional[str] = None
    response_time_ms: Optional[int] = None
    success: bool = True
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class TaskCompletionEvent:
    """Task completion event data"""
    task_type: str
    task_id: str
    status: TaskStatus
    duration_ms: int
    user_id: str
    node_used: str
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]] = None
    error_details: Optional[str] = None

@dataclass
class FeatureUsageEvent:
    """Feature usage tracking data"""
    feature_name: str
    feature_category: str
    user_id: str
    usage_context: str
    parameters: Optional[Dict[str, Any]] = None
    success: bool = True

class PamAnalytics:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.start_times: Dict[str, float] = {}  # Track operation start times
        
    async def track_event(self, event: AnalyticsEvent) -> bool:
        """Store analytics event in database"""
        try:
            # Temporarily simplified to avoid database schema issues
            logger.info(f"Analytics event tracked: {event.event_type.value} for user {event.user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error tracking analytics event: {str(e)}")
            return False
    
    async def track_user_message(self, user_id: str, message: str, session_id: str = None) -> str:
        """Track user message and return tracking ID for response correlation"""
        tracking_id = f"{user_id}_{int(time.time() * 1000)}"
        self.start_times[tracking_id] = time.time()
        
        event = AnalyticsEvent(
            event_type=EventType.USER_MESSAGE,
            user_id=user_id,
            timestamp=datetime.now(),
            session_id=session_id,
            event_data={
                "message_length": len(message),
                "message_preview": message[:100] + "..." if len(message) > 100 else message,
                "tracking_id": tracking_id
            }
        )
        
        # Temporarily disabled database writes
        logger.info(f"Analytics event tracked: {event.event_type.value} for user {user_id}")
        return tracking_id
    
    async def track_pam_response(self, user_id: str, response: str, tracking_id: str, 
                                intent: str = None, confidence: float = None, 
                                node_used: str = None, session_id: str = None) -> None:
        """Track PAM response with performance metrics"""
        try:
            response_time_ms = None
            if tracking_id in self.start_times:
                response_time_ms = int((time.time() - self.start_times[tracking_id]) * 1000)
                del self.start_times[tracking_id]
            
            event = AnalyticsEvent(
                event_type=EventType.PAM_RESPONSE,
                user_id=user_id,
                timestamp=datetime.now(),
                session_id=session_id,
                response_time_ms=response_time_ms,
                event_data={
                    "response_length": len(response),
                    "intent": intent,
                    "confidence": confidence,
                    "node_used": node_used,
                    "tracking_id": tracking_id
                }
            )
            
            # Temporarily disabled database writes
            logger.info(f"Analytics event tracked: {event.event_type.value} for user {event.user_id}")
            
        except Exception as e:
            logger.error(f"Error tracking PAM response: {str(e)}")
    
    async def track_task_completion(self, task_event: TaskCompletionEvent) -> None:
        """Track task completion events"""
        try:
            event = AnalyticsEvent(
                event_type=EventType.TASK_COMPLETION,
                user_id=task_event.user_id,
                timestamp=datetime.now(),
                response_time_ms=task_event.duration_ms,
                success=task_event.status == TaskStatus.SUCCESS,
                event_data={
                    "task_type": task_event.task_type,
                    "task_id": task_event.task_id,
                    "status": task_event.status.value,
                    "node_used": task_event.node_used,
                    "input_size": len(str(task_event.input_data)),
                    "output_size": len(str(task_event.output_data)) if task_event.output_data else 0,
                    "has_error": task_event.error_details is not None
                },
                error_message=task_event.error_details
            )
            
            # Temporarily disabled database writes
            logger.info(f"Analytics event tracked: {event.event_type.value} for user {event.user_id}")
            
        except Exception as e:
            logger.error(f"Error tracking task completion: {str(e)}")
    
    async def track_feature_usage(self, feature_event: FeatureUsageEvent) -> None:
        """Track feature usage and adoption"""
        try:
            event = AnalyticsEvent(
                event_type=EventType.FEATURE_USAGE,
                user_id=feature_event.user_id,
                timestamp=datetime.now(),
                success=feature_event.success,
                event_data={
                    "feature_name": feature_event.feature_name,
                    "feature_category": feature_event.feature_category,
                    "usage_context": feature_event.usage_context,
                    "parameters": feature_event.parameters or {}
                }
            )
            
            # Temporarily disabled database writes
            logger.info(f"Analytics event tracked: {event.event_type.value} for user {event.user_id}")
            
        except Exception as e:
            logger.error(f"Error tracking feature usage: {str(e)}")
    
    async def track_intent_detection(self, user_id: str, detected_intent: str, 
                                   confidence: float, entities: Dict[str, Any] = None,
                                   session_id: str = None) -> None:
        """Track intent detection accuracy and performance"""
        try:
            event = AnalyticsEvent(
                event_type=EventType.INTENT_DETECTED,
                user_id=user_id,
                timestamp=datetime.now(),
                session_id=session_id,
                event_data={
                    "intent": detected_intent,
                    "confidence": confidence,
                    "entities_count": len(entities) if entities else 0,
                    "entities": entities or {},
                    "confidence_level": self._get_confidence_level(confidence)
                }
            )
            
            # Temporarily disabled database writes
            logger.info(f"Analytics event tracked: {event.event_type.value} for user {event.user_id}")
            
        except Exception as e:
            logger.error(f"Error tracking intent detection: {str(e)}")
    
    async def track_node_execution(self, user_id: str, node_name: str, 
                                 method_name: str, duration_ms: int,
                                 success: bool, error: str = None,
                                 session_id: str = None) -> None:
        """Track individual node execution performance"""
        try:
            event = AnalyticsEvent(
                event_type=EventType.NODE_EXECUTION,
                user_id=user_id,
                timestamp=datetime.now(),
                session_id=session_id,
                response_time_ms=duration_ms,
                success=success,
                error_message=error,
                event_data={
                    "node_name": node_name,
                    "method_name": method_name,
                    "performance_category": self._get_performance_category(duration_ms)
                }
            )
            
            # Temporarily disabled database writes
            logger.info(f"Analytics event tracked: {event.event_type.value} for user {event.user_id}")
            
        except Exception as e:
            logger.error(f"Error tracking node execution: {str(e)}")
    
    async def track_api_call(self, user_id: str, api_name: str, endpoint: str,
                           duration_ms: int, status_code: int, 
                           success: bool, session_id: str = None) -> None:
        """Track external API calls and performance"""
        try:
            event = AnalyticsEvent(
                event_type=EventType.API_CALL,
                user_id=user_id,
                timestamp=datetime.now(),
                session_id=session_id,
                response_time_ms=duration_ms,
                success=success,
                event_data={
                    "api_name": api_name,
                    "endpoint": endpoint,
                    "status_code": status_code,
                    "performance_category": self._get_performance_category(duration_ms)
                }
            )
            
            # Temporarily disabled database writes
            logger.info(f"Analytics event tracked: {event.event_type.value} for user {event.user_id}")
            
        except Exception as e:
            logger.error(f"Error tracking API call: {str(e)}")
    
    async def track_error(self, user_id: str, error_type: str, error_message: str,
                         context: Dict[str, Any] = None, session_id: str = None) -> None:
        """Track errors and exceptions"""
        try:
            event = AnalyticsEvent(
                event_type=EventType.ERROR_OCCURRED,
                user_id=user_id,
                timestamp=datetime.now(),
                session_id=session_id,
                success=False,
                error_message=error_message,
                event_data={
                    "error_type": error_type,
                    "context": context or {},
                    "error_severity": self._get_error_severity(error_type)
                }
            )
            
            # Temporarily disabled database writes
            logger.info(f"Analytics event tracked: {event.event_type.value} for user {event.user_id}")
            
        except Exception as e:
            logger.error(f"Error tracking error event: {str(e)}")
    
    # Analytics query methods
    async def get_usage_metrics(self, user_id: str = None, 
                              start_date: datetime = None,
                              end_date: datetime = None) -> Dict[str, Any]:
        """Get PAM usage metrics for analysis"""
        try:
            # Set default date range (last 30 days)
            if not start_date:
                start_date = datetime.now() - timedelta(days=30)
            if not end_date:
                end_date = datetime.now()
            
            query = self.supabase.table("pam_analytics_logs")\
                .select("*")\
                .gte("timestamp", start_date.isoformat())\
                .lte("timestamp", end_date.isoformat())
            
            if user_id:
                query = query.eq("user_id", user_id)
            
            result = query.execute()
            events = result.data
            
            # Calculate metrics
            metrics = {
                "total_events": len(events),
                "unique_users": len(set(e["user_id"] for e in events)),
                "event_types": {},
                "average_response_time": 0,
                "success_rate": 0,
                "most_used_features": {},
                "peak_usage_hours": {},
                "error_rate_by_type": {}
            }
            
            # Calculate event type distribution
            for event in events:
                event_type = event.get("event_type", "unknown")
                metrics["event_types"][event_type] = metrics["event_types"].get(event_type, 0) + 1
            
            # Calculate response times
            response_times = [e["response_time_ms"] for e in events if e.get("response_time_ms")]
            if response_times:
                metrics["average_response_time"] = sum(response_times) / len(response_times)
            
            # Calculate success rate
            success_events = sum(1 for e in events if e.get("success", True))
            metrics["success_rate"] = (success_events / len(events)) * 100 if events else 0
            
            # Calculate peak usage hours
            for event in events:
                try:
                    hour = datetime.fromisoformat(event["timestamp"]).hour
                    metrics["peak_usage_hours"][hour] = metrics["peak_usage_hours"].get(hour, 0) + 1
                except:
                    continue
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting usage metrics: {str(e)}")
            return {}
    
    async def get_feature_adoption_metrics(self, feature_category: str = None) -> Dict[str, Any]:
        """Get feature adoption and usage statistics"""
        try:
            query = self.supabase.table("pam_analytics_logs")\
                .select("*")\
                .eq("event_type", EventType.FEATURE_USAGE.value)
            
            result = query.execute()
            events = result.data
            
            adoption_metrics = {
                "total_feature_uses": len(events),
                "features_by_category": {},
                "feature_popularity": {},
                "user_adoption_rate": {},
                "feature_success_rate": {}
            }
            
            for event in events:
                event_data = event.get("event_data", {})
                feature_name = event_data.get("feature_name", "unknown")
                category = event_data.get("feature_category", "unknown")
                
                if not feature_category or category == feature_category:
                    # Track by category
                    if category not in adoption_metrics["features_by_category"]:
                        adoption_metrics["features_by_category"][category] = {}
                    adoption_metrics["features_by_category"][category][feature_name] = \
                        adoption_metrics["features_by_category"][category].get(feature_name, 0) + 1
                    
                    # Track popularity
                    adoption_metrics["feature_popularity"][feature_name] = \
                        adoption_metrics["feature_popularity"].get(feature_name, 0) + 1
                    
                    # Track success rate
                    if feature_name not in adoption_metrics["feature_success_rate"]:
                        adoption_metrics["feature_success_rate"][feature_name] = {"total": 0, "success": 0}
                    adoption_metrics["feature_success_rate"][feature_name]["total"] += 1
                    if event.get("success", True):
                        adoption_metrics["feature_success_rate"][feature_name]["success"] += 1
            
            # Calculate success percentages
            for feature, stats in adoption_metrics["feature_success_rate"].items():
                if stats["total"] > 0:
                    stats["success_rate"] = (stats["success"] / stats["total"]) * 100
            
            return adoption_metrics
            
        except Exception as e:
            logger.error(f"Error getting feature adoption metrics: {str(e)}")
            return {}
    
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get system performance metrics"""
        try:
            # Get events from last 24 hours
            start_time = datetime.now() - timedelta(hours=24)
            
            result = self.supabase.table("pam_analytics_logs")\
                .select("*")\
                .gte("timestamp", start_time.isoformat())\
                .execute()
            
            events = result.data
            
            performance_metrics = {
                "average_response_time": 0,
                "p95_response_time": 0,
                "p99_response_time": 0,
                "error_rate": 0,
                "throughput_per_hour": 0,
                "node_performance": {},
                "api_performance": {}
            }
            
            # Calculate response time metrics
            response_times = [e["response_time_ms"] for e in events if e.get("response_time_ms")]
            if response_times:
                response_times.sort()
                performance_metrics["average_response_time"] = sum(response_times) / len(response_times)
                performance_metrics["p95_response_time"] = response_times[int(len(response_times) * 0.95)]
                performance_metrics["p99_response_time"] = response_times[int(len(response_times) * 0.99)]
            
            # Calculate error rate
            error_events = sum(1 for e in events if not e.get("success", True))
            performance_metrics["error_rate"] = (error_events / len(events)) * 100 if events else 0
            
            # Calculate throughput
            performance_metrics["throughput_per_hour"] = len(events) / 24
            
            # Node performance breakdown
            node_events = [e for e in events if e.get("event_type") == EventType.NODE_EXECUTION.value]
            for event in node_events:
                event_data = event.get("event_data", {})
                node_name = event_data.get("node_name", "unknown")
                response_time = event.get("response_time_ms", 0)
                
                if node_name not in performance_metrics["node_performance"]:
                    performance_metrics["node_performance"][node_name] = {
                        "calls": 0, "total_time": 0, "errors": 0
                    }
                
                performance_metrics["node_performance"][node_name]["calls"] += 1
                performance_metrics["node_performance"][node_name]["total_time"] += response_time
                if not event.get("success", True):
                    performance_metrics["node_performance"][node_name]["errors"] += 1
            
            # Calculate average times for nodes
            for node, stats in performance_metrics["node_performance"].items():
                if stats["calls"] > 0:
                    stats["average_time"] = stats["total_time"] / stats["calls"]
                    stats["error_rate"] = (stats["errors"] / stats["calls"]) * 100
            
            return performance_metrics
            
        except Exception as e:
            logger.error(f"Error getting performance metrics: {str(e)}")
            return {}
    
    # Helper methods
    def _get_confidence_level(self, confidence: float) -> str:
        """Categorize confidence levels"""
        if confidence >= 0.9:
            return "high"
        elif confidence >= 0.7:
            return "medium"
        elif confidence >= 0.5:
            return "low"
        else:
            return "very_low"
    
    def _get_performance_category(self, duration_ms: int) -> str:
        """Categorize performance based on response time"""
        if duration_ms < 100:
            return "excellent"
        elif duration_ms < 500:
            return "good"
        elif duration_ms < 1000:
            return "acceptable"
        elif duration_ms < 3000:
            return "slow"
        else:
            return "very_slow"
    
    def _get_error_severity(self, error_type: str) -> str:
        """Determine error severity based on type"""
        critical_errors = ["database_error", "auth_error", "security_error"]
        high_errors = ["api_error", "timeout_error", "validation_error"]
        
        if error_type.lower() in critical_errors:
            return "critical"
        elif error_type.lower() in high_errors:
            return "high"
        else:
            return "medium"
    
    async def update_metric(self, metric_name: str, value: Union[int, float], user_id: str, 
                           context: Dict[str, Any] = None) -> None:
        """Update a specific metric value"""
        try:
            # Create a custom analytics event for metric updates
            event = AnalyticsEvent(
                event_type=EventType.FEATURE_USAGE,
                user_id=user_id,
                timestamp=datetime.now(),
                event_data={
                    "metric_name": metric_name,
                    "metric_value": value,
                    "context": context or {},
                    "action": "metric_update"
                }
            )
            
            # Store the metric update
            await self.track_event(event)
            logger.info(f"Metric updated: {metric_name}={value} for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error updating metric {metric_name}: {str(e)}")

# Context managers for automatic tracking
class PerformanceTracker:
    """Context manager for tracking operation performance"""
    
    def __init__(self, analytics: PamAnalytics, operation_name: str, user_id: str):
        self.analytics = analytics
        self.operation_name = operation_name
        self.user_id = user_id
        self.start_time = None
    
    async def __aenter__(self):
        self.start_time = time.time()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        duration_ms = int((time.time() - self.start_time) * 1000)
        success = exc_type is None
        error_message = str(exc_val) if exc_val else None
        
        await self.analytics.track_node_execution(
            user_id=self.user_id,
            node_name="performance_tracker",
            method_name=self.operation_name,
            duration_ms=duration_ms,
            success=success,
            error=error_message
        )

# Global analytics instance
# Provide a generic alias for compatibility with production imports
Analytics = PamAnalytics
analytics = PamAnalytics()
