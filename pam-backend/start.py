#!/usr/bin/env python3
"""
Production entry point for PAM Backend
This script ensures proper working directory and import paths
"""
import os
import sys
import uvicorn

# Ensure we're running from the correct directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Add current directory to Python path to ensure imports work
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)

def main():
    """Main entry point for production deployment"""
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    # Import app after setting up paths
    from app.main import app
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=True
    )

if __name__ == "__main__":
    main()
