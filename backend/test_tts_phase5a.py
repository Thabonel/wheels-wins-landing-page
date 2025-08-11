#!/usr/bin/env python3
"""
Phase 5A: TTS Integration Test Script
Tests the complete TTS backend functionality
"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app.services.tts.manager import get_tts_manager, test_tts_manager
from app.services.tts.engines.edge_tts import test_edge_tts
from app.services.tts.engines.system_tts import test_system_tts

async def test_phase5a_tts():
    """Test Phase 5A TTS implementation"""
    print("🧪 Phase 5A TTS Integration Test")
    print("=" * 50)
    
    # Test 1: Individual TTS engines
    print("\n1. Testing Edge TTS Engine...")
    edge_result = await test_edge_tts()
    print(f"   Edge TTS: {'✅ PASS' if edge_result else '❌ FAIL'}")
    
    print("\n2. Testing System TTS Engine...")
    system_result = await test_system_tts()
    print(f"   System TTS: {'✅ PASS' if system_result else '❌ FAIL'}")
    
    # Test 2: TTS Manager with fallback chain
    print("\n3. Testing TTS Manager...")
    manager_result = await test_tts_manager()
    print(f"   TTS Manager: {'✅ PASS' if manager_result else '❌ FAIL'}")
    
    # Test 3: TTS Manager status and health
    print("\n4. Testing TTS Manager Status...")
    try:
        manager = get_tts_manager()
        status = manager.get_engine_status()
        health = manager.health_check()
        
        print(f"   Available Engines: {status['available_engines']}/{status['total_engines']}")
        print(f"   System Health: {'✅ HEALTHY' if health else '❌ UNHEALTHY'}")
        
        # Show engine details
        for engine_name, engine_info in status['engines'].items():
            status_icon = '✅' if engine_info['available'] and engine_info['healthy'] else '❌'
            print(f"   {status_icon} {engine_name}: Available={engine_info['available']}, Healthy={engine_info['healthy']}")
            
        print(f"   Manager Status: ✅ PASS")
        status_result = True
        
    except Exception as e:
        print(f"   Manager Status: ❌ FAIL - {e}")
        status_result = False
    
    # Test 4: Voice listing
    print("\n5. Testing Voice Listing...")
    try:
        manager = get_tts_manager()
        voices = manager.get_available_voices()
        
        print(f"   Total Voices: {len(voices)}")
        engines_with_voices = set()
        for voice in voices:
            engines_with_voices.add(voice.get('engine', 'Unknown'))
            
        print(f"   Engines with Voices: {', '.join(engines_with_voices)}")
        
        # Show sample voices
        for voice in voices[:3]:  # Show first 3 voices
            print(f"   - {voice.get('name', 'Unknown')} ({voice.get('language', 'N/A')}) via {voice.get('engine', 'Unknown')}")
            
        print(f"   Voice Listing: ✅ PASS")
        voices_result = True
        
    except Exception as e:
        print(f"   Voice Listing: ❌ FAIL - {e}")
        voices_result = False
    
    # Final Result
    all_tests = [edge_result, system_result, manager_result, status_result, voices_result]
    passed = sum(all_tests)
    total = len(all_tests)
    
    print(f"\n🏆 Phase 5A Test Results")
    print("=" * 50)
    print(f"   Passed: {passed}/{total} tests")
    
    if passed == total:
        print("   🎉 All tests PASSED! Phase 5A TTS integration is working correctly.")
        return True
    else:
        print(f"   ⚠️ {total - passed} test(s) FAILED. Please check the issues above.")
        return False

if __name__ == "__main__":
    try:
        result = asyncio.run(test_phase5a_tts())
        sys.exit(0 if result else 1)
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        sys.exit(1)