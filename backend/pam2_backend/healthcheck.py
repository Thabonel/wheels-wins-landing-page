#!/usr/bin/env python3
"""
PAM 2.0 Health Check Script
===========================

Simple health check script for monitoring PAM 2.0 deployment.
Can be used for local testing or external monitoring.
"""

import asyncio
import sys
import time
from typing import Dict, Any
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from pam_2.core.config import get_settings
    from pam_2.services.conversational_engine import ConversationalEngine
    from pam_2.services.voice_service import VoiceService
    from pam_2.integrations.mcp_client import MCPClient
    from pam_2.services.advanced_features import AdvancedFeaturesService
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the PAM 2.0 directory")
    sys.exit(1)


async def check_core_services() -> Dict[str, Any]:
    """Check core PAM 2.0 services"""
    results = {
        "conversational_engine": False,
        "voice_service": False,
        "mcp_client": False,
        "advanced_features": False
    }

    try:
        # Test conversational engine
        engine = ConversationalEngine()
        await engine.initialize()
        results["conversational_engine"] = True
        print("✅ Conversational Engine: OK")
    except Exception as e:
        print(f"❌ Conversational Engine: {e}")

    try:
        # Test voice service
        voice = VoiceService()
        await voice.initialize()
        results["voice_service"] = True
        print("✅ Voice Service: OK")
    except Exception as e:
        print(f"❌ Voice Service: {e}")

    try:
        # Test MCP client
        mcp = MCPClient()
        await mcp.initialize()
        results["mcp_client"] = True
        print("✅ MCP Client: OK")
    except Exception as e:
        print(f"❌ MCP Client: {e}")

    try:
        # Test advanced features
        advanced = AdvancedFeaturesService()
        await advanced.initialize()
        results["advanced_features"] = True
        print("✅ Advanced Features: OK")
    except Exception as e:
        print(f"❌ Advanced Features: {e}")

    return results


async def check_configuration() -> Dict[str, Any]:
    """Check PAM 2.0 configuration"""
    try:
        settings = get_settings()

        config_check = {
            "environment": settings.environment,
            "debug": settings.debug,
            "version": settings.app_version,
            "gemini_configured": bool(getattr(settings, 'gemini_api_key', None)),
            "redis_configured": bool(getattr(settings, 'redis_url', None)),
        }

        print(f"✅ Configuration: {settings.environment} v{settings.app_version}")
        return config_check

    except Exception as e:
        print(f"❌ Configuration: {e}")
        return {"error": str(e)}


async def main():
    """Main health check routine"""
    print("🏥 PAM 2.0 Health Check")
    print("=" * 40)

    start_time = time.time()

    # Check configuration
    print("\n📋 Checking Configuration...")
    config_results = await check_configuration()

    # Check services
    print("\n🔧 Checking Services...")
    service_results = await check_core_services()

    # Calculate results
    total_services = len(service_results)
    healthy_services = sum(1 for v in service_results.values() if v)

    elapsed_time = time.time() - start_time

    # Print summary
    print("\n📊 Health Check Summary")
    print("=" * 40)
    print(f"⏱️  Duration: {elapsed_time:.2f}s")
    print(f"🎯 Services: {healthy_services}/{total_services} healthy")
    print(f"⚙️  Environment: {config_results.get('environment', 'unknown')}")

    if healthy_services == total_services:
        print("\n🎉 PAM 2.0 is fully operational!")
        return 0
    else:
        print(f"\n⚠️  PAM 2.0 has {total_services - healthy_services} service(s) down")
        return 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n🛑 Health check cancelled")
        sys.exit(130)
    except Exception as e:
        print(f"\n💥 Health check failed: {e}")
        sys.exit(1)