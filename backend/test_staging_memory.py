#!/usr/bin/env python3
"""
Test script to verify staging memory optimization works
"""
import os
import sys
import psutil
import subprocess

# Set staging environment
os.environ["ENVIRONMENT"] = "staging"

print("🧪 Testing Staging Memory Optimization")
print("=" * 50)

# Get initial memory
process = psutil.Process()
initial_memory = process.memory_info().rss / 1024 / 1024  # MB

print(f"Initial memory usage: {initial_memory:.2f} MB")

try:
    # Try importing the main app
    print("\n📦 Attempting to import FastAPI app...")
    from app.main import app
    print("✅ Successfully imported app!")
    
    # Check memory after import
    after_import_memory = process.memory_info().rss / 1024 / 1024
    print(f"Memory after import: {after_import_memory:.2f} MB")
    print(f"Memory increase: {after_import_memory - initial_memory:.2f} MB")
    
    # Check if heavy modules were blocked
    print("\n🔍 Checking if heavy modules were blocked:")
    
    # Check sentence_transformers
    try:
        import sentence_transformers
        if hasattr(sentence_transformers, 'SentenceTransformer'):
            st = sentence_transformers.SentenceTransformer
            print(f"  - sentence_transformers: {'MOCKED' if 'Mock' in str(st) else 'LOADED (BAD!)'}")
        else:
            print("  - sentence_transformers: Module exists but no SentenceTransformer")
    except ImportError:
        print("  - sentence_transformers: Not imported (GOOD)")
    
    # Check chromadb
    try:
        import chromadb
        if hasattr(chromadb, 'Client'):
            client = chromadb.Client
            print(f"  - chromadb: {'MOCKED' if 'Mock' in str(client) else 'LOADED (BAD!)'}")
        else:
            print("  - chromadb: Module exists but no Client")
    except ImportError:
        print("  - chromadb: Not imported (GOOD)")
    
    # Final memory check
    final_memory = process.memory_info().rss / 1024 / 1024
    print(f"\n📊 Final memory usage: {final_memory:.2f} MB")
    
    if final_memory < 512:
        print("✅ SUCCESS: Memory usage is under 512MB limit!")
    else:
        print(f"⚠️  WARNING: Memory usage ({final_memory:.2f} MB) exceeds 512MB")
        print("   But this might work if some memory is freed during runtime")
    
except Exception as e:
    print(f"❌ Failed to import app: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 50)
print("🏁 Test complete!")

# Try to start the server briefly
print("\n🚀 Attempting to start server (5 second test)...")
try:
    cmd = ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
    proc = subprocess.Popen(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
    
    import time
    time.sleep(5)
    
    if proc.poll() is None:
        print("✅ Server started successfully!")
        proc.terminate()
    else:
        print("❌ Server failed to start")
        
except Exception as e:
    print(f"❌ Could not test server: {e}")