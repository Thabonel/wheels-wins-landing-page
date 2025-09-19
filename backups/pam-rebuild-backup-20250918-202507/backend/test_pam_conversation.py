#!/usr/bin/env python3
"""
PAM Conversation Test
Tests PAM with real conversation scenarios
"""

import asyncio
import os
import sys
import json
import time
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.simple_pam_service import simple_pam_service

class PAMConversationTester:
    """Test PAM with real conversation scenarios"""
    
    def __init__(self):
        self.test_conversations = [
            {
                "name": "Trip Planning",
                "message": "I'm planning a trip from Brisbane to Sydney in my motorhome. Can you suggest the best route?",
                "context": {
                    "user_location": [-27.4698, 153.0251],
                    "vehicle_info": {"type": "motorhome"},
                    "user_id": "test_user_123"
                }
            },
            {
                "name": "Budget Help",
                "message": "I've spent $500 on fuel this week. Is that normal for RV travel?",
                "context": {
                    "user_id": "test_user_123"
                }
            },
            {
                "name": "General Question",
                "message": "What's the weather like for RV travel in Queensland?",
                "context": {
                    "user_location": [-27.4698, 153.0251],
                    "user_id": "test_user_123"
                }
            },
            {
                "name": "Emergency Help",
                "message": "My RV broke down on the highway. What should I do?",
                "context": {
                    "user_location": [-27.4698, 153.0251],
                    "user_id": "test_user_123"
                }
            }
        ]
    
    async def test_conversation(self, test_case):
        """Test a single conversation"""
        print(f"\n🗣️  Testing: {test_case['name']}")
        print(f"📝 Message: {test_case['message']}")
        
        start_time = time.time()
        
        try:
            response = await simple_pam_service.get_response(
                message=test_case['message'],
                context=test_case['context'],
                conversation_history=[]
            )
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            print(f"✅ Response ({response_time:.1f}ms):")
            print(f"   {response[:200]}{'...' if len(response) > 200 else ''}")
            
            return {
                "success": True,
                "response": response,
                "response_time_ms": response_time,
                "response_length": len(response)
            }
            
        except Exception as e:
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            print(f"❌ Error ({response_time:.1f}ms): {str(e)}")
            
            return {
                "success": False,
                "error": str(e),
                "response_time_ms": response_time
            }
    
    async def test_streaming_conversation(self):
        """Test streaming conversation"""
        print(f"\n🌊 Testing Streaming Response")
        
        test_message = "Tell me about the top 3 RV parks in New South Wales"
        context = {"user_id": "test_user_123"}
        
        print(f"📝 Message: {test_message}")
        
        start_time = time.time()
        chunks_received = 0
        full_response = ""
        
        try:
            # Test if SimplePamService has streaming capability
            if hasattr(simple_pam_service, 'get_streaming_response'):
                async for chunk in simple_pam_service.get_streaming_response(
                    message=test_message,
                    context=context,
                    conversation_history=[]
                ):
                    chunks_received += 1
                    full_response += chunk
                    print(f"📦 Chunk {chunks_received}: {chunk[:50]}{'...' if len(chunk) > 50 else ''}")
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                print(f"✅ Streaming Complete ({response_time:.1f}ms, {chunks_received} chunks)")
                print(f"   Full response: {full_response[:200]}{'...' if len(full_response) > 200 else ''}")
                
                return {
                    "success": True,
                    "chunks_received": chunks_received,
                    "full_response": full_response,
                    "response_time_ms": response_time
                }
            else:
                print("⚠️  Streaming not available in SimplePamService")
                return {"success": False, "error": "Streaming not available"}
                
        except Exception as e:
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            print(f"❌ Streaming Error ({response_time:.1f}ms): {str(e)}")
            
            return {
                "success": False,
                "error": str(e),
                "response_time_ms": response_time
            }
    
    async def test_conversation_context(self):
        """Test conversation context persistence"""
        print(f"\n🧠 Testing Conversation Context")
        
        conversation_history = []
        
        # First message
        message1 = "Hi, I'm planning a trip to Melbourne"
        context = {"user_id": "test_user_123"}
        
        print(f"📝 Message 1: {message1}")
        
        try:
            response1 = await simple_pam_service.get_response(
                message=message1,
                context=context,
                conversation_history=conversation_history
            )
            
            print(f"✅ Response 1: {response1[:100]}{'...' if len(response1) > 100 else ''}")
            
            # Add to conversation history
            conversation_history.extend([
                {"role": "user", "content": message1},
                {"role": "assistant", "content": response1}
            ])
            
            # Follow-up message that requires context
            message2 = "What's the best route there?"
            print(f"📝 Message 2: {message2}")
            
            response2 = await simple_pam_service.get_response(
                message=message2,
                context=context,
                conversation_history=conversation_history
            )
            
            print(f"✅ Response 2: {response2[:100]}{'...' if len(response2) > 100 else ''}")
            
            # Check if response shows understanding of context
            context_aware = any(word in response2.lower() for word in ["melbourne", "route", "there"])
            
            return {
                "success": True,
                "context_aware": context_aware,
                "conversation_length": len(conversation_history) + 2,
                "response1": response1,
                "response2": response2
            }
            
        except Exception as e:
            print(f"❌ Context Error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def run_all_tests(self):
        """Run all PAM conversation tests"""
        print("🤖 Starting PAM Conversation Testing")
        print("=" * 60)
        
        results = {}
        total_start_time = time.time()
        
        # Test individual conversations
        for test_case in self.test_conversations:
            results[test_case['name']] = await self.test_conversation(test_case)
            await asyncio.sleep(0.5)  # Small delay between tests
        
        # Test streaming
        results['streaming'] = await self.test_streaming_conversation()
        await asyncio.sleep(0.5)
        
        # Test context
        results['context'] = await self.test_conversation_context()
        
        total_time = (time.time() - total_start_time)
        
        # Generate summary
        successful_tests = len([r for r in results.values() if r.get('success', False)])
        total_tests = len(results)
        
        print("\n" + "=" * 60)
        print("🎯 PAM CONVERSATION TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Successful: {successful_tests}")
        print(f"❌ Failed: {total_tests - successful_tests}")
        print(f"Total Duration: {total_time:.2f}s")
        
        # Calculate average response time
        response_times = [r.get('response_time_ms', 0) for r in results.values() if 'response_time_ms' in r]
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            print(f"Average Response Time: {avg_response_time:.1f}ms")
        
        # Check which AI provider is being used
        print(f"\nAI Provider Status:")
        try:
            from app.services.ai.ai_orchestrator import ai_orchestrator
            if ai_orchestrator._initialized:
                status = ai_orchestrator.get_status()
                print(f"  Active Providers: {[p['name'] for p in status['providers'] if p['status'] == 'healthy']}")
                print(f"  Total Providers: {status['total_providers']}")
            else:
                print("  AI Orchestrator not initialized")
        except Exception as e:
            print(f"  Could not get AI provider status: {str(e)}")
        
        # Save detailed results
        report = {
            "summary": {
                "total_tests": total_tests,
                "successful": successful_tests,
                "failed": total_tests - successful_tests,
                "duration_seconds": total_time,
                "average_response_time_ms": sum(response_times) / len(response_times) if response_times else 0
            },
            "test_results": results,
            "timestamp": datetime.now().isoformat()
        }
        
        # Write report to file
        report_file = f"pam_conversation_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📊 Detailed report saved to: {report_file}")
        
        if successful_tests == total_tests:
            print("\n🎉 All PAM conversation tests passed!")
        else:
            print(f"\n⚠️  {total_tests - successful_tests} test(s) failed.")
        
        return report

async def main():
    """Main test runner"""
    tester = PAMConversationTester()
    
    try:
        await tester.run_all_tests()
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
    except Exception as e:
        print(f"\n💥 Critical test error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())