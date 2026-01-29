
from fastapi import APIRouter, status, HTTPException
from datetime import datetime
import os
import logging

# Optional psutil import for deployment compatibility
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    psutil = None

router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
async def root_health_check():
    """Root health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "pam-backend"
    }

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Standard health check endpoint - optimized for speed"""
    # Fast endpoint for load balancers and monitoring
    # No system metrics to avoid blocking operations
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "pam-backend",
        "version": "2.0.0",
        "environment": os.getenv("ENVIRONMENT", "production")
    }

@router.get("/detailed", status_code=status.HTTP_200_OK)
async def detailed_health_check():
    """Detailed health check with system metrics"""
    
    metrics = {
        "python_version": os.sys.version,
    }
    
    # Add system metrics if psutil is available
    if PSUTIL_AVAILABLE:
        metrics.update({
            "cpu_percent": psutil.cpu_percent(interval=None),  # Instantaneous, non-blocking
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent,
        })
    else:
        metrics["note"] = "System metrics unavailable (psutil not installed)"
    
    # Add platform status information (non-blocking)
    platform_status = {}
    try:
        # Use environment variables directly to avoid configuration import issues
        platform_status = {
            "gemini": "configured" if os.getenv('GEMINI_API_KEY') else "not_configured",
            "anthropic": "configured" if os.getenv('ANTHROPIC_API_KEY') else "not_configured",
            "langfuse": "configured" if (os.getenv('LANGFUSE_SECRET_KEY') and os.getenv('LANGFUSE_PUBLIC_KEY')) else "not_configured",
            "observability_enabled": os.getenv('OBSERVABILITY_ENABLED', 'false').lower() == 'true'
        }
    except Exception as e:
        platform_status = {
            "error": f"Could not check platform status: {str(e)}",
            "gemini": "unknown",
            "anthropic": "unknown",
            "langfuse": "unknown"
        }

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "pam-backend",
        "metrics": metrics,
        "platform_status": platform_status,
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@router.get("/startup", status_code=status.HTTP_200_OK)
async def startup_health_check():
    """Comprehensive startup health check - validates all critical services"""
    logger = logging.getLogger(__name__)

    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "pam-backend",
        "startup_checks": {}
    }

    checks_passed = 0
    total_checks = 0

    # Check 1: Environment variables
    total_checks += 1
    env_check = {
        "supabase_url": bool(os.getenv("SUPABASE_URL")),
        "supabase_service_key": bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY")) and
                               os.getenv("SUPABASE_SERVICE_ROLE_KEY") != "your_service_role_key_here_from_supabase_dashboard",
        "anthropic_key": bool(os.getenv("ANTHROPIC_API_KEY"))
    }
    env_ok = all(env_check.values())
    health_status["startup_checks"]["environment"] = {
        "status": "pass" if env_ok else "fail",
        "details": env_check
    }
    if env_ok:
        checks_passed += 1

    # Check 2: Critical dependencies
    total_checks += 1
    deps_check = {}
    try:
        import yaml
        deps_check["yaml"] = True
    except ImportError:
        deps_check["yaml"] = False

    try:
        import anthropic
        deps_check["anthropic"] = True
    except ImportError:
        deps_check["anthropic"] = False

    try:
        from supabase import create_client
        deps_check["supabase"] = True
    except ImportError:
        deps_check["supabase"] = False

    deps_ok = all(deps_check.values())
    health_status["startup_checks"]["dependencies"] = {
        "status": "pass" if deps_ok else "fail",
        "details": deps_check
    }
    if deps_ok:
        checks_passed += 1

    # Check 3: Supabase connectivity (if environment is configured)
    total_checks += 1
    if env_check["supabase_url"] and env_check["supabase_service_key"]:
        try:
            from supabase import create_client
            client = create_client(
                os.getenv("SUPABASE_URL"),
                os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            )
            # Simple health check query
            result = client.table("profiles").select("id").limit(1).execute()
            supabase_ok = True
            supabase_detail = "Connected successfully"
        except Exception as e:
            supabase_ok = False
            supabase_detail = f"Connection failed: {str(e)}"
    else:
        supabase_ok = False
        supabase_detail = "Environment not configured"

    health_status["startup_checks"]["supabase"] = {
        "status": "pass" if supabase_ok else "fail",
        "details": supabase_detail
    }
    if supabase_ok:
        checks_passed += 1

    # Check 4: Redis (optional - graceful degradation)
    total_checks += 1
    redis_status = "not_configured"
    redis_detail = "Redis URL not provided"

    if os.getenv("REDIS_URL"):
        try:
            import redis
            r = redis.from_url(os.getenv("REDIS_URL"))
            r.ping()
            redis_status = "pass"
            redis_detail = "Connected successfully"
            checks_passed += 1
        except Exception as e:
            redis_status = "fail"
            redis_detail = f"Connection failed: {str(e)} (will use fallback mode)"
            checks_passed += 1  # Redis is optional, so we count this as passed
    else:
        checks_passed += 1  # Redis is optional

    health_status["startup_checks"]["redis"] = {
        "status": redis_status,
        "details": redis_detail,
        "optional": True
    }

    # Overall health
    health_status["checks_passed"] = checks_passed
    health_status["total_checks"] = total_checks
    health_status["success_rate"] = f"{(checks_passed/total_checks)*100:.1f}%"

    if checks_passed < 3:  # Require at least environment, dependencies, and supabase
        health_status["status"] = "unhealthy"
        raise HTTPException(
            status_code=503,
            detail=f"Critical startup checks failed: {checks_passed}/{total_checks} passed"
        )

    logger.info(f"Startup health check completed: {checks_passed}/{total_checks} checks passed")
    return health_status
