"""
Comprehensive API Validation Audit Script
Tests all critical endpoints for Wheels & Wins Backend
"""

import asyncio
import time
import json
from typing import Dict, List, Any
import httpx

# Configuration
PROD_BASE_URL = "https://pam-backend.onrender.com"
STAGING_BASE_URL = "https://wheels-wins-backend-staging.onrender.com"
TIMEOUT = 30.0

class APIValidator:
    def __init__(self, base_url: str, environment: str):
        self.base_url = base_url
        self.environment = environment
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0

    async def test_endpoint(
        self,
        method: str,
        path: str,
        expected_status: int = 200,
        description: str = "",
        headers: Dict = None,
        data: Dict = None
    ) -> Dict[str, Any]:
        """Test a single endpoint and collect metrics"""
        self.total_tests += 1
        url = f"{self.base_url}{path}"

        start_time = time.time()
        result = {
            "method": method,
            "endpoint": path,
            "url": url,
            "description": description,
            "expected_status": expected_status,
            "actual_status": None,
            "response_time_ms": None,
            "passed": False,
            "error": None,
            "response_data": None
        }

        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                if method == "GET":
                    response = await client.get(url, headers=headers)
                elif method == "POST":
                    response = await client.post(url, headers=headers, json=data)
                elif method == "PUT":
                    response = await client.put(url, headers=headers, json=data)
                elif method == "DELETE":
                    response = await client.delete(url, headers=headers)
                else:
                    response = await client.request(method, url, headers=headers)

                end_time = time.time()
                response_time = (end_time - start_time) * 1000

                result["actual_status"] = response.status_code
                result["response_time_ms"] = round(response_time, 2)
                result["passed"] = response.status_code == expected_status

                try:
                    result["response_data"] = response.json()
                except:
                    result["response_data"] = response.text[:200]

                if result["passed"]:
                    self.passed_tests += 1
                else:
                    self.failed_tests += 1

        except Exception as e:
            result["error"] = str(e)
            result["response_time_ms"] = (time.time() - start_time) * 1000
            self.failed_tests += 1

        self.results.append(result)
        return result

    async def run_health_checks(self):
        """Test all health check endpoints"""
        print(f"\n=== Testing Health Endpoints ({self.environment}) ===")

        await self.test_endpoint("GET", "/health", 200, "Main health check")
        await self.test_endpoint("GET", "/api/cors/debug", 200, "CORS debug endpoint")
        await self.test_endpoint("GET", "/api/cors/stats", 200, "CORS stats endpoint")
        await self.test_endpoint("GET", "/", 200, "Root endpoint")

    async def run_authentication_tests(self):
        """Test authentication endpoints"""
        print(f"\n=== Testing Authentication ({self.environment}) ===")

        # Test endpoints that should require authentication
        await self.test_endpoint(
            "GET", "/api/v1/profiles/me", 401,
            "Profile access without auth (should fail)"
        )

        await self.test_endpoint(
            "GET", "/api/v1/user-settings", 401,
            "User settings without auth (should fail)"
        )

    async def run_public_endpoint_tests(self):
        """Test public endpoints that don't require authentication"""
        print(f"\n=== Testing Public Endpoints ({self.environment}) ===")

        # Products endpoint (should be public for shop browsing)
        await self.test_endpoint(
            "GET", "/api/v1/products?category=books_manuals&limit=5", 200,
            "Public products endpoint"
        )

        # National parks endpoint
        await self.test_endpoint(
            "GET", "/api/v1/national-parks", 200,
            "National parks listing"
        )

    async def run_performance_tests(self):
        """Test endpoint performance"""
        print(f"\n=== Testing Performance ({self.environment}) ===")

        # Run multiple requests to check average response time
        for i in range(3):
            await self.test_endpoint(
                "GET", "/health", 200,
                f"Health check performance test {i+1}"
            )

    async def run_cors_tests(self):
        """Test CORS configuration"""
        print(f"\n=== Testing CORS Configuration ({self.environment}) ===")

        # Test CORS headers
        headers = {"Origin": "https://wheelsandwins.com"}
        await self.test_endpoint(
            "GET", "/health", 200,
            "CORS test with production origin",
            headers=headers
        )

        headers = {"Origin": "https://wheels-wins-staging.netlify.app"}
        await self.test_endpoint(
            "GET", "/health", 200,
            "CORS test with staging origin",
            headers=headers
        )

    async def run_error_handling_tests(self):
        """Test error handling"""
        print(f"\n=== Testing Error Handling ({self.environment}) ===")

        # Test 404
        await self.test_endpoint(
            "GET", "/api/v1/nonexistent-endpoint", 404,
            "404 endpoint test"
        )

        # Test invalid method
        await self.test_endpoint(
            "POST", "/health", 405,
            "Invalid HTTP method test"
        )

    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        response_times = [r["response_time_ms"] for r in self.results if r["response_time_ms"]]

        report = {
            "environment": self.environment,
            "base_url": self.base_url,
            "summary": {
                "total_tests": self.total_tests,
                "passed": self.passed_tests,
                "failed": self.failed_tests,
                "pass_rate": f"{(self.passed_tests/self.total_tests*100):.1f}%" if self.total_tests > 0 else "0%"
            },
            "performance": {
                "avg_response_time_ms": round(sum(response_times)/len(response_times), 2) if response_times else 0,
                "min_response_time_ms": round(min(response_times), 2) if response_times else 0,
                "max_response_time_ms": round(max(response_times), 2) if response_times else 0,
                "p95_response_time_ms": round(sorted(response_times)[int(len(response_times)*0.95)], 2) if len(response_times) > 10 else 0
            },
            "failed_tests": [r for r in self.results if not r["passed"]],
            "slow_endpoints": [r for r in self.results if r["response_time_ms"] and r["response_time_ms"] > 200]
        }

        return report

async def main():
    """Run comprehensive API validation audit"""
    print("=" * 80)
    print("WHEELS & WINS - COMPREHENSIVE API VALIDATION AUDIT")
    print("=" * 80)

    # Test both environments
    environments = [
        (PROD_BASE_URL, "Production"),
        (STAGING_BASE_URL, "Staging")
    ]

    all_reports = {}

    for base_url, env_name in environments:
        print(f"\n{'='*80}")
        print(f"Testing {env_name} Environment: {base_url}")
        print(f"{'='*80}")

        validator = APIValidator(base_url, env_name)

        # Run all test suites
        await validator.run_health_checks()
        await validator.run_authentication_tests()
        await validator.run_public_endpoint_tests()
        await validator.run_cors_tests()
        await validator.run_error_handling_tests()
        await validator.run_performance_tests()

        # Generate report
        report = validator.generate_report()
        all_reports[env_name] = report

        # Print summary
        print(f"\n{'='*80}")
        print(f"{env_name} Test Summary:")
        print(f"{'='*80}")
        print(f"Total Tests: {report['summary']['total_tests']}")
        print(f"Passed: {report['summary']['passed']}")
        print(f"Failed: {report['summary']['failed']}")
        print(f"Pass Rate: {report['summary']['pass_rate']}")
        print(f"Avg Response Time: {report['performance']['avg_response_time_ms']}ms")
        print(f"P95 Response Time: {report['performance']['p95_response_time_ms']}ms")

        if report['failed_tests']:
            print(f"\nFailed Tests ({len(report['failed_tests'])}):")
            for test in report['failed_tests']:
                print(f"  - {test['method']} {test['endpoint']}: Expected {test['expected_status']}, got {test['actual_status']}")
                if test['error']:
                    print(f"    Error: {test['error']}")

        if report['slow_endpoints']:
            print(f"\nSlow Endpoints (>200ms) ({len(report['slow_endpoints'])}):")
            for test in report['slow_endpoints']:
                print(f"  - {test['method']} {test['endpoint']}: {test['response_time_ms']}ms")

    # Save full report to JSON
    with open('/tmp/api_validation_report.json', 'w') as f:
        json.dump(all_reports, f, indent=2)

    print(f"\n{'='*80}")
    print("Full report saved to: /tmp/api_validation_report.json")
    print(f"{'='*80}")

    return all_reports

if __name__ == "__main__":
    asyncio.run(main())
