#!/usr/bin/env python3
"""
Test WebSocket connection to PAM endpoint
"""
import asyncio
import websockets
import json
import sys

async def test_pam_websocket():
    """Test the PAM WebSocket endpoint"""
    
    # WebSocket URL - same as frontend uses
    ws_url = "wss://pam-backend.onrender.com/api/v1/pam/ws?token=test_user"
    
    print(f"🔗 Connecting to: {ws_url}")
    
    try:
        async with websockets.connect(ws_url) as websocket:
            print("✅ WebSocket connected successfully!")
            
            # Wait for welcome message
            welcome_msg = await websocket.recv()
            print(f"📨 Welcome message: {welcome_msg}")
            
            # Send a chat message
            test_message = {
                "type": "chat",
                "content": "Hello PAM! Can you plan a trip from Sydney to Melbourne?",
                "context": {"user_id": "test_user"}
            }
            
            print(f"📤 Sending message: {test_message}")
            await websocket.send(json.dumps(test_message))
            
            # Wait for response
            response = await websocket.recv()
            print(f"📥 Response: {response}")
            
            # Parse and display the response nicely
            try:
                response_data = json.loads(response)
                if response_data.get("type") == "chat_response":
                    print(f"\n🤖 PAM Response: {response_data.get('message', 'No message')}")
                    print(f"📝 Response Type: {response_data.get('type')}")
                    print(f"⏰ Timestamp: {response_data.get('timestamp')}")
                    
                    # Check if it's an intelligent response or generic fallback
                    message_content = response_data.get('message', '')
                    if "I'm processing your request" in message_content:
                        print("❌ Still getting generic fallback response")
                    else:
                        print("✅ Getting intelligent response from SimplePamService!")
                        
                else:
                    print(f"🔄 Other message type: {response_data.get('type')}")
            except json.JSONDecodeError:
                print("⚠️ Response is not valid JSON")
            
            # Test another message
            test_message2 = {
                "type": "chat", 
                "content": "I spent $50 on fuel",
                "context": {"user_id": "test_user"}
            }
            
            print(f"\n📤 Sending second message: {test_message2}")
            await websocket.send(json.dumps(test_message2))
            
            response2 = await websocket.recv()
            print(f"📥 Second response: {response2}")
            
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🧪 Testing PAM WebSocket Endpoint")
    print("=" * 50)
    
    success = asyncio.run(test_pam_websocket())
    
    if success:
        print("\n✅ WebSocket test completed successfully!")
    else:
        print("\n❌ WebSocket test failed!")
        sys.exit(1)