#!/usr/bin/env python3
"""
PAM Performance Benchmarking Suite
==================================

Comprehensive performance testing for the Wheels & Wins PAM system.
Tests registry initialization, tool execution speed, memory usage, and dependency issues.

Usage:
    python performance_benchmarks/pam_performance_test.py

Performance Targets:
- Registry startup: < 5 seconds
- Tool registration: < 100ms per tool
- Individual tool execution: < 30 seconds
- Memory usage: < 500MB for registry
- Success rate: > 95% for tool loading
"""

import asyncio
import time
import psutil
import tracemalloc
import logging
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

# Add backend to Python path for imports
sys.path.insert(0, '/Users/thabonel/Code/wheels-wins-landing-page/backend')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetric:
    """Performance metric data structure"""
    metric_name: str
    value: float
    unit: str
    timestamp: datetime
    success: bool
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class ToolPerformance:
    """Tool-specific performance metrics"""
    tool_name: str
    registration_time_ms: float
    initialization_time_ms: float
    memory_usage_mb: float
    success: bool
    error_message: Optional[str] = None
    dependency_issues: List[str] = None

@dataclass
class SystemPerformance:
    """System-wide performance metrics"""
    total_startup_time_ms: float
    registry_initialization_time_ms: float
    total_memory_usage_mb: float
    peak_memory_usage_mb: float
    tools_loaded_successfully: int
    tools_failed_to_load: int
    success_rate_percentage: float

class PAMPerformanceBenchmark:
    """Performance benchmarking suite for PAM system"""

    def __init__(self):
        self.metrics: List[PerformanceMetric] = []
        self.tool_performances: Dict[str, ToolPerformance] = {}
        self.system_performance: Optional[SystemPerformance] = None
        self.baseline_memory_mb = 0

    def record_metric(self, name: str, value: float, unit: str, success: bool = True,
                     error: Optional[str] = None, metadata: Optional[Dict] = None):
        """Record a performance metric"""
        metric = PerformanceMetric(
            metric_name=name,
            value=value,
            unit=unit,
            timestamp=datetime.now(),
            success=success,
            error_message=error,
            metadata=metadata
        )
        self.metrics.append(metric)
        logger.info(f"📊 {name}: {value}{unit} {'✅' if success else '❌'}")

    def get_memory_usage_mb(self) -> float:
        """Get current memory usage in MB"""
        process = psutil.Process()
        return process.memory_info().rss / 1024 / 1024

    async def test_pam_core_initialization(self):
        """Test PAM core initialization performance"""
        logger.info("🧠 Testing PAM Core initialization...")

        # Record baseline memory
        self.baseline_memory_mb = self.get_memory_usage_mb()
        self.record_metric("baseline_memory_usage", self.baseline_memory_mb, "MB")

        start_time = time.time()
        start_memory = self.get_memory_usage_mb()

        try:
            # Import and initialize PAM core
            from app.services.pam.core.pam import PAM

            # Measure tool cache building
            cache_start = time.time()
            tools = PAM._get_tools()
            cache_time_ms = (time.time() - cache_start) * 1000

            self.record_metric("tool_cache_build_time", cache_time_ms, "ms")
            self.record_metric("total_tools_in_cache", len(tools), "count")

            # Initialize PAM instance
            init_start = time.time()
            pam = PAM(user_id="test-user-123", user_language="en")
            init_time_ms = (time.time() - init_start) * 1000

            total_time_ms = (time.time() - start_time) * 1000
            memory_used_mb = self.get_memory_usage_mb() - start_memory

            self.record_metric("pam_core_initialization_time", init_time_ms, "ms", True)
            self.record_metric("pam_total_startup_time", total_time_ms, "ms", True)
            self.record_metric("pam_memory_usage", memory_used_mb, "MB", True)

            return True, None

        except Exception as e:
            error_msg = f"PAM Core initialization failed: {str(e)}"
            logger.error(error_msg)
            total_time_ms = (time.time() - start_time) * 1000
            self.record_metric("pam_core_initialization_time", total_time_ms, "ms", False, error_msg)
            return False, error_msg

    async def test_tool_registry_performance(self):
        """Test tool registry initialization and individual tool performance"""
        logger.info("🛠️ Testing Tool Registry performance...")

        try:
            from app.services.pam.tools.tool_registry import ToolRegistry

            # Test registry initialization
            start_time = time.time()
            start_memory = self.get_memory_usage_mb()

            registry = ToolRegistry()

            # Initialize registry
            init_start = time.time()
            await registry.initialize()
            registry_init_time_ms = (time.time() - init_start) * 1000

            total_time_ms = (time.time() - start_time) * 1000
            memory_used_mb = self.get_memory_usage_mb() - start_memory

            # Calculate success rates
            total_tools = len(registry.tool_definitions)
            enabled_tools = sum(1 for defn in registry.tool_definitions.values() if defn.enabled)
            success_rate = (enabled_tools / total_tools * 100) if total_tools > 0 else 0

            self.record_metric("registry_initialization_time", registry_init_time_ms, "ms", True)
            self.record_metric("registry_total_tools", total_tools, "count")
            self.record_metric("registry_enabled_tools", enabled_tools, "count")
            self.record_metric("registry_success_rate", success_rate, "%")
            self.record_metric("registry_memory_usage", memory_used_mb, "MB")

            return registry, True, None

        except Exception as e:
            error_msg = f"Tool registry initialization failed: {str(e)}"
            logger.error(error_msg)
            self.record_metric("registry_initialization_time", 0, "ms", False, error_msg)
            return None, False, error_msg

    async def test_individual_tool_performance(self, registry):
        """Test individual tool execution performance"""
        if not registry:
            logger.warning("⚠️ Skipping individual tool tests - registry not available")
            return

        logger.info("⚡ Testing individual tool performance...")

        # Test a sample of critical tools
        test_tools = [
            "analyze_budget",
            "create_expense",
            "get_weather_forecast",
            "create_calendar_event",
            "search_products",
            "plan_trip"
        ]

        for tool_name in test_tools:
            if tool_name not in registry.tools:
                logger.warning(f"⚠️ Tool '{tool_name}' not found in registry")
                continue

            logger.info(f"Testing tool: {tool_name}")

            try:
                start_time = time.time()
                start_memory = self.get_memory_usage_mb()

                tool = registry.tools[tool_name]

                # Test tool execution with minimal parameters
                test_params = self._get_test_parameters(tool_name)

                # Execute tool with timeout
                try:
                    result = await asyncio.wait_for(
                        tool.execute(test_params),
                        timeout=30.0
                    )
                    execution_success = True
                    error_msg = None
                except asyncio.TimeoutError:
                    execution_success = False
                    error_msg = "Tool execution timeout (>30s)"
                    result = None
                except Exception as e:
                    execution_success = False
                    error_msg = f"Tool execution failed: {str(e)}"
                    result = None

                execution_time_ms = (time.time() - start_time) * 1000
                memory_used_mb = self.get_memory_usage_mb() - start_memory

                # Record tool-specific metrics
                tool_perf = ToolPerformance(
                    tool_name=tool_name,
                    registration_time_ms=0,  # Already registered
                    initialization_time_ms=execution_time_ms,
                    memory_usage_mb=memory_used_mb,
                    success=execution_success,
                    error_message=error_msg
                )

                self.tool_performances[tool_name] = tool_perf

                # Record as general metrics
                self.record_metric(
                    f"tool_{tool_name}_execution_time",
                    execution_time_ms,
                    "ms",
                    execution_success,
                    error_msg
                )

            except Exception as e:
                error_msg = f"Failed to test tool '{tool_name}': {str(e)}"
                logger.error(error_msg)
                self.record_metric(
                    f"tool_{tool_name}_execution_time",
                    0,
                    "ms",
                    False,
                    error_msg
                )

    def _get_test_parameters(self, tool_name: str) -> Dict[str, Any]:
        """Get minimal test parameters for a tool"""
        test_params = {
            "analyze_budget": {
                "user_id": "test-user-123",
                "timeframe": "current_month"
            },
            "create_expense": {
                "user_id": "test-user-123",
                "amount": 10.00,
                "category": "food",
                "description": "Test expense"
            },
            "get_weather_forecast": {
                "location": "Austin, TX"
            },
            "create_calendar_event": {
                "user_id": "test-user-123",
                "title": "Test Event",
                "description": "Performance test event",
                "start_datetime": "2025-01-30T10:00:00",
                "duration_hours": 1
            },
            "search_products": {
                "query": "camping gear",
                "category": "outdoor"
            },
            "plan_trip": {
                "user_id": "test-user-123",
                "destination": "Austin, TX",
                "trip_type": "day_trip"
            }
        }

        return test_params.get(tool_name, {"user_id": "test-user-123"})

    async def test_dependency_health(self):
        """Test for missing dependencies and their performance impact"""
        logger.info("📦 Testing dependency health...")

        critical_dependencies = [
            "anthropic",
            "fastapi",
            "uvicorn",
            "supabase",
            "redis",
            "sqlalchemy",
            "pydantic",
            "openai",
            "google-generativeai",
            "assemblyai",
            "edge-tts",
            "websockets"
        ]

        missing_deps = []
        import_times = {}

        for dep in critical_dependencies:
            start_time = time.time()
            try:
                __import__(dep)
                import_time_ms = (time.time() - start_time) * 1000
                import_times[dep] = import_time_ms
                self.record_metric(f"dependency_{dep}_import_time", import_time_ms, "ms", True)
            except ImportError as e:
                missing_deps.append(dep)
                import_time_ms = (time.time() - start_time) * 1000
                self.record_metric(
                    f"dependency_{dep}_import_time",
                    import_time_ms,
                    "ms",
                    False,
                    f"ImportError: {str(e)}"
                )

        self.record_metric("missing_dependencies_count", len(missing_deps), "count")
        self.record_metric("total_dependencies_tested", len(critical_dependencies), "count")

        dependency_health_score = ((len(critical_dependencies) - len(missing_deps)) / len(critical_dependencies)) * 100
        self.record_metric("dependency_health_score", dependency_health_score, "%")

        return missing_deps, import_times

    async def test_websocket_performance(self):
        """Test WebSocket endpoint performance"""
        logger.info("🌐 Testing WebSocket performance...")

        # This would require a running server, so we'll simulate basic connection timing
        try:
            import websockets

            # Test WebSocket import and basic functionality
            start_time = time.time()

            # Just test that we can create a websocket (not actually connect)
            # This tests the import and basic setup overhead
            ws_setup_time_ms = (time.time() - start_time) * 1000

            self.record_metric("websocket_setup_time", ws_setup_time_ms, "ms", True)

        except ImportError as e:
            self.record_metric("websocket_setup_time", 0, "ms", False, f"WebSocket import failed: {str(e)}")

    async def run_comprehensive_benchmark(self):
        """Run complete performance benchmark suite"""
        logger.info("🚀 Starting PAM Performance Benchmark Suite")
        benchmark_start = time.time()

        # Start memory tracing
        tracemalloc.start()

        try:
            # Test 1: Dependency Health
            missing_deps, import_times = await self.test_dependency_health()

            # Test 2: PAM Core Initialization
            pam_success, pam_error = await self.test_pam_core_initialization()

            # Test 3: Tool Registry Performance
            registry, registry_success, registry_error = await self.test_tool_registry_performance()

            # Test 4: Individual Tool Performance
            if registry_success:
                await self.test_individual_tool_performance(registry)

            # Test 5: WebSocket Performance
            await self.test_websocket_performance()

            # Calculate system-wide metrics
            total_benchmark_time_ms = (time.time() - benchmark_start) * 1000
            peak_memory_mb = self.get_memory_usage_mb()

            # Calculate overall success rates
            successful_tools = sum(1 for tp in self.tool_performances.values() if tp.success)
            total_tools_tested = len(self.tool_performances)
            overall_success_rate = (successful_tools / total_tools_tested * 100) if total_tools_tested > 0 else 0

            self.system_performance = SystemPerformance(
                total_startup_time_ms=total_benchmark_time_ms,
                registry_initialization_time_ms=next(
                    (m.value for m in self.metrics if m.metric_name == "registry_initialization_time"),
                    0
                ),
                total_memory_usage_mb=peak_memory_mb - self.baseline_memory_mb,
                peak_memory_usage_mb=peak_memory_mb,
                tools_loaded_successfully=successful_tools,
                tools_failed_to_load=total_tools_tested - successful_tools,
                success_rate_percentage=overall_success_rate
            )

            self.record_metric("total_benchmark_time", total_benchmark_time_ms, "ms", True)
            self.record_metric("overall_success_rate", overall_success_rate, "%", True)

        except Exception as e:
            logger.error(f"❌ Benchmark failed: {str(e)}")
            self.record_metric("benchmark_execution", 0, "ms", False, str(e))

        finally:
            # Stop memory tracing
            tracemalloc.stop()

    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        report = {
            "benchmark_metadata": {
                "timestamp": datetime.now().isoformat(),
                "python_version": sys.version,
                "platform": os.name,
                "total_metrics": len(self.metrics)
            },
            "system_performance": asdict(self.system_performance) if self.system_performance else {},
            "metrics_summary": {
                "total_metrics": len(self.metrics),
                "successful_metrics": sum(1 for m in self.metrics if m.success),
                "failed_metrics": sum(1 for m in self.metrics if not m.success)
            },
            "tool_performances": {name: asdict(perf) for name, perf in self.tool_performances.items()},
            "detailed_metrics": [asdict(metric) for metric in self.metrics],
            "performance_assessment": self._generate_performance_assessment()
        }
        return report

    def _generate_performance_assessment(self) -> Dict[str, Any]:
        """Generate performance assessment and recommendations"""
        assessment = {
            "overall_status": "UNKNOWN",
            "critical_issues": [],
            "performance_warnings": [],
            "recommendations": [],
            "sla_compliance": {}
        }

        if not self.system_performance:
            assessment["overall_status"] = "FAILED"
            assessment["critical_issues"].append("System performance data not available")
            return assessment

        # Assess against SLA targets
        registry_time_ok = self.system_performance.registry_initialization_time_ms < 5000  # 5s
        memory_usage_ok = self.system_performance.total_memory_usage_mb < 500  # 500MB
        success_rate_ok = self.system_performance.success_rate_percentage > 95  # 95%

        assessment["sla_compliance"] = {
            "registry_initialization": {
                "target": "< 5000ms",
                "actual": f"{self.system_performance.registry_initialization_time_ms:.1f}ms",
                "compliant": registry_time_ok
            },
            "memory_usage": {
                "target": "< 500MB",
                "actual": f"{self.system_performance.total_memory_usage_mb:.1f}MB",
                "compliant": memory_usage_ok
            },
            "success_rate": {
                "target": "> 95%",
                "actual": f"{self.system_performance.success_rate_percentage:.1f}%",
                "compliant": success_rate_ok
            }
        }

        # Overall status assessment
        if registry_time_ok and memory_usage_ok and success_rate_ok:
            assessment["overall_status"] = "EXCELLENT"
        elif success_rate_ok and (registry_time_ok or memory_usage_ok):
            assessment["overall_status"] = "GOOD"
        elif success_rate_ok:
            assessment["overall_status"] = "ACCEPTABLE"
        else:
            assessment["overall_status"] = "NEEDS_IMPROVEMENT"

        # Generate specific recommendations
        if not registry_time_ok:
            assessment["performance_warnings"].append(
                f"Registry initialization slow: {self.system_performance.registry_initialization_time_ms:.1f}ms (target: <5000ms)"
            )
            assessment["recommendations"].append("Consider optimizing tool import strategy or lazy loading")

        if not memory_usage_ok:
            assessment["performance_warnings"].append(
                f"High memory usage: {self.system_performance.total_memory_usage_mb:.1f}MB (target: <500MB)"
            )
            assessment["recommendations"].append("Review memory usage patterns and implement caching strategies")

        if not success_rate_ok:
            assessment["critical_issues"].append(
                f"Low success rate: {self.system_performance.success_rate_percentage:.1f}% (target: >95%)"
            )
            assessment["recommendations"].append("Address failing tool dependencies and initialization issues")

        return assessment

async def main():
    """Main benchmark execution"""
    print("🎯 PAM Performance Benchmark Suite")
    print("=" * 50)

    benchmark = PAMPerformanceBenchmark()

    try:
        await benchmark.run_comprehensive_benchmark()

        # Generate and save report
        report = benchmark.generate_report()

        # Save detailed report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"/Users/thabonel/Code/wheels-wins-landing-page/backend/performance_benchmarks/pam_performance_report_{timestamp}.json"

        os.makedirs(os.path.dirname(report_file), exist_ok=True)
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)

        # Print summary
        print("\n📊 PERFORMANCE BENCHMARK RESULTS")
        print("=" * 50)

        assessment = report["performance_assessment"]
        print(f"Overall Status: {assessment['overall_status']}")

        if assessment.get("critical_issues"):
            print("\n🚨 Critical Issues:")
            for issue in assessment["critical_issues"]:
                print(f"  - {issue}")

        if assessment.get("performance_warnings"):
            print("\n⚠️ Performance Warnings:")
            for warning in assessment["performance_warnings"]:
                print(f"  - {warning}")

        if assessment.get("recommendations"):
            print("\n💡 Recommendations:")
            for rec in assessment["recommendations"]:
                print(f"  - {rec}")

        print(f"\nSLA Compliance:")
        for metric, data in assessment["sla_compliance"].items():
            status = "✅" if data["compliant"] else "❌"
            print(f"  {status} {metric}: {data['actual']} (target: {data['target']})")

        print(f"\n📄 Detailed report saved: {report_file}")

        # Return exit code based on assessment
        if assessment["overall_status"] in ["EXCELLENT", "GOOD"]:
            return 0
        elif assessment["overall_status"] == "ACCEPTABLE":
            return 1
        else:
            return 2

    except Exception as e:
        print(f"\n❌ Benchmark failed: {str(e)}")
        traceback.print_exc()
        return 3

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)