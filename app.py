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

    # Remove this module from ``sys.modules`` to prevent clashes with the
    # ``app`` package inside ``backend``.
    sys.modules.pop("app", None)

    main_file = backend_path / "app" / "main.py"
    spec = importlib.util.spec_from_file_location("backend_main", main_file)
    module = importlib.util.module_from_spec(spec)

    try:
        assert spec.loader is not None
        spec.loader.exec_module(module)
        logger.info("Successfully imported backend app from %s", main_file)
        return getattr(module, "app")
    except Exception as exc:  # pragma: no cover - import failure path
        logger.exception("Failed to load backend FastAPI app: %s", exc)
        raise


try:
    app = _load_backend_app()
except Exception as import_error:
    # Fallback application shown when the backend fails to import
    app = FastAPI(title="Wheels & Wins Backend - Error")

    @app.get("/")
    async def import_failure_root() -> dict[str, str]:
        return {
            "error": "Backend application failed to load",
            "details": str(import_error),
        }


if __name__ == "__main__":  # pragma: no cover - manual launch
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    logger.info("Starting Uvicorn on %s:%s", host, port)
    uvicorn.run("app:app", host=host, port=port, log_level="info")

