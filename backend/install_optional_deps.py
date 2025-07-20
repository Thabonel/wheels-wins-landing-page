#!/usr/bin/env python3
"""
Optional Dependencies Installer
Installs packages that are nice-to-have but not required for basic functionality
"""

import sys
import subprocess
import importlib
from typing import List, Tuple


def is_package_installed(package_name: str) -> bool:
    """Check if a package is already installed"""
    try:
        importlib.import_module(package_name)
        return True
    except ImportError:
        return False


def install_package_safe(package: str) -> Tuple[bool, str]:
    """Try to install a package, return success status and message"""
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'install', package],
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes max
        )
        
        if result.returncode == 0:
            return True, f"✅ Successfully installed {package}"
        else:
            return False, f"❌ Failed to install {package}: {result.stderr}"
            
    except subprocess.TimeoutExpired:
        return False, f"⏰ Timeout installing {package}"
    except Exception as e:
        return False, f"❌ Error installing {package}: {e}"


def main():
    """Install optional dependencies with graceful fallbacks"""
    
    print("🔧 Installing optional dependencies for PAM Backend...")
    print("📝 Note: These are optional - the system will work without them\n")
    
    # List of optional packages with fallback info
    optional_packages = [
        ("textstat", "textstat", "Text statistics for knowledge analysis"),
        ("edge-tts", "edge_tts", "Microsoft Edge TTS for voice synthesis"),
        ("pydub", "pydub", "Audio processing utilities"),
        ("requests", "requests", "HTTP client for API calls"),
        ("aiofiles", "aiofiles", "Async file operations"),
    ]
    
    results = []
    
    for pip_name, import_name, description in optional_packages:
        print(f"🔍 Checking {pip_name}...")
        
        if is_package_installed(import_name):
            print(f"✅ {pip_name} already installed")
            results.append((pip_name, True, "Already installed"))
        else:
            print(f"📦 Installing {pip_name}...")
            success, message = install_package_safe(pip_name)
            results.append((pip_name, success, message))
            print(f"   {message}")
        
        print()
    
    # Summary
    print("📊 Installation Summary:")
    print("=" * 50)
    
    successful = 0
    for package, success, message in results:
        status = "✅ INSTALLED" if success else "⚠️  SKIPPED"
        print(f"{status:12} {package:15} - {message}")
        if success:
            successful += 1
    
    print(f"\n🎯 {successful}/{len(results)} optional packages installed")
    
    if successful < len(results):
        print("\n💡 Missing packages will use fallback implementations:")
        print("   - TTS: System TTS (macOS 'say', Linux 'espeak') or text-only")
        print("   - Analysis: Basic text processing without advanced stats")
        print("   - Audio: Simple format handling")
        print("\n✅ PAM Backend will work normally with reduced features")
    else:
        print("\n🎉 All optional dependencies installed successfully!")
        print("✅ PAM Backend has full feature support")


if __name__ == "__main__":
    main()