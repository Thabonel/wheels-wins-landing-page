#!/usr/bin/env python3
"""
Smoke test to verify critical imports work before deployment.
This ensures the container can start without import errors.
"""

import sys
import traceback

def test_critical_imports():
    """Test that all critical dependencies can be imported."""
    failed_imports = []
    
    # Test core FastAPI imports
    try:
        import fastapi
        print("✅ FastAPI imported successfully")
    except ImportError as e:
        failed_imports.append(f"FastAPI: {e}")
        
    # Test Uvicorn
    try:
        import uvicorn
        print("✅ Uvicorn imported successfully")
    except ImportError as e:
        failed_imports.append(f"Uvicorn: {e}")
        
    # Test Redis
    try:
        import redis
        print("✅ Redis imported successfully")
    except ImportError as e:
        failed_imports.append(f"Redis: {e}")
        
    # Test Celery
    try:
        import celery
        print("✅ Celery imported successfully")
    except ImportError as e:
        failed_imports.append(f"Celery: {e}")
        
    # Test TTS
    try:
        import TTS
        print("✅ TTS (Coqui) imported successfully")
    except ImportError as e:
        failed_imports.append(f"TTS: {e}")
        
    # Test Sentry
    try:
        import sentry_sdk
        print("✅ Sentry SDK imported successfully")
    except ImportError as e:
        failed_imports.append(f"Sentry: {e}")
        
    # Test SQLAlchemy
    try:
        import sqlalchemy
        print("✅ SQLAlchemy imported successfully")
    except ImportError as e:
        failed_imports.append(f"SQLAlchemy: {e}")
        
    # Test app main module
    try:
        from app.main import app
        print("✅ App main module imported successfully")
    except ImportError as e:
        failed_imports.append(f"App main: {e}")
        print(f"❌ Failed to import app.main: {e}")
        traceback.print_exc()
        
    # Test Celery worker
    try:
        from app.workers.celery import celery_app
        print("✅ Celery worker imported successfully")
    except ImportError as e:
        failed_imports.append(f"Celery worker: {e}")
        
    return failed_imports

def test_environment_variables():
    """Test that critical environment variables can be accessed."""
    import os
    missing_vars = []
    
    critical_vars = [
        "DATABASE_URL",
        "REDIS_URL", 
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "OPENAI_API_KEY"
    ]
    
    for var in critical_vars:
        if not os.getenv(var):
            missing_vars.append(var)
        else:
            print(f"✅ {var} is set")
            
    return missing_vars

if __name__ == "__main__":
    print("🧪 Running smoke tests...")
    
    # Test imports
    failed_imports = test_critical_imports()
    
    # Test environment (only warn, don't fail)
    missing_vars = test_environment_variables()
    
    if failed_imports:
        print("\n❌ SMOKE TEST FAILED - Import errors:")
        for error in failed_imports:
            print(f"  - {error}")
        sys.exit(1)
    
    if missing_vars:
        print(f"\n⚠️  WARNING - Missing environment variables: {missing_vars}")
        print("These should be set in production environment")
    
    print("\n✅ All smoke tests passed! Container should start successfully.")
    sys.exit(0)