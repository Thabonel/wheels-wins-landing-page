"""
Admin Security Module
Secure admin authentication and audit logging for administrative operations.

Date: January 10, 2025
"""

import json
import base64
from datetime import datetime
from typing import Dict, Optional
from fastapi import HTTPException, Request, Depends
from app.api.deps import verify_supabase_jwt_token
import logging

logger = logging.getLogger(__name__)


class AdminSecurityError(Exception):
    """Custom exception for admin security violations"""
    pass


class AdminAuditLogger:
    """Comprehensive audit logging for admin actions"""

    def __init__(self):
        self.audit_logger = logging.getLogger("admin_audit")

        # Ensure audit logger has proper formatting
        if not self.audit_logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - ADMIN_AUDIT - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.audit_logger.addHandler(handler)
            self.audit_logger.setLevel(logging.INFO)

    def log_admin_action(
        self,
        user_id: str,
        action: str,
        resource: str,
        details: Dict,
        request: Request,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """Log admin action with comprehensive context"""

        audit_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "action": action,
            "resource": resource,
            "success": success,
            "request_details": {
                "method": request.method,
                "path": str(request.url.path),
                "query_params": str(request.query_params),
                "user_agent": request.headers.get("User-Agent", "unknown"),
                "ip_address": self._get_client_ip(request),
                "referer": request.headers.get("Referer", "none")
            },
            "action_details": details,
            "error_message": error_message
        }

        if success:
            self.audit_logger.info(f"ADMIN_SUCCESS: {json.dumps(audit_entry)}")
        else:
            self.audit_logger.error(f"ADMIN_FAILURE: {json.dumps(audit_entry)}")

        # Also log to main logger for monitoring systems
        if success:
            logger.info(f"Admin action: {user_id} {action} on {resource}")
        else:
            logger.warning(f"Failed admin action: {user_id} {action} on {resource} - {error_message}")

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        # Check X-Forwarded-For header (from proxy)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fallback to direct connection
        return request.client.host if request.client else "unknown"


class AdminRoleValidator:
    """Secure admin role validation using JWT claims"""

    @staticmethod
    def extract_user_claims(token: str) -> Dict:
        """
        Extract user claims from JWT token

        Note: This does basic JWT parsing for role extraction.
        The token signature is already verified by verify_supabase_jwt_token
        """
        try:
            # Split token and get payload
            parts = token.split('.')
            if len(parts) != 3:
                raise AdminSecurityError("Invalid token format")

            # Decode payload (add padding if needed)
            payload_b64 = parts[1]
            payload_b64 += '=' * (4 - len(payload_b64) % 4)
            payload = base64.urlsafe_b64decode(payload_b64)

            user_claims = json.loads(payload)
            return user_claims

        except Exception as e:
            logger.error(f"Failed to extract user claims: {e}")
            raise AdminSecurityError("Invalid token structure")

    @staticmethod
    def validate_admin_role(user_claims: Dict) -> bool:
        """
        Validate if user has admin role

        Checks multiple possible admin role indicators:
        - role field in JWT
        - is_admin boolean flag
        - admin_level numeric indicator
        """

        # Check explicit role field
        role = user_claims.get('role', '').lower()
        if role in ['admin', 'administrator', 'superuser']:
            return True

        # Check boolean admin flag
        if user_claims.get('is_admin', False):
            return True

        # Check numeric admin level (if implemented)
        admin_level = user_claims.get('admin_level', 0)
        if admin_level > 0:
            return True

        # Check app_metadata for admin role (Supabase pattern)
        app_metadata = user_claims.get('app_metadata', {})
        if app_metadata.get('is_admin', False):
            return True

        # Check user_metadata for admin role
        user_metadata = user_claims.get('user_metadata', {})
        if user_metadata.get('is_admin', False):
            return True

        return False

    @staticmethod
    def get_admin_level(user_claims: Dict) -> int:
        """Get numeric admin level (0=no admin, 1=basic admin, 2=super admin)"""

        if not AdminRoleValidator.validate_admin_role(user_claims):
            return 0

        # Check for super admin indicators
        role = user_claims.get('role', '').lower()
        if role in ['superuser', 'super_admin']:
            return 2

        admin_level = user_claims.get('admin_level', 1)
        return max(1, admin_level)  # At least level 1 if admin


# Global instances
audit_logger = AdminAuditLogger()
role_validator = AdminRoleValidator()


async def verify_admin_access(
    request: Request,
    current_user: dict = Depends(verify_supabase_jwt_token),
    required_level: int = 1
) -> Dict:
    """
    Secure admin access verification dependency

    Args:
        request: FastAPI request object
        current_user: JWT-verified user data from dependency
        required_level: Minimum admin level required (1=basic admin, 2=super admin)

    Returns:
        Dict with admin user information

    Raises:
        HTTPException: If admin access is denied
    """

    try:
        # Extract JWT token from Authorization header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise AdminSecurityError("Missing or invalid authorization header")

        token = auth_header.replace("Bearer ", "")

        # Extract user claims
        user_claims = role_validator.extract_user_claims(token)

        # Validate admin role
        if not role_validator.validate_admin_role(user_claims):
            audit_logger.log_admin_action(
                user_id=current_user.get('sub', 'unknown'),
                action="access_denied",
                resource="admin_endpoint",
                details={"reason": "insufficient_privileges", "role": user_claims.get('role', 'none')},
                request=request,
                success=False,
                error_message="User does not have admin privileges"
            )
            raise HTTPException(
                status_code=403,
                detail="Admin access required"
            )

        # Check admin level if specified
        user_admin_level = role_validator.get_admin_level(user_claims)
        if user_admin_level < required_level:
            audit_logger.log_admin_action(
                user_id=current_user.get('sub', 'unknown'),
                action="access_denied",
                resource="admin_endpoint",
                details={
                    "reason": "insufficient_admin_level",
                    "user_level": user_admin_level,
                    "required_level": required_level
                },
                request=request,
                success=False,
                error_message=f"Admin level {required_level} required, user has level {user_admin_level}"
            )
            raise HTTPException(
                status_code=403,
                detail=f"Admin level {required_level} required"
            )

        # Log successful admin access
        audit_logger.log_admin_action(
            user_id=current_user.get('sub', 'unknown'),
            action="access_granted",
            resource="admin_endpoint",
            details={
                "admin_level": user_admin_level,
                "user_role": user_claims.get('role', 'unknown')
            },
            request=request,
            success=True
        )

        # Return enhanced admin user info
        return {
            **current_user,
            "admin_level": user_admin_level,
            "admin_role": user_claims.get('role', 'admin'),
            "is_super_admin": user_admin_level >= 2
        }

    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Admin access verification failed: {e}")
        audit_logger.log_admin_action(
            user_id=current_user.get('sub', 'unknown'),
            action="access_error",
            resource="admin_endpoint",
            details={"error_type": type(e).__name__},
            request=request,
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=500,
            detail="Admin access verification failed"
        )


async def verify_super_admin_access(
    request: Request,
    current_user: dict = Depends(verify_supabase_jwt_token)
) -> Dict:
    """Shortcut dependency for super admin access (level 2)"""
    return await verify_admin_access(request, current_user, required_level=2)


def log_admin_action(action: str, resource: str, details: Dict = None):
    """Decorator for automatic admin action logging"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract request and admin_user from kwargs
            request = kwargs.get('request')
            admin_user = kwargs.get('admin_user') or kwargs.get('current_user')

            if not request or not admin_user:
                logger.warning(f"Admin action logging failed: missing request or admin_user in {func.__name__}")
                return await func(*args, **kwargs)

            try:
                result = await func(*args, **kwargs)

                # Log successful action
                audit_logger.log_admin_action(
                    user_id=admin_user.get('sub', 'unknown'),
                    action=action,
                    resource=resource,
                    details=details or {},
                    request=request,
                    success=True
                )

                return result

            except Exception as e:
                # Log failed action
                audit_logger.log_admin_action(
                    user_id=admin_user.get('sub', 'unknown'),
                    action=action,
                    resource=resource,
                    details=details or {},
                    request=request,
                    success=False,
                    error_message=str(e)
                )
                raise

        return wrapper
    return decorator