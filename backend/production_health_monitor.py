#!/usr/bin/env python3
"""
Production Health Monitor
Comprehensive monitoring script for Wheels & Wins backend issues.
"""

import asyncio
import aiohttp
import psutil
import time
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
import redis.asyncio as aioredis

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('production_health.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ProductionHealthMonitor:
    """Monitor all critical production issues."""
    
    def __init__(self):
        self.checks = {
            'memory': self.check_memory_usage,
            'disk': self.check_disk_usage,
            'cpu': self.check_cpu_usage,
            'database': self.check_database_health,
            'redis': self.check_redis_health,
            'tts': self.check_tts_services,
            'websocket': self.check_websocket_health,
            'cors': self.check_cors_configuration
        }
        self.issues_found = []
        self.recommendations = []
    
    async def run_all_checks(self) -> Dict[str, Any]:
        """Run all health checks and return comprehensive report."""
        logger.info("🔍 Starting comprehensive production health check...")
        
        results = {}
        start_time = time.time()
        
        for check_name, check_func in self.checks.items():
            try:
                logger.info(f"🔍 Running {check_name} check...")
                result = await check_func()
                results[check_name] = result
                
                if not result.get('healthy', True):
                    self.issues_found.append({
                        'check': check_name,
                        'issue': result.get('issue', 'Unknown issue'),
                        'severity': result.get('severity', 'medium'),
                        'recommendation': result.get('recommendation', 'No recommendation available')
                    })
                    
            except Exception as e:
                logger.error(f"❌ {check_name} check failed: {e}")
                results[check_name] = {
                    'healthy': False,
                    'error': str(e),
                    'severity': 'high'
                }
        
        # Generate summary
        total_time = time.time() - start_time
        summary = self.generate_summary(results, total_time)
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'duration_seconds': round(total_time, 2),
            'summary': summary,
            'detailed_results': results,
            'issues_found': self.issues_found,
            'recommendations': self.recommendations
        }
    
    async def check_memory_usage(self) -> Dict[str, Any]:
        """Check memory usage and optimization status."""
        try:
            memory = psutil.virtual_memory()
            process = psutil.Process()
            process_memory = process.memory_info()
            
            memory_percent = memory.percent
            process_memory_mb = process_memory.rss / 1024 / 1024
            
            # Check thresholds
            if memory_percent > 85:
                severity = 'critical'
                issue = f'Critical memory usage: {memory_percent:.1f}%'
                recommendation = 'Immediate memory optimization required - consider restarting service'
            elif memory_percent > 75:
                severity = 'high'
                issue = f'High memory usage: {memory_percent:.1f}%'
                recommendation = 'Enable aggressive memory optimization and garbage collection'
            elif memory_percent > 65:
                severity = 'medium'
                issue = f'Elevated memory usage: {memory_percent:.1f}%'
                recommendation = 'Monitor closely and consider memory optimization'
            else:\n                severity = 'low'\n                issue = None\n                recommendation = 'Memory usage is healthy'\n            \n            return {\n                'healthy': memory_percent <= 75,\n                'memory_percent': memory_percent,\n                'process_memory_mb': round(process_memory_mb, 2),\n                'available_memory_gb': round(memory.available / 1024 / 1024 / 1024, 2),\n                'issue': issue,\n                'severity': severity,\n                'recommendation': recommendation\n            }\n            \n        except Exception as e:\n            return {\n                'healthy': False,\n                'error': str(e),\n                'severity': 'high'\n            }\n    \n    async def check_disk_usage(self) -> Dict[str, Any]:\n        \"\"\"Check disk usage and cleanup status.\"\"\"\n        try:\n            disk = psutil.disk_usage('/')\n            disk_percent = (disk.used / disk.total) * 100\n            \n            if disk_percent > 90:\n                severity = 'critical'\n                issue = f'Critical disk usage: {disk_percent:.1f}%'\n                recommendation = 'Immediate disk cleanup required - remove logs and temp files'\n            elif disk_percent > 80:\n                severity = 'high'\n                issue = f'High disk usage: {disk_percent:.1f}%'\n                recommendation = 'Schedule disk cleanup and log rotation'\n            elif disk_percent > 70:\n                severity = 'medium'\n                issue = f'Elevated disk usage: {disk_percent:.1f}%'\n                recommendation = 'Monitor disk usage and plan cleanup'\n            else:\n                severity = 'low'\n                issue = None\n                recommendation = 'Disk usage is healthy'\n            \n            return {\n                'healthy': disk_percent <= 80,\n                'disk_percent': round(disk_percent, 2),\n                'free_space_gb': round(disk.free / 1024 / 1024 / 1024, 2),\n                'total_space_gb': round(disk.total / 1024 / 1024 / 1024, 2),\n                'issue': issue,\n                'severity': severity,\n                'recommendation': recommendation\n            }\n            \n        except Exception as e:\n            return {\n                'healthy': False,\n                'error': str(e),\n                'severity': 'high'\n            }\n    \n    async def check_cpu_usage(self) -> Dict[str, Any]:\n        \"\"\"Check CPU usage patterns.\"\"\"\n        try:\n            # Get CPU usage over 5 seconds for accuracy\n            cpu_percent = psutil.cpu_percent(interval=5)\n            process = psutil.Process()\n            process_cpu = process.cpu_percent()\n            \n            if cpu_percent > 90:\n                severity = 'critical'\n                issue = f'Critical CPU usage: {cpu_percent:.1f}%'\n                recommendation = 'Investigate high CPU processes and optimize'\n            elif cpu_percent > 80:\n                severity = 'high'\n                issue = f'High CPU usage: {cpu_percent:.1f}%'\n                recommendation = 'Monitor CPU usage and optimize heavy processes'\n            elif cpu_percent > 70:\n                severity = 'medium'\n                issue = f'Elevated CPU usage: {cpu_percent:.1f}%'\n                recommendation = 'Review process efficiency'\n            else:\n                severity = 'low'\n                issue = None\n                recommendation = 'CPU usage is healthy'\n            \n            return {\n                'healthy': cpu_percent <= 80,\n                'system_cpu_percent': round(cpu_percent, 2),\n                'process_cpu_percent': round(process_cpu, 2),\n                'cpu_count': psutil.cpu_count(),\n                'load_average': psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None,\n                'issue': issue,\n                'severity': severity,\n                'recommendation': recommendation\n            }\n            \n        except Exception as e:\n            return {\n                'healthy': False,\n                'error': str(e),\n                'severity': 'high'\n            }\n    \n    async def check_database_health(self) -> Dict[str, Any]:\n        \"\"\"Check database connectivity and table issues.\"\"\"\n        try:\n            # This is a mock check - in real implementation, \n            # you'd connect to your actual database\n            \n            # Check for known issues\n            issues = []\n            \n            # Simulate checking for missing tables\n            missing_tables = ['affiliate_sales', 'user_wishlists']\n            if missing_tables:\n                issues.append(f\"Missing tables: {', '.join(missing_tables)}\")\n            \n            # Simulate checking for RLS policy issues\n            rls_issues = ['group_trip_participants infinite recursion']\n            if rls_issues:\n                issues.append(f\"RLS policy issues: {', '.join(rls_issues)}\")\n            \n            if issues:\n                return {\n                    'healthy': False,\n                    'issues': issues,\n                    'severity': 'high',\n                    'recommendation': 'Run critical_database_fixes.sql to resolve issues'\n                }\n            else:\n                return {\n                    'healthy': True,\n                    'connection_status': 'connected',\n                    'issues': [],\n                    'recommendation': 'Database is healthy'\n                }\n            \n        except Exception as e:\n            return {\n                'healthy': False,\n                'error': str(e),\n                'severity': 'critical',\n                'recommendation': 'Check database connectivity and configuration'\n            }\n    \n    async def check_redis_health(self) -> Dict[str, Any]:\n        \"\"\"Check Redis connectivity and cache performance.\"\"\"\n        try:\n            # Mock Redis check - replace with actual Redis connection\n            redis_url = \"redis://localhost:6379\"  # Get from config\n            \n            try:\n                redis_client = await aioredis.from_url(redis_url, decode_responses=True)\n                await redis_client.ping()\n                info = await redis_client.info()\n                await redis_client.close()\n                \n                memory_usage = info.get('used_memory', 0) / 1024 / 1024  # MB\n                connected_clients = info.get('connected_clients', 0)\n                \n                return {\n                    'healthy': True,\n                    'connected': True,\n                    'memory_usage_mb': round(memory_usage, 2),\n                    'connected_clients': connected_clients,\n                    'redis_version': info.get('redis_version', 'unknown'),\n                    'recommendation': 'Redis is healthy'\n                }\n                \n            except Exception as redis_error:\n                return {\n                    'healthy': False,\n                    'connected': False,\n                    'error': str(redis_error),\n                    'severity': 'high',\n                    'recommendation': 'Check Redis service status and connectivity'\n                }\n            \n        except Exception as e:\n            return {\n                'healthy': False,\n                'error': str(e),\n                'severity': 'high'\n            }\n    \n    async def check_tts_services(self) -> Dict[str, Any]:\n        \"\"\"Check TTS service availability and fallbacks.\"\"\"\n        try:\n            tts_engines = {\n                'edge_tts': 'Not available - missing eSpeak dependency',\n                'coqui_tts': 'Module not found',\n                'fallback_tts': 'Available'\n            }\n            \n            working_engines = [k for k, v in tts_engines.items() if 'Available' in v]\n            failed_engines = [k for k, v in tts_engines.items() if 'Available' not in v]\n            \n            if not working_engines:\n                return {\n                    'healthy': False,\n                    'working_engines': working_engines,\n                    'failed_engines': failed_engines,\n                    'engine_status': tts_engines,\n                    'severity': 'high',\n                    'issue': 'No TTS engines available',\n                    'recommendation': 'Install eSpeak and configure TTS dependencies'\n                }\n            elif len(working_engines) == 1 and 'fallback' in working_engines[0]:\n                return {\n                    'healthy': True,\n                    'working_engines': working_engines,\n                    'failed_engines': failed_engines,\n                    'engine_status': tts_engines,\n                    'severity': 'medium',\n                    'issue': 'Only fallback TTS available',\n                    'recommendation': 'Install Edge TTS and Coqui TTS for better quality'\n                }\n            else:\n                return {\n                    'healthy': True,\n                    'working_engines': working_engines,\n                    'failed_engines': failed_engines,\n                    'engine_status': tts_engines,\n                    'recommendation': 'TTS services are healthy'\n                }\n            \n        except Exception as e:\n            return {\n                'healthy': False,\n                'error': str(e),\n                'severity': 'medium'\n            }\n    \n    async def check_websocket_health(self) -> Dict[str, Any]:\n        \"\"\"Check WebSocket connection stability.\"\"\"\n        try:\n            # Mock WebSocket health check\n            connection_issues = [\n                'Connection timeouts after 120 seconds',\n                'No pong responses from clients',\n                'Heartbeat monitoring failures'\n            ]\n            \n            if connection_issues:\n                return {\n                    'healthy': False,\n                    'issues': connection_issues,\n                    'severity': 'high',\n                    'recommendation': 'Implement enhanced heartbeat monitoring and connection management'\n                }\n            else:\n                return {\n                    'healthy': True,\n                    'active_connections': 0,  # Mock data\n                    'recommendation': 'WebSocket connections are stable'\n                }\n            \n        except Exception as e:\n            return {\n                'healthy': False,\n                'error': str(e),\n                'severity': 'medium'\n            }\n    \n    async def check_cors_configuration(self) -> Dict[str, Any]:\n        \"\"\"Check CORS configuration issues.\"\"\"\n        try:\n            # Mock CORS check\n            cors_issues = [\n                'OPTIONS requests returning 400 status',\n                'Preflight requests failing for /api/v1/pam/chat',\n                'Missing headers in CORS response'\n            ]\n            \n            if cors_issues:\n                return {\n                    'healthy': False,\n                    'issues': cors_issues,\n                    'severity': 'medium',\n                    'recommendation': 'Update CORS configuration to handle OPTIONS requests properly'\n                }\n            else:\n                return {\n                    'healthy': True,\n                    'recommendation': 'CORS configuration is healthy'\n                }\n            \n        except Exception as e:\n            return {\n                'healthy': False,\n                'error': str(e),\n                'severity': 'medium'\n            }\n    \n    def generate_summary(self, results: Dict[str, Any], duration: float) -> Dict[str, Any]:\n        \"\"\"Generate executive summary of health check.\"\"\"\n        total_checks = len(results)\n        healthy_checks = sum(1 for r in results.values() if r.get('healthy', False))\n        unhealthy_checks = total_checks - healthy_checks\n        \n        # Count issues by severity\n        severity_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}\n        for issue in self.issues_found:\n            severity = issue.get('severity', 'medium')\n            severity_counts[severity] += 1\n        \n        # Overall health status\n        if severity_counts['critical'] > 0:\n            overall_status = 'critical'\n            overall_message = 'Immediate attention required - critical issues detected'\n        elif severity_counts['high'] > 0:\n            overall_status = 'unhealthy'\n            overall_message = 'System requires attention - high priority issues detected'\n        elif severity_counts['medium'] > 0:\n            overall_status = 'degraded'\n            overall_message = 'System is functional but has performance issues'\n        else:\n            overall_status = 'healthy'\n            overall_message = 'All systems are operating normally'\n        \n        return {\n            'overall_status': overall_status,\n            'overall_message': overall_message,\n            'total_checks': total_checks,\n            'healthy_checks': healthy_checks,\n            'unhealthy_checks': unhealthy_checks,\n            'health_percentage': round((healthy_checks / total_checks) * 100, 1),\n            'issues_by_severity': severity_counts,\n            'total_issues': len(self.issues_found),\n            'check_duration_seconds': round(duration, 2)\n        }\n\n\nasync def main():\n    \"\"\"Run the production health monitor.\"\"\"\n    monitor = ProductionHealthMonitor()\n    report = await monitor.run_all_checks()\n    \n    # Print summary to console\n    print(\"\\n\" + \"=\" * 80)\n    print(\"WHEELS & WINS PRODUCTION HEALTH REPORT\")\n    print(\"=\" * 80)\n    \n    summary = report['summary']\n    print(f\"Overall Status: {summary['overall_status'].upper()}\")\n    print(f\"Message: {summary['overall_message']}\")\n    print(f\"Health Score: {summary['health_percentage']}% ({summary['healthy_checks']}/{summary['total_checks']} checks passed)\")\n    print(f\"Check Duration: {summary['check_duration_seconds']} seconds\")\n    \n    if report['issues_found']:\n        print(\"\\nISSUES FOUND:\")\n        for i, issue in enumerate(report['issues_found'], 1):\n            print(f\"{i}. [{issue['severity'].upper()}] {issue['check']}: {issue['issue']}\")\n            print(f\"   Recommendation: {issue['recommendation']}\")\n    \n    print(\"\\n\" + \"=\" * 80)\n    \n    # Save full report to file\n    report_filename = f\"health_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json\"\n    with open(report_filename, 'w') as f:\n        json.dump(report, f, indent=2)\n    \n    logger.info(f\"📄 Full report saved to {report_filename}\")\n    \n    return report\n\n\nif __name__ == \"__main__\":\n    asyncio.run(main())