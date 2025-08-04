"""Entry point for deploying the FastAPI application on Render.

This module imports the main FastAPI instance defined in
``backend/app/main.py``.  It is intentionally lightweight so that
``uvicorn`` can load ``app:app`` without running into the module name
clashes that occur when this file is also named ``app``.

If the backend application fails to import, a minimal FastAPI app is
exposed so that the deployment can still start and return a helpful
error message.
"""

from __future__ import annotations

import importlib.util
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)


def _load_backend_app() -> FastAPI:
    """Load the FastAPI application from ``backend/app/main.py``."""

    project_root = Path(__file__).resolve().parent
    backend_path = project_root / "backend"

    # Ensure the backend package is importable
    if str(backend_path) not in sys.path:
        sys.path.insert(0, str(backend_path))
        logger.info("Added %s to PYTHONPATH", backend_path)

    # Ensure this module stays registered so Uvicorn reload works correctly
    # even after inserting the backend path. Removing it can cause ``app``
    # to resolve to the backend package instead of this file on reload.

    main_file = backend_path / "app" / "main.py"
    spec = importlib.util.spec_from_file_location("backend_main", main_file)
    module = importlib.util.module_from_spec(spec)

    try:
        assert spec.loader is not None
        spec.loader.exec_module(module)
        logger.info("Successfully imported backend app from %s", main_file)
        
        # Check if app attribute exists and log its type
        if hasattr(module, "app"):
            app_instance = getattr(module, "app")
            logger.info("Found app attribute of type: %s", type(app_instance))
            return app_instance
        else:
            logger.error("Module does not have 'app' attribute. Available attributes: %s", dir(module))
            raise AttributeError("Backend module does not export 'app'")
    except Exception as exc:  # pragma: no cover - import failure path
        logger.exception("Failed to load backend FastAPI app: %s", exc)
        raise


try:
    app = _load_backend_app()
    logger.info("Successfully assigned app variable of type: %s", type(app))
    
    # Ensure the app is available at module level
    globals()['app'] = app
    
except Exception as import_error:
    # Fallback application shown when the backend fails to import
    logger.error("Backend import failed: %s", import_error)

    # Minimal fallback FastAPI application with basic PAM support
    app = FastAPI(title="Wheels & Wins Backend - Emergency Mode")

    # Apply CORS settings with sensible defaults for PAM
    cors_origins_env = os.getenv("CORS_ORIGINS", "")
    allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
    
    # Add default origins to ensure frontend can connect
    default_origins = [
        "https://wheelsandwins.com",
        "https://www.wheelsandwins.com",
        "https://wheels-wins.netlify.app",
        "http://localhost:8080",
        "http://localhost:3000"
    ]
    
    # Combine configured and default origins
    all_origins = list(set(allowed_origins + default_origins))

    from fastapi.middleware.cors import CORSMiddleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=all_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"]
    )
    
    logger.info(f"Fallback app CORS configured with origins: {all_origins}")

    # Store error details for the fallback handler
    error_details = str(import_error)

    @app.get("/")
    async def import_failure_root() -> dict[str, str]:
        return {
            "error": "Backend application failed to load",
            "details": error_details,
        }

    @app.get("/health")
    async def health_check() -> dict[str, str]:
        """Lightweight health endpoint for deployment checks."""
        return {"status": "error", "details": error_details}
    
    @app.get("/debug-config")
    async def debug_config():
        """Debug endpoint to understand configuration issues"""
        import os
        return {
            "error": error_details,
            "environment_vars": {
                "ENVIRONMENT": os.getenv("ENVIRONMENT"),
                "DEBUG": os.getenv("DEBUG"),
                "SUPABASE_URL": "***" if os.getenv("SUPABASE_URL") else None,
                "SUPABASE_KEY": "***" if os.getenv("SUPABASE_KEY") else None,
                "SECRET_KEY": "***" if os.getenv("SECRET_KEY") else None,
                "SITE_URL": os.getenv("SITE_URL"),
                "OPENAI_API_KEY": "***" if os.getenv("OPENAI_API_KEY") else None,
            },
            "python_path": sys.path[:3],
            "working_directory": os.getcwd(),
            "backend_path_exists": os.path.exists("backend/app/main.py"),
        }
    
    # Basic PAM endpoints for emergency mode
    @app.get("/api/v1/pam/health")
    async def pam_health():
        """PAM health check endpoint"""
        return {
            "status": "degraded",
            "mode": "emergency",
            "message": "PAM is running in emergency mode due to backend import failure",
            "capabilities": ["basic_chat"],
            "timestamp": datetime.utcnow().isoformat(),
            "error": error_details
        }
    
    @app.post("/api/v1/pam/chat")
    async def pam_chat(request: dict):
        """Basic PAM chat endpoint"""
        return {
            "response": "I'm currently running in emergency mode. The main backend failed to load properly. Please contact support.",
            "mode": "emergency",
            "status": "degraded",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    # WebSocket support for emergency PAM
    from fastapi import WebSocket, WebSocketDisconnect
    import json
    
    @app.websocket("/api/v1/pam/ws")
    async def pam_websocket(websocket: WebSocket, token: str = None):
        """Emergency WebSocket endpoint for PAM"""
        await websocket.accept()
        
        # Send initial connection message
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "mode": "emergency",
            "message": "Connected to PAM emergency mode",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        try:
            while True:
                # Receive message from client
                data = await websocket.receive_json()
                
                # Send emergency response
                await websocket.send_json({
                    "type": "response",
                    "content": "I'm running in emergency mode. The main system encountered an error. Please try again later or contact support.",
                    "mode": "emergency",
                    "timestamp": datetime.utcnow().isoformat()
                })
                
        except WebSocketDisconnect:
            logger.info("Emergency WebSocket disconnected")
        except Exception as e:
            logger.error(f"Emergency WebSocket error: {e}")
            await websocket.close()
    
    logger.warning("⚠️ PAM running in emergency mode with basic functionality")
    
    # Ensure fallback app is available at module level
    globals()['app'] = app


# Final verification that app is accessible
logger.info("Final check - app variable accessible: %s", 'app' in globals())
logger.info("Final check - app type: %s", type(globals().get('app', 'Not found')))

if __name__ == "__main__":  # pragma: no cover - manual launch
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    logger.info("Starting Uvicorn on %s:%s", host, port)
    
    # Pass the app instance directly instead of module string
    uvicorn.run(app, host=host, port=port, log_level="info")

