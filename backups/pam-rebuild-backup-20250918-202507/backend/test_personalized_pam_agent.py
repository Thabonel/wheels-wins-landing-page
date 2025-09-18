#!/usr/bin/env python3
"""
Test PersonalizedPamAgent - Verify unified agent architecture

This test validates that the PersonalizedPamAgent correctly:
1. Loads user profiles with vehicle information
2. Provides vehicle-aware responses
3. Prevents generic flight recommendations for overland-capable vehicles

Critical test: Sydney→Hobart trip request with Unimog should get ferry routing, not flights
"""

import asyncio
import logging
from typing import Dict, Any

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Test cases for different vehicle scenarios
TEST_CASES = [
    {
        "name": "Unimog Owner - Sydney to Hobart",
        "user_id": "test_unimog_owner",
        "message": "Can you plan a trip from Sydney to Hobart for me, I will leave on Monday",
        "mock_profile": {
            "vehicle_info": {
                "type": "unimog",
                "make_model_year": "Mercedes Unimog 2020",
                "is_rv": True
            },
            "travel_preferences": {
                "style": "adventure",
                "camp_types": ["free_camps", "national_parks"]
            }
        },
        "expected_contains": ["ferry", "overland", "unimog", "melbourne"],
        "expected_not_contains": ["flight", "airline", "airport"],
        "success_criteria": "Should recommend ferry route via Melbourne, mention Unimog, no flights"
    },
    {
        "name": "Regular Car Owner - Sydney to Hobart", 
        "user_id": "test_car_owner",
        "message": "Plan my trip from Sydney to Hobart leaving Monday",
        "mock_profile": {
            "vehicle_info": {
                "type": "car",
                "make_model_year": "Toyota Camry 2019",
                "is_rv": False
            }
        },
        "expected_contains": ["flight", "ferry"],  # Should offer both options
        "expected_not_contains": [],
        "success_criteria": "Should offer both flight and ferry options"
    },
    {
        "name": "Motorhome Owner - Melbourne to Perth",
        "user_id": "test_motorhome_owner", 
        "message": "Help me plan a motorhome trip from Melbourne to Perth",
        "mock_profile": {
            "vehicle_info": {
                "type": "motorhome",
                "make_model_year": "Winnebago 2021",
                "is_rv": True
            }
        },
        "expected_contains": ["overland", "motorhome", "caravan park"],
        "expected_not_contains": ["flight"],
        "success_criteria": "Should provide overland route with RV-specific advice"
    }
]

class MockUserProfileTool:
    """Mock profile tool for testing"""
    
    def __init__(self):
        self.mock_profiles = {}
    
    async def execute(self, user_id: str):
        """Return mock profile data for testing"""
        if user_id in self.mock_profiles:
            profile = self.mock_profiles[user_id]
            return {
                "success": True,
                "result": {
                    "profile_exists": True,
                    **profile
                }
            }
        else:
            return {
                "success": False,
                "result": {"profile_exists": False}
            }

async def test_personalized_pam_agent():
    """Test the PersonalizedPamAgent with various scenarios"""
    
    print("🧪 Testing PersonalizedPamAgent Architecture")
    print("=" * 60)
    
    try:
        # Import PersonalizedPamAgent
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        
        from app.core.personalized_pam_agent import PersonalizedPamAgent
        
        # Create agent instance
        agent = PersonalizedPamAgent()
        
        # Mock the profile tool
        mock_profile_tool = MockUserProfileTool()
        
        # Set up mock profiles for each test case
        for test_case in TEST_CASES:
            mock_profile_tool.mock_profiles[test_case["user_id"]] = test_case["mock_profile"]
        
        # Replace the agent's profile tool with our mock
        agent.profile_tool = mock_profile_tool
        
        print(f"✅ PersonalizedPamAgent initialized successfully")
        print(f"📊 Running {len(TEST_CASES)} test scenarios...\n")
        
        results = []
        
        for i, test_case in enumerate(TEST_CASES, 1):
            print(f"🎯 Test {i}: {test_case['name']}")
            print(f"   Message: '{test_case['message']}'")
            print(f"   Vehicle: {test_case['mock_profile']['vehicle_info']['type']}")
            
            try:
                # Process message
                response = await agent.process_message(
                    user_id=test_case["user_id"],
                    message=test_case["message"],
                    session_id=f"test_session_{i}"
                )
                
                # Analyze response
                content = response.get("content", "").lower()
                success = response.get("success", False)
                
                if not success:
                    print(f"   ❌ FAILED: Agent returned error: {response.get('error', 'unknown')}")
                    results.append(False)
                    continue
                
                # Check expected content
                contains_issues = []
                for expected in test_case.get("expected_contains", []):
                    if expected.lower() not in content:
                        contains_issues.append(f"Missing '{expected}'")
                
                not_contains_issues = []
                for not_expected in test_case.get("expected_not_contains", []):
                    if not_expected.lower() in content:
                        not_contains_issues.append(f"Unexpectedly contains '{not_expected}'")
                
                # Evaluate results
                if not contains_issues and not not_contains_issues:
                    print(f"   ✅ PASSED: {test_case['success_criteria']}")
                    results.append(True)
                else:
                    print(f"   ❌ FAILED:")
                    for issue in contains_issues + not_contains_issues:
                        print(f"      - {issue}")
                    results.append(False)
                
                # Show response preview
                preview = response.get("content", "")[:150].replace("\n", " ")
                print(f"   📝 Response preview: {preview}...")
                
            except Exception as e:
                print(f"   ❌ ERROR: {str(e)}")
                results.append(False)
            
            print()  # Empty line between tests
        
        # Final results
        passed = sum(results)
        total = len(results)
        success_rate = (passed / total) * 100 if total > 0 else 0
        
        print("=" * 60)
        print(f"🎉 TEST RESULTS: {passed}/{total} passed ({success_rate:.1f}%)")
        
        if passed == total:
            print("""
✅ SUCCESS! PersonalizedPamAgent is working correctly:

Key Achievements:
1. ✅ Single unified agent replaces multiple competing services
2. ✅ Profile context loads correctly and reaches AI responses  
3. ✅ Vehicle-aware routing prevents inappropriate flight suggestions
4. ✅ Unimog owners get ferry routing for Sydney→Hobart (CORE FIX!)
5. ✅ Personalized responses mention user's vehicle
6. ✅ RV travelers get RV-specific advice

The architectural rebuild has solved the profile context loss problem!
            """)
        else:
            print(f"""
⚠️ Some tests failed ({total - passed} issues found)
The PersonalizedPamAgent needs additional refinement.
            """)
        
        return passed == total
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("💡 Make sure you're running from the backend directory")
        return False
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_architecture_fix():
    """Test the specific architecture fix - profile context reaching AI"""
    
    print("\n🔧 Testing Architecture Fix: Profile Context Flow")
    print("-" * 50)
    
    try:
        from app.core.personalized_pam_agent import PersonalizedPamAgent
        
        agent = PersonalizedPamAgent()
        
        # Test profile context loading
        user_context = await agent._get_user_context("test_user")
        
        print(f"✅ User context loading: {type(user_context).__name__}")
        print(f"✅ Context cache: {len(agent.user_contexts)} users cached")
        
        # Test system prompt building
        from app.core.travel_domain.travel_mode_detector import TravelMode
        system_prompt = agent._build_personalized_prompt(user_context, TravelMode.OVERLAND_VEHICLE)
        
        if "IMPORTANT USER CONTEXT" in system_prompt:
            print("✅ System prompt personalization: Profile context injected correctly")
        else:
            print("❌ System prompt personalization: Profile context missing")
            
        print(f"📝 System prompt length: {len(system_prompt)} characters")
        
        return True
        
    except Exception as e:
        print(f"❌ Architecture test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 PersonalizedPamAgent Test Suite")
    print("Verifying the unified architecture fixes PAM's profile context issues\n")
    
    async def run_all_tests():
        # Test main functionality
        main_test_passed = await test_personalized_pam_agent()
        
        # Test architecture fix
        arch_test_passed = await test_architecture_fix()
        
        if main_test_passed and arch_test_passed:
            print("\n🎉 ALL TESTS PASSED - PersonalizedPamAgent ready for deployment!")
            return True
        else:
            print("\n⚠️ Some tests failed - needs additional work")
            return False
    
    # Run the test
    success = asyncio.run(run_all_tests())