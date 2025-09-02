"""
PAM Performance Optimization System - Phase 3
Intelligent performance monitoring, analysis, and optimization for PAM services
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Callable, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import statistics
import json
import time

logger = logging.getLogger(__name__)

class OptimizationType(Enum):
    """Types of performance optimizations"""
    CACHING = "caching"
    LOAD_BALANCING = "load_balancing"
    RESOURCE_ALLOCATION = "resource_allocation"
    ALGORITHM_TUNING = "algorithm_tuning"
    BATCH_PROCESSING = "batch_processing"
    CONNECTION_POOLING = "connection_pooling"
    COMPRESSION = "compression"
    PRECOMPUTATION = "precomputation"

class PerformanceMetricType(Enum):
    """Types of performance metrics"""
    RESPONSE_TIME = "response_time"
    THROUGHPUT = "throughput"
    CPU_USAGE = "cpu_usage"
    MEMORY_USAGE = "memory_usage"
    CACHE_HIT_RATE = "cache_hit_rate"
    ERROR_RATE = "error_rate"
    CONCURRENT_USERS = "concurrent_users"
    QUEUE_LENGTH = "queue_length"

class OptimizationPriority(Enum):
    """Priority levels for optimizations"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

@dataclass
class PerformanceMetric:
    """Performance metric data point"""
    metric_type: PerformanceMetricType
    value: float
    unit: str
    timestamp: datetime
    service_name: str
    operation: str
    user_count: int
    metadata: Dict[str, Any]

@dataclass
class OptimizationRecommendation:
    """Performance optimization recommendation"""
    recommendation_id: str
    optimization_type: OptimizationType
    target_service: str
    target_operation: str
    priority: OptimizationPriority
    description: str
    expected_improvement: str
    implementation_effort: str
    estimated_impact_score: float
    prerequisites: List[str]
    implementation_function: Optional[Callable] = None
    created_at: datetime = None

@dataclass
class PerformanceProfile:
    """Performance profile for a service/operation"""
    service_name: str
    operation: str
    baseline_metrics: Dict[str, float]
    current_metrics: Dict[str, float]
    trend_analysis: Dict[str, str]
    bottlenecks: List[str]
    optimization_opportunities: List[str]
    health_score: float
    last_updated: datetime

@dataclass
class OptimizationResult:
    """Result of an optimization implementation"""
    recommendation_id: str
    implementation_time: datetime
    success: bool
    performance_before: Dict[str, float]
    performance_after: Dict[str, float]
    improvement_percentage: float
    side_effects: List[str]
    rollback_needed: bool

class PAMPerformanceOptimizer:
    """Intelligent performance optimization system"""
    
    def __init__(self):
        # Performance metrics storage
        self.performance_metrics: Dict[str, List[PerformanceMetric]] = {}
        self.max_metric_history = 2000
        
        # Performance profiles
        self.performance_profiles: Dict[str, PerformanceProfile] = {}
        
        # Optimization recommendations
        self.optimization_recommendations: Dict[str, OptimizationRecommendation] = {}
        self.implemented_optimizations: Dict[str, OptimizationResult] = {}
        
        # Performance baselines
        self.performance_baselines: Dict[str, Dict[str, float]] = {}
        
        # Optimization configuration
        self.optimizer_config = {
            "analysis_window_minutes": 60,
            "baseline_update_interval_hours": 24,
            "optimization_evaluation_interval_minutes": 30,
            "auto_optimization_enabled": True,
            "performance_threshold_degradation": 0.2,  # 20% degradation triggers optimization
            "min_data_points_for_analysis": 10
        }
        
        # Caching system
        self.response_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
            "hit_rate": 0.0
        }
        self.max_cache_size = 1000
        
        # Load balancing
        self.load_balancer_stats: Dict[str, Dict[str, Any]] = {}
        
        # Background tasks
        self._optimization_task = None
        self._baseline_update_task = None
        self._running = False
    
    async def initialize(self):
        """Initialize performance optimizer"""
        try:
            self._running = True
            
            # Initialize performance baselines
            await self._initialize_baselines()
            
            # Start background optimization
            self._optimization_task = asyncio.create_task(self._continuous_optimization())
            self._baseline_update_task = asyncio.create_task(self._update_baselines_periodically())
            
            logger.info("⚡ PAM Performance Optimizer initialized")
            
        except Exception as e:
            logger.error(f"❌ Performance Optimizer initialization failed: {e}")
            raise
    
    async def shutdown(self):
        """Shutdown performance optimizer"""
        self._running = False
        
        if self._optimization_task:
            self._optimization_task.cancel()
        if self._baseline_update_task:
            self._baseline_update_task.cancel()
        
        logger.info("🛑 PAM Performance Optimizer shutdown")
    
    async def record_performance_metric(
        self,
        service_name: str,
        operation: str,
        metric_type: PerformanceMetricType,
        value: float,
        unit: str = "",
        user_count: int = 1,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Record a performance metric"""
        
        metric = PerformanceMetric(
            metric_type=metric_type,
            value=value,
            unit=unit,
            timestamp=datetime.utcnow(),
            service_name=service_name,
            operation=operation,
            user_count=user_count,
            metadata=metadata or {}
        )
        
        metric_key = f"{service_name}:{operation}:{metric_type.value}"
        
        if metric_key not in self.performance_metrics:
            self.performance_metrics[metric_key] = []
        
        self.performance_metrics[metric_key].append(metric)
        
        # Limit history size
        if len(self.performance_metrics[metric_key]) > self.max_metric_history:
            self.performance_metrics[metric_key] = self.performance_metrics[metric_key][-self.max_metric_history:]
        
        # Trigger immediate analysis if performance degrades significantly
        if await self._is_performance_degraded(metric):
            await self._analyze_performance_issue(service_name, operation)
    
    async def _is_performance_degraded(self, metric: PerformanceMetric) -> bool:
        """Check if performance has degraded significantly"""
        
        service_key = f"{metric.service_name}:{metric.operation}"
        
        if service_key not in self.performance_baselines:
            return False
        
        baseline = self.performance_baselines[service_key].get(metric.metric_type.value)
        if baseline is None:
            return False
        
        # Check for degradation
        if metric.metric_type in [PerformanceMetricType.RESPONSE_TIME, PerformanceMetricType.ERROR_RATE]:
            # Higher is worse
            degradation = (metric.value - baseline) / baseline
            return degradation > self.optimizer_config["performance_threshold_degradation"]
        else:
            # Lower is worse (throughput, cache hit rate, etc.)
            degradation = (baseline - metric.value) / baseline
            return degradation > self.optimizer_config["performance_threshold_degradation"]
    
    async def analyze_performance(self, service_name: str, operation: str) -> PerformanceProfile:
        """Analyze performance for a specific service/operation"""
        
        try:
            # Get recent metrics
            cutoff_time = datetime.utcnow() - timedelta(
                minutes=self.optimizer_config["analysis_window_minutes"]
            )
            
            current_metrics = {}
            trend_analysis = {}
            
            for metric_type in PerformanceMetricType:
                metric_key = f"{service_name}:{operation}:{metric_type.value}"
                
                if metric_key in self.performance_metrics:
                    recent_metrics = [
                        m for m in self.performance_metrics[metric_key]
                        if m.timestamp > cutoff_time
                    ]
                    
                    if len(recent_metrics) >= self.optimizer_config["min_data_points_for_analysis"]:
                        values = [m.value for m in recent_metrics]
                        current_metrics[metric_type.value] = {
                            "avg": statistics.mean(values),
                            "min": min(values),
                            "max": max(values),
                            "median": statistics.median(values),
                            "p95": self._percentile(values, 95),
                            "std_dev": statistics.stdev(values) if len(values) > 1 else 0
                        }
                        
                        # Analyze trend
                        trend_analysis[metric_type.value] = self._analyze_metric_trend(recent_metrics)
            
            # Get baseline metrics
            service_key = f"{service_name}:{operation}"
            baseline_metrics = self.performance_baselines.get(service_key, {})
            
            # Identify bottlenecks
            bottlenecks = self._identify_bottlenecks(current_metrics, baseline_metrics)
            
            # Identify optimization opportunities
            optimization_opportunities = self._identify_optimization_opportunities(
                service_name, operation, current_metrics, trend_analysis
            )
            
            # Calculate health score
            health_score = self._calculate_health_score(current_metrics, baseline_metrics)
            
            # Create performance profile
            profile = PerformanceProfile(
                service_name=service_name,
                operation=operation,
                baseline_metrics=baseline_metrics,
                current_metrics=current_metrics,
                trend_analysis=trend_analysis,
                bottlenecks=bottlenecks,
                optimization_opportunities=optimization_opportunities,
                health_score=health_score,
                last_updated=datetime.utcnow()
            )
            
            self.performance_profiles[service_key] = profile
            return profile
            
        except Exception as e:
            logger.error(f"❌ Performance analysis failed for {service_name}:{operation}: {e}")
            raise
    
    def _percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile value"""
        sorted_values = sorted(values)
        index = int((percentile / 100) * len(sorted_values))
        return sorted_values[min(index, len(sorted_values) - 1)]
    
    def _analyze_metric_trend(self, metrics: List[PerformanceMetric]) -> str:
        """Analyze trend for a metric"""
        if len(metrics) < 3:
            return "insufficient_data"
        
        values = [m.value for m in metrics]
        
        # Simple trend analysis: compare first half vs second half
        mid_point = len(values) // 2
        first_half_avg = statistics.mean(values[:mid_point])
        second_half_avg = statistics.mean(values[mid_point:])
        
        change_ratio = (second_half_avg - first_half_avg) / first_half_avg if first_half_avg != 0 else 0
        
        if abs(change_ratio) < 0.05:  # Less than 5% change
            return "stable"
        elif change_ratio > 0.05:
            return "increasing"
        else:
            return "decreasing"
    
    def _identify_bottlenecks(
        self,
        current_metrics: Dict[str, Any],
        baseline_metrics: Dict[str, float]
    ) -> List[str]:
        """Identify performance bottlenecks"""
        
        bottlenecks = []
        
        # Check response time
        if "response_time" in current_metrics and "response_time" in baseline_metrics:
            current_avg = current_metrics["response_time"]["avg"]
            baseline = baseline_metrics["response_time"]
            
            if current_avg > baseline * 1.5:  # 50% worse than baseline
                bottlenecks.append(f"High response time: {current_avg:.0f}ms (baseline: {baseline:.0f}ms)")
        
        # Check memory usage
        if "memory_usage" in current_metrics:
            memory_p95 = current_metrics["memory_usage"]["p95"]
            if memory_p95 > 80:  # Over 80% memory usage
                bottlenecks.append(f"High memory usage: {memory_p95:.1f}%")
        
        # Check error rate
        if "error_rate" in current_metrics:
            error_rate = current_metrics["error_rate"]["avg"]
            if error_rate > 0.05:  # Over 5% error rate
                bottlenecks.append(f"High error rate: {error_rate:.1%}")
        
        # Check cache hit rate
        if "cache_hit_rate" in current_metrics:
            hit_rate = current_metrics["cache_hit_rate"]["avg"]
            if hit_rate < 0.8:  # Below 80% hit rate
                bottlenecks.append(f"Low cache hit rate: {hit_rate:.1%}")
        
        return bottlenecks
    
    def _identify_optimization_opportunities(
        self,
        service_name: str,
        operation: str,
        current_metrics: Dict[str, Any],
        trend_analysis: Dict[str, str]
    ) -> List[str]:
        """Identify optimization opportunities"""
        
        opportunities = []
        
        # Caching opportunities
        if "cache_hit_rate" in current_metrics:
            hit_rate = current_metrics["cache_hit_rate"]["avg"]
            if hit_rate < 0.9:
                opportunities.append("Improve caching strategy for better hit rate")
        
        # Response time optimization
        if "response_time" in current_metrics:
            if current_metrics["response_time"]["p95"] > 3000:  # Over 3 seconds
                opportunities.append("Optimize response time through async processing or caching")
        
        # Memory optimization
        if "memory_usage" in current_metrics:
            if current_metrics["memory_usage"]["avg"] > 70:  # Over 70% memory
                opportunities.append("Optimize memory usage through object pooling or compression")
        
        # Throughput optimization
        if "throughput" in current_metrics and "throughput" in trend_analysis:
            if trend_analysis["throughput"] == "decreasing":
                opportunities.append("Investigate decreasing throughput - consider load balancing")
        
        # Service-specific opportunities
        if service_name == "knowledge_service":
            opportunities.extend([
                "Implement semantic search result caching",
                "Optimize vector database queries",
                "Pre-compute popular knowledge embeddings"
            ])
        elif service_name == "tts_service":
            opportunities.extend([
                "Implement voice synthesis caching",
                "Optimize audio streaming compression",
                "Pre-generate common phrases"
            ])
        elif service_name == "enhanced_orchestrator":
            opportunities.extend([
                "Implement request batching",
                "Optimize service coordination",
                "Cache frequent response patterns"
            ])
        
        return opportunities
    
    def _calculate_health_score(
        self,
        current_metrics: Dict[str, Any],
        baseline_metrics: Dict[str, float]
    ) -> float:
        """Calculate overall health score (0.0 - 1.0)"""
        
        scores = []
        
        # Response time score
        if "response_time" in current_metrics and "response_time" in baseline_metrics:
            current = current_metrics["response_time"]["avg"]
            baseline = baseline_metrics["response_time"]
            score = max(0, 1 - ((current - baseline) / baseline))
            scores.append(score)
        
        # Error rate score
        if "error_rate" in current_metrics:
            error_rate = current_metrics["error_rate"]["avg"]
            score = max(0, 1 - (error_rate * 10))  # 10% error = 0 score
            scores.append(score)
        
        # Cache hit rate score
        if "cache_hit_rate" in current_metrics:
            hit_rate = current_metrics["cache_hit_rate"]["avg"]
            scores.append(hit_rate)
        
        # Throughput score (simplified)
        if "throughput" in current_metrics:
            throughput = current_metrics["throughput"]["avg"]
            score = min(1.0, throughput / 100)  # 100 RPS = perfect score
            scores.append(score)
        
        return statistics.mean(scores) if scores else 0.5
    
    async def generate_optimization_recommendations(
        self,
        service_name: str,
        operation: str
    ) -> List[OptimizationRecommendation]:
        """Generate optimization recommendations"""
        
        try:
            # Analyze current performance
            profile = await self.analyze_performance(service_name, operation)
            
            recommendations = []
            
            # Generate recommendations based on bottlenecks
            for bottleneck in profile.bottlenecks:
                if "response time" in bottleneck.lower():
                    recommendations.append(OptimizationRecommendation(
                        recommendation_id=f"resp_time_{service_name}_{int(time.time())}",
                        optimization_type=OptimizationType.CACHING,
                        target_service=service_name,
                        target_operation=operation,
                        priority=OptimizationPriority.HIGH,
                        description=f"Implement intelligent caching to reduce response time",
                        expected_improvement="30-50% response time reduction",
                        implementation_effort="Medium",
                        estimated_impact_score=0.8,
                        prerequisites=[],
                        implementation_function=self._implement_intelligent_caching,
                        created_at=datetime.utcnow()
                    ))
                
                elif "memory usage" in bottleneck.lower():
                    recommendations.append(OptimizationRecommendation(
                        recommendation_id=f"memory_{service_name}_{int(time.time())}",
                        optimization_type=OptimizationType.RESOURCE_ALLOCATION,
                        target_service=service_name,
                        target_operation=operation,
                        priority=OptimizationPriority.MEDIUM,
                        description=f"Optimize memory usage through compression and pooling",
                        expected_improvement="20-30% memory reduction",
                        implementation_effort="High",
                        estimated_impact_score=0.6,
                        prerequisites=[],
                        implementation_function=self._implement_memory_optimization,
                        created_at=datetime.utcnow()
                    ))
                
                elif "error rate" in bottleneck.lower():
                    recommendations.append(OptimizationRecommendation(
                        recommendation_id=f"error_{service_name}_{int(time.time())}",
                        optimization_type=OptimizationType.ALGORITHM_TUNING,
                        target_service=service_name,
                        target_operation=operation,
                        priority=OptimizationPriority.URGENT,
                        description=f"Implement error handling and retry mechanisms",
                        expected_improvement="50-70% error reduction",
                        implementation_effort="Medium",
                        estimated_impact_score=0.9,
                        prerequisites=[],
                        implementation_function=self._implement_error_handling_optimization,
                        created_at=datetime.utcnow()
                    ))
            
            # Service-specific optimizations
            if service_name == "knowledge_service":
                recommendations.append(OptimizationRecommendation(
                    recommendation_id=f"knowledge_cache_{int(time.time())}",
                    optimization_type=OptimizationType.PRECOMPUTATION,
                    target_service=service_name,
                    target_operation=operation,
                    priority=OptimizationPriority.MEDIUM,
                    description="Pre-compute and cache popular knowledge queries",
                    expected_improvement="40-60% faster knowledge retrieval",
                    implementation_effort="Medium",
                    estimated_impact_score=0.7,
                    prerequisites=[],
                    implementation_function=self._implement_knowledge_precomputation,
                    created_at=datetime.utcnow()
                ))
            
            # Store recommendations
            for recommendation in recommendations:
                self.optimization_recommendations[recommendation.recommendation_id] = recommendation
            
            return recommendations
            
        except Exception as e:
            logger.error(f"❌ Optimization recommendation generation failed: {e}")
            return []
    
    async def implement_optimization(self, recommendation_id: str) -> OptimizationResult:
        """Implement an optimization recommendation"""
        
        if recommendation_id not in self.optimization_recommendations:
            raise ValueError(f"Recommendation not found: {recommendation_id}")
        
        recommendation = self.optimization_recommendations[recommendation_id]
        
        # Capture performance before optimization
        service_key = f"{recommendation.target_service}:{recommendation.target_operation}"
        profile_before = self.performance_profiles.get(service_key)
        performance_before = profile_before.current_metrics if profile_before else {}
        
        try:
            # Implement optimization
            success = True
            if recommendation.implementation_function:
                success = await recommendation.implementation_function(recommendation)
            
            # Wait a bit for metrics to stabilize
            await asyncio.sleep(5)
            
            # Capture performance after optimization
            profile_after = await self.analyze_performance(
                recommendation.target_service,
                recommendation.target_operation
            )
            performance_after = profile_after.current_metrics
            
            # Calculate improvement
            improvement_percentage = self._calculate_improvement_percentage(
                performance_before, performance_after
            )
            
            result = OptimizationResult(
                recommendation_id=recommendation_id,
                implementation_time=datetime.utcnow(),
                success=success,
                performance_before=performance_before,
                performance_after=performance_after,
                improvement_percentage=improvement_percentage,
                side_effects=[],
                rollback_needed=improvement_percentage < 0  # Negative improvement
            )
            
            self.implemented_optimizations[recommendation_id] = result
            
            if success and improvement_percentage > 0:
                logger.info(f"✅ Optimization implemented: {recommendation.description} (+{improvement_percentage:.1f}%)")
            else:
                logger.warning(f"⚠️ Optimization had negative impact: {recommendation.description} ({improvement_percentage:.1f}%)")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Optimization implementation failed: {e}")
            return OptimizationResult(
                recommendation_id=recommendation_id,
                implementation_time=datetime.utcnow(),
                success=False,
                performance_before=performance_before,
                performance_after={},
                improvement_percentage=0,
                side_effects=[f"Implementation error: {str(e)}"],
                rollback_needed=True
            )
    
    def _calculate_improvement_percentage(
        self,
        performance_before: Dict[str, Any],
        performance_after: Dict[str, Any]
    ) -> float:
        """Calculate performance improvement percentage"""
        
        improvements = []
        
        # Response time improvement (lower is better)
        if "response_time" in performance_before and "response_time" in performance_after:
            before = performance_before["response_time"]["avg"]
            after = performance_after["response_time"]["avg"]
            improvement = ((before - after) / before) * 100
            improvements.append(improvement)
        
        # Throughput improvement (higher is better)
        if "throughput" in performance_before and "throughput" in performance_after:
            before = performance_before["throughput"]["avg"]
            after = performance_after["throughput"]["avg"]
            improvement = ((after - before) / before) * 100
            improvements.append(improvement)
        
        # Cache hit rate improvement (higher is better)
        if "cache_hit_rate" in performance_before and "cache_hit_rate" in performance_after:
            before = performance_before["cache_hit_rate"]["avg"]
            after = performance_after["cache_hit_rate"]["avg"]
            improvement = ((after - before) / before) * 100
            improvements.append(improvement)
        
        return statistics.mean(improvements) if improvements else 0
    
    # Optimization implementation functions
    async def _implement_intelligent_caching(self, recommendation: OptimizationRecommendation) -> bool:
        """Implement intelligent caching optimization"""
        try:
            # Simulate cache optimization implementation
            logger.info(f"🔄 Implementing intelligent caching for {recommendation.target_service}")
            
            # Increase cache size and implement LRU eviction
            self.max_cache_size = min(self.max_cache_size * 2, 5000)
            
            # Simulate cache warming
            await asyncio.sleep(0.1)
            
            return True
        except Exception as e:
            logger.error(f"❌ Cache optimization failed: {e}")
            return False
    
    async def _implement_memory_optimization(self, recommendation: OptimizationRecommendation) -> bool:
        """Implement memory optimization"""
        try:
            logger.info(f"🔄 Implementing memory optimization for {recommendation.target_service}")
            
            # Simulate memory optimization
            await asyncio.sleep(0.1)
            
            return True
        except Exception as e:
            logger.error(f"❌ Memory optimization failed: {e}")
            return False
    
    async def _implement_error_handling_optimization(self, recommendation: OptimizationRecommendation) -> bool:
        """Implement error handling optimization"""
        try:
            logger.info(f"🔄 Implementing error handling optimization for {recommendation.target_service}")
            
            # Simulate error handling improvements
            await asyncio.sleep(0.1)
            
            return True
        except Exception as e:
            logger.error(f"❌ Error handling optimization failed: {e}")
            return False
    
    async def _implement_knowledge_precomputation(self, recommendation: OptimizationRecommendation) -> bool:
        """Implement knowledge precomputation optimization"""
        try:
            logger.info(f"🔄 Implementing knowledge precomputation for {recommendation.target_service}")
            
            # Simulate precomputation
            await asyncio.sleep(0.2)
            
            return True
        except Exception as e:
            logger.error(f"❌ Knowledge precomputation failed: {e}")
            return False
    
    async def _continuous_optimization(self):
        """Background continuous optimization"""
        while self._running:
            try:
                await asyncio.sleep(self.optimizer_config["optimization_evaluation_interval_minutes"] * 60)
                
                if self.optimizer_config["auto_optimization_enabled"]:
                    # Analyze all services and generate recommendations
                    for profile_key, profile in self.performance_profiles.items():
                        service_name, operation = profile_key.split(":", 1)
                        
                        if profile.health_score < 0.7:  # Poor health score
                            recommendations = await self.generate_optimization_recommendations(
                                service_name, operation
                            )
                            
                            # Auto-implement low-risk optimizations
                            for recommendation in recommendations:
                                if (recommendation.priority in [OptimizationPriority.HIGH, OptimizationPriority.URGENT] and
                                    recommendation.implementation_effort == "Low"):
                                    await self.implement_optimization(recommendation.recommendation_id)
                
            except Exception as e:
                logger.error(f"❌ Continuous optimization error: {e}")
    
    async def _initialize_baselines(self):
        """Initialize performance baselines"""
        # Default baselines for PAM services
        default_baselines = {
            "enhanced_orchestrator:process_message": {
                "response_time": 2000,  # 2 seconds
                "throughput": 50,  # 50 requests/minute
                "error_rate": 0.01,  # 1%
                "cache_hit_rate": 0.8  # 80%
            },
            "knowledge_service:search_knowledge": {
                "response_time": 1000,  # 1 second
                "throughput": 100,  # 100 requests/minute
                "error_rate": 0.02,  # 2%
                "cache_hit_rate": 0.9  # 90%
            },
            "tts_service:synthesize_speech": {
                "response_time": 3000,  # 3 seconds
                "throughput": 30,  # 30 requests/minute
                "error_rate": 0.05,  # 5%
                "cache_hit_rate": 0.7  # 70%
            }
        }
        
        self.performance_baselines.update(default_baselines)
    
    async def _update_baselines_periodically(self):
        """Update performance baselines periodically"""
        while self._running:
            try:
                await asyncio.sleep(self.optimizer_config["baseline_update_interval_hours"] * 3600)
                await self._update_performance_baselines()
            except Exception as e:
                logger.error(f"❌ Baseline update error: {e}")
    
    async def _update_performance_baselines(self):
        """Update performance baselines based on recent good performance"""
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        
        for profile_key, profile in self.performance_profiles.items():
            if profile.health_score > 0.8:  # Good performance
                # Update baseline with current good performance
                for metric_type, current_value in profile.current_metrics.items():
                    if metric_type in ["response_time", "throughput", "error_rate", "cache_hit_rate"]:
                        self.performance_baselines[profile_key] = self.performance_baselines.get(profile_key, {})
                        self.performance_baselines[profile_key][metric_type] = current_value["avg"]
        
        logger.info("📊 Performance baselines updated")
    
    async def _analyze_performance_issue(self, service_name: str, operation: str):
        """Analyze immediate performance issue"""
        profile = await self.analyze_performance(service_name, operation)
        
        if profile.health_score < 0.5:  # Critical performance issue
            recommendations = await self.generate_optimization_recommendations(service_name, operation)
            
            # Implement urgent optimizations immediately
            for recommendation in recommendations:
                if recommendation.priority == OptimizationPriority.URGENT:
                    await self.implement_optimization(recommendation.recommendation_id)
    
    def get_optimization_report(self) -> Dict[str, Any]:
        """Get comprehensive optimization report"""
        
        # Calculate overall system performance
        if self.performance_profiles:
            avg_health_score = statistics.mean(p.health_score for p in self.performance_profiles.values())
            total_bottlenecks = sum(len(p.bottlenecks) for p in self.performance_profiles.values())
            total_opportunities = sum(len(p.optimization_opportunities) for p in self.performance_profiles.values())
        else:
            avg_health_score = 0
            total_bottlenecks = 0
            total_opportunities = 0
        
        # Successful optimizations
        successful_optimizations = [
            r for r in self.implemented_optimizations.values()
            if r.success and r.improvement_percentage > 0
        ]
        
        avg_improvement = (
            statistics.mean(r.improvement_percentage for r in successful_optimizations)
            if successful_optimizations else 0
        )
        
        return {
            "system_performance": {
                "avg_health_score": round(avg_health_score, 3),
                "total_bottlenecks": total_bottlenecks,
                "total_opportunities": total_opportunities,
                "services_monitored": len(self.performance_profiles)
            },
            "optimization_summary": {
                "total_recommendations": len(self.optimization_recommendations),
                "implemented_optimizations": len(self.implemented_optimizations),
                "successful_optimizations": len(successful_optimizations),
                "avg_improvement_percentage": round(avg_improvement, 1)
            },
            "cache_performance": self.cache_stats,
            "configuration": self.optimizer_config,
            "latest_profiles": {
                key: {
                    "health_score": profile.health_score,
                    "bottlenecks_count": len(profile.bottlenecks),
                    "last_updated": profile.last_updated.isoformat()
                }
                for key, profile in self.performance_profiles.items()
            }
        }

# Global performance optimizer
performance_optimizer = PAMPerformanceOptimizer()

async def get_performance_optimizer() -> PAMPerformanceOptimizer:
    """Get performance optimizer instance"""
    if not performance_optimizer._running:
        await performance_optimizer.initialize()
    return performance_optimizer