#!/usr/bin/env python3
"""
Test script for settings endpoints after database fixes
Run this after applying APPLY_SETTINGS_FIX.sql to verify the fixes work
"""

import requests
import json
import time

# Backend configuration
BACKEND_URL = "https://pam-backend.onrender.com"
TEST_USER_ID = "test-user-123"  # This will fail auth but shows if table exists

def test_endpoint(endpoint, method="GET", data=None, headers=None):
    """Test an endpoint and return response details"""
    if headers is None:
        headers = {"Content-Type": "application/json"}
    
    url = f"{BACKEND_URL}{endpoint}"
    print(f"\n{'='*60}")
    print(f"Testing: {method} {url}")
    print(f"{'='*60}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            response_json = response.json()
            print(f"Response Body: {json.dumps(response_json, indent=2)}")
        except:
            print(f"Response Body (text): {response.text}")
        
        return response
    
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

def main():
    print("🔍 Testing Settings Endpoints After Database Fix")
    print("=" * 60)
    
    # Test 1: Health check
    print("\n1. Testing Backend Health")
    test_endpoint("/health")
    
    # Test 2: Voice health check  
    print("\n2. Testing Voice System Health")
    test_endpoint("/api/v1/pam/voice/health")
    
    # Test 3: Settings endpoint without auth (should return 401 but not 500)
    print("\n3. Testing Settings Endpoint Structure (no auth)")
    test_endpoint(f"/api/v1/users/{TEST_USER_ID}/settings")
    
    # Test 4: Settings creation endpoint without auth
    print("\n4. Testing Settings Creation Endpoint (no auth)")
    test_endpoint(f"/api/v1/users/{TEST_USER_ID}/settings", method="POST")
    
    # Test 5: Settings update endpoint without auth
    print("\n5. Testing Settings Update Endpoint (no auth)")
    test_data = {
        "pam_preferences": {
            "voice_enabled": True,
            "response_style": "friendly"
        }
    }
    test_endpoint(f"/api/v1/users/{TEST_USER_ID}/settings", method="PUT", data=test_data)
    
    print("\n" + "="*60)
    print("✅ TEST RESULTS ANALYSIS")
    print("="*60)
    print("Expected results after applying the database fix:")
    print("• Health endpoints should return 200 OK")
    print("• Settings endpoints should return 401 Unauthorized (not 500 Internal Server Error)")
    print("• No 'table does not exist' errors in responses")
    print("• Voice system should show healthy status")
    print("\n🔧 If you see 500 errors mentioning 'user_settings', the migration needs to be applied.")
    print("🎯 If you see 401 errors, the database fix worked! Frontend will handle auth.")

if __name__ == "__main__":
    main()