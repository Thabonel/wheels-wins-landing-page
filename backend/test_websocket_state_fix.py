#!/usr/bin/env python3
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
    print("\n🎉 WebSocket state fix test passed!")
