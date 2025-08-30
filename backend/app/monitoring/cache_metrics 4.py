"""
Cache Metrics and Monitoring
Track cache performance and provide insights for optimization
"""

import time
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from collections import defaultdict, deque
import json
from app.core.logging import get_logger

logger = get_logger(__name__)

@dataclass
class CacheMetric:
    """Individual cache metric data point"""
    timestamp: float
    endpoint: str
    cache_hit: bool
    response_time_ms: float
    cache_key: Optional[str] = None
    ttl: Optional[int] = None
    size_bytes: Optional[int] = None
    
@dataclass
class CacheStats:
    """Aggregated cache statistics"""
    total_requests: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    total_bytes_served: int = 0
    total_bytes_saved: int = 0
    avg_response_time_ms: float = 0
    cache_hit_rate: float = 0
    endpoints: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)

class CacheMonitor:
    """
    Monitor and track cache performance metrics
    """
    
    def __init__(self, window_size: int = 1000):
        self.metrics: deque = deque(maxlen=window_size)
        self.endpoint_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            'hits': 0,
            'misses': 0,
            'total_requests': 0,
            'avg_response_time': 0,
            'response_times': deque(maxlen=100),
            'hit_rate': 0,
            'bytes_served': 0,
            'bytes_saved': 0,
            'last_access': None
        })
        self.global_stats = CacheStats()
        self.start_time = time.time()
        
        # Performance thresholds for alerts
        self.thresholds = {
            'min_hit_rate': 0.6,  # Alert if hit rate < 60%
            'max_response_time': 200,  # Alert if avg response > 200ms
            'cache_size_mb': 100,  # Alert if cache size > 100MB
        }
        
        # Time buckets for analysis
        self.hourly_stats: Dict[int, CacheStats] = {}
        self.daily_stats: Dict[str, CacheStats] = {}
    
    def record_request(
        self,
        endpoint: str,
        cache_hit: bool,
        response_time_ms: float,
        cache_key: Optional[str] = None,
        ttl: Optional[int] = None,
        size_bytes: Optional[int] = None
    ):
        """Record a cache request metric"""
        metric = CacheMetric(
            timestamp=time.time(),
            endpoint=endpoint,
            cache_hit=cache_hit,
            response_time_ms=response_time_ms,
            cache_key=cache_key,
            ttl=ttl,
            size_bytes=size_bytes
        )
        
        self.metrics.append(metric)
        self._update_stats(metric)
        self._check_thresholds(endpoint)
    
    def _update_stats(self, metric: CacheMetric):
        """Update statistics with new metric"""
        # Update endpoint stats
        stats = self.endpoint_stats[metric.endpoint]
        stats['total_requests'] += 1
        stats['last_access'] = metric.timestamp
        
        if metric.cache_hit:
            stats['hits'] += 1
            self.global_stats.cache_hits += 1
        else:
            stats['misses'] += 1
            self.global_stats.cache_misses += 1
        
        # Update response times
        stats['response_times'].append(metric.response_time_ms)
        stats['avg_response_time'] = sum(stats['response_times']) / len(stats['response_times'])
        
        # Update hit rate
        stats['hit_rate'] = stats['hits'] / stats['total_requests'] if stats['total_requests'] > 0 else 0
        
        # Update byte counters
        if metric.size_bytes:
            stats['bytes_served'] += metric.size_bytes
            if metric.cache_hit:
                stats['bytes_saved'] += metric.size_bytes
                self.global_stats.total_bytes_saved += metric.size_bytes
            self.global_stats.total_bytes_served += metric.size_bytes
        
        # Update global stats
        self.global_stats.total_requests += 1
        self.global_stats.cache_hit_rate = (
            self.global_stats.cache_hits / self.global_stats.total_requests
            if self.global_stats.total_requests > 0 else 0
        )
        
        # Calculate global average response time
        all_response_times = []
        for ep_stats in self.endpoint_stats.values():
            all_response_times.extend(ep_stats['response_times'])
        if all_response_times:
            self.global_stats.avg_response_time_ms = sum(all_response_times) / len(all_response_times)
        
        # Update time-based stats
        self._update_time_buckets(metric)
    
    def _update_time_buckets(self, metric: CacheMetric):
        """Update hourly and daily statistics"""
        dt = datetime.fromtimestamp(metric.timestamp)
        hour_key = dt.hour
        day_key = dt.strftime('%Y-%m-%d')
        
        # Update hourly stats
        if hour_key not in self.hourly_stats:
            self.hourly_stats[hour_key] = CacheStats()
        
        hourly = self.hourly_stats[hour_key]
        hourly.total_requests += 1
        if metric.cache_hit:
            hourly.cache_hits += 1
        else:
            hourly.cache_misses += 1
        hourly.cache_hit_rate = hourly.cache_hits / hourly.total_requests if hourly.total_requests > 0 else 0
        
        # Update daily stats
        if day_key not in self.daily_stats:
            self.daily_stats[day_key] = CacheStats()
        
        daily = self.daily_stats[day_key]
        daily.total_requests += 1
        if metric.cache_hit:
            daily.cache_hits += 1
        else:
            daily.cache_misses += 1
        daily.cache_hit_rate = daily.cache_hits / daily.total_requests if daily.total_requests > 0 else 0
    
    def _check_thresholds(self, endpoint: str):
        """Check if metrics exceed thresholds and log alerts"""
        stats = self.endpoint_stats[endpoint]
        
        # Check hit rate threshold
        if stats['hit_rate'] < self.thresholds['min_hit_rate'] and stats['total_requests'] > 10:
            logger.warning(
                f"⚠️ Low cache hit rate for {endpoint}: {stats['hit_rate']:.1%} "
                f"(threshold: {self.thresholds['min_hit_rate']:.1%})"
            )
        
        # Check response time threshold
        if stats['avg_response_time'] > self.thresholds['max_response_time']:
            logger.warning(
                f"⚠️ High response time for {endpoint}: {stats['avg_response_time']:.1f}ms "
                f"(threshold: {self.thresholds['max_response_time']}ms)"
            )
    
    def get_stats(self, endpoint: Optional[str] = None) -> Dict[str, Any]:
        """Get cache statistics"""
        if endpoint:
            if endpoint in self.endpoint_stats:
                return {
                    'endpoint': endpoint,
                    **self.endpoint_stats[endpoint]
                }
            return {'error': f'No stats for endpoint: {endpoint}'}
        
        # Return global stats with top endpoints
        top_endpoints = sorted(
            self.endpoint_stats.items(),
            key=lambda x: x[1]['total_requests'],
            reverse=True
        )[:10]
        
        return {
            'global': self.global_stats.to_dict(),
            'uptime_seconds': time.time() - self.start_time,
            'top_endpoints': {
                ep: {
                    'requests': stats['total_requests'],
                    'hit_rate': f"{stats['hit_rate']:.1%}",
                    'avg_response_ms': f"{stats['avg_response_time']:.1f}"
                }
                for ep, stats in top_endpoints
            },
            'total_endpoints': len(self.endpoint_stats)
        }
    
    def get_hourly_stats(self) -> Dict[int, Dict]:
        """Get statistics by hour of day"""
        return {
            hour: stats.to_dict()
            for hour, stats in self.hourly_stats.items()
        }
    
    def get_daily_stats(self, days: int = 7) -> Dict[str, Dict]:
        """Get statistics by day"""
        cutoff_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        return {
            day: stats.to_dict()
            for day, stats in self.daily_stats.items()
            if day >= cutoff_date
        }
    
    def get_cache_effectiveness(self) -> Dict[str, Any]:
        """Calculate cache effectiveness metrics"""
        if self.global_stats.total_requests == 0:
            return {'error': 'No data available'}
        
        # Calculate bandwidth saved
        bandwidth_saved_mb = self.global_stats.total_bytes_saved / (1024 * 1024)
        
        # Calculate time saved (assuming cache is 10x faster)
        avg_origin_time = self.global_stats.avg_response_time_ms * 10
        time_saved_ms = self.global_stats.cache_hits * (avg_origin_time - self.global_stats.avg_response_time_ms)
        time_saved_seconds = time_saved_ms / 1000
        
        # Calculate cost savings (rough estimate)
        # Assume $0.01 per 1000 API calls saved
        api_calls_saved = self.global_stats.cache_hits
        cost_saved = (api_calls_saved / 1000) * 0.01
        
        return {
            'cache_hit_rate': f"{self.global_stats.cache_hit_rate:.1%}",
            'total_requests': self.global_stats.total_requests,
            'cache_hits': self.global_stats.cache_hits,
            'cache_misses': self.global_stats.cache_misses,
            'bandwidth_saved_mb': f"{bandwidth_saved_mb:.2f}",
            'time_saved_seconds': f"{time_saved_seconds:.1f}",
            'estimated_cost_saved': f"${cost_saved:.2f}",
            'avg_response_time_ms': f"{self.global_stats.avg_response_time_ms:.1f}",
            'effectiveness_score': self._calculate_effectiveness_score()
        }
    
    def _calculate_effectiveness_score(self) -> str:
        """Calculate overall cache effectiveness score"""
        score = 0
        
        # Hit rate contributes 50% of score
        score += self.global_stats.cache_hit_rate * 50
        
        # Response time contributes 30% of score
        if self.global_stats.avg_response_time_ms < 50:
            score += 30
        elif self.global_stats.avg_response_time_ms < 100:
            score += 20
        elif self.global_stats.avg_response_time_ms < 200:
            score += 10
        
        # Bandwidth savings contribute 20% of score
        if self.global_stats.total_bytes_saved > 100 * 1024 * 1024:  # 100MB
            score += 20
        elif self.global_stats.total_bytes_saved > 10 * 1024 * 1024:  # 10MB
            score += 10
        
        if score >= 80:
            return f"Excellent ({score:.0f}/100)"
        elif score >= 60:
            return f"Good ({score:.0f}/100)"
        elif score >= 40:
            return f"Fair ({score:.0f}/100)"
        else:
            return f"Needs Improvement ({score:.0f}/100)"
    
    def get_recommendations(self) -> List[str]:
        """Get cache optimization recommendations"""
        recommendations = []
        
        # Check global hit rate
        if self.global_stats.cache_hit_rate < 0.6:
            recommendations.append(
                f"⚠️ Cache hit rate is {self.global_stats.cache_hit_rate:.1%}. "
                "Consider increasing TTL for frequently accessed endpoints."
            )
        
        # Check for endpoints with poor performance
        for endpoint, stats in self.endpoint_stats.items():
            if stats['total_requests'] > 10:
                if stats['hit_rate'] < 0.5:
                    recommendations.append(
                        f"📊 {endpoint} has low hit rate ({stats['hit_rate']:.1%}). "
                        "Review caching strategy for this endpoint."
                    )
                if stats['avg_response_time'] > 300:
                    recommendations.append(
                        f"⏱️ {endpoint} has high response time ({stats['avg_response_time']:.0f}ms). "
                        "Consider optimizing or pre-warming cache."
                    )
        
        # Check time-based patterns
        peak_hour = max(self.hourly_stats.items(), key=lambda x: x[1].total_requests)[0] if self.hourly_stats else None
        if peak_hour is not None:
            recommendations.append(
                f"🕐 Peak traffic at {peak_hour}:00. "
                "Consider cache warming before this time."
            )
        
        if not recommendations:
            recommendations.append("✅ Cache performance is optimal!")
        
        return recommendations
    
    async def export_metrics(self, format: str = 'json') -> str:
        """Export metrics in various formats"""
        data = {
            'timestamp': datetime.now().isoformat(),
            'stats': self.get_stats(),
            'effectiveness': self.get_cache_effectiveness(),
            'hourly': self.get_hourly_stats(),
            'daily': self.get_daily_stats(),
            'recommendations': self.get_recommendations()
        }
        
        if format == 'json':
            return json.dumps(data, indent=2)
        elif format == 'prometheus':
            # Format for Prometheus metrics
            lines = [
                f'# HELP cache_hit_rate Cache hit rate',
                f'# TYPE cache_hit_rate gauge',
                f'cache_hit_rate {self.global_stats.cache_hit_rate}',
                f'# HELP cache_total_requests Total cache requests',
                f'# TYPE cache_total_requests counter',
                f'cache_total_requests {self.global_stats.total_requests}',
                f'# HELP cache_response_time_ms Average response time in milliseconds',
                f'# TYPE cache_response_time_ms gauge',
                f'cache_response_time_ms {self.global_stats.avg_response_time_ms}',
            ]
            return '\n'.join(lines)
        else:
            return str(data)

# Singleton instance
cache_monitor = CacheMonitor()

# Export for use
__all__ = ['CacheMonitor', 'cache_monitor', 'CacheMetric', 'CacheStats']