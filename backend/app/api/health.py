
from fastapi import APIRouter, status
from datetime import datetime
import os

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
            "openai": "configured" if os.getenv('OPENAI_API_KEY') else "not_configured",
            "langfuse": "configured" if (os.getenv('LANGFUSE_SECRET_KEY') and os.getenv('LANGFUSE_PUBLIC_KEY')) else "not_configured",  
            "agentops": "configured" if os.getenv('AGENTOPS_API_KEY') else "not_configured",
            "observability_enabled": os.getenv('OBSERVABILITY_ENABLED', 'false').lower() == 'true'
        }
    except Exception as e:
        platform_status = {
            "error": f"Could not check platform status: {str(e)}",
            "openai": "unknown",
            "langfuse": "unknown", 
            "agentops": "unknown"
        }

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "pam-backend",
        "metrics": metrics,
        "platform_status": platform_status,
        "environment": os.getenv("ENVIRONMENT", "development")
    }
