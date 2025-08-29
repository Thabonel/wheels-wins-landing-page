#!/usr/bin/env python3
"""
CORS Testing Script
Tests the backend CORS configuration with the frontend origins.
"""

import requests
import sys

def test_cors_preflight(origin, endpoint):
    """Test CORS preflight request"""
    try:
        # Send OPTIONS request (preflight)
        response = requests.options(
            endpoint,
            headers={
                'Origin': origin,
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Authorization, Content-Type'
            },
            timeout=10
        )
        
        print(f"\n🌍 Testing origin: {origin}")
        print(f"📍 Endpoint: {endpoint}")
        print(f"📊 Status: {response.status_code}")
        
        # Check CORS headers
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
        }
        
        print("🔧 CORS Headers:")
        for header, value in cors_headers.items():
            if value:
                print(f"  ✅ {header}: {value}")
            else:
                print(f"  ❌ {header}: MISSING")
        
        return response.status_code == 200 and cors_headers['Access-Control-Allow-Origin']
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Error testing {origin}: {e}")
        return False

def main():
    """Main test function"""
    backend_url = "https://pam-backend.onrender.com"
    
    # Origins to test
    test_origins = [
        "https://wheelsandwins.com",
        "https://www.wheelsandwins.com",
        "https://4fd8d7d4-1c59-4996-a0dd-48be31131e7c.lovable.app",
        "http://localhost:3000",
        "http://localhost:8080"
    ]
    
    # Endpoints to test
    test_endpoints = [
        f"{backend_url}/health",
        f"{backend_url}/api/v1/health",
        f"{backend_url}/api/v1/users/test/settings"
    ]
    
    print("🚀 Testing CORS Configuration")
    print("=" * 50)
    
    success_count = 0
    total_tests = 0
    
    for endpoint in test_endpoints:
        print(f"\n📡 Testing endpoint: {endpoint}")
        for origin in test_origins:
            total_tests += 1
            if test_cors_preflight(origin, endpoint):
                success_count += 1
    
    print("\n" + "=" * 50)
    print(f"📈 Results: {success_count}/{total_tests} tests passed")
    
    if success_count == total_tests:
        print("✅ All CORS tests passed!")
        return 0
    else:
        print("❌ Some CORS tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())