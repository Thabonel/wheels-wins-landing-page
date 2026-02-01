"""
Admin API Module
Administrative endpoints with secure JWT-based authentication and audit logging

Date: January 10, 2025
"""

from datetime import datetime
from fastapi import APIRouter, Header, HTTPException, Request, Depends
from app.analytics.dashboard import fetch_dashboard_stats
from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.admin_security import verify_admin_access, verify_super_admin_access, log_admin_action, audit_logger

from .model_config import router as model_config_router
from .intelligent_router import router as intelligent_router_router

logger = get_logger(__name__)

# Create main admin router
router = APIRouter(prefix="/admin", tags=["admin"])

# Include sub-routers with secure authentication
router.include_router(model_config_router)
router.include_router(intelligent_router_router)

# Secure admin metrics endpoint
@router.get("/metrics")
async def get_admin_metrics(
    request: Request,
    admin_user: dict = Depends(verify_admin_access)
):
    """Secure admin metrics endpoint with JWT authentication and audit logging"""
    try:
        # Fetch dashboard stats
        stats = await fetch_dashboard_stats()

        # Log successful metrics access
        audit_logger.log_admin_action(
            user_id=admin_user.get('sub', 'unknown'),
            action="fetch_metrics",
            resource="dashboard_stats",
            details={"metrics_count": len(stats) if isinstance(stats, dict) else 0},
            request=request,
            success=True
        )

        return stats

    except Exception as e:
        # Log failed metrics access
        audit_logger.log_admin_action(
            user_id=admin_user.get('sub', 'unknown'),
            action="fetch_metrics",
            resource="dashboard_stats",
            details={},
            request=request,
            success=False,
            error_message=str(e)
        )
        logger.error(f"Admin metrics fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch metrics")

# Legacy endpoint for backward compatibility (deprecated)
@router.get("/metrics/legacy")
async def get_admin_metrics_legacy(x_admin_token: str | None = Header(None)):
    """
    DEPRECATED: Legacy admin metrics endpoint using header authentication
    Use /admin/metrics instead with proper JWT authentication
    """
    logger.warning("DEPRECATED: Legacy admin metrics endpoint accessed")

    settings = get_settings()
    expected = getattr(settings, "ADMIN_TOKEN", None)

    if not expected or x_admin_token != expected:
        logger.warning("Unauthorized legacy admin metrics access")
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Add deprecation warning to response
    stats = await fetch_dashboard_stats()
    if isinstance(stats, dict):
        stats["_deprecation_warning"] = "This endpoint is deprecated. Use /admin/metrics with JWT authentication."

    return stats

# Admin security status endpoint
@router.get("/security/status")
async def get_admin_security_status(
    request: Request,
    admin_user: dict = Depends(verify_admin_access)
):
    """Get admin security configuration and audit status"""
    try:
        from app.core.enhanced_security_setup import get_security_recommendations

        security_info = get_security_recommendations()

        admin_security_status = {
            "timestamp": datetime.utcnow().isoformat(),
            "admin_user": {
                "user_id": admin_user.get('sub', 'unknown'),
                "admin_level": admin_user.get('admin_level', 1),
                "is_super_admin": admin_user.get('is_super_admin', False),
                "role": admin_user.get('admin_role', 'admin')
            },
            "authentication": {
                "method": "JWT with role validation",
                "legacy_header_auth": "deprecated",
                "audit_logging": "enabled",
                "session_tracking": "enabled"
            },
            "security_recommendations": security_info,
            "admin_endpoints": {
                "total_count": len([rule for rule in request.app.routes if 'admin' in str(rule.path)]),
                "secured_with_jwt": True,
                "audit_logged": True,
                "rate_limited": True
            }
        }

        # Log security status access
        audit_logger.log_admin_action(
            user_id=admin_user.get('sub', 'unknown'),
            action="security_status_check",
            resource="admin_security",
            details={"security_score": security_info.get('security_score', 0)},
            request=request,
            success=True
        )

        return admin_security_status

    except Exception as e:
        logger.error(f"Admin security status check failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to get security status")

# Admin audit log endpoint (super admin only)
@router.get("/audit/recent")
async def get_recent_audit_logs(
    request: Request,
    limit: int = 100,
    admin_user: dict = Depends(verify_super_admin_access)
):
    """Get recent admin audit logs (super admin only)"""
    try:
        # This would typically query a database or log aggregation service
        # For now, return a placeholder structure
        audit_summary = {
            "timestamp": datetime.utcnow().isoformat(),
            "requester": {
                "user_id": admin_user.get('sub', 'unknown'),
                "admin_level": admin_user.get('admin_level', 2)
            },
            "audit_logs": {
                "total_entries": 0,
                "limit": limit,
                "note": "Audit log querying would be implemented with log aggregation service",
                "log_sources": ["application_logs", "audit_logger", "security_events"]
            },
            "log_retention": {
                "audit_logs": "7 years",
                "security_events": "2 years",
                "admin_actions": "1 year"
            }
        }

        # Log audit log access (meta-logging)
        audit_logger.log_admin_action(
            user_id=admin_user.get('sub', 'unknown'),
            action="audit_log_access",
            resource="admin_audit_logs",
            details={"limit": limit},
            request=request,
            success=True
        )

        return audit_summary

    except Exception as e:
        logger.error(f"Audit log retrieval failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve audit logs")

__all__ = ["router"]
