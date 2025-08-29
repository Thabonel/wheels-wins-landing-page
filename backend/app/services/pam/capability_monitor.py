"""
Real-Time Capability Assessment System - Phase 3
Monitors, assesses, and optimizes PAM service capabilities in real-time
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import statistics
import json

logger = logging.getLogger(__name__)

class CapabilityStatus(Enum):
    """Service capability status levels"""
    OPTIMAL = "optimal"
    GOOD = "good"
    DEGRADED = "degraded"
    CRITICAL = "critical"
    OFFLINE = "offline"

class MetricType(Enum):
    """Types of capability metrics"""
    RESPONSE_TIME = "response_time"
    SUCCESS_RATE = "success_rate"
    THROUGHPUT = "throughput"
    ERROR_RATE = "error_rate"
    RESOURCE_USAGE = "resource_usage"
    QUALITY_SCORE = "quality_score"
    USER_SATISFACTION = "user_satisfaction"

@dataclass
class CapabilityMetric:
    """Individual capability metric"""
    metric_type: MetricType
    value: float
    unit: str
    timestamp: datetime
    service_name: str
    operation: str
    threshold_green: float
    threshold_yellow: float
    threshold_red: float

@dataclass
class ServiceCapabilityAssessment:
    """Comprehensive capability assessment for a service"""
    service_name: str
    overall_status: CapabilityStatus
    overall_score: float  # 0.0 - 1.0
    assessment_time: datetime
    metrics: Dict[str, CapabilityMetric]
    recommendations: List[str]
    predicted_issues: List[str]
    optimization_opportunities: List[str]
    trend_analysis: Dict[str, str]  # "improving", "stable", "declining"

@dataclass
class SystemCapabilityProfile:
    """System-wide capability profile"""
    system_status: CapabilityStatus
    system_score: float
    bottlenecks: List[str]
    critical_services: List[str]
    optimization_priorities: List[str]
    estimated_capacity: Dict[str, float]
    assessment_time: datetime

class PAMCapabilityMonitor:
    """Real-time capability assessment and monitoring"""
    
    def __init__(self):
        # Metric collection
        self.metric_history: Dict[str, List[CapabilityMetric]] = {}
        self.max_metric_history = 1000
        
        # Service assessments
        self.service_assessments: Dict[str, ServiceCapabilityAssessment] = {}
        
        # System capability tracking
        self.system_profile: Optional[SystemCapabilityProfile] = None
        
        # Monitoring configuration
        self.monitor_config = {
            "assessment_interval_seconds": 30,
            "metric_retention_hours": 24,
            "trend_analysis_window_minutes": 60,
            "alert_threshold_score": 0.7,
            "critical_threshold_score": 0.5
        }
        
        # Service capability definitions
        self.service_capabilities = {
            "enhanced_orchestrator": {
                "operations": ["process_message", "enhance_response", "coordinate_services"],
                "thresholds": {
                    "response_time": {"green": 1000, "yellow": 3000, "red": 5000},  # ms
                    "success_rate": {"green": 0.98, "yellow": 0.95, "red": 0.90},
                    "throughput": {"green": 100, "yellow": 50, "red": 20}  # requests/min
                }
            },
            "knowledge_service": {
                "operations": ["search_knowledge", "get_recommendations", "ingest_data"],
                "thresholds": {
                    "response_time": {"green": 500, "yellow": 2000, "red": 5000},
                    "success_rate": {"green": 0.95, "yellow": 0.90, "red": 0.80},
                    "quality_score": {"green": 0.85, "yellow": 0.70, "red": 0.50}
                }
            },
            "tts_service": {
                "operations": ["synthesize_speech", "stream_audio", "voice_selection"],
                "thresholds": {
                    "response_time": {"green": 2000, "yellow": 5000, "red": 10000},
                    "success_rate": {"green": 0.95, "yellow": 0.90, "red": 0.85},
                    "quality_score": {"green": 0.80, "yellow": 0.65, "red": 0.50}
                }
            },
            "voice_streaming": {
                "operations": ["stream_audio", "handle_websocket", "audio_processing"],
                "thresholds": {
                    "response_time": {"green": 100, "yellow": 500, "red": 1000},
                    "success_rate": {"green": 0.98, "yellow": 0.95, "red": 0.90},
                    "throughput": {"green": 50, "yellow": 25, "red": 10}
                }
            }
        }
        
        # Assessment callbacks
        self.assessment_callbacks: List[Callable] = []
        
        # Background monitoring
        self._monitoring_task = None
        self._running = False
    
    async def initialize(self):
        """Initialize capability monitor"""
        try:
            self._running = True
            
            # Start background monitoring
            self._monitoring_task = asyncio.create_task(self._continuous_monitoring())
            
            # Initialize service assessments
            await self._initialize_service_assessments()
            
            logger.info("📊 PAM Capability Monitor initialized")
            
        except Exception as e:
            logger.error(f"❌ Capability Monitor initialization failed: {e}")
            raise
    
    async def shutdown(self):
        """Shutdown capability monitor"""
        self._running = False
        
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
        
        logger.info("🛑 PAM Capability Monitor shutdown")
    
    async def record_metric(
        self,
        service_name: str,
        operation: str,
        metric_type: MetricType,
        value: float,
        unit: str = ""
    ):
        """Record a capability metric"""
        
        try:
            # Get thresholds for this service/metric
            thresholds = self._get_metric_thresholds(service_name, metric_type)
            
            metric = CapabilityMetric(
                metric_type=metric_type,
                value=value,
                unit=unit,
                timestamp=datetime.utcnow(),
                service_name=service_name,
                operation=operation,
                **thresholds
            )
            
            # Store metric
            metric_key = f"{service_name}:{operation}:{metric_type.value}"
            if metric_key not in self.metric_history:
                self.metric_history[metric_key] = []
            
            self.metric_history[metric_key].append(metric)
            
            # Limit history size
            if len(self.metric_history[metric_key]) > self.max_metric_history:
                self.metric_history[metric_key] = self.metric_history[metric_key][-self.max_metric_history:]
            
            # Trigger immediate assessment if metric is critical
            if self._is_critical_metric(metric):
                await self._assess_service_capability(service_name)
            
        except Exception as e:
            logger.error(f"❌ Metric recording failed: {e}")
    
    def _get_metric_thresholds(self, service_name: str, metric_type: MetricType) -> Dict[str, float]:
        """Get thresholds for a specific metric"""
        
        if service_name in self.service_capabilities:
            service_config = self.service_capabilities[service_name]
            if "thresholds" in service_config and metric_type.value in service_config["thresholds"]:
                thresholds = service_config["thresholds"][metric_type.value]
                return {
                    "threshold_green": thresholds["green"],
                    "threshold_yellow": thresholds["yellow"],
                    "threshold_red": thresholds["red"]
                }
        
        # Default thresholds
        default_thresholds = {
            MetricType.RESPONSE_TIME: {"green": 1000, "yellow": 3000, "red": 5000},
            MetricType.SUCCESS_RATE: {"green": 0.95, "yellow": 0.90, "red": 0.80},
            MetricType.THROUGHPUT: {"green": 50, "yellow": 25, "red": 10},
            MetricType.ERROR_RATE: {"green": 0.05, "yellow": 0.10, "red": 0.20},
            MetricType.QUALITY_SCORE: {"green": 0.80, "yellow": 0.65, "red": 0.50}
        }
        
        thresholds = default_thresholds.get(metric_type, {"green": 100, "yellow": 50, "red": 20})
        return {
            "threshold_green": thresholds["green"],
            "threshold_yellow": thresholds["yellow"],
            "threshold_red": thresholds["red"]
        }
    
    def _is_critical_metric(self, metric: CapabilityMetric) -> bool:
        """Check if metric indicates critical performance"""
        
        if metric.metric_type in [MetricType.SUCCESS_RATE, MetricType.QUALITY_SCORE]:
            return metric.value <= metric.threshold_red
        else:  # For response_time, error_rate, etc.
            return metric.value >= metric.threshold_red
    
    async def _continuous_monitoring(self):
        """Background task for continuous capability monitoring"""
        
        while self._running:
            try:
                await asyncio.sleep(self.monitor_config["assessment_interval_seconds"])
                
                # Assess all services
                for service_name in self.service_capabilities.keys():
                    await self._assess_service_capability(service_name)
                
                # Assess system capability
                await self._assess_system_capability()
                
                # Clean up old metrics
                await self._cleanup_old_metrics()
                
                # Notify callbacks
                await self._notify_assessment_callbacks()
                
            except Exception as e:
                logger.error(f"❌ Continuous monitoring error: {e}")
    
    async def _assess_service_capability(self, service_name: str):
        """Assess capability for a specific service"""
        
        try:
            # Collect recent metrics for this service
            cutoff_time = datetime.utcnow() - timedelta(
                minutes=self.monitor_config["trend_analysis_window_minutes"]
            )
            
            service_metrics = {}
            metric_scores = []
            
            for metric_key, metrics in self.metric_history.items():
                if metric_key.startswith(f"{service_name}:"):
                    recent_metrics = [m for m in metrics if m.timestamp > cutoff_time]
                    if recent_metrics:
                        # Get latest metric of each type
                        latest_metric = recent_metrics[-1]
                        service_metrics[latest_metric.metric_type.value] = latest_metric
                        
                        # Calculate metric score
                        score = self._calculate_metric_score(latest_metric)
                        metric_scores.append(score)
            
            # Calculate overall score
            overall_score = statistics.mean(metric_scores) if metric_scores else 0.5
            
            # Determine status
            overall_status = self._score_to_status(overall_score)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(service_name, service_metrics)
            
            # Predict potential issues
            predicted_issues = self._predict_issues(service_name, service_metrics)
            
            # Identify optimization opportunities
            optimization_opportunities = self._identify_optimizations(service_name, service_metrics)
            
            # Analyze trends
            trend_analysis = self._analyze_trends(service_name)
            
            # Create assessment
            assessment = ServiceCapabilityAssessment(
                service_name=service_name,
                overall_status=overall_status,
                overall_score=overall_score,
                assessment_time=datetime.utcnow(),
                metrics=service_metrics,
                recommendations=recommendations,
                predicted_issues=predicted_issues,
                optimization_opportunities=optimization_opportunities,
                trend_analysis=trend_analysis
            )
            
            self.service_assessments[service_name] = assessment
            
            # Log significant changes
            if overall_status in [CapabilityStatus.CRITICAL, CapabilityStatus.DEGRADED]:
                logger.warning(f"⚠️ Service capability alert: {service_name} = {overall_status.value} (score: {overall_score:.2f})")
            
        except Exception as e:
            logger.error(f"❌ Service capability assessment failed for {service_name}: {e}")
    
    def _calculate_metric_score(self, metric: CapabilityMetric) -> float:
        """Calculate normalized score (0.0-1.0) for a metric"""
        
        if metric.metric_type in [MetricType.SUCCESS_RATE, MetricType.QUALITY_SCORE, MetricType.USER_SATISFACTION]:
            # Higher is better
            if metric.value >= metric.threshold_green:
                return 1.0
            elif metric.value >= metric.threshold_yellow:
                return 0.75
            elif metric.value >= metric.threshold_red:
                return 0.5
            else:
                return 0.25
        else:
            # Lower is better (response_time, error_rate, etc.)
            if metric.value <= metric.threshold_green:
                return 1.0
            elif metric.value <= metric.threshold_yellow:
                return 0.75
            elif metric.value <= metric.threshold_red:
                return 0.5
            else:
                return 0.25
    
    def _score_to_status(self, score: float) -> CapabilityStatus:
        """Convert numeric score to capability status"""
        
        if score >= 0.9:
            return CapabilityStatus.OPTIMAL
        elif score >= 0.75:
            return CapabilityStatus.GOOD
        elif score >= 0.5:
            return CapabilityStatus.DEGRADED
        else:
            return CapabilityStatus.CRITICAL
    
    def _generate_recommendations(
        self,
        service_name: str,
        metrics: Dict[str, CapabilityMetric]
    ) -> List[str]:
        """Generate recommendations based on metrics"""
        
        recommendations = []
        
        # Response time recommendations
        if "response_time" in metrics:
            metric = metrics["response_time"]
            if metric.value > metric.threshold_yellow:
                recommendations.append(f"High response time detected ({metric.value:.0f}ms). Consider optimization.")
                if metric.value > metric.threshold_red:
                    recommendations.append("Critical response time. Immediate optimization required.")
        
        # Success rate recommendations
        if "success_rate" in metrics:
            metric = metrics["success_rate"]
            if metric.value < metric.threshold_yellow:
                recommendations.append(f"Low success rate ({metric.value:.1%}). Check error logs.")
                if metric.value < metric.threshold_red:
                    recommendations.append("Critical success rate. Service may need restart.")
        
        # Quality score recommendations
        if "quality_score" in metrics:
            metric = metrics["quality_score"]
            if metric.value < metric.threshold_yellow:
                recommendations.append(f"Quality issues detected (score: {metric.value:.2f}). Review outputs.")
        
        # Service-specific recommendations
        if service_name == "tts_service":
            recommendations.append("Consider voice cache optimization for better performance.")
        elif service_name == "knowledge_service":
            recommendations.append("Monitor vector database performance and index optimization.")
        
        return recommendations
    
    def _predict_issues(
        self,
        service_name: str,
        metrics: Dict[str, CapabilityMetric]
    ) -> List[str]:
        """Predict potential issues based on current metrics"""
        
        issues = []
        
        # Trend-based predictions (simplified)
        trend_analysis = self._analyze_trends(service_name)
        
        for metric_type, trend in trend_analysis.items():
            if trend == "declining":
                if metric_type == "response_time":
                    issues.append("Response time trending upward - potential performance degradation")
                elif metric_type == "success_rate":
                    issues.append("Success rate declining - may indicate stability issues")
                elif metric_type == "quality_score":
                    issues.append("Quality score declining - output quality may degrade")
        
        # Current metric-based predictions
        if "response_time" in metrics and metrics["response_time"].value > metrics["response_time"].threshold_yellow:
            issues.append("High response time may lead to timeout issues")
        
        if "error_rate" in metrics and metrics["error_rate"].value > 0.1:
            issues.append("Elevated error rate may indicate underlying issues")
        
        return issues
    
    def _identify_optimizations(
        self,
        service_name: str,
        metrics: Dict[str, CapabilityMetric]
    ) -> List[str]:
        """Identify optimization opportunities"""
        
        optimizations = []
        
        # General optimizations based on metrics
        if "response_time" in metrics:
            if metrics["response_time"].value > 1000:  # > 1 second
                optimizations.append("Response time optimization: Consider caching or async processing")
        
        if "throughput" in metrics:
            if metrics["throughput"].value < 50:  # Low throughput
                optimizations.append("Throughput optimization: Consider connection pooling or load balancing")
        
        # Service-specific optimizations
        if service_name == "knowledge_service":
            optimizations.extend([
                "Implement semantic caching for frequently queried topics",
                "Optimize vector database indexing for faster searches",
                "Consider pre-loading popular knowledge areas"
            ])
        elif service_name == "tts_service":
            optimizations.extend([
                "Implement intelligent voice caching",
                "Optimize audio compression for faster streaming",
                "Pre-generate common phrases"
            ])
        elif service_name == "enhanced_orchestrator":
            optimizations.extend([
                "Implement request batching for better throughput",
                "Optimize service coordination logic",
                "Consider response caching for repeated queries"
            ])
        
        return optimizations
    
    def _analyze_trends(self, service_name: str) -> Dict[str, str]:
        """Analyze metric trends for the service"""
        
        trends = {}
        
        # Simple trend analysis based on recent data points
        cutoff_time = datetime.utcnow() - timedelta(
            minutes=self.monitor_config["trend_analysis_window_minutes"]
        )
        
        for metric_key, metrics in self.metric_history.items():
            if metric_key.startswith(f"{service_name}:"):
                recent_metrics = [m for m in metrics if m.timestamp > cutoff_time]
                if len(recent_metrics) >= 3:
                    # Simple trend: compare first half vs second half
                    mid_point = len(recent_metrics) // 2
                    first_half_avg = statistics.mean(m.value for m in recent_metrics[:mid_point])
                    second_half_avg = statistics.mean(m.value for m in recent_metrics[mid_point:])
                    
                    metric_type = recent_metrics[0].metric_type.value
                    
                    if metric_type in ["success_rate", "quality_score"]:
                        # Higher is better
                        if second_half_avg > first_half_avg * 1.05:
                            trends[metric_type] = "improving"
                        elif second_half_avg < first_half_avg * 0.95:
                            trends[metric_type] = "declining"
                        else:
                            trends[metric_type] = "stable"
                    else:
                        # Lower is better
                        if second_half_avg < first_half_avg * 0.95:
                            trends[metric_type] = "improving"
                        elif second_half_avg > first_half_avg * 1.05:
                            trends[metric_type] = "declining"
                        else:
                            trends[metric_type] = "stable"
        
        return trends
    
    async def _assess_system_capability(self):
        """Assess overall system capability"""
        
        try:
            if not self.service_assessments:
                return
            
            # Calculate system score
            service_scores = [assessment.overall_score for assessment in self.service_assessments.values()]
            system_score = statistics.mean(service_scores)
            
            # Determine system status
            system_status = self._score_to_status(system_score)
            
            # Identify bottlenecks
            bottlenecks = []
            for service_name, assessment in self.service_assessments.items():
                if assessment.overall_status in [CapabilityStatus.CRITICAL, CapabilityStatus.DEGRADED]:
                    bottlenecks.append(f"{service_name} ({assessment.overall_status.value})")
            
            # Identify critical services
            critical_services = [
                service_name for service_name, assessment in self.service_assessments.items()
                if assessment.overall_status == CapabilityStatus.CRITICAL
            ]
            
            # Determine optimization priorities
            optimization_priorities = []
            sorted_services = sorted(
                self.service_assessments.items(),
                key=lambda x: x[1].overall_score
            )
            
            for service_name, assessment in sorted_services[:3]:  # Top 3 priorities
                if assessment.overall_score < 0.8:
                    optimization_priorities.append(f"{service_name} (score: {assessment.overall_score:.2f})")
            
            # Estimate capacity
            estimated_capacity = {}
            for service_name, assessment in self.service_assessments.items():
                # Simplified capacity estimation based on score
                estimated_capacity[service_name] = min(assessment.overall_score * 1.2, 1.0)
            
            # Create system profile
            self.system_profile = SystemCapabilityProfile(
                system_status=system_status,
                system_score=system_score,
                bottlenecks=bottlenecks,
                critical_services=critical_services,
                optimization_priorities=optimization_priorities,
                estimated_capacity=estimated_capacity,
                assessment_time=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"❌ System capability assessment failed: {e}")
    
    async def _cleanup_old_metrics(self):
        """Clean up old metric data"""
        
        cutoff_time = datetime.utcnow() - timedelta(
            hours=self.monitor_config["metric_retention_hours"]
        )
        
        removed_count = 0
        for metric_key, metrics in self.metric_history.items():
            original_count = len(metrics)
            self.metric_history[metric_key] = [m for m in metrics if m.timestamp > cutoff_time]
            removed_count += original_count - len(self.metric_history[metric_key])
        
        if removed_count > 0:
            logger.info(f"🧹 Cleaned up {removed_count} old capability metrics")
    
    async def _initialize_service_assessments(self):
        """Initialize assessments for all configured services"""
        
        for service_name in self.service_capabilities.keys():
            await self._assess_service_capability(service_name)
    
    async def _notify_assessment_callbacks(self):
        """Notify registered callbacks of capability assessments"""
        
        for callback in self.assessment_callbacks:
            try:
                await callback(self.service_assessments, self.system_profile)
            except Exception as e:
                logger.error(f"❌ Assessment callback failed: {e}")
    
    def register_assessment_callback(self, callback: Callable):
        """Register callback for capability assessment updates"""
        self.assessment_callbacks.append(callback)
    
    def get_capability_report(self) -> Dict[str, Any]:
        """Get comprehensive capability report"""
        
        return {
            "system_profile": asdict(self.system_profile) if self.system_profile else None,
            "service_assessments": {
                name: asdict(assessment) for name, assessment in self.service_assessments.items()
            },
            "monitoring_config": self.monitor_config,
            "metric_summary": {
                "total_metrics": sum(len(metrics) for metrics in self.metric_history.values()),
                "services_monitored": len(self.service_capabilities),
                "active_assessments": len(self.service_assessments)
            }
        }

# Global capability monitor
capability_monitor = PAMCapabilityMonitor()

async def get_capability_monitor() -> PAMCapabilityMonitor:
    """Get capability monitor instance"""
    if not capability_monitor._running:
        await capability_monitor.initialize()
    return capability_monitor