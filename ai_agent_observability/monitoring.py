"""
Enhanced Monitoring and Cost Tracking
Error tracking, alerting, and cost optimization features
"""

import time
import functools
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import json
from observability_config import observability

@dataclass
class CostMetrics:
    """Cost tracking metrics"""
    total_tokens: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    estimated_cost_usd: float = 0.0
    api_calls: int = 0
    timestamp: float = field(default_factory=time.time)

@dataclass
class ErrorMetrics:
    """Error tracking metrics"""
    error_count: int = 0
    error_types: Dict[str, int] = field(default_factory=dict)
    last_error: Optional[str] = None
    error_history: List[Dict[str, Any]] = field(default_factory=list)
    timestamp: float = field(default_factory=time.time)

@dataclass
class PerformanceMetrics:
    """Performance tracking metrics"""
    total_calls: int = 0
    avg_response_time: float = 0.0
    min_response_time: float = float('inf')
    max_response_time: float = 0.0
    success_rate: float = 100.0
    timestamp: float = field(default_factory=time.time)

class ObservabilityMonitor:
    """Comprehensive monitoring system for AI agents"""
    
    def __init__(self):
        self.cost_metrics = CostMetrics()
        self.error_metrics = ErrorMetrics()
        self.performance_metrics = PerformanceMetrics()
        self.session_start = time.time()
        
        # Cost estimates per model (USD per 1K tokens)
        self.model_costs = {
            "gpt-4": {"input": 0.03, "output": 0.06},
            "gpt-4-turbo": {"input": 0.01, "output": 0.03},
            "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
            "claude-3": {"input": 0.015, "output": 0.075},
            "claude-3-haiku": {"input": 0.00025, "output": 0.00125}
        }
        
        # Alert thresholds
        self.cost_alert_threshold = 10.0  # USD
        self.error_rate_threshold = 0.1   # 10%
        self.response_time_threshold = 30.0  # seconds
        
    def track_llm_usage(self, model: str = "gpt-4", tokens_used: int = 0, 
                       prompt_tokens: int = 0, completion_tokens: int = 0):
        """Track LLM usage and costs"""
        self.cost_metrics.total_tokens += tokens_used
        self.cost_metrics.prompt_tokens += prompt_tokens
        self.cost_metrics.completion_tokens += completion_tokens
        self.cost_metrics.api_calls += 1
        
        # Calculate cost
        if model in self.model_costs:
            input_cost = (prompt_tokens / 1000) * self.model_costs[model]["input"]
            output_cost = (completion_tokens / 1000) * self.model_costs[model]["output"]
            call_cost = input_cost + output_cost
            self.cost_metrics.estimated_cost_usd += call_cost
            
            observability.logger.info(
                f"💰 LLM Usage - Model: {model}, Tokens: {tokens_used}, Cost: ${call_cost:.4f}"
            )
            
            # Check cost alert
            if self.cost_metrics.estimated_cost_usd > self.cost_alert_threshold:
                self._trigger_cost_alert()
    
    def track_error(self, error: Exception, context: Dict[str, Any] = None):
        """Track and categorize errors"""
        error_type = type(error).__name__
        error_message = str(error)
        
        self.error_metrics.error_count += 1
        self.error_metrics.error_types[error_type] = self.error_metrics.error_types.get(error_type, 0) + 1
        self.error_metrics.last_error = error_message
        
        error_record = {
            "timestamp": time.time(),
            "error_type": error_type,
            "error_message": error_message,
            "context": context or {}
        }
        
        self.error_metrics.error_history.append(error_record)
        
        # Keep only last 100 errors
        if len(self.error_metrics.error_history) > 100:
            self.error_metrics.error_history = self.error_metrics.error_history[-100:]
        
        observability.logger.error(f"❌ Error tracked: {error_type} - {error_message}")
        
        # Check error rate alert
        self._update_success_rate()
        if self.performance_metrics.success_rate < (1 - self.error_rate_threshold) * 100:
            self._trigger_error_rate_alert()
    
    def track_performance(self, response_time: float, success: bool = True):
        """Track performance metrics"""
        self.performance_metrics.total_calls += 1
        
        # Update response time metrics
        if response_time < self.performance_metrics.min_response_time:
            self.performance_metrics.min_response_time = response_time
        if response_time > self.performance_metrics.max_response_time:
            self.performance_metrics.max_response_time = response_time
        
        # Calculate running average
        current_avg = self.performance_metrics.avg_response_time
        total_calls = self.performance_metrics.total_calls
        self.performance_metrics.avg_response_time = (
            (current_avg * (total_calls - 1) + response_time) / total_calls
        )
        
        # Update success rate
        if success:
            self._update_success_rate()
        
        # Check performance alert
        if response_time > self.response_time_threshold:
            self._trigger_performance_alert(response_time)
    
    def _update_success_rate(self):
        """Update success rate based on total calls and errors"""
        if self.performance_metrics.total_calls > 0:
            success_calls = self.performance_metrics.total_calls - self.error_metrics.error_count
            self.performance_metrics.success_rate = (success_calls / self.performance_metrics.total_calls) * 100
    
    def _trigger_cost_alert(self):
        """Trigger cost threshold alert"""
        alert_message = f"💸 COST ALERT: Estimated cost ${self.cost_metrics.estimated_cost_usd:.2f} exceeds threshold ${self.cost_alert_threshold}"
        observability.logger.warning(alert_message)
        
        # You could integrate with alerting systems here (Slack, email, etc.)
        self._send_alert("COST_THRESHOLD", alert_message)
    
    def _trigger_error_rate_alert(self):
        """Trigger error rate alert"""
        alert_message = f"⚠️ ERROR RATE ALERT: Success rate {self.performance_metrics.success_rate:.1f}% below threshold"
        observability.logger.warning(alert_message)
        
        self._send_alert("ERROR_RATE", alert_message)
    
    def _trigger_performance_alert(self, response_time: float):
        """Trigger performance alert"""
        alert_message = f"🐌 PERFORMANCE ALERT: Response time {response_time:.2f}s exceeds threshold {self.response_time_threshold}s"
        observability.logger.warning(alert_message)
        
        self._send_alert("PERFORMANCE", alert_message)
    
    def _send_alert(self, alert_type: str, message: str):
        """Send alert through configured channels"""
        # This could be extended to send to Slack, email, PagerDuty, etc.
        alert_data = {
            "type": alert_type,
            "message": message,
            "timestamp": time.time(),
            "session_id": getattr(self, 'session_id', 'unknown')
        }
        
        # Log to file or external service
        observability.logger.critical(f"ALERT: {json.dumps(alert_data)}")
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get comprehensive dashboard data"""
        session_duration = time.time() - self.session_start
        
        return {
            "session_info": {
                "duration_seconds": session_duration,
                "started_at": self.session_start,
                "session_id": getattr(self, 'session_id', 'unknown')
            },
            "cost_metrics": {
                "total_tokens": self.cost_metrics.total_tokens,
                "prompt_tokens": self.cost_metrics.prompt_tokens,
                "completion_tokens": self.cost_metrics.completion_tokens,
                "estimated_cost_usd": self.cost_metrics.estimated_cost_usd,
                "api_calls": self.cost_metrics.api_calls,
                "cost_per_call": self.cost_metrics.estimated_cost_usd / max(self.cost_metrics.api_calls, 1)
            },
            "error_metrics": {
                "total_errors": self.error_metrics.error_count,
                "error_types": self.error_metrics.error_types,
                "error_rate_percent": (self.error_metrics.error_count / max(self.performance_metrics.total_calls, 1)) * 100,
                "last_error": self.error_metrics.last_error
            },
            "performance_metrics": {
                "total_calls": self.performance_metrics.total_calls,
                "avg_response_time": self.performance_metrics.avg_response_time,
                "min_response_time": self.performance_metrics.min_response_time if self.performance_metrics.min_response_time != float('inf') else 0,
                "max_response_time": self.performance_metrics.max_response_time,
                "success_rate": self.performance_metrics.success_rate,
                "calls_per_minute": (self.performance_metrics.total_calls / session_duration) * 60 if session_duration > 0 else 0
            },
            "alerts": {
                "cost_threshold": self.cost_alert_threshold,
                "error_rate_threshold": self.error_rate_threshold * 100,
                "response_time_threshold": self.response_time_threshold
            }
        }
    
    def generate_report(self) -> str:
        """Generate a human-readable monitoring report"""
        data = self.get_dashboard_data()
        
        report = f"""
🔍 AI Agent Observability Report
================================

📊 Session Overview:
• Duration: {data['session_info']['duration_seconds']:.0f} seconds
• Total API Calls: {data['performance_metrics']['total_calls']}
• Success Rate: {data['performance_metrics']['success_rate']:.1f}%

💰 Cost Analysis:
• Total Tokens: {data['cost_metrics']['total_tokens']:,}
• Estimated Cost: ${data['cost_metrics']['estimated_cost_usd']:.4f}
• Average Cost per Call: ${data['cost_metrics']['cost_per_call']:.4f}
• API Calls: {data['cost_metrics']['api_calls']}

⚡ Performance Metrics:
• Average Response Time: {data['performance_metrics']['avg_response_time']:.2f}s
• Min Response Time: {data['performance_metrics']['min_response_time']:.2f}s
• Max Response Time: {data['performance_metrics']['max_response_time']:.2f}s
• Calls per Minute: {data['performance_metrics']['calls_per_minute']:.1f}

❌ Error Summary:
• Total Errors: {data['error_metrics']['total_errors']}
• Error Rate: {data['error_metrics']['error_rate_percent']:.1f}%
• Error Types: {', '.join(data['error_metrics']['error_types'].keys()) or 'None'}

🚨 Alert Thresholds:
• Cost Alert: ${data['alerts']['cost_threshold']}
• Error Rate Alert: {data['alerts']['error_rate_threshold']}%
• Response Time Alert: {data['alerts']['response_time_threshold']}s
        """
        
        return report.strip()

def monitor_function(monitor: ObservabilityMonitor):
    """Decorator to automatically monitor function performance and errors"""
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            
            try:
                result = func(*args, **kwargs)
                return result
                
            except Exception as e:
                success = False
                monitor.track_error(e, {
                    "function": func.__name__,
                    "args": str(args)[:200],
                    "kwargs": str(kwargs)[:200]
                })
                raise
                
            finally:
                execution_time = time.time() - start_time
                monitor.track_performance(execution_time, success)
                
        return wrapper
    return decorator

# Global monitor instance
global_monitor = ObservabilityMonitor()