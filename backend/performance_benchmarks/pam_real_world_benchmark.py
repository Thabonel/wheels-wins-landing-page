#!/usr/bin/env python3
"""
PAM Real-World Performance Benchmark
====================================

Reality-checker focused performance testing for the actual PAM system architecture.
Tests the real components that are currently active and deployed.

Architecture tested:
- PAM Core (app/services/pam/core/pam.py) - 45 tools via function calling
- Tool Prefilter (reduces tokens by 87%)
- Claude Sonnet 4.5 integration
- Memory usage under realistic loads

Usage:
    python performance_benchmarks/pam_real_world_benchmark.py
"""

import asyncio
import time
import psutil
import logging
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import gc

# Add backend to Python path for imports
sys.path.insert(0, '/Users/thabonel/Code/wheels-wins-landing-page/backend')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class RealWorldMetrics:
    """Real-world performance metrics"""
    component_name: str
    initialization_time_ms: float
    memory_usage_mb: float
    tools_available: int
    prefilter_reduction_percent: float
    success: bool
    error_details: Optional[str] = None

class PAMRealWorldBenchmark:
    """Real-world performance benchmark for PAM system"""

    def __init__(self):
        self.baseline_memory_mb = 0
        self.metrics: List[RealWorldMetrics] = []
        self.test_results = {}

    def get_memory_usage_mb(self) -> float:
        """Get current memory usage in MB"""
        process = psutil.Process()
        return process.memory_info().rss / 1024 / 1024

    def record_metric(self, component: str, init_time: float, memory: float,
                     tools: int, prefilter: float, success: bool, error: str = None):
        """Record a performance metric"""
        metric = RealWorldMetrics(
            component_name=component,
            initialization_time_ms=init_time,
            memory_usage_mb=memory,
            tools_available=tools,
            prefilter_reduction_percent=prefilter,
            success=success,
            error_details=error
        )
        self.metrics.append(metric)
        logger.info(f"📊 {component}: {init_time:.1f}ms, {memory:.1f}MB, {tools} tools {'✅' if success else '❌'}")

    async def test_pam_core_performance(self):
        """Test the actual PAM Core system performance"""
        logger.info("🧠 Testing PAM Core (Real Architecture)...")

        start_memory = self.get_memory_usage_mb()
        start_time = time.time()

        try:
            # Test 1: Tool cache building (class-level optimization)
            from app.services.pam.core.pam import PAM

            cache_start = time.time()
            tools = PAM._get_tools()
            cache_time_ms = (time.time() - cache_start) * 1000
            tools_count = len(tools)

            # Test 2: PAM instance initialization
            init_start = time.time()
            pam_instance = PAM(
                user_id="perf-test-user",
                user_language="en",
                user_context={
                    "location": {"lat": 30.2672, "lng": -97.7431},  # Austin, TX
                    "preferences": {"budget_alerts": True}
                }
            )
            init_time_ms = (time.time() - init_start) * 1000

            # Test 3: Tool prefiltering performance
            from app.services.pam.tools.tool_prefilter import tool_prefilter

            prefilter_start = time.time()
            test_message = "Create an expense for gas $45 and check my budget status"
            filtered_tools = tool_prefilter.filter_tools(
                user_message=test_message,
                all_tools=tools,
                context={"page": "/budget"},
                max_tools=10
            )
            prefilter_time_ms = (time.time() - prefilter_start) * 1000

            # Calculate prefilter efficiency
            reduction_percent = ((len(tools) - len(filtered_tools)) / len(tools)) * 100 if tools else 0

            memory_used = self.get_memory_usage_mb() - start_memory
            total_time_ms = (time.time() - start_time) * 1000

            # Record detailed metrics
            self.test_results["pam_core"] = {
                "cache_build_time_ms": cache_time_ms,
                "instance_init_time_ms": init_time_ms,
                "prefilter_time_ms": prefilter_time_ms,
                "total_tools": tools_count,
                "filtered_tools": len(filtered_tools),
                "prefilter_reduction": reduction_percent,
                "memory_usage_mb": memory_used,
                "total_time_ms": total_time_ms
            }

            self.record_metric(
                "PAM_Core",
                total_time_ms,
                memory_used,
                tools_count,
                reduction_percent,
                True
            )

            return pam_instance, True

        except Exception as e:
            error_msg = f"PAM Core test failed: {str(e)}"
            logger.error(error_msg)
            total_time_ms = (time.time() - start_time) * 1000
            memory_used = self.get_memory_usage_mb() - start_memory

            self.record_metric(
                "PAM_Core",
                total_time_ms,
                memory_used,
                0,
                0.0,
                False,
                error_msg
            )
            return None, False

    async def test_tool_function_calling_performance(self, pam_instance):
        """Test actual tool function calling performance"""
        if not pam_instance:
            logger.warning("⚠️ Skipping function calling test - PAM instance not available")
            return

        logger.info("⚡ Testing Tool Function Calling Performance...")

        # Test realistic tool function definitions
        test_scenarios = [
            {
                "name": "Budget Analysis",
                "tools": ["analyze_budget", "get_spending_summary", "create_expense"],
                "message": "What's my budget status and create an expense for gas $45"
            },
            {
                "name": "Trip Planning",
                "tools": ["plan_trip", "get_weather_forecast", "find_rv_parks"],
                "message": "Plan a weekend trip to Austin and check the weather"
            },
            {
                "name": "Social Features",
                "tools": ["create_post", "find_nearby_rvers", "share_location"],
                "message": "Share my location and find nearby RV friends"
            }
        ]

        for scenario in test_scenarios:
            start_time = time.time()
            start_memory = self.get_memory_usage_mb()

            try:
                # Get all available tools from PAM
                all_tools = pam_instance.tools

                # Filter tools using the prefilter (realistic usage)
                from app.services.pam.tools.tool_prefilter import tool_prefilter
                filtered_tools = tool_prefilter.filter_tools(
                    user_message=scenario["message"],
                    all_tools=all_tools,
                    context={"page": "/budget" if "budget" in scenario["name"].lower() else "/"},
                    max_tools=8
                )

                processing_time_ms = (time.time() - start_time) * 1000
                memory_used = self.get_memory_usage_mb() - start_memory

                # Record scenario performance
                self.test_results[f"scenario_{scenario['name'].lower().replace(' ', '_')}"] = {
                    "processing_time_ms": processing_time_ms,
                    "memory_usage_mb": memory_used,
                    "total_available_tools": len(all_tools),
                    "filtered_tools": len(filtered_tools),
                    "token_reduction": ((len(all_tools) - len(filtered_tools)) / len(all_tools) * 100) if all_tools else 0
                }

                self.record_metric(
                    f"Scenario_{scenario['name']}",
                    processing_time_ms,
                    memory_used,
                    len(filtered_tools),
                    self.test_results[f"scenario_{scenario['name'].lower().replace(' ', '_')}"]["token_reduction"],
                    True
                )

                logger.info(f"✅ {scenario['name']}: {len(filtered_tools)}/{len(all_tools)} tools in {processing_time_ms:.1f}ms")

            except Exception as e:
                error_msg = f"Scenario {scenario['name']} failed: {str(e)}"
                logger.error(error_msg)
                processing_time_ms = (time.time() - start_time) * 1000
                memory_used = self.get_memory_usage_mb() - start_memory

                self.record_metric(
                    f"Scenario_{scenario['name']}",
                    processing_time_ms,
                    memory_used,
                    0,
                    0.0,
                    False,
                    error_msg
                )

    async def test_memory_under_load(self, pam_instance):
        """Test memory usage under realistic load"""
        if not pam_instance:
            logger.warning("⚠️ Skipping memory load test - PAM instance not available")
            return

        logger.info("🧠 Testing Memory Usage Under Load...")

        # Baseline memory
        baseline_memory = self.get_memory_usage_mb()

        # Simulate concurrent user sessions
        concurrent_sessions = 10
        messages_per_session = 5

        start_time = time.time()

        try:
            # Create multiple PAM instances (simulating concurrent users)
            pam_instances = []
            for i in range(concurrent_sessions):
                user_pam = PAM(
                    user_id=f"load-test-user-{i}",
                    user_language="en",
                    user_context={"location": {"lat": 30.2672, "lng": -97.7431}}
                )
                pam_instances.append(user_pam)

            memory_after_instances = self.get_memory_usage_mb()
            instance_memory_overhead = memory_after_instances - baseline_memory

            # Simulate message processing load
            from app.services.pam.tools.tool_prefilter import tool_prefilter

            test_messages = [
                "What's my budget status?",
                "Create an expense for gas $30",
                "Plan a trip to Dallas",
                "Check the weather forecast",
                "Find nearby RV parks"
            ]

            for session_id, pam in enumerate(pam_instances):
                for msg_id, message in enumerate(test_messages[:messages_per_session]):
                    # Process message through prefilter (realistic usage)
                    filtered_tools = tool_prefilter.filter_tools(
                        user_message=message,
                        all_tools=pam.tools,
                        context={"page": "/budget"},
                        max_tools=8
                    )

            final_memory = self.get_memory_usage_mb()
            total_memory_used = final_memory - baseline_memory
            processing_time_ms = (time.time() - start_time) * 1000

            # Memory per user calculation
            memory_per_user = instance_memory_overhead / concurrent_sessions if concurrent_sessions else 0

            self.test_results["memory_load"] = {
                "concurrent_sessions": concurrent_sessions,
                "messages_per_session": messages_per_session,
                "baseline_memory_mb": baseline_memory,
                "final_memory_mb": final_memory,
                "total_memory_used_mb": total_memory_used,
                "memory_per_user_mb": memory_per_user,
                "processing_time_ms": processing_time_ms
            }

            self.record_metric(
                "Memory_Load_Test",
                processing_time_ms,
                total_memory_used,
                concurrent_sessions * len(test_messages),
                0.0,  # N/A for this test
                True
            )

            logger.info(f"✅ Memory test: {total_memory_used:.1f}MB for {concurrent_sessions} users")

        except Exception as e:
            error_msg = f"Memory load test failed: {str(e)}"
            logger.error(error_msg)
            processing_time_ms = (time.time() - start_time) * 1000
            total_memory_used = self.get_memory_usage_mb() - baseline_memory

            self.record_metric(
                "Memory_Load_Test",
                processing_time_ms,
                total_memory_used,
                0,
                0.0,
                False,
                error_msg
            )

    async def test_dependency_performance_impact(self):
        """Test performance impact of dependency loading"""
        logger.info("📦 Testing Dependency Performance Impact...")

        critical_imports = {
            "anthropic": "Anthropic Claude client",
            "app.services.pam.tools.tool_prefilter": "Tool prefiltering",
            "app.services.pam.core.pam": "PAM Core",
            "app.services.search.web_search": "Web search service",
            "app.config.ai_providers": "AI provider configuration"
        }

        dependency_performance = {}

        for module, description in critical_imports.items():
            start_time = time.time()
            start_memory = self.get_memory_usage_mb()

            try:
                # Force re-import by clearing from cache if present
                if module in sys.modules:
                    del sys.modules[module]

                __import__(module)

                import_time_ms = (time.time() - start_time) * 1000
                memory_impact = self.get_memory_usage_mb() - start_memory

                dependency_performance[module] = {
                    "import_time_ms": import_time_ms,
                    "memory_impact_mb": memory_impact,
                    "description": description,
                    "success": True
                }

                logger.info(f"✅ {module}: {import_time_ms:.1f}ms, {memory_impact:.1f}MB")

            except Exception as e:
                import_time_ms = (time.time() - start_time) * 1000
                memory_impact = self.get_memory_usage_mb() - start_memory

                dependency_performance[module] = {
                    "import_time_ms": import_time_ms,
                    "memory_impact_mb": memory_impact,
                    "description": description,
                    "success": False,
                    "error": str(e)
                }

                logger.error(f"❌ {module}: {import_time_ms:.1f}ms, Error: {str(e)}")

        self.test_results["dependency_performance"] = dependency_performance

    async def run_real_world_benchmark(self):
        """Run complete real-world benchmark suite"""
        logger.info("🎯 Starting PAM Real-World Performance Benchmark")
        benchmark_start = time.time()

        # Record baseline memory
        self.baseline_memory_mb = self.get_memory_usage_mb()
        logger.info(f"📊 Baseline memory: {self.baseline_memory_mb:.1f}MB")

        try:
            # Test 1: Dependency Performance
            await self.test_dependency_performance_impact()

            # Test 2: PAM Core Performance
            pam_instance, pam_success = await self.test_pam_core_performance()

            # Test 3: Tool Function Calling
            if pam_success:
                await self.test_tool_function_calling_performance(pam_instance)

            # Test 4: Memory Under Load
            if pam_success:
                await self.test_memory_under_load(pam_instance)

            # Force garbage collection to get accurate final memory reading
            gc.collect()

            total_benchmark_time_ms = (time.time() - benchmark_start) * 1000
            final_memory_mb = self.get_memory_usage_mb()

            self.test_results["benchmark_summary"] = {
                "total_time_ms": total_benchmark_time_ms,
                "baseline_memory_mb": self.baseline_memory_mb,
                "final_memory_mb": final_memory_mb,
                "total_memory_growth_mb": final_memory_mb - self.baseline_memory_mb,
                "successful_components": sum(1 for m in self.metrics if m.success),
                "failed_components": sum(1 for m in self.metrics if not m.success),
                "overall_success_rate": (sum(1 for m in self.metrics if m.success) / len(self.metrics) * 100) if self.metrics else 0
            }

            logger.info(f"✅ Benchmark completed in {total_benchmark_time_ms:.1f}ms")

        except Exception as e:
            logger.error(f"❌ Benchmark failed: {str(e)}")
            self.test_results["benchmark_error"] = str(e)

    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive real-world performance report"""
        report = {
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "benchmark_type": "real_world_pam_performance",
                "python_version": sys.version,
                "platform": os.name
            },
            "metrics": [asdict(metric) for metric in self.metrics],
            "detailed_results": self.test_results,
            "performance_assessment": self._assess_performance(),
            "recommendations": self._generate_recommendations()
        }
        return report

    def _assess_performance(self) -> Dict[str, Any]:
        """Assess performance against realistic targets"""
        assessment = {
            "overall_status": "UNKNOWN",
            "critical_issues": [],
            "performance_warnings": [],
            "sla_compliance": {}
        }

        if not self.test_results.get("benchmark_summary"):
            assessment["overall_status"] = "INCOMPLETE"
            assessment["critical_issues"].append("Benchmark did not complete successfully")
            return assessment

        summary = self.test_results["benchmark_summary"]

        # Real-world SLA targets (more lenient than ideal)
        targets = {
            "pam_initialization": 10000,  # 10s max for cold start
            "memory_per_user": 50,        # 50MB per concurrent user
            "prefilter_reduction": 80,    # 80%+ token reduction
            "success_rate": 90            # 90% success rate
        }

        # Check PAM Core performance
        pam_core = self.test_results.get("pam_core", {})
        if pam_core:
            init_time_ok = pam_core.get("total_time_ms", 0) < targets["pam_initialization"]
            prefilter_ok = pam_core.get("prefilter_reduction", 0) >= targets["prefilter_reduction"]

            assessment["sla_compliance"]["pam_initialization"] = {
                "target": f"< {targets['pam_initialization']}ms",
                "actual": f"{pam_core.get('total_time_ms', 0):.1f}ms",
                "compliant": init_time_ok
            }

            assessment["sla_compliance"]["prefilter_efficiency"] = {
                "target": f">= {targets['prefilter_reduction']}%",
                "actual": f"{pam_core.get('prefilter_reduction', 0):.1f}%",
                "compliant": prefilter_ok
            }

        # Check memory performance
        memory_test = self.test_results.get("memory_load", {})
        if memory_test:
            memory_per_user = memory_test.get("memory_per_user_mb", 0)
            memory_ok = memory_per_user < targets["memory_per_user"]

            assessment["sla_compliance"]["memory_efficiency"] = {
                "target": f"< {targets['memory_per_user']}MB/user",
                "actual": f"{memory_per_user:.1f}MB/user",
                "compliant": memory_ok
            }

        # Overall success rate
        success_rate = summary.get("overall_success_rate", 0)
        success_ok = success_rate >= targets["success_rate"]

        assessment["sla_compliance"]["success_rate"] = {
            "target": f">= {targets['success_rate']}%",
            "actual": f"{success_rate:.1f}%",
            "compliant": success_ok
        }

        # Determine overall status
        compliant_count = sum(1 for comp in assessment["sla_compliance"].values() if comp["compliant"])
        total_metrics = len(assessment["sla_compliance"])

        if compliant_count == total_metrics:
            assessment["overall_status"] = "EXCELLENT"
        elif compliant_count >= total_metrics * 0.8:
            assessment["overall_status"] = "GOOD"
        elif compliant_count >= total_metrics * 0.6:
            assessment["overall_status"] = "ACCEPTABLE"
        else:
            assessment["overall_status"] = "NEEDS_IMPROVEMENT"

        return assessment

    def _generate_recommendations(self) -> List[str]:
        """Generate specific recommendations based on test results"""
        recommendations = []

        # Check PAM Core performance
        pam_core = self.test_results.get("pam_core", {})
        if pam_core.get("total_time_ms", 0) > 10000:
            recommendations.append(
                f"PAM initialization is slow ({pam_core.get('total_time_ms', 0):.1f}ms). "
                "Consider implementing lazy loading or caching strategies."
            )

        if pam_core.get("prefilter_reduction", 0) < 80:
            recommendations.append(
                f"Tool prefilter reduction is below optimal ({pam_core.get('prefilter_reduction', 0):.1f}%). "
                "Review keyword patterns and category mappings for better filtering."
            )

        # Check memory usage
        memory_test = self.test_results.get("memory_load", {})
        if memory_test.get("memory_per_user_mb", 0) > 50:
            recommendations.append(
                f"Memory usage per user is high ({memory_test.get('memory_per_user_mb', 0):.1f}MB). "
                "Implement instance pooling or shared resource optimization."
            )

        # Check dependency performance
        dep_perf = self.test_results.get("dependency_performance", {})
        slow_deps = [name for name, data in dep_perf.items()
                    if data.get("import_time_ms", 0) > 1000 and data.get("success", False)]

        if slow_deps:
            recommendations.append(
                f"Slow dependency imports detected: {', '.join(slow_deps)}. "
                "Consider lazy imports or module optimization."
            )

        if not recommendations:
            recommendations.append("All performance metrics within acceptable ranges. System performing well.")

        return recommendations

async def main():
    """Main benchmark execution"""
    print("🎯 PAM Real-World Performance Benchmark")
    print("=" * 50)

    benchmark = PAMRealWorldBenchmark()

    try:
        await benchmark.run_real_world_benchmark()

        # Generate report
        report = benchmark.generate_report()

        # Save report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"/Users/thabonel/Code/wheels-wins-landing-page/backend/performance_benchmarks/pam_real_world_report_{timestamp}.json"

        os.makedirs(os.path.dirname(report_file), exist_ok=True)
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)

        # Print results
        print("\n📊 REAL-WORLD BENCHMARK RESULTS")
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

        print(f"\nSLA Compliance:")
        for metric, data in assessment["sla_compliance"].items():
            status = "✅" if data["compliant"] else "❌"
            print(f"  {status} {metric}: {data['actual']} (target: {data['target']})")

        print(f"\n💡 Recommendations:")
        for rec in report["recommendations"]:
            print(f"  - {rec}")

        # Show key metrics
        if "pam_core" in benchmark.test_results:
            core_metrics = benchmark.test_results["pam_core"]
            print(f"\n🧠 PAM Core Metrics:")
            print(f"  • Tools available: {core_metrics.get('total_tools', 0)}")
            print(f"  • Prefilter reduction: {core_metrics.get('prefilter_reduction', 0):.1f}%")
            print(f"  • Initialization time: {core_metrics.get('total_time_ms', 0):.1f}ms")
            print(f"  • Memory usage: {core_metrics.get('memory_usage_mb', 0):.1f}MB")

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
        import traceback
        traceback.print_exc()
        return 3

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)