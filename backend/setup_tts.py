#!/usr/bin/env python3
"""
TTS Setup Script for PAM Backend
Installs and configures TTS dependencies for voice synthesis features.
"""

import subprocess
import sys
import importlib
import asyncio
from pathlib import Path

def run_command(command, description):
    """Run a shell command and handle errors."""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"   stdout: {e.stdout}")
        print(f"   stderr: {e.stderr}")
        return False

def check_package(package_name, import_name=None):
    """Check if a Python package is installed."""
    if import_name is None:
        import_name = package_name
    
    try:
        importlib.import_module(import_name)
        print(f"✅ {package_name} is already installed")
        return True
    except ImportError:
        print(f"❌ {package_name} is not installed")
        return False

def install_dependencies():
    """Install TTS dependencies."""
    print("📦 Installing TTS Dependencies")
    print("=" * 50)
    
    # Required packages for TTS functionality
    packages = [
        ("edge-tts>=6.1.0", "edge_tts", "Microsoft Edge TTS (free, cloud-based)"),
        ("TTS>=0.22.0", "TTS", "Coqui TTS (open-source, local)"),
        ("soundfile>=0.12.1", "soundfile", "Audio file processing"),
        ("pyttsx3>=2.90", "pyttsx3", "System TTS fallback"),
        ("PyAudio>=0.2.11", "pyaudio", "Audio input/output (optional)"),
    ]
    
    installed = []
    failed = []
    
    for package, import_name, description in packages:
        print(f"\n📋 Checking {package} - {description}")
        
        if check_package(package.split('>=')[0], import_name):
            installed.append(package)
            continue
        
        print(f"📥 Installing {package}...")
        if run_command(f"pip install {package}", f"Installing {package}"):
            installed.append(package)
        else:
            failed.append(package)
    
    print(f"\n📊 Installation Summary:")
    print(f"✅ Successfully installed: {len(installed)}")
    print(f"❌ Failed to install: {len(failed)}")
    
    if installed:
        print("\n✅ Installed packages:")
        for pkg in installed:
            print(f"   • {pkg}")
    
    if failed:
        print("\n❌ Failed packages:")
        for pkg in failed:
            print(f"   • {pkg}")
        print("\n💡 Manual installation may be required for failed packages")
    
    return len(failed) == 0

def test_tts_engines():
    """Test TTS engine functionality."""
    print("\n🧪 Testing TTS Engines")
    print("=" * 30)
    
    # Test Edge TTS
    print("\n1. Testing Edge TTS...")
    try:
        import edge_tts
        print("✅ Edge TTS import successful")
        
        # Test basic functionality
        async def test_edge():
            try:
                voices = await edge_tts.list_voices()
                print(f"✅ Edge TTS: Found {len(voices)} voices")
                return True
            except Exception as e:
                print(f"❌ Edge TTS test failed: {e}")
                return False
        
        result = asyncio.run(test_edge())
        
    except ImportError as e:
        print(f"❌ Edge TTS not available: {e}")
    
    # Test Coqui TTS
    print("\n2. Testing Coqui TTS...")
    try:
        import TTS
        print("✅ Coqui TTS import successful")
        
        # Test basic functionality
        try:
            from TTS.api import TTS as CoquiTTS
            # This might fail if no models are available, but import works
            print("✅ Coqui TTS API accessible")
        except Exception as e:
            print(f"⚠️  Coqui TTS API warning: {e}")
            print("   (This is normal if no models are downloaded)")
        
    except ImportError as e:
        print(f"❌ Coqui TTS not available: {e}")
    
    # Test pyttsx3
    print("\n3. Testing pyttsx3...")
    try:
        import pyttsx3
        print("✅ pyttsx3 import successful")
        
        try:
            engine = pyttsx3.init()
            voices = engine.getProperty('voices')
            print(f"✅ pyttsx3: Found {len(voices) if voices else 0} system voices")
            engine.stop()
        except Exception as e:
            print(f"⚠️  pyttsx3 warning: {e}")
        
    except ImportError as e:
        print(f"❌ pyttsx3 not available: {e}")
    
    # Test system TTS commands
    print("\n4. Testing system TTS commands...")
    import platform
    system = platform.system()
    
    if system == "Darwin":  # macOS
        if run_command("which say", "Checking macOS 'say' command"):
            print("✅ macOS 'say' command available")
        else:
            print("❌ macOS 'say' command not found")
    
    elif system == "Linux":
        if run_command("which espeak", "Checking Linux 'espeak' command"):
            print("✅ Linux 'espeak' command available")
        else:
            print("⚠️  Linux 'espeak' command not found (optional)")
    
    elif system == "Windows":
        print("✅ Windows PowerShell TTS should be available")

def create_tts_config():
    """Create TTS configuration file."""
    print("\n⚙️  Creating TTS Configuration")
    print("=" * 35)
    
    config_content = """# TTS Configuration for PAM Backend
# Add these to your .env file

# TTS Engine Settings
TTS_ENABLED=true
TTS_PRIMARY_ENGINE=edge
TTS_FALLBACK_ENABLED=true
TTS_CACHE_ENABLED=true
TTS_CACHE_TTL=86400

# Voice Settings
TTS_VOICE_DEFAULT=en-US-AriaNeural
TTS_QUALITY_THRESHOLD=0.7
TTS_MAX_TEXT_LENGTH=5000
TTS_RATE_LIMIT=10

# Optional: Coqui TTS Model Path
# TTS_MODEL_PATH=path/to/your/model
"""
    
    config_file = Path("tts_config.env")
    try:
        with open(config_file, "w") as f:
            f.write(config_content)
        print(f"✅ TTS configuration saved to: {config_file}")
        print("💡 Add these settings to your .env file")
    except Exception as e:
        print(f"❌ Failed to create config file: {e}")

def main():
    """Main setup function."""
    print("🎙️  PAM TTS Setup Script")
    print("=" * 50)
    print("This script will install and configure TTS dependencies")
    print("for voice synthesis features in the PAM backend.\n")
    
    # Check Python version
    python_version = sys.version_info
    if python_version < (3, 8):
        print("❌ Python 3.8+ is required for TTS features")
        return
    
    print(f"✅ Python {python_version.major}.{python_version.minor} detected")
    
    # Install dependencies
    success = install_dependencies()
    
    # Test engines
    test_tts_engines()
    
    # Create config
    create_tts_config()
    
    print(f"\n🎯 Setup Complete!")
    print("=" * 20)
    
    if success:
        print("✅ All TTS dependencies installed successfully")
        print("💡 Next steps:")
        print("   1. Add TTS settings from tts_config.env to your .env file")
        print("   2. Restart your PAM backend")
        print("   3. Test voice features in the application")
    else:
        print("⚠️  Some dependencies failed to install")
        print("💡 TTS will fall back to system TTS commands")
        print("   1. Check error messages above")
        print("   2. Try manual installation: pip install edge-tts TTS soundfile pyttsx3")
        print("   3. Restart your PAM backend")
    
    print(f"\n📚 TTS Engine Priority Order:")
    print("   1. Edge TTS (free, cloud-based, high quality)")
    print("   2. Coqui TTS (open-source, local, privacy-focused)")
    print("   3. pyttsx3 (system TTS, always available)")
    print("   4. System commands (macOS 'say', Linux 'espeak', Windows PowerShell)")

if __name__ == "__main__":
    main()