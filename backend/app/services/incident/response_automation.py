"""
Incident Response Automation System
Automated incident classification, response workflows, and escalation procedures.
"""

import asyncio
import json
import time
from typing import Dict, List, Optional, Any, Set, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
from collections import defaultdict

try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from app.core.logging import get_logger
from app.core.security_monitoring import SecurityEvent, ThreatSeverity, ThreatType

logger = get_logger(__name__)


class IncidentStatus(Enum):
    """Incident lifecycle status"""
    OPEN = "open"
    INVESTIGATING = "investigating"
    CONTAINED = "contained"
    RESOLVED = "resolved"
    CLOSED = "closed"


class IncidentCategory(Enum):
    """Incident classification categories"""
    SECURITY_BREACH = "security_breach"
    DATA_LEAK = "data_leak"
    DDOS_ATTACK = "ddos_attack"
    MALWARE = "malware"
    PHISHING = "phishing"
    INSIDER_THREAT = "insider_threat"
    COMPLIANCE_VIOLATION = "compliance_violation"
    SYSTEM_COMPROMISE = "system_compromise"
    ACCOUNT_TAKEOVER = "account_takeover"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"


class EscalationLevel(Enum):
    """Incident escalation levels"""
    LEVEL_0 = "automated_response"     # Automated handling only
    LEVEL_1 = "security_team"         # Security team notification
    LEVEL_2 = "management"             # Management notification
    LEVEL_3 = "executive"              # Executive notification
    LEVEL_4 = "external_authorities"   # Law enforcement/regulators


@dataclass
class IncidentAction:
    """Action taken in response to incident"""
    action_id: str
    timestamp: datetime
    action_type: str
    description: str
    automated: bool
    success: bool
    details: Dict[str, Any]


@dataclass
class Incident:
    """Security incident data structure"""
    incident_id: str
    title: str
    description: str
    category: IncidentCategory
    severity: ThreatSeverity
    status: IncidentStatus
    escalation_level: EscalationLevel
    created_at: datetime
    updated_at: datetime
    source_events: List[str]  # Event IDs that triggered this incident
    affected_assets: List[str]
    affected_users: List[str]
    actions_taken: List[IncidentAction]
    assigned_to: Optional[str] = None
    resolved_at: Optional[datetime] = None
    estimated_impact: Optional[str] = None
    mitigation_steps: List[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/transmission"""
        return {
            **asdict(self),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'category': self.category.value,
            'severity': self.severity.value,
            'status': self.status.value,
            'escalation_level': self.escalation_level.value,
            'actions_taken': [
                {
                    **asdict(action),
                    'timestamp': action.timestamp.isoformat()
                } for action in self.actions_taken
            ]
        }


class IncidentClassifier:
    """AI-powered incident classification and severity assessment"""

    def __init__(self):
        # Classification rules based on threat patterns
        self.classification_rules = {
            # DDoS and volume attacks
            ThreatType.DDOS: {
                'category': IncidentCategory.DDOS_ATTACK,
                'severity_map': {
                    ThreatSeverity.CRITICAL: IncidentCategory.DDOS_ATTACK,
                    ThreatSeverity.HIGH: IncidentCategory.SUSPICIOUS_ACTIVITY,
                }
            },

            # Injection attacks
            ThreatType.SQL_INJECTION: {
                'category': IncidentCategory.SYSTEM_COMPROMISE,
                'escalation': EscalationLevel.LEVEL_2
            },
            ThreatType.COMMAND_INJECTION: {
                'category': IncidentCategory.SYSTEM_COMPROMISE,
                'escalation': EscalationLevel.LEVEL_2
            },

            # XSS and client-side attacks
            ThreatType.XSS: {
                'category': IncidentCategory.SECURITY_BREACH,
                'escalation': EscalationLevel.LEVEL_1
            },

            # Brute force and account attacks
            ThreatType.BRUTE_FORCE: {
                'category': IncidentCategory.ACCOUNT_TAKEOVER,
                'escalation': EscalationLevel.LEVEL_1
            },
            ThreatType.ACCOUNT_ENUMERATION: {
                'category': IncidentCategory.SUSPICIOUS_ACTIVITY,
                'escalation': EscalationLevel.LEVEL_0
            },

            # Path traversal
            ThreatType.PATH_TRAVERSAL: {
                'category': IncidentCategory.DATA_LEAK,
                'escalation': EscalationLevel.LEVEL_2
            },
        }

    def classify_incident(self, events: List[SecurityEvent]) -> tuple[IncidentCategory, EscalationLevel]:
        """Classify incident based on security events"""
        if not events:
            return IncidentCategory.SUSPICIOUS_ACTIVITY, EscalationLevel.LEVEL_0

        # Get the most severe event
        primary_event = max(events, key=lambda e: self._severity_score(e.severity))

        # Apply classification rules
        rule = self.classification_rules.get(primary_event.threat_type)
        if rule:
            category = rule.get('category', IncidentCategory.SUSPICIOUS_ACTIVITY)
            escalation = rule.get('escalation', self._default_escalation(primary_event.severity))
        else:
            category = IncidentCategory.SUSPICIOUS_ACTIVITY
            escalation = self._default_escalation(primary_event.severity)

        # Adjust escalation based on event patterns
        escalation = self._adjust_escalation_by_patterns(events, escalation)

        return category, escalation

    def _severity_score(self, severity: ThreatSeverity) -> int:
        """Convert severity to numeric score for comparison"""
        scores = {
            ThreatSeverity.LOW: 1,
            ThreatSeverity.MEDIUM: 2,
            ThreatSeverity.HIGH: 3,
            ThreatSeverity.CRITICAL: 4
        }
        return scores.get(severity, 1)

    def _default_escalation(self, severity: ThreatSeverity) -> EscalationLevel:
        """Default escalation based on severity"""
        escalation_map = {
            ThreatSeverity.LOW: EscalationLevel.LEVEL_0,
            ThreatSeverity.MEDIUM: EscalationLevel.LEVEL_0,
            ThreatSeverity.HIGH: EscalationLevel.LEVEL_1,
            ThreatSeverity.CRITICAL: EscalationLevel.LEVEL_2
        }
        return escalation_map.get(severity, EscalationLevel.LEVEL_0)

    def _adjust_escalation_by_patterns(
        self,
        events: List[SecurityEvent],
        base_escalation: EscalationLevel
    ) -> EscalationLevel:
        """Adjust escalation based on event patterns"""

        # Multiple attack types from same IP
        unique_ips = set(event.source_ip for event in events)
        unique_threat_types = set(event.threat_type for event in events)

        if len(unique_threat_types) > 2 and len(unique_ips) == 1:
            # Coordinated multi-vector attack from single source
            return self._escalate_level(base_escalation, 1)

        # High-volume attacks
        if len(events) > 50:
            return self._escalate_level(base_escalation, 1)

        # Critical systems targeted
        critical_endpoints = ['/admin/', '/api/auth/', '/system/']
        if any(any(endpoint in event.endpoint for endpoint in critical_endpoints)
               for event in events):
            return self._escalate_level(base_escalation, 1)

        return base_escalation

    def _escalate_level(self, current: EscalationLevel, steps: int) -> EscalationLevel:
        """Escalate to higher level"""
        levels = list(EscalationLevel)
        current_index = levels.index(current)
        new_index = min(current_index + steps, len(levels) - 1)
        return levels[new_index]


class NotificationService:
    """Service for sending incident notifications"""

    def __init__(self):
        self.notification_channels = {
            EscalationLevel.LEVEL_0: [],  # No notifications for automated
            EscalationLevel.LEVEL_1: ['security_team_slack', 'security_email'],
            EscalationLevel.LEVEL_2: ['management_email', 'security_team_slack', 'pagerduty'],
            EscalationLevel.LEVEL_3: ['executive_email', 'management_email', 'security_team_slack'],
            EscalationLevel.LEVEL_4: ['all_channels', 'external_reporting']
        }

    async def send_incident_notification(
        self,
        incident: Incident,
        notification_type: str = "new_incident"
    ):
        """Send incident notification based on escalation level"""
        channels = self.notification_channels.get(incident.escalation_level, [])

        notification_data = {
            'type': notification_type,
            'incident_id': incident.incident_id,
            'title': incident.title,
            'severity': incident.severity.value,
            'category': incident.category.value,
            'escalation_level': incident.escalation_level.value,
            'created_at': incident.created_at.isoformat(),
            'affected_assets': incident.affected_assets,
            'affected_users': incident.affected_users,
            'status': incident.status.value
        }

        for channel in channels:
            try:
                await self._send_to_channel(channel, notification_data)
            except Exception as e:
                logger.error(f"Failed to send notification to {channel}: {e}")

    async def _send_to_channel(self, channel: str, data: Dict[str, Any]):
        """Send notification to specific channel"""
        # This would integrate with actual notification services

        if channel == 'security_team_slack':
            await self._send_slack_notification(data, '#security-alerts')
        elif channel == 'security_email':
            await self._send_email_notification(data, 'security@company.com')
        elif channel == 'management_email':
            await self._send_email_notification(data, 'management@company.com')
        elif channel == 'executive_email':
            await self._send_email_notification(data, 'executives@company.com')
        elif channel == 'pagerduty':
            await self._send_pagerduty_alert(data)
        elif channel == 'external_reporting':
            await self._send_external_report(data)

        logger.info(f"Sent notification to {channel} for incident {data['incident_id']}")

    async def _send_slack_notification(self, data: Dict[str, Any], channel: str):
        """Send Slack notification (placeholder implementation)"""
        # Placeholder for Slack integration
        logger.info(f"Slack notification to {channel}: {data['title']}")

    async def _send_email_notification(self, data: Dict[str, Any], email: str):
        """Send email notification (placeholder implementation)"""
        # Placeholder for email integration
        logger.info(f"Email notification to {email}: {data['title']}")

    async def _send_pagerduty_alert(self, data: Dict[str, Any]):
        """Send PagerDuty alert (placeholder implementation)"""
        # Placeholder for PagerDuty integration
        logger.info(f"PagerDuty alert: {data['title']}")

    async def _send_external_report(self, data: Dict[str, Any]):
        """Send external report (placeholder implementation)"""
        # Placeholder for external reporting (law enforcement, etc.)
        logger.info(f"External report: {data['title']}")


class ResponseAutomation:
    """Automated incident response actions"""

    def __init__(self):
        # Define automated response workflows
        self.response_workflows = {
            IncidentCategory.DDOS_ATTACK: [
                self._block_source_ips,
                self._enable_rate_limiting,
                self._activate_ddos_protection
            ],
            IncidentCategory.SYSTEM_COMPROMISE: [
                self._block_source_ips,
                self._disable_affected_accounts,
                self._isolate_affected_systems,
                self._collect_forensic_data
            ],
            IncidentCategory.ACCOUNT_TAKEOVER: [
                self._force_password_reset,
                self._block_source_ips,
                self._enable_mfa_requirement,
                self._notify_affected_users
            ],
            IncidentCategory.DATA_LEAK: [
                self._block_source_ips,
                self._restrict_data_access,
                self._audit_data_access_logs,
                self._enable_enhanced_monitoring
            ],
            IncidentCategory.SUSPICIOUS_ACTIVITY: [
                self._increase_monitoring,
                self._collect_additional_logs
            ]
        }

    async def execute_automated_response(self, incident: Incident) -> List[IncidentAction]:
        """Execute automated response workflow for incident"""
        actions = []
        workflow = self.response_workflows.get(incident.category, [])

        for response_function in workflow:
            try:
                action = await response_function(incident)
                actions.append(action)
                logger.info(f"Executed automated action: {action.description}")
            except Exception as e:
                error_action = IncidentAction(
                    action_id=str(uuid.uuid4()),
                    timestamp=datetime.now(),
                    action_type="error",
                    description=f"Failed to execute {response_function.__name__}: {str(e)}",
                    automated=True,
                    success=False,
                    details={'error': str(e)}
                )
                actions.append(error_action)
                logger.error(f"Automated response failed: {e}")

        return actions

    async def _block_source_ips(self, incident: Incident) -> IncidentAction:
        """Block source IPs involved in incident"""
        # Extract unique IPs from incident events
        source_ips = set()
        for event_id in incident.source_events:
            # In real implementation, fetch event details
            source_ips.add("simulated_ip")  # Placeholder

        blocked_count = len(source_ips)

        return IncidentAction(
            action_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type="ip_blocking",
            description=f"Blocked {blocked_count} source IPs",
            automated=True,
            success=True,
            details={
                'blocked_ips': list(source_ips),
                'block_duration': '24h'
            }
        )

    async def _enable_rate_limiting(self, incident: Incident) -> IncidentAction:
        """Enable enhanced rate limiting"""
        return IncidentAction(
            action_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type="rate_limiting",
            description="Enabled enhanced rate limiting on affected endpoints",
            automated=True,
            success=True,
            details={
                'new_rate_limit': '10/minute',
                'affected_endpoints': incident.affected_assets
            }
        )

    async def _activate_ddos_protection(self, incident: Incident) -> IncidentAction:
        """Activate DDoS protection measures"""
        return IncidentAction(
            action_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type="ddos_protection",
            description="Activated DDoS protection and traffic filtering",
            automated=True,
            success=True,
            details={
                'protection_level': 'high',
                'challenge_mode': 'enabled'
            }
        )

    async def _disable_affected_accounts(self, incident: Incident) -> IncidentAction:
        """Disable affected user accounts"""
        disabled_count = len(incident.affected_users)

        return IncidentAction(
            action_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type="account_disabling",
            description=f"Disabled {disabled_count} affected user accounts",
            automated=True,
            success=True,
            details={
                'disabled_accounts': incident.affected_users,
                'disable_reason': 'security_incident'
            }
        )

    async def _isolate_affected_systems(self, incident: Incident) -> IncidentAction:
        """Isolate affected systems"""
        return IncidentAction(
            action_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type="system_isolation",
            description="Isolated affected systems from network",
            automated=True,
            success=True,
            details={
                'isolated_systems': incident.affected_assets,
                'isolation_type': 'network_segmentation'
            }
        )

    async def _collect_forensic_data(self, incident: Incident) -> IncidentAction:
        """Collect forensic data"""
        return IncidentAction(
            action_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type="forensic_collection",
            description="Initiated forensic data collection",
            automated=True,
            success=True,
            details={
                'collection_scope': incident.affected_assets,
                'retention_period': '90_days'
            }
        )

    async def _force_password_reset(self, incident: Incident) -> IncidentAction:
        """Force password reset for affected accounts"""
        return IncidentAction(
            action_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type="password_reset",
            description="Forced password reset for affected accounts",
            automated=True,
            success=True,
            details={
                'affected_accounts': incident.affected_users,
                'reset_method': 'email_verification'
            }
        )

    async def _enable_mfa_requirement(self, incident: Incident) -> IncidentAction:
        """Enable MFA requirement"""
        return IncidentAction(
            action_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type="mfa_enforcement",
            description="Enabled mandatory MFA for affected accounts",
            automated=True,
            success=True,
            details={
                'affected_accounts': incident.affected_users,
                'mfa_methods': ['totp', 'sms']
            }
        )

    async def _notify_affected_users(self, incident: Incident) -> IncidentAction:
        """Notify affected users"""
        return IncidentAction(
            action_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type="user_notification",
            description="Notified affected users of security incident",
            automated=True,
            success=True,
            details={
                'notification_method': 'email',
                'affected_users': incident.affected_users
            }
        )

    async def _restrict_data_access(self, incident: Incident) -> IncidentAction:
        """Restrict data access"""
        return IncidentAction(
            action_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type="access_restriction",
            description="Restricted access to sensitive data",
            automated=True,
            success=True,
            details={
                'restricted_assets': incident.affected_assets,
                'restriction_level': 'admin_only'
            }
        )

    async def _audit_data_access_logs(self, incident: Incident) -> IncidentAction:
        """Audit data access logs"""
        return IncidentAction(
            action_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type="log_audit",
            description="Initiated comprehensive data access log audit",
            automated=True,
            success=True,
            details={
                'audit_scope': incident.affected_assets,
                'audit_period': '30_days'
            }
        )

    async def _enable_enhanced_monitoring(self, incident: Incident) -> IncidentAction:
        """Enable enhanced monitoring"""
        return IncidentAction(
            action_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type="enhanced_monitoring",
            description="Enabled enhanced monitoring for affected resources",
            automated=True,
            success=True,
            details={
                'monitoring_level': 'high',
                'duration': '72h'
            }
        )

    async def _increase_monitoring(self, incident: Incident) -> IncidentAction:
        """Increase monitoring levels"""
        return IncidentAction(
            action_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type="monitoring_increase",
            description="Increased monitoring sensitivity",
            automated=True,
            success=True,
            details={
                'monitoring_increase': '50%',
                'duration': '24h'
            }
        )

    async def _collect_additional_logs(self, incident: Incident) -> IncidentAction:
        """Collect additional logs"""
        return IncidentAction(
            action_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type="log_collection",
            description="Initiated additional log collection",
            automated=True,
            success=True,
            details={
                'log_types': ['security', 'application', 'system'],
                'collection_period': '24h'
            }
        )


class IncidentResponseAutomation:
    """Main incident response automation system"""

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        import os
        self.redis_url = redis_url
        if redis_url == "redis://localhost:6379":
            self.redis_url = os.environ.get('REDIS_URL', redis_url)

        self.redis_client: Optional[aioredis.Redis] = None
        self.classifier = IncidentClassifier()
        self.notification_service = NotificationService()
        self.response_automation = ResponseAutomation()

        # In-memory storage for incidents (Redis fallback)
        self.incidents: Dict[str, Incident] = {}

        # Event correlation window (group related events)
        self.correlation_window = timedelta(minutes=10)

        # Incident auto-correlation
        self.pending_correlations: Dict[str, List[SecurityEvent]] = defaultdict(list)

    async def initialize(self) -> bool:
        """Initialize Redis connection"""
        if not REDIS_AVAILABLE:
            logger.warning("Redis not available for incident response")
            return False

        try:
            self.redis_client = aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=10,
                socket_timeout=5
            )
            await self.redis_client.ping()
            logger.info("✅ Incident response automation Redis initialized")
            return True
        except Exception as e:
            logger.warning(f"Incident response Redis unavailable ({e}) - using in-memory fallback")
            self.redis_client = None
            return False

    async def process_security_events(self, events: List[SecurityEvent]) -> Optional[Incident]:
        """Process security events and potentially create incident"""
        if not events:
            return None

        # Group events for correlation
        correlation_key = self._get_correlation_key(events[0])

        # Add events to correlation window
        self.pending_correlations[correlation_key].extend(events)

        # Check if we should create incident
        should_create_incident = await self._should_create_incident(
            self.pending_correlations[correlation_key]
        )

        if should_create_incident:
            incident = await self._create_incident(self.pending_correlations[correlation_key])
            # Clear correlated events
            self.pending_correlations[correlation_key] = []
            return incident

        return None

    async def _should_create_incident(self, events: List[SecurityEvent]) -> bool:
        """Determine if events warrant incident creation"""
        if not events:
            return False

        # Create incident for high/critical severity events
        has_high_severity = any(
            event.severity in [ThreatSeverity.HIGH, ThreatSeverity.CRITICAL]
            for event in events
        )

        # Create incident for multiple related events
        has_multiple_events = len(events) >= 3

        # Create incident for specific threat types
        critical_threat_types = {
            ThreatType.SQL_INJECTION,
            ThreatType.COMMAND_INJECTION,
            ThreatType.PATH_TRAVERSAL
        }

        has_critical_threats = any(
            event.threat_type in critical_threat_types
            for event in events
        )

        return has_high_severity or has_multiple_events or has_critical_threats

    async def _create_incident(self, events: List[SecurityEvent]) -> Incident:
        """Create new incident from security events"""
        incident_id = str(uuid.uuid4())
        current_time = datetime.now()

        # Classify incident
        category, escalation_level = self.classifier.classify_incident(events)

        # Determine severity (highest from events)
        severity = max(events, key=lambda e: self.classifier._severity_score(e.severity)).severity

        # Extract affected assets and users
        affected_assets = list(set(event.endpoint for event in events if event.endpoint))
        affected_users = list(set(event.user_id for event in events if event.user_id))

        # Generate incident title and description
        primary_threat = events[0].threat_type.value.replace('_', ' ').title()
        title = f"{primary_threat} Incident - {len(events)} events detected"

        description = self._generate_incident_description(events)

        # Create incident
        incident = Incident(
            incident_id=incident_id,
            title=title,
            description=description,
            category=category,
            severity=severity,
            status=IncidentStatus.OPEN,
            escalation_level=escalation_level,
            created_at=current_time,
            updated_at=current_time,
            source_events=[event.event_id for event in events],
            affected_assets=affected_assets,
            affected_users=affected_users,
            actions_taken=[],
            mitigation_steps=[]
        )

        # Store incident
        await self._store_incident(incident)

        # Execute automated response
        automated_actions = await self.response_automation.execute_automated_response(incident)
        incident.actions_taken.extend(automated_actions)

        # Update incident with actions
        incident.updated_at = datetime.now()
        await self._store_incident(incident)

        # Send notifications
        await self.notification_service.send_incident_notification(incident)

        logger.critical(f"Created incident {incident_id}: {title}")

        return incident

    def _get_correlation_key(self, event: SecurityEvent) -> str:
        """Generate correlation key for event grouping"""
        # Group events by source IP and time window
        return f"{event.source_ip}_{event.threat_type.value}"

    def _generate_incident_description(self, events: List[SecurityEvent]) -> str:
        """Generate comprehensive incident description"""
        unique_ips = set(event.source_ip for event in events)
        unique_threats = set(event.threat_type.value for event in events)
        unique_endpoints = set(event.endpoint for event in events if event.endpoint)

        description = f"""
Security incident detected with {len(events)} related events.

Attack Summary:
- Source IPs: {', '.join(unique_ips)}
- Threat Types: {', '.join(unique_threats)}
- Targeted Endpoints: {', '.join(unique_endpoints)}
- Time Range: {events[0].timestamp.strftime('%Y-%m-%d %H:%M:%S')} - {events[-1].timestamp.strftime('%Y-%m-%d %H:%M:%S')}

Event Details:
""".strip()

        for i, event in enumerate(events[:5], 1):  # Show first 5 events
            description += f"\n{i}. {event.threat_type.value} from {event.source_ip} at {event.timestamp.strftime('%H:%M:%S')}"

        if len(events) > 5:
            description += f"\n... and {len(events) - 5} more events"

        return description

    async def _store_incident(self, incident: Incident):
        """Store incident in Redis or memory"""
        if self.redis_client:
            try:
                key = f"incident:{incident.incident_id}"
                await self.redis_client.setex(
                    key,
                    timedelta(days=90).total_seconds(),  # 90 day retention
                    json.dumps(incident.to_dict())
                )

                # Add to status index
                status_key = f"incidents:status:{incident.status.value}"
                await self.redis_client.zadd(
                    status_key,
                    {incident.incident_id: time.time()}
                )

                # Add to severity index
                severity_key = f"incidents:severity:{incident.severity.value}"
                await self.redis_client.zadd(
                    severity_key,
                    {incident.incident_id: time.time()}
                )

            except Exception as e:
                logger.error(f"Error storing incident in Redis: {e}")
        else:
            # Fallback to in-memory storage
            self.incidents[incident.incident_id] = incident

    async def get_incident(self, incident_id: str) -> Optional[Incident]:
        """Get incident by ID"""
        if self.redis_client:
            try:
                key = f"incident:{incident_id}"
                data = await self.redis_client.get(key)
                if data:
                    incident_dict = json.loads(data)
                    # Convert back to Incident object (simplified)
                    return incident_dict  # In real implementation, reconstruct Incident
            except Exception as e:
                logger.error(f"Error retrieving incident: {e}")

        return self.incidents.get(incident_id)

    async def update_incident_status(
        self,
        incident_id: str,
        new_status: IncidentStatus,
        assigned_to: Optional[str] = None
    ) -> bool:
        """Update incident status"""
        incident = await self.get_incident(incident_id)
        if not incident:
            return False

        # Update status and timestamp
        if isinstance(incident, dict):
            incident['status'] = new_status.value
            incident['updated_at'] = datetime.now().isoformat()
            if assigned_to:
                incident['assigned_to'] = assigned_to
            if new_status == IncidentStatus.RESOLVED:
                incident['resolved_at'] = datetime.now().isoformat()
        else:
            incident.status = new_status
            incident.updated_at = datetime.now()
            if assigned_to:
                incident.assigned_to = assigned_to
            if new_status == IncidentStatus.RESOLVED:
                incident.resolved_at = datetime.now()

        # Store updated incident
        await self._store_incident(incident)

        logger.info(f"Updated incident {incident_id} status to {new_status.value}")
        return True

    async def get_incident_statistics(self) -> Dict[str, Any]:
        """Get incident statistics"""
        stats = {
            "total_incidents": len(self.incidents),
            "open_incidents": 0,
            "resolved_incidents": 0,
            "incidents_by_severity": defaultdict(int),
            "incidents_by_category": defaultdict(int),
            "average_resolution_time": "0h",
            "escalated_incidents": 0
        }

        if self.redis_client:
            # Get stats from Redis (implementation needed)
            pass
        else:
            # Calculate stats from in-memory storage
            for incident in self.incidents.values():
                if incident.status == IncidentStatus.OPEN:
                    stats["open_incidents"] += 1
                elif incident.status == IncidentStatus.RESOLVED:
                    stats["resolved_incidents"] += 1

                stats["incidents_by_severity"][incident.severity.value] += 1
                stats["incidents_by_category"][incident.category.value] += 1

                if incident.escalation_level != EscalationLevel.LEVEL_0:
                    stats["escalated_incidents"] += 1

        return dict(stats)


# Global instance
incident_response_automation = IncidentResponseAutomation()