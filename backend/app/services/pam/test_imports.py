"""
Test file to verify PAM imports are working
"""

try:
    from orchestrator import get_orchestrator
    print("✅ Orchestrator import: SUCCESS")
except Exception as e:
    print(f"❌ Orchestrator import failed: {e}")

try:
    from nodes.wins_node import wins_node
    print("✅ WINS node import: SUCCESS")
except Exception as e:
    print(f"❌ WINS node import failed: {e}")

try:
    from intelligent_conversation import IntelligentConversationService
    print("✅ AI conversation service import: SUCCESS")
except Exception as e:
    print(f"❌ AI conversation service import failed: {e}")

print("\n🎉 Import test complete!")
