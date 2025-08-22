#!/usr/bin/env python3
"""
Test script to verify Pydantic imports work correctly
"""

try:
    print("Testing pydantic-settings import...")
    from pydantic_settings import BaseSettings
    print("✅ BaseSettings import successful")
    
    print("Testing field_validator import...")
    from pydantic import field_validator, Field, SecretStr, ValidationError
    print("✅ Pydantic v2 imports successful")
    
    print("Testing config module import...")
    from app.core.config import settings
    print("✅ Config module import successful")
    print(f"Environment: {settings.NODE_ENV}")
    
    print("\n🎉 All imports working correctly!")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    exit(1)
except Exception as e:
    print(f"❌ Other error: {e}")
    exit(1)