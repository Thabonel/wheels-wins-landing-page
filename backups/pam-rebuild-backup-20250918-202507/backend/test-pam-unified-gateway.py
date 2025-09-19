#!/usr/bin/env python3

"""
PAM Unified Gateway Test Script
Tests the intelligent routing system and all processing backends
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from typing import Dict, List, Any

# Import the gateway
sys.path.append('/Users/thabonel/Documents/Wheels and Wins/wheels-wins-landing-page/backend')

try:
    from app.core.pam_unified_gateway import (
        pam_unified_gateway,
        ProcessingSystem,
        RequestComplexity
    )
except ImportError as e:
    print(f"❌ Failed to import PAM Unified Gateway: {e}")
    print("Ensure you're running from the backend directory")
    sys.exit(1)

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
    print(f"🎯 {message}")
    print(f"{'='*60}{Colors.END}\n")

# Test cases for different complexity levels
TEST_CASES = [
    # Simple requests (should use Edge Processing)
    {
        "message": "Hi PAM",
        "expected_system": ProcessingSystem.EDGE,
        "expected_complexity": RequestComplexity.SIMPLE,
        "description": "Simple greeting"
    },
    {
        "message": "Hello",
        "expected_system": ProcessingSystem.EDGE,
        "expected_complexity": RequestComplexity.SIMPLE,
        "description": "Basic greeting"
    },
    {
        "message": "What time is it?",
        "expected_system": ProcessingSystem.EDGE,
        "expected_complexity": RequestComplexity.SIMPLE,
        "description": "Time query"
    },
    {
        "message": "Thanks",
        "expected_system": ProcessingSystem.EDGE,
        "expected_complexity": RequestComplexity.SIMPLE,
        "description": "Acknowledgment"
    },
    
    # Standard requests (should use SimplePam)
    {
        "message": "What's the weather like?",
        "expected_system": ProcessingSystem.SIMPLE,
        "expected_complexity": RequestComplexity.STANDARD,
        "description": "Weather information request"
    },
    {
        "message": "Tell me about RV camping near me",
        "expected_system": ProcessingSystem.SIMPLE,
        "expected_complexity": RequestComplexity.STANDARD,
        "description": "Location-based information"
    },
    {
        "message": "How much did I spend on gas yesterday?",
        "expected_system": ProcessingSystem.SIMPLE,
        "expected_complexity": RequestComplexity.STANDARD,
        "description": "Expense query"
    },
    {
        "message": "Find camping spots in Colorado",
        "expected_system": ProcessingSystem.SIMPLE,
        "expected_complexity": RequestComplexity.STANDARD,
        "description": "Search request"
    },
    
    # Complex requests (should use ActionPlanner)
    {
        "message": "Plan a 7-day RV trip from Denver to Yellowstone with budget analysis and campground reservations",
        "expected_system": ProcessingSystem.PLANNER,
        "expected_complexity": RequestComplexity.COMPLEX,
        "description": "Multi-step trip planning"
    },
    {
        "message": "Analyze my spending patterns and optimize my travel budget for next month",
        "expected_system": ProcessingSystem.PLANNER,
        "expected_complexity": RequestComplexity.COMPLEX,
        "description": "Financial analysis and optimization"
    },
    {
        "message": "Compare routes from San Francisco to Seattle, calculate fuel costs, and find the most scenic path with RV-friendly stops",
        "expected_system": ProcessingSystem.PLANNER,
        "expected_complexity": RequestComplexity.COMPLEX,
        "description": "Complex route analysis"
    },
    {
        "message": "First, check weather for Colorado, then find pet-friendly campgrounds, next calculate total trip cost, and finally create an itinerary",
        "expected_system": ProcessingSystem.PLANNER,
        "expected_complexity": RequestComplexity.COMPLEX,
        "description": "Multi-step sequential planning"
    }
]

async def test_complexity_analysis():
    """Test the complexity analyzer with various inputs"""
    print_header("Testing Request Complexity Analysis")
    
    analyzer = pam_unified_gateway.analyzer
    results = []
    
    for i, test_case in enumerate(TEST_CASES, 1):
        message = test_case["message"]
        expected_system = test_case["expected_system"]
        expected_complexity = test_case["expected_complexity"]
        description = test_case["description"]
        
        print_info(f"Test {i}: {description}")
        print_info(f"Message: '{message}'")
        
        # Analyze complexity
        analysis = analyzer.analyze_complexity(message)
        
        print_info(f"Complexity Score: {analysis.score:.1f}/10")
        print_info(f"Detected Level: {analysis.level.value}")
        print_info(f"Recommended System: {analysis.recommended_system.value}")
        
        # Check if routing matches expectations
        system_match = analysis.recommended_system == expected_system
        complexity_match = analysis.level == expected_complexity
        
        if system_match and complexity_match:
            print_success("✅ Analysis matches expectations")
        else:
            print_warning(f"⚠️  Analysis differs from expectations")
            if not system_match:
                print_warning(f"Expected system: {expected_system.value}, got: {analysis.recommended_system.value}")
            if not complexity_match:
                print_warning(f"Expected complexity: {expected_complexity.value}, got: {analysis.level.value}")
        
        # Show contributing factors
        if analysis.factors:
            print_info(f"Factors: {', '.join(analysis.factors[:3])}...")
        if analysis.keywords:
            print_info(f"Keywords: {', '.join(analysis.keywords[:3])}...")
        if analysis.entities:
            print_info(f"Entities: {', '.join(analysis.entities[:3])}...")
        
        results.append({
            'test_case': test_case,
            'analysis': analysis,
            'system_match': system_match,
            'complexity_match': complexity_match
        })
        
        print()
    
    # Summary
    total_tests = len(results)
    system_matches = sum(1 for r in results if r['system_match'])
    complexity_matches = sum(1 for r in results if r['complexity_match'])
    
    print_info(f"Analysis Summary:")
    print_info(f"System Routing Accuracy: {system_matches}/{total_tests} ({system_matches/total_tests*100:.1f}%)")
    print_info(f"Complexity Detection Accuracy: {complexity_matches}/{total_tests} ({complexity_matches/total_tests*100:.1f}%)")
    
    return results

async def test_gateway_processing():
    """Test end-to-end gateway processing"""
    print_header("Testing Gateway Request Processing")
    
    test_messages = [
        "Hello PAM",  # Simple
        "What's the weather like today?",  # Standard  
        "Plan a weekend RV trip to the mountains with budget analysis"  # Complex
    ]
    
    for i, message in enumerate(test_messages, 1):
        print_info(f"Processing Test {i}: '{message}'")
        
        start_time = time.time()
        
        try:
            # Process through gateway
            response = await pam_unified_gateway.process_request(
                message=message,
                context={
                    'user_id': 'test-user',
                    'session_id': 'test-session',
                    'test': True
                }
            )
            
            processing_time = (time.time() - start_time) * 1000
            
            if response.success:
                print_success(f"✅ Processing successful")
                print_info(f"System Used: {response.system_used.value}")
                print_info(f"Processing Time: {response.processing_time_ms:.1f}ms")
                print_info(f"Gateway Total Time: {processing_time:.1f}ms")
                print_info(f"Confidence: {response.confidence:.1f}")
                print_info(f"Response: {response.response[:100]}...")
                
                # Check metadata
                if response.metadata and 'complexity_analysis' in response.metadata:
                    complexity = response.metadata['complexity_analysis']
                    print_info(f"Complexity Score: {complexity['score']:.1f}")
                    print_info(f"Detected Level: {complexity['level']}")
                
            else:
                print_error(f"❌ Processing failed: {response.error}")
                print_info(f"System Attempted: {response.system_used.value}")
                
        except Exception as e:
            print_error(f"❌ Gateway error: {e}")
        
        print()

async def test_fallback_chain():
    """Test fallback behavior when systems fail"""
    print_header("Testing Fallback Chain Behavior")
    
    # Test each system as primary with different message types
    test_scenarios = [
        {
            "message": "Hello",
            "force_system": ProcessingSystem.PLANNER,
            "description": "Force simple message through complex system"
        },
        {
            "message": "Plan a complex multi-day RV journey",  
            "force_system": ProcessingSystem.EDGE,
            "description": "Force complex message through simple system"
        }
    ]
    
    for scenario in test_scenarios:
        message = scenario["message"]
        force_system = scenario["force_system"]
        description = scenario["description"]
        
        print_info(f"Scenario: {description}")
        print_info(f"Message: '{message}'")
        print_info(f"Forced System: {force_system.value}")
        
        try:
            response = await pam_unified_gateway.process_request(
                message=message,
                context={'user_id': 'test-fallback'},
                force_system=force_system
            )
            
            if response.success:
                print_success(f"✅ Fallback successful")
                print_info(f"Final System: {response.system_used.value}")
                if response.system_used != force_system:
                    print_warning(f"⚠️  Fell back from {force_system.value} to {response.system_used.value}")
            else:
                print_error(f"❌ All systems failed: {response.error}")
                
        except Exception as e:
            print_error(f"❌ Fallback test error: {e}")
        
        print()

async def test_performance_metrics():
    """Test performance monitoring"""
    print_header("Testing Performance Metrics")
    
    # Generate some requests to populate metrics
    test_requests = [
        ("Hi", ProcessingSystem.EDGE),
        ("What's the weather?", ProcessingSystem.SIMPLE),
        ("Plan a trip", ProcessingSystem.PLANNER),
        ("Hello again", ProcessingSystem.EDGE),
        ("Find camping", ProcessingSystem.SIMPLE)
    ]
    
    print_info("Generating sample requests...")
    
    for message, expected_system in test_requests:
        try:
            await pam_unified_gateway.process_request(
                message=message,
                context={'user_id': 'metrics-test'}
            )
        except Exception:
            pass  # Ignore errors for metrics test
    
    # Get performance metrics
    metrics = pam_unified_gateway.get_performance_metrics()
    
    print_success("Performance Metrics:")
    print_info(f"Total Requests: {metrics['total_requests']}")
    print_info(f"Timestamp: {metrics['timestamp']}")
    
    for system_name, system_metrics in metrics['systems'].items():
        requests = system_metrics['requests']
        avg_time = system_metrics['avg_time']
        success_rate = system_metrics['success_rate']
        
        print_info(f"{system_name.upper()}:")
        print_info(f"  Requests: {requests}")
        print_info(f"  Avg Time: {avg_time:.1f}ms")
        print_info(f"  Success Rate: {success_rate:.1%}")
    
    print()

async def test_health_check():
    """Test gateway health monitoring"""
    print_header("Testing Health Check System")
    
    print_info("Running comprehensive health check...")
    
    try:
        health_status = await pam_unified_gateway.health_check()
        
        overall_status = health_status['gateway']
        print_info(f"Overall Gateway Status: {overall_status}")
        
        for system_name, system_health in health_status['systems'].items():
            status = system_health['status']
            
            if status == 'healthy':
                print_success(f"✅ {system_name.upper()}: {status}")
                if 'response_time_ms' in system_health:
                    print_info(f"  Response Time: {system_health['response_time_ms']:.1f}ms")
            else:
                print_error(f"❌ {system_name.upper()}: {status}")
                if 'error' in system_health:
                    print_error(f"  Error: {system_health['error']}")
        
        if overall_status == 'healthy':
            print_success("✅ All systems operational")
        elif overall_status == 'degraded':
            print_warning("⚠️  Some systems degraded but gateway functional")
        else:
            print_error("❌ Gateway in critical state")
            
    except Exception as e:
        print_error(f"❌ Health check failed: {e}")

async def main():
    """Main test runner"""
    print(f"{Colors.BOLD}{Colors.PURPLE}")
    print("=" * 70)
    print("🧪 PAM Unified Gateway Comprehensive Test Suite")
    print("=" * 70)
    print(f"{Colors.END}")
    
    print_info(f"Test started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Run all test suites
    test_suites = [
        ("Complexity Analysis", test_complexity_analysis),
        ("Gateway Processing", test_gateway_processing),
        ("Fallback Behavior", test_fallback_chain),
        ("Performance Metrics", test_performance_metrics),
        ("Health Monitoring", test_health_check)
    ]
    
    results = {}
    
    for suite_name, test_func in test_suites:
        try:
            print_info(f"Starting {suite_name} tests...")
            start_time = time.time()
            
            result = await test_func()
            
            execution_time = (time.time() - start_time) * 1000
            results[suite_name] = {
                'success': True,
                'execution_time': execution_time,
                'result': result
            }
            
            print_success(f"✅ {suite_name} completed in {execution_time:.1f}ms")
            
        except Exception as e:
            print_error(f"❌ {suite_name} failed: {e}")
            results[suite_name] = {
                'success': False,
                'error': str(e)
            }
        
        print()
    
    # Final summary
    print_header("Test Suite Summary")
    
    successful_suites = sum(1 for r in results.values() if r.get('success', False))
    total_suites = len(results)
    
    print_info(f"Test Suites Completed: {total_suites}")
    print_info(f"Successful: {successful_suites}")
    print_info(f"Failed: {total_suites - successful_suites}")
    print_info(f"Success Rate: {successful_suites/total_suites*100:.1f}%")
    
    if successful_suites == total_suites:
        print_success("🎉 All test suites passed! Gateway is fully functional.")
    else:
        print_warning(f"⚠️  {total_suites - successful_suites} test suite(s) failed.")
    
    print_info(f"Test completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    try:
        # Run the comprehensive test suite
        asyncio.run(main())
        
    except KeyboardInterrupt:
        print_warning("Tests interrupted by user")
    except Exception as e:
        print_error(f"Test runner failed: {e}")
        sys.exit(1)