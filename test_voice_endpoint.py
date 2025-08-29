#!/usr/bin/env python3
"""
Test the voice endpoint to debug processing errors
"""

import requests
import tempfile
import wave
import numpy as np

def create_test_audio_file():
    """Create a simple test audio file"""
    # Generate 2 seconds of sine wave (440 Hz - A note)
    sample_rate = 44100
    duration = 2.0
    frequency = 440.0
    
    t = np.linspace(0, duration, int(sample_rate * duration))
    audio_data = (np.sin(2 * np.pi * frequency * t) * 32767).astype(np.int16)
    
    # Create temporary WAV file
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        temp_path = f.name
        
    # Write WAV file
    with wave.open(temp_path, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_data.tobytes())
    
    return temp_path

def test_voice_endpoint():
    """Test the voice endpoint with audio data"""
    print("🧪 Testing voice endpoint...")
    
    # Create test audio file
    audio_file = create_test_audio_file()
    print(f"📁 Created test audio file: {audio_file}")
    
    try:
        # Test with audio file
        with open(audio_file, 'rb') as f:
            files = {'audio': ('test.wav', f, 'audio/wav')}
            data = {'text': 'Hello PAM, this is a test message'}
            
            print("📤 Sending request to voice endpoint...")
            response = requests.post(
                'http://localhost:8000/api/v1/pam/voice',
                files=files,
                data=data,
                timeout=30
            )
            
            print(f"📥 Response status: {response.status_code}")
            print(f"📏 Response size: {len(response.content)} bytes")
            print(f"📄 Content type: {response.headers.get('content-type', 'unknown')}")
            
            if response.status_code == 200:
                print("✅ Voice endpoint working!")
                
                # Check if it's JSON or binary
                if 'application/json' in response.headers.get('content-type', ''):
                    data = response.json()
                    print(f"📊 JSON response: {data}")
                else:
                    print(f"🎵 Binary audio response: {len(response.content)} bytes")
                    
            else:
                print(f"❌ Error response: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend - is it running?")
    except Exception as e:
        print(f"❌ Test failed: {e}")
    
    # Cleanup
    import os
    try:
        os.unlink(audio_file)
        print("🗑️ Cleaned up test file")
    except:
        pass

if __name__ == "__main__":
    test_voice_endpoint()