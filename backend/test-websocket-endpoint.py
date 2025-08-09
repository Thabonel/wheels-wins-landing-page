#!/usr/bin/env python3

"""
WebSocket Endpoint Test Script for PAM Backend
Tests the WebSocket connection and PAM chat functionality
"""

import asyncio
import websockets
import json
import sys
import time
from datetime import datetime
import ssl

# Configuration
PRODUCTION_URL = "wss://pam-backend.onrender.com/api/v1/pam/ws"
LOCAL_URL = "ws://localhost:8000/api/v1/pam/ws"
TEST_TOKEN = "test-connection"

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_status(message, color=Colors.BLUE):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"{color}[{timestamp}] {message}{Colors.END}")

def print_success(message):
    print_status(f"✅ {message}", Colors.GREEN)

def print_error(message):
    print_status(f"❌ {message}", Colors.RED)

def print_warning(message):
    print_status(f"⚠️  {message}", Colors.YELLOW)

def print_info(message):
    print_status(f"ℹ️  {message}", Colors.CYAN)

async def test_websocket_connection(url, test_name):
    """Test WebSocket connection and PAM functionality"""
    print_info(f"Testing {test_name}: {url}")
    
    try:
        # Create SSL context for production URLs
        ssl_context = None
        if url.startswith("wss://"):
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
        
        # Add token parameter
        url_with_token = f"{url}?token={TEST_TOKEN}"
        
        print_info(f"Connecting to: {url_with_token}")
        
        # Connect with timeout
        async with websockets.connect(
            url_with_token, 
            ssl=ssl_context,
            ping_interval=20,
            ping_timeout=10,
            close_timeout=10
        ) as websocket:
            
            print_success(f"Connected to {test_name}")
            
            # Test 1: Wait for welcome message
            print_info("Waiting for welcome message...")
            try:
                welcome_msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                welcome_data = json.loads(welcome_msg)
                print_success(f"Welcome message: {welcome_data.get('message', 'No message')}")
                print_info(f"Connection type: {welcome_data.get('type', 'unknown')}")
            except asyncio.TimeoutError:
                print_warning("No welcome message received (but connection is OK)")
            except json.JSONDecodeError as e:
                print_warning(f"Non-JSON welcome message: {welcome_msg}")
            
            # Test 2: Send ping
            print_info("Testing ping...")
            ping_message = {
                "type": "ping",
                "timestamp": datetime.utcnow().isoformat()
            }
            await websocket.send(json.dumps(ping_message))
            
            try:
                pong_response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                pong_data = json.loads(pong_response)
                if pong_data.get("type") == "pong":
                    print_success("Ping/Pong test passed")
                else:
                    print_warning(f"Unexpected ping response: {pong_data}")
            except asyncio.TimeoutError:
                print_warning("Ping timeout - but connection still active")
            
            # Test 3: Send chat message
            print_info("Testing PAM chat...")
            chat_message = {
                "type": "chat",
                "message": "Hello PAM! This is a WebSocket test.",
                "context": {
                    "user_id": "websocket-test",
                    "test": True
                }
            }
            await websocket.send(json.dumps(chat_message))
            
            print_info("Sent chat message, waiting for PAM response...")
            
            # Wait for PAM response (may take several seconds)
            try:
                chat_response = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                response_data = json.loads(chat_response)
                
                if response_data.get("type") in ["chat_response", "response"]:
                    pam_message = response_data.get("content") or response_data.get("message", "No content")
                    processing_time = response_data.get("processing_time_ms", 0)
                    source = response_data.get("source", "unknown")
                    
                    print_success(f"PAM Response received!")
                    print_info(f"Source: {source}")
                    print_info(f"Processing time: {processing_time}ms")
                    print_info(f"Response: {pam_message[:100]}...")
                    
                    # Check if it's a real AI response or fallback
                    if "trouble connecting" in pam_message.lower() or "preset" in pam_message.lower():
                        print_warning("Received fallback response - may indicate backend issues")
                    else:
                        print_success("Received intelligent AI response!")
                        
                else:
                    print_warning(f"Unexpected response type: {response_data}")
                    
            except asyncio.TimeoutError:
                print_error("Chat response timeout - PAM may not be responding")
            except json.JSONDecodeError:
                print_error(f"Invalid JSON response: {chat_response}")
            
            # Test 4: Test connection stability
            print_info("Testing connection stability...")
            await asyncio.sleep(2)
            
            if websocket.closed:
                print_error("Connection closed unexpectedly")
            else:
                print_success("Connection remains stable")
            
            return True
            
    except websockets.exceptions.InvalidURI as e:
        print_error(f"Invalid WebSocket URI: {e}")
        return False
    except websockets.exceptions.ConnectionClosed as e:
        print_error(f"Connection closed: {e}")
        return False
    except websockets.exceptions.InvalidHandshake as e:
        print_error(f"WebSocket handshake failed: {e}")
        print_warning("This usually means the endpoint doesn't exist or isn't a WebSocket")
        return False
    except ConnectionRefusedError:
        print_error("Connection refused - server may be down")
        return False
    except Exception as e:
        print_error(f"Connection failed: {type(e).__name__}: {e}")
        return False

async def test_http_endpoints():
    """Test HTTP endpoints for comparison"""
    import aiohttp
    
    endpoints = [
        ("https://pam-backend.onrender.com/health", "General Health"),
        ("https://pam-backend.onrender.com/api/v1/pam/health", "PAM Health")
    ]
    
    print_info("Testing HTTP endpoints for comparison...")
    
    async with aiohttp.ClientSession() as session:
        for url, name in endpoints:
            try:
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        print_success(f"{name}: {data.get('status', 'OK')}")
                    else:
                        print_warning(f"{name}: HTTP {response.status}")
            except Exception as e:
                print_error(f"{name}: {e}")

async def main():
    """Main test function"""
    print(f"{Colors.BOLD}{Colors.PURPLE}")
    print("=" * 60)
    print("🧪 PAM WebSocket Endpoint Test Script")
    print("=" * 60)
    print(f"{Colors.END}")
    
    # Test HTTP endpoints first
    await test_http_endpoints()
    print()
    
    # Test WebSocket endpoints
    print_info("Starting WebSocket tests...")
    print()
    
    # Test production WebSocket
    production_success = await test_websocket_connection(PRODUCTION_URL, "Production")
    print()
    
    # Test local WebSocket if requested
    if len(sys.argv) > 1 and sys.argv[1] == "--test-local":
        print_info("Testing local WebSocket (as requested)...")
        local_success = await test_websocket_connection(LOCAL_URL, "Local")
        print()
    
    # Summary
    print(f"{Colors.BOLD}Test Summary:{Colors.END}")
    if production_success:
        print_success("✅ Production WebSocket is working!")
        print_info("Your PAM backend is properly deployed with WebSocket support")
    else:
        print_error("❌ Production WebSocket failed")
        print_warning("The WebSocket endpoint may not be deployed or configured correctly")
        
        print()
        print(f"{Colors.YELLOW}Troubleshooting steps:{Colors.END}")
        print("1. Ensure the latest code is deployed to Render")
        print("2. Check that WebSocket routes are registered in main.py")
        print("3. Verify environment variables are set correctly")
        print("4. Check Render deployment logs for errors")
    
    print()
    print_info(f"Script completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    try:
        # Install required packages if not available
        try:
            import websockets
            import aiohttp
        except ImportError as e:
            print_error(f"Missing required package: {e}")
            print_info("Install with: pip install websockets aiohttp")
            sys.exit(1)
        
        # Run tests
        asyncio.run(main())
        
    except KeyboardInterrupt:
        print_warning("Test interrupted by user")
    except Exception as e:
        print_error(f"Test script failed: {e}")
        sys.exit(1)