"""
Monitoring and Alerting Service for Data Collector
Sends notifications and tracks health metrics
"""

import os
import json
import logging
import aiohttp
from typing import Dict, List, Optional
from datetime import datetime
import traceback

logger = logging.getLogger(__name__)


class MonitoringService:
    """Monitoring and alerting for data collection"""
    
    def __init__(self):
        self.webhook_url = os.getenv('NOTIFICATION_WEBHOOK')
        self.slack_webhook = os.getenv('SLACK_WEBHOOK')
        self.sentry_dsn = os.getenv('SENTRY_DSN')
        self.admin_email = os.getenv('ADMIN_EMAIL', 'admin@wheelsandwins.com')
        
    async def send_success_notification(
        self,
        run_id: str,
        items_collected: int,
        total_in_db: int,
        duration_seconds: float,
        sources_succeeded: List[str]
    ):
        """Send notification for successful collection"""
        message = {
            'status': 'success',
            'run_id': run_id,
            'timestamp': datetime.now().isoformat(),
            'summary': f"✅ Collected {items_collected} new locations",
            'details': {
                'items_collected': items_collected,
                'total_in_database': total_in_db,
                'duration_minutes': round(duration_seconds / 60, 1),
                'sources_succeeded': sources_succeeded
            }
        }
        
        await self._send_notifications(message, 'success')
    
    async def send_failure_notification(
        self,
        run_id: str,
        error_message: str,
        traceback_str: str = None
    ):
        """Send notification for failed collection"""
        message = {
            'status': 'failure',
            'run_id': run_id,
            'timestamp': datetime.now().isoformat(),
            'summary': f"❌ Data collection failed",
            'error': error_message,
            'traceback': traceback_str
        }
        
        await self._send_notifications(message, 'error')
    
    async def send_warning_notification(
        self,
        warning_type: str,
        details: Dict
    ):
        """Send warning notification"""
        message = {
            'status': 'warning',
            'timestamp': datetime.now().isoformat(),
            'warning_type': warning_type,
            'summary': f"⚠️ {warning_type}",
            'details': details
        }
        
        await self._send_notifications(message, 'warning')
    
    async def check_health_metrics(self, state_manager) -> Dict:
        """Check system health and return metrics"""
        try:
            stats = await state_manager.get_collection_stats()
            
            health_checks = {
                'total_locations': stats.get('total_locations', 0),
                'verified_locations': stats.get('verified_locations', 0),
                'last_run': None,
                'consecutive_failures': 0,
                'warnings': []
            }
            
            # Check recent runs
            recent_runs = stats.get('recent_runs', [])
            if recent_runs:
                last_run = recent_runs[0]
                health_checks['last_run'] = last_run.get('started_at')
                
                # Count consecutive failures
                for run in recent_runs:
                    if run.get('status') == 'failed':
                        health_checks['consecutive_failures'] += 1
                    else:
                        break
            
            # Generate warnings
            if health_checks['consecutive_failures'] >= 3:
                health_checks['warnings'].append({
                    'type': 'consecutive_failures',
                    'message': f"{health_checks['consecutive_failures']} consecutive failures detected",
                    'severity': 'high'
                })
            
            if health_checks['total_locations'] < 100:
                health_checks['warnings'].append({
                    'type': 'low_data_count',
                    'message': f"Only {health_checks['total_locations']} locations in database",
                    'severity': 'medium'
                })
            
            # Check collection rate
            if recent_runs and len(recent_runs) >= 2:
                last_collected = recent_runs[0].get('actual_count', 0)
                if last_collected < 50:
                    health_checks['warnings'].append({
                        'type': 'low_collection_rate',
                        'message': f"Last run only collected {last_collected} items",
                        'severity': 'medium'
                    })
            
            return health_checks
            
        except Exception as e:
            logger.error(f"Failed to check health metrics: {e}")
            return {'error': str(e)}
    
    async def _send_notifications(self, message: Dict, level: str):
        """Send notifications through configured channels"""
        
        # Log the message
        if level == 'error':
            logger.error(f"Alert: {message['summary']}")
        elif level == 'warning':
            logger.warning(f"Alert: {message['summary']}")
        else:
            logger.info(f"Alert: {message['summary']}")
        
        # Send to webhook if configured
        if self.webhook_url:
            await self._send_webhook(self.webhook_url, message)
        
        # Send to Slack if configured
        if self.slack_webhook:
            await self._send_slack(message, level)
        
        # For errors, also log to Sentry if configured
        if level == 'error' and self.sentry_dsn:
            import sentry_sdk
            sentry_sdk.capture_message(
                message['summary'],
                level='error',
                extras=message
            )
    
    async def _send_webhook(self, url: str, payload: Dict):
        """Send notification to webhook"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    json=payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                ) as response:
                    if response.status != 200:
                        logger.error(f"Webhook failed: {response.status}")
        except Exception as e:
            logger.error(f"Failed to send webhook: {e}")
    
    async def _send_slack(self, message: Dict, level: str):
        """Send notification to Slack"""
        try:
            # Format for Slack
            color = {
                'success': 'good',
                'warning': 'warning',
                'error': 'danger'
            }.get(level, '#808080')
            
            slack_message = {
                'attachments': [{
                    'color': color,
                    'title': message['summary'],
                    'text': json.dumps(message.get('details', {}), indent=2),
                    'footer': 'Wheels & Wins Data Collector',
                    'ts': int(datetime.now().timestamp())
                }]
            }
            
            await self._send_webhook(self.slack_webhook, slack_message)
            
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")
    
    def create_performance_report(self, stats: Dict) -> str:
        """Create a performance report"""
        report = []
        report.append("📊 Data Collection Performance Report")
        report.append("=" * 50)
        
        # Overall stats
        report.append(f"\n📈 Database Statistics:")
        report.append(f"  • Total Locations: {stats.get('total_locations', 0):,}")
        report.append(f"  • Verified: {stats.get('verified_locations', 0):,}")
        
        # Source performance
        report.append(f"\n🎯 Source Performance:")
        sources = stats.get('source_performance', [])
        for source in sources[:5]:
            name = source.get('name', 'Unknown')
            collected = source.get('total_collected', 0)
            quality = source.get('average_quality_score', 0)
            report.append(f"  • {name}: {collected:,} items (quality: {quality:.2f})")
        
        # Recent runs
        report.append(f"\n📅 Recent Collection Runs:")
        runs = stats.get('recent_runs', [])
        for run in runs[:5]:
            date = run.get('started_at', 'Unknown')
            status = run.get('status', 'unknown')
            count = run.get('actual_count', 0)
            icon = '✅' if status == 'completed' else '❌'
            report.append(f"  {icon} {date[:10]}: {count} items ({status})")
        
        return "\n".join(report)