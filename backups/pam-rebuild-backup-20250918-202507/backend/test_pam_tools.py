#!/usr/bin/env python3
"""
Test script for PAM Tool Integration
Tests the enhanced orchestrator with financial, mapbox, and weather tools
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_pam_tools():
    """Test PAM tool integration through the enhanced orchestrator"""
    
    try:
        # Import the enhanced orchestrator
        from app.services.pam.enhanced_orchestrator import get_enhanced_orchestrator, ResponseMode
        
        logger.info("🚀 Initializing Enhanced PAM Orchestrator...")
        orchestrator = await get_enhanced_orchestrator()
        
        # Test user context
        test_user_id = "test_user_123"
        test_session_id = "test_session_456"
        
        # Test scenarios
        test_cases = [
            {
                "name": "Expense Tracking",
                "message": "I just spent $45 on fuel at Shell gas station",
                "expected_tool": "manage_finances",
                "verify": lambda r: "expense" in r.lower() or "fuel" in r.lower()
            },
            {
                "name": "Budget Query",
                "message": "How much have I spent on fuel this month?",
                "expected_tool": "manage_finances",
                "verify": lambda r: "fuel" in r.lower() or "spent" in r.lower()
            },
            {
                "name": "Trip Planning",
                "message": "Plan a route from Los Angeles to Las Vegas with campground stops",
                "expected_tool": "mapbox_navigator",
                "verify": lambda r: "route" in r.lower() or "vegas" in r.lower()
            },
            {
                "name": "Weather Check",
                "message": "What's the weather forecast for Las Vegas this weekend?",
                "expected_tool": "weather_service",
                "verify": lambda r: "weather" in r.lower() or "forecast" in r.lower()
            },
            {
                "name": "Complex Query",
                "message": "I'm planning a trip to San Francisco next week. What's the weather like and can you find RV parks nearby?",
                "expected_tool": ["weather_service", "search_nearby_places"],
                "verify": lambda r: "francisco" in r.lower() and ("weather" in r.lower() or "rv" in r.lower())
            }
        ]
        
        # Run test cases
        logger.info("\n" + "="*60)
        logger.info("🧪 Starting PAM Tool Integration Tests")
        logger.info("="*60 + "\n")
        
        passed = 0
        failed = 0
        
        for test_case in test_cases:
            logger.info(f"\n📝 Test: {test_case['name']}")
            logger.info(f"   Message: {test_case['message']}")
            
            try:
                # Process message through orchestrator
                response = await orchestrator.process_message(
                    user_id=test_user_id,
                    message=test_case['message'],
                    session_id=test_session_id,
                    context={
                        "test_mode": True,
                        "location": {"latitude": 34.0522, "longitude": -118.2437}  # LA coordinates
                    },
                    response_mode=ResponseMode.ADAPTIVE
                )
                
                # Check response
                if response and response.get("content"):
                    content = response["content"]
                    logger.info(f"   Response: {content[:200]}...")
                    
                    # Check if expected tools were used
                    tools_used = response.get("capabilities_used", [])
                    if tools_used:
                        logger.info(f"   Tools Used: {', '.join(tools_used)}")
                    
                    # Verify response content
                    if test_case["verify"](content):
                        logger.info(f"   ✅ Test PASSED")
                        passed += 1
                    else:
                        logger.warning(f"   ⚠️ Test FAILED - Response doesn't match expected content")
                        failed += 1
                        
                    # Log performance metrics
                    if response.get("processing_time_ms"):
                        logger.info(f"   ⏱️ Processing Time: {response['processing_time_ms']}ms")
                        
                else:
                    logger.error(f"   ❌ Test FAILED - No response received")
                    failed += 1
                    
            except Exception as e:
                logger.error(f"   ❌ Test FAILED with error: {e}")
                failed += 1
        
        # Summary
        logger.info("\n" + "="*60)
        logger.info("📊 Test Results Summary")
        logger.info("="*60)
        logger.info(f"✅ Passed: {passed}/{len(test_cases)}")
        logger.info(f"❌ Failed: {failed}/{len(test_cases)}")
        
        # Get system status
        status = await orchestrator.get_comprehensive_status()
        logger.info("\n🔍 System Status:")
        logger.info(f"   Services Available: {status['enhanced_orchestrator']['capabilities']['capabilities_available']}/{status['enhanced_orchestrator']['capabilities']['capabilities_total']}")
        logger.info(f"   Overall Status: {status['enhanced_orchestrator']['capabilities']['overall_status']}")
        
        # Performance metrics
        if status.get("performance_metrics"):
            metrics = status["performance_metrics"]
            logger.info("\n📈 Performance Metrics:")
            logger.info(f"   Total Requests: {metrics.get('total_requests', 0)}")
            logger.info(f"   Successful Responses: {metrics.get('successful_responses', 0)}")
            logger.info(f"   AI Service Calls: {metrics.get('ai_service_calls', 0)}")
            logger.info(f"   Average Response Time: {metrics.get('avg_response_time_ms', 0):.1f}ms")
        
        return passed == len(test_cases)
        
    except Exception as e:
        logger.error(f"❌ Test setup failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_wins_node_direct():
    """Test WinsNode directly for financial operations"""
    
    try:
        from app.services.pam.nodes.wins_node import wins_node
        
        logger.info("\n" + "="*60)
        logger.info("💰 Testing WinsNode Direct Access")
        logger.info("="*60 + "\n")
        
        test_user_id = "test_user_123"
        
        # Test expense categorization
        test_expenses = [
            ("Filled up at Shell station", 75.50),
            ("Walmart groceries for the trip", 120.00),
            ("KOA campground for 2 nights", 90.00),
            ("Oil change and tire rotation", 85.00)
        ]
        
        for description, amount in test_expenses:
            category = await wins_node.categorize_expense(description, amount)
            logger.info(f"📝 '{description}' -> Category: {category}")
            
            # Add the expense
            result = await wins_node.add_expense(
                user_id=test_user_id,
                data={
                    "description": description,
                    "amount": amount,
                    "category": category
                }
            )
            
            if result.get("success"):
                logger.info(f"   ✅ Expense added successfully")
                if result.get("alert"):
                    logger.warning(f"   ⚠️ Budget Alert: {result['alert']}")
            else:
                logger.error(f"   ❌ Failed to add expense: {result.get('error')}")
        
        # Get financial summary
        summary = await wins_node.get_financial_summary(test_user_id)
        logger.info(f"\n📊 Financial Summary:")
        logger.info(f"   Total Expenses: ${summary.get('total_expenses', 0):.2f}")
        logger.info(f"   Total Income: ${summary.get('total_income', 0):.2f}")
        logger.info(f"   Net Income: ${summary.get('net_income', 0):.2f}")
        
        # Get expense analytics
        analytics = await wins_node.get_expense_analytics(test_user_id)
        logger.info(f"\n📈 Expense Analytics:")
        logger.info(f"   Current Month Total: ${analytics.get('current_month_total', 0):.2f}")
        logger.info(f"   Daily Average: ${analytics.get('daily_average', 0):.2f}")
        if analytics.get("category_breakdown"):
            logger.info(f"   Category Breakdown:")
            for category, amount in analytics["category_breakdown"].items():
                logger.info(f"      - {category}: ${amount:.2f}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ WinsNode test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test runner"""
    
    logger.info("🎯 PAM Tool Integration Test Suite")
    logger.info(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test enhanced orchestrator with tools
    orchestrator_success = await test_pam_tools()
    
    # Test WinsNode directly
    wins_node_success = await test_wins_node_direct()
    
    # Final summary
    logger.info("\n" + "="*60)
    logger.info("🏁 Final Test Summary")
    logger.info("="*60)
    
    if orchestrator_success and wins_node_success:
        logger.info("✅ All tests passed successfully!")
        logger.info("🎉 PAM Tool Integration is working correctly")
    else:
        logger.error("❌ Some tests failed")
        logger.error("Please check the logs above for details")
    
    return orchestrator_success and wins_node_success

if __name__ == "__main__":
    # Run the tests
    success = asyncio.run(main())
    exit(0 if success else 1)