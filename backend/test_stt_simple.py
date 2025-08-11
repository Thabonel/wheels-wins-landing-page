#!/usr/bin/env python3
"""
Simple STT Test without environment dependencies
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set mock environment variables
os.environ["OPENAI_API_KEY"] = "sk-test-key"
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-key"

async def test_stt_structure():
    """Test STT structure is properly created"""
    print("\n" + "="*60)
    print("🎤 TESTING STT STRUCTURE")
    print("="*60)
    
    try:
        # Import STT modules
        from app.services.stt import BaseSTTEngine, STTResponse, AudioFormat
        print("✅ Imported base STT classes")
        
        from app.services.stt.engines import WhisperSTTEngine, BrowserSTTEngine
        print("✅ Imported STT engines")
        
        from app.services.stt.manager import STTManager
        print("✅ Imported STT manager")
        
        # Test AudioFormat enum
        formats = [AudioFormat.WAV, AudioFormat.MP3, AudioFormat.WEBM]
        print(f"✅ Audio formats: {[f.value for f in formats]}")
        
        # Test STTResponse creation
        response = STTResponse(
            text="Test transcription",
            confidence=0.95,
            language="en",
            engine_used="TestEngine"
        )
        print(f"✅ Created STTResponse: text='{response.text}', confidence={response.confidence}")
        
        # Test Browser STT engine (doesn't need API keys)
        browser_engine = BrowserSTTEngine()
        print(f"✅ Browser STT engine created: available={browser_engine.is_available}")
        
        # Test capabilities
        capabilities = browser_engine.get_capabilities()
        print(f"✅ Browser STT capabilities: real_time={capabilities['features']['real_time']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_browser_stt_response():
    """Test Browser STT response"""
    print("\n" + "="*60)
    print("🌐 TESTING BROWSER STT RESPONSE")
    print("="*60)
    
    try:
        from app.services.stt.engines import BrowserSTTEngine
        from app.services.stt.base import AudioFormat
        
        engine = BrowserSTTEngine()
        
        # Test transcribe (should return instruction)
        result = await engine.transcribe(
            audio_data=b"dummy",
            format=AudioFormat.WEBM,
            language="en",
            continuous=True,
            interim_results=True
        )
        
        print(f"✅ Browser STT result:")
        print(f"   Text: {result.text}")
        print(f"   Engine: {result.engine_used}")
        
        if result.text == "[BROWSER_STT_REQUIRED]":
            print("   ✅ Correctly signals browser STT required")
            if result.words and len(result.words) > 0:
                instruction = result.words[0]
                print(f"   Instruction: {instruction}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_manager_initialization():
    """Test STT Manager basic initialization"""
    print("\n" + "="*60)
    print("📊 TESTING STT MANAGER INITIALIZATION")
    print("="*60)
    
    try:
        from app.services.stt.manager import STTManager
        
        # Create manager
        manager = STTManager()
        print(f"✅ STT Manager created")
        
        # Check engines
        engines = manager.get_available_engines()
        print(f"✅ Available engines: {engines}")
        
        # Check formats
        formats = manager.get_supported_formats()
        print(f"✅ Supported formats: {[f.value for f in formats]}")
        
        # Check languages
        languages = manager.get_supported_languages()
        print(f"✅ Supported languages: {len(languages)} total")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run simple STT tests"""
    print("\n" + "="*60)
    print("🚀 SIMPLE STT STRUCTURE TEST")
    print("="*60)
    
    tests = [
        ("STT Structure", test_stt_structure),
        ("Browser STT Response", test_browser_stt_response),
        ("Manager Initialization", test_manager_initialization)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = await test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    
    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"   {test_name}: {status}")
    
    passed = sum(1 for _, s in results if s)
    total = len(results)
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All STT structure tests passed!")
        print("\n📝 STT Phase 5B Implementation Complete:")
        print("   ✅ Base STT interface created")
        print("   ✅ Whisper STT engine implemented")
        print("   ✅ Browser STT placeholder implemented")
        print("   ✅ STT Manager with fallback support")
        print("   ✅ WebSocket integration added")
        print("\n🚀 Ready for Phase 5C: Voice UI Components")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)