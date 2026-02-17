"""
Web Application Firewall (WAF) Middleware
Comprehensive protection against web application attacks including SQL injection, XSS, and more.
"""

import re
import json
import urllib.parse
from typing import Dict, List, Set, Optional, Any
from datetime import datetime, timedelta
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from app.core.logging import get_logger

logger = get_logger(__name__)


class WAFRule:
    """Individual WAF rule definition"""
    
    def __init__(
        self,
        name: str,
        pattern: str,
        action: str = "block",
        severity: str = "high",
        description: str = "",
        case_sensitive: bool = False
    ):
        self.name = name
        self.pattern = pattern
        self.action = action  # block, log, monitor
        self.severity = severity  # critical, high, medium, low
        self.description = description
        self.case_sensitive = case_sensitive
        self.regex = re.compile(
            pattern, 
            re.IGNORECASE if not case_sensitive else 0
        )


class WAFEngine:
    """Core WAF engine for threat detection and prevention"""
    
    def __init__(self):
        self.rules: List[WAFRule] = []
        self.blocked_ips: Set[str] = set()
        self.rate_limits: Dict[str, List[datetime]] = {}
        self.setup_default_rules()
    
    def setup_default_rules(self):
        """Setup default security rules"""
        
        # SQL Injection Rules
        sql_injection_rules = [
            WAFRule(
                "sql_injection_union",
                r"(\bunion\b.{1,100}?\bselect\b)|(\bselect\b.{1,100}?\bunion\b)",
                "block",
                "critical",
                "SQL injection attempt using UNION SELECT"
            ),
            WAFRule(
                "sql_injection_or_1_1",
                r"(\bor\b\s+['\"]?1['\"]?\s*=\s*['\"]?1['\"]?)|(\b1\s*=\s*1\b)",
                "block",
                "critical",
                "SQL injection attempt using OR 1=1"
            ),
            WAFRule(
                "sql_injection_drop_table",
                r"\bdrop\s+table\b",
                "block",
                "critical",
                "SQL injection attempt to drop table"
            ),
            WAFRule(
                "sql_injection_delete_from",
                r"\bdelete\s+from\b",
                "block",
                "critical",
                "SQL injection attempt to delete data"
            ),
            WAFRule(
                "sql_injection_insert_into",
                r"\binsert\s+into\b",
                "block",
                "high",
                "SQL injection attempt to insert data"
            ),
            WAFRule(
                "sql_injection_update_set",
                r"\bupdate\s+.+\bset\b",
                "block",
                "high",
                "SQL injection attempt to update data"
            ),
            WAFRule(
                "sql_injection_exec",
                r"\bexec(\s|\()",
                "block",
                "critical",
                "SQL injection attempt using EXEC"
            ),
            WAFRule(
                "sql_injection_sp_executesql",
                r"\bsp_executesql\b",
                "block",
                "critical",
                "SQL injection attempt using sp_executesql"
            ),
            WAFRule(
                "sql_injection_comments",
                r"(/\*.*?\*/|--[^\r\n]*|#[^\r\n]*)",
                "log",
                "medium",
                "SQL comment patterns detected"
            )
        ]
        
        # XSS Rules
        xss_rules = [
            WAFRule(
                "xss_script_tag",
                r"<\s*script[^>]*>.*?</\s*script\s*>",
                "block",
                "critical",
                "XSS attempt using script tag"
            ),
            WAFRule(
                "xss_javascript_protocol",
                r"javascript\s*:",
                "block",
                "high",
                "XSS attempt using javascript: protocol"
            ),
            WAFRule(
                "xss_vbscript_protocol",
                r"vbscript\s*:",
                "block",
                "high",
                "XSS attempt using vbscript: protocol"
            ),
            WAFRule(
                "xss_onload",
                r"\bonload\s*=",
                "block",
                "high",
                "XSS attempt using onload event"
            ),
            WAFRule(
                "xss_onerror",
                r"\bonerror\s*=",
                "block",
                "high",
                "XSS attempt using onerror event"
            ),
            WAFRule(
                "xss_eval",
                r"\beval\s*\(",
                "block",
                "high",
                "XSS attempt using eval function"
            ),
            WAFRule(
                "xss_expression",
                r"\bexpression\s*\(",
                "block",
                "high",
                "XSS attempt using CSS expression"
            ),
            WAFRule(
                "xss_iframe",
                r"<\s*iframe[^>]*>",
                "block",
                "medium",
                "Potential XSS using iframe"
            ),
            WAFRule(
                "xss_object_embed",
                r"<\s*(object|embed)[^>]*>",
                "block",
                "medium",
                "Potential XSS using object/embed tags"
            )
        ]
        
        # Path Traversal Rules
        path_traversal_rules = [
            WAFRule(
                "path_traversal_dotdot",
                r"(\.\.[\\/]){2,}",
                "block",
                "high",
                "Path traversal attempt using ../"
            ),
            WAFRule(
                "path_traversal_encoded",
                r"(%2e%2e[%2f%5c]){2,}",
                "block",
                "high",
                "Encoded path traversal attempt"
            ),
            WAFRule(
                "path_traversal_etc_passwd",
                r"[\\/]etc[\\/]passwd",
                "block",
                "critical",
                "Attempt to access /etc/passwd"
            ),
            WAFRule(
                "path_traversal_windows",
                r"[\\/]windows[\\/]system32",
                "block",
                "high",
                "Attempt to access Windows system files"
            )
        ]
        
        # Command Injection Rules
        command_injection_rules = [
            WAFRule(
                "cmd_injection_semicolon",
                r";\s*(rm|cat|ls|ps|id|whoami|uname)",
                "block",
                "critical",
                "Command injection attempt using semicolon"
            ),
            WAFRule(
                "cmd_injection_pipe",
                r"\|\s*(rm|cat|ls|ps|id|whoami|uname)",
                "block",
                "critical",
                "Command injection attempt using pipe"
            ),
            WAFRule(
                "cmd_injection_backtick",
                r"`[^`]*`",
                "block",
                "high",
                "Command injection attempt using backticks"
            ),
            WAFRule(
                "cmd_injection_dollar_paren",
                r"\$\([^)]*\)",
                "block",
                "high",
                "Command injection attempt using $(...)"
            )
        ]
        
        # File Upload Rules
        file_upload_rules = [
            WAFRule(
                "malicious_file_extensions",
                r"\.(php|jsp|asp|aspx|exe|bat|cmd|sh|py|pl|rb)$",
                "block",
                "high",
                "Potentially malicious file extension"
            ),
            WAFRule(
                "double_extension",
                r"\.(jpg|jpeg|png|gif|pdf)\.php$",
                "block",
                "critical",
                "Double extension attack attempt"
            )
        ]
        
        # Protocol Attacks
        protocol_rules = [
            WAFRule(
                "http_response_splitting",
                r"(\r\n|\n|\r).*?:",
                "block",
                "high",
                "HTTP response splitting attempt"
            ),
            WAFRule(
                "ldap_injection",
                r"[()&|].*?=.*?[*]",
                "log",
                "medium",
                "Potential LDAP injection"
            )
        ]
        
        # Add all rules to the engine
        all_rules = (
            sql_injection_rules + 
            xss_rules + 
            path_traversal_rules + 
            command_injection_rules + 
            file_upload_rules + 
            protocol_rules
        )
        
        self.rules.extend(all_rules)
        logger.info(f"WAF engine initialized with {len(self.rules)} security rules")
    
    def analyze_request(self, request: Request, body: str = "") -> Optional[Dict[str, Any]]:
        """Analyze request for security threats"""
        threats = []
        
        # Check URL path
        url_threats = self._check_content(str(request.url), "URL")
        threats.extend(url_threats)
        
        # Check query parameters
        for key, value in request.query_params.items():
            param_threats = self._check_content(f"{key}={value}", f"Query parameter '{key}'")
            threats.extend(param_threats)
        
        # Check headers
        for header, value in request.headers.items():
            # Skip certain headers that commonly contain patterns
            if header.lower() not in ['user-agent', 'referer', 'accept']:
                header_threats = self._check_content(value, f"Header '{header}'")
                threats.extend(header_threats)
        
        # Check request body
        if body:
            body_threats = self._check_content(body, "Request body")
            threats.extend(body_threats)
        
        # Return highest severity threat or None
        if threats:
            # Sort by severity (critical > high > medium > low)
            severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
            threats.sort(key=lambda t: severity_order.get(t["severity"], 0), reverse=True)
            return threats[0]
        
        return None
    
    def _check_content(self, content: str, location: str) -> List[Dict[str, Any]]:
        """Check content against all WAF rules"""
        threats = []
        decoded_content = self._decode_content(content)
        
        for rule in self.rules:
            if rule.regex.search(decoded_content):
                threat = {
                    "rule_name": rule.name,
                    "severity": rule.severity,
                    "action": rule.action,
                    "description": rule.description,
                    "location": location,
                    "matched_content": content[:200] + "..." if len(content) > 200 else content,
                    "timestamp": datetime.now().isoformat()
                }
                threats.append(threat)
        
        return threats
    
    def _decode_content(self, content: str) -> str:
        """Decode various encoding schemes to detect evasion attempts"""
        decoded = content
        
        try:
            # URL decode
            decoded = urllib.parse.unquote(decoded)
            # Double URL decode (common evasion)
            decoded = urllib.parse.unquote(decoded)
            
            # HTML decode common entities
            html_entities = {
                '&lt;': '<',
                '&gt;': '>',
                '&amp;': '&',
                '&quot;': '"',
                '&#x27;': "'",
                '&#x2F;': '/',
                '&#x60;': '`',
                '&#x3D;': '='
            }
            
            for entity, char in html_entities.items():
                decoded = decoded.replace(entity, char)
            
        except Exception as e:
            logger.debug(f"Error decoding content: {e}")
            # Return original content if decoding fails
            decoded = content
        
        return decoded
    
    def block_ip(self, ip: str, duration_minutes: int = 60):
        """Block an IP address temporarily"""
        self.blocked_ips.add(ip)
        logger.warning(f"IP {ip} blocked for {duration_minutes} minutes")
        # In production, this should be stored in Redis with TTL
    
    def is_ip_blocked(self, ip: str) -> bool:
        """Check if an IP is blocked"""
        return ip in self.blocked_ips


class WAFMiddleware(BaseHTTPMiddleware):
    """Web Application Firewall Middleware"""
    
    def __init__(self, app, enable_blocking: bool = True):
        super().__init__(app)
        self.waf_engine = WAFEngine()
        self.enable_blocking = enable_blocking
        self.exempt_paths = [
            "/health",
            "/docs",
            "/openapi.json",
            "/favicon.ico",
            # PAM endpoints are exempt - they have their own security validation
            # (JWT auth, rate limiting, content size limits, suspicious pattern detection)
            # and the conversation history can trigger false positives
            "/api/v1/pam/chat",
            "/api/v1/pam/ws",
            "/api/v1/pam-simple/chat",
            "/api/v1/pam-2/chat",
            # Support/receipt/fuel/OCR endpoints - binary uploads trigger false positives
            "/api/v1/support",
            "/api/v1/fuel",
            "/api/v1/receipts",
            "/api/v1/ocr",
        ]
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip WAF for exempt paths
        if any(request.url.path.startswith(path) for path in self.exempt_paths):
            return await call_next(request)
        
        # Skip WAF for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        client_ip = self._get_client_ip(request)
        
        # Check if IP is blocked
        if self.waf_engine.is_ip_blocked(client_ip):
            logger.warning(f"Blocked IP {client_ip} attempted access to {request.url.path}")
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Access Forbidden",
                    "message": "Your IP address has been temporarily blocked due to suspicious activity",
                    "request_id": getattr(request.state, 'request_id', 'unknown')
                }
            )
        
        # Read request body for analysis
        body = ""
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body_bytes = await request.body()
                body = body_bytes.decode('utf-8', errors='ignore')
            except Exception as e:
                logger.warning(f"Error reading request body: {e}")
        
        # Analyze request for threats
        threat = self.waf_engine.analyze_request(request, body)
        
        if threat:
            # Log the threat
            logger.warning(
                f"WAF threat detected: {threat['rule_name']} "
                f"[{threat['severity']}] from {client_ip} "
                f"at {threat['location']}: {threat['description']}"
            )
            
            # Take action based on rule
            if threat["action"] == "block" and self.enable_blocking:
                # For critical threats, block the IP
                if threat["severity"] == "critical":
                    self.waf_engine.block_ip(client_ip, duration_minutes=60)
                
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": "Security Violation",
                        "message": "Request blocked by Web Application Firewall",
                        "violation_id": threat["rule_name"],
                        "request_id": getattr(request.state, 'request_id', 'unknown')
                    }
                )
            
            # For log-only rules or when blocking is disabled, continue
            if threat["action"] in ["log", "monitor"]:
                # Add threat info to request state for monitoring
                request.state.waf_threat = threat
        
        return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address, considering proxy headers"""
        # Check for forwarded IP headers (in order of preference)
        forwarded_headers = [
            "cf-connecting-ip",      # Cloudflare
            "x-forwarded-for",       # Standard proxy header
            "x-real-ip",            # Nginx
            "x-forwarded",          # Alternative
            "forwarded-for",        # Alternative
            "forwarded"             # RFC 7239
        ]
        
        for header in forwarded_headers:
            if header in request.headers:
                # Take the first IP in case of comma-separated list
                ip = request.headers[header].split(',')[0].strip()
                if ip and ip != "unknown":
                    return ip
        
        # Fallback to direct connection IP
        return request.client.host if request.client else "unknown"


def setup_waf_middleware(app, enable_blocking: bool = True):
    """Setup WAF middleware"""
    app.add_middleware(WAFMiddleware, enable_blocking=enable_blocking)
    logger.info("WAF middleware configured")