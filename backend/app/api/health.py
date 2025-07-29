
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
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "pam-backend",
        "metrics": metrics,
        "environment": os.getenv("ENVIRONMENT", "development")
    }
