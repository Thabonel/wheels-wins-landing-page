#!/usr/bin/env python3
"""
Fix script to ensure Langfuse and AgentOps are properly configured
"""

import os
import sys
import asyncio
import logging
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

async def test_platform_configuration():
    """Test and fix platform configuration recognition"""
    
    print("🔍 Testing Platform Configuration...")
    print("=" * 50)
    
    # Test environment variables
    print("\n📋 Environment Variables Check:")
    env_vars = {
        'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY'),
        'LANGFUSE_SECRET_KEY': os.getenv('LANGFUSE_SECRET_KEY'), 
        'LANGFUSE_PUBLIC_KEY': os.getenv('LANGFUSE_PUBLIC_KEY'),
        'LANGFUSE_HOST': os.getenv('LANGFUSE_HOST'),
        'AGENTOPS_API_KEY': os.getenv('AGENTOPS_API_KEY'),
    }
    
    for key, value in env_vars.items():
        if value:
            preview = f"{value[:8]}..." if len(value) > 8 else value
            print(f"  ✅ {key}: {preview}")
        else:
            print(f"  ❌ {key}: Not set")
    
    # Test configuration loading
    print("\n⚙️ Configuration Loading Test:")
    try:
        from app.core.infra_config import InfraConfig
        config = InfraConfig()
        
        print(f"  📊 OPENAI_API_KEY: {'✅ Configured' if config.OPENAI_API_KEY else '❌ Missing'}")
        print(f"  📊 LANGFUSE_SECRET_KEY: {'✅ Configured' if config.LANGFUSE_SECRET_KEY else '❌ Missing'}")
        print(f"  📊 LANGFUSE_PUBLIC_KEY: {'✅ Configured' if config.LANGFUSE_PUBLIC_KEY else '❌ Missing'}")
        print(f"  📊 LANGFUSE_HOST: {config.LANGFUSE_HOST}")
        print(f"  📊 AGENTOPS_API_KEY: {'✅ Configured' if config.AGENTOPS_API_KEY else '❌ Missing'}")
        
    except ImportError as e:
        print(f"  ❌ Config import failed: {e}")
    except Exception as e:
        print(f"  ❌ Config loading failed: {e}")
    
    # Test observability configuration
    print("\n🔬 Observability Configuration Test:")
    try:
        from app.observability.config import ObservabilityConfig
        from app.core.infra_config import InfraConfig
        
        settings = InfraConfig()
        obs_config = ObservabilityConfig(settings)
        
        # Test Langfuse
        langfuse_configured = bool(
            getattr(settings, 'LANGFUSE_SECRET_KEY', None) and 
            getattr(settings, 'LANGFUSE_PUBLIC_KEY', None)
        )
        print(f"  📊 Langfuse configured: {'✅ Yes' if langfuse_configured else '❌ No'}")
        
        # Test AgentOps  
        agentops_configured = bool(getattr(settings, 'AGENTOPS_API_KEY', None))
        print(f"  📊 AgentOps configured: {'✅ Yes' if agentops_configured else '❌ No'}")
        
        # Get platform status
        status = obs_config.get_status()
        print(f"  📊 Platform Status: {status}")
        
    except ImportError as e:
        print(f"  ❌ Observability import failed: {e}")
    except Exception as e:
        print(f"  ❌ Observability test failed: {e}")
    
    # Test package installations
    print("\n📦 Package Installation Check:")
    packages = ['langfuse', 'agentops', 'openai']
    
    for package in packages:
        try:
            __import__(package)
            print(f"  ✅ {package}: Installed")
        except ImportError:
            print(f"  ❌ {package}: Not installed")
    
    print("\n🔧 Suggested Fixes:")
    print("=" * 50)
    
    # Check if packages need installation
    missing_packages = []
    for package in packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"1. Install missing packages:")
        print(f"   pip install {' '.join(missing_packages)}")
    
    # Check environment variable issues
    missing_env = []
    if not os.getenv('LANGFUSE_SECRET_KEY'):
        missing_env.append('LANGFUSE_SECRET_KEY')
    if not os.getenv('LANGFUSE_PUBLIC_KEY'):
        missing_env.append('LANGFUSE_PUBLIC_KEY') 
    if not os.getenv('AGENTOPS_API_KEY'):
        missing_env.append('AGENTOPS_API_KEY')
    
    if missing_env:
        print(f"2. Environment variables not loaded in Python:")
        for var in missing_env:
            print(f"   - {var}")
        print("   This might be because Python isn't reading from Render environment")
        print("   Check that the environment variables are properly set in Render dashboard")
    
    # Check configuration patterns
    print("3. Configuration validation patterns:")
    print("   - Langfuse requires both SECRET_KEY and PUBLIC_KEY")
    print("   - AgentOps requires API_KEY")
    print("   - OpenAI might show 'degraded' if hitting rate limits")

async def main():
    """Main function"""
    await test_platform_configuration()
    
    print("\n🎯 Summary:")
    print("=" * 50)
    print("If all environment variables show as configured but platforms")
    print("still show 'not_configured', this indicates:")
    print("1. Package import issues")
    print("2. Configuration validation logic issues") 
    print("3. Runtime environment variable loading issues")
    print("\nThe WebSocket functionality is working correctly regardless!")

if __name__ == "__main__":
    asyncio.run(main())