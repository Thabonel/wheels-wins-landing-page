#!/usr/bin/env python3
"""
Test script to verify HuggingFace API connectivity
This tests if your HuggingFace API key can access the nari-labs/Dia-1.6B model
"""

import asyncio
import os
import requests
import json
from datetime import datetime

async def test_huggingface_api():
    """Test direct HuggingFace API call"""
    
    # You'll need to replace this with your actual API key for testing
    api_key = os.getenv('HUGGINGFACE_API_KEY') or 'hf_your_api_key_here'
    
    if api_key == 'hf_your_api_key_here':
        print("❌ Please set HUGGINGFACE_API_KEY environment variable or update the script")
        print("   export HUGGINGFACE_API_KEY=hf_your_actual_key")
        return False
    
    print("🔍 Testing HuggingFace API connectivity...")
    print(f"📅 Test time: {datetime.now()}")
    print(f"🔑 API key: {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else '****'}")
    print()
    
    # Test parameters
    test_text = "Hello, this is a test of the HuggingFace TTS system"
    model_url = "https://api-inference.huggingface.co/models/nari-labs/Dia-1.6B"
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }
    
    payload = {
        "inputs": test_text,
        "parameters": {
            "temperature": 1.1,
            "cfg_scale": 3,
            "speed_factor": 0.96,
            "max_new_tokens": 2048,
            "return_full_text": False
        },
        "options": {
            "wait_for_model": True,
            "use_cache": False
        }
    }
    
    try:
        print(f"📤 Sending request to: {model_url}")
        print(f"📝 Text to synthesize: '{test_text}'")
        print()
        
        response = requests.post(
            model_url,
            headers=headers,
            json=payload,
            timeout=30
        )
        
        print(f"📥 Response status: {response.status_code}")
        print(f"📏 Response size: {len(response.content)} bytes")
        
        if response.status_code == 200:
            print("✅ HuggingFace API call successful!")
            
            # Check if response is JSON or binary
            content_type = response.headers.get('content-type', '')
            print(f"📄 Content type: {content_type}")
            
            if 'application/json' in content_type:
                try:
                    data = response.json()
                    print(f"📊 JSON response keys: {list(data.keys())}")
                except:
                    print("⚠️ Response is not valid JSON")
            else:
                print(f"🎵 Binary audio response received: {len(response.content)} bytes")
            
            return True
            
        elif response.status_code == 401:
            print("❌ Authentication failed - check your API key")
            print(f"🔍 Response: {response.text}")
            
        elif response.status_code == 400:
            print("❌ Bad request - check the model parameters")
            print(f"🔍 Response: {response.text}")
            
        elif response.status_code == 503:
            print("⚠️ Service unavailable - model may be loading")
            print("💡 Try again in a few minutes")
            print(f"🔍 Response: {response.text}")
            
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            print(f"🔍 Response: {response.text}")
            
        return False
        
    except requests.exceptions.Timeout:
        print("❌ Request timed out (30 seconds)")
        print("💡 The model might be cold-starting, try again")
        return False
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

async def main():
    """Run the HuggingFace API test"""
    print("🧪 HuggingFace TTS API Test")
    print("=" * 50)
    
    success = await test_huggingface_api()
    
    print()
    print("📋 Test Summary:")
    print("=" * 50)
    
    if success:
        print("✅ HuggingFace API is working correctly")
        print("🎉 Your API key has access to the nari-labs/Dia-1.6B model")
        print("🚀 You can proceed with deploying the Supabase function")
    else:
        print("❌ HuggingFace API test failed")
        print("🔧 Please check:")
        print("   1. Your API key is correct")
        print("   2. You have access to the nari-labs/Dia-1.6B model")
        print("   3. Your internet connection is working")
        print("   4. Try running the test again in a few minutes")

if __name__ == "__main__":
    asyncio.run(main())