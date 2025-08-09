
"""
Health Check Endpoints
Comprehensive health monitoring for PAM services and dependencies
"""

import asyncio
import time
import psutil
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from enum import Enum

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
import redis.asyncio as redis
from sqlalchemy import text

from app.core.config import settings
from app.core.database import database
from app.core.logging_config import PAMLogger
from app.services.database import get_database_service
from app.services.cache_service import cache_service

# Initialize components
logger = PAMLogger()
router = APIRouter()

# Health status enum
class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": HealthStatus.HEALTHY,
        "service": "wheels-wins-pam-api",
        "version": getattr(settings, 'VERSION', '1.0.0'),
        "environment": getattr(settings, 'NODE_ENV', 'development'),
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/health/ping")
async def ping():
    """Simple ping endpoint for uptime monitoring"""
    return {"pong": True}

@router.get("/health/pam")
async def pam_health():
    """Comprehensive PAM service health check"""
    start_time = time.time()
    checks = {}
    issues = []
    
    # Check OpenAI
    try:
        if settings.OPENAI_API_KEY:
            # Verify API key exists (minimal check)
            checks["openai"] = {
                "status": HealthStatus.HEALTHY,
                "configured": True,
                "model": settings.OPENAI_MODEL
            }
        else:
            checks["openai"] = {
                "status": HealthStatus.UNHEALTHY,
                "configured": False,
                "error": "API key not configured"
            }
            issues.append("OpenAI API key not configured")
    except Exception as e:
        checks["openai"] = {
            "status": HealthStatus.UNHEALTHY,
            "error": str(e)
        }
        issues.append(f"OpenAI check failed: {e}")
    
    # Check TTS
    try:
        from app.services.tts.tts_manager import TTSManager
        tts_manager = TTSManager()
        checks["tts"] = {
            "status": HealthStatus.HEALTHY if settings.TTS_ENABLED else HealthStatus.DEGRADED,
            "enabled": settings.TTS_ENABLED,
            "primary_engine": settings.TTS_PRIMARY_ENGINE,
            "fallback_enabled": settings.TTS_FALLBACK_ENABLED
        }
    except Exception as e:
        checks["tts"] = {
            "status": HealthStatus.DEGRADED,
            "error": str(e)
        }
    
    # Check WebSocket capability
    checks["websocket"] = {
        "status": HealthStatus.HEALTHY if settings.WEBSOCKET_ENABLED else HealthStatus.UNHEALTHY,
        "enabled": settings.WEBSOCKET_ENABLED,
        "max_connections": settings.WEBSOCKET_MAX_CONNECTIONS
    }
    
    # Check cache
    try:
        if cache_service.redis:
            await cache_service.redis.ping()
            checks["cache"] = {
                "status": HealthStatus.HEALTHY,
                "type": "redis",
                "connected": True
            }
        else:
            checks["cache"] = {
                "status": HealthStatus.DEGRADED,
                "type": "memory",
                "connected": False
            }
    except Exception as e:
        checks["cache"] = {
            "status": HealthStatus.UNHEALTHY,
            "error": str(e)
        }
        issues.append(f"Cache connection failed: {e}")
    
    # Check database
    try:
        db_service = get_database_service()
        await db_service.execute_query("SELECT 1")
        checks["database"] = {
            "status": HealthStatus.HEALTHY,
            "connected": True
        }
    except Exception as e:
        checks["database"] = {
            "status": HealthStatus.UNHEALTHY,
            "error": str(e)
        }
        issues.append(f"Database connection failed: {e}")
    
    # Calculate overall health
    statuses = [check.get("status", HealthStatus.UNHEALTHY) for check in checks.values()]
    if all(s == HealthStatus.HEALTHY for s in statuses):
        overall_status = HealthStatus.HEALTHY
    elif any(s == HealthStatus.UNHEALTHY for s in statuses):
        overall_status = HealthStatus.UNHEALTHY
    else:
        overall_status = HealthStatus.DEGRADED
    
    response_time = round((time.time() - start_time) * 1000, 2)
    
    return {
        "status": overall_status,
        "checks": checks,
        "issues": issues,
        "response_time_ms": response_time,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/config")
async def get_frontend_config():
    """Get frontend configuration including debug feature flags"""
    return {
        "environment": settings.ENVIRONMENT,
        "debug_features": {
            "enabled": settings.ENABLE_DEBUG_FEATURES and settings.ENVIRONMENT == "development",
            "show_debug_tokens": settings.SHOW_DEBUG_TOKENS and settings.ENVIRONMENT == "development",
            "enable_reasoning_debug": settings.ENABLE_REASONING_DEBUG and settings.ENVIRONMENT == "development",
        },
        "version": settings.VERSION
    }

@router.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with service status"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "services": {}
    }
    
    # Check database connectivity
    try:
        db_service = get_database_service()
        await db_service.execute_query("SELECT 1")
        health_status["services"]["database"] = {
            "status": "healthy",
            "response_time_ms": 0  # Would measure actual response time
        }
    except Exception as e:
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # Check cache connectivity
    try:
        await cache_service.get("health_check_key")
        health_status["services"]["cache"] = {
            "status": "healthy",
            "response_time_ms": 0
        }
    except Exception as e:
        health_status["services"]["cache"] = {
            "status": "unhealthy", 
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    return health_status

@router.get("/health/ready")
async def readiness_check():
    """Kubernetes readiness probe"""
    try:
        # Check critical services
        db_service = get_database_service()
        await db_service.execute_query("SELECT 1")
        await cache_service.get("readiness_check")
        
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service not ready: {str(e)}")

@router.get("/health/live")
async def liveness_check():
    """Kubernetes liveness probe"""
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}

@router.get("/health/system")
async def system_health():
    """Check system resources"""
    checks = {}
    issues = []
    
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        checks["cpu"] = {
            "status": HealthStatus.HEALTHY,
            "usage_percent": cpu_percent,
            "cores": psutil.cpu_count()
        }
        
        if cpu_percent > 90:
            checks["cpu"]["status"] = HealthStatus.UNHEALTHY
            issues.append(f"Critical CPU usage: {cpu_percent}%")
        elif cpu_percent > 75:
            checks["cpu"]["status"] = HealthStatus.DEGRADED
            issues.append(f"High CPU usage: {cpu_percent}%")
        
        # Memory usage
        memory = psutil.virtual_memory()
        checks["memory"] = {
            "status": HealthStatus.HEALTHY,
            "usage_percent": memory.percent,
            "available_gb": round(memory.available / (1024**3), 2),
            "total_gb": round(memory.total / (1024**3), 2)
        }
        
        if memory.percent > 90:
            checks["memory"]["status"] = HealthStatus.UNHEALTHY
            issues.append(f"Critical memory usage: {memory.percent}%")
        elif memory.percent > 80:
            checks["memory"]["status"] = HealthStatus.DEGRADED
            issues.append(f"High memory usage: {memory.percent}%")
        
        # Disk usage
        disk = psutil.disk_usage("/")
        checks["disk"] = {
            "status": HealthStatus.HEALTHY,
            "usage_percent": disk.percent,
            "free_gb": round(disk.free / (1024**3), 2),
            "total_gb": round(disk.total / (1024**3), 2)
        }
        
        if disk.percent > 95:
            checks["disk"]["status"] = HealthStatus.UNHEALTHY
            issues.append(f"Critical disk usage: {disk.percent}%")
        elif disk.percent > 85:
            checks["disk"]["status"] = HealthStatus.DEGRADED
            issues.append(f"High disk usage: {disk.percent}%")
        
        # Process info
        process = psutil.Process(os.getpid())
        checks["process"] = {
            "status": HealthStatus.HEALTHY,
            "memory_mb": round(process.memory_info().rss / (1024**2), 2),
            "threads": process.num_threads(),
            "uptime_seconds": round(time.time() - process.create_time())
        }
        
    except Exception as e:
        issues.append(f"System check failed: {e}")
    
    # Overall system health
    statuses = [check.get("status", HealthStatus.HEALTHY) for check in checks.values()]
    if all(s == HealthStatus.HEALTHY for s in statuses):
        overall_status = HealthStatus.HEALTHY
    elif any(s == HealthStatus.UNHEALTHY for s in statuses):
        overall_status = HealthStatus.UNHEALTHY
    else:
        overall_status = HealthStatus.DEGRADED
    
    return {
        "status": overall_status,
        "checks": checks,
        "issues": issues,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/health/circuit-breakers")
async def circuit_breakers_health():
    """Check circuit breaker states"""
    breakers = {}
    issues = []
    
    try:
        # Import circuit breakers
        from app.services.tts.circuit_breaker import circuit_breakers, CircuitState
        
        for name, breaker in circuit_breakers.items():
            breaker_info = {
                "state": breaker.state.value,
                "failure_count": breaker.failure_count,
                "success_count": breaker.success_count,
                "last_failure": breaker.last_failure_time.isoformat() if breaker.last_failure_time else None,
                "status": HealthStatus.HEALTHY
            }
            
            # Determine health based on state
            if breaker.state == CircuitState.OPEN:
                breaker_info["status"] = HealthStatus.UNHEALTHY
                issues.append(f"Circuit breaker '{name}' is OPEN")
            elif breaker.state == CircuitState.HALF_OPEN:
                breaker_info["status"] = HealthStatus.DEGRADED
                issues.append(f"Circuit breaker '{name}' is HALF_OPEN")
            
            breakers[name] = breaker_info
    except ImportError:
        # Circuit breakers not available
        breakers["error"] = "Circuit breakers not configured"
        issues.append("Circuit breaker module not available")
    except Exception as e:
        breakers["error"] = str(e)
        issues.append(f"Circuit breaker check failed: {e}")
    
    # Overall circuit breaker health
    if not breakers or "error" in breakers:
        overall_status = HealthStatus.DEGRADED
    else:
        statuses = [b.get("status", HealthStatus.HEALTHY) for b in breakers.values()]
        if all(s == HealthStatus.HEALTHY for s in statuses):
            overall_status = HealthStatus.HEALTHY
        elif any(s == HealthStatus.UNHEALTHY for s in statuses):
            overall_status = HealthStatus.UNHEALTHY
        else:
            overall_status = HealthStatus.DEGRADED
    
    return {
        "status": overall_status,
        "breakers": breakers,
        "issues": issues,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/health/rate-limiting")
async def rate_limiting_health():
    """Check rate limiting system health"""
    checks = {}
    issues = []
    
    try:
        # Check if rate limiting is enabled
        checks["enabled"] = getattr(settings, 'SECURITY_RATE_LIMITING', True)
        
        if checks["enabled"]:
            # Check Redis connection for rate limiting
            if cache_service.redis:
                await cache_service.redis.ping()
                checks["backend"] = {
                    "status": HealthStatus.HEALTHY,
                    "type": "redis",
                    "connected": True
                }
            else:
                checks["backend"] = {
                    "status": HealthStatus.DEGRADED,
                    "type": "memory",
                    "connected": False
                }
                issues.append("Rate limiting using memory backend (not distributed)")
            
            # Check current limits
            checks["limits"] = {
                "user_per_minute": getattr(settings, 'RATE_LIMIT_REQUESTS_PER_MINUTE', 60),
                "user_per_hour": getattr(settings, 'RATE_LIMIT_REQUESTS_PER_HOUR', 1000),
                "user_per_day": getattr(settings, 'RATE_LIMIT_REQUESTS_PER_DAY', 10000)
            }
            
            overall_status = HealthStatus.HEALTHY if not issues else HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.DEGRADED
            issues.append("Rate limiting is disabled")
            
    except Exception as e:
        overall_status = HealthStatus.UNHEALTHY
        issues.append(f"Rate limiting check failed: {e}")
    
    return {
        "status": overall_status,
        "checks": checks,
        "issues": issues,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/health/redis")
async def redis_health_check():
    """Check Redis connectivity and configuration"""
    import os
    from app.core.config import settings
    
    redis_status = {
        "timestamp": datetime.utcnow().isoformat(),
        "configuration": {},
        "connection": {},
        "cache_service": {}
    }
    
    # Check Redis URL configuration
    redis_url_from_settings = getattr(settings, 'REDIS_URL', None)
    redis_url_from_env = os.environ.get('REDIS_URL')
    
    redis_status["configuration"]["settings_redis_url"] = bool(redis_url_from_settings)
    redis_status["configuration"]["env_redis_url"] = bool(redis_url_from_env)
    
    # Mask the URLs for security
    if redis_url_from_settings:
        masked_settings_url = redis_url_from_settings.split('@')[0] + '@***' if '@' in redis_url_from_settings else redis_url_from_settings
        redis_status["configuration"]["settings_url_preview"] = masked_settings_url
    
    if redis_url_from_env:
        masked_env_url = redis_url_from_env.split('@')[0] + '@***' if '@' in redis_url_from_env else redis_url_from_env
        redis_status["configuration"]["env_url_preview"] = masked_env_url
    
    # Check cache service status
    redis_status["cache_service"]["initialized"] = cache_service.redis is not None
    
    # Test Redis connection
    try:
        if cache_service.redis:
            await cache_service.redis.ping()
            redis_status["connection"]["status"] = "connected"
            redis_status["connection"]["ping"] = "successful"
            
            # Get Redis info
            info = await cache_service.redis.info()
            redis_status["connection"]["redis_version"] = info.get("redis_version", "unknown")
            redis_status["connection"]["connected_clients"] = info.get("connected_clients", 0)
            redis_status["connection"]["used_memory_human"] = info.get("used_memory_human", "unknown")
        else:
            redis_status["connection"]["status"] = "not_connected"
            redis_status["connection"]["message"] = "Redis client not initialized"
    except Exception as e:
        redis_status["connection"]["status"] = "error"
        redis_status["connection"]["error"] = f"{type(e).__name__}: {str(e)}"
    
    # Overall status
    redis_status["healthy"] = redis_status["connection"].get("status") == "connected"
    
    return redis_status

@router.get("/health/all")
async def comprehensive_health():
    """Run all health checks and return comprehensive status"""
    start_time = time.time()
    
    # Run all health checks in parallel
    health_checks = await asyncio.gather(
        pam_health(),
        system_health(),
        circuit_breakers_health(),
        rate_limiting_health(),
        redis_health_check(),
        return_exceptions=True
    )
    
    # Process results
    results = {
        "pam": health_checks[0] if not isinstance(health_checks[0], Exception) else {"status": HealthStatus.UNHEALTHY, "error": str(health_checks[0])},
        "system": health_checks[1] if not isinstance(health_checks[1], Exception) else {"status": HealthStatus.UNHEALTHY, "error": str(health_checks[1])},
        "circuit_breakers": health_checks[2] if not isinstance(health_checks[2], Exception) else {"status": HealthStatus.UNHEALTHY, "error": str(health_checks[2])},
        "rate_limiting": health_checks[3] if not isinstance(health_checks[3], Exception) else {"status": HealthStatus.UNHEALTHY, "error": str(health_checks[3])},
        "redis": health_checks[4] if not isinstance(health_checks[4], Exception) else {"status": HealthStatus.UNHEALTHY, "error": str(health_checks[4])}
    }
    
    # Collect all issues
    all_issues = []
    for check_name, check_result in results.items():
        if isinstance(check_result, dict):
            issues = check_result.get("issues", [])
            if issues:
                all_issues.extend([f"{check_name}: {issue}" for issue in issues])
    
    # Determine overall status
    statuses = []
    for r in results.values():
        if isinstance(r, dict):
            status = r.get("status", HealthStatus.UNHEALTHY)
            if isinstance(status, str) and status in ["healthy", "degraded", "unhealthy"]:
                statuses.append(status)
            elif hasattr(status, 'value'):
                statuses.append(status.value)
            else:
                statuses.append(HealthStatus.UNHEALTHY)
    
    if all(s == "healthy" or s == HealthStatus.HEALTHY for s in statuses):
        overall_status = HealthStatus.HEALTHY
    elif any(s == "unhealthy" or s == HealthStatus.UNHEALTHY for s in statuses):
        overall_status = HealthStatus.UNHEALTHY
    else:
        overall_status = HealthStatus.DEGRADED
    
    # Response time
    total_time = round((time.time() - start_time) * 1000, 2)
    
    # Build response
    response = {
        "status": overall_status,
        "checks": results,
        "issues": all_issues,
        "metrics": {
            "total_checks": len(results),
            "healthy": sum(1 for r in results.values() if isinstance(r, dict) and (r.get("status") == HealthStatus.HEALTHY or r.get("status") == "healthy")),
            "degraded": sum(1 for r in results.values() if isinstance(r, dict) and (r.get("status") == HealthStatus.DEGRADED or r.get("status") == "degraded")),
            "unhealthy": sum(1 for r in results.values() if isinstance(r, dict) and (r.get("status") == HealthStatus.UNHEALTHY or r.get("status") == "unhealthy"))
        },
        "response_time_ms": total_time,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Set appropriate HTTP status code
    if overall_status == HealthStatus.UNHEALTHY:
        return JSONResponse(content=response, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)
    elif overall_status == HealthStatus.DEGRADED:
        return JSONResponse(content=response, status_code=status.HTTP_200_OK)
    else:
        return response

@router.get("/health/metrics")
async def metrics():
    """Prometheus-compatible metrics endpoint"""
    metrics_data = []
    
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        process = psutil.Process(os.getpid())
        
        # Format as Prometheus metrics
        metrics_data.append(f"# HELP cpu_usage_percent CPU usage percentage")
        metrics_data.append(f"# TYPE cpu_usage_percent gauge")
        metrics_data.append(f"cpu_usage_percent {cpu_percent}")
        
        metrics_data.append(f"# HELP memory_usage_percent Memory usage percentage")
        metrics_data.append(f"# TYPE memory_usage_percent gauge")
        metrics_data.append(f"memory_usage_percent {memory.percent}")
        
        metrics_data.append(f"# HELP disk_usage_percent Disk usage percentage")
        metrics_data.append(f"# TYPE disk_usage_percent gauge")
        metrics_data.append(f"disk_usage_percent {disk.percent}")
        
        metrics_data.append(f"# HELP process_memory_bytes Process memory usage in bytes")
        metrics_data.append(f"# TYPE process_memory_bytes gauge")
        metrics_data.append(f"process_memory_bytes {process.memory_info().rss}")
        
        metrics_data.append(f"# HELP process_threads Number of process threads")
        metrics_data.append(f"# TYPE process_threads gauge")
        metrics_data.append(f"process_threads {process.num_threads()}")
        
        metrics_data.append(f"# HELP uptime_seconds Application uptime in seconds")
        metrics_data.append(f"# TYPE uptime_seconds counter")
        metrics_data.append(f"uptime_seconds {round(time.time() - process.create_time())}")
    except Exception as e:
        metrics_data.append(f"# Error collecting metrics: {e}")
    
    return "\n".join(metrics_data)
