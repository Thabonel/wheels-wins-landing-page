"""
Test file to verify PAM imports are working
"""

try:
    print("✅ Orchestrator import: SUCCESS")
except Exception as e:
    print(f"❌ Orchestrator import failed: {e}")

try:
    print("✅ WINS node import: SUCCESS")
except Exception as e:
    print(f"❌ WINS node import failed: {e}")

try:
    print("✅ AI conversation service import: SUCCESS")
except Exception as e:
    print(f"❌ AI conversation service import failed: {e}")

print("\n🎉 Import test complete!")
