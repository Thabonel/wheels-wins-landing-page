#!/usr/bin/env python3
"""
Debug script to test the voice pipeline components individually
This script tests actual functionality - no mock data or fake responses.
Each component must be properly configured to pass its test.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

async def test_whisper_stt():
    """Test Whisper STT component"""
    print("🎤 Testing Whisper STT...")
    
    try:
        from app.voice.stt_whisper import whisper_stt
        
        # Create a small test audio file (minimal WAV)
        wav_header = b'RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00'
        test_audio = wav_header + b'\x00' * 100
        
        result = await whisper_stt.transcribe(test_audio)
        print(f"✅ STT Result: {result}")
        return True, result
        
    except Exception as e:
        print(f"❌ STT Failed: {e}")
        return False, str(e)

async def test_simple_pam_service():
    """Test SimplePamService component"""
    print("🧠 Testing SimplePamService...")
    
    try:
        from app.core.simple_pam_service import SimplePamService
        
        pam_service = SimplePamService()
        context = {
            "user_id": "test-user",
            "session_id": "test-session",
            "input_type": "voice"
        }
        
        result = await pam_service.get_response("Hello PAM", context)
        print(f"✅ PAM Result: {result}")
        return True, result
        
    except Exception as e:
        print(f"❌ PAM Failed: {e}")
        return False, str(e)

async def test_tts_service():
    """Test TTS service component"""
    print("🔊 Testing TTS Service...")
    
    try:
        from app.services.tts.tts_service import TTSService
        
        tts_service = TTSService()
        await tts_service.initialize()
        
        if tts_service.is_initialized:
            result = await tts_service.synthesize_for_pam(
                text="Hello, this is a test",
                user_id="test-user",
                context="voice_test"
            )
            print(f"✅ TTS Result: {type(result)} with audio data: {bool(result and hasattr(result, 'audio_data') and result.audio_data)}")
            return True, "TTS service working"
        else:
            print("⚠️ TTS Service not initialized")
            return False, "TTS service not initialized"
            
    except Exception as e:
        print(f"❌ TTS Failed: {e}")
        return False, str(e)

async def test_fallback_tts():
    """Test fallback TTS via Supabase"""
    print("🔄 Testing Fallback TTS...")
    
    try:
        from app.api.v1.voice import generate_voice, VoiceRequest
        
        voice_request = VoiceRequest(text="Hello, this is a fallback test")
        result = await generate_voice(voice_request)
        
        print(f"✅ Fallback TTS Result: {type(result)}, has audio: {bool(result and result.audio)}")
        return True, "Fallback TTS working"
        
    except Exception as e:
        print(f"❌ Fallback TTS Failed: {e}")
        return False, str(e)

async def main():
    """Run all pipeline tests"""
    print("🔍 Debugging Voice Pipeline Components\n")
    
    # Test each component individually
    tests = [
        ("STT (Whisper)", test_whisper_stt),
        ("LLM (SimplePamService)", test_simple_pam_service), 
        ("TTS (Primary)", test_tts_service),
        ("TTS (Fallback)", test_fallback_tts)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n--- Testing {test_name} ---")
        try:
            success, result = await test_func()
            results[test_name] = {"success": success, "result": result}
        except Exception as e:
            results[test_name] = {"success": False, "result": f"Test error: {e}"}
        print()
    
    # Summary
    print("📋 Test Results Summary:")
    print("=" * 50)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result["success"] else "❌ FAIL"
        print(f"{test_name:20} | {status}")
        if not result["success"]:
            print(f"{'':20} | Error: {result['result']}")
    
    # Identify likely failure point
    print("\n🔍 Analysis:")
    failed_tests = [name for name, result in results.items() if not result["success"]]
    
    if not failed_tests:
        print("✅ All components working - issue may be in integration")
    elif "STT (Whisper)" in failed_tests:
        print("❌ Voice pipeline failing at STT step - likely OpenAI API key issue")
    elif "LLM (SimplePamService)" in failed_tests:
        print("❌ Voice pipeline failing at LLM step - likely OpenAI API or database issue")
    elif all("TTS" in test for test in failed_tests):
        print("❌ Voice pipeline failing at TTS step - likely HuggingFace API or Supabase issue")
    else:
        print("❌ Mixed failures - likely configuration issue")

if __name__ == "__main__":
    asyncio.run(main())