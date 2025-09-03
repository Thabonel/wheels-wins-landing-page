"""
PAM Comprehensive Logging & Alerting System - Phase 5
Advanced structured logging, alerting, and audit trail system
"""

import asyncio
import json
import logging
import traceback
import threading
import queue
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from typing import Dict, Any, List, Optional, Callable, Union
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
import uuid
from collections import defaultdict, deque
from pathlib import Path

import redis
import structlog
from structlog.contextvars import clear_contextvars, bind_contextvars
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration


class LogLevel(Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertChannel(Enum):
    EMAIL = "email"
    WEBHOOK = "webhook"
    SLACK = "slack"
    SMS = "sms"
    CONSOLE = "console"


class LogCategory(Enum):
    SECURITY = "security"
    PERFORMANCE = "performance"
    BUSINESS = "business"
    SYSTEM = "system"
    USER_ACTION = "user_action"
    API = "api"
    DATABASE = "database"
    AGENT = "agent"
    ERROR = "error"
    AUDIT = "audit"


@dataclass
class LogEntry:
    id: str
    timestamp: datetime
    level: LogLevel
    category: LogCategory
    component: str
    message: str
    context: Dict[str, Any] = field(default_factory=dict)
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    trace_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AlertRule:
    id: str
    name: str
    description: str
    enabled: bool
    conditions: Dict[str, Any]
    channels: List[AlertChannel]
    severity: str
    cooldown_minutes: int = 5
    max_alerts_per_hour: int = 10


@dataclass
class Alert:
    id: str
    rule_id: str
    severity: str
    title: str
    message: str
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    context: Dict[str, Any] = field(default_factory=dict)
    channels_notified: List[AlertChannel] = field(default_factory=list)


class StructuredLogger:
    """Enhanced structured logger with context management"""
    
    def __init__(self, name: str, level: LogLevel = LogLevel.INFO):
        self.name = name
        self.level = level
        
        # Configure structlog
        structlog.configure(
            processors=[
                structlog.contextvars.merge_contextvars,
                structlog.processors.TimeStamper(fmt="ISO"),
                structlog.processors.add_log_level,
                structlog.processors.JSONRenderer()
            ],
            wrapper_class=structlog.make_filtering_bound_logger(
                getattr(logging, level.value.upper())
            ),
            logger_factory=structlog.WriteLoggerFactory(),
            context_class=dict,
            cache_logger_on_first_use=True
        )
        
        self.logger = structlog.get_logger(name)
    
    def with_context(self, **kwargs) -> 'StructuredLogger':
        """Create a new logger with additional context"""
        new_logger = StructuredLogger(self.name, self.level)
        new_logger.logger = self.logger.bind(**kwargs)
        return new_logger
    
    def debug(self, message: str, **kwargs):
        """Log debug message"""
        self.logger.debug(message, **kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message"""
        self.logger.info(message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self.logger.warning(message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message"""
        self.logger.error(message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical message"""
        self.logger.critical(message, **kwargs)
    
    def exception(self, message: str, **kwargs):
        """Log exception with traceback"""
        kwargs['traceback'] = traceback.format_exc()
        self.logger.error(message, **kwargs)


class AlertManager:
    """Advanced alerting system with multiple channels and rules"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.from_url("redis://localhost:6379/6")
        
        # Alert tracking
        self.alert_rules: Dict[str, AlertRule] = {}
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: deque = deque(maxlen=10000)
        
        # Alert channels
        self.channels: Dict[AlertChannel, Callable] = {
            AlertChannel.EMAIL: self._send_email_alert,
            AlertChannel.WEBHOOK: self._send_webhook_alert,
            AlertChannel.SLACK: self._send_slack_alert,
            AlertChannel.CONSOLE: self._send_console_alert
        }
        
        # Rate limiting for alerts
        self.alert_counters: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.cooldown_tracker: Dict[str, datetime] = {}
        
        # Configuration
        self.config = {
            "email": {
                "smtp_server": "smtp.gmail.com",
                "smtp_port": 587,
                "username": "",
                "password": "",
                "from_email": "",
                "to_emails": []
            },
            "slack": {
                "webhook_url": "",
                "channel": "#alerts"
            },
            "webhook": {
                "urls": []
            }
        }
        
        self._initialize_default_rules()
        self.logger = StructuredLogger("AlertManager")
    
    def _initialize_default_rules(self):
        """Initialize default alert rules"""
        
        default_rules = [
            AlertRule(
                id="high_error_rate",
                name="High Error Rate",
                description="Alert when error rate exceeds threshold",
                enabled=True,
                conditions={
                    "error_rate": {"operator": ">", "value": 0.05},
                    "time_window": "5m",
                    "minimum_requests": 10
                },
                channels=[AlertChannel.EMAIL, AlertChannel.SLACK],
                severity="high",
                cooldown_minutes=10,
                max_alerts_per_hour=6
            ),
            AlertRule(
                id="critical_system_error",
                name="Critical System Error",
                description="Alert on critical system errors",
                enabled=True,
                conditions={
                    "log_level": "critical",
                    "component": ["database", "security", "auth"]
                },
                channels=[AlertChannel.EMAIL, AlertChannel.WEBHOOK],
                severity="critical",
                cooldown_minutes=0,
                max_alerts_per_hour=50
            ),
            AlertRule(
                id="security_incident",
                name="Security Incident",
                description="Alert on security incidents",
                enabled=True,
                conditions={
                    "category": "security",
                    "severity": ["high", "critical"]
                },
                channels=[AlertChannel.EMAIL, AlertChannel.SLACK],
                severity="critical",
                cooldown_minutes=1,
                max_alerts_per_hour=20
            ),
            AlertRule(
                id="performance_degradation",
                name="Performance Degradation",
                description="Alert on performance issues",
                enabled=True,
                conditions={
                    "response_time": {"operator": ">", "value": 5000},  # 5 seconds
                    "time_window": "5m"
                },
                channels=[AlertChannel.SLACK],
                severity="medium",
                cooldown_minutes=15,
                max_alerts_per_hour=4
            ),
            AlertRule(
                id="memory_usage_high",
                name="High Memory Usage",
                description="Alert when memory usage is high",
                enabled=True,
                conditions={
                    "memory_usage": {"operator": ">", "value": 85},  # 85%
                    "time_window": "5m"
                },
                channels=[AlertChannel.WEBHOOK],
                severity="high",
                cooldown_minutes=30,
                max_alerts_per_hour=2
            )
        ]
        
        for rule in default_rules:
            self.alert_rules[rule.id] = rule
    
    def add_alert_rule(self, rule: AlertRule):
        """Add a new alert rule"""
        self.alert_rules[rule.id] = rule
        self.logger.info(f"Added alert rule: {rule.name}", rule_id=rule.id)
    
    def remove_alert_rule(self, rule_id: str) -> bool:
        """Remove an alert rule"""
        if rule_id in self.alert_rules:
            rule = self.alert_rules.pop(rule_id)
            self.logger.info(f"Removed alert rule: {rule.name}", rule_id=rule_id)
            return True
        return False
    
    async def evaluate_alerts(self, log_entry: LogEntry):
        """Evaluate alert rules against a log entry"""
        
        for rule in self.alert_rules.values():
            if not rule.enabled:
                continue
            
            if self._should_alert(rule, log_entry):
                await self._trigger_alert(rule, log_entry)
    
    def _should_alert(self, rule: AlertRule, log_entry: LogEntry) -> bool:
        """Check if a log entry should trigger an alert"""
        
        # Check cooldown
        if rule.id in self.cooldown_tracker:
            if datetime.utcnow() - self.cooldown_tracker[rule.id] < timedelta(minutes=rule.cooldown_minutes):
                return False
        
        # Check rate limiting
        current_hour = datetime.utcnow().hour
        if self.alert_counters[rule.id][current_hour] >= rule.max_alerts_per_hour:
            return False
        
        # Evaluate conditions
        conditions = rule.conditions
        
        # Log level check
        if "log_level" in conditions:
            required_level = conditions["log_level"]
            if isinstance(required_level, str):
                if log_entry.level.value != required_level:
                    return False
            elif isinstance(required_level, list):
                if log_entry.level.value not in required_level:
                    return False
        
        # Category check
        if "category" in conditions:
            required_category = conditions["category"]
            if isinstance(required_category, str):
                if log_entry.category.value != required_category:
                    return False
            elif isinstance(required_category, list):
                if log_entry.category.value not in required_category:
                    return False
        
        # Component check
        if "component" in conditions:
            required_components = conditions["component"]
            if isinstance(required_components, str):
                if log_entry.component != required_components:
                    return False
            elif isinstance(required_components, list):
                if log_entry.component not in required_components:
                    return False
        
        # Custom metric checks (would integrate with monitoring system)
        metric_conditions = ["error_rate", "response_time", "memory_usage"]
        for metric in metric_conditions:
            if metric in conditions:
                # This would check against actual metrics
                # For now, we'll assume the condition is met if the metric is in context
                if metric not in log_entry.context:
                    continue
                
                condition = conditions[metric]
                value = log_entry.context[metric]
                operator = condition["operator"]
                threshold = condition["value"]
                
                if operator == ">" and value <= threshold:
                    return False
                elif operator == "<" and value >= threshold:
                    return False
                elif operator == "==" and value != threshold:
                    return False
        
        return True
    
    async def _trigger_alert(self, rule: AlertRule, log_entry: LogEntry):
        """Trigger an alert"""
        
        alert_id = str(uuid.uuid4())
        
        alert = Alert(
            id=alert_id,
            rule_id=rule.id,
            severity=rule.severity,
            title=f"Alert: {rule.name}",
            message=f"{rule.description}\n\nTriggered by: {log_entry.message}",
            timestamp=datetime.utcnow(),
            context={
                "log_entry_id": log_entry.id,
                "component": log_entry.component,
                "user_id": log_entry.user_id,
                "log_context": log_entry.context
            }
        )
        
        self.active_alerts[alert_id] = alert
        self.alert_history.append(alert)
        
        # Update rate limiting
        current_hour = datetime.utcnow().hour
        self.alert_counters[rule.id][current_hour] += 1
        self.cooldown_tracker[rule.id] = datetime.utcnow()
        
        # Send notifications
        for channel in rule.channels:
            if channel in self.channels:
                try:
                    await self.channels[channel](alert)
                    alert.channels_notified.append(channel)
                except Exception as e:
                    self.logger.error(f"Failed to send alert via {channel.value}", error=str(e))
        
        # Store in Redis
        try:
            key = f"pam:alert:{alert_id}"
            alert_data = asdict(alert)
            alert_data["timestamp"] = alert.timestamp.isoformat()
            self.redis_client.setex(key, 86400 * 7, json.dumps(alert_data, cls=DateTimeEncoder))
        except Exception as e:
            self.logger.error("Failed to store alert in Redis", error=str(e))
        
        self.logger.warning(
            f"Alert triggered: {rule.name}",
            alert_id=alert_id,
            rule_id=rule.id,
            severity=rule.severity
        )
    
    async def _send_email_alert(self, alert: Alert):
        """Send email alert"""
        
        config = self.config["email"]
        if not config["username"] or not config["to_emails"]:
            return
        
        try:
            msg = MimeMultipart()
            msg["From"] = config["from_email"]
            msg["To"] = ", ".join(config["to_emails"])
            msg["Subject"] = f"PAM Alert: {alert.title}"
            
            body = f"""
Alert Details:
- Severity: {alert.severity}
- Time: {alert.timestamp.isoformat()}
- Message: {alert.message}

Context:
{json.dumps(alert.context, indent=2)}

Alert ID: {alert.id}
            """
            
            msg.attach(MimeText(body, "plain"))
            
            server = smtplib.SMTP(config["smtp_server"], config["smtp_port"])
            server.starttls()
            server.login(config["username"], config["password"])
            server.send_message(msg)
            server.quit()
            
        except Exception as e:
            self.logger.error("Failed to send email alert", error=str(e))
    
    async def _send_webhook_alert(self, alert: Alert):
        """Send webhook alert"""
        
        config = self.config["webhook"]
        if not config["urls"]:
            return
        
        import aiohttp
        
        payload = {
            "alert_id": alert.id,
            "severity": alert.severity,
            "title": alert.title,
            "message": alert.message,
            "timestamp": alert.timestamp.isoformat(),
            "context": alert.context
        }
        
        async with aiohttp.ClientSession() as session:
            for url in config["urls"]:
                try:
                    async with session.post(url, json=payload) as response:
                        if response.status != 200:
                            self.logger.error(f"Webhook alert failed: {response.status}")
                except Exception as e:
                    self.logger.error(f"Failed to send webhook alert to {url}", error=str(e))
    
    async def _send_slack_alert(self, alert: Alert):
        """Send Slack alert"""
        
        config = self.config["slack"]
        if not config["webhook_url"]:
            return
        
        import aiohttp
from app.utils.datetime_encoder import DateTimeEncoder
        
        color_map = {
            "low": "#36a64f",
            "medium": "#ff9500", 
            "high": "#ff0000",
            "critical": "#8b0000"
        }
        
        payload = {
            "channel": config["channel"],
            "username": "PAM Alert Bot",
            "attachments": [{
                "color": color_map.get(alert.severity, "#ff0000"),
                "title": alert.title,
                "text": alert.message,
                "fields": [
                    {"title": "Severity", "value": alert.severity, "short": True},
                    {"title": "Time", "value": alert.timestamp.strftime("%Y-%m-%d %H:%M:%S"), "short": True},
                    {"title": "Alert ID", "value": alert.id, "short": False}
                ],
                "footer": "PAM Monitoring System",
                "ts": int(alert.timestamp.timestamp())
            }]
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(config["webhook_url"], json=payload) as response:
                    if response.status != 200:
                        self.logger.error(f"Slack alert failed: {response.status}")
        except Exception as e:
            self.logger.error("Failed to send Slack alert", error=str(e))
    
    async def _send_console_alert(self, alert: Alert):
        """Send console alert"""
        print(f"\n🚨 ALERT: {alert.title}")
        print(f"Severity: {alert.severity}")
        print(f"Time: {alert.timestamp}")
        print(f"Message: {alert.message}")
        print(f"Alert ID: {alert.id}\n")
    
    def resolve_alert(self, alert_id: str) -> bool:
        """Resolve an active alert"""
        
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.resolved = True
            alert.resolved_at = datetime.utcnow()
            
            # Remove from active alerts
            del self.active_alerts[alert_id]
            
            self.logger.info(f"Alert resolved: {alert.title}", alert_id=alert_id)
            return True
        
        return False
    
    def get_active_alerts(self, severity: Optional[str] = None) -> List[Alert]:
        """Get active alerts, optionally filtered by severity"""
        
        alerts = list(self.active_alerts.values())
        
        if severity:
            alerts = [alert for alert in alerts if alert.severity == severity]
        
        return sorted(alerts, key=lambda x: x.timestamp, reverse=True)


class PAMLoggingSystem:
    """Comprehensive logging system with structured logging, alerting, and audit trails"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.from_url("redis://localhost:6379/6")
        
        # Components
        self.logger = StructuredLogger("PAMLoggingSystem")
        self.alert_manager = AlertManager(redis_client)
        
        # Log storage
        self.log_entries: deque = deque(maxlen=100000)
        self.log_queue = queue.Queue()
        
        # Audit trail
        self.audit_trail: deque = deque(maxlen=50000)
        
        # Performance tracking
        self.performance_logs: deque = deque(maxlen=10000)
        
        # Background processing
        self.processing_thread = None
        self.shutdown_event = threading.Event()
        
        # Statistics
        self.log_stats = defaultdict(int)
        
        self._start_background_processing()
        
        # Initialize Sentry integration
        self._initialize_sentry()
    
    def _initialize_sentry(self):
        """Initialize Sentry for error tracking"""
        
        try:
            sentry_logging = LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR
            )
            
            # Would use actual DSN in production
            # sentry_sdk.init(
            #     dsn="your-sentry-dsn",
            #     integrations=[sentry_logging]
            # )
            
            self.logger.info("Sentry integration initialized")
        except Exception as e:
            self.logger.warning("Failed to initialize Sentry", error=str(e))
    
    def _start_background_processing(self):
        """Start background log processing thread"""
        
        self.processing_thread = threading.Thread(
            target=self._process_logs,
            daemon=True
        )
        self.processing_thread.start()
        
        self.logger.info("Background log processing started")
    
    def _process_logs(self):
        """Background log processing"""
        
        while not self.shutdown_event.is_set():
            try:
                # Process queued log entries
                try:
                    log_entry = self.log_queue.get(timeout=1.0)
                    asyncio.create_task(self._process_log_entry(log_entry))
                    self.log_queue.task_done()
                except queue.Empty:
                    continue
                
            except Exception as e:
                self.logger.error("Error in log processing", error=str(e))
    
    async def _process_log_entry(self, log_entry: LogEntry):
        """Process a single log entry"""
        
        try:
            # Store in memory
            self.log_entries.append(log_entry)
            
            # Update statistics
            self.log_stats[f"level_{log_entry.level.value}"] += 1
            self.log_stats[f"category_{log_entry.category.value}"] += 1
            self.log_stats[f"component_{log_entry.component}"] += 1
            self.log_stats["total_logs"] += 1
            
            # Store in Redis
            await self._store_log_entry(log_entry)
            
            # Evaluate alert rules
            await self.alert_manager.evaluate_alerts(log_entry)
            
            # Handle special log types
            if log_entry.category == LogCategory.AUDIT:
                self.audit_trail.append(log_entry)
            elif log_entry.category == LogCategory.PERFORMANCE:
                self.performance_logs.append(log_entry)
            
        except Exception as e:
            # Use basic logger to avoid recursion
            logging.error(f"Failed to process log entry: {e}")
    
    async def _store_log_entry(self, log_entry: LogEntry):
        """Store log entry in Redis"""
        
        try:
            key = f"pam:log:{log_entry.id}"
            log_data = asdict(log_entry)
            log_data["timestamp"] = log_entry.timestamp.isoformat()
            
            # Set TTL based on log level
            ttl_map = {
                LogLevel.DEBUG: 86400,      # 1 day
                LogLevel.INFO: 86400 * 7,   # 7 days
                LogLevel.WARNING: 86400 * 30,  # 30 days
                LogLevel.ERROR: 86400 * 90,    # 90 days
                LogLevel.CRITICAL: 86400 * 365  # 1 year
            }
            
            ttl = ttl_map.get(log_entry.level, 86400 * 7)
            self.redis_client.setex(key, ttl, json.dumps(log_data, cls=DateTimeEncoder))
            
        except Exception as e:
            logging.error(f"Failed to store log entry in Redis: {e}")
    
    def log(
        self,
        level: LogLevel,
        category: LogCategory,
        component: str,
        message: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        request_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        **context
    ):
        """Log a message with full context"""
        
        log_entry = LogEntry(
            id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            level=level,
            category=category,
            component=component,
            message=message,
            context=context,
            user_id=user_id,
            session_id=session_id,
            request_id=request_id,
            trace_id=trace_id
        )
        
        # Queue for background processing
        self.log_queue.put(log_entry)
        
        # Also log to structured logger immediately
        logger = self.logger.with_context(
            category=category.value,
            component=component,
            user_id=user_id,
            session_id=session_id,
            request_id=request_id,
            trace_id=trace_id,
            **context
        )
        
        if level == LogLevel.DEBUG:
            logger.debug(message)
        elif level == LogLevel.INFO:
            logger.info(message)
        elif level == LogLevel.WARNING:
            logger.warning(message)
        elif level == LogLevel.ERROR:
            logger.error(message)
        elif level == LogLevel.CRITICAL:
            logger.critical(message)
    
    # Convenience methods
    def debug(self, category: LogCategory, component: str, message: str, **kwargs):
        self.log(LogLevel.DEBUG, category, component, message, **kwargs)
    
    def info(self, category: LogCategory, component: str, message: str, **kwargs):
        self.log(LogLevel.INFO, category, component, message, **kwargs)
    
    def warning(self, category: LogCategory, component: str, message: str, **kwargs):
        self.log(LogLevel.WARNING, category, component, message, **kwargs)
    
    def error(self, category: LogCategory, component: str, message: str, **kwargs):
        self.log(LogLevel.ERROR, category, component, message, **kwargs)
    
    def critical(self, category: LogCategory, component: str, message: str, **kwargs):
        self.log(LogLevel.CRITICAL, category, component, message, **kwargs)
    
    def audit(self, component: str, action: str, user_id: str, **kwargs):
        """Log an audit event"""
        self.log(
            LogLevel.INFO,
            LogCategory.AUDIT,
            component,
            f"Audit: {action}",
            user_id=user_id,
            action=action,
            **kwargs
        )
    
    def security_event(self, component: str, event: str, severity: str, **kwargs):
        """Log a security event"""
        level = LogLevel.ERROR if severity in ["high", "critical"] else LogLevel.WARNING
        self.log(
            level,
            LogCategory.SECURITY,
            component,
            f"Security: {event}",
            event=event,
            severity=severity,
            **kwargs
        )
    
    def performance_metric(self, component: str, metric: str, value: float, **kwargs):
        """Log a performance metric"""
        self.log(
            LogLevel.INFO,
            LogCategory.PERFORMANCE,
            component,
            f"Performance: {metric} = {value}",
            metric=metric,
            value=value,
            **kwargs
        )
    
    def get_logs(
        self,
        level: Optional[LogLevel] = None,
        category: Optional[LogCategory] = None,
        component: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 100
    ) -> List[LogEntry]:
        """Get filtered logs"""
        
        logs = list(self.log_entries)
        
        # Apply filters
        if level:
            logs = [log for log in logs if log.level == level]
        if category:
            logs = [log for log in logs if log.category == category]
        if component:
            logs = [log for log in logs if log.component == component]
        if user_id:
            logs = [log for log in logs if log.user_id == user_id]
        
        # Sort by timestamp (newest first) and limit
        logs.sort(key=lambda x: x.timestamp, reverse=True)
        return logs[:limit]
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get logging statistics"""
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "total_logs": self.log_stats["total_logs"],
            "logs_by_level": {
                level.value: self.log_stats[f"level_{level.value}"]
                for level in LogLevel
            },
            "logs_by_category": {
                category.value: self.log_stats[f"category_{category.value}"]
                for category in LogCategory
            },
            "active_alerts": len(self.alert_manager.active_alerts),
            "audit_entries": len(self.audit_trail),
            "performance_logs": len(self.performance_logs)
        }
    
    async def cleanup_old_logs(self, retention_days: int = 30):
        """Clean up old log entries"""
        
        try:
            cutoff_time = datetime.utcnow() - timedelta(days=retention_days)
            
            # Clean memory storage
            self.log_entries = deque(
                [log for log in self.log_entries if log.timestamp > cutoff_time],
                maxlen=100000
            )
            
            self.audit_trail = deque(
                [log for log in self.audit_trail if log.timestamp > cutoff_time],
                maxlen=50000
            )
            
            self.performance_logs = deque(
                [log for log in self.performance_logs if log.timestamp > cutoff_time],
                maxlen=10000
            )
            
            self.logger.info(f"Cleaned up logs older than {retention_days} days")
            
        except Exception as e:
            self.logger.error("Failed to cleanup old logs", error=str(e))
    
    def shutdown(self):
        """Shutdown the logging system"""
        
        self.shutdown_event.set()
        
        # Wait for queue to be processed
        self.log_queue.join()
        
        # Wait for processing thread
        if self.processing_thread and self.processing_thread.is_alive():
            self.processing_thread.join(timeout=5)
        
        self.logger.info("Logging system shutdown completed")


# Global logging instance
pam_logging = PAMLoggingSystem()


def get_logger(component: str) -> PAMLoggingSystem:
    """Get logger for a specific component"""
    return pam_logging


# Context manager for request tracing
class RequestContext:
    """Context manager for request tracing"""
    
    def __init__(self, request_id: str, user_id: Optional[str] = None):
        self.request_id = request_id
        self.user_id = user_id
        self.trace_id = str(uuid.uuid4())
    
    def __enter__(self):
        bind_contextvars(
            request_id=self.request_id,
            user_id=self.user_id,
            trace_id=self.trace_id
        )
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        clear_contextvars()