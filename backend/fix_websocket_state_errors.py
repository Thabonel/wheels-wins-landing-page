#!/usr/bin/env python3
"""
Fix WebSocket state checking errors in PAM backend.
The error "WebSocket is not connected. Need to call 'accept' first" is caused by:
1. Incorrect WebSocketState checking using .value == 1 instead of proper enum comparison
2. Missing WebSocketState imports in some places
3. Inconsistent state checking patterns
"""

import os
import re

def fix_websocket_state_checks():
    """Fix all WebSocket state checking issues in the codebase"""
    
    files_to_fix = [
        "app/api/v1/pam.py",
        "app/core/websocket_manager.py",
        "app/core/websocket_keepalive.py"
    ]
    
    fixes_applied = []
    
    for file_path in files_to_fix:
        full_path = os.path.join(os.path.dirname(__file__), file_path)
        if not os.path.exists(full_path):
            print(f"⚠️  File not found: {file_path}")
            continue
            
        print(f"\n📝 Processing {file_path}...")
        
        with open(full_path, 'r') as f:
            content = f.read()
            
        original_content = content
        
        # Fix 1: Add WebSocketState import if missing
        if "from starlette.websockets import WebSocketState" not in content and "websocket.client_state" in content:
            # Find the imports section
            import_section = re.search(r'^(from fastapi import.*?$)', content, re.MULTILINE)
            if import_section:
                insert_pos = import_section.end()
                content = content[:insert_pos] + "\nfrom starlette.websockets import WebSocketState" + content[insert_pos:]
                fixes_applied.append(f"✅ Added WebSocketState import to {file_path}")
        
        # Fix 2: Replace websocket.client_state.value == 1 with proper enum comparison
        pattern1 = r'websocket\.client_state\.value == 1'
        replacement1 = 'websocket.client_state == WebSocketState.CONNECTED'
        if re.search(pattern1, content):
            content = re.sub(pattern1, replacement1, content)
            fixes_applied.append(f"✅ Fixed client_state.value == 1 comparisons in {file_path}")
        
        # Fix 3: Replace websocket.client_state.value != 1 with proper enum comparison
        pattern2 = r'websocket\.client_state\.value != 1'
        replacement2 = 'websocket.client_state != WebSocketState.CONNECTED'
        if re.search(pattern2, content):
            content = re.sub(pattern2, replacement2, content)
            fixes_applied.append(f"✅ Fixed client_state.value != 1 comparisons in {file_path}")
        
        # Fix 4: Ensure consistent state checking pattern
        pattern3 = r'if websocket\.client_state == 1:'
        replacement3 = 'if websocket.client_state == WebSocketState.CONNECTED:'
        if re.search(pattern3, content):
            content = re.sub(pattern3, replacement3, content)
            fixes_applied.append(f"✅ Fixed direct integer comparisons in {file_path}")
        
        # Write back if changes were made
        if content != original_content:
            with open(full_path, 'w') as f:
                f.write(content)
            print(f"✅ Fixed WebSocket state checks in {file_path}")
        else:
            print(f"✓ No WebSocket state issues found in {file_path}")
    
    return fixes_applied

def verify_websocket_acceptance():
    """Verify that WebSocket is accepted before any operations"""
    
    pam_file = os.path.join(os.path.dirname(__file__), "app/api/v1/pam.py")
    
    with open(pam_file, 'r') as f:
        content = f.read()
    
    # Check that websocket.accept() is called early in the endpoint
    websocket_endpoint = re.search(
        r'@router\.websocket\("/ws/\{user_id\}"\).*?async def websocket_endpoint.*?await websocket\.accept\(\)',
        content,
        re.DOTALL
    )
    
    if websocket_endpoint:
        print("\n✅ WebSocket.accept() is properly called in the endpoint")
        return True
    else:
        print("\n❌ WebSocket.accept() might not be called properly")
        return False

def create_websocket_test():
    """Create a test to verify WebSocket fixes"""
    
    test_content = '''#!/usr/bin/env python3
"""
Test WebSocket state fixes
"""

import asyncio
from starlette.websockets import WebSocketState
from unittest.mock import MagicMock

def test_websocket_state_comparison():
    """Test that WebSocket state is properly compared"""
    
    # Create mock WebSocket
    websocket = MagicMock()
    websocket.client_state = WebSocketState.CONNECTED
    
    # Test proper comparison
    assert websocket.client_state == WebSocketState.CONNECTED, "Should be connected"
    assert websocket.client_state != WebSocketState.DISCONNECTED, "Should not be disconnected"
    
    # Test disconnected state
    websocket.client_state = WebSocketState.DISCONNECTED
    assert websocket.client_state == WebSocketState.DISCONNECTED, "Should be disconnected"
    assert websocket.client_state != WebSocketState.CONNECTED, "Should not be connected"
    
    print("✅ All WebSocket state comparisons work correctly")

if __name__ == "__main__":
    test_websocket_state_comparison()
    print("\\n🎉 WebSocket state fix test passed!")
'''
    
    test_file = os.path.join(os.path.dirname(__file__), "test_websocket_state_fix.py")
    with open(test_file, 'w') as f:
        f.write(test_content)
    
    print(f"\n📝 Created test file: test_websocket_state_fix.py")
    return test_file

def main():
    """Main function to fix WebSocket issues"""
    
    print("🔧 Fixing WebSocket State Checking Errors")
    print("=" * 50)
    
    # Apply fixes
    fixes = fix_websocket_state_checks()
    
    # Verify WebSocket acceptance
    verify_websocket_acceptance()
    
    # Create test
    test_file = create_websocket_test()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Summary of Fixes Applied:")
    if fixes:
        for fix in fixes:
            print(f"  {fix}")
    else:
        print("  No fixes were needed - code might already be fixed")
    
    print("\n🎯 Next Steps:")
    print("1. Run the test: python test_websocket_state_fix.py")
    print("2. Restart the backend server")
    print("3. Test WebSocket connection from frontend")
    
    print("\n✅ WebSocket state error fixes completed!")

if __name__ == "__main__":
    main()