#!/usr/bin/env python3

"""
Production PAM Systems Status Checker
Tests all PAM endpoints in production to verify which systems are working
"""

import asyncio
import aiohttp
import websockets
import json
import ssl
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
import sys

# Production URLs
PRODUCTION_BASE = "https://pam-backend.onrender.com"
WEBSOCKET_BASE = "wss://pam-backend.onrender.com"

# Test endpoints
ENDPOINTS = {
    'SimplePamService': f"{PRODUCTION_BASE}/api/v1/pam/chat",
    'ActionPlanner': f"{PRODUCTION_BASE}/api/v1/orchestrator/chat", 
    'WebSocket': f"{WEBSOCKET_BASE}/api/v1/pam/ws",
    'Voice_TTS': f"{PRODUCTION_BASE}/api/v1/tts/synthesize",
    'Health_General': f"{PRODUCTION_BASE}/health",
    'Health_PAM': f"{PRODUCTION_BASE}/api/v1/pam/health"
}

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

def print_header(message):
    print(f"\n{Colors.BOLD}{Colors.PURPLE}{'='*60}")
    print(f"🔍 {message}")
    print(f"{'='*60}{Colors.END}\n")

class PAMSystemTester:
    def __init__(self):
        self.results = {}
        self.session = None
        
    async def __aenter__(self):
        # Create HTTP session with timeout
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(timeout=timeout)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def test_health_endpoints(self):
        """Test basic health endpoints"""
        print_header("Testing Health Endpoints")
        
        health_tests = [
            ('General Health', ENDPOINTS['Health_General']),
            ('PAM Health', ENDPOINTS['Health_PAM'])
        ]
        
        for name, url in health_tests:
            print_info(f"Testing {name}: {url}")
            
            try:
                start_time = time.time()
                async with self.session.get(url) as response:
                    response_time = (time.time() - start_time) * 1000
                    
                    if response.status == 200:
                        data = await response.json()
                        status = data.get('status', 'unknown')
                        
                        self.results[name] = {
                            'status': 'WORKING',
                            'http_status': response.status,
                            'response_time_ms': response_time,
                            'health_status': status,
                            'data': data
                        }
                        
                        print_success(f"{name}: {status} ({response_time:.1f}ms)")
                        
                    else:
                        self.results[name] = {
                            'status': 'FAILED',
                            'http_status': response.status,
                            'response_time_ms': response_time,
                            'error': f'HTTP {response.status}'
                        }
                        print_error(f"{name}: HTTP {response.status}")
                        
            except Exception as e:
                self.results[name] = {
                    'status': 'ERROR',
                    'error': str(e)
                }
                print_error(f"{name}: {e}")

    async def test_simplepam_service(self):
        """Test SimplePamService REST endpoint"""
        print_header("Testing SimplePamService")
        
        url = ENDPOINTS['SimplePamService']
        print_info(f"Testing SimplePamService: {url}")
        
        test_payload = {
            "message": "Hello PAM! This is a production test.",
            "context": {
                "user_id": "production_test",
                "test": True
            }
        }
        
        try:
            start_time = time.time()
            async with self.session.post(
                url,
                json=test_payload,
                headers={'Content-Type': 'application/json'}
            ) as response:
                response_time = (time.time() - start_time) * 1000
                
                if response.status == 200:
                    data = await response.json()
                    pam_response = data.get('response', data.get('message', 'No response'))
                    
                    # Check if it's a real AI response or fallback
                    is_fallback = any(keyword in pam_response.lower() for keyword in [
                        'trouble connecting', 'preset', 'fallback', 'error'
                    ])
                    
                    self.results['SimplePamService'] = {
                        'status': 'WORKING',
                        'http_status': response.status,
                        'response_time_ms': response_time,
                        'response_preview': pam_response[:150] + "..." if len(pam_response) > 150 else pam_response,
                        'is_ai_response': not is_fallback,
                        'full_data': data
                    }
                    
                    if is_fallback:
                        print_warning(f"SimplePamService: Working but returning fallback response ({response_time:.1f}ms)")
                        print_warning(f"Response: {pam_response[:100]}...")
                    else:
                        print_success(f"SimplePamService: Working with AI responses ({response_time:.1f}ms)")
                        print_info(f"Response: {pam_response[:100]}...")
                        
                elif response.status == 401:
                    # Authentication required
                    self.results['SimplePamService'] = {
                        'status': 'AUTH_REQUIRED',
                        'http_status': response.status,
                        'response_time_ms': response_time,
                        'error': 'Authentication required'
                    }
                    print_warning(f"SimplePamService: Authentication required ({response_time:.1f}ms)")
                    
                else:
                    error_text = await response.text()
                    self.results['SimplePamService'] = {
                        'status': 'FAILED',
                        'http_status': response.status,
                        'response_time_ms': response_time,
                        'error': f'HTTP {response.status}: {error_text[:200]}'
                    }
                    print_error(f"SimplePamService: HTTP {response.status}")
                    print_error(f"Error: {error_text[:100]}...")
                    
        except Exception as e:
            self.results['SimplePamService'] = {
                'status': 'ERROR',
                'error': str(e)
            }
            print_error(f"SimplePamService: {e}")

    async def test_action_planner(self):
        """Test ActionPlanner/Orchestrator endpoint"""
        print_header("Testing ActionPlanner")
        
        url = ENDPOINTS['ActionPlanner']
        print_info(f"Testing ActionPlanner: {url}")
        
        test_payload = {
            "message": "Plan a simple RV trip to Colorado with budget analysis",
            "context": {
                "user_id": "production_test",
                "test": True
            }
        }
        
        try:
            start_time = time.time()
            async with self.session.post(
                url,
                json=test_payload,
                headers={'Content-Type': 'application/json'}
            ) as response:
                response_time = (time.time() - start_time) * 1000
                
                if response.status == 200:
                    data = await response.json()
                    
                    # ActionPlanner might return different response format
                    if isinstance(data, list) and len(data) > 0:
                        planner_response = data[0].get('content', data[0].get('response', 'No response'))
                    else:
                        planner_response = data.get('response', data.get('message', str(data)))
                    
                    self.results['ActionPlanner'] = {
                        'status': 'WORKING',
                        'http_status': response.status,
                        'response_time_ms': response_time,
                        'response_preview': planner_response[:150] + "..." if len(str(planner_response)) > 150 else str(planner_response),
                        'response_type': type(data).__name__,
                        'full_data': data
                    }
                    
                    print_success(f"ActionPlanner: Working ({response_time:.1f}ms)")
                    print_info(f"Response type: {type(data).__name__}")
                    print_info(f"Response: {str(planner_response)[:100]}...")
                    
                elif response.status == 404:
                    self.results['ActionPlanner'] = {
                        'status': 'NOT_FOUND',
                        'http_status': response.status,
                        'response_time_ms': response_time,
                        'error': 'Endpoint not found - may not be deployed'
                    }
                    print_warning(f"ActionPlanner: Endpoint not found ({response_time:.1f}ms)")
                    
                elif response.status == 401:
                    self.results['ActionPlanner'] = {
                        'status': 'AUTH_REQUIRED',
                        'http_status': response.status,
                        'response_time_ms': response_time,
                        'error': 'Authentication required'
                    }
                    print_warning(f"ActionPlanner: Authentication required ({response_time:.1f}ms)")
                    
                else:
                    error_text = await response.text()
                    self.results['ActionPlanner'] = {
                        'status': 'FAILED',
                        'http_status': response.status,
                        'response_time_ms': response_time,
                        'error': f'HTTP {response.status}: {error_text[:200]}'
                    }
                    print_error(f"ActionPlanner: HTTP {response.status}")
                    print_error(f"Error: {error_text[:100]}...")
                    
        except Exception as e:
            self.results['ActionPlanner'] = {
                'status': 'ERROR',
                'error': str(e)
            }
            print_error(f"ActionPlanner: {e}")

    async def test_websocket(self):
        """Test WebSocket endpoint"""
        print_header("Testing WebSocket")
        
        url = f"{ENDPOINTS['WebSocket']}?token=production_test"
        print_info(f"Testing WebSocket: {url}")
        
        try:
            # Create SSL context
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            start_time = time.time()
            
            async with websockets.connect(
                url,
                ssl=ssl_context,
                ping_interval=20,
                ping_timeout=10,
                close_timeout=5
            ) as websocket:
                connection_time = (time.time() - start_time) * 1000
                
                print_success(f"WebSocket: Connected ({connection_time:.1f}ms)")
                
                # Test 1: Wait for welcome message
                try:
                    welcome_msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    welcome_data = json.loads(welcome_msg)
                    welcome_message = welcome_data.get('message', 'No message')
                    print_info(f"Welcome: {welcome_message}")
                except asyncio.TimeoutError:
                    print_info("No welcome message (but connection OK)")
                    welcome_message = "No welcome message"
                except json.JSONDecodeError:
                    welcome_message = f"Non-JSON: {welcome_msg}"
                
                # Test 2: Send chat message
                test_message = {
                    "type": "chat",
                    "message": "Hello PAM via WebSocket!",
                    "context": {"user_id": "production_test", "test": True}
                }
                
                await websocket.send(json.dumps(test_message))
                print_info("Sent test message, waiting for response...")
                
                # Wait for response
                try:
                    start_response_time = time.time()
                    response_msg = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                    response_time = (time.time() - start_response_time) * 1000
                    
                    response_data = json.loads(response_msg)
                    pam_response = response_data.get('content', response_data.get('message', 'No content'))
                    response_type = response_data.get('type', 'unknown')
                    
                    self.results['WebSocket'] = {
                        'status': 'WORKING',
                        'connection_time_ms': connection_time,
                        'response_time_ms': response_time,
                        'welcome_message': welcome_message,
                        'chat_response': pam_response[:150] + "..." if len(str(pam_response)) > 150 else str(pam_response),
                        'response_type': response_type,
                        'full_response': response_data
                    }
                    
                    print_success(f"WebSocket: Chat working ({response_time:.1f}ms response)")
                    print_info(f"Response type: {response_type}")
                    print_info(f"Response: {str(pam_response)[:100]}...")
                    
                except asyncio.TimeoutError:
                    self.results['WebSocket'] = {
                        'status': 'PARTIAL',
                        'connection_time_ms': connection_time,
                        'welcome_message': welcome_message,
                        'error': 'Chat response timeout - connection works but PAM may not be responding'
                    }
                    print_warning("WebSocket: Connection works but chat timeout")
                    
        except websockets.exceptions.InvalidHandshake as e:
            self.results['WebSocket'] = {
                'status': 'NOT_FOUND',
                'error': f'WebSocket handshake failed: {e} - endpoint may not exist'
            }
            print_error(f"WebSocket: Handshake failed - {e}")
            
        except Exception as e:
            self.results['WebSocket'] = {
                'status': 'ERROR',
                'error': str(e)
            }
            print_error(f"WebSocket: {e}")

    async def test_voice_tts(self):
        """Test Voice/TTS endpoint"""
        print_header("Testing Voice/TTS")
        
        url = ENDPOINTS['Voice_TTS']
        print_info(f"Testing Voice/TTS: {url}")
        
        test_payload = {
            "text": "Hello, this is a TTS test for production PAM system.",
            "voice": "en-US-AriaNeural",
            "format": "mp3"
        }
        
        try:
            start_time = time.time()
            async with self.session.post(
                url,
                json=test_payload,
                headers={'Content-Type': 'application/json'}
            ) as response:
                response_time = (time.time() - start_time) * 1000
                
                if response.status == 200:
                    content_type = response.headers.get('content-type', '')
                    content_length = response.headers.get('content-length', '0')
                    
                    if 'audio' in content_type or 'application/octet-stream' in content_type:
                        # Audio response
                        self.results['Voice_TTS'] = {
                            'status': 'WORKING',
                            'http_status': response.status,
                            'response_time_ms': response_time,
                            'content_type': content_type,
                            'audio_size_bytes': int(content_length) if content_length.isdigit() else 0,
                            'response_type': 'audio'
                        }
                        
                        print_success(f"Voice/TTS: Working ({response_time:.1f}ms)")
                        print_info(f"Audio type: {content_type}")
                        print_info(f"Audio size: {content_length} bytes")
                        
                    else:
                        # JSON response (might be error or different format)
                        try:
                            data = await response.json()
                            self.results['Voice_TTS'] = {
                                'status': 'WORKING',
                                'http_status': response.status,
                                'response_time_ms': response_time,
                                'content_type': content_type,
                                'response_type': 'json',
                                'data': data
                            }
                            
                            print_success(f"Voice/TTS: Working (JSON response) ({response_time:.1f}ms)")
                            print_info(f"Response: {str(data)[:100]}...")
                            
                        except:
                            text_response = await response.text()
                            self.results['Voice_TTS'] = {
                                'status': 'WORKING',
                                'http_status': response.status,
                                'response_time_ms': response_time,
                                'content_type': content_type,
                                'response_type': 'text',
                                'response_preview': text_response[:150]
                            }
                            
                            print_success(f"Voice/TTS: Working (text response) ({response_time:.1f}ms)")
                            
                elif response.status == 404:
                    self.results['Voice_TTS'] = {
                        'status': 'NOT_FOUND',
                        'http_status': response.status,
                        'response_time_ms': response_time,
                        'error': 'TTS endpoint not found - may not be deployed'
                    }
                    print_warning(f"Voice/TTS: Endpoint not found ({response_time:.1f}ms)")
                    
                elif response.status == 401:
                    self.results['Voice_TTS'] = {
                        'status': 'AUTH_REQUIRED',
                        'http_status': response.status,
                        'response_time_ms': response_time,
                        'error': 'Authentication required'
                    }
                    print_warning(f"Voice/TTS: Authentication required ({response_time:.1f}ms)")
                    
                else:
                    error_text = await response.text()
                    self.results['Voice_TTS'] = {
                        'status': 'FAILED',
                        'http_status': response.status,
                        'response_time_ms': response_time,
                        'error': f'HTTP {response.status}: {error_text[:200]}'
                    }
                    print_error(f"Voice/TTS: HTTP {response.status}")
                    print_error(f"Error: {error_text[:100]}...")
                    
        except Exception as e:
            self.results['Voice_TTS'] = {
                'status': 'ERROR',
                'error': str(e)
            }
            print_error(f"Voice/TTS: {e}")

    def generate_status_report(self):
        """Generate markdown status report"""
        
        report = f"""# PAM Production System Status Report

**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}  
**Production URL**: {PRODUCTION_BASE}  
**Test Duration**: {datetime.now().strftime('%H:%M:%S')}

## 📊 System Overview

| System | Status | Response Time | Details |
|--------|--------|---------------|---------|
"""
        
        # Add status table
        for system_name, result in self.results.items():
            status = result.get('status', 'UNKNOWN')
            response_time = result.get('response_time_ms', result.get('connection_time_ms', 0))
            
            # Status emoji
            if status == 'WORKING':
                status_emoji = "✅"
            elif status in ['PARTIAL', 'AUTH_REQUIRED']:
                status_emoji = "⚠️"
            elif status in ['NOT_FOUND', 'FAILED']:
                status_emoji = "❌"
            else:
                status_emoji = "🔍"
            
            # Details
            if status == 'WORKING':
                if 'health_status' in result:
                    details = f"Health: {result['health_status']}"
                elif 'is_ai_response' in result:
                    details = "AI Responses" if result['is_ai_response'] else "Fallback Responses"
                elif 'response_type' in result:
                    details = f"Type: {result['response_type']}"
                else:
                    details = "Working normally"
            else:
                details = result.get('error', 'Unknown issue')[:50]
            
            report += f"| {system_name} | {status_emoji} {status} | {response_time:.1f}ms | {details} |\n"
        
        # Detailed results
        report += "\n## 🔍 Detailed Test Results\n\n"
        
        for system_name, result in self.results.items():
            status = result.get('status', 'UNKNOWN')
            
            report += f"### {system_name}\n\n"
            report += f"**Status**: {status}  \n"
            
            if 'http_status' in result:
                report += f"**HTTP Status**: {result['http_status']}  \n"
            
            if 'response_time_ms' in result:
                report += f"**Response Time**: {result['response_time_ms']:.1f}ms  \n"
            elif 'connection_time_ms' in result:
                report += f"**Connection Time**: {result['connection_time_ms']:.1f}ms  \n"
            
            # System-specific details
            if system_name in ['SimplePamService', 'ActionPlanner'] and 'response_preview' in result:
                report += f"**Response Preview**: {result['response_preview']}  \n"
                
                if 'is_ai_response' in result:
                    ai_status = "✅ AI Response" if result['is_ai_response'] else "⚠️ Fallback Response"
                    report += f"**AI Status**: {ai_status}  \n"
            
            elif system_name == 'WebSocket':
                if 'welcome_message' in result:
                    report += f"**Welcome Message**: {result['welcome_message']}  \n"
                if 'chat_response' in result:
                    report += f"**Chat Response**: {result['chat_response']}  \n"
            
            elif system_name == 'Voice_TTS':
                if 'content_type' in result:
                    report += f"**Content Type**: {result['content_type']}  \n"
                if 'audio_size_bytes' in result:
                    report += f"**Audio Size**: {result['audio_size_bytes']} bytes  \n"
            
            elif 'health_status' in result:
                report += f"**Health Status**: {result['health_status']}  \n"
            
            if 'error' in result:
                report += f"**Error**: {result['error']}  \n"
            
            report += "\n"
        
        # Summary and recommendations
        working_systems = [name for name, result in self.results.items() if result.get('status') == 'WORKING']
        partial_systems = [name for name, result in self.results.items() if result.get('status') in ['PARTIAL', 'AUTH_REQUIRED']]
        failed_systems = [name for name, result in self.results.items() if result.get('status') in ['FAILED', 'ERROR', 'NOT_FOUND']]
        
        report += "## 📋 Summary\n\n"
        report += f"**✅ Fully Working**: {len(working_systems)} systems  \n"
        report += f"**⚠️ Partially Working**: {len(partial_systems)} systems  \n"
        report += f"**❌ Not Working**: {len(failed_systems)} systems  \n"
        report += f"**🔍 Total Tested**: {len(self.results)} systems  \n\n"
        
        if working_systems:
            report += f"**Working Systems**: {', '.join(working_systems)}  \n"
        
        if partial_systems:
            report += f"**Partial Systems**: {', '.join(partial_systems)}  \n"
        
        if failed_systems:
            report += f"**Failed Systems**: {', '.join(failed_systems)}  \n"
        
        report += "\n## 🚀 Recommendations\n\n"
        
        if len(working_systems) == len(self.results):
            report += "🎉 **All systems operational!** Your PAM backend is fully functional.\n\n"
        else:
            if failed_systems:
                report += "### Priority Issues\n"
                for system in failed_systems:
                    error = self.results[system].get('error', 'Unknown error')
                    if 'not found' in error.lower() or '404' in error:
                        report += f"- **{system}**: Endpoint not deployed - check route configuration\n"
                    elif 'auth' in error.lower() or '401' in error:
                        report += f"- **{system}**: Authentication required - configure JWT tokens\n"
                    else:
                        report += f"- **{system}**: {error}\n"
                report += "\n"
            
            if partial_systems:
                report += "### Improvement Opportunities\n"
                for system in partial_systems:
                    result = self.results[system]
                    if result.get('status') == 'AUTH_REQUIRED':
                        report += f"- **{system}**: Add proper authentication for full functionality\n"
                    elif result.get('status') == 'PARTIAL':
                        error = result.get('error', 'Partial functionality')
                        report += f"- **{system}**: {error}\n"
                report += "\n"
        
        # Next steps
        report += "## 📝 Next Steps\n\n"
        
        if not working_systems:
            report += "1. **Critical**: No systems working - check deployment status\n"
            report += "2. Verify environment variables are set correctly\n"
            report += "3. Check application logs for startup errors\n"
        elif failed_systems:
            report += "1. Fix failed endpoints by checking route configuration\n"
            report += "2. Deploy missing services to production\n"
            report += "3. Configure authentication for protected endpoints\n"
        else:
            report += "1. Monitor system performance and response times\n"
            report += "2. Set up automated health checks\n"
            report += "3. Configure proper authentication for enhanced security\n"
        
        report += "\n---\n"
        report += f"*Generated by PAM Production System Tester at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*"
        
        return report

async def main():
    """Main test runner"""
    print(f"{Colors.BOLD}{Colors.PURPLE}")
    print("=" * 70)
    print("🔍 PAM Production Systems Status Checker")
    print("=" * 70)
    print(f"{Colors.END}")
    
    print_info(f"Testing production systems at: {PRODUCTION_BASE}")
    print_info(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    async with PAMSystemTester() as tester:
        # Run all tests
        await tester.test_health_endpoints()
        await tester.test_simplepam_service()
        await tester.test_action_planner()  
        await tester.test_websocket()
        await tester.test_voice_tts()
        
        # Generate and save report
        print_header("Generating Status Report")
        
        report = tester.generate_status_report()
        
        # Save to file
        report_filename = "PAM_SYSTEM_STATUS.md"
        with open(report_filename, 'w') as f:
            f.write(report)
        
        print_success(f"Status report saved to: {report_filename}")
        
        # Display summary
        working_count = sum(1 for result in tester.results.values() if result.get('status') == 'WORKING')
        total_count = len(tester.results)
        
        print()
        print_info(f"Test Summary:")
        print_info(f"Systems tested: {total_count}")
        print_info(f"Working systems: {working_count}")
        print_info(f"Success rate: {working_count/total_count*100:.1f}%")
        
        if working_count == total_count:
            print_success("🎉 All PAM systems are working!")
        elif working_count > 0:
            print_warning(f"⚠️  {total_count - working_count} systems need attention")
        else:
            print_error("❌ No systems are working - check deployment")
    
    print()
    print_info(f"Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    try:
        # Check if required packages are available
        try:
            import aiohttp
            import websockets
        except ImportError as e:
            print_error(f"Missing required package: {e}")
            print_info("Install with: pip install aiohttp websockets")
            sys.exit(1)
        
        asyncio.run(main())
        
    except KeyboardInterrupt:
        print_warning("Test interrupted by user")
    except Exception as e:
        print_error(f"Test failed: {e}")
        sys.exit(1)