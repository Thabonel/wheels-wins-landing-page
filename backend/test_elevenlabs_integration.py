#!/usr/bin/env python3
"""
Test script for ElevenLabs TTS integration with PAM voice system
"""

import asyncio
import os
import sys
import logging
from pathlib import Path

# Add the backend directory to sys.path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.services.tts.manager import get_tts_manager
from app.services.tts.base import VoiceSettings

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_elevenlabs_integration():
    """Test ElevenLabs integration with the TTS system"""
    
    print("🧪 Testing ElevenLabs Integration with PAM Voice System")
    print("=" * 60)
    
    try:
        # Initialize TTS Manager
        print("1️⃣ Initializing TTS Manager...")
        tts_manager = get_tts_manager()
        
        # Check engine status
        print("2️⃣ Checking TTS Engine Status...")
        status = tts_manager.get_engine_status()
        print(f"   • Total engines: {status['total_engines']}")
        print(f"   • Available engines: {status['available_engines']}")
        
        for engine_name, engine_info in status['engines'].items():
            status_icon = "✅" if engine_info['available'] else "❌"
            health_icon = "💚" if engine_info['healthy'] else "💔"
            print(f"   {status_icon} {health_icon} {engine_name}: Available={engine_info['available']}, Healthy={engine_info['healthy']}")
        
        # Test available voices
        print("3️⃣ Testing Available Voices...")
        voices = tts_manager.get_available_voices()
        print(f"   • Found {len(voices)} total voices")
        
        # Show ElevenLabs voices specifically
        elevenlabs_voices = [v for v in voices if v.get('engine') == 'ElevenLabs']
        if elevenlabs_voices:
            print(f"   • ElevenLabs voices: {len(elevenlabs_voices)}")
            for voice in elevenlabs_voices[:5]:  # Show first 5
                print(f"     - {voice['name']} ({voice.get('gender', 'unknown')})")
        else:
            print("   ⚠️ No ElevenLabs voices found (API key may be missing)")
        
        # Test synthesis with different voice settings
        print("4️⃣ Testing Voice Synthesis...")
        
        test_cases = [
            {
                "name": "Default Voice",
                "settings": VoiceSettings(),
                "text": "Hello, this is PAM testing ElevenLabs voice synthesis."
            },
            {
                "name": "Rachel Voice",
                "settings": VoiceSettings(voice="rachel", speed=1.0, volume=0.8),
                "text": "Hi there! I'm using the Rachel voice from ElevenLabs."
            },
            {
                "name": "Fast Speech",
                "settings": VoiceSettings(voice="alloy", speed=1.5),
                "text": "This is a test of faster speech synthesis using ElevenLabs Flash model."
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"   Test {i}: {test_case['name']}")
            try:
                response = await tts_manager.synthesize(
                    text=test_case['text'],
                    settings=test_case['settings']
                )
                
                print(f"     ✅ Success! Engine: {response.engine_used}")
                print(f"     📊 Audio data: {len(response.audio_data)} bytes")
                print(f"     🎵 Format: {response.format}")
                print(f"     ⏱️ Duration: {response.duration:.1f}s")
                
                # Save audio file for testing
                filename = f"test_output_{i}_{response.engine_used.lower()}.{response.format}"
                with open(filename, 'wb') as f:
                    f.write(response.audio_data)
                print(f"     💾 Saved to: {filename}")
                
            except Exception as e:
                print(f"     ❌ Failed: {str(e)}")
        
        # Test health check
        print("5️⃣ Testing TTS Health Check...")
        is_healthy = tts_manager.health_check()
        health_status = "✅ Healthy" if is_healthy else "❌ Unhealthy"
        print(f"   TTS System: {health_status}")
        
        # Final summary
        print("\n" + "=" * 60)
        print("🎉 ElevenLabs Integration Test Complete!")
        
        if status['available_engines'] > 0:
            print("✅ TTS system is working with available engines")
            if any(engine['available'] for engine_name, engine in status['engines'].items() if engine_name == 'ElevenLabs'):
                print("🎵 ElevenLabs engine is available and ready!")
            else:
                print("⚠️ ElevenLabs engine not available (check API key)")
                print("💡 Falling back to other TTS engines (EdgeTTS, SystemTTS)")
        else:
            print("❌ No TTS engines available")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        print(f"🔧 Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main test function"""
    
    # Check for ElevenLabs API key
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        print("⚠️ Warning: ELEVENLABS_API_KEY not set in environment")
        print("💡 ElevenLabs engine will not be available, but other engines will work")
        print("🔑 To test ElevenLabs, set: export ELEVENLABS_API_KEY=your_api_key")
    else:
        print(f"🔑 ElevenLabs API Key found: {api_key[:10]}...")
    
    print("🚀 Starting ElevenLabs integration test...\n")
    
    # Run async test
    success = asyncio.run(test_elevenlabs_integration())
    
    if success:
        print("\n🎊 All tests completed!")
        exit(0)
    else:
        print("\n💥 Tests failed!")
        exit(1)

if __name__ == "__main__":
    main()