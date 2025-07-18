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
    app = FastAPI(title="Wheels & Wins Backend - Error")
    
    # Store error details for the fallback handler
    error_details = str(import_error)

    @app.get("/")
    async def import_failure_root() -> dict[str, str]:
        return {
            "error": "Backend application failed to load",
            "details": error_details,
        }
    
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

