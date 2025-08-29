#!/usr/bin/env python3
"""Test CORS configuration for PAM backend"""

import requests
import sys

# Test URLs
BACKEND_URL = "http://localhost:8000"
TEST_ENDPOINTS = [
    "/health",
    "/api/v1/pam/chat",
    "/api/v1/users/test-user-id/settings",
]

# Test origins
TEST_ORIGINS = [
    "https://wheelsandwins.com",
    "https://wheelz-wins.com",
    "http://localhost:8080",
]

def test_cors_preflight(endpoint, origin):
    """Test CORS preflight (OPTIONS) request"""
    url = f"{BACKEND_URL}{endpoint}"
    
    headers = {
        "Origin": origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Authorization, Content-Type",
    }
    
    try:
        response = requests.options(url, headers=headers, timeout=5)
        
        print(f"\n{'='*60}")
        print(f"Testing: OPTIONS {endpoint}")
        print(f"Origin: {origin}")
        print(f"Status: {response.status_code}")
        print(f"Headers:")
        
        # Check CORS headers
        cors_headers = {
            "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
            "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers"),
            "Access-Control-Allow-Credentials": response.headers.get("Access-Control-Allow-Credentials"),
        }
        
        for header, value in cors_headers.items():
            status = "✅" if value else "❌"
            print(f"  {status} {header}: {value}")
        
        # Check if origin is allowed
        allowed_origin = response.headers.get("Access-Control-Allow-Origin")
        if allowed_origin == origin or allowed_origin == "*":
            print(f"\n✅ CORS PASSED for {origin}")
        else:
            print(f"\n❌ CORS FAILED for {origin}")
            print(f"   Expected: {origin}")
            print(f"   Got: {allowed_origin}")
            
        return response.status_code == 200
        
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Connection failed - is the backend running on {BACKEND_URL}?")
        return False
    except Exception as e:
        print(f"\n❌ Error testing {endpoint}: {e}")
        return False

def main():
    print("🔍 Testing CORS Configuration for PAM Backend")
    print(f"Backend URL: {BACKEND_URL}")
    
    # Check if backend is running
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        print(f"\n✅ Backend is running (health check: {response.status_code})")
    except:
        print(f"\n❌ Backend is not running on {BACKEND_URL}")
        print("Please start the backend with: cd backend && uvicorn app.main:app --reload --port 8000")
        sys.exit(1)
    
    # Test each endpoint with each origin
    results = []
    for origin in TEST_ORIGINS:
        for endpoint in TEST_ENDPOINTS:
            success = test_cors_preflight(endpoint, origin)
            results.append((endpoint, origin, success))
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY:")
    passed = sum(1 for _, _, success in results if success)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("\n✅ All CORS tests passed!")
    else:
        print("\n❌ Some CORS tests failed!")
        print("\nFailed tests:")
        for endpoint, origin, success in results:
            if not success:
                print(f"  - {endpoint} from {origin}")

if __name__ == "__main__":
    main()