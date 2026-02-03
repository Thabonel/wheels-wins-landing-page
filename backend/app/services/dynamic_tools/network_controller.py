"""
Dynamic Tool Network Controller - Controls network access for generated tools
"""
import socket
import threading
import time
from typing import Dict, Any, Optional, List, Tuple
from urllib.parse import urlparse
from datetime import datetime, timedelta
from collections import defaultdict
import ipaddress

from app.core.logging import get_logger

logger = get_logger(__name__)


# Approved APIs with their configuration
ALLOWED_APIS: Dict[str, Dict[str, Any]] = {
    "api.open-meteo.com": {
        "methods": ["GET"],
        "rate_limit": 100,  # requests per minute
        "description": "Weather data API",
        "requires_auth": False,
        "allowed_paths": ["/v1/forecast", "/v1/archive", "/v1/elevation"]
    },
    "api.mapbox.com": {
        "methods": ["GET"],
        "rate_limit": 60,
        "description": "Geocoding and directions",
        "requires_auth": True,
        "allowed_paths": ["/geocoding/", "/directions/", "/search/"]
    },
    "api.recreation.gov": {
        "methods": ["GET"],
        "rate_limit": 30,
        "description": "Recreation.gov campground data",
        "requires_auth": True,
        "allowed_paths": ["/api/", "/v1/"]
    },
    "api.gasbuddy.com": {
        "methods": ["GET"],
        "rate_limit": 20,
        "description": "Fuel prices API",
        "requires_auth": True,
        "allowed_paths": ["/api/"]
    },
    "nominatim.openstreetmap.org": {
        "methods": ["GET"],
        "rate_limit": 60,
        "description": "OpenStreetMap geocoding",
        "requires_auth": False,
        "allowed_paths": ["/search", "/reverse"]
    },
    "overpass-api.de": {
        "methods": ["GET", "POST"],
        "rate_limit": 10,
        "description": "OpenStreetMap Overpass API",
        "requires_auth": False,
        "allowed_paths": ["/api/interpreter"]
    }
}

# Blocked paths that should never be accessed
BLOCKED_PATHS: List[str] = [
    "/admin",
    "/internal",
    "/.env",
    "/config",
    "/credentials",
    "/secrets",
    "/private",
    "/.git",
    "/wp-admin",
    "/phpmyadmin",
    "/.htaccess",
    "/server-status",
]

# Blocked domains
BLOCKED_DOMAINS: List[str] = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "10.",  # Private network
    "172.16.",
    "172.17.",
    "172.18.",
    "172.19.",
    "172.20.",
    "172.21.",
    "172.22.",
    "172.23.",
    "172.24.",
    "172.25.",
    "172.26.",
    "172.27.",
    "172.28.",
    "172.29.",
    "172.30.",
    "172.31.",
    "192.168.",
    "169.254.",  # Link-local
]

# Internal/private IP networks for DNS rebinding protection
INTERNAL_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),  # Link-local
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),  # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),  # IPv6 private
    ipaddress.ip_network("fe80::/10"),  # IPv6 link-local
]


class DNSRebindingProtection:
    """
    Protection against DNS rebinding attacks.

    DNS rebinding attacks work by:
    1. Attacker controls DNS for evil.com
    2. First DNS query returns attacker's IP (passes validation)
    3. Subsequent queries return internal IP (127.0.0.1, 10.x.x.x, etc.)
    4. Requests now hit internal services

    This class mitigates by:
    - Caching DNS resolutions with TTL
    - Re-validating IP on each request
    - Checking resolved IP against internal networks
    """

    def __init__(self, cache_ttl: int = 60):
        self._cache: Dict[str, Tuple[str, float]] = {}  # host -> (ip, timestamp)
        self._ttl = cache_ttl
        self._lock = threading.Lock()
        self._logger = get_logger(__name__)

    def _is_internal_ip(self, ip_str: str) -> bool:
        """Check if IP address belongs to internal/private networks"""
        try:
            ip = ipaddress.ip_address(ip_str)
            for network in INTERNAL_NETWORKS:
                if ip in network:
                    return True
            return False
        except ValueError:
            # Invalid IP format - treat as suspicious
            return True

    def _resolve_hostname(self, host: str) -> Optional[str]:
        """Resolve hostname to IP address"""
        try:
            # Use getaddrinfo for both IPv4 and IPv6 support
            result = socket.getaddrinfo(host, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
            if result:
                # Return the first resolved IP
                return result[0][4][0]
            return None
        except socket.gaierror as e:
            self._logger.warning(f"DNS resolution failed for {host}: {e}")
            return None

    def resolve_and_validate(self, host: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Resolve hostname and validate against internal networks.

        Args:
            host: The hostname to resolve

        Returns:
            Tuple of (is_valid, resolved_ip, error_message)
        """
        now = time.time()

        with self._lock:
            # Check cache freshness
            if host in self._cache:
                cached_ip, timestamp = self._cache[host]
                if now - timestamp < self._ttl:
                    # Cache is fresh - still validate the cached IP
                    if self._is_internal_ip(cached_ip):
                        self._logger.warning(
                            f"DNS rebinding detected: cached IP {cached_ip} for {host} is internal"
                        )
                        # Clear compromised cache entry
                        del self._cache[host]
                        return False, None, f"DNS rebinding attack detected: {host} resolved to internal IP"
                    return True, cached_ip, None

            # Cache expired or missing - re-resolve
            resolved_ip = self._resolve_hostname(host)

            if not resolved_ip:
                return False, None, f"Failed to resolve hostname: {host}"

            # Validate IP not internal
            if self._is_internal_ip(resolved_ip):
                self._logger.warning(
                    f"DNS rebinding blocked: {host} resolved to internal IP {resolved_ip}"
                )
                return False, None, f"Access denied: {host} resolves to internal network ({resolved_ip})"

            # Update cache with validated IP
            self._cache[host] = (resolved_ip, now)

            self._logger.debug(f"DNS validated: {host} -> {resolved_ip}")
            return True, resolved_ip, None

    def invalidate_cache(self, host: Optional[str] = None):
        """Invalidate DNS cache for a specific host or all hosts"""
        with self._lock:
            if host:
                self._cache.pop(host, None)
            else:
                self._cache.clear()

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            now = time.time()
            valid_entries = sum(1 for _, (_, ts) in self._cache.items() if now - ts < self._ttl)
            return {
                "total_entries": len(self._cache),
                "valid_entries": valid_entries,
                "ttl_seconds": self._ttl
            }


class NetworkAccessController:
    """
    Controls and validates network access for dynamically generated tools.

    Includes DNS rebinding protection to prevent SSRF attacks where:
    - An attacker controls DNS for a domain
    - Initial resolution returns a public IP
    - Subsequent resolutions return internal IPs (127.0.0.1, 10.x, etc.)
    """

    def __init__(self):
        self.logger = get_logger(__name__)
        self.allowed_apis = ALLOWED_APIS
        self.blocked_paths = BLOCKED_PATHS
        self.blocked_domains = BLOCKED_DOMAINS

        # DNS rebinding protection with 60-second cache TTL
        self.dns_protection = DNSRebindingProtection(cache_ttl=60)

        # Rate limiting tracking: domain -> list of request timestamps
        self.request_history: Dict[str, List[datetime]] = defaultdict(list)

    def validate_url(self, url: str, method: str = "GET") -> Tuple[bool, Optional[str]]:
        """
        Validate if a URL is allowed to be accessed.

        Includes DNS rebinding protection - resolves hostname and validates
        the IP address on each request to prevent SSRF attacks.

        Args:
            url: The URL to validate
            method: HTTP method (GET, POST, etc.)

        Returns:
            Tuple of (is_allowed, error_message or None)
        """
        try:
            parsed = urlparse(url)

            # Check for valid scheme
            if parsed.scheme not in ["http", "https"]:
                return False, f"Invalid URL scheme: {parsed.scheme}. Only HTTP/HTTPS allowed."

            # Prefer HTTPS
            if parsed.scheme == "http":
                self.logger.warning(
                    f"HTTP URL detected, consider using HTTPS",
                    extra={"url": url}
                )

            # Extract domain (handle port in netloc)
            domain = parsed.netloc.lower()
            host = domain.split(":")[0]  # Remove port if present

            # Check blocked domains (string-based check)
            for blocked in self.blocked_domains:
                if host.startswith(blocked) or blocked in host:
                    return False, f"Access to {domain} is blocked (private/internal network)"

            # DNS rebinding protection - resolve and validate IP
            is_valid_ip, resolved_ip, dns_error = self.dns_protection.resolve_and_validate(host)
            if not is_valid_ip:
                self.logger.warning(
                    f"DNS validation failed for {host}",
                    extra={"error": dns_error, "url": url}
                )
                return False, dns_error

            # Check blocked paths
            path = parsed.path.lower()
            for blocked_path in self.blocked_paths:
                if blocked_path in path:
                    return False, f"Path '{blocked_path}' is blocked for security reasons"

            # Check if domain is in allowed list
            if host not in self.allowed_apis:
                return False, f"Domain '{host}' is not in the approved API list"

            api_config = self.allowed_apis[host]

            # Check HTTP method
            if method.upper() not in api_config["methods"]:
                return False, f"Method {method} not allowed for {host}"

            # Check path restrictions if configured
            if "allowed_paths" in api_config:
                path_allowed = any(
                    path.startswith(allowed_path)
                    for allowed_path in api_config["allowed_paths"]
                )
                if not path_allowed:
                    return False, f"Path '{path}' not in allowed paths for {host}"

            # Check rate limiting
            is_within_limit, rate_error = self._check_rate_limit(host)
            if not is_within_limit:
                return False, rate_error

            # All checks passed
            self.logger.info(
                f"URL access validated",
                extra={"domain": host, "resolved_ip": resolved_ip, "path": path, "method": method}
            )
            return True, None

        except Exception as e:
            self.logger.error(f"URL validation error: {e}")
            return False, f"URL validation failed: {str(e)}"

    def _check_rate_limit(self, domain: str) -> Tuple[bool, Optional[str]]:
        """
        Check if the domain has exceeded its rate limit

        Args:
            domain: The domain to check

        Returns:
            Tuple of (is_within_limit, error_message or None)
        """
        if domain not in self.allowed_apis:
            return True, None

        rate_limit = self.allowed_apis[domain].get("rate_limit", 100)
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=1)

        # Clean old entries and count recent requests
        recent_requests = [
            ts for ts in self.request_history[domain]
            if ts > window_start
        ]
        self.request_history[domain] = recent_requests

        if len(recent_requests) >= rate_limit:
            return False, f"Rate limit exceeded for {domain} ({rate_limit}/min)"

        # Record this request
        self.request_history[domain].append(now)
        return True, None

    def get_api_config(self, domain: str) -> Optional[Dict[str, Any]]:
        """
        Get configuration for an allowed API

        Args:
            domain: The domain to look up

        Returns:
            API configuration dict or None if not allowed
        """
        return self.allowed_apis.get(domain.lower())

    def is_domain_allowed(self, domain: str) -> bool:
        """
        Check if a domain is in the allowed list

        Args:
            domain: The domain to check

        Returns:
            True if allowed, False otherwise
        """
        return domain.lower() in self.allowed_apis

    def list_allowed_apis(self) -> List[Dict[str, Any]]:
        """
        List all allowed APIs with their configurations

        Returns:
            List of API info dictionaries
        """
        return [
            {
                "domain": domain,
                "description": config.get("description", ""),
                "methods": config.get("methods", []),
                "rate_limit": config.get("rate_limit", 0),
                "requires_auth": config.get("requires_auth", False)
            }
            for domain, config in self.allowed_apis.items()
        ]

    def add_allowed_api(
        self,
        domain: str,
        methods: List[str] = None,
        rate_limit: int = 60,
        description: str = "",
        requires_auth: bool = False,
        allowed_paths: List[str] = None
    ) -> bool:
        """
        Add a new API to the allowed list (for admin use)

        Args:
            domain: Domain to allow
            methods: Allowed HTTP methods
            rate_limit: Requests per minute limit
            description: Human-readable description
            requires_auth: Whether API requires authentication
            allowed_paths: Optional path restrictions

        Returns:
            True if added successfully
        """
        if not domain:
            return False

        self.allowed_apis[domain.lower()] = {
            "methods": methods or ["GET"],
            "rate_limit": rate_limit,
            "description": description,
            "requires_auth": requires_auth,
            "allowed_paths": allowed_paths or []
        }

        self.logger.info(
            f"Added allowed API",
            extra={"domain": domain, "rate_limit": rate_limit}
        )
        return True

    def get_rate_limit_status(self, domain: str) -> Dict[str, Any]:
        """
        Get current rate limit status for a domain

        Args:
            domain: The domain to check

        Returns:
            Rate limit status dictionary
        """
        if domain not in self.allowed_apis:
            return {"error": "Domain not in allowed list"}

        rate_limit = self.allowed_apis[domain].get("rate_limit", 100)
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=1)

        recent_requests = [
            ts for ts in self.request_history.get(domain, [])
            if ts > window_start
        ]

        return {
            "domain": domain,
            "rate_limit": rate_limit,
            "requests_in_window": len(recent_requests),
            "remaining": max(0, rate_limit - len(recent_requests)),
            "window_reset": (window_start + timedelta(minutes=1)).isoformat()
        }


# Module-level instance
network_controller = NetworkAccessController()


def get_network_controller() -> NetworkAccessController:
    """Get the network controller instance"""
    return network_controller
