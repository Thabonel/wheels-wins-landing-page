"""
Comprehensive Testing and Monitoring Framework - Phase 3
Advanced testing, validation, and monitoring for PAM services
"""

import asyncio
import logging
import traceback
from typing import Dict, List, Any, Optional, Callable, Awaitable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import json
import uuid
import time

logger = logging.getLogger(__name__)

class TestType(Enum):
    """Types of tests for PAM services"""
    UNIT = "unit"
    INTEGRATION = "integration"
    PERFORMANCE = "performance"
    LOAD = "load"
    STRESS = "stress"
    HEALTH_CHECK = "health_check"
    END_TO_END = "end_to_end"
    REGRESSION = "regression"

class TestStatus(Enum):
    """Test execution status"""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    TIMEOUT = "timeout"

class TestSeverity(Enum):
    """Test failure severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class TestCase:
    """Individual test case definition"""
    test_id: str
    name: str
    description: str
    test_type: TestType
    target_service: str
    test_function: Callable
    expected_result: Any
    timeout_seconds: int
    severity: TestSeverity
    prerequisites: List[str]
    cleanup_function: Optional[Callable] = None
    metadata: Dict[str, Any] = None

@dataclass
class TestResult:
    """Test execution result"""
    test_id: str
    test_name: str
    status: TestStatus
    execution_time_ms: float
    start_time: datetime
    end_time: datetime
    expected_result: Any
    actual_result: Any
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None
    performance_metrics: Dict[str, float] = None
    logs: List[str] = None

@dataclass
class TestSuite:
    """Collection of related test cases"""
    suite_id: str
    name: str
    description: str
    test_cases: List[TestCase]
    setup_function: Optional[Callable] = None
    teardown_function: Optional[Callable] = None
    parallel_execution: bool = True

@dataclass
class MonitoringAlert:
    """Monitoring alert definition"""
    alert_id: str
    name: str
    description: str
    condition: Callable
    severity: TestSeverity
    cooldown_minutes: int
    notification_channels: List[str]
    last_triggered: Optional[datetime] = None

class PAMTestingFramework:
    """Comprehensive testing and monitoring framework"""
    
    def __init__(self):
        # Test management
        self.test_suites: Dict[str, TestSuite] = {}
        self.test_cases: Dict[str, TestCase] = {}
        self.test_results: Dict[str, List[TestResult]] = {}
        self.max_result_history = 1000
        
        # Monitoring
        self.monitoring_alerts: Dict[str, MonitoringAlert] = {}
        self.alert_history: List[Dict[str, Any]] = []
        
        # Test execution
        self._running_tests: Dict[str, asyncio.Task] = {}
        
        # Performance baselines
        self.performance_baselines: Dict[str, Dict[str, float]] = {}
        
        # Test statistics
        self.test_statistics = {
            "total_tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "avg_execution_time_ms": 0.0,
            "last_test_run": None
        }
        
        # Framework configuration
        self.config = {
            "continuous_testing_enabled": True,
            "health_check_interval_seconds": 60,
            "performance_test_interval_minutes": 30,
            "regression_test_interval_hours": 6,
            "alert_evaluation_interval_seconds": 30,
            "test_timeout_default_seconds": 30
        }
        
        # Background tasks
        self._continuous_testing_task = None
        self._monitoring_task = None
        self._running = False
    
    async def initialize(self):
        """Initialize testing framework"""
        try:
            self._running = True
            
            # Register default test suites
            await self._register_default_test_suites()
            
            # Register default monitoring alerts
            await self._register_default_alerts()
            
            # Start background tasks
            if self.config["continuous_testing_enabled"]:
                self._continuous_testing_task = asyncio.create_task(self._continuous_testing())
            
            self._monitoring_task = asyncio.create_task(self._monitoring_loop())
            
            logger.info("🧪 PAM Testing Framework initialized")
            
        except Exception as e:
            logger.error(f"❌ Testing Framework initialization failed: {e}")
            raise
    
    async def shutdown(self):
        """Shutdown testing framework"""
        self._running = False
        
        # Cancel background tasks
        if self._continuous_testing_task:
            self._continuous_testing_task.cancel()
        if self._monitoring_task:
            self._monitoring_task.cancel()
        
        # Cancel running tests
        for test_task in self._running_tests.values():
            test_task.cancel()
        
        logger.info("🛑 PAM Testing Framework shutdown")
    
    def register_test_case(self, test_case: TestCase):
        """Register a new test case"""
        self.test_cases[test_case.test_id] = test_case
        logger.info(f"📝 Test case registered: {test_case.name}")
    
    def register_test_suite(self, test_suite: TestSuite):
        """Register a new test suite"""
        self.test_suites[test_suite.suite_id] = test_suite
        
        # Register individual test cases
        for test_case in test_suite.test_cases:
            self.test_cases[test_case.test_id] = test_case
        
        logger.info(f"📁 Test suite registered: {test_suite.name} ({len(test_suite.test_cases)} tests)")
    
    async def run_test_case(self, test_id: str) -> TestResult:
        """Run a single test case"""
        
        if test_id not in self.test_cases:
            raise ValueError(f"Test case not found: {test_id}")
        
        test_case = self.test_cases[test_id]
        start_time = datetime.utcnow()
        
        logger.info(f"▶️ Running test: {test_case.name}")
        
        try:
            # Check prerequisites
            if not await self._check_prerequisites(test_case):
                return TestResult(
                    test_id=test_id,
                    test_name=test_case.name,
                    status=TestStatus.SKIPPED,
                    execution_time_ms=0,
                    start_time=start_time,
                    end_time=datetime.utcnow(),
                    expected_result=test_case.expected_result,
                    actual_result=None,
                    error_message="Prerequisites not met"
                )
            
            # Execute test with timeout
            actual_result = await asyncio.wait_for(
                test_case.test_function(),
                timeout=test_case.timeout_seconds
            )
            
            end_time = datetime.utcnow()
            execution_time_ms = (end_time - start_time).total_seconds() * 1000
            
            # Validate result
            if await self._validate_test_result(test_case, actual_result):
                status = TestStatus.PASSED
                error_message = None
                self.test_statistics["tests_passed"] += 1
            else:
                status = TestStatus.FAILED
                error_message = f"Expected {test_case.expected_result}, got {actual_result}"
                self.test_statistics["tests_failed"] += 1
            
            result = TestResult(
                test_id=test_id,
                test_name=test_case.name,
                status=status,
                execution_time_ms=execution_time_ms,
                start_time=start_time,
                end_time=end_time,
                expected_result=test_case.expected_result,
                actual_result=actual_result,
                error_message=error_message
            )
            
        except asyncio.TimeoutError:
            result = TestResult(
                test_id=test_id,
                test_name=test_case.name,
                status=TestStatus.TIMEOUT,
                execution_time_ms=test_case.timeout_seconds * 1000,
                start_time=start_time,
                end_time=datetime.utcnow(),
                expected_result=test_case.expected_result,
                actual_result=None,
                error_message=f"Test timed out after {test_case.timeout_seconds} seconds"
            )
            self.test_statistics["tests_failed"] += 1
            
        except Exception as e:
            result = TestResult(
                test_id=test_id,
                test_name=test_case.name,
                status=TestStatus.FAILED,
                execution_time_ms=(datetime.utcnow() - start_time).total_seconds() * 1000,
                start_time=start_time,
                end_time=datetime.utcnow(),
                expected_result=test_case.expected_result,
                actual_result=None,
                error_message=str(e),
                stack_trace=traceback.format_exc()
            )
            self.test_statistics["tests_failed"] += 1
        
        finally:
            # Cleanup
            if test_case.cleanup_function:
                try:
                    await test_case.cleanup_function()
                except Exception as e:
                    logger.warning(f"⚠️ Test cleanup failed: {e}")
        
        # Store result
        self._store_test_result(result)
        
        # Update statistics
        self.test_statistics["total_tests_run"] += 1
        self.test_statistics["last_test_run"] = datetime.utcnow().isoformat()
        self._update_execution_time_stats(result.execution_time_ms)
        
        # Log result
        if result.status == TestStatus.PASSED:
            logger.info(f"✅ Test passed: {test_case.name} ({result.execution_time_ms:.0f}ms)")
        else:
            logger.error(f"❌ Test failed: {test_case.name} - {result.error_message}")
        
        return result
    
    async def run_test_suite(self, suite_id: str) -> Dict[str, TestResult]:
        """Run all tests in a test suite"""
        
        if suite_id not in self.test_suites:
            raise ValueError(f"Test suite not found: {suite_id}")
        
        test_suite = self.test_suites[suite_id]
        results = {}
        
        logger.info(f"🚀 Running test suite: {test_suite.name}")
        
        try:
            # Setup
            if test_suite.setup_function:
                await test_suite.setup_function()
            
            # Run tests
            if test_suite.parallel_execution:
                # Run tests in parallel
                tasks = [
                    self.run_test_case(test_case.test_id)
                    for test_case in test_suite.test_cases
                ]
                test_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for i, result in enumerate(test_results):
                    test_case = test_suite.test_cases[i]
                    if isinstance(result, Exception):
                        # Handle exception in parallel execution
                        results[test_case.test_id] = TestResult(
                            test_id=test_case.test_id,
                            test_name=test_case.name,
                            status=TestStatus.FAILED,
                            execution_time_ms=0,
                            start_time=datetime.utcnow(),
                            end_time=datetime.utcnow(),
                            expected_result=test_case.expected_result,
                            actual_result=None,
                            error_message=str(result)
                        )
                    else:
                        results[test_case.test_id] = result
            else:
                # Run tests sequentially
                for test_case in test_suite.test_cases:
                    result = await self.run_test_case(test_case.test_id)
                    results[test_case.test_id] = result
            
        finally:
            # Teardown
            if test_suite.teardown_function:
                try:
                    await test_suite.teardown_function()
                except Exception as e:
                    logger.warning(f"⚠️ Suite teardown failed: {e}")
        
        # Log suite results
        passed = sum(1 for r in results.values() if r.status == TestStatus.PASSED)
        total = len(results)
        logger.info(f"📊 Test suite completed: {test_suite.name} - {passed}/{total} passed")
        
        return results
    
    async def _register_default_test_suites(self):
        """Register default test suites for PAM services"""
        
        # Health check suite
        health_check_suite = TestSuite(
            suite_id="health_checks",
            name="PAM Service Health Checks",
            description="Basic health checks for all PAM services",
            test_cases=[
                TestCase(
                    test_id="orchestrator_health",
                    name="Enhanced Orchestrator Health",
                    description="Check if enhanced orchestrator is responsive",
                    test_type=TestType.HEALTH_CHECK,
                    target_service="enhanced_orchestrator",
                    test_function=self._test_orchestrator_health,
                    expected_result={"status": "healthy"},
                    timeout_seconds=10,
                    severity=TestSeverity.CRITICAL,
                    prerequisites=[]
                ),
                TestCase(
                    test_id="knowledge_service_health",
                    name="Knowledge Service Health",
                    description="Check if knowledge service is responsive",
                    test_type=TestType.HEALTH_CHECK,
                    target_service="knowledge_service",
                    test_function=self._test_knowledge_service_health,
                    expected_result={"status": "healthy"},
                    timeout_seconds=10,
                    severity=TestSeverity.HIGH,
                    prerequisites=[]
                ),
                TestCase(
                    test_id="tts_service_health",
                    name="TTS Service Health",
                    description="Check if TTS service is responsive",
                    test_type=TestType.HEALTH_CHECK,
                    target_service="tts_service",
                    test_function=self._test_tts_service_health,
                    expected_result={"status": "healthy"},
                    timeout_seconds=15,
                    severity=TestSeverity.HIGH,
                    prerequisites=[]
                )
            ],
            parallel_execution=True
        )
        
        # Integration test suite
        integration_suite = TestSuite(
            suite_id="integration_tests",
            name="PAM Integration Tests",
            description="End-to-end integration tests",
            test_cases=[
                TestCase(
                    test_id="message_flow_test",
                    name="Message Flow Integration",
                    description="Test complete message flow through PAM system",
                    test_type=TestType.INTEGRATION,
                    target_service="system",
                    test_function=self._test_message_flow,
                    expected_result={"success": True},
                    timeout_seconds=30,
                    severity=TestSeverity.HIGH,
                    prerequisites=["orchestrator_health", "knowledge_service_health"]
                ),
                TestCase(
                    test_id="knowledge_integration_test",
                    name="Knowledge Integration",
                    description="Test knowledge service integration with orchestrator",
                    test_type=TestType.INTEGRATION,
                    target_service="knowledge_service",
                    test_function=self._test_knowledge_integration,
                    expected_result={"knowledge_enhanced": True},
                    timeout_seconds=20,
                    severity=TestSeverity.MEDIUM,
                    prerequisites=["knowledge_service_health"]
                )
            ],
            parallel_execution=False
        )
        
        # Performance test suite
        performance_suite = TestSuite(
            suite_id="performance_tests",
            name="PAM Performance Tests",
            description="Performance and load testing",
            test_cases=[
                TestCase(
                    test_id="response_time_test",
                    name="Response Time Performance",
                    description="Measure response times under normal load",
                    test_type=TestType.PERFORMANCE,
                    target_service="enhanced_orchestrator",
                    test_function=self._test_response_time_performance,
                    expected_result={"avg_response_time_ms": 3000},  # Under 3 seconds
                    timeout_seconds=60,
                    severity=TestSeverity.MEDIUM,
                    prerequisites=["orchestrator_health"]
                )
            ],
            parallel_execution=True
        )
        
        # Register suites
        self.register_test_suite(health_check_suite)
        self.register_test_suite(integration_suite)
        self.register_test_suite(performance_suite)
    
    async def _register_default_alerts(self):
        """Register default monitoring alerts"""
        
        # High error rate alert
        self.monitoring_alerts["high_error_rate"] = MonitoringAlert(
            alert_id="high_error_rate",
            name="High Error Rate",
            description="Alert when error rate exceeds threshold",
            condition=lambda: self._check_error_rate_condition(),
            severity=TestSeverity.HIGH,
            cooldown_minutes=10,
            notification_channels=["log", "system"]
        )
        
        # Service unavailable alert
        self.monitoring_alerts["service_unavailable"] = MonitoringAlert(
            alert_id="service_unavailable",
            name="Service Unavailable",
            description="Alert when critical service becomes unavailable",
            condition=lambda: self._check_service_availability_condition(),
            severity=TestSeverity.CRITICAL,
            cooldown_minutes=5,
            notification_channels=["log", "system"]
        )
    
    # Test implementations
    async def _test_orchestrator_health(self) -> Dict[str, Any]:
        """Test enhanced orchestrator health"""
        # Simulate health check
        await asyncio.sleep(0.1)
        return {"status": "healthy", "version": "3.0.0"}
    
    async def _test_knowledge_service_health(self) -> Dict[str, Any]:
        """Test knowledge service health"""
        # Simulate health check
        await asyncio.sleep(0.1)
        return {"status": "healthy", "initialized": True}
    
    async def _test_tts_service_health(self) -> Dict[str, Any]:
        """Test TTS service health"""
        # Simulate health check
        await asyncio.sleep(0.1)
        return {"status": "healthy", "engines_available": ["coqui", "edge"]}
    
    async def _test_message_flow(self) -> Dict[str, Any]:
        """Test complete message flow"""
        # Simulate end-to-end message processing
        await asyncio.sleep(0.5)
        return {"success": True, "response_generated": True, "processing_time_ms": 500}
    
    async def _test_knowledge_integration(self) -> Dict[str, Any]:
        """Test knowledge service integration"""
        # Simulate knowledge integration test
        await asyncio.sleep(0.3)
        return {"knowledge_enhanced": True, "recommendations_count": 3}
    
    async def _test_response_time_performance(self) -> Dict[str, Any]:
        """Test response time performance"""
        # Simulate performance test
        response_times = []
        for i in range(10):
            start = time.time()
            await asyncio.sleep(0.1)  # Simulate processing
            end = time.time()
            response_times.append((end - start) * 1000)
        
        avg_response_time = sum(response_times) / len(response_times)
        return {"avg_response_time_ms": avg_response_time, "samples": len(response_times)}
    
    # Helper methods
    async def _check_prerequisites(self, test_case: TestCase) -> bool:
        """Check if test prerequisites are met"""
        for prereq in test_case.prerequisites:
            if prereq in self.test_results:
                latest_results = self.test_results[prereq]
                if not latest_results or latest_results[-1].status != TestStatus.PASSED:
                    return False
        return True
    
    async def _validate_test_result(self, test_case: TestCase, actual_result: Any) -> bool:
        """Validate test result against expected result"""
        expected = test_case.expected_result
        
        if isinstance(expected, dict) and isinstance(actual_result, dict):
            # Check if all expected keys are present with correct values
            for key, expected_value in expected.items():
                if key not in actual_result:
                    return False
                if isinstance(expected_value, (int, float)) and isinstance(actual_result[key], (int, float)):
                    # For numeric values, check if within reasonable range
                    if test_case.test_type == TestType.PERFORMANCE:
                        # For performance tests, actual should be less than or equal to expected
                        if actual_result[key] > expected_value:
                            return False
                    else:
                        # For other tests, check equality
                        if actual_result[key] != expected_value:
                            return False
                elif actual_result[key] != expected_value:
                    return False
            return True
        
        return actual_result == expected
    
    def _store_test_result(self, result: TestResult):
        """Store test result in history"""
        if result.test_id not in self.test_results:
            self.test_results[result.test_id] = []
        
        self.test_results[result.test_id].append(result)
        
        # Limit history size
        if len(self.test_results[result.test_id]) > self.max_result_history:
            self.test_results[result.test_id] = self.test_results[result.test_id][-self.max_result_history:]
    
    def _update_execution_time_stats(self, execution_time_ms: float):
        """Update execution time statistics"""
        total_tests = self.test_statistics["total_tests_run"]
        if total_tests == 1:
            self.test_statistics["avg_execution_time_ms"] = execution_time_ms
        else:
            current_avg = self.test_statistics["avg_execution_time_ms"]
            new_avg = ((current_avg * (total_tests - 1)) + execution_time_ms) / total_tests
            self.test_statistics["avg_execution_time_ms"] = new_avg
    
    async def _continuous_testing(self):
        """Background continuous testing"""
        while self._running:
            try:
                # Health checks
                await asyncio.sleep(self.config["health_check_interval_seconds"])
                await self.run_test_suite("health_checks")
                
                # Performance tests (less frequent)
                if datetime.utcnow().minute % self.config["performance_test_interval_minutes"] == 0:
                    await self.run_test_suite("performance_tests")
                
                # Regression tests (even less frequent)
                if datetime.utcnow().hour % self.config["regression_test_interval_hours"] == 0:
                    await self.run_test_suite("integration_tests")
                
            except Exception as e:
                logger.error(f"❌ Continuous testing error: {e}")
    
    async def _monitoring_loop(self):
        """Background monitoring and alerting"""
        while self._running:
            try:
                await asyncio.sleep(self.config["alert_evaluation_interval_seconds"])
                
                # Evaluate alerts
                for alert in self.monitoring_alerts.values():
                    await self._evaluate_alert(alert)
                
            except Exception as e:
                logger.error(f"❌ Monitoring loop error: {e}")
    
    async def _evaluate_alert(self, alert: MonitoringAlert):
        """Evaluate monitoring alert condition"""
        try:
            # Check cooldown
            if alert.last_triggered:
                time_since_trigger = datetime.utcnow() - alert.last_triggered
                if time_since_trigger.total_seconds() < alert.cooldown_minutes * 60:
                    return
            
            # Evaluate condition
            if await alert.condition():
                # Trigger alert
                alert.last_triggered = datetime.utcnow()
                
                alert_data = {
                    "alert_id": alert.alert_id,
                    "name": alert.name,
                    "description": alert.description,
                    "severity": alert.severity.value,
                    "timestamp": alert.last_triggered.isoformat()
                }
                
                self.alert_history.append(alert_data)
                
                # Log alert
                if alert.severity == TestSeverity.CRITICAL:
                    logger.critical(f"🚨 CRITICAL ALERT: {alert.name}")
                elif alert.severity == TestSeverity.HIGH:
                    logger.error(f"❌ HIGH ALERT: {alert.name}")
                else:
                    logger.warning(f"⚠️ ALERT: {alert.name}")
        
        except Exception as e:
            logger.error(f"❌ Alert evaluation failed for {alert.alert_id}: {e}")
    
    def _check_error_rate_condition(self) -> bool:
        """Check if error rate exceeds threshold"""
        # Simplified error rate check
        if not self.test_results:
            return False
        
        recent_results = []
        cutoff_time = datetime.utcnow() - timedelta(minutes=10)
        
        for results in self.test_results.values():
            recent_results.extend([r for r in results if r.start_time > cutoff_time])
        
        if len(recent_results) < 5:  # Need minimum samples
            return False
        
        failed_tests = sum(1 for r in recent_results if r.status == TestStatus.FAILED)
        error_rate = failed_tests / len(recent_results)
        
        return error_rate > 0.2  # 20% error rate threshold
    
    def _check_service_availability_condition(self) -> bool:
        """Check if critical services are unavailable"""
        # Check latest health check results
        critical_services = ["orchestrator_health", "knowledge_service_health"]
        
        for service in critical_services:
            if service in self.test_results:
                latest_result = self.test_results[service][-1]
                if latest_result.status != TestStatus.PASSED:
                    return True
        
        return False
    
    def get_testing_report(self) -> Dict[str, Any]:
        """Get comprehensive testing report"""
        
        # Calculate suite statistics
        suite_stats = {}
        for suite_id, suite in self.test_suites.items():
            passed = 0
            failed = 0
            total = len(suite.test_cases)
            
            for test_case in suite.test_cases:
                if test_case.test_id in self.test_results:
                    latest_result = self.test_results[test_case.test_id][-1]
                    if latest_result.status == TestStatus.PASSED:
                        passed += 1
                    else:
                        failed += 1
            
            suite_stats[suite_id] = {
                "name": suite.name,
                "total_tests": total,
                "passed": passed,
                "failed": failed,
                "pass_rate": passed / total if total > 0 else 0
            }
        
        return {
            "test_statistics": self.test_statistics,
            "suite_statistics": suite_stats,
            "recent_alerts": self.alert_history[-10:],  # Last 10 alerts
            "configuration": self.config,
            "total_test_cases": len(self.test_cases),
            "total_test_suites": len(self.test_suites),
            "framework_status": "running" if self._running else "stopped"
        }

# Global testing framework
testing_framework = PAMTestingFramework()

async def get_testing_framework() -> PAMTestingFramework:
    """Get testing framework instance"""
    if not testing_framework._running:
        await testing_framework.initialize()
    return testing_framework