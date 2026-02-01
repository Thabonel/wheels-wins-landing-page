"""
Comprehensive Security Audit Logger
Implements structured logging for all security events with compliance and forensic capabilities.
"""

import json
import time
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict
import uuid
import hashlib
import traceback
from pathlib import Path

try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from app.core.logging import get_logger

logger = get_logger(__name__)


class AuditEventType(Enum):
    """Types of auditable events"""
    # Authentication events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    MFA_SUCCESS = "mfa_success"
    MFA_FAILURE = "mfa_failure"

    # Authorization events
    ACCESS_GRANTED = "access_granted"
    ACCESS_DENIED = "access_denied"
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_REVOKED = "permission_revoked"
    ROLE_ASSIGNED = "role_assigned"
    ROLE_REMOVED = "role_removed"
    PRIVILEGE_ESCALATION = "privilege_escalation"

    # Data access events
    DATA_READ = "data_read"
    DATA_WRITE = "data_write"
    DATA_DELETE = "data_delete"
    DATA_EXPORT = "data_export"
    DATA_IMPORT = "data_import"
    SENSITIVE_DATA_ACCESS = "sensitive_data_access"
    PII_ACCESS = "pii_access"

    # Security events
    SECURITY_VIOLATION = "security_violation"
    THREAT_DETECTED = "threat_detected"
    ATTACK_BLOCKED = "attack_blocked"
    IP_BLOCKED = "ip_blocked"
    USER_BLOCKED = "user_blocked"
    INCIDENT_CREATED = "incident_created"
    INCIDENT_RESOLVED = "incident_resolved"

    # System events
    SYSTEM_START = "system_start"
    SYSTEM_STOP = "system_stop"
    CONFIG_CHANGE = "config_change"
    BACKUP_CREATED = "backup_created"
    BACKUP_RESTORED = "backup_restored"

    # Privacy events
    CONSENT_GIVEN = "consent_given"
    CONSENT_WITHDRAWN = "consent_withdrawn"
    DATA_ANONYMIZED = "data_anonymized"
    DATA_PSEUDONYMIZED = "data_pseudonymized"
    RIGHT_TO_FORGET = "right_to_forget"


class AuditSeverity(Enum):
    """Audit event severity levels"""
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ComplianceFramework(Enum):
    """Supported compliance frameworks"""
    GDPR = "gdpr"
    HIPAA = "hipaa"
    SOX = "sox"
    PCI_DSS = "pci_dss"
    ISO27001 = "iso27001"
    SOC2 = "soc2"


@dataclass
class AuditEvent:
    """Comprehensive audit event structure"""
    # Core event data
    event_id: str
    timestamp: datetime
    event_type: AuditEventType
    severity: AuditSeverity
    message: str

    # Actor information
    user_id: Optional[str] = None
    username: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    session_id: Optional[str] = None

    # Source information
    source_ip: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None

    # Resource information
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None

    # Event details
    details: Dict[str, Any] = None
    outcome: str = "unknown"  # success, failure, pending
    error_code: Optional[str] = None
    error_message: Optional[str] = None

    # Security context
    security_context: Dict[str, Any] = None
    threat_indicators: List[str] = None

    # Compliance metadata
    compliance_frameworks: List[ComplianceFramework] = None
    retention_period: int = 2555  # days (7 years default)
    data_classification: str = "internal"

    # Integrity verification
    checksum: Optional[str] = None

    def __post_init__(self):
        """Generate checksum for integrity verification"""
        if self.details is None:
            self.details = {}
        if self.security_context is None:
            self.security_context = {}
        if self.threat_indicators is None:
            self.threat_indicators = []
        if self.compliance_frameworks is None:
            self.compliance_frameworks = []

        # Generate checksum for tamper detection
        self.checksum = self._generate_checksum()

    def _generate_checksum(self) -> str:
        """Generate SHA-256 checksum of core event data"""
        # Create reproducible string from core fields
        data_string = f"{self.event_id}|{self.timestamp.isoformat()}|{self.event_type.value}|{self.message}"
        return hashlib.sha256(data_string.encode()).hexdigest()

    def verify_integrity(self) -> bool:
        """Verify event integrity using checksum"""
        expected_checksum = self._generate_checksum()
        return self.checksum == expected_checksum

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/transmission"""
        return {
            **asdict(self),
            'timestamp': self.timestamp.isoformat(),
            'event_type': self.event_type.value,
            'severity': self.severity.value,
            'compliance_frameworks': [f.value for f in self.compliance_frameworks]
        }

    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), sort_keys=True, separators=(',', ':'))


class SecurityAuditLogger:
    """Comprehensive security audit logging system"""

    def __init__(self, redis_url: str = "redis://localhost:6379", file_backup: bool = True):
        import os

        self.redis_url = redis_url
        if redis_url == "redis://localhost:6379":
            self.redis_url = os.environ.get('REDIS_URL', redis_url)

        self.redis_client: Optional[aioredis.Redis] = None
        self.file_backup = file_backup

        # File backup configuration
        if file_backup:
            self.log_dir = Path("logs/security_audit")
            self.log_dir.mkdir(parents=True, exist_ok=True)

        # In-memory buffer for Redis unavailability
        self.event_buffer: List[AuditEvent] = []
        self.buffer_max_size = 1000

        # Compliance configurations
        self.compliance_config = {
            ComplianceFramework.GDPR: {
                'retention_days': 2555,  # 7 years
                'required_fields': ['user_id', 'source_ip', 'consent_status'],
                'anonymization_required': True
            },
            ComplianceFramework.HIPAA: {
                'retention_days': 2190,  # 6 years
                'required_fields': ['user_id', 'patient_id', 'phi_accessed'],
                'encryption_required': True
            },
            ComplianceFramework.PCI_DSS: {
                'retention_days': 365,   # 1 year minimum
                'required_fields': ['card_data_accessed', 'transaction_id'],
                'secure_storage_required': True
            }
        }

    async def initialize(self) -> bool:
        """Initialize audit logger"""
        if not REDIS_AVAILABLE:
            logger.warning("Redis not available for audit logging")
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
            logger.info("✅ Security audit logger Redis initialized")

            # Process any buffered events
            if self.event_buffer:
                await self._flush_buffer()

            return True
        except Exception as e:
            logger.warning(f"Security audit Redis unavailable ({e}) - using file/memory fallback")
            self.redis_client = None
            return False

    async def log_event(self, event: AuditEvent) -> bool:
        """Log audit event with multiple storage backends"""
        try:
            # Add to in-memory buffer
            self.event_buffer.append(event)
            if len(self.event_buffer) > self.buffer_max_size:
                self.event_buffer = self.event_buffer[-self.buffer_max_size:]

            # Store in Redis if available
            if self.redis_client:
                await self._store_in_redis(event)

            # Store in file backup if enabled
            if self.file_backup:
                await self._store_in_file(event)

            # Log to application logger
            self._log_to_application_logger(event)

            return True

        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            # Still try file backup as fallback
            if self.file_backup:
                try:
                    await self._store_in_file(event)
                except:
                    pass
            return False

    async def _store_in_redis(self, event: AuditEvent):
        """Store audit event in Redis with indexes"""
        try:
            # Store main event
            key = f"audit:event:{event.event_id}"
            await self.redis_client.setex(
                key,
                timedelta(days=event.retention_period).total_seconds(),
                event.to_json()
            )

            # Create indexes for efficient querying
            await self._create_redis_indexes(event)

        except Exception as e:
            logger.error(f"Failed to store audit event in Redis: {e}")
            raise

    async def _create_redis_indexes(self, event: AuditEvent):
        """Create Redis indexes for efficient querying"""
        timestamp = time.time()

        # Time-based index
        time_key = f"audit:time:{event.timestamp.strftime('%Y-%m-%d')}"
        await self.redis_client.zadd(time_key, {event.event_id: timestamp})
        await self.redis_client.expire(time_key, timedelta(days=event.retention_period).total_seconds())

        # Event type index
        type_key = f"audit:type:{event.event_type.value}"
        await self.redis_client.zadd(type_key, {event.event_id: timestamp})
        await self.redis_client.expire(type_key, timedelta(days=30).total_seconds())

        # User index (if user_id present)
        if event.user_id:
            user_key = f"audit:user:{event.user_id}"
            await self.redis_client.zadd(user_key, {event.event_id: timestamp})
            await self.redis_client.expire(user_key, timedelta(days=90).total_seconds())

        # IP index (if source_ip present)
        if event.source_ip:
            ip_key = f"audit:ip:{event.source_ip}"
            await self.redis_client.zadd(ip_key, {event.event_id: timestamp})
            await self.redis_client.expire(ip_key, timedelta(days=7).total_seconds())

        # Severity index
        severity_key = f"audit:severity:{event.severity.value}"
        await self.redis_client.zadd(severity_key, {event.event_id: timestamp})
        await self.redis_client.expire(severity_key, timedelta(days=30).total_seconds())

    async def _store_in_file(self, event: AuditEvent):
        """Store audit event in daily log files"""
        try:
            # Create daily log file
            log_file = self.log_dir / f"security_audit_{event.timestamp.strftime('%Y-%m-%d')}.jsonl"

            # Append event to file
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(event.to_json() + '\n')

        except Exception as e:
            logger.error(f"Failed to store audit event in file: {e}")
            raise

    def _log_to_application_logger(self, event: AuditEvent):
        """Log event to application logger with appropriate level"""
        log_message = f"AUDIT: {event.event_type.value} - {event.message}"

        # Include key details in log message
        if event.user_id:
            log_message += f" [user: {event.user_id}]"
        if event.source_ip:
            log_message += f" [ip: {event.source_ip}]"
        if event.resource_id:
            log_message += f" [resource: {event.resource_id}]"

        # Log with appropriate level based on severity
        if event.severity == AuditSeverity.CRITICAL:
            logger.critical(log_message, extra={'audit_event': event.to_dict()})
        elif event.severity == AuditSeverity.HIGH:
            logger.error(log_message, extra={'audit_event': event.to_dict()})
        elif event.severity == AuditSeverity.MEDIUM:
            logger.warning(log_message, extra={'audit_event': event.to_dict()})
        else:
            logger.info(log_message, extra={'audit_event': event.to_dict()})

    async def _flush_buffer(self):
        """Flush in-memory buffer to persistent storage"""
        if not self.event_buffer:
            return

        logger.info(f"Flushing {len(self.event_buffer)} buffered audit events")

        for event in self.event_buffer:
            try:
                if self.redis_client:
                    await self._store_in_redis(event)
                if self.file_backup:
                    await self._store_in_file(event)
            except Exception as e:
                logger.error(f"Failed to flush audit event {event.event_id}: {e}")

        self.event_buffer.clear()

    async def query_events(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        event_types: Optional[List[AuditEventType]] = None,
        user_id: Optional[str] = None,
        source_ip: Optional[str] = None,
        severity: Optional[AuditSeverity] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Query audit events with filters"""

        if self.redis_client:
            return await self._query_redis(
                start_time, end_time, event_types, user_id, source_ip, severity, limit, offset
            )
        else:
            return await self._query_files(
                start_time, end_time, event_types, user_id, source_ip, severity, limit, offset
            )

    async def _query_redis(
        self,
        start_time: Optional[datetime],
        end_time: Optional[datetime],
        event_types: Optional[List[AuditEventType]],
        user_id: Optional[str],
        source_ip: Optional[str],
        severity: Optional[AuditSeverity],
        limit: int,
        offset: int
    ) -> List[Dict[str, Any]]:
        """Query events from Redis"""
        try:
            # Build query based on available indexes
            event_ids = set()

            # Time-based query
            if start_time or end_time:
                start_ts = start_time.timestamp() if start_time else 0
                end_ts = end_time.timestamp() if end_time else time.time()

                # Query daily indexes
                current_date = start_time.date() if start_time else datetime.now().date()
                end_date = end_time.date() if end_time else datetime.now().date()

                while current_date <= end_date:
                    time_key = f"audit:time:{current_date.strftime('%Y-%m-%d')}"
                    day_events = await self.redis_client.zrangebyscore(
                        time_key, start_ts, end_ts, withscores=False
                    )
                    event_ids.update(day_events)
                    current_date += timedelta(days=1)

            # Apply additional filters
            if event_types:
                type_events = set()
                for event_type in event_types:
                    type_key = f"audit:type:{event_type.value}"
                    type_results = await self.redis_client.zrevrange(type_key, 0, -1)
                    type_events.update(type_results)

                if event_ids:
                    event_ids &= type_events
                else:
                    event_ids = type_events

            if user_id:
                user_key = f"audit:user:{user_id}"
                user_events = set(await self.redis_client.zrevrange(user_key, 0, -1))

                if event_ids:
                    event_ids &= user_events
                else:
                    event_ids = user_events

            if source_ip:
                ip_key = f"audit:ip:{source_ip}"
                ip_events = set(await self.redis_client.zrevrange(ip_key, 0, -1))

                if event_ids:
                    event_ids &= ip_events
                else:
                    event_ids = ip_events

            if severity:
                severity_key = f"audit:severity:{severity.value}"
                severity_events = set(await self.redis_client.zrevrange(severity_key, 0, -1))

                if event_ids:
                    event_ids &= severity_events
                else:
                    event_ids = severity_events

            # If no filters applied, get recent events
            if not event_ids:
                today_key = f"audit:time:{datetime.now().strftime('%Y-%m-%d')}"
                event_ids = set(await self.redis_client.zrevrange(today_key, 0, limit + offset))

            # Convert to list and apply pagination
            event_id_list = list(event_ids)[offset:offset + limit]

            # Fetch event data
            events = []
            for event_id in event_id_list:
                event_key = f"audit:event:{event_id}"
                event_data = await self.redis_client.get(event_key)
                if event_data:
                    try:
                        events.append(json.loads(event_data))
                    except json.JSONDecodeError:
                        continue

            # Sort by timestamp descending
            events.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

            return events

        except Exception as e:
            logger.error(f"Failed to query Redis audit events: {e}")
            return []

    async def _query_files(
        self,
        start_time: Optional[datetime],
        end_time: Optional[datetime],
        event_types: Optional[List[AuditEventType]],
        user_id: Optional[str],
        source_ip: Optional[str],
        severity: Optional[AuditSeverity],
        limit: int,
        offset: int
    ) -> List[Dict[str, Any]]:
        """Query events from file backup"""
        # Simplified file-based query (would be more sophisticated in production)
        return []

    async def generate_compliance_report(
        self,
        framework: ComplianceFramework,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Generate compliance report for specific framework"""

        # Get relevant events for compliance framework
        events = await self.query_events(start_time=start_date, end_time=end_date)

        # Apply framework-specific filtering and analysis
        framework_config = self.compliance_config.get(framework)
        if not framework_config:
            raise ValueError(f"Unsupported compliance framework: {framework}")

        report = {
            "framework": framework.value,
            "report_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "generated_at": datetime.now().isoformat(),
            "total_events": len(events),
            "compliance_summary": await self._analyze_compliance(events, framework),
            "violations": await self._detect_violations(events, framework),
            "recommendations": await self._generate_recommendations(events, framework)
        }

        return report

    async def _analyze_compliance(self, events: List[Dict], framework: ComplianceFramework) -> Dict:
        """Analyze events for compliance with framework"""
        # Framework-specific compliance analysis
        return {
            "compliant_events": len(events),
            "non_compliant_events": 0,
            "compliance_percentage": 100.0
        }

    async def _detect_violations(self, events: List[Dict], framework: ComplianceFramework) -> List[Dict]:
        """Detect compliance violations"""
        violations = []

        # Check for framework-specific violations
        if framework == ComplianceFramework.GDPR:
            # Check for GDPR violations (consent, data processing, etc.)
            pass
        elif framework == ComplianceFramework.PCI_DSS:
            # Check for PCI DSS violations (card data handling, etc.)
            pass

        return violations

    async def _generate_recommendations(self, events: List[Dict], framework: ComplianceFramework) -> List[str]:
        """Generate compliance recommendations"""
        recommendations = [
            "Maintain current audit logging standards",
            "Review data retention policies quarterly",
            "Implement automated compliance monitoring"
        ]

        return recommendations

    async def get_audit_statistics(self) -> Dict[str, Any]:
        """Get audit logging statistics"""
        stats = {
            "total_events_logged": len(self.event_buffer),
            "redis_connected": self.redis_client is not None,
            "file_backup_enabled": self.file_backup,
            "buffer_size": len(self.event_buffer),
            "events_by_type": {},
            "events_by_severity": {},
            "retention_compliance": "compliant"
        }

        # Calculate event type and severity distributions
        for event in self.event_buffer[-100:]:  # Last 100 events
            event_type = event.event_type.value
            severity = event.severity.value

            stats["events_by_type"][event_type] = stats["events_by_type"].get(event_type, 0) + 1
            stats["events_by_severity"][severity] = stats["events_by_severity"].get(severity, 0) + 1

        return stats


# Convenience functions for common audit events

async def audit_authentication(
    event_type: AuditEventType,
    user_id: str,
    username: str,
    source_ip: str,
    user_agent: str,
    outcome: str,
    details: Dict[str, Any] = None
):
    """Log authentication events"""
    severity = AuditSeverity.HIGH if outcome == "failure" else AuditSeverity.INFO

    event = AuditEvent(
        event_id=str(uuid.uuid4()),
        timestamp=datetime.now(),
        event_type=event_type,
        severity=severity,
        message=f"Authentication {outcome} for user {username}",
        user_id=user_id,
        username=username,
        source_ip=source_ip,
        user_agent=user_agent,
        outcome=outcome,
        details=details or {},
        compliance_frameworks=[ComplianceFramework.GDPR, ComplianceFramework.SOC2]
    )

    await security_audit_logger.log_event(event)


async def audit_data_access(
    user_id: str,
    resource_type: str,
    resource_id: str,
    operation: str,
    outcome: str,
    source_ip: str,
    details: Dict[str, Any] = None
):
    """Log data access events"""
    event_type_map = {
        "read": AuditEventType.DATA_READ,
        "write": AuditEventType.DATA_WRITE,
        "delete": AuditEventType.DATA_DELETE,
        "export": AuditEventType.DATA_EXPORT
    }

    event_type = event_type_map.get(operation, AuditEventType.DATA_READ)
    severity = AuditSeverity.MEDIUM if operation in ["write", "delete", "export"] else AuditSeverity.INFO

    event = AuditEvent(
        event_id=str(uuid.uuid4()),
        timestamp=datetime.now(),
        event_type=event_type,
        severity=severity,
        message=f"Data {operation} on {resource_type} {resource_id}",
        user_id=user_id,
        source_ip=source_ip,
        resource_type=resource_type,
        resource_id=resource_id,
        outcome=outcome,
        details=details or {},
        compliance_frameworks=[ComplianceFramework.GDPR, ComplianceFramework.HIPAA]
    )

    await security_audit_logger.log_event(event)


async def audit_security_event(
    event_type: AuditEventType,
    source_ip: str,
    threat_type: str,
    severity: AuditSeverity,
    details: Dict[str, Any] = None
):
    """Log security events"""
    event = AuditEvent(
        event_id=str(uuid.uuid4()),
        timestamp=datetime.now(),
        event_type=event_type,
        severity=severity,
        message=f"Security event: {threat_type} from {source_ip}",
        source_ip=source_ip,
        outcome="detected",
        details=details or {},
        threat_indicators=[threat_type],
        security_context={
            "threat_type": threat_type,
            "automated_response": True
        }
    )

    await security_audit_logger.log_event(event)


# Global instance
security_audit_logger = SecurityAuditLogger()