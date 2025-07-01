
#!/usr/bin/env python3
"""
Test PAM AI responses and functionality.
"""

import asyncio
import sys
import os
import json
from datetime import datetime
from uuid import uuid4

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.services.pam.intelligent_conversation import IntelligentConversation
from app.core.logging import get_logger

logger = get_logger(__name__)

class PAMTester:
    def __init__(self):
        self.pam = IntelligentConversation()
        self.test_user_id = str(uuid4())
        self.session_id = str(uuid4())
    
    async def test_basic_responses(self):
        """Test basic PAM responses"""
        logger.info("Testing basic PAM responses...")
        
        test_messages = [
            "Hello PAM, how are you?",
            "What can you help me with?",
            "How much did I spend on fuel last month?",
            "When is my next oil change due?",
            "Find me camping spots near Sydney",
            "What are some good money-making ideas for nomads?",
            "Help me plan a meal for tonight"
        ]
        
        results = []
        
        for message in test_messages:
            try:
                logger.info(f"Testing: {message}")
                
                response = await self.pam.process_message(
                    user_message=message,
                    user_id=self.test_user_id,
                    session_id=self.session_id
                )
                
                result = {
                    "input": message,
                    "intent": response.get("intent", "unknown"),
                    "confidence": response.get("confidence", 0.0),
                    "response_preview": response.get("response", "")[:100] + "...",
                    "node_used": response.get("node_used", "unknown"),
                    "success": True
                }
                
                logger.info(f"  ✅ Intent: {result['intent']} (confidence: {result['confidence']})")
                
            except Exception as e:
                result = {
                    "input": message,
                    "error": str(e),
                    "success": False
                }
                logger.error(f"  ❌ Error: {e}")
            
            results.append(result)
        
        return results
    
    async def test_context_memory(self):
        """Test PAM's context and memory capabilities"""
        logger.info("Testing context and memory...")
        
        conversation_flow = [
            "I'm planning a trip to Melbourne",
            "What's the weather like there?",
            "How much should I budget for fuel?",
            "What about accommodation costs?",
            "Thanks for the help with my Melbourne trip"
        ]
        
        results = []
        
        for i, message in enumerate(conversation_flow):
            try:
                logger.info(f"Message {i+1}: {message}")
                
                response = await self.pam.process_message(
                    user_message=message,
                    user_id=self.test_user_id,
                    session_id=self.session_id
                )
                
                result = {
                    "sequence": i + 1,
                    "input": message,
                    "intent": response.get("intent", "unknown"),
                    "context_used": response.get("context_used", {}),
                    "success": True
                }
                
                logger.info(f"  ✅ Context maintained: {bool(result['context_used'])}")
                
            except Exception as e:
                result = {
                    "sequence": i + 1,
                    "input": message,
                    "error": str(e),
                    "success": False
                }
                logger.error(f"  ❌ Error: {e}")
            
            results.append(result)
        
        return results
    
    async def test_intent_classification(self):
        """Test intent classification accuracy"""
        logger.info("Testing intent classification...")
        
        intent_tests = [
            {"message": "How much did I spend on groceries?", "expected": "expense_query"},
            {"message": "When is my oil change due?", "expected": "maintenance_query"},
            {"message": "Find camping near Brisbane", "expected": "location_search"},
            {"message": "What are good ways to make money?", "expected": "money_maker_query"},
            {"message": "Plan dinner for tonight", "expected": "meal_planning"},
            {"message": "Add $50 fuel expense", "expected": "expense_entry"},
        ]
        
        results = []
        
        for test in intent_tests:
            try:
                response = await self.pam.process_message(
                    user_message=test["message"],
                    user_id=self.test_user_id,
                    session_id=str(uuid4())  # New session for each test
                )
                
                detected_intent = response.get("intent", "unknown")
                confidence = response.get("confidence", 0.0)
                
                result = {
                    "message": test["message"],
                    "expected_intent": test["expected"],
                    "detected_intent": detected_intent,
                    "confidence": confidence,
                    "correct": detected_intent == test["expected"],
                    "success": True
                }
                
                status = "✅" if result["correct"] else "❌"
                logger.info(f"  {status} Expected: {test['expected']}, Got: {detected_intent} ({confidence:.2f})")
                
            except Exception as e:
                result = {
                    "message": test["message"],
                    "expected_intent": test["expected"],
                    "error": str(e),
                    "success": False
                }
                logger.error(f"  ❌ Error: {e}")
            
            results.append(result)
        
        return results
    
    async def test_performance(self):
        """Test PAM response performance"""
        logger.info("Testing performance...")
        
        test_message = "What's my total spending this month?"
        iterations = 5
        response_times = []
        
        for i in range(iterations):
            start_time = datetime.now()
            
            try:
                await self.pam.process_message(
                    user_message=test_message,
                    user_id=self.test_user_id,
                    session_id=str(uuid4())
                )
                
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                response_times.append(response_time)
                
                logger.info(f"  Iteration {i+1}: {response_time:.2f}ms")
                
            except Exception as e:
                logger.error(f"  ❌ Iteration {i+1} failed: {e}")
        
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            min_time = min(response_times)
            max_time = max(response_times)
            
            performance_result = {
                "average_ms": avg_time,
                "min_ms": min_time,
                "max_ms": max_time,
                "iterations": len(response_times),
                "success_rate": len(response_times) / iterations * 100
            }
            
            logger.info(f"Performance Summary:")
            logger.info(f"  Average: {avg_time:.2f}ms")
            logger.info(f"  Min: {min_time:.2f}ms")
            logger.info(f"  Max: {max_time:.2f}ms")
            logger.info(f"  Success Rate: {performance_result['success_rate']:.1f}%")
            
            return performance_result
        
        return {"error": "No successful responses"}
    
    async def run_all_tests(self):
        """Run all PAM tests"""
        logger.info("Starting comprehensive PAM testing...")
        
        test_results = {
            "timestamp": datetime.now().isoformat(),
            "test_user_id": self.test_user_id,
            "tests": {}
        }
        
        # Run test suites
        test_results["tests"]["basic_responses"] = await self.test_basic_responses()
        test_results["tests"]["context_memory"] = await self.test_context_memory()
        test_results["tests"]["intent_classification"] = await self.test_intent_classification()
        test_results["tests"]["performance"] = await self.test_performance()
        
        # Generate summary
        total_tests = 0
        successful_tests = 0
        
        for test_suite, results in test_results["tests"].items():
            if isinstance(results, list):
                for result in results:
                    total_tests += 1
                    if result.get("success", False):
                        successful_tests += 1
            elif isinstance(results, dict) and not results.get("error"):
                total_tests += 1
                successful_tests += 1
        
        test_results["summary"] = {
            "total_tests": total_tests,
            "successful_tests": successful_tests,
            "success_rate": (successful_tests / total_tests * 100) if total_tests > 0 else 0
        }
        
        logger.info(f"\n🎯 Test Summary:")
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"Successful: {successful_tests}")
        logger.info(f"Success Rate: {test_results['summary']['success_rate']:.1f}%")
        
        # Save results to file
        results_file = f"pam_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_file, 'w') as f:
            json.dump(test_results, f, indent=2)
        
        logger.info(f"📁 Results saved to: {results_file}")
        
        return test_results

async def main():
    """Main function to run PAM tests"""
    tester = PAMTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
