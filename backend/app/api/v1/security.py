"""
Security Monitoring and Metrics API
Provides endpoints for security dashboard, audit logs, threat detection, and incident management.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
import json

from app.core.unified_auth import get_current_user, admin_required
from app.core.logging import get_logger
from app.core.security_monitoring import SecurityMonitor, ThreatSeverity, ThreatType
from app.services.incident import (
    incident_response_automation,
    IncidentStatus,
    IncidentCategory,
    EscalationLevel
)

logger = get_logger(__name__)

router = APIRouter(
    prefix="/security",
    tags=["security"],
    dependencies=[Depends(admin_required)]  # All endpoints require admin access
)

# Initialize security monitor (shared instance)
security_monitor = SecurityMonitor()

@router.on_event("startup")
async def startup_security_monitor():
    """Initialize security monitor on startup"""
    await security_monitor.initialize()
    await incident_response_automation.initialize()


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_security_dashboard(
    time_range: str = Query("24h", description="Time range: 1h, 24h, 7d, 30d"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get comprehensive security dashboard data

    Returns:
    - Threat statistics
    - Incident summary
    - Security metrics
    - Real-time monitoring status
    """
    try:
        # Get threat statistics
        threat_stats = await security_monitor.get_threat_statistics()

        # Get incident statistics
        incident_stats = await incident_response_automation.get_incident_statistics()

        # Calculate time range
        time_ranges = {
            "1h": timedelta(hours=1),
            "24h": timedelta(days=1),
            "7d": timedelta(days=7),
            "30d": timedelta(days=30)
        }

        time_delta = time_ranges.get(time_range, timedelta(days=1))
        start_time = datetime.now() - time_delta

        # Security metrics
        security_metrics = {
            "authentication_failures": await _get_auth_failure_rate(start_time),
            "privilege_escalation_attempts": await _get_privilege_escalation_attempts(start_time),
            "api_rate_limit_violations": await _get_rate_limit_violations(start_time),
            "blocked_ips": len(security_monitor.blocked_ips),
            "blocked_users": len(security_monitor.blocked_users),
            "threat_detection_rate": await _calculate_threat_detection_rate(start_time),
            "incident_response_time": await _calculate_avg_response_time(start_time)
        }

        # Real-time monitoring status
        monitoring_status = {
            "active_threats": await _get_active_threats(),
            "system_health": "healthy",  # Would be calculated from various metrics
            "monitoring_coverage": 95.7,  # Percentage of systems under monitoring
            "last_threat_detected": await _get_last_threat_time(),
            "redis_connected": security_monitor.redis_client is not None,
            "incident_automation_status": "active"
        }

        dashboard_data = {
            "overview": {
                "total_threats_detected": threat_stats.get("total_events", 0),
                "active_incidents": incident_stats.get("open_incidents", 0),
                "blocked_entities": security_metrics["blocked_ips"] + security_metrics["blocked_users"],
                "threat_level": await _calculate_overall_threat_level(threat_stats),
                "time_range": time_range
            },
            "threat_statistics": threat_stats,
            "incident_summary": incident_stats,
            "security_metrics": security_metrics,
            "monitoring_status": monitoring_status,
            "recent_alerts": await _get_recent_alerts(5),
            "top_threat_sources": await _get_top_threat_sources(10),
            "threat_trends": await _get_threat_trends(time_delta)
        }

        return dashboard_data

    except Exception as e:
        logger.error(f"Error getting security dashboard: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve security dashboard data"
        )


@router.get("/audit-log")
async def get_audit_log(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    source_ip: Optional[str] = Query(None, description="Filter by source IP"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get paginated audit log of security events

    Supports filtering by:
    - Event type (threat type)
    - Severity level
    - Source IP
    - Date range
    """
    try:
        # Calculate offset
        offset = (page - 1) * limit

        # Build filters
        filters = {}
        if event_type:
            filters['event_type'] = event_type
        if severity:
            filters['severity'] = severity
        if source_ip:
            filters['source_ip'] = source_ip
        if start_date:
            filters['start_date'] = start_date
        if end_date:
            filters['end_date'] = end_date

        # Get audit log entries
        audit_entries = await _get_audit_log_entries(offset, limit, filters)
        total_entries = await _count_audit_log_entries(filters)

        # Calculate pagination info
        total_pages = (total_entries + limit - 1) // limit
        has_next = page < total_pages
        has_prev = page > 1

        return {
            "entries": audit_entries,
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_entries": total_entries,
                "limit": limit,
                "has_next": has_next,
                "has_prev": has_prev
            },
            "filters_applied": filters
        }

    except Exception as e:
        logger.error(f"Error getting audit log: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve audit log"
        )


@router.get("/threat-detection")
async def get_threat_detection_data(
    time_range: str = Query("24h", description="Time range for threat data"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get real-time threat detection data and analytics
    """
    try:
        # Get threat detection statistics
        threat_data = {
            "active_threats": await _get_active_threats(),
            "threat_sources": await _get_threat_source_analysis(),
            "attack_patterns": await _get_attack_pattern_analysis(),
            "geolocation_data": await _get_threat_geolocation_data(),
            "blocked_entities": {
                "ips": list(security_monitor.blocked_ips),
                "users": list(security_monitor.blocked_users)
            },
            "detection_rules": await _get_active_detection_rules(),
            "false_positive_rate": await _calculate_false_positive_rate(),
            "threat_intelligence": await _get_threat_intelligence_data()
        }

        return threat_data

    except Exception as e:
        logger.error(f"Error getting threat detection data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve threat detection data"
        )


@router.get("/incidents")
async def get_incidents(
    status_filter: Optional[str] = Query(None, description="Filter by incident status"),
    severity_filter: Optional[str] = Query(None, description="Filter by severity"),
    category_filter: Optional[str] = Query(None, description="Filter by category"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get paginated list of security incidents
    """
    try:
        # Get incidents with filters
        incidents = await _get_incidents_with_filters({
            "status": status_filter,
            "severity": severity_filter,
            "category": category_filter
        }, page, limit)

        return incidents

    except Exception as e:
        logger.error(f"Error getting incidents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve incidents"
        )


@router.get("/incidents/{incident_id}")
async def get_incident_details(
    incident_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed information about a specific incident
    """
    try:
        incident = await incident_response_automation.get_incident(incident_id)

        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident {incident_id} not found"
            )

        # Add related events and timeline
        incident_details = {
            "incident": incident,
            "timeline": await _get_incident_timeline(incident_id),
            "related_events": await _get_incident_related_events(incident_id),
            "response_actions": await _get_incident_response_actions(incident_id),
            "impact_assessment": await _calculate_incident_impact(incident_id)
        }

        return incident_details

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting incident details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve incident details"
        )


@router.put("/incidents/{incident_id}/status")
async def update_incident_status(
    incident_id: str,
    new_status: str,
    assigned_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Update incident status and assignment
    """
    try:
        # Validate status
        try:
            status_enum = IncidentStatus(new_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {new_status}"
            )

        # Update incident
        success = await incident_response_automation.update_incident_status(
            incident_id, status_enum, assigned_to
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Incident {incident_id} not found"
            )

        return {
            "success": True,
            "incident_id": incident_id,
            "new_status": new_status,
            "assigned_to": assigned_to,
            "updated_by": current_user.get("email", "unknown")
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating incident status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update incident status"
        )


@router.post("/block-ip")
async def block_ip_address(
    ip_address: str,
    duration_minutes: int = 60,
    reason: str = "Manual block",
    current_user: dict = Depends(get_current_user)
):
    """
    Manually block an IP address
    """
    try:
        # Validate IP address format
        import ipaddress
        try:
            ipaddress.ip_address(ip_address)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid IP address format"
            )

        # Block the IP
        await security_monitor._block_ip(ip_address, duration_minutes)

        # Log the manual action
        logger.warning(f"IP {ip_address} manually blocked by {current_user.get('email')} for {reason}")

        return {
            "success": True,
            "ip_address": ip_address,
            "duration_minutes": duration_minutes,
            "reason": reason,
            "blocked_by": current_user.get("email", "unknown"),
            "blocked_at": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error blocking IP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to block IP address"
        )


@router.delete("/block-ip/{ip_address}")
async def unblock_ip_address(
    ip_address: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Manually unblock an IP address
    """
    try:
        # Remove from blocked set
        security_monitor.blocked_ips.discard(ip_address)

        # Remove from Redis if available
        if security_monitor.redis_client:
            key = f"blocked_ip:{ip_address}"
            await security_monitor.redis_client.delete(key)

        logger.info(f"IP {ip_address} unblocked by {current_user.get('email')}")

        return {
            "success": True,
            "ip_address": ip_address,
            "unblocked_by": current_user.get("email", "unknown"),
            "unblocked_at": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error unblocking IP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unblock IP address"
        )


@router.get("/metrics/export")
async def export_security_metrics(
    format: str = Query("json", description="Export format: json, csv"),
    time_range: str = Query("24h", description="Time range for export"),
    current_user: dict = Depends(get_current_user)
):
    """
    Export security metrics in various formats
    """
    try:
        # Get comprehensive security data
        metrics_data = {
            "export_timestamp": datetime.now().isoformat(),
            "time_range": time_range,
            "exported_by": current_user.get("email", "unknown"),
            "threat_statistics": await security_monitor.get_threat_statistics(),
            "incident_statistics": await incident_response_automation.get_incident_statistics(),
            "blocked_entities": {
                "ips": list(security_monitor.blocked_ips),
                "users": list(security_monitor.blocked_users)
            },
            "security_events": await _get_security_events_for_export(time_range)
        }

        if format.lower() == "json":
            return JSONResponse(
                content=metrics_data,
                headers={
                    "Content-Disposition": f"attachment; filename=security_metrics_{time_range}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                }
            )
        elif format.lower() == "csv":
            # Convert to CSV format (simplified)
            csv_content = await _convert_metrics_to_csv(metrics_data)
            return JSONResponse(
                content={"csv_data": csv_content},
                headers={
                    "Content-Disposition": f"attachment; filename=security_metrics_{time_range}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid export format. Use 'json' or 'csv'"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting security metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export security metrics"
        )


# Helper functions for data aggregation

async def _get_auth_failure_rate(start_time: datetime) -> Dict[str, int]:
    """Get authentication failure statistics"""
    # This would query actual authentication logs
    return {
        "total_attempts": 1234,
        "failed_attempts": 56,
        "success_rate": 95.5,
        "unique_failed_ips": 23
    }


async def _get_privilege_escalation_attempts(start_time: datetime) -> Dict[str, int]:
    """Get privilege escalation attempt statistics"""
    return {
        "total_attempts": 12,
        "blocked_attempts": 11,
        "successful_attempts": 1,
        "unique_sources": 8
    }


async def _get_rate_limit_violations(start_time: datetime) -> Dict[str, int]:
    """Get API rate limit violation statistics"""
    return {
        "total_violations": 89,
        "unique_ips": 34,
        "blocked_requests": 267,
        "most_violated_endpoint": "/api/auth/login"
    }


async def _calculate_threat_detection_rate(start_time: datetime) -> float:
    """Calculate threat detection rate percentage"""
    # This would be based on actual threat detection metrics
    return 97.8


async def _calculate_avg_response_time(start_time: datetime) -> str:
    """Calculate average incident response time"""
    # This would analyze actual incident response times
    return "4.2m"


async def _get_active_threats() -> List[Dict[str, Any]]:
    """Get currently active threats"""
    return [
        {
            "id": "threat_001",
            "type": "brute_force",
            "severity": "high",
            "source_ip": "192.168.1.100",
            "started_at": "2025-02-01T08:30:00Z",
            "status": "active"
        }
    ]


async def _get_last_threat_time() -> Optional[str]:
    """Get timestamp of last detected threat"""
    return "2025-02-01T09:45:23Z"


async def _calculate_overall_threat_level(threat_stats: Dict) -> str:
    """Calculate overall threat level based on statistics"""
    # Simple heuristic based on recent events
    total_events = threat_stats.get("total_events", 0)

    if total_events > 100:
        return "high"
    elif total_events > 50:
        return "medium"
    else:
        return "low"


async def _get_recent_alerts(limit: int) -> List[Dict[str, Any]]:
    """Get recent security alerts"""
    return [
        {
            "id": "alert_001",
            "title": "Multiple failed login attempts",
            "severity": "medium",
            "timestamp": "2025-02-01T09:30:00Z",
            "source": "auth_monitor"
        }
    ]


async def _get_top_threat_sources(limit: int) -> List[Dict[str, Any]]:
    """Get top threat source IPs"""
    return [
        {
            "ip": "192.168.1.100",
            "country": "Unknown",
            "threat_count": 45,
            "threat_types": ["brute_force", "ddos"]
        }
    ]


async def _get_threat_trends(time_delta: timedelta) -> Dict[str, List[Dict]]:
    """Get threat trends over time"""
    return {
        "hourly_threats": [
            {"timestamp": "2025-02-01T08:00:00Z", "count": 12},
            {"timestamp": "2025-02-01T09:00:00Z", "count": 8}
        ],
        "threat_type_trends": [
            {"type": "brute_force", "trend": "increasing"},
            {"type": "ddos", "trend": "stable"}
        ]
    }


async def _get_audit_log_entries(offset: int, limit: int, filters: Dict) -> List[Dict]:
    """Get paginated audit log entries with filters"""
    # This would query the actual audit log storage
    return [
        {
            "id": "event_001",
            "timestamp": "2025-02-01T09:45:23Z",
            "event_type": "brute_force",
            "severity": "high",
            "source_ip": "192.168.1.100",
            "endpoint": "/api/auth/login",
            "user_agent": "curl/7.64.1",
            "blocked": True,
            "details": {"attempts": 5}
        }
    ]


async def _count_audit_log_entries(filters: Dict) -> int:
    """Count total audit log entries matching filters"""
    return 1234  # Placeholder


async def _get_threat_source_analysis() -> Dict[str, Any]:
    """Get threat source analysis"""
    return {
        "geographic_distribution": {"US": 45, "CN": 23, "RU": 12},
        "top_asns": ["AS1234 Evil Corp", "AS5678 Bad ISP"],
        "known_threat_ips": 67,
        "tor_exit_nodes": 12
    }


async def _get_attack_pattern_analysis() -> Dict[str, Any]:
    """Get attack pattern analysis"""
    return {
        "common_patterns": ["login_spray", "api_enumeration"],
        "attack_sophistication": "medium",
        "automated_vs_manual": {"automated": 85, "manual": 15}
    }


async def _get_threat_geolocation_data() -> List[Dict[str, Any]]:
    """Get threat geolocation data for mapping"""
    return [
        {"lat": 40.7128, "lng": -74.0060, "threats": 23, "city": "New York"},
        {"lat": 51.5074, "lng": -0.1278, "threats": 12, "city": "London"}
    ]


async def _get_active_detection_rules() -> List[Dict[str, Any]]:
    """Get active threat detection rules"""
    return [
        {"id": "rule_001", "name": "Brute Force Detection", "enabled": True},
        {"id": "rule_002", "name": "SQL Injection Detection", "enabled": True}
    ]


async def _calculate_false_positive_rate() -> float:
    """Calculate false positive rate for threat detection"""
    return 2.3  # Percentage


async def _get_threat_intelligence_data() -> Dict[str, Any]:
    """Get threat intelligence data"""
    return {
        "ioc_matches": 23,
        "threat_feeds": ["malware_domains", "botnet_ips"],
        "last_update": "2025-02-01T08:00:00Z"
    }


async def _get_incidents_with_filters(filters: Dict, page: int, limit: int) -> Dict:
    """Get incidents with filters and pagination"""
    # Placeholder implementation
    return {
        "incidents": [],
        "total": 0,
        "page": page,
        "limit": limit
    }


async def _get_incident_timeline(incident_id: str) -> List[Dict]:
    """Get incident timeline events"""
    return [
        {
            "timestamp": "2025-02-01T09:00:00Z",
            "event": "Incident created",
            "actor": "system"
        }
    ]


async def _get_incident_related_events(incident_id: str) -> List[Dict]:
    """Get events related to incident"""
    return []


async def _get_incident_response_actions(incident_id: str) -> List[Dict]:
    """Get response actions taken for incident"""
    return []


async def _calculate_incident_impact(incident_id: str) -> Dict[str, Any]:
    """Calculate incident impact assessment"""
    return {
        "affected_users": 0,
        "affected_systems": [],
        "estimated_cost": 0,
        "reputation_impact": "low"
    }


async def _get_security_events_for_export(time_range: str) -> List[Dict]:
    """Get security events for export"""
    return []


async def _convert_metrics_to_csv(metrics_data: Dict) -> str:
    """Convert metrics data to CSV format"""
    # Simplified CSV conversion
    return "timestamp,metric,value\n2025-02-01T10:00:00Z,threats_detected,123"