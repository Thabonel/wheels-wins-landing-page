"""
Security Monitoring and Intrusion Detection System
Real-time security event monitoring, threat detection, and automated response.
"""

import json
import time
import asyncio
from typing import Dict, List, Optional, Any, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque
import hashlib
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from app.core.logging import get_logger

try:
    import aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = get_logger(__name__)


class ThreatType(Enum):
    """Types of security threats"""
    BRUTE_FORCE = "brute_force"
    DDOS = "ddos"
    SQL_INJECTION = "sql_injection"
    XSS = "xss"
    CSRF = "csrf"
    PATH_TRAVERSAL = "path_traversal"
    COMMAND_INJECTION = "command_injection"
    SUSPICIOUS_BEHAVIOR = "suspicious_behavior"
    ACCOUNT_ENUMERATION = "account_enumeration"
    RATE_LIMIT_ABUSE = "rate_limit_abuse"


class ThreatSeverity(Enum):
    """Threat severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ResponseAction(Enum):
    """Automated response actions"""
    LOG = "log"
    ALERT = "alert"
    BLOCK_IP = "block_ip"
    BLOCK_USER = "block_user"
    REQUIRE_CAPTCHA = "require_captcha"
    REQUIRE_MFA = "require_mfa"
    ESCALATE = "escalate"


@dataclass
class SecurityEvent:
    """Security event data structure"""
    event_id: str
    timestamp: datetime
    threat_type: ThreatType
    severity: ThreatSeverity
    source_ip: str
    user_agent: str
    endpoint: str
    method: str
    user_id: Optional[str] = None
    details: Dict[str, Any] = None
    response_action: Optional[ResponseAction] = None
    blocked: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/transmission"""
        return {
            **asdict(self),
            'timestamp': self.timestamp.isoformat(),
            'threat_type': self.threat_type.value,
            'severity': self.severity.value,
            'response_action': self.response_action.value if self.response_action else None
        }


class ThreatDetector:
    """Advanced threat detection engine"""
    
    def __init__(self):
        # Tracking data structures
        self.ip_requests: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.failed_logins: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self.suspicious_patterns: Dict[str, int] = defaultdict(int)
        self.blocked_ips: Set[str] = set()
        self.blocked_users: Set[str] = set()
        
        # Detection thresholds
        self.thresholds = {
            "brute_force_attempts": 5,       # Failed logins per IP per 15 minutes
            "brute_force_window": 900,       # 15 minutes
            "ddos_requests_per_second": 50,  # Requests per second from single IP
            "ddos_window": 60,               # 1 minute window
            "suspicious_endpoints": 20,      # Different endpoints hit per minute
            "account_enum_attempts": 10,     # Account enumeration attempts per hour
            "path_traversal_attempts": 3,    # Path traversal attempts per hour
            "sql_injection_attempts": 3,     # SQL injection attempts per hour
            "xss_attempts": 5,               # XSS attempts per hour
        }
        
        # Suspicious user agents
        self.suspicious_user_agents = [
            "sqlmap", "nikto", "nmap", "masscan", "zap", "burp", "acunetix",
            "nessus", "openvas", "w3af", "skipfish", "arachni", "wpscan",
            "dirbuster", "gobuster", "ffuf", "wfuzz", "dirb"
        ]
        
        # Suspicious IP patterns (private/internal ranges should not access public APIs)
        self.suspicious_ip_patterns = [
            r"^10\.",           # Private class A
            r"^172\.(1[6-9]|2[0-9]|3[01])\.",  # Private class B
            r"^192\.168\.",     # Private class C
            r"^127\.",          # Loopback
            r"^169\.254\.",     # Link-local
            r"^0\.",            # This network
        ]
    
    def detect_threats(self, request: Request, response: Response = None) -> List[SecurityEvent]:
        """Detect threats from request/response"""
        threats = []
        current_time = datetime.now()
        source_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        # Skip detection for blocked IPs (already handled)
        if source_ip in self.blocked_ips:
            return threats
        
        # Brute force detection
        if self._is_login_endpoint(request.url.path):
            if response and response.status_code in [401, 403]:
                threat = self._detect_brute_force(source_ip, current_time)
                if threat:
                    threats.append(threat)
        
        # DDoS detection
        ddos_threat = self._detect_ddos(source_ip, request.url.path, current_time)
        if ddos_threat:
            threats.append(ddos_threat)
        
        # Suspicious user agent
        ua_threat = self._detect_suspicious_user_agent(source_ip, user_agent, request)
        if ua_threat:
            threats.append(ua_threat)
        
        # Account enumeration
        enum_threat = self._detect_account_enumeration(source_ip, request, response)
        if enum_threat:
            threats.append(enum_threat)
        
        # Pattern-based detection (SQL injection, XSS, etc.)
        pattern_threats = self._detect_attack_patterns(source_ip, request)
        threats.extend(pattern_threats)
        
        return threats
    
    def _detect_brute_force(self, source_ip: str, timestamp: datetime) -> Optional[SecurityEvent]:
        """Detect brute force attacks"""
        # Add failed login attempt
        self.failed_logins[source_ip].append(timestamp)
        
        # Count recent failures
        cutoff_time = timestamp - timedelta(seconds=self.thresholds["brute_force_window"])
        recent_failures = sum(
            1 for attempt_time in self.failed_logins[source_ip]
            if attempt_time > cutoff_time
        )
        
        if recent_failures >= self.thresholds["brute_force_attempts"]:
            return SecurityEvent(
                event_id=self._generate_event_id(),
                timestamp=timestamp,
                threat_type=ThreatType.BRUTE_FORCE,
                severity=ThreatSeverity.HIGH,
                source_ip=source_ip,
                user_agent="",
                endpoint="/auth/login",
                method="POST",
                details={
                    "failed_attempts": recent_failures,
                    "window_seconds": self.thresholds["brute_force_window"]
                },
                response_action=ResponseAction.BLOCK_IP
            )
        
        return None
    
    def _detect_ddos(self, source_ip: str, endpoint: str, timestamp: datetime) -> Optional[SecurityEvent]:
        """Detect DDoS attacks"""
        # Add request to tracking
        self.ip_requests[source_ip].append((timestamp, endpoint))
        
        # Count requests in the last minute
        cutoff_time = timestamp - timedelta(seconds=self.thresholds["ddos_window"])
        recent_requests = [
            (req_time, req_endpoint) for req_time, req_endpoint in self.ip_requests[source_ip]
            if req_time > cutoff_time
        ]
        
        requests_per_second = len(recent_requests) / self.thresholds["ddos_window"]
        unique_endpoints = len(set(req_endpoint for _, req_endpoint in recent_requests))
        
        # DDoS detection criteria
        if (requests_per_second > self.thresholds["ddos_requests_per_second"] or
            unique_endpoints > self.thresholds["suspicious_endpoints"]):
            
            return SecurityEvent(
                event_id=self._generate_event_id(),
                timestamp=timestamp,
                threat_type=ThreatType.DDOS,
                severity=ThreatSeverity.CRITICAL,
                source_ip=source_ip,
                user_agent="",
                endpoint=endpoint,
                method="",
                details={
                    "requests_per_second": requests_per_second,
                    "unique_endpoints": unique_endpoints,
                    "total_requests": len(recent_requests)
                },
                response_action=ResponseAction.BLOCK_IP
            )
        
        return None
    
    def _detect_suspicious_user_agent(
        self, 
        source_ip: str, 
        user_agent: str, 
        request: Request
    ) -> Optional[SecurityEvent]:
        """Detect suspicious user agents"""
        ua_lower = user_agent.lower()
        
        for suspicious_ua in self.suspicious_user_agents:
            if suspicious_ua in ua_lower:
                return SecurityEvent(
                    event_id=self._generate_event_id(),
                    timestamp=datetime.now(),
                    threat_type=ThreatType.SUSPICIOUS_BEHAVIOR,
                    severity=ThreatSeverity.HIGH,
                    source_ip=source_ip,
                    user_agent=user_agent,
                    endpoint=request.url.path,
                    method=request.method,
                    details={
                        "suspicious_pattern": suspicious_ua,
                        "full_user_agent": user_agent
                    },
                    response_action=ResponseAction.BLOCK_IP
                )
        
        return None
    
    def _detect_account_enumeration(
        self, 
        source_ip: str, 
        request: Request, 
        response: Response
    ) -> Optional[SecurityEvent]:
        """Detect account enumeration attempts"""
        if not (self._is_login_endpoint(request.url.path) or 
                self._is_registration_endpoint(request.url.path)):
            return None
        
        # Track different email/username attempts from same IP
        key = f"enum:{source_ip}"
        self.suspicious_patterns[key] += 1
        
        # Reset counter every hour
        if self.suspicious_patterns[key] > self.thresholds["account_enum_attempts"]:
            return SecurityEvent(
                event_id=self._generate_event_id(),
                timestamp=datetime.now(),
                threat_type=ThreatType.ACCOUNT_ENUMERATION,
                severity=ThreatSeverity.MEDIUM,
                source_ip=source_ip,
                user_agent=request.headers.get("user-agent", ""),
                endpoint=request.url.path,
                method=request.method,
                details={
                    "attempts": self.suspicious_patterns[key]
                },
                response_action=ResponseAction.REQUIRE_CAPTCHA
            )
        
        return None
    
    def _detect_attack_patterns(self, source_ip: str, request: Request) -> List[SecurityEvent]:
        """Detect various attack patterns"""
        threats = []
        
        # SQL Injection patterns
        sql_patterns = [
            "union select", "drop table", "insert into", "delete from",
            "exec(", "sp_executesql", "xp_cmdshell", "'; --", "or 1=1"
        ]
        
        # XSS patterns
        xss_patterns = [
            "<script", "javascript:", "onload=", "onerror=", "eval(",
            "document.cookie", "window.location", "<iframe"
        ]
        
        # Path traversal patterns
        path_patterns = [
            "../", "..\\", "/etc/passwd", "/windows/system32", "..%2f", "..%5c"
        ]
        
        # Command injection patterns
        cmd_patterns = [
            "; rm ", "| cat ", "; whoami", "& dir ", "`id`", "$(whoami)"
        ]
        
        # Check all request components
        request_content = f"{request.url} {request.headers} {getattr(request.state, 'body', '')}"
        request_content_lower = request_content.lower()
        
        # SQL Injection detection
        sql_matches = sum(1 for pattern in sql_patterns if pattern in request_content_lower)
        if sql_matches >= 2:  # Multiple patterns indicate higher confidence
            threats.append(SecurityEvent(
                event_id=self._generate_event_id(),
                timestamp=datetime.now(),
                threat_type=ThreatType.SQL_INJECTION,
                severity=ThreatSeverity.CRITICAL,
                source_ip=source_ip,
                user_agent=request.headers.get("user-agent", ""),
                endpoint=request.url.path,
                method=request.method,
                details={"pattern_matches": sql_matches},
                response_action=ResponseAction.BLOCK_IP
            ))
        
        # XSS detection
        xss_matches = sum(1 for pattern in xss_patterns if pattern in request_content_lower)
        if xss_matches >= 1:
            threats.append(SecurityEvent(
                event_id=self._generate_event_id(),
                timestamp=datetime.now(),
                threat_type=ThreatType.XSS,
                severity=ThreatSeverity.HIGH,
                source_ip=source_ip,
                user_agent=request.headers.get("user-agent", ""),
                endpoint=request.url.path,
                method=request.method,
                details={"pattern_matches": xss_matches},
                response_action=ResponseAction.BLOCK_IP
            ))
        
        # Path traversal detection
        path_matches = sum(1 for pattern in path_patterns if pattern in request_content_lower)
        if path_matches >= 1:
            threats.append(SecurityEvent(
                event_id=self._generate_event_id(),
                timestamp=datetime.now(),
                threat_type=ThreatType.PATH_TRAVERSAL,
                severity=ThreatSeverity.HIGH,
                source_ip=source_ip,
                user_agent=request.headers.get("user-agent", ""),
                endpoint=request.url.path,
                method=request.method,
                details={"pattern_matches": path_matches},
                response_action=ResponseAction.BLOCK_IP
            ))
        
        # Command injection detection
        cmd_matches = sum(1 for pattern in cmd_patterns if pattern in request_content_lower)
        if cmd_matches >= 1:
            threats.append(SecurityEvent(
                event_id=self._generate_event_id(),
                timestamp=datetime.now(),
                threat_type=ThreatType.COMMAND_INJECTION,
                severity=ThreatSeverity.CRITICAL,
                source_ip=source_ip,
                user_agent=request.headers.get("user-agent", ""),
                endpoint=request.url.path,
                method=request.method,
                details={"pattern_matches": cmd_matches},
                response_action=ResponseAction.BLOCK_IP
            ))
        
        return threats
    
    def _is_login_endpoint(self, path: str) -> bool:
        """Check if endpoint is a login endpoint"""
        login_patterns = ["/auth/login", "/login", "/signin", "/api/auth/login"]
        return any(pattern in path.lower() for pattern in login_patterns)
    
    def _is_registration_endpoint(self, path: str) -> bool:
        """Check if endpoint is a registration endpoint"""
        register_patterns = ["/auth/register", "/register", "/signup", "/api/auth/signup"]
        return any(pattern in path.lower() for pattern in register_patterns)
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        # Check proxy headers
        forwarded_headers = [
            "cf-connecting-ip", "x-forwarded-for", "x-real-ip"
        ]
        
        for header in forwarded_headers:
            if header in request.headers:
                ip = request.headers[header].split(',')[0].strip()
                if ip and ip != "unknown":
                    return ip
        
        return request.client.host if request.client else "unknown"
    
    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        return hashlib.md5(f"{time.time()}{id(self)}".encode()).hexdigest()


class SecurityMonitor:
    """Security monitoring and response system"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        import os
        # Try to get Redis URL from environment if not provided
        self.redis_url = redis_url
        if redis_url == "redis://localhost:6379":
            self.redis_url = os.environ.get('REDIS_URL', redis_url)
        self.redis_client: Optional[aioredis.Redis] = None
        self.threat_detector = ThreatDetector()
        self.event_storage: List[SecurityEvent] = []
        self.blocked_ips: Set[str] = set()
        self.blocked_users: Set[str] = set()
        
        # Alert thresholds
        self.alert_thresholds = {
            ThreatSeverity.CRITICAL: 1,  # Alert immediately
            ThreatSeverity.HIGH: 3,      # Alert after 3 events
            ThreatSeverity.MEDIUM: 10,   # Alert after 10 events
            ThreatSeverity.LOW: 50       # Alert after 50 events
        }
    
    async def initialize(self) -> bool:
        """Initialize Redis connection"""
        if not REDIS_AVAILABLE:
            logger.warning("Redis not available for security monitoring")
            return False
        
        try:
            # Log Redis URL (masked for security)
            if self.redis_url and self.redis_url != 'redis://localhost:6379':
                masked_url = self.redis_url.split('@')[0] + '@***' if '@' in self.redis_url else self.redis_url
                logger.info(f"Security monitoring attempting Redis connection to: {masked_url}")
            
            self.redis_client = aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=10,
                socket_timeout=5
            )
            await self.redis_client.ping()
            logger.info("✅ Security monitoring Redis initialized successfully")
            return True
        except asyncio.TimeoutError:
            logger.warning("Security monitoring Redis connection timeout - using in-memory fallback")
            self.redis_client = None
            return False
        except Exception as e:
            logger.warning(f"Security monitoring Redis unavailable ({type(e).__name__}: {e}) - using in-memory fallback")
            self.redis_client = None
            return False
    
    async def process_request(self, request: Request, response: Response = None) -> List[SecurityEvent]:
        """Process request and detect threats"""
        threats = self.threat_detector.detect_threats(request, response)
        
        for threat in threats:
            await self._handle_threat(threat)
        
        return threats
    
    async def _handle_threat(self, event: SecurityEvent):
        """Handle detected security threat"""
        # Store event
        await self._store_event(event)
        
        # Execute automated response
        if event.response_action:
            await self._execute_response(event)
        
        # Check if alert should be sent
        await self._check_alert_thresholds(event)
        
        logger.warning(f"Security threat detected: {event.threat_type.value} from {event.source_ip}")
    
    async def _store_event(self, event: SecurityEvent):
        """Store security event"""
        if self.redis_client:
            try:
                # Store in Redis with TTL
                key = f"security_event:{event.event_id}"
                await self.redis_client.setex(
                    key, 
                    timedelta(days=30).total_seconds(),  # 30 day retention
                    json.dumps(event.to_dict())
                )
                
                # Add to threat type index
                threat_key = f"threats:{event.threat_type.value}"
                await self.redis_client.zadd(
                    threat_key,
                    {event.event_id: time.time()}
                )
                await self.redis_client.expire(threat_key, timedelta(days=30).total_seconds())
                
                # Add to IP index
                ip_key = f"threats:ip:{event.source_ip}"
                await self.redis_client.zadd(
                    ip_key,
                    {event.event_id: time.time()}
                )
                await self.redis_client.expire(ip_key, timedelta(days=7).total_seconds())
                
            except Exception as e:
                logger.error(f"Error storing security event in Redis: {e}")
        else:
            # Fallback to in-memory storage
            self.event_storage.append(event)
            # Keep only last 1000 events
            if len(self.event_storage) > 1000:
                self.event_storage = self.event_storage[-1000:]
    
    async def _execute_response(self, event: SecurityEvent):
        """Execute automated response to threat"""
        if event.response_action == ResponseAction.BLOCK_IP:
            await self._block_ip(event.source_ip, duration_minutes=60)
            event.blocked = True
            
        elif event.response_action == ResponseAction.BLOCK_USER and event.user_id:
            await self._block_user(event.user_id, duration_minutes=30)
            event.blocked = True
            
        elif event.response_action == ResponseAction.ALERT:
            await self._send_alert(event)
            
        elif event.response_action == ResponseAction.ESCALATE:
            await self._escalate_threat(event)
    
    async def _block_ip(self, ip: str, duration_minutes: int = 60):
        """Block IP address"""
        self.blocked_ips.add(ip)
        
        if self.redis_client:
            try:
                key = f"blocked_ip:{ip}"
                await self.redis_client.setex(
                    key,
                    duration_minutes * 60,
                    json.dumps({
                        "blocked_at": datetime.now().isoformat(),
                        "duration_minutes": duration_minutes
                    })
                )
            except Exception as e:
                logger.error(f"Error blocking IP in Redis: {e}")
        
        logger.warning(f"Blocked IP {ip} for {duration_minutes} minutes")
    
    async def _block_user(self, user_id: str, duration_minutes: int = 30):
        """Block user account"""
        self.blocked_users.add(user_id)
        
        if self.redis_client:
            try:
                key = f"blocked_user:{user_id}"
                await self.redis_client.setex(
                    key,
                    duration_minutes * 60,
                    json.dumps({
                        "blocked_at": datetime.now().isoformat(),
                        "duration_minutes": duration_minutes
                    })
                )
            except Exception as e:
                logger.error(f"Error blocking user in Redis: {e}")
        
        logger.warning(f"Blocked user {user_id} for {duration_minutes} minutes")
    
    async def _send_alert(self, event: SecurityEvent):
        """Send security alert"""
        # This would integrate with your alerting system (email, Slack, PagerDuty, etc.)
        logger.critical(f"SECURITY ALERT: {event.threat_type.value} - {event.severity.value}")
    
    async def _escalate_threat(self, event: SecurityEvent):
        """Escalate threat to security team"""
        # This would integrate with your incident management system
        logger.critical(f"THREAT ESCALATION: {event.threat_type.value} from {event.source_ip}")
    
    async def _check_alert_thresholds(self, event: SecurityEvent):
        """Check if alert thresholds are exceeded"""
        threshold = self.alert_thresholds.get(event.severity, 100)
        
        # Count recent events of same severity
        if self.redis_client:
            try:
                severity_key = f"severity_count:{event.severity.value}"
                count = await self.redis_client.incr(severity_key)
                await self.redis_client.expire(severity_key, 3600)  # 1 hour window
                
                if count >= threshold:
                    await self._send_alert(event)
                    # Reset counter after alert
                    await self.redis_client.delete(severity_key)
            except Exception as e:
                logger.error(f"Error checking alert thresholds: {e}")
    
    async def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is blocked"""
        if ip in self.blocked_ips:
            return True
        
        if self.redis_client:
            try:
                key = f"blocked_ip:{ip}"
                result = await self.redis_client.get(key)
                return result is not None
            except Exception as e:
                logger.error(f"Error checking blocked IP: {e}")
        
        return False
    
    async def is_user_blocked(self, user_id: str) -> bool:
        """Check if user is blocked"""
        if user_id in self.blocked_users:
            return True
        
        if self.redis_client:
            try:
                key = f"blocked_user:{user_id}"
                result = await self.redis_client.get(key)
                return result is not None
            except Exception as e:
                logger.error(f"Error checking blocked user: {e}")
        
        return False
    
    async def get_threat_statistics(self) -> Dict[str, Any]:
        """Get threat statistics"""
        stats = {
            "total_events": len(self.event_storage),
            "blocked_ips": len(self.blocked_ips),
            "blocked_users": len(self.blocked_users),
            "threat_types": defaultdict(int),
            "severity_levels": defaultdict(int)
        }
        
        for event in self.event_storage[-100:]:  # Last 100 events
            stats["threat_types"][event.threat_type.value] += 1
            stats["severity_levels"][event.severity.value] += 1
        
        return dict(stats)


class SecurityMonitoringMiddleware(BaseHTTPMiddleware):
    """Security monitoring middleware"""
    
    def __init__(self, app, redis_url: str = "redis://localhost:6379"):
        super().__init__(app)
        self.security_monitor = SecurityMonitor(redis_url)
        
        # Initialize monitor
        asyncio.create_task(self.security_monitor.initialize())
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip security monitoring for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
            
        # Check if IP is blocked
        client_ip = self._get_client_ip(request)
        if await self.security_monitor.is_ip_blocked(client_ip):
            logger.warning(f"Blocked IP {client_ip} attempted access")
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Access Forbidden",
                    "message": "Your IP address has been blocked due to security violations"
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Monitor for threats (run in background)
        asyncio.create_task(
            self.security_monitor.process_request(request, response)
        )
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded_headers = ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"]
        
        for header in forwarded_headers:
            if header in request.headers:
                ip = request.headers[header].split(',')[0].strip()
                if ip and ip != "unknown":
                    return ip
        
        return request.client.host if request.client else "unknown"


def setup_security_monitoring(app, redis_url: str = "redis://localhost:6379"):
    """Setup security monitoring middleware"""
    app.add_middleware(SecurityMonitoringMiddleware, redis_url=redis_url)
    logger.info("Security monitoring middleware configured")