"""
Production entry point for Wheels & Wins Backend
Handles both development and production environments
Uses Supabase for database operations (no asyncpg needed)
"""
import sys
import os
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s", "module": "%(name)s"}',
    datefmt='%Y-%m-%dT%H:%M:%S'
)

logger = logging.getLogger(__name__)

def setup_python_path():
    """Add necessary directories to Python path"""
    current_dir = Path(__file__).parent
    backend_dir = current_dir / "backend"
    
    # Add both root and backend to path for maximum compatibility
    paths_to_add = [str(current_dir), str(backend_dir)]
    
    for path in paths_to_add:
        if path not in sys.path:
            sys.path.insert(0, path)
            logger.info(f"Added {path} to Python path")

def get_fastapi_app():
    """Import and return the FastAPI application"""
    try:
        # Setup paths first
        setup_python_path()
        
        # Try to import from backend structure first (production)
        try:
            from app.main import app
            logger.info("Successfully imported FastAPI app from backend structure")
            return app
        except ImportError as e:
            logger.warning(f"Backend import failed: {e}")
            
            # Fallback: try direct import (development)
            try:
                import importlib.util
                spec = importlib.util.spec_from_file_location("main", "backend/app/main.py")
                main_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(main_module)
                app = main_module.app
                logger.info("Successfully imported FastAPI app via direct file import")
                return app
            except Exception as fallback_error:
                logger.error(f"All import methods failed: {fallback_error}")
                raise ImportError("Could not import FastAPI app from any location")
                
    except Exception as e:
        logger.error(f"Failed to get FastAPI app: {e}")
        raise

# Get the app instance
try:
    app = get_fastapi_app()
    logger.info("Wheels & Wins Backend initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize backend: {e}")
    # Create a minimal error app for debugging
    from fastapi import FastAPI
    app = FastAPI(title="Wheels & Wins Backend - Error State")
    
    @app.get("/")
    async def error_root():
        return {
            "status": "error",
            "message": "Backend initialization failed",
            "error": str(e),
            "instructions": "Check logs for detailed error information"
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    logger.info(f"Starting Wheels & Wins Backend on {host}:{port}")
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        log_level="info",
        access_log=True
    )
