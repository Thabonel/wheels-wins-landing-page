#!/usr/bin/env python3
"""
Test authentication scenarios that the frontend might be using
"""
import asyncio
import websockets
import json
import sys

async def test_frontend_auth_scenarios():
    """Test various authentication scenarios the frontend might use"""
    
    # Test scenarios that might match the frontend
    test_scenarios = [
        {
            "name": "Anonymous Connection",
            "token": "anonymous"
        },
        {
            "name": "Demo Token",
            "token": "demo-token"
        },
        {
            "name": "Test Connection",
            "token": "test-connection"
        },
        {
            "name": "No Token",
            "token": ""
        },
        {
            "name": "JWT-like Token",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXIifQ.test"
        }
    ]
    
    for scenario in test_scenarios:
        print(f"\n🧪 Testing: {scenario['name']}")
        print("-" * 30)
        
        # Build WebSocket URL
        ws_url = f"wss://pam-backend.onrender.com/api/v1/pam/ws?token={scenario['token']}"
        
        try:
            async with websockets.connect(ws_url) as websocket:
                print("✅ Connected successfully!")
                
                # Wait for welcome message
                welcome_msg = await websocket.recv()
                print(f"📨 Welcome: {welcome_msg}")
                
                # Send a simple chat message
                test_message = {
                    "type": "chat",
                    "content": "Hello PAM",
                    "context": {"user_id": "test_user"}
                }
                
                await websocket.send(json.dumps(test_message))
                
                # Wait for response
                response = await websocket.recv()
                response_data = json.loads(response)
                
                message_content = response_data.get('message', '')
                
                if "I'm processing your request" in message_content:
                    print("❌ Generic fallback response")
                elif "error" in message_content.lower():
                    print(f"⚠️ Error response: {message_content}")
                else:
                    print(f"✅ Intelligent response: {message_content[:100]}...")
                    
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            
    print("\n" + "=" * 50)

if __name__ == "__main__":
    print("🧪 Testing Frontend Authentication Scenarios")
    print("=" * 50)
    
    asyncio.run(test_frontend_auth_scenarios())