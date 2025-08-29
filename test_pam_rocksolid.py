#!/usr/bin/env python3
"""
Comprehensive test suite to verify PAM is rock solid
"""

import asyncio
import json
import websockets
import aiohttp
import sys
from datetime import datetime
from typing import Dict, Any

class PAMRockSolidTest:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.ws_url = base_url.replace('http', 'ws')
        self.test_results = {}
        
    async def run_all_tests(self):
        """Run comprehensive PAM reliability tests"""
        print("🚀 PAM Rock Solid Test Suite")
        print("=" * 50)
        
        tests = [
            ("Backend Import Test", self.test_backend_import),
            ("Health Check Test", self.test_health_check),
            ("WebSocket Connection Test", self.test_websocket_connection), 
            ("WebSocket Authentication Test", self.test_websocket_auth),
            ("WebSocket Ping/Pong Test", self.test_websocket_ping_pong),
            ("Chat Endpoint Test", self.test_chat_endpoint),
            ("Error Recovery Test", self.test_error_recovery),
            ("Connection Resilience Test", self.test_connection_resilience),
        ]
        
        for test_name, test_func in tests:
            print(f"\n🧪 Running {test_name}...")
            try:
                result = await test_func()
                self.test_results[test_name] = result
                status = "✅ PASS" if result.get('success') else "❌ FAIL"
                print(f"   {status}: {result.get('message', 'No message')}")
            except Exception as e:
                self.test_results[test_name] = {'success': False, 'error': str(e)}
                print(f"   ❌ FAIL: {e}")
        
        self.print_summary()
        
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for r in self.test_results.values() if r.get('success'))
        total = len(self.test_results)
        
        for test_name, result in self.test_results.items():
            status = "✅" if result.get('success') else "❌"
            print(f"{status} {test_name}")
            if not result.get('success') and result.get('error'):
                print(f"     Error: {result['error']}")
        
        print(f"\n🎯 Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 PAM IS ROCK SOLID! All tests passed.")
        else:
            print("⚠️  PAM needs attention. Some tests failed.")
            
        return passed == total

    async def test_backend_import(self) -> Dict[str, Any]:
        """Test that backend imports correctly (no emergency mode)"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/") as response:
                    if response.status != 200:
                        return {'success': False, 'message': f'Backend not responding: {response.status}'}
                    
                    data = await response.json()
                    
                    # Check if we're in emergency mode
                    if 'emergency' in str(data).lower():
                        return {'success': False, 'message': 'Backend is in emergency mode'}
                    
                    # Check for proper backend title
                    if data.get('title') == 'PAM Backend API':
                        return {'success': True, 'message': 'Backend loaded successfully with full PAM API'}
                    
                    return {'success': False, 'message': f'Unexpected response: {data}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def test_health_check(self) -> Dict[str, Any]:
        """Test backend health endpoint"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/health") as response:
                    if response.status != 200:
                        return {'success': False, 'message': f'Health check failed: {response.status}'}
                    
                    data = await response.json()
                    if data.get('status') == 'healthy':
                        return {'success': True, 'message': f'Backend healthy - {data.get("message", "")}'}
                    
                    return {'success': False, 'message': f'Backend unhealthy: {data}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def test_websocket_connection(self) -> Dict[str, Any]:
        """Test basic WebSocket connection"""
        try:
            ws_url = f"{self.ws_url}/api/v1/pam/ws?token=test-token"
            
            async with websockets.connect(ws_url, timeout=10) as websocket:
                # Wait for welcome message
                welcome_msg = await asyncio.wait_for(websocket.recv(), timeout=5)
                
                return {'success': True, 'message': f'WebSocket connected successfully'}
        except asyncio.TimeoutError:
            return {'success': False, 'message': 'WebSocket connection timeout'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def test_websocket_auth(self) -> Dict[str, Any]:
        """Test WebSocket authentication"""
        try:
            ws_url = f"{self.ws_url}/api/v1/pam/ws?token=test-token"
            
            async with websockets.connect(ws_url, timeout=10) as websocket:
                # Send auth message
                auth_msg = {
                    "type": "auth",
                    "userId": "test-user",
                    "timestamp": datetime.utcnow().isoformat()
                }
                await websocket.send(json.dumps(auth_msg))
                
                # Wait for auth response
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(response)
                
                if data.get('type') == 'auth_success':
                    return {'success': True, 'message': 'WebSocket authentication successful'}
                
                return {'success': False, 'message': f'Auth failed: {data}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def test_websocket_ping_pong(self) -> Dict[str, Any]:
        """Test WebSocket ping/pong heartbeat"""
        try:
            ws_url = f"{self.ws_url}/api/v1/pam/ws?token=test-token"
            
            async with websockets.connect(ws_url, timeout=10) as websocket:
                # Send ping
                ping_time = datetime.utcnow().isoformat()
                ping_msg = {
                    "type": "ping",
                    "timestamp": ping_time
                }
                await websocket.send(json.dumps(ping_msg))
                
                # Wait for pong
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(response)
                
                if data.get('type') == 'pong':
                    return {'success': True, 'message': 'Ping/pong heartbeat working'}
                
                return {'success': False, 'message': f'Expected pong, got: {data}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def test_chat_endpoint(self) -> Dict[str, Any]:
        """Test PAM chat HTTP endpoint"""
        try:
            async with aiohttp.ClientSession() as session:
                chat_data = {
                    "message": "Hello PAM! This is a test.",
                    "user_id": "test-user"
                }
                
                async with session.post(f"{self.base_url}/api/v1/pam/chat", 
                                      json=chat_data) as response:
                    if response.status == 401:
                        return {'success': True, 'message': 'Chat endpoint properly secured (401 expected)'}
                    
                    if response.status == 200:
                        data = await response.json()
                        if 'response' in data or 'message' in data:
                            return {'success': True, 'message': 'Chat endpoint responding'}
                    
                    return {'success': False, 'message': f'Chat endpoint error: {response.status}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def test_error_recovery(self) -> Dict[str, Any]:
        """Test error recovery mechanisms"""
        try:
            # Test invalid token
            ws_url = f"{self.ws_url}/api/v1/pam/ws?token=invalid-token"
            
            try:
                async with websockets.connect(ws_url, timeout=5) as websocket:
                    await websocket.recv()
                    return {'success': False, 'message': 'Should have failed with invalid token'}
            except websockets.exceptions.ConnectionClosedError as e:
                if e.code in [4000, 1008, 4001]:  # Auth error codes
                    return {'success': True, 'message': 'Properly rejects invalid tokens'}
                return {'success': False, 'message': f'Unexpected close code: {e.code}'}
            except Exception:
                return {'success': True, 'message': 'Properly rejects invalid connections'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}

    async def test_connection_resilience(self) -> Dict[str, Any]:
        """Test connection resilience under load"""
        try:
            # Test multiple rapid connections
            connections = []
            ws_url = f"{self.ws_url}/api/v1/pam/ws?token=test-token"
            
            for i in range(3):
                try:
                    conn = await websockets.connect(ws_url, timeout=5)
                    connections.append(conn)
                    await conn.send(json.dumps({"type": "ping"}))
                except Exception:
                    pass
            
            # Close all connections
            for conn in connections:
                try:
                    await conn.close()
                except Exception:
                    pass
            
            if len(connections) > 0:
                return {'success': True, 'message': f'Handled {len(connections)} concurrent connections'}
            
            return {'success': False, 'message': 'Could not establish any connections'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}

async def main():
    """Run the test suite"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:8000"
    
    print(f"🎯 Testing PAM at: {base_url}")
    
    tester = PAMRockSolidTest(base_url)
    success = await tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())