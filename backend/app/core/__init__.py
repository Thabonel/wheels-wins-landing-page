"""
Core module exports for backend application.
"""

from app.core.url_validator import (
    SSRFProtectionError,
    validate_url_safe,
    is_url_safe,
    get_blocked_networks,
    get_blocked_hosts,
    BLOCKED_HOSTS,
    BLOCKED_NETWORKS_IPV4,
    BLOCKED_NETWORKS_IPV6,
    ALLOWED_SCHEMES,
)

__all__ = [
    # SSRF Protection
    "SSRFProtectionError",
    "validate_url_safe",
    "is_url_safe",
    "get_blocked_networks",
    "get_blocked_hosts",
    "BLOCKED_HOSTS",
    "BLOCKED_NETWORKS_IPV4",
    "BLOCKED_NETWORKS_IPV6",
    "ALLOWED_SCHEMES",
]
