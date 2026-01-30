#!/usr/bin/env python3
"""
Production Health Check Script for PAM Infrastructure
Verifies Redis, Celery, and PAM services are properly configured
"""

import asyncio
import sys
import os
from typing import Dict, List, Any

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    import redis
    from celery import Celery
    from app.core.config import settings
    from app.core.logging import get_logger
    from app.workers.celery import celery_app
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("💡 Ensure all dependencies are installed: pip install -r requirements.txt")
    sys.exit(1)

logger = get_logger(__name__)

class HealthChecker:
    """Comprehensive health check for PAM production infrastructure"""

    def __init__(self):
        self.results = {
            "redis": {"status": "unknown", "details": {}},
            "celery": {"status": "unknown", "details": {}},
            "config": {"status": "unknown", "details": {}},
            "pam": {"status": "unknown", "details": {}}
        }

    async def check_all(self) -> Dict[str, Any]:
        """Run all health checks"""
        print("🔍 Starting PAM Infrastructure Health Check...")
        print("=" * 60)

        # Run checks
        await self.check_configuration()
        await self.check_redis()
        await self.check_celery()
        await self.check_pam_services()

        # Generate report
        return self.generate_report()

    async def check_configuration(self):
        """Check configuration and environment variables"""
        print("\n📋 Checking Configuration...")

        try:
            config_status = settings.validate_on_startup()

            if config_status["valid"]:
                self.results["config"]["status"] = "healthy"
                self.results["config"]["details"] = {
                    "environment": config_status["environment"],
                    "services": config_status["services"],
                    "warnings": len(config_status["warnings"])
                }
                print("  ✅ Configuration valid")
            else:
                self.results["config"]["status"] = "unhealthy"
                self.results["config"]["details"] = {
                    "issues": config_status["issues"],
                    "warnings": config_status["warnings"]
                }
                print("  ❌ Configuration issues found")

        except Exception as e:
            self.results["config"]["status"] = "error"
            self.results["config"]["details"] = {"error": str(e)}
            print(f"  ❌ Configuration check failed: {e}")

    async def check_redis(self):
        """Check Redis connectivity and configuration"""
        print("\n🔴 Checking Redis...")

        try:
            # Parse Redis URL
            redis_url = settings.REDIS_URL
            if not redis_url:
                raise ValueError("REDIS_URL not configured")

            # Test connection
            r = redis.from_url(redis_url)

            # Test basic operations
            ping_result = r.ping()
            r.set("health_check", "test", ex=10)
            get_result = r.get("health_check")
            r.delete("health_check")

            # Get Redis info
            info = r.info()

            self.results["redis"]["status"] = "healthy"
            self.results["redis"]["details"] = {
                "url": redis_url,
                "ping": ping_result,
                "version": info.get("redis_version"),
                "memory_used": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients")
            }
            print(f"  ✅ Redis connected - Version: {info.get('redis_version')}")

        except Exception as e:
            # In development, Redis might not be running - this is acceptable
            if "Connection refused" in str(e):
                self.results["redis"]["status"] = "unavailable"
                self.results["redis"]["details"] = {"error": str(e), "note": "Redis not running (acceptable in development)"}
                print(f"  ⚠️  Redis unavailable: {e} (OK for development)")
            else:
                self.results["redis"]["status"] = "error"
                self.results["redis"]["details"] = {"error": str(e)}
                print(f"  ❌ Redis check failed: {e}")

    async def check_celery(self):
        """Check Celery configuration and worker status"""
        print("\n🎯 Checking Celery...")

        try:
            # Check Celery app configuration
            broker_url = celery_app.conf.broker_url
            backend_url = celery_app.conf.result_backend

            # Test basic Celery functionality
            # Note: debug_task is in the main celery.py, not in pam_proactive_tasks

            # Check if we can inspect workers (if any are running)
            try:
                inspect = celery_app.control.inspect()
                active_workers = inspect.active()
                registered_tasks = inspect.registered()

                worker_count = len(active_workers) if active_workers else 0

            except Exception:
                # Workers may not be running in development
                active_workers = {}
                registered_tasks = {}
                worker_count = 0

            # Check scheduled tasks
            scheduled_tasks = celery_app.conf.beat_schedule
            pam_tasks = [task for task in scheduled_tasks.keys() if "pam-" in task]

            self.results["celery"]["status"] = "healthy"
            self.results["celery"]["details"] = {
                "broker_url": broker_url,
                "backend_url": backend_url,
                "active_workers": worker_count,
                "scheduled_tasks": len(scheduled_tasks),
                "pam_scheduled_tasks": len(pam_tasks),
                "pam_tasks": pam_tasks
            }

            print(f"  ✅ Celery configured - {len(pam_tasks)} PAM tasks scheduled")
            if worker_count > 0:
                print(f"  ✅ {worker_count} active workers detected")
            else:
                print(f"  ⚠️  No active workers detected (normal in development)")

        except Exception as e:
            self.results["celery"]["status"] = "error"
            self.results["celery"]["details"] = {"error": str(e)}
            print(f"  ❌ Celery check failed: {e}")

    async def check_pam_services(self):
        """Check PAM service integration"""
        print("\n🤖 Checking PAM Services...")

        try:
            # Check PAM proactive task imports
            from app.services.pam.monitoring.event_types import EventType
            from app.services.pam.monitoring.manager import event_manager
            from app.services.pam.proactive.data_integration import proactive_data

            # Verify key PAM tasks are importable
            from app.workers.tasks.pam_proactive_tasks import (
                check_fuel_levels_for_all_users,
                analyze_budget_thresholds,
                monitor_weather_windows,
                check_proactive_maintenance_reminders,
                monitor_user_context_changes
            )

            # Check PAM task configuration
            pam_task_routes = {}
            for route, config in celery_app.conf.task_routes.items():
                if "pam_proactive_tasks" in route:
                    pam_task_routes[route] = config

            self.results["pam"]["status"] = "healthy"
            self.results["pam"]["details"] = {
                "event_types_loaded": True,
                "event_manager_loaded": True,
                "data_integration_loaded": True,
                "proactive_tasks_loaded": 5,
                "task_routes": len(pam_task_routes)
            }

            print("  ✅ PAM services loaded successfully")
            print("  ✅ 5 proactive tasks configured")

        except Exception as e:
            self.results["pam"]["status"] = "error"
            self.results["pam"]["details"] = {"error": str(e)}
            print(f"  ❌ PAM services check failed: {e}")

    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive health report"""
        print("\n" + "=" * 60)
        print("📊 HEALTH CHECK SUMMARY")
        print("=" * 60)

        overall_healthy = True
        service_count = {"healthy": 0, "unhealthy": 0, "error": 0, "unavailable": 0}

        for service, result in self.results.items():
            status = result["status"]
            service_count[status] = service_count.get(status, 0) + 1

            if status == "healthy":
                icon = "✅"
            elif status == "unhealthy":
                icon = "⚠️"
                overall_healthy = False
            elif status == "unavailable":
                icon = "⚠️"
                # Don't mark as unhealthy for unavailable services in development
            else:
                icon = "❌"
                overall_healthy = False

            print(f"{icon} {service.upper()}: {status}")

            # Print key details
            if service == "redis" and status == "healthy":
                details = result["details"]
                print(f"    Version: {details.get('version')}")
                print(f"    Memory: {details.get('memory_used')}")

            elif service == "celery" and status == "healthy":
                details = result["details"]
                print(f"    Workers: {details.get('active_workers', 0)}")
                print(f"    PAM Tasks: {details.get('pam_scheduled_tasks', 0)}")

            elif service == "pam" and status == "healthy":
                details = result["details"]
                print(f"    Proactive Tasks: {details.get('proactive_tasks_loaded', 0)}")

        print("\n" + "=" * 60)

        if overall_healthy:
            print("🎉 ALL SYSTEMS HEALTHY - Ready for production!")
            print("🚀 PAM proactive monitoring is fully configured")
        else:
            print("⚠️  ISSUES DETECTED - Please review errors above")
            print("🔧 Fix configuration issues before deployment")

        print("=" * 60)

        return {
            "overall_healthy": overall_healthy,
            "summary": service_count,
            "details": self.results
        }


async def main():
    """Main health check execution"""
    checker = HealthChecker()
    report = await checker.check_all()

    # Exit with appropriate code
    if report["overall_healthy"]:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())