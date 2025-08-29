#!/usr/bin/env python3
"""
Test script to diagnose AgentOps-OpenAI compatibility issue
"""

import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '.'))

async def test_openai_without_agentops():
    """Test core OpenAI functionality without AgentOps"""
    print("🔍 Testing OpenAI functionality without AgentOps...")
    
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key='test-key')
        print("✅ OpenAI AsyncOpenAI client created successfully")
        
        try:
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1
            )
            print("✅ OpenAI API call succeeded (unexpected with dummy key)")
            return True
        except Exception as api_error:
            if "401" in str(api_error) or "Incorrect API key" in str(api_error):
                print("✅ OpenAI core functionality works (auth error expected)")
                return True
            else:
                print(f"❌ OpenAI core functionality broken: {api_error}")
                return False
                
    except Exception as e:
        print(f"❌ OpenAI import/setup error: {e}")
        return False

async def test_agentops_compatibility():
    """Test AgentOps initialization and compatibility"""
    print("\n🔍 Testing AgentOps compatibility...")
    
    try:
        import agentops
        print("✅ AgentOps imported successfully")
        
        try:
            import pkg_resources
            version = pkg_resources.get_distribution('agentops').version
            print(f"✅ AgentOps version: {version}")
        except:
            print("⚠️ Could not determine AgentOps version")
        
        try:
            agentops.init(api_key='test-key')
            print("✅ AgentOps initialized without OpenAI instrumentation errors")
            return True
        except ImportError as e:
            if "openai.resources.beta.chat" in str(e):
                print(f"❌ AgentOps-OpenAI compatibility issue confirmed: {e}")
                return False
            else:
                print(f"❌ AgentOps import error: {e}")
                return False
        except Exception as e:
            print(f"⚠️ AgentOps initialization error (may be expected with dummy key): {e}")
            return True
            
    except Exception as e:
        print(f"❌ AgentOps package error: {e}")
        return False

async def test_openai_module_structure():
    """Test OpenAI module structure to understand the compatibility issue"""
    print("\n🔍 Testing OpenAI module structure...")
    
    try:
        import openai
        print(f"✅ OpenAI version: {openai.__version__}")
        
        try:
            import openai.resources.beta.chat
            print("✅ openai.resources.beta.chat module exists")
            return True
        except ImportError as e:
            print(f"❌ openai.resources.beta.chat missing: {e}")
            
            try:
                import openai.resources
                available_modules = [attr for attr in dir(openai.resources) if not attr.startswith('_')]
                print(f"📋 Available in openai.resources: {available_modules}")
                
                if hasattr(openai.resources, 'beta'):
                    import openai.resources.beta
                    beta_modules = [attr for attr in dir(openai.resources.beta) if not attr.startswith('_')]
                    print(f"📋 Available in openai.resources.beta: {beta_modules}")
                else:
                    print("❌ openai.resources.beta does not exist")
                    
            except Exception as inner_e:
                print(f"❌ Error exploring openai.resources: {inner_e}")
            
            return False
            
    except Exception as e:
        print(f"❌ OpenAI module structure test error: {e}")
        return False

async def test_pam_functionality():
    """Test if PAM can work with OpenAI despite AgentOps issues"""
    print("\n🔍 Testing PAM OpenAI functionality...")
    
    try:
        from app.services.pam.intelligent_conversation import AdvancedIntelligentConversation
        
        conversation = AdvancedIntelligentConversation()
        
        from openai import AsyncOpenAI
        test_client = AsyncOpenAI(api_key='test-key')
        conversation.client = test_client
        
        print("✅ PAM can create OpenAI client successfully")
        
        if hasattr(conversation, 'analyze_intent'):
            print("✅ PAM analyze_intent method available")
        if hasattr(conversation, 'generate_response'):
            print("✅ PAM generate_response method available")
            
        return True
        
    except Exception as e:
        print(f"❌ PAM functionality test error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Diagnosing AgentOps-OpenAI Compatibility Issue")
    print("=" * 60)
    
    openai_works = asyncio.run(test_openai_without_agentops())
    module_structure_ok = asyncio.run(test_openai_module_structure())
    agentops_works = asyncio.run(test_agentops_compatibility())
    pam_works = asyncio.run(test_pam_functionality())
    
    print("\n" + "=" * 60)
    print("📊 DIAGNOSTIC RESULTS:")
    print(f"OpenAI Core Functionality: {'✅ Working' if openai_works else '❌ Broken'}")
    print(f"OpenAI Module Structure: {'✅ Compatible' if module_structure_ok else '❌ Incompatible'}")
    print(f"AgentOps Compatibility: {'✅ Working' if agentops_works else '❌ Broken'}")
    print(f"PAM OpenAI Integration: {'✅ Working' if pam_works else '❌ Broken'}")
    
    if openai_works and pam_works and not agentops_works:
        print("\n💡 CONCLUSION: Core OpenAI works, AgentOps has compatibility issues")
        print("   Recommended action: Update AgentOps error handling")
    elif not openai_works:
        print("\n💡 CONCLUSION: Core OpenAI functionality is broken")
        print("   Recommended action: Fix OpenAI installation/configuration")
    elif agentops_works:
        print("\n💡 CONCLUSION: All systems working correctly")
        print("   Recommended action: No changes needed")
    else:
        print("\n💡 CONCLUSION: Mixed results, needs further investigation")
    
    sys.exit(0 if (openai_works and pam_works) else 1)
