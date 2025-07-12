#!/usr/bin/env python3
"""
Simple test runner for PAM backend
Handles missing dependencies gracefully
"""

import os
import sys
import subprocess
from pathlib import Path

# Set test environment
os.environ["ENVIRONMENT"] = "test"
os.environ["TESTING"] = "1"
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-key"
os.environ["OPENAI_API_KEY"] = "test-openai-key"

def check_dependencies():
    """Check if test dependencies are available"""
    try:
        import pytest
        print("✅ pytest available")
        return True
    except ImportError as e:
        print(f"❌ Missing pytest: {e}")
        print("\n💡 To install test dependencies, run:")
        print("pip install -r requirements-test.txt")
        return False

def run_basic_imports():
    """Test basic imports without pytest"""
    print("🧪 Running basic import tests...")
    
    try:
        # Test core imports
        from app.main import app
        print("✅ FastAPI app imports successfully")
        
        from app.core.config import settings
        print("✅ Settings configuration loads")
        
        from app.services.analytics.analytics import analytics
        print("✅ Analytics service imports")
        
        from app.services.tts.tts_service import tts_service
        print("✅ TTS service imports")
        
        from app.api.v1.chat import router as chat_router
        print("✅ Chat API router imports")
        
        print("\n✅ All core imports successful!")
        return True
        
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False

def run_api_test():
    """Test basic API functionality"""
    print("\n🌐 Testing basic API functionality...")
    
    try:
        from fastapi.testclient import TestClient
        from app.main import app
        
        client = TestClient(app)
        
        # Test health endpoint
        response = client.get("/")
        assert response.status_code == 200
        print("✅ Root endpoint works")
        
        # Test health endpoint  
        response = client.get("/health")
        assert response.status_code == 200
        print("✅ Health endpoint works")
        
        # Test chat test endpoint
        response = client.get("/api/chat/test")
        assert response.status_code == 200
        print("✅ Chat test endpoint works")
        
        print("\n✅ Basic API tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ API test error: {e}")
        return False

def run_analytics_test():
    """Test analytics functionality"""
    print("\n📊 Testing analytics functionality...")
    
    try:
        from app.services.analytics.analytics import analytics, AnalyticsEvent, EventType
        from datetime import datetime
        
        # Create test event
        event = AnalyticsEvent(
            event_type=EventType.USER_MESSAGE,
            user_id="test-user",
            timestamp=datetime.now(),
            event_data={"test": "data"}
        )
        
        # This should not raise an error (even if DB fails)
        result = analytics.track_event(event)
        print("✅ Analytics event creation works")
        
        print("✅ Analytics tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Analytics test error: {e}")
        return False

def main():
    """Main test runner"""
    print("🚀 PAM Backend Test Runner")
    print("=" * 40)
    
    # Check if we can run full pytest
    if check_dependencies():
        print("\n🧪 Running full test suite with pytest...")
        try:
            result = subprocess.run([
                sys.executable, "-m", "pytest", 
                "tests/", "-v", "--tb=short", "--maxfail=5"
            ], cwd=Path(__file__).parent)
            return result.returncode == 0
        except Exception as e:
            print(f"❌ Pytest failed: {e}")
    
    # Fall back to basic tests
    print("\n🔧 Running fallback basic tests...")
    
    success = True
    success &= run_basic_imports()
    success &= run_api_test()
    success &= run_analytics_test()
    
    if success:
        print("\n🎉 All basic tests passed!")
        print("\n💡 For full test coverage, install test dependencies:")
        print("pip install -r requirements-test.txt")
        return True
    else:
        print("\n❌ Some tests failed!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)