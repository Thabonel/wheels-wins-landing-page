
#!/usr/bin/env python3
"""
PAM Backend Migration Verification Script
Verifies all systems are working after migration from /app to /backend structure.
"""

import os
import sys
import json
import asyncio
import aiohttp
import websockets
import time
from typing import Dict, List, Any, Optional
from datetime import datetime
import subprocess
import importlib
import traceback

class MigrationVerifier:
    """Comprehensive migration verification system."""
    
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "PENDING",
            "checks": {},
            "errors": [],
            "warnings": [],
            "recommendations": []
        }
        
        # Expected environment variables
        self.required_env_vars = [
            'ENVIRONMENT',
            'OPENAI_API_KEY',
            'SUPABASE_URL', 
            'SUPABASE_KEY',
            'SECRET_KEY'
        ]
        
        self.optional_env_vars = [
            'REDIS_URL',
            'SENTRY_DSN',
            'LOG_LEVEL',
            'MAX_CONNECTIONS',
            'RATE_LIMIT_PER_MINUTE'
        ]
        
        # API endpoints to test
        self.api_endpoints = [
            '/api/health',
            '/api/health/detailed',
            '/api/v1/chat/health',
            '/api/v1/wheels/health',
            '/api/v1/wins/health'
        ]
        
        # Import paths to verify
        self.import_paths = [
            'app.main',
            'app.core.config',
            'app.core.logging',
            'app.services.database',
            'app.services.cache',
            'app.api.v1.chat',
            'app.api.v1.wheels',
            'app.api.v1.wins'
        ]

    def print_header(self, title: str):
        """Print formatted section header."""
        print(f"\n{'='*60}")
        print(f" {title}")
        print(f"{'='*60}")

    def print_status(self, check: str, status: str, details: str = ""):
        """Print check status with formatting."""
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} {check}: {status}")
        if details:
            print(f"   {details}")

    async def check_environment_variables(self) -> Dict[str, Any]:
        """Verify all required environment variables are set."""
        self.print_header("Environment Variables Check")
        
        check_result = {
            "status": "PASS",
            "required_missing": [],
            "optional_missing": [],
            "total_required": len(self.required_env_vars),
            "total_optional": len(self.optional_env_vars)
        }
        
        # Check required variables
        for var in self.required_env_vars:
            value = os.getenv(var)
            if not value:
                check_result["required_missing"].append(var)
                self.print_status(f"Required: {var}", "FAIL", "Not set")
            else:
                # Mask sensitive values for display
                display_value = value[:8] + "..." if len(value) > 8 else "SET"
                self.print_status(f"Required: {var}", "PASS", display_value)
        
        # Check optional variables
        for var in self.optional_env_vars:
            value = os.getenv(var)
            if not value:
                check_result["optional_missing"].append(var)
                self.print_status(f"Optional: {var}", "WARN", "Not set")
            else:
                display_value = value[:8] + "..." if len(value) > 8 else "SET"
                self.print_status(f"Optional: {var}", "PASS", display_value)
        
        # Determine overall status
        if check_result["required_missing"]:
            check_result["status"] = "FAIL"
            self.results["errors"].append(f"Missing required environment variables: {check_result['required_missing']}")
        
        if check_result["optional_missing"]:
            self.results["warnings"].append(f"Missing optional environment variables: {check_result['optional_missing']}")
        
        return check_result

    async def check_python_imports(self) -> Dict[str, Any]:
        """Verify all Python modules can be imported."""
        self.print_header("Python Imports Check")
        
        check_result = {
            "status": "PASS",
            "successful_imports": [],
            "failed_imports": [],
            "import_errors": {}
        }
        
        for module_path in self.import_paths:
            try:
                module = importlib.import_module(module_path)
                check_result["successful_imports"].append(module_path)
                self.print_status(f"Import: {module_path}", "PASS")
            except Exception as e:
                check_result["failed_imports"].append(module_path)
                check_result["import_errors"][module_path] = str(e)
                self.print_status(f"Import: {module_path}", "FAIL", str(e))
        
        if check_result["failed_imports"]:
            check_result["status"] = "FAIL"
            self.results["errors"].append(f"Failed imports: {check_result['failed_imports']}")
        
        return check_result

    async def check_database_connection(self) -> Dict[str, Any]:
        """Test database connectivity."""
        self.print_header("Database Connection Check")
        
        check_result = {
            "status": "PASS",
            "supabase_connection": False,
            "connection_time_ms": None,
            "error": None
        }
        
        try:
            # Import Supabase client
            from app.core.database import get_supabase_client
            
            start_time = time.time()
            supabase = get_supabase_client()
            
            # Test connection with a simple query
            response = supabase.table('profiles').select('id').limit(1).execute()
            
            connection_time = (time.time() - start_time) * 1000
            check_result["connection_time_ms"] = round(connection_time, 2)
            check_result["supabase_connection"] = True
            
            self.print_status("Supabase Connection", "PASS", f"{connection_time:.2f}ms")
            
        except Exception as e:
            check_result["status"] = "FAIL"
            check_result["error"] = str(e)
            self.print_status("Supabase Connection", "FAIL", str(e))
            self.results["errors"].append(f"Database connection failed: {e}")
        
        return check_result

    async def check_api_endpoints(self) -> Dict[str, Any]:
        """Test API endpoint availability."""
        self.print_header("API Endpoints Check")
        
        check_result = {
            "status": "PASS",
            "endpoints_tested": 0,
            "endpoints_passed": 0,
            "endpoint_results": {},
            "average_response_time": 0
        }
        
        base_url = os.getenv('API_BASE_URL', 'http://localhost:8000')
        total_response_time = 0
        
        async with aiohttp.ClientSession() as session:
            for endpoint in self.api_endpoints:
                url = f"{base_url}{endpoint}"
                endpoint_result = {
                    "status_code": None,
                    "response_time_ms": None,
                    "error": None
                }
                
                try:
                    start_time = time.time()
                    async with session.get(url, timeout=10) as response:
                        response_time = (time.time() - start_time) * 1000
                        endpoint_result["status_code"] = response.status
                        endpoint_result["response_time_ms"] = round(response_time, 2)
                        total_response_time += response_time
                        
                        if response.status == 200:
                            check_result["endpoints_passed"] += 1
                            self.print_status(f"API: {endpoint}", "PASS", f"{response.status} ({response_time:.2f}ms)")
                        else:
                            self.print_status(f"API: {endpoint}", "FAIL", f"HTTP {response.status}")
                            
                except Exception as e:
                    endpoint_result["error"] = str(e)
                    self.print_status(f"API: {endpoint}", "FAIL", str(e))
                
                check_result["endpoint_results"][endpoint] = endpoint_result
                check_result["endpoints_tested"] += 1
        
        # Calculate average response time
        if check_result["endpoints_tested"] > 0:
            check_result["average_response_time"] = round(total_response_time / check_result["endpoints_tested"], 2)
        
        # Determine overall status
        if check_result["endpoints_passed"] < check_result["endpoints_tested"]:
            check_result["status"] = "FAIL"
            self.results["errors"].append(f"API endpoints failed: {check_result['endpoints_tested'] - check_result['endpoints_passed']}")
        
        return check_result

    async def check_websocket_connection(self) -> Dict[str, Any]:
        """Test WebSocket connectivity."""
        self.print_header("WebSocket Connection Check")
        
        check_result = {
            "status": "PASS",
            "websocket_connected": False,
            "connection_time_ms": None,
            "message_echo_test": False,
            "error": None
        }
        
        websocket_url = os.getenv('WEBSOCKET_URL', 'ws://localhost:8000/ws/test-user?token=test-token')
        
        try:
            start_time = time.time()
            
            async with websockets.connect(websocket_url, timeout=10) as websocket:
                connection_time = (time.time() - start_time) * 1000
                check_result["connection_time_ms"] = round(connection_time, 2)
                check_result["websocket_connected"] = True
                
                self.print_status("WebSocket Connection", "PASS", f"{connection_time:.2f}ms")
                
                # Test echo functionality
                test_message = {"type": "ping", "timestamp": time.time()}
                await websocket.send(json.dumps(test_message))
                
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                response_data = json.loads(response)
                
                if response_data.get("type") == "pong":
                    check_result["message_echo_test"] = True
                    self.print_status("WebSocket Echo Test", "PASS")
                else:
                    self.print_status("WebSocket Echo Test", "FAIL", "Unexpected response")
                    
        except Exception as e:
            check_result["status"] = "FAIL"
            check_result["error"] = str(e)
            self.print_status("WebSocket Connection", "FAIL", str(e))
            self.results["errors"].append(f"WebSocket connection failed: {e}")
        
        return check_result

    async def run_smoke_tests(self) -> Dict[str, Any]:
        """Run basic smoke tests."""
        self.print_header("Smoke Tests")
        
        check_result = {
            "status": "PASS",
            "tests_run": 0,
            "tests_passed": 0,
            "test_results": {}
        }
        
        # Test 1: Config loading
        try:
            from app.core.config import settings
            assert settings.ENVIRONMENT is not None
            check_result["test_results"]["config_loading"] = {"status": "PASS"}
            check_result["tests_passed"] += 1
            self.print_status("Config Loading", "PASS")
        except Exception as e:
            check_result["test_results"]["config_loading"] = {"status": "FAIL", "error": str(e)}
            self.print_status("Config Loading", "FAIL", str(e))
        check_result["tests_run"] += 1
        
        # Test 2: Logger initialization
        try:
            from app.core.logging import setup_logging
            logger = setup_logging()
            logger.info("Test log message")
            check_result["test_results"]["logging_setup"] = {"status": "PASS"}
            check_result["tests_passed"] += 1
            self.print_status("Logging Setup", "PASS")
        except Exception as e:
            check_result["test_results"]["logging_setup"] = {"status": "FAIL", "error": str(e)}
            self.print_status("Logging Setup", "FAIL", str(e))
        check_result["tests_run"] += 1
        
        # Test 3: Service initialization
        try:
            from app.services.database import DatabaseService
            db_service = DatabaseService()
            check_result["test_results"]["service_init"] = {"status": "PASS"}
            check_result["tests_passed"] += 1
            self.print_status("Service Initialization", "PASS")
        except Exception as e:
            check_result["test_results"]["service_init"] = {"status": "FAIL", "error": str(e)}
            self.print_status("Service Initialization", "FAIL", str(e))
        check_result["tests_run"] += 1
        
        # Determine overall status
        if check_result["tests_passed"] < check_result["tests_run"]:
            check_result["status"] = "FAIL"
            self.results["errors"].append(f"Smoke tests failed: {check_result['tests_run'] - check_result['tests_passed']}")
        
        return check_result

    async def check_file_structure(self) -> Dict[str, Any]:
        """Verify the new file structure is in place."""
        self.print_header("File Structure Check")
        
        check_result = {
            "status": "PASS",
            "expected_files": 0,
            "found_files": 0,
            "missing_files": [],
            "unexpected_files": []
        }
        
        # Expected files and directories
        expected_structure = [
            "backend/app/__init__.py",
            "backend/app/main.py",
            "backend/app/core/__init__.py",
            "backend/app/core/config.py",
            "backend/app/core/logging.py",
            "backend/app/api/__init__.py",
            "backend/app/api/v1/__init__.py",
            "backend/app/services/__init__.py",
            "backend/app/database/__init__.py",
            "backend/requirements.txt",
            "backend/requirements-dev.txt",
            "render.yaml"
        ]
        
        for file_path in expected_structure:
            check_result["expected_files"] += 1
            if os.path.exists(file_path):
                check_result["found_files"] += 1
                self.print_status(f"File: {file_path}", "PASS")
            else:
                check_result["missing_files"].append(file_path)
                self.print_status(f"File: {file_path}", "FAIL", "Missing")
        
        if check_result["missing_files"]:
            check_result["status"] = "FAIL"
            self.results["errors"].append(f"Missing files: {check_result['missing_files']}")
        
        return check_result

    async def run_all_checks(self) -> Dict[str, Any]:
        """Run all verification checks."""
        print("🚀 Starting PAM Backend Migration Verification")
        print(f"Timestamp: {self.results['timestamp']}")
        
        # Run all checks
        self.results["checks"]["environment"] = await self.check_environment_variables()
        self.results["checks"]["file_structure"] = await self.check_file_structure()
        self.results["checks"]["python_imports"] = await self.check_python_imports()
        self.results["checks"]["database"] = await self.check_database_connection()
        self.results["checks"]["api_endpoints"] = await self.check_api_endpoints()
        self.results["checks"]["websocket"] = await self.check_websocket_connection()
        self.results["checks"]["smoke_tests"] = await self.run_smoke_tests()
        
        # Determine overall status
        failed_checks = [name for name, check in self.results["checks"].items() if check["status"] == "FAIL"]
        
        if failed_checks:
            self.results["overall_status"] = "FAIL"
            self.results["recommendations"].append("Review failed checks before proceeding with old directory removal")
        else:
            self.results["overall_status"] = "PASS"
            self.results["recommendations"].append("Migration verification successful - safe to remove old directories")
        
        return self.results

    def generate_report(self) -> str:
        """Generate migration verification report."""
        self.print_header("Migration Verification Report")
        
        # Overall status
        status_icon = "✅" if self.results["overall_status"] == "PASS" else "❌"
        print(f"\n{status_icon} Overall Status: {self.results['overall_status']}")
        
        # Summary statistics
        total_checks = len(self.results["checks"])
        passed_checks = sum(1 for check in self.results["checks"].values() if check["status"] == "PASS")
        failed_checks = total_checks - passed_checks
        
        print(f"\nSummary:")
        print(f"  Total Checks: {total_checks}")
        print(f"  Passed: {passed_checks}")
        print(f"  Failed: {failed_checks}")
        
        # Errors
        if self.results["errors"]:
            print(f"\n❌ Errors ({len(self.results['errors'])}):")
            for error in self.results["errors"]:
                print(f"  • {error}")
        
        # Warnings
        if self.results["warnings"]:
            print(f"\n⚠️  Warnings ({len(self.results['warnings'])}):")
            for warning in self.results["warnings"]:
                print(f"  • {warning}")
        
        # Recommendations
        if self.results["recommendations"]:
            print(f"\n💡 Recommendations:")
            for rec in self.results["recommendations"]:
                print(f"  • {rec}")
        
        # Save detailed report
        report_file = f"migration_verification_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        
        return report_file

async def main():
    """Main verification function."""
    verifier = MigrationVerifier()
    
    try:
        # Run all verification checks
        results = await verifier.run_all_checks()
        
        # Generate report
        report_file = verifier.generate_report()
        
        # Exit with appropriate code
        if results["overall_status"] == "PASS":
            print(f"\n🎉 Migration verification completed successfully!")
            print("It is now safe to remove old directories.")
            sys.exit(0)
        else:
            print(f"\n⚠️  Migration verification failed!")
            print("Please address the issues before removing old directories.")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ Verification script failed: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    # Check if we're in the right directory
    if not os.path.exists("backend"):
        print("❌ Please run this script from the project root directory")
        sys.exit(1)
    
    # Add backend to Python path
    sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
    
    # Run verification
    asyncio.run(main())
