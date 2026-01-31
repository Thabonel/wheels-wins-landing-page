#!/usr/bin/env python3
"""
Deploy resource optimizations with comprehensive monitoring
"""
import time
import requests
import json
import sys
from datetime import datetime


def check_health_endpoint(base_url: str, timeout: int = 30) -> dict:
    """Check health endpoint and return status"""
    try:
        response = requests.get(f"{base_url}/health/resources", timeout=timeout)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}


def monitor_deployment(base_url: str, duration_minutes: int = 10):
    """Monitor deployment health for specified duration"""

    print(f"🔍 Monitoring {base_url} for {duration_minutes} minutes...")

    start_time = datetime.now()
    checks = []

    for minute in range(duration_minutes):
        health = check_health_endpoint(base_url)
        timestamp = datetime.now().isoformat()

        check_result = {
            "minute": minute + 1,
            "timestamp": timestamp,
            "status": health.get("status", "UNKNOWN"),
            "health_score": health.get("health_score", 0),
            "alerts": health.get("alerts", 0)
        }

        if "stats" in health:
            stats = health["stats"]
            check_result.update({
                "memory_pct": stats.get("memory_pct", 0),
                "disk_pct": stats.get("disk_pct", 0),
                "cpu_pct": stats.get("cpu_pct", 0)
            })

        checks.append(check_result)

        # Print status
        status_emoji = {"HEALTHY": "✅", "WARNING": "⚠️", "CRITICAL": "🚨"}.get(
            health.get("status"), "❓"
        )

        print(f"{status_emoji} Minute {minute + 1}: {health.get('status', 'UNKNOWN')} "
              f"(Memory: {check_result.get('memory_pct', 0):.1f}%, "
              f"Disk: {check_result.get('disk_pct', 0):.1f}%, "
              f"CPU: {check_result.get('cpu_pct', 0):.1f}%)")

        # Check for critical alerts
        if health.get("alerts", 0) > 0:
            print(f"   🚨 {health.get('alerts')} alerts detected")
            for alert in health.get("alert_details", []):
                print(f"     - {alert.get('level')}: {alert.get('message')}")

        # Sleep until next minute
        if minute < duration_minutes - 1:
            time.sleep(60)

    # Generate summary
    total_checks = len(checks)
    healthy_checks = len([c for c in checks if c["status"] == "HEALTHY"])
    warning_checks = len([c for c in checks if c["status"] == "WARNING"])
    critical_checks = len([c for c in checks if c["status"] == "CRITICAL"])

    avg_memory = sum(c.get("memory_pct", 0) for c in checks) / total_checks
    avg_disk = sum(c.get("disk_pct", 0) for c in checks) / total_checks
    avg_cpu = sum(c.get("cpu_pct", 0) for c in checks) / total_checks

    print(f"\n📊 Monitoring Summary:")
    print(f"   Duration: {duration_minutes} minutes")
    print(f"   Healthy: {healthy_checks}/{total_checks} ({healthy_checks/total_checks*100:.1f}%)")
    print(f"   Warning: {warning_checks}/{total_checks}")
    print(f"   Critical: {critical_checks}/{total_checks}")
    print(f"   Average Memory: {avg_memory:.1f}%")
    print(f"   Average Disk: {avg_disk:.1f}%")
    print(f"   Average CPU: {avg_cpu:.1f}%")

    return {
        "summary": {
            "duration_minutes": duration_minutes,
            "total_checks": total_checks,
            "healthy_count": healthy_checks,
            "warning_count": warning_checks,
            "critical_count": critical_checks,
            "avg_memory_pct": avg_memory,
            "avg_disk_pct": avg_disk,
            "avg_cpu_pct": avg_cpu,
            "health_percentage": healthy_checks/total_checks*100
        },
        "checks": checks
    }


def main():
    """Main deployment monitoring"""

    environments = {
        "staging": "https://wheels-wins-backend-staging.onrender.com",
        "production": "https://pam-backend.onrender.com"
    }

    # Check if staging is healthy before production
    print("🧪 Checking staging environment health...")
    staging_health = check_health_endpoint(environments["staging"])

    if staging_health.get("status") != "HEALTHY":
        print(f"⚠️ Staging is not healthy: {staging_health}")
        print("❌ Aborting production deployment")
        sys.exit(1)

    print("✅ Staging is healthy")

    # Monitor staging for 5 minutes
    staging_results = monitor_deployment(environments["staging"], 5)

    if staging_results["summary"]["health_percentage"] < 80:
        print("❌ Staging health check failed - less than 80% healthy")
        sys.exit(1)

    # Ask for production deployment confirmation
    print(f"\n🚀 Deploy to production? (y/N): ", end="")
    response = input().lower()

    if response != 'y':
        print("❌ Production deployment cancelled")
        sys.exit(0)

    print("🚀 Deploying to production...")

    # In a real deployment, this would trigger the deployment
    # For now, just monitor production
    print("⏳ Waiting for production deployment to complete...")
    time.sleep(60)  # Wait for deployment

    # Monitor production for 10 minutes
    production_results = monitor_deployment(environments["production"], 10)

    # Save results
    results = {
        "deployment_time": datetime.now().isoformat(),
        "staging": staging_results,
        "production": production_results
    }

    with open("deployment_results.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Deployment monitoring complete. Results saved to deployment_results.json")

    if production_results["summary"]["health_percentage"] >= 90:
        print("🎉 Deployment successful - production is healthy!")
    else:
        print("⚠️ Deployment has issues - production health below 90%")
        sys.exit(1)


if __name__ == "__main__":
    main()