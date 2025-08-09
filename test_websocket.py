#!/usr/bin/env python3
"""Test WebSocket connection to PAM backend"""

import asyncio
import json
import websockets
from datetime import datetime

async def test_websocket():
    """Test WebSocket connection to PAM backend"""
    
    # Use a test token - in production this would be a real JWT
    token = "test-token"
    ws_url = f"ws://localhost:8000/api/v1/pam/ws?token={token}"
    
    print(f"🔌 Connecting to: {ws_url}")
    
    try:
        async with websockets.connect(ws_url) as websocket:
            print("✅ Connected successfully!")
            
            # Test ping/pong
            ping_msg = json.dumps({"type": "ping", "timestamp": datetime.utcnow().isoformat()})
            print(f"🏓 Sending ping: {ping_msg}")
            await websocket.send(ping_msg)
            
            response = await websocket.recv()
            print(f"📨 Received: {response}")
            
            # Test auth message
            auth_msg = json.dumps({
                "type": "auth",
                "userId": "test-user",
                "timestamp": datetime.utcnow().isoformat()
            })
            print(f"🔐 Sending auth: {auth_msg}")
            await websocket.send(auth_msg)
            
            response = await websocket.recv()
            print(f"📨 Received: {response}")
            
            # Test chat message
            chat_msg = json.dumps({
                "type": "chat",
                "message": "Hello PAM! This is a test message.",
                "timestamp": datetime.utcnow().isoformat()
            })
            print(f"💬 Sending chat: {chat_msg}")
            await websocket.send(chat_msg)
            
            response = await websocket.recv()
            print(f"📨 Received: {response}")
            
            print("✅ All tests passed!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        print(f"   Type: {type(e).__name__}")

if __name__ == "__main__":
    print("🧪 PAM WebSocket Connection Test")
    print("=" * 50)
    asyncio.run(test_websocket())