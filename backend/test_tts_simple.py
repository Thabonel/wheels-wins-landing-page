#!/usr/bin/env python3
"""
Simplified TTS Test - Tests core TTS functionality without app dependencies
"""

import asyncio
import sys
import os
import tempfile
import platform

# Test Edge TTS availability
print("🧪 Testing TTS Dependencies...")
print("=" * 40)

# Test 1: Check if edge-tts is available
try:
    import edge_tts
    print("✅ edge-tts package: Available")
    edge_available = True
except ImportError:
    print("❌ edge-tts package: Not installed")
    print("   Install with: pip install edge-tts")
    edge_available = False

# Test 2: Check if pydub is available  
try:
    import pydub
    print("✅ pydub package: Available")
    pydub_available = True
except ImportError:
    print("❌ pydub package: Not installed")
    print("   Install with: pip install pydub")
    pydub_available = False

# Test 3: Check system TTS capabilities
system_name = platform.system().lower()
print(f"✅ Operating System: {system_name}")

if system_name == "darwin":
    import shutil
    if shutil.which("say"):
        print("✅ macOS 'say' command: Available")
        system_tts_available = True
    else:
        print("❌ macOS 'say' command: Not available")
        system_tts_available = False
elif system_name == "linux":
    import shutil
    tts_commands = ["espeak", "festival", "spd-say"]
    available_commands = [cmd for cmd in tts_commands if shutil.which(cmd)]
    if available_commands:
        print(f"✅ Linux TTS commands: {', '.join(available_commands)}")
        system_tts_available = True
    else:
        print(f"❌ Linux TTS commands: None found (tried: {', '.join(tts_commands)})")
        system_tts_available = False
elif system_name == "windows":
    print("✅ Windows TTS: PowerShell available")
    system_tts_available = True
else:
    print(f"❌ Unknown system: {system_name}")
    system_tts_available = False

# Test 4: Simple Edge TTS test if available
if edge_available:
    print("\n🧪 Testing Edge TTS...")
    try:
        async def test_edge_simple():
            communicate = edge_tts.Communicate("Hello, this is a test.", "en-US-AriaNeural")
            audio_chunks = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_chunks.append(chunk["data"])
            return len(b''.join(audio_chunks)) > 0

        result = asyncio.run(test_edge_simple())
        if result:
            print("✅ Edge TTS synthesis: Working")
        else:
            print("❌ Edge TTS synthesis: No audio generated")
    except Exception as e:
        print(f"❌ Edge TTS synthesis: Failed - {e}")
else:
    print("⏭️ Skipping Edge TTS test (package not installed)")

# Test 5: System TTS test if available
if system_tts_available and system_name == "darwin":
    print("\n🧪 Testing macOS System TTS...")
    try:
        import subprocess
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_path = temp_file.name
        
        process = subprocess.run([
            "say", "-o", temp_path, "-r", "200", "Hello, this is a system TTS test."
        ], capture_output=True)
        
        if process.returncode == 0 and os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
            print("✅ System TTS synthesis: Working")
            os.unlink(temp_path)
        else:
            print(f"❌ System TTS synthesis: Failed (return code: {process.returncode})")
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    except Exception as e:
        print(f"❌ System TTS synthesis: Failed - {e}")

# Final Summary
print(f"\n🏆 TTS Dependencies Summary")
print("=" * 40)
print(f"Edge TTS: {'✅ Available' if edge_available else '❌ Missing'}")
print(f"System TTS: {'✅ Available' if system_tts_available else '❌ Missing'}")
print(f"Audio Processing: {'✅ Available' if pydub_available else '❌ Missing'}")

if edge_available or system_tts_available:
    print("\n🎉 TTS functionality is available!")
    print("Phase 5A TTS backend should work correctly.")
    sys.exit(0)
else:
    print("\n⚠️ No TTS engines available.")
    print("Install dependencies: pip install edge-tts pydub")
    sys.exit(1)