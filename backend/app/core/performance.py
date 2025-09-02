"""
PAM Performance Optimization & Load Testing - Phase 5
Comprehensive performance monitoring, optimization, and load testing
"""

import asyncio
import aiohttp
import time
import logging
import json
import statistics
from typing import Dict, Any, List, Optional, Callable, NamedTuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import psutil
import gc
import sys

import redis
from functools import wraps, lru_cache
import cachetools

logger = logging.getLogger(__name__)


class LoadTestType(Enum):
    SPIKE = "spike"
    STRESS = "stress"
    VOLUME = "volume"
    ENDURANCE = "endurance"
    BASELINE = "baseline"


class PerformanceIssueType(Enum):
    SLOW_RESPONSE = "slow_response"
    HIGH_MEMORY = "high_memory"
    HIGH_CPU = "high_cpu"
    CONNECTION_LEAK = "connection_leak"
    MEMORY_LEAK = "memory_leak"
    DEADLOCK = "deadlock"
    RESOURCE_EXHAUSTION = "resource_exhaustion"


@dataclass
class LoadTestConfig:
    test_type: LoadTestType
    duration_seconds: int
    concurrent_users: int
    requests_per_second: int
    ramp_up_seconds: int
    ramp_down_seconds: int
    endpoints: List[str]
    user_scenarios: List[Dict[str, Any]]
    success_criteria: Dict[str, float]


@dataclass
class LoadTestResult:
    test_id: str
    config: LoadTestConfig
    start_time: datetime
    end_time: datetime
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    throughput_rps: float
    error_rate: float
    cpu_usage_stats: Dict[str, float]
    memory_usage_stats: Dict[str, float]
    errors: List[Dict[str, Any]]
    passed: bool


@dataclass
class PerformanceOptimization:
    name: str
    description: str
    implementation: Callable
    expected_improvement: str
    risk_level: str  # low, medium, high
    applies_to: List[str]  # components this optimization affects


@dataclass
class PerformanceIssue:
    id: str
    type: PerformanceIssueType
    severity: str  # low, medium, high, critical
    component: str
    description: str
    metrics: Dict[str, Any]
    recommendations: List[str]
    detected_at: datetime


class PerformanceProfiler:
    """Context manager for performance profiling"""
    
    def __init__(self, name: str, monitoring_service=None):
        self.name = name
        self.monitoring_service = monitoring_service
        self.start_time = None
        self.start_memory = None
        self.start_cpu = None
    
    def __enter__(self):
        self.start_time = time.perf_counter()
        self.start_memory = psutil.Process().memory_info().rss
        self.start_cpu = psutil.Process().cpu_percent()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.perf_counter() - self.start_time
        end_memory = psutil.Process().memory_info().rss
        memory_delta = end_memory - self.start_memory
        
        if self.monitoring_service:
            self.monitoring_service.record_performance_profile(
                self.name, duration, memory_delta
            )
        
        logger.debug(
            f"Performance profile: {self.name}",
            duration_ms=duration * 1000,
            memory_delta_mb=memory_delta / (1024 * 1024)
        )


def performance_monitor(func_name: Optional[str] = None):
    """Decorator for monitoring function performance"""
    def decorator(func):
        name = func_name or f"{func.__module__}.{func.__name__}"
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.perf_counter()
            start_memory = psutil.Process().memory_info().rss
            
            try:
                result = await func(*args, **kwargs)
                status = "success"
                return result
            except Exception as e:
                status = "error"
                raise
            finally:
                duration = time.perf_counter() - start_time
                end_memory = psutil.Process().memory_info().rss
                memory_delta = end_memory - start_memory
                
                # Log performance metrics
                logger.debug(
                    f"Function performance: {name}",
                    duration_ms=duration * 1000,
                    memory_delta_mb=memory_delta / (1024 * 1024),
                    status=status
                )
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.perf_counter()
            start_memory = psutil.Process().memory_info().rss
            
            try:
                result = func(*args, **kwargs)
                status = "success"
                return result
            except Exception as e:
                status = "error"
                raise
            finally:
                duration = time.perf_counter() - start_time
                end_memory = psutil.Process().memory_info().rss
                memory_delta = end_memory - start_memory
                
                logger.debug(
                    f"Function performance: {name}",
                    duration_ms=duration * 1000,
                    memory_delta_mb=memory_delta / (1024 * 1024),
                    status=status
                )
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator


class PAMPerformanceOptimizer:
    """
    Comprehensive performance optimization and load testing system
    """
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.from_url("redis://localhost:6379/4")
        
        # Performance tracking
        self.performance_history: List[Dict[str, Any]] = []
        self.load_test_results: Dict[str, LoadTestResult] = {}
        self.performance_issues: Dict[str, PerformanceIssue] = {}
        
        # Caching
        self.response_cache = cachetools.TTLCache(maxsize=1000, ttl=300)  # 5-minute TTL
        self.computation_cache = cachetools.LRUCache(maxsize=500)
        
        # Connection pooling
        self.http_session: Optional[aiohttp.ClientSession] = None
        self.connection_pool_stats = {"created": 0, "reused": 0, "closed": 0}
        
        # Performance optimizations
        self.optimizations = self._initialize_optimizations()
        
        # Load test configurations
        self.load_test_configs = self._initialize_load_test_configs()
        
        logger.info("Performance Optimizer initialized")
    
    def _initialize_optimizations(self) -> List[PerformanceOptimization]:
        """Initialize available performance optimizations"""
        
        return [
            PerformanceOptimization(
                name="Response Caching",
                description="Cache frequently accessed responses to reduce compute load",
                implementation=self._enable_response_caching,
                expected_improvement="30-50% response time reduction for cached requests",
                risk_level="low",
                applies_to=["api_endpoints", "agent_responses"]
            ),
            PerformanceOptimization(
                name="Connection Pooling",
                description="Reuse HTTP connections to reduce connection overhead",
                implementation=self._optimize_connection_pooling,
                expected_improvement="10-20% reduction in network latency",
                risk_level="low",
                applies_to=["external_apis", "database_connections"]
            ),
            PerformanceOptimization(
                name="Async Processing",
                description="Convert blocking operations to async where possible",
                implementation=self._optimize_async_processing,
                expected_improvement="Improved concurrency and resource utilization",
                risk_level="medium",
                applies_to=["agent_processing", "background_tasks"]
            ),
            PerformanceOptimization(
                name="Memory Optimization",
                description="Optimize memory usage patterns and garbage collection",
                implementation=self._optimize_memory_usage,
                expected_improvement="20-30% memory usage reduction",
                risk_level="medium",
                applies_to=["agent_memory", "caching_systems"]
            ),
            PerformanceOptimization(
                name="Database Query Optimization",
                description="Optimize database queries and connection pooling",
                implementation=self._optimize_database_queries,
                expected_improvement="40-60% database response time improvement",
                risk_level="medium",
                applies_to=["memory_system", "user_data"]
            ),
            PerformanceOptimization(
                name="Background Task Optimization",
                description="Optimize background task processing and queuing",
                implementation=self._optimize_background_tasks,
                expected_improvement="Improved system responsiveness under load",
                risk_level="low",
                applies_to=["proactive_intelligence", "monitoring"]
            )
        ]
    
    def _initialize_load_test_configs(self) -> Dict[str, LoadTestConfig]:
        """Initialize load test configurations"""
        
        return {
            "baseline": LoadTestConfig(
                test_type=LoadTestType.BASELINE,
                duration_seconds=300,  # 5 minutes
                concurrent_users=10,
                requests_per_second=5,
                ramp_up_seconds=60,
                ramp_down_seconds=60,
                endpoints=["/api/v1/pam/chat", "/api/health"],
                user_scenarios=[
                    {"scenario": "basic_chat", "weight": 0.8},
                    {"scenario": "health_check", "weight": 0.2}
                ],
                success_criteria={
                    "avg_response_time_ms": 500,
                    "p95_response_time_ms": 1000,
                    "error_rate": 0.01,
                    "throughput_rps": 4.0
                }
            ),
            "stress": LoadTestConfig(
                test_type=LoadTestType.STRESS,
                duration_seconds=600,  # 10 minutes
                concurrent_users=100,
                requests_per_second=50,
                ramp_up_seconds=120,
                ramp_down_seconds=120,
                endpoints=["/api/v1/pam/chat", "/api/v1/pam/proactive"],
                user_scenarios=[
                    {"scenario": "intensive_chat", "weight": 0.7},
                    {"scenario": "proactive_requests", "weight": 0.3}
                ],
                success_criteria={
                    "avg_response_time_ms": 1000,
                    "p95_response_time_ms": 2000,
                    "error_rate": 0.05,
                    "throughput_rps": 40.0
                }
            ),
            "spike": LoadTestConfig(
                test_type=LoadTestType.SPIKE,
                duration_seconds=180,  # 3 minutes
                concurrent_users=200,
                requests_per_second=100,
                ramp_up_seconds=10,  # Very fast ramp up
                ramp_down_seconds=30,
                endpoints=["/api/v1/pam/chat"],
                user_scenarios=[
                    {"scenario": "spike_traffic", "weight": 1.0}
                ],
                success_criteria={
                    "avg_response_time_ms": 2000,
                    "p95_response_time_ms": 5000,
                    "error_rate": 0.1,
                    "throughput_rps": 70.0
                }
            )
        }
    
    # Performance monitoring methods
    
    def record_performance_profile(self, operation: str, duration_seconds: float, memory_delta_bytes: int):
        """Record performance profile data"""
        
        profile_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "operation": operation,
            "duration_seconds": duration_seconds,
            "duration_ms": duration_seconds * 1000,
            "memory_delta_bytes": memory_delta_bytes,
            "memory_delta_mb": memory_delta_bytes / (1024 * 1024)
        }
        
        self.performance_history.append(profile_data)
        
        # Store in Redis
        try:
            key = f"pam:performance:profile:{int(time.time())}"
            self.redis_client.setex(key, 3600, json.dumps(profile_data))  # 1 hour TTL
        except Exception as e:
            logger.error(f"Failed to store performance profile: {e}")
        
        # Check for performance issues
        self._check_performance_issues(profile_data)
    
    def _check_performance_issues(self, profile_data: Dict[str, Any]):
        """Check for performance issues based on profile data"""
        
        # Slow response detection
        if profile_data["duration_ms"] > 5000:  # 5 seconds
            issue = PerformanceIssue(
                id=f"slow_response_{int(time.time())}",
                type=PerformanceIssueType.SLOW_RESPONSE,
                severity="high" if profile_data["duration_ms"] > 10000 else "medium",
                component=profile_data["operation"],
                description=f"Slow operation detected: {profile_data['duration_ms']:.0f}ms",
                metrics=profile_data,
                recommendations=[
                    "Check for blocking I/O operations",
                    "Review algorithm complexity",
                    "Consider caching strategies",
                    "Profile memory allocations"
                ],
                detected_at=datetime.utcnow()
            )
            self.performance_issues[issue.id] = issue
        
        # Memory leak detection (simplified)
        if profile_data["memory_delta_mb"] > 100:  # 100MB increase
            issue = PerformanceIssue(
                id=f"memory_increase_{int(time.time())}",
                type=PerformanceIssueType.HIGH_MEMORY,
                severity="medium",
                component=profile_data["operation"],
                description=f"High memory allocation: {profile_data['memory_delta_mb']:.1f}MB",
                metrics=profile_data,
                recommendations=[
                    "Review object lifecycle management",
                    "Check for circular references",
                    "Consider memory pooling",
                    "Profile garbage collection patterns"
                ],
                detected_at=datetime.utcnow()
            )
            self.performance_issues[issue.id] = issue
    
    # Load testing methods
    
    async def run_load_test(self, config_name: str) -> LoadTestResult:
        """Run a load test with specified configuration"""
        
        if config_name not in self.load_test_configs:
            raise ValueError(f"Unknown load test configuration: {config_name}")
        
        config = self.load_test_configs[config_name]
        test_id = f"load_test_{config_name}_{int(time.time())}"
        
        logger.info(f"Starting load test: {test_id}")
        
        start_time = datetime.utcnow()
        
        # Prepare HTTP session
        await self._ensure_http_session()
        
        # Initialize metrics
        results = {
            "requests": [],
            "errors": [],
            "response_times": [],
            "cpu_samples": [],
            "memory_samples": []
        }
        
        # Run the load test
        try:
            # Ramp up phase
            await self._run_ramp_phase("up", config, results)
            
            # Sustained load phase
            await self._run_sustained_phase(config, results)
            
            # Ramp down phase
            await self._run_ramp_phase("down", config, results)
            
        except Exception as e:
            logger.error(f"Load test failed: {e}")
            results["errors"].append({
                "type": "test_execution_error",
                "message": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
        
        end_time = datetime.utcnow()
        
        # Calculate results
        load_test_result = self._calculate_load_test_results(
            test_id, config, start_time, end_time, results
        )
        
        # Store results
        self.load_test_results[test_id] = load_test_result
        
        # Store in Redis
        try:
            key = f"pam:load_test:{test_id}"
            self.redis_client.setex(key, 86400 * 7, json.dumps({
                "test_id": test_id,
                "config_name": config_name,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "passed": load_test_result.passed,
                "total_requests": load_test_result.total_requests,
                "average_response_time_ms": load_test_result.average_response_time_ms,
                "error_rate": load_test_result.error_rate
            }))
        except Exception as e:
            logger.error(f"Failed to store load test results: {e}")
        
        logger.info(
            f"Load test completed: {test_id}",
            passed=load_test_result.passed,
            total_requests=load_test_result.total_requests,
            avg_response_time=load_test_result.average_response_time_ms,
            error_rate=load_test_result.error_rate
        )
        
        return load_test_result
    
    async def _ensure_http_session(self):
        """Ensure HTTP session is available for load testing"""
        
        if not self.http_session or self.http_session.closed:
            connector = aiohttp.TCPConnector(
                limit=100,  # Total connection pool size
                limit_per_host=30,  # Connections per host
                keepalive_timeout=30,
                enable_cleanup_closed=True
            )
            
            timeout = aiohttp.ClientTimeout(total=30)
            
            self.http_session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
                headers={"User-Agent": "PAM-LoadTester/1.0"}
            )
    
    async def _run_ramp_phase(self, direction: str, config: LoadTestConfig, results: Dict[str, List]):
        """Run ramp up or ramp down phase"""
        
        ramp_duration = config.ramp_up_seconds if direction == "up" else config.ramp_down_seconds
        if ramp_duration == 0:
            return
        
        start_users = 1 if direction == "up" else config.concurrent_users
        end_users = config.concurrent_users if direction == "up" else 1
        
        steps = 10  # Divide ramp into 10 steps
        step_duration = ramp_duration / steps
        user_step = (end_users - start_users) / steps
        
        for step in range(steps):
            current_users = int(start_users + (user_step * step))
            
            # Launch concurrent requests
            tasks = []
            for _ in range(current_users):
                endpoint = self._select_endpoint(config)
                task = self._make_request(endpoint, results)
                tasks.append(task)
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
            
            await asyncio.sleep(step_duration)
    
    async def _run_sustained_phase(self, config: LoadTestConfig, results: Dict[str, List]):
        """Run sustained load phase"""
        
        sustained_duration = config.duration_seconds - config.ramp_up_seconds - config.ramp_down_seconds
        if sustained_duration <= 0:
            return
        
        end_time = time.time() + sustained_duration
        request_interval = 1.0 / config.requests_per_second
        
        while time.time() < end_time:
            # Launch batch of concurrent requests
            tasks = []
            for _ in range(config.concurrent_users):
                endpoint = self._select_endpoint(config)
                task = self._make_request(endpoint, results)
                tasks.append(task)
            
            # Start requests
            await asyncio.gather(*tasks, return_exceptions=True)
            
            # Sample system metrics
            self._sample_system_metrics(results)
            
            # Wait for next batch
            await asyncio.sleep(request_interval)
    
    def _select_endpoint(self, config: LoadTestConfig) -> str:
        """Select an endpoint based on configuration"""
        
        # Simple round-robin selection
        # In a real implementation, would use scenario weights
        import random
        return random.choice(config.endpoints)
    
    async def _make_request(self, endpoint: str, results: Dict[str, List]):
        """Make a single HTTP request"""
        
        start_time = time.perf_counter()
        
        try:
            # Simulate request to PAM API
            url = f"http://localhost:8000{endpoint}"
            
            # Simple payload for testing
            payload = {
                "message": "Test load test message",
                "user_id": "load_test_user",
                "context": {"test": True}
            }
            
            async with self.http_session.post(url, json=payload) as response:
                response_time = (time.perf_counter() - start_time) * 1000
                
                request_result = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "endpoint": endpoint,
                    "status_code": response.status,
                    "response_time_ms": response_time,
                    "success": 200 <= response.status < 400
                }
                
                results["requests"].append(request_result)
                results["response_times"].append(response_time)
                
                if not request_result["success"]:
                    error_detail = {
                        "timestamp": datetime.utcnow().isoformat(),
                        "endpoint": endpoint,
                        "status_code": response.status,
                        "error": "HTTP error"
                    }
                    results["errors"].append(error_detail)
        
        except Exception as e:
            response_time = (time.perf_counter() - start_time) * 1000
            
            error_detail = {
                "timestamp": datetime.utcnow().isoformat(),
                "endpoint": endpoint,
                "error": str(e),
                "response_time_ms": response_time
            }
            results["errors"].append(error_detail)
            results["response_times"].append(response_time)
    
    def _sample_system_metrics(self, results: Dict[str, List]):
        """Sample system metrics during load test"""
        
        try:
            cpu_percent = psutil.cpu_percent()
            memory_info = psutil.virtual_memory()
            
            results["cpu_samples"].append(cpu_percent)
            results["memory_samples"].append(memory_info.percent)
            
        except Exception as e:
            logger.warning(f"Failed to sample system metrics: {e}")
    
    def _calculate_load_test_results(
        self,
        test_id: str,
        config: LoadTestConfig,
        start_time: datetime,
        end_time: datetime,
        results: Dict[str, List]
    ) -> LoadTestResult:
        """Calculate comprehensive load test results"""
        
        total_requests = len(results["requests"])
        successful_requests = sum(1 for r in results["requests"] if r["success"])
        failed_requests = total_requests - successful_requests
        
        response_times = results["response_times"]
        
        if response_times:
            avg_response_time = statistics.mean(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else max(response_times)
            p99_response_time = statistics.quantiles(response_times, n=100)[98] if len(response_times) > 100 else max(response_times)
        else:
            avg_response_time = p95_response_time = p99_response_time = 0
        
        duration_seconds = (end_time - start_time).total_seconds()
        throughput_rps = total_requests / duration_seconds if duration_seconds > 0 else 0
        error_rate = failed_requests / total_requests if total_requests > 0 else 0
        
        cpu_stats = {
            "avg": statistics.mean(results["cpu_samples"]) if results["cpu_samples"] else 0,
            "max": max(results["cpu_samples"]) if results["cpu_samples"] else 0,
            "min": min(results["cpu_samples"]) if results["cpu_samples"] else 0
        }
        
        memory_stats = {
            "avg": statistics.mean(results["memory_samples"]) if results["memory_samples"] else 0,
            "max": max(results["memory_samples"]) if results["memory_samples"] else 0,
            "min": min(results["memory_samples"]) if results["memory_samples"] else 0
        }
        
        # Check success criteria
        criteria = config.success_criteria
        passed = (
            avg_response_time <= criteria["avg_response_time_ms"] and
            p95_response_time <= criteria["p95_response_time_ms"] and
            error_rate <= criteria["error_rate"] and
            throughput_rps >= criteria["throughput_rps"]
        )
        
        return LoadTestResult(
            test_id=test_id,
            config=config,
            start_time=start_time,
            end_time=end_time,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            average_response_time_ms=avg_response_time,
            p95_response_time_ms=p95_response_time,
            p99_response_time_ms=p99_response_time,
            throughput_rps=throughput_rps,
            error_rate=error_rate,
            cpu_usage_stats=cpu_stats,
            memory_usage_stats=memory_stats,
            errors=results["errors"],
            passed=passed
        )
    
    # Optimization implementation methods
    
    async def apply_optimization(self, optimization_name: str) -> Dict[str, Any]:
        """Apply a specific performance optimization"""
        
        optimization = next((opt for opt in self.optimizations if opt.name == optimization_name), None)
        if not optimization:
            return {"error": f"Unknown optimization: {optimization_name}"}
        
        try:
            result = await optimization.implementation()
            
            logger.info(
                f"Applied optimization: {optimization_name}",
                expected_improvement=optimization.expected_improvement,
                risk_level=optimization.risk_level
            )
            
            return {
                "success": True,
                "optimization": optimization_name,
                "result": result,
                "expected_improvement": optimization.expected_improvement
            }
            
        except Exception as e:
            logger.error(f"Failed to apply optimization {optimization_name}: {e}")
            return {"error": str(e)}
    
    async def _enable_response_caching(self) -> Dict[str, Any]:
        """Enable response caching optimization"""
        
        # Response caching is already initialized in __init__
        # This would configure additional caching layers
        
        return {
            "cache_size": self.response_cache.maxsize,
            "cache_ttl": 300,
            "status": "enabled"
        }
    
    async def _optimize_connection_pooling(self) -> Dict[str, Any]:
        """Optimize HTTP connection pooling"""
        
        # Ensure optimized HTTP session
        await self._ensure_http_session()
        
        return {
            "pool_size": 100,
            "per_host_limit": 30,
            "keepalive_timeout": 30,
            "status": "optimized"
        }
    
    async def _optimize_async_processing(self) -> Dict[str, Any]:
        """Optimize async processing patterns"""
        
        # This would involve code changes to make blocking operations async
        # For now, return configuration recommendations
        
        return {
            "recommendations": [
                "Convert blocking I/O to async",
                "Use asyncio.gather for parallel operations", 
                "Implement proper async context managers",
                "Use async database drivers"
            ],
            "status": "recommendations_provided"
        }
    
    async def _optimize_memory_usage(self) -> Dict[str, Any]:
        """Optimize memory usage patterns"""
        
        # Force garbage collection
        collected = gc.collect()
        
        # Optimize cache sizes based on available memory
        memory = psutil.virtual_memory()
        available_mb = memory.available / (1024 * 1024)
        
        # Adjust cache sizes based on available memory
        if available_mb > 1000:  # > 1GB
            self.response_cache = cachetools.TTLCache(maxsize=2000, ttl=300)
            self.computation_cache = cachetools.LRUCache(maxsize=1000)
        
        return {
            "garbage_collected": collected,
            "available_memory_mb": available_mb,
            "cache_sizes_adjusted": True,
            "status": "optimized"
        }
    
    async def _optimize_database_queries(self) -> Dict[str, Any]:
        """Optimize database query patterns"""
        
        # This would involve query optimization, connection pooling, etc.
        # For now, return recommendations
        
        return {
            "recommendations": [
                "Implement connection pooling",
                "Add database query caching",
                "Optimize slow queries with indexes",
                "Use prepared statements",
                "Implement query batching"
            ],
            "status": "recommendations_provided"
        }
    
    async def _optimize_background_tasks(self) -> Dict[str, Any]:
        """Optimize background task processing"""
        
        return {
            "recommendations": [
                "Implement task prioritization",
                "Add task result caching",
                "Optimize task queue sizes",
                "Implement task batching",
                "Add task timeout handling"
            ],
            "status": "recommendations_provided"
        }
    
    # Reporting methods
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report"""
        
        try:
            # Recent performance data
            recent_profiles = self.performance_history[-100:]  # Last 100 operations
            
            if recent_profiles:
                avg_duration = statistics.mean([p["duration_ms"] for p in recent_profiles])
                p95_duration = statistics.quantiles([p["duration_ms"] for p in recent_profiles], n=20)[-1] if len(recent_profiles) >= 20 else 0
                avg_memory_delta = statistics.mean([p["memory_delta_mb"] for p in recent_profiles])
            else:
                avg_duration = p95_duration = avg_memory_delta = 0
            
            # System metrics
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            
            # Performance issues
            active_issues = [issue for issue in self.performance_issues.values() 
                           if issue.detected_at > datetime.utcnow() - timedelta(hours=24)]
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "performance_metrics": {
                    "avg_operation_duration_ms": round(avg_duration, 2),
                    "p95_operation_duration_ms": round(p95_duration, 2),
                    "avg_memory_delta_mb": round(avg_memory_delta, 2),
                    "operations_profiled": len(recent_profiles)
                },
                "system_metrics": {
                    "cpu_percent": cpu_percent,
                    "memory_percent": memory.percent,
                    "memory_available_gb": memory.available / (1024**3)
                },
                "performance_issues": {
                    "total_issues": len(active_issues),
                    "critical_issues": len([i for i in active_issues if i.severity == "critical"]),
                    "high_issues": len([i for i in active_issues if i.severity == "high"]),
                    "issue_types": list(set(i.type.value for i in active_issues))
                },
                "load_tests": {
                    "total_tests": len(self.load_test_results),
                    "passed_tests": sum(1 for r in self.load_test_results.values() if r.passed),
                    "recent_tests": len([r for r in self.load_test_results.values() 
                                       if r.end_time > datetime.utcnow() - timedelta(days=7)])
                },
                "optimizations": {
                    "available_optimizations": len(self.optimizations),
                    "optimization_categories": list(set(opt.risk_level for opt in self.optimizations))
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to generate performance report: {e}")
            return {"error": str(e)}
    
    async def cleanup(self):
        """Cleanup resources"""
        
        if self.http_session and not self.http_session.closed:
            await self.http_session.close()
        
        logger.info("Performance optimizer cleanup completed")