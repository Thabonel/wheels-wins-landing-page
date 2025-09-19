#!/usr/bin/env python3
"""
Test script to verify Gemini Flash integration
Run this to test the backend Gemini provider implementation
"""

import os
import asyncio
import sys
sys.path.append('backend')

from backend.app.services.ai.gemini_provider import GeminiProvider
from backend.app.services.ai.provider_interface import ProviderConfig, AIMessage

async def test_gemini_integration():
    """Test Gemini Flash integration"""

    # Check for API key
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment variables")
        print("Please set GEMINI_API_KEY=your_api_key_here")
        return False

    print(f"🔑 Using Gemini API key: {api_key[:10]}...")

    try:
        # Create Gemini provider
        config = ProviderConfig(
            name="gemini",
            api_key=api_key,
            default_model="gemini-1.5-flash"
        )

        print("🚀 Initializing Gemini provider...")
        gemini_provider = GeminiProvider(config)

        # Initialize the provider
        if not await gemini_provider.initialize():
            print("❌ Failed to initialize Gemini provider")
            return False

        print("✅ Gemini provider initialized successfully")

        # Test basic completion
        print("🧪 Testing basic completion...")
        messages = [
            AIMessage(role="system", content="You are a helpful travel assistant for RV travelers."),
            AIMessage(role="user", content="Hello! What's the best time to visit Australia?")
        ]

        response = await gemini_provider.complete(messages)

        print(f"✅ Received response from Gemini Flash:")
        print(f"📝 Content: {response.content[:200]}...")
        print(f"🔧 Model: {response.model}")
        print(f"⚡ Latency: {response.latency_ms:.1f}ms")
        print(f"💰 Tokens: {response.usage}")

        # Test health check
        print("🏥 Testing health check...")
        status, message = await gemini_provider.health_check()
        print(f"✅ Health status: {status.value} - {message}")

        # Test streaming
        print("🌊 Testing streaming response...")
        messages = [
            AIMessage(role="user", content="List 3 great RV camping spots in Australia.")
        ]

        print("📡 Streaming response:")
        async for chunk in gemini_provider.complete_stream(messages):
            print(chunk, end='', flush=True)
        print("\n✅ Streaming test completed")

        print("\n🎉 All Gemini tests passed successfully!")
        print("\n💡 Gemini Flash Benefits:")
        print("   • 25x cheaper than Claude ($0.075/M vs $3/M input tokens)")
        print("   • 5x larger context (1M vs 200K tokens)")
        print("   • Lightning fast response times")
        print("   • Superior multimodal capabilities")

        return True

    except Exception as e:
        print(f"❌ Gemini test failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_gemini_integration())
    sys.exit(0 if success else 1)