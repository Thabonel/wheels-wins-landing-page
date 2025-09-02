"""
TTS Quality Monitoring and Fallback System
Monitors TTS quality, performance, and handles intelligent fallbacks
"""

import asyncio
import time
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import logging
import statistics

from .base_tts import TTSEngine, TTSRequest, TTSResponse, BaseTTSEngine

logger = logging.getLogger(__name__)

class QualityIssueType(Enum):
    """Types of quality issues"""
    HIGH_LATENCY = "high_latency"
    GENERATION_FAILURE = "generation_failure"
    POOR_USER_RATING = "poor_user_rating"
    ENGINE_ERROR = "engine_error"
    TIMEOUT = "timeout"
    CACHE_MISS = "cache_miss"

@dataclass
class QualityMetric:
    """Quality metric data point"""
    timestamp: datetime
    engine: TTSEngine
    issue_type: QualityIssueType
    value: float  # latency in ms, rating score, etc.
    user_id: Optional[str] = None
    text_length: int = 0
    details: Optional[Dict[str, Any]] = None

@dataclass
class EngineHealthScore:
    """Health score for a TTS engine"""
    engine: TTSEngine
    overall_score: float  # 0.0 - 1.0
    availability_score: float
    performance_score: float
    quality_score: float
    user_satisfaction_score: float
    last_updated: datetime
    sample_count: int

class TTSQualityMonitor:
    """Monitors TTS service quality and manages fallbacks"""
    
    def __init__(self):
        # Quality metrics storage
        self.quality_metrics: List[QualityMetric] = []
        self.max_metrics_history = 1000
        
        # Engine health tracking
        self.engine_health: Dict[TTSEngine, EngineHealthScore] = {}
        
        # Quality thresholds
        self.thresholds = {
            "max_latency_ms": 5000,  # 5 seconds
            "min_user_rating": 3.0,  # 1-5 scale
            "max_failure_rate": 0.1,  # 10%
            "min_availability": 0.95,  # 95%
        }
        
        # Fallback chain (ordered by preference)
        self.fallback_chain = [
            TTSEngine.COQUI,     # Primary - open source, local
            TTSEngine.EDGE       # Free, reliable fallback
        ]
        
        # Performance tracking
        self.performance_stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "fallback_used": 0,
            "avg_latency_ms": 0.0,
            "engine_switches": 0
        }
        
        # Background monitoring task
        self._monitoring_task = None
    
    async def start_monitoring(self):
        """Start background quality monitoring"""
        if self._monitoring_task is None:
            self._monitoring_task = asyncio.create_task(self._background_monitoring())
            logger.info("🔍 TTS Quality Monitor started")
    
    async def stop_monitoring(self):
        """Stop background quality monitoring"""
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
            self._monitoring_task = None
            logger.info("🛑 TTS Quality Monitor stopped")
    
    async def _background_monitoring(self):
        """Background task for quality monitoring"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                await self._update_engine_health_scores()
                await self._cleanup_old_metrics()
                await self._detect_quality_issues()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Quality monitoring error: {e}")
    
    def record_request(
        self,
        request: TTSRequest,
        response: TTSResponse,
        engine: TTSEngine,
        latency_ms: float
    ):
        """Record a TTS request for quality analysis"""
        
        self.performance_stats["total_requests"] += 1
        
        if response.success:
            self.performance_stats["successful_requests"] += 1
            
            # Check for quality issues
            issues = []
            
            # High latency check
            if latency_ms > self.thresholds["max_latency_ms"]:
                issues.append(QualityMetric(
                    timestamp=datetime.utcnow(),
                    engine=engine,
                    issue_type=QualityIssueType.HIGH_LATENCY,
                    value=latency_ms,
                    user_id=request.user_id,
                    text_length=len(request.text),
                    details={"threshold": self.thresholds["max_latency_ms"]}
                ))
            
            # Record any issues
            for issue in issues:
                self._add_quality_metric(issue)
        
        else:
            # Record failure
            self._add_quality_metric(QualityMetric(
                timestamp=datetime.utcnow(),
                engine=engine,
                issue_type=QualityIssueType.GENERATION_FAILURE,
                value=1.0,  # Binary failure
                user_id=request.user_id,
                text_length=len(request.text),
                details={"error": response.error}
            ))
        
        # Update average latency
        total_latency = self.performance_stats["avg_latency_ms"] * (self.performance_stats["total_requests"] - 1)
        self.performance_stats["avg_latency_ms"] = (total_latency + latency_ms) / self.performance_stats["total_requests"]
    
    def record_user_rating(
        self,
        engine: TTSEngine,
        rating: float,
        user_id: str,
        text_length: int = 0
    ):
        """Record user rating for quality analysis"""
        
        # Record poor ratings as quality issues
        if rating < self.thresholds["min_user_rating"]:
            self._add_quality_metric(QualityMetric(
                timestamp=datetime.utcnow(),
                engine=engine,
                issue_type=QualityIssueType.POOR_USER_RATING,
                value=rating,
                user_id=user_id,
                text_length=text_length,
                details={"threshold": self.thresholds["min_user_rating"]}
            ))
        
        logger.info(f"📊 User rating recorded: {rating}/5.0 for {engine.value}")
    
    def record_engine_error(
        self,
        engine: TTSEngine,
        error: str,
        user_id: Optional[str] = None
    ):
        """Record engine error for monitoring"""
        
        self._add_quality_metric(QualityMetric(
            timestamp=datetime.utcnow(),
            engine=engine,
            issue_type=QualityIssueType.ENGINE_ERROR,
            value=1.0,  # Binary error
            user_id=user_id,
            details={"error": error}
        ))
        
        logger.warning(f"⚠️ Engine error recorded for {engine.value}: {error}")
    
    def _add_quality_metric(self, metric: QualityMetric):
        """Add quality metric to history"""
        self.quality_metrics.append(metric)
        
        # Limit history size
        if len(self.quality_metrics) > self.max_metrics_history:
            self.quality_metrics = self.quality_metrics[-self.max_metrics_history:]
    
    async def _update_engine_health_scores(self):
        """Update health scores for all engines"""
        
        # Get recent metrics (last hour)
        cutoff_time = datetime.utcnow() - timedelta(hours=1)
        recent_metrics = [m for m in self.quality_metrics if m.timestamp > cutoff_time]
        
        # Group by engine
        engine_metrics = {}
        for metric in recent_metrics:
            if metric.engine not in engine_metrics:
                engine_metrics[metric.engine] = []
            engine_metrics[metric.engine].append(metric)
        
        # Calculate health scores
        for engine in TTSEngine:
            metrics = engine_metrics.get(engine, [])
            
            # Calculate component scores
            availability_score = self._calculate_availability_score(metrics)
            performance_score = self._calculate_performance_score(metrics)
            quality_score = self._calculate_quality_score(metrics)
            user_satisfaction_score = self._calculate_user_satisfaction_score(metrics)
            
            # Overall score (weighted average)
            overall_score = (
                availability_score * 0.3 +
                performance_score * 0.3 +
                quality_score * 0.2 +
                user_satisfaction_score * 0.2
            )
            
            # Update health score
            self.engine_health[engine] = EngineHealthScore(
                engine=engine,
                overall_score=overall_score,
                availability_score=availability_score,
                performance_score=performance_score,
                quality_score=quality_score,
                user_satisfaction_score=user_satisfaction_score,
                last_updated=datetime.utcnow(),
                sample_count=len(metrics)
            )
    
    def _calculate_availability_score(self, metrics: List[QualityMetric]) -> float:
        """Calculate availability score based on failures"""
        if not metrics:
            return 1.0
        
        failure_count = sum(1 for m in metrics if m.issue_type == QualityIssueType.GENERATION_FAILURE)
        failure_rate = failure_count / len(metrics)
        
        # Score decreases with failure rate
        return max(0.0, 1.0 - (failure_rate / self.thresholds["max_failure_rate"]))
    
    def _calculate_performance_score(self, metrics: List[QualityMetric]) -> float:
        """Calculate performance score based on latency"""
        latency_metrics = [m for m in metrics if m.issue_type == QualityIssueType.HIGH_LATENCY]
        
        if not latency_metrics:
            return 1.0
        
        # Calculate average latency
        avg_latency = statistics.mean(m.value for m in latency_metrics)
        
        # Score decreases with higher latency
        score = max(0.0, 1.0 - (avg_latency / (self.thresholds["max_latency_ms"] * 2)))
        return score
    
    def _calculate_quality_score(self, metrics: List[QualityMetric]) -> float:
        """Calculate quality score based on various issues"""
        if not metrics:
            return 1.0
        
        # Count quality issues
        quality_issues = sum(1 for m in metrics if m.issue_type in [
            QualityIssueType.ENGINE_ERROR,
            QualityIssueType.TIMEOUT
        ])
        
        quality_rate = 1.0 - (quality_issues / len(metrics))
        return max(0.0, quality_rate)
    
    def _calculate_user_satisfaction_score(self, metrics: List[QualityMetric]) -> float:
        """Calculate user satisfaction score based on ratings"""
        rating_metrics = [m for m in metrics if m.issue_type == QualityIssueType.POOR_USER_RATING]
        
        if not rating_metrics:
            return 1.0  # No negative feedback = good
        
        # Calculate average rating
        avg_rating = statistics.mean(m.value for m in rating_metrics)
        
        # Convert to 0-1 score (3.0 rating = 0.5 score)
        score = (avg_rating - 1.0) / 4.0
        return max(0.0, min(1.0, score))
    
    async def _cleanup_old_metrics(self):
        """Remove old quality metrics"""
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        original_count = len(self.quality_metrics)
        
        self.quality_metrics = [m for m in self.quality_metrics if m.timestamp > cutoff_time]
        
        removed_count = original_count - len(self.quality_metrics)
        if removed_count > 0:
            logger.info(f"🧹 Cleaned up {removed_count} old quality metrics")
    
    async def _detect_quality_issues(self):
        """Detect and log quality issues"""
        
        for engine, health in self.engine_health.items():
            if health.overall_score < 0.7:  # Below 70% health
                logger.warning(f"⚠️ Quality issue detected for {engine.value}: {health.overall_score:.2f} health score")
                
                # Log specific issues
                if health.availability_score < 0.8:
                    logger.warning(f"  - Low availability: {health.availability_score:.2f}")
                if health.performance_score < 0.8:
                    logger.warning(f"  - Poor performance: {health.performance_score:.2f}")
                if health.user_satisfaction_score < 0.8:
                    logger.warning(f"  - Low user satisfaction: {health.user_satisfaction_score:.2f}")
    
    def get_best_engine(self, available_engines: List[TTSEngine]) -> Optional[TTSEngine]:
        """Get the best engine based on health scores"""
        
        if not available_engines:
            return None
        
        # Sort engines by health score
        engine_scores = []
        for engine in available_engines:
            if engine in self.engine_health:
                score = self.engine_health[engine].overall_score
            else:
                # Default score for unmonitored engines
                score = 0.8
            
            engine_scores.append((engine, score))
        
        # Sort by score (descending)
        engine_scores.sort(key=lambda x: x[1], reverse=True)
        
        best_engine = engine_scores[0][0]
        logger.info(f"🎯 Selected best engine: {best_engine.value} (score: {engine_scores[0][1]:.2f})")
        
        return best_engine
    
    def get_fallback_engine(
        self,
        failed_engine: TTSEngine,
        available_engines: List[TTSEngine]
    ) -> Optional[TTSEngine]:
        """Get fallback engine when primary fails"""
        
        # Get available engines in fallback order
        for fallback_engine in self.fallback_chain:
            if fallback_engine != failed_engine and fallback_engine in available_engines:
                # Check if this engine is healthy enough
                if fallback_engine in self.engine_health:
                    health = self.engine_health[fallback_engine]
                    if health.availability_score > 0.5:  # Minimum threshold
                        self.performance_stats["fallback_used"] += 1
                        logger.info(f"🔄 Fallback to {fallback_engine.value} after {failed_engine.value} failure")
                        return fallback_engine
                else:
                    # Unknown health, try it anyway
                    self.performance_stats["fallback_used"] += 1
                    logger.info(f"🔄 Fallback to {fallback_engine.value} (unknown health)")
                    return fallback_engine
        
        logger.warning("⚠️ No suitable fallback engine available")
        return None
    
    def get_quality_report(self) -> Dict[str, Any]:
        """Get comprehensive quality report"""
        
        # Overall statistics
        total_requests = max(self.performance_stats["total_requests"], 1)
        success_rate = (self.performance_stats["successful_requests"] / total_requests) * 100
        fallback_rate = (self.performance_stats["fallback_used"] / total_requests) * 100
        
        # Engine health summary
        engine_health_summary = {}
        for engine, health in self.engine_health.items():
            engine_health_summary[engine.value] = {
                "overall_score": round(health.overall_score, 3),
                "availability": round(health.availability_score, 3),
                "performance": round(health.performance_score, 3),
                "quality": round(health.quality_score, 3),
                "user_satisfaction": round(health.user_satisfaction_score, 3),
                "sample_count": health.sample_count,
                "last_updated": health.last_updated.isoformat()
            }
        
        # Recent issues summary
        recent_cutoff = datetime.utcnow() - timedelta(hours=1)
        recent_issues = [m for m in self.quality_metrics if m.timestamp > recent_cutoff]
        
        issue_summary = {}
        for issue_type in QualityIssueType:
            count = sum(1 for m in recent_issues if m.issue_type == issue_type)
            issue_summary[issue_type.value] = count
        
        return {
            "overview": {
                "total_requests": self.performance_stats["total_requests"],
                "success_rate_percent": round(success_rate, 1),
                "fallback_rate_percent": round(fallback_rate, 1),
                "avg_latency_ms": round(self.performance_stats["avg_latency_ms"], 1),
                "engine_switches": self.performance_stats["engine_switches"]
            },
            "engine_health": engine_health_summary,
            "recent_issues": issue_summary,
            "thresholds": self.thresholds,
            "fallback_chain": [e.value for e in self.fallback_chain],
            "monitoring_active": self._monitoring_task is not None
        }

# Global quality monitor instance
quality_monitor = TTSQualityMonitor()