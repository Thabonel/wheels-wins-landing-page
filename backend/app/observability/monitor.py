"""
Observability Monitor for Wheels and Wins
Integrated with existing monitoring infrastructure
"""

import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import logging

from .config import observability

logger = logging.getLogger(__name__)

@dataclass
class ObservabilityMetrics:
    """Metrics for observability platforms"""
    total_observations: int = 0
    successful_observations: int = 0
    failed_observations: int = 0
    total_llm_calls: int = 0
    total_tokens: int = 0
    estimated_cost: float = 0.0
    avg_response_time: float = 0.0
    last_updated: float = field(default_factory=time.time)

class ObservabilityMonitor:
    """Monitor for AI agent observability within Wheels and Wins"""
    
    def __init__(self):
        self.metrics = ObservabilityMetrics()
        self.session_start = time.time()
        self.response_times: List[float] = []
        
    def record_observation(self, observation_type: str, duration: float, 
                         success: bool = True, metadata: Dict[str, Any] = None):
        """Record an observation event"""
        self.metrics.total_observations += 1
        
        if success:
            self.metrics.successful_observations += 1
        else:
            self.metrics.failed_observations += 1
            
        # Update response times
        self.response_times.append(duration)
        if len(self.response_times) > 100:  # Keep last 100 measurements
            self.response_times = self.response_times[-100:]
            
        # Calculate average response time
        self.metrics.avg_response_time = sum(self.response_times) / len(self.response_times)
        self.metrics.last_updated = time.time()
        
        logger.debug(f"Recorded {observation_type} observation: {duration:.3f}s, success: {success}")
        
    def record_llm_call(self, model: str, tokens: int = 0, cost: float = 0.0):
        """Record LLM API call metrics"""
        self.metrics.total_llm_calls += 1
        self.metrics.total_tokens += tokens
        self.metrics.estimated_cost += cost
        self.metrics.last_updated = time.time()
        
        logger.debug(f"Recorded LLM call: {model}, tokens: {tokens}, cost: ${cost:.4f}")
        
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics"""
        session_duration = time.time() - self.session_start
        success_rate = 0.0
        
        if self.metrics.total_observations > 0:
            success_rate = (self.metrics.successful_observations / self.metrics.total_observations) * 100
            
        return {
            "session_info": {
                "duration_seconds": session_duration,
                "started_at": self.session_start,
                "observability_status": observability.get_status()
            },
            "observation_metrics": {
                "total_observations": self.metrics.total_observations,
                "successful_observations": self.metrics.successful_observations,
                "failed_observations": self.metrics.failed_observations,
                "success_rate_percent": success_rate,
                "avg_response_time_seconds": self.metrics.avg_response_time
            },
            "llm_metrics": {
                "total_calls": self.metrics.total_llm_calls,
                "total_tokens": self.metrics.total_tokens,
                "estimated_cost_usd": self.metrics.estimated_cost,
                "avg_tokens_per_call": self.metrics.total_tokens / max(self.metrics.total_llm_calls, 1),
                "avg_cost_per_call": self.metrics.estimated_cost / max(self.metrics.total_llm_calls, 1)
            },
            "platform_status": observability.get_status(),
            "last_updated": self.metrics.last_updated
        }
        
    def get_dashboard_summary(self) -> Dict[str, Any]:
        """Get summary for admin dashboard"""
        metrics = self.get_metrics()
        
        return {
            "status": "active" if observability.is_enabled() else "disabled",
            "platforms": {
                "openai": metrics["platform_status"]["openai"]["client_ready"],
                "langfuse": metrics["platform_status"]["langfuse"]["client_ready"]
            },
            "key_metrics": {
                "total_observations": metrics["observation_metrics"]["total_observations"],
                "success_rate": f"{metrics['observation_metrics']['success_rate_percent']:.1f}%",
                "total_llm_calls": metrics["llm_metrics"]["total_calls"],
                "estimated_cost": f"${metrics['llm_metrics']['estimated_cost_usd']:.4f}",
                "avg_response_time": f"{metrics['observation_metrics']['avg_response_time_seconds']:.3f}s"
            },
            "session_duration": f"{metrics['session_info']['duration_seconds']:.0f}s",
            "last_updated": datetime.fromtimestamp(metrics["last_updated"]).isoformat()
        }
        
    def reset_metrics(self):
        """Reset all metrics"""
        self.metrics = ObservabilityMetrics()
        self.session_start = time.time()
        self.response_times = []
        logger.info("Observability metrics reset")
        
    def health_check(self) -> Dict[str, Any]:
        """Health check for observability systems"""
        status = observability.get_status()
        
        health = {
            "overall_status": "healthy" if status["enabled"] else "disabled",
            "platforms": {},
            "issues": []
        }
        
        # Initialize observability if not already done
        if status["enabled"] and not status["initialized"]:
            try:
                observability.initialize_all()
                status = observability.get_status()  # Refresh status after initialization
            except Exception as e:
                logger.warning(f"Failed to initialize observability during health check: {e}")
        
        # Check each platform
        for platform in ["openai", "langfuse"]:
            platform_status = status.get(platform, {})
            configured = platform_status.get("configured", False)
            ready = platform_status.get("client_ready", False) or platform_status.get("initialized", False)
            
            # Determine platform health status
            if configured and ready:
                platform_health = "healthy"
            elif configured and not ready:
                platform_health = "degraded"
            elif not configured:
                platform_health = "not_configured"
            else:
                platform_health = "degraded"
            
            health["platforms"][platform] = {
                "status": platform_health,
                "configured": configured,
                "ready": ready
            }
            
            # Add specific issues for better diagnostics
            if configured and not ready:
                health["issues"].append(f"{platform} is configured but not ready - check credentials")
            elif not configured:
                if platform == "langfuse":
                    health["issues"].append(f"{platform} is not configured - set LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY")
                elif platform == "openai":
                    health["issues"].append(f"{platform} is not configured - set OPENAI_API_KEY environment variable")
        
        # Overall health determination - be more lenient since observability is optional
        healthy_platforms = sum(1 for p in health["platforms"].values() if p["status"] == "healthy")
        configured_platforms = sum(1 for p in health["platforms"].values() if p["configured"])
        
        if not status["enabled"]:
            health["overall_status"] = "disabled"
        elif healthy_platforms > 0:
            health["overall_status"] = "healthy"
        elif configured_platforms > 0:
            health["overall_status"] = "degraded"
        else:
            health["overall_status"] = "not_configured"
            
        return health

# Global monitor instance
global_monitor = ObservabilityMonitor()