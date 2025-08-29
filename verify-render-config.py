#!/usr/bin/env python3
"""
Script to verify Render environment configuration via API call
"""

import requests
import json

def test_render_config():
    """Test the live Render configuration"""
    
    print("🌐 Testing Live Render Configuration...")
    print("=" * 50)
    
    # Test observability endpoint
    try:
        backend_url = "https://wheels-wins-backend-staging.onrender.com"
        
        print(f"📡 Checking: {backend_url}/api/v1/observability/config")
        response = requests.get(f"{backend_url}/api/v1/observability/config", timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            config = result.get('data', {})
            
            print("\n✅ Configuration Status:")
            platforms = config.get('platforms', {})
            
            for platform, status in platforms.items():
                configured = status.get('configured', False)
                icon = "✅" if configured else "❌"
                print(f"  {icon} {platform.title()}: {'Configured' if configured else 'Not Configured'}")
                
                # Show additional details
                if 'key_preview' in status and status['key_preview']:
                    print(f"     Key preview: {status['key_preview']}")
                if 'host' in status:
                    print(f"     Host: {status['host']}")
            
            print(f"\n📊 Environment: {config.get('environment', 'unknown')}")
            print(f"📊 Observability Enabled: {config.get('enabled', False)}")
            
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_render_config()