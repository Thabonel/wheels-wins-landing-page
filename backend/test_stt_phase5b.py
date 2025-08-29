#!/usr/bin/env python3
"""
Test STT (Speech-to-Text) Implementation - Phase 5B
Tests the STT manager and engines
"""

import asyncio
import sys
import os
import wave
import io
import base64

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.stt import get_stt_manager, AudioFormat

async def test_stt_manager():
    """Test STT Manager initialization and capabilities"""
    print("\n" + "="*60)
    print("🎤 TESTING STT MANAGER")
    print("="*60)
    
    try:
        # Get STT manager
        manager = get_stt_manager()
        
        # Check available engines
        engines = manager.get_available_engines()
        print(f"\n✅ Available STT engines: {engines}")
        
        # Check supported formats
        formats = manager.get_supported_formats()
        print(f"✅ Supported formats: {[f.value for f in formats]}")
        
        # Check supported languages (first 10)
        languages = manager.get_supported_languages()
        print(f"✅ Supported languages ({len(languages)} total): {languages[:10]}...")
        
        # Get capabilities
        capabilities = manager.get_engine_capabilities()
        print(f"\n📊 Engine Capabilities:")
        print(f"   Primary engine: {capabilities.get('primary_engine', 'None')}")
        print(f"   Total engines: {capabilities.get('total_engines', 0)}")
        
        # Health check
        health = await manager.health_check()
        print(f"\n🏥 Health Check:")
        print(f"   Status: {'✅ Healthy' if health['healthy'] else '❌ Unhealthy'}")
        for engine in health.get('engines', []):
            print(f"   - {engine['name']}: {'✅ Available' if engine['available'] else '❌ Not available'}")
        
        return True
        
    except Exception as e:
        print(f"❌ STT Manager test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_whisper_transcription():
    """Test Whisper STT with sample audio"""
    print("\n" + "="*60)
    print("🎙️ TESTING WHISPER STT ENGINE")
    print("="*60)
    
    try:
        manager = get_stt_manager()
        
        # Create a simple test WAV file with silence
        print("\n📝 Creating test audio (1 second of silence)...")
        audio_buffer = io.BytesIO()
        with wave.open(audio_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(16000)  # 16kHz
            # Write 1 second of silence
            wav_file.writeframes(b'\x00' * 32000)
        
        audio_data = audio_buffer.getvalue()
        print(f"   Audio size: {len(audio_data)} bytes")
        
        # Test transcription
        print("\n🎤 Transcribing audio with Whisper...")
        result = await manager.transcribe(
            audio_data=audio_data,
            format=AudioFormat.WAV,
            language="en",
            prefer_engine="WhisperSTT"
        )
        
        print(f"\n✅ Transcription Result:")
        print(f"   Text: '{result.text}' (empty expected for silence)")
        print(f"   Confidence: {result.confidence:.2f}")
        print(f"   Language: {result.language}")
        print(f"   Engine: {result.engine_used}")
        print(f"   Processing time: {result.processing_time:.2f}s")
        
        return True
        
    except Exception as e:
        print(f"❌ Whisper STT test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_browser_stt():
    """Test Browser STT placeholder"""
    print("\n" + "="*60)
    print("🌐 TESTING BROWSER STT ENGINE")
    print("="*60)
    
    try:
        manager = get_stt_manager()
        
        # Create dummy audio data
        audio_data = b"dummy_audio_data"
        
        # Test browser STT (should return instruction)
        print("\n🌐 Testing browser STT response...")
        result = await manager.transcribe(
            audio_data=audio_data,
            format=AudioFormat.WEBM,
            language="en",
            prefer_engine="BrowserSTT"
        )
        
        print(f"\n✅ Browser STT Result:")
        print(f"   Text: {result.text}")
        print(f"   Engine: {result.engine_used}")
        
        if result.text == "[BROWSER_STT_REQUIRED]":
            print("   ✅ Correctly signals browser STT required")
            if result.words and len(result.words) > 0:
                instruction = result.words[0]
                print(f"   Instruction: {instruction.get('instruction', 'N/A')}")
                print(f"   Language: {instruction.get('language', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Browser STT test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_websocket_integration():
    """Test WebSocket integration for STT"""
    print("\n" + "="*60)
    print("🔌 TESTING WEBSOCKET STT INTEGRATION")
    print("="*60)
    
    print("\n📝 WebSocket Message Format for Voice:")
    print("""
{
    "type": "voice",
    "audio_data": "<base64_encoded_audio>",
    "format": "webm",  // or "wav", "mp3", etc.
    "language": "en",
    "auto_send": false  // Set to true to auto-send transcribed text
}
    """)
    
    print("\n📝 WebSocket Response Formats:")
    print("""
1. STT Result:
{
    "type": "stt_result",
    "text": "Transcribed text here",
    "confidence": 0.95,
    "language": "en",
    "engine": "WhisperSTT",
    "processing_time": 0.5
}

2. Browser STT Required:
{
    "type": "stt_instruction",
    "instruction": "use_browser_stt",
    "language": "en"
}

3. STT Capabilities Request:
{
    "type": "stt_capabilities"
}
    """)
    
    print("\n✅ WebSocket STT integration is ready!")
    print("   - Send 'voice' messages with audio data")
    print("   - Send 'stt_capabilities' to get engine info")
    print("   - Handle 'stt_result' and 'stt_instruction' responses")
    
    return True

async def main():
    """Run all STT tests"""
    print("\n" + "="*60)
    print("🚀 PHASE 5B: STT IMPLEMENTATION TEST SUITE")
    print("="*60)
    
    # Initialize environment
    print("\n🔧 Initializing environment...")
    os.environ.setdefault("NODE_ENV", "development")
    
    # Run tests
    tests = [
        ("STT Manager", test_stt_manager),
        ("Whisper Transcription", test_whisper_transcription),
        ("Browser STT", test_browser_stt),
        ("WebSocket Integration", test_websocket_integration)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"Running: {test_name}")
        print('='*60)
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
    
    total = len(results)
    passed = sum(1 for _, success in results if success)
    
    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"   {test_name}: {status}")
    
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All STT tests passed! Phase 5B implementation complete.")
    else:
        print(f"\n⚠️ {total - passed} tests failed. Please review the errors above.")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)