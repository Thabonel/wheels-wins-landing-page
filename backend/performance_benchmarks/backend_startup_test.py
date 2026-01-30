#!/usr/bin/env python3
"""
Backend Startup Performance Test
================================

Tests the actual backend startup time and basic functionality.
Validates backend health and dependency loading.
"""

import asyncio
import time
import subprocess
import requests
import json
import os
import sys
from datetime import datetime

def test_backend_startup():
    """Test backend startup performance"""
    print("🚀 Testing Backend Startup Performance")
    print("=" * 50)

    backend_dir = "/Users/thabonel/Code/wheels-wins-landing-page/backend"
    os.chdir(backend_dir)

    startup_start = time.time()

    try:
        # Start backend with timeout
        print("Starting backend server...")
        process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8000"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # Wait for startup with timeout
        max_wait = 30  # 30 seconds max
        waited = 0

        while waited < max_wait:
            time.sleep(1)
            waited += 1

            try:
                response = requests.get("http://localhost:8000/health", timeout=5)
                if response.status_code == 200:
                    startup_time = time.time() - startup_start
                    print(f"✅ Backend started in {startup_time:.1f} seconds")

                    # Test basic endpoints
                    test_endpoints(startup_time)
                    break

            except requests.exceptions.RequestException:
                continue
        else:
            print(f"❌ Backend failed to start within {max_wait} seconds")

    except Exception as e:
        print(f"❌ Backend startup failed: {e}")

    finally:
        # Kill process
        try:
            process.terminate()
            process.wait(timeout=5)
        except:
            process.kill()

def test_endpoints(startup_time):
    """Test basic endpoint performance"""
    endpoints = [
        "/health",
        "/",
        "/api/v1/health"
    ]

    print("\n📊 Endpoint Performance:")

    for endpoint in endpoints:
        try:
            start = time.time()
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=10)
            response_time = (time.time() - start) * 1000

            status = "✅" if response.status_code == 200 else "❌"
            print(f"  {status} {endpoint}: {response_time:.1f}ms (status: {response.status_code})")

        except Exception as e:
            print(f"  ❌ {endpoint}: Failed - {e}")

    # Performance summary
    print(f"\n🎯 Performance Summary:")
    print(f"  • Backend startup: {startup_time:.1f}s")
    print(f"  • Target: <30s (✅ {'PASS' if startup_time < 30 else 'FAIL'})")

if __name__ == "__main__":
    test_backend_startup()