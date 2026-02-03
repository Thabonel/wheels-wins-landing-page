"""
SSRF (Server-Side Request Forgery) Protection Module

Provides URL validation to prevent SSRF attacks against internal networks.
Use this module before making any outbound HTTP requests.

Usage:
    from app.core.url_validator import validate_url_safe, SSRFProtectionError

    try:
        validate_url_safe(url)
        # Safe to make request
    except SSRFProtectionError as e:
        # URL is not safe, do not make request
        logger.warning(f"SSRF protection blocked request: {e}")
"""

import ipaddress
import socket
from typing import Set, List, Union
from urllib.parse import urlparse


class SSRFProtectionError(Exception):
    """Raised when URL validation fails due to SSRF risk."""

    def __init__(self, message: str, url: str = ""):
        self.message = message
        self.url = url
        super().__init__(self.message)


# Blocked hostnames - direct matches that are always blocked
BLOCKED_HOSTS: Set[str] = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "[::1]",
    "0",
    "0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0",
}

# Private/internal IP networks that should never be accessed
# Using CIDR notation for proper range checking
BLOCKED_NETWORKS_IPV4: List[ipaddress.IPv4Network] = [
    ipaddress.IPv4Network("10.0.0.0/8"),       # Private Class A (RFC 1918)
    ipaddress.IPv4Network("172.16.0.0/12"),    # Private Class B (RFC 1918)
    ipaddress.IPv4Network("192.168.0.0/16"),   # Private Class C (RFC 1918)
    ipaddress.IPv4Network("169.254.0.0/16"),   # Link-local (RFC 3927)
    ipaddress.IPv4Network("127.0.0.0/8"),      # Loopback (RFC 1122)
    ipaddress.IPv4Network("0.0.0.0/8"),        # Current network (RFC 1122)
    ipaddress.IPv4Network("100.64.0.0/10"),    # Shared address space (RFC 6598)
    ipaddress.IPv4Network("192.0.0.0/24"),     # IETF Protocol Assignments
    ipaddress.IPv4Network("192.0.2.0/24"),     # TEST-NET-1 (RFC 5737)
    ipaddress.IPv4Network("198.51.100.0/24"),  # TEST-NET-2 (RFC 5737)
    ipaddress.IPv4Network("203.0.113.0/24"),   # TEST-NET-3 (RFC 5737)
    ipaddress.IPv4Network("224.0.0.0/4"),      # Multicast (RFC 3171)
    ipaddress.IPv4Network("240.0.0.0/4"),      # Reserved (RFC 1112)
    ipaddress.IPv4Network("255.255.255.255/32"),  # Broadcast
]

BLOCKED_NETWORKS_IPV6: List[ipaddress.IPv6Network] = [
    ipaddress.IPv6Network("::1/128"),          # Loopback
    ipaddress.IPv6Network("::/128"),           # Unspecified
    ipaddress.IPv6Network("fc00::/7"),         # Unique Local (RFC 4193)
    ipaddress.IPv6Network("fe80::/10"),        # Link-local (RFC 4291)
    ipaddress.IPv6Network("ff00::/8"),         # Multicast (RFC 4291)
    ipaddress.IPv6Network("::ffff:0:0/96"),    # IPv4-mapped (could be internal)
    ipaddress.IPv6Network("64:ff9b::/96"),     # IPv4/IPv6 translation (RFC 6052)
    ipaddress.IPv6Network("100::/64"),         # Discard (RFC 6666)
    ipaddress.IPv6Network("2001:db8::/32"),    # Documentation (RFC 3849)
]

# Allowed schemes - only HTTP and HTTPS
ALLOWED_SCHEMES: Set[str] = {"http", "https"}


def _is_ip_blocked(ip_str: str) -> bool:
    """
    Check if an IP address is in a blocked network range.

    Args:
        ip_str: IP address as string (IPv4 or IPv6)

    Returns:
        True if IP is in a blocked range, False otherwise
    """
    try:
        ip_obj = ipaddress.ip_address(ip_str)

        if isinstance(ip_obj, ipaddress.IPv4Address):
            for network in BLOCKED_NETWORKS_IPV4:
                if ip_obj in network:
                    return True
        elif isinstance(ip_obj, ipaddress.IPv6Address):
            for network in BLOCKED_NETWORKS_IPV6:
                if ip_obj in network:
                    return True

        return False

    except ValueError:
        # Invalid IP address format - treat as suspicious and block
        return True


def _resolve_hostname(hostname: str) -> List[str]:
    """
    Resolve hostname to IP addresses.

    Args:
        hostname: Hostname to resolve

    Returns:
        List of resolved IP addresses

    Raises:
        SSRFProtectionError: If DNS resolution fails
    """
    try:
        # Get all address info (supports both IPv4 and IPv6)
        addr_info = socket.getaddrinfo(
            hostname,
            None,
            socket.AF_UNSPEC,  # Allow both IPv4 and IPv6
            socket.SOCK_STREAM
        )

        # Extract unique IP addresses
        ips = list(set(info[4][0] for info in addr_info))

        if not ips:
            raise SSRFProtectionError(
                f"DNS resolution returned no addresses for hostname: {hostname}",
                url=hostname
            )

        return ips

    except socket.gaierror as e:
        raise SSRFProtectionError(
            f"DNS resolution failed for hostname '{hostname}': {e}",
            url=hostname
        )
    except socket.timeout:
        raise SSRFProtectionError(
            f"DNS resolution timed out for hostname: {hostname}",
            url=hostname
        )


def _extract_hostname(url: str) -> str:
    """
    Extract hostname from URL, handling edge cases.

    Args:
        url: URL to parse

    Returns:
        Hostname string

    Raises:
        SSRFProtectionError: If URL is malformed or has no hostname
    """
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname

        if not hostname:
            raise SSRFProtectionError(
                f"URL has no hostname: {url}",
                url=url
            )

        return hostname.lower()

    except Exception as e:
        raise SSRFProtectionError(
            f"Failed to parse URL '{url}': {e}",
            url=url
        )


def validate_url_safe(url: str, resolve_dns: bool = True) -> bool:
    """
    Validate URL is safe from SSRF attacks.

    Performs the following checks:
    1. Scheme is http or https only
    2. Host is not in blocked hosts list
    3. Resolved IP is not in blocked private/internal networks

    Args:
        url: The URL to validate
        resolve_dns: Whether to resolve hostname and check resolved IP.
                    Set to False if you only want to check the hostname itself.

    Returns:
        True if URL is safe

    Raises:
        SSRFProtectionError: If validation fails (URL is not safe)

    Example:
        >>> validate_url_safe("https://example.com/api")
        True
        >>> validate_url_safe("http://localhost/admin")
        SSRFProtectionError: Blocked host: localhost
        >>> validate_url_safe("http://192.168.1.1/")
        SSRFProtectionError: Host resolves to blocked IP: 192.168.1.1
    """
    if not url:
        raise SSRFProtectionError("URL cannot be empty", url=url)

    # Normalize URL
    url = url.strip()

    # Parse URL
    try:
        parsed = urlparse(url)
    except Exception as e:
        raise SSRFProtectionError(f"Invalid URL format: {e}", url=url)

    # Check scheme
    scheme = (parsed.scheme or "").lower()
    if scheme not in ALLOWED_SCHEMES:
        raise SSRFProtectionError(
            f"Invalid scheme '{scheme}'. Only {', '.join(ALLOWED_SCHEMES)} allowed.",
            url=url
        )

    # Extract hostname
    hostname = _extract_hostname(url)

    # Check against blocked hosts list
    if hostname in BLOCKED_HOSTS:
        raise SSRFProtectionError(
            f"Blocked host: {hostname}",
            url=url
        )

    # Check if hostname is already an IP address
    try:
        ip_obj = ipaddress.ip_address(hostname)
        if _is_ip_blocked(str(ip_obj)):
            raise SSRFProtectionError(
                f"Blocked IP address: {hostname}",
                url=url
            )
        # IP is valid and not blocked
        return True
    except ValueError:
        # Not an IP address, it's a hostname - continue with DNS resolution
        pass

    # Optionally resolve hostname and check resolved IPs
    if resolve_dns:
        resolved_ips = _resolve_hostname(hostname)

        for ip in resolved_ips:
            if _is_ip_blocked(ip):
                raise SSRFProtectionError(
                    f"Host '{hostname}' resolves to blocked IP: {ip}",
                    url=url
                )

    return True


def is_url_safe(url: str, resolve_dns: bool = True) -> bool:
    """
    Check if URL is safe from SSRF attacks (non-raising version).

    Same checks as validate_url_safe but returns False instead of raising.

    Args:
        url: The URL to validate
        resolve_dns: Whether to resolve hostname and check resolved IP

    Returns:
        True if URL is safe, False otherwise

    Example:
        >>> is_url_safe("https://example.com/api")
        True
        >>> is_url_safe("http://localhost/admin")
        False
    """
    try:
        return validate_url_safe(url, resolve_dns=resolve_dns)
    except SSRFProtectionError:
        return False


def get_blocked_networks() -> List[str]:
    """
    Get list of blocked network ranges for documentation/debugging.

    Returns:
        List of blocked network CIDR strings
    """
    ipv4 = [str(net) for net in BLOCKED_NETWORKS_IPV4]
    ipv6 = [str(net) for net in BLOCKED_NETWORKS_IPV6]
    return ipv4 + ipv6


def get_blocked_hosts() -> Set[str]:
    """
    Get set of blocked hostnames for documentation/debugging.

    Returns:
        Set of blocked hostname strings
    """
    return BLOCKED_HOSTS.copy()
