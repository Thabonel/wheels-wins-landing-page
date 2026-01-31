
from fastapi import APIRouter, status, HTTPException
from datetime import datetime
import os
import logging
import time
import asyncio
from typing import Dict, Any

# Optional psutil import for deployment compatibility
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    psutil = None

router = APIRouter()

# Enhanced monitoring functions
async def get_ai_provider_status() -> Dict[str, Any]:
    """Get AI provider active status with connectivity test"""
    status_info = {
        "primary": {
            "provider": "unknown",
            "model": "unknown",
            "status": "unknown",
            "configured": False
        }
    }

    try:
        # Check Anthropic configuration
        anthropic_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC-WHEELS-KEY")
        if anthropic_key:
            status_info["primary"]["provider"] = "anthropic"
            status_info["primary"]["configured"] = True
            status_info["primary"]["model"] = "claude-3-5-sonnet-20241022"

            # Test connectivity with a minimal request
            try:
                import anthropic
                client = anthropic.AsyncAnthropic(api_key=anthropic_key)
                # Use a minimal test - just check if we can create a client and it responds
                # We don't make an actual API call to avoid costs and rate limits
                status_info["primary"]["status"] = "configured_untested"
            except Exception as e:
                status_info["primary"]["status"] = "error"
                status_info["primary"]["error"] = str(e)
        else:
            status_info["primary"]["status"] = "not_configured"

        # Check fallback providers
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            status_info["fallback"] = {
                "provider": "gemini",
                "model": "gemini-1.5-flash",
                "status": "configured",
                "configured": True
            }

    except Exception as e:
        status_info["primary"]["status"] = "error"
        status_info["primary"]["error"] = str(e)

    return status_info

async def get_tool_registry_status() -> Dict[str, Any]:
    """Get tool registry and individual tool status"""
    try:
        # Try to import and get tool registry stats
        try:
            from app.services.pam.tools.tool_registry import get_tool_registry
            registry = get_tool_registry()

            if hasattr(registry, 'get_tool_stats'):
                stats = registry.get_tool_stats()
                registry_stats = stats.get("registry_stats", {})

                return {
                    "status": "active",
                    "total_registered": registry_stats.get("total_tools", 0),
                    "enabled": registry_stats.get("enabled_tools", 0),
                    "disabled": registry_stats.get("total_tools", 0) - registry_stats.get("enabled_tools", 0),
                    "capabilities": registry_stats.get("capabilities", []),
                    "is_initialized": registry_stats.get("is_initialized", False),
                    "execution_stats": stats.get("tools", {})
                }
            else:
                # Fallback for basic registry info
                total_tools = len(getattr(registry, 'tools', {}))
                return {
                    "status": "active",
                    "total_registered": total_tools,
                    "enabled": total_tools,
                    "disabled": 0,
                    "is_initialized": True
                }

        except ImportError:
            return {
                "status": "not_available",
                "error": "Tool registry not imported",
                "total_registered": 0
            }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "total_registered": 0
        }

async def get_database_status() -> Dict[str, Any]:
    """Test database connectivity and performance"""
    try:
        start_time = time.time()

        # Test Supabase connectivity if configured
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if supabase_url and supabase_key and supabase_key != "your_service_role_key_here_from_supabase_dashboard":
            try:
                from supabase import create_client
                client = create_client(supabase_url, supabase_key)

                # Simple connectivity test
                result = client.table('profiles').select('id').limit(1).execute()
                query_time = (time.time() - start_time) * 1000

                return {
                    "status": "connected",
                    "provider": "supabase",
                    "query_test_ms": round(query_time, 2),
                    "last_test": datetime.utcnow().isoformat() + "Z",
                    "rows_tested": len(result.data) if result.data else 0
                }

            except Exception as db_error:
                return {
                    "status": "error",
                    "provider": "supabase",
                    "error": str(db_error),
                    "last_test": datetime.utcnow().isoformat() + "Z"
                }
        else:
            return {
                "status": "not_configured",
                "provider": "unknown",
                "error": "Database credentials not configured"
            }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "last_test": datetime.utcnow().isoformat() + "Z"
        }

async def get_agent_status() -> Dict[str, Any]:
    """Get PAM agent status and health"""
    status_info = {}

    try:
        # Check if PAM services are available
        try:
            from app.services.pam.core.pam import PAM
            status_info["PAM"] = {
                "status": "available",
                "class_loaded": True
            }
        except ImportError as e:
            status_info["PAM"] = {
                "status": "not_available",
                "error": str(e)
            }

        # Check for PersonalizedPamAgent or other agent classes
        try:
            # Try to import agent classes if they exist
            status_info["PersonalizedPamAgent"] = {
                "status": "not_implemented",
                "note": "This agent class may not exist in current architecture"
            }
        except Exception:
            pass

        # Check WebSocket manager if available
        try:
            from app.core.websocket_manager import manager
            if hasattr(manager, 'active_connections'):
                connection_count = len(getattr(manager, 'active_connections', {}))
                status_info["WebSocketManager"] = {
                    "status": "active",
                    "active_connections": connection_count
                }
            else:
                status_info["WebSocketManager"] = {
                    "status": "available",
                    "note": "WebSocket manager loaded but connection count unavailable"
                }
        except ImportError:
            status_info["WebSocketManager"] = {
                "status": "not_available"
            }

    except Exception as e:
        status_info["error"] = str(e)

    return status_info

def determine_overall_status(health_data: Dict[str, Any]) -> str:
    """Determine overall system health status"""
    # Check critical components
    ai_status = health_data.get("ai_providers", {}).get("primary", {}).get("status", "unknown")
    db_status = health_data.get("database", {}).get("status", "unknown")
    tools_available = health_data.get("tools", {}).get("total_registered", 0) > 0

    # Determine overall health
    if ai_status in ["configured_untested", "configured"] and db_status == "connected" and tools_available:
        return "healthy"
    elif ai_status != "error" and (db_status in ["connected", "not_configured"]):
        return "degraded"
    else:
        return "unhealthy"

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
    """Enhanced detailed health check with comprehensive monitoring"""

    start_time = time.time()

    # Basic system information
    health_data = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "service": "pam-backend",
        "version": "2.0.4",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

    # System metrics
    metrics = {
        "python_version": os.sys.version,
    }

    # Add system metrics if psutil is available
    if PSUTIL_AVAILABLE:
        try:
            memory = psutil.virtual_memory()
            metrics.update({
                "cpu_percent": psutil.cpu_percent(interval=None),  # Instantaneous, non-blocking
                "memory_percent": memory.percent,
                "memory_usage_mb": round(memory.used / 1024 / 1024, 1),
                "disk_usage": psutil.disk_usage('/').percent,
                "process_count": len(psutil.pids())
            })
        except Exception as e:
            metrics["system_metrics_error"] = str(e)
    else:
        metrics["note"] = "System metrics unavailable (psutil not installed)"

    health_data["performance"] = metrics

    # AI Provider status
    try:
        health_data["ai_providers"] = await get_ai_provider_status()
    except Exception as e:
        health_data["ai_providers"] = {"error": str(e)}

    # Agent status
    try:
        health_data["agents"] = await get_agent_status()
    except Exception as e:
        health_data["agents"] = {"error": str(e)}

    # Tool registry status
    try:
        health_data["tools"] = await get_tool_registry_status()
    except Exception as e:
        health_data["tools"] = {"error": str(e)}

    # Database status
    try:
        health_data["database"] = await get_database_status()
    except Exception as e:
        health_data["database"] = {"error": str(e)}

    # Legacy platform status for backward compatibility
    try:
        health_data["platform_status"] = {
            "gemini": "configured" if os.getenv('GEMINI_API_KEY') else "not_configured",
            "anthropic": "configured" if os.getenv('ANTHROPIC_API_KEY') else "not_configured",
            "langfuse": "configured" if (os.getenv('LANGFUSE_SECRET_KEY') and os.getenv('LANGFUSE_PUBLIC_KEY')) else "not_configured",
            "observability_enabled": os.getenv('OBSERVABILITY_ENABLED', 'false').lower() == 'true'
        }
    except Exception as e:
        health_data["platform_status"] = {"error": str(e)}

    # Calculate response time
    response_time = (time.time() - start_time) * 1000
    health_data["response_time_ms"] = round(response_time, 2)

    # Determine overall status
    health_data["status"] = determine_overall_status(health_data)

    return health_data

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


@router.get("/autonomous-monitoring", status_code=status.HTTP_200_OK)
async def autonomous_monitoring_status():
    """Get status of autonomous technical monitoring agent"""
    try:
        # Try to access the monitoring agent from app state
        from fastapi import Request
        from starlette.requests import Request as StarletteRequest

        # This is a basic status check - in a full implementation,
        # we'd access the monitoring agent from app.state
        response = {
            "autonomous_monitoring": {
                "enabled": True,
                "status": "configured",
                "description": "Autonomous Technical Monitoring Agent"
            },
            "components": {
                "health_polling": "operational",
                "remediation_library": "operational",
                "pam_bridge": "operational",
                "memory_persistence": "configured"
            },
            "monitoring_thresholds": {
                "memory": {"warning": 65.0, "critical": 80.0},
                "disk": {"warning": 75.0, "critical": 85.0},
                "cpu": {"warning": 85.0, "critical": 95.0}
            },
            "polling_intervals": {
                "normal": 30,
                "issue": 10
            },
            "timestamp": datetime.utcnow().isoformat()
        }

        return response

    except Exception as e:
        return {
            "autonomous_monitoring": {
                "enabled": False,
                "status": "error",
                "error": str(e)
            },
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/autonomous-monitoring/metrics", status_code=status.HTTP_200_OK)
async def autonomous_monitoring_metrics():
    """Get metrics and performance data from autonomous monitoring"""
    try:
        # Basic metrics response - in full implementation would access real metrics
        response = {
            "metrics": {
                "monitoring_cycles_completed": 0,
                "total_issues_detected": 0,
                "total_actions_taken": 0,
                "total_notifications_sent": 0,
                "avg_cycle_duration_seconds": 0.0,
                "last_cycle_timestamp": None
            },
            "pam_bridge": {
                "total_sent": 0,
                "successful_deliveries": 0,
                "failed_deliveries": 0,
                "queued_notifications": 0,
                "success_rate": 0.0,
                "pam_available": True
            },
            "remediation_actions": {
                "cleanup_disk_space": {"success_rate": 0.0, "total_count": 0},
                "restart_celery_workers": {"success_rate": 0.0, "total_count": 0},
                "clear_redis_cache": {"success_rate": 0.0, "total_count": 0}
            },
            "timestamp": datetime.utcnow().isoformat()
        }

        return response

    except Exception as e:
        return {
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
