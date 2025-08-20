#!/usr/bin/env python3
"""
Test script to validate PAM prompts are optimized for GPT-5
Tests the balance between companion personality and efficient execution
"""

import sys
import os

# Read the prompt file directly to avoid config dependencies
prompt_file_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "app/services/pam/prompts/enhanced_pam_prompt.py"
)

with open(prompt_file_path, 'r') as f:
    content = f.read()
    # Extract the prompt string
    start = content.find('ENHANCED_PAM_SYSTEM_PROMPT = """') + len('ENHANCED_PAM_SYSTEM_PROMPT = """')
    end = content.find('"""', start)
    ENHANCED_PAM_SYSTEM_PROMPT = content[start:end]

def test_gpt5_specifications():
    """Test that GPT-5 specifications are present"""
    print("🔍 Testing GPT-5 Specifications...")
    
    required_sections = [
        "GPT-5 EXECUTION SPECIFICATIONS",
        "TASK:",
        "DELIVERABLE:",
        "ASSUMPTIONS:",
        "NON-GOALS:",
        "ACCEPTANCE:"
    ]
    
    for section in required_sections:
        if section in ENHANCED_PAM_SYSTEM_PROMPT:
            print(f"  ✅ Found: {section}")
        else:
            print(f"  ❌ Missing: {section}")
            return False
    
    return True

def test_intent_clarity_protocol():
    """Test that intent clarity thresholds are defined"""
    print("\n📋 Testing Intent Clarity Protocol...")
    
    clarity_levels = [
        ">80% clear",
        "50-80% clear", 
        "<50% clear"
    ]
    
    for level in clarity_levels:
        if level in ENHANCED_PAM_SYSTEM_PROMPT:
            print(f"  ✅ Found clarity level: {level}")
        else:
            print(f"  ❌ Missing clarity level: {level}")
            return False
    
    return True

def test_tool_execution_policies():
    """Test that tool policies are clearly defined"""
    print("\n🔧 Testing Tool Execution Policies...")
    
    policy_sections = [
        "AUTO-EXECUTE (No Permission Needed)",
        "CONFIRM BEFORE EXECUTING",
        "NEVER USE WITHOUT EXPLICIT REQUEST"
    ]
    
    for policy in policy_sections:
        if policy in ENHANCED_PAM_SYSTEM_PROMPT:
            print(f"  ✅ Found policy: {policy}")
        else:
            print(f"  ❌ Missing policy: {policy}")
            return False
    
    return True

def test_failure_mode_prevention():
    """Test that failure mode prevention is included"""
    print("\n⚠️  Testing Failure Mode Prevention...")
    
    failure_modes = [
        "PREVENT SPECULATIVE OVER-COMPLETION",
        "PREVENT UNINTENDED TOOL USE",
        "PREVENT LOST CONTEXT",
        "PREVENT WRONG ASSUMPTIONS"
    ]
    
    for mode in failure_modes:
        if mode in ENHANCED_PAM_SYSTEM_PROMPT:
            print(f"  ✅ Found prevention: {mode}")
        else:
            print(f"  ❌ Missing prevention: {mode}")
            return False
    
    return True

def test_companion_personality_preserved():
    """Test that companion personality is maintained"""
    print("\n💬 Testing Companion Personality Preservation...")
    
    personality_markers = [
        "warm",
        "emotionally intelligent",
        "genuinely care",
        "relationships",
        "trusted",
        "friend"
    ]
    
    prompt_lower = ENHANCED_PAM_SYSTEM_PROMPT.lower()
    for marker in personality_markers:
        if marker in prompt_lower:
            print(f"  ✅ Personality preserved: {marker}")
        else:
            print(f"  ❌ Missing personality trait: {marker}")
            return False
    
    return True

def test_clarification_allowance():
    """Test that clarifying questions are still allowed"""
    print("\n❓ Testing Clarification Allowance...")
    
    if "clarifying question" in ENHANCED_PAM_SYSTEM_PROMPT:
        print("  ✅ Clarifying questions allowed when intent unclear")
    else:
        print("  ❌ No provision for clarifying questions")
        return False
    
    if "Ask focused clarification" in ENHANCED_PAM_SYSTEM_PROMPT:
        print("  ✅ Focused clarification for low clarity")
    else:
        print("  ❌ Missing focused clarification guidance")
        return False
    
    return True

def test_assumption_statements():
    """Test that assumptions are stated to prevent errors"""
    print("\n📝 Testing Assumption Statements...")
    
    assumption_phrases = [
        "state assumptions",
        "State assumptions",
        "stated assumptions",
        "Assuming you"
    ]
    
    found_any = False
    for phrase in assumption_phrases:
        if phrase in ENHANCED_PAM_SYSTEM_PROMPT:
            print(f"  ✅ Found assumption guidance: '{phrase}'")
            found_any = True
            break
    
    if not found_any:
        print("  ❌ No guidance on stating assumptions")
        return False
    
    return True

def main():
    """Run all tests"""
    print("=" * 60)
    print("PAM GPT-5 PROMPT OPTIMIZATION TEST SUITE")
    print("=" * 60)
    
    tests = [
        ("GPT-5 Specifications", test_gpt5_specifications),
        ("Intent Clarity Protocol", test_intent_clarity_protocol),
        ("Tool Execution Policies", test_tool_execution_policies),
        ("Failure Mode Prevention", test_failure_mode_prevention),
        ("Companion Personality", test_companion_personality_preserved),
        ("Clarification Allowance", test_clarification_allowance),
        ("Assumption Statements", test_assumption_statements)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"  ❌ Test failed with error: {e}")
            failed += 1
    
    print("\n" + "=" * 60)
    print("TEST RESULTS")
    print("=" * 60)
    print(f"✅ Passed: {passed}/{len(tests)}")
    print(f"❌ Failed: {failed}/{len(tests)}")
    
    if failed == 0:
        print("\n🎉 SUCCESS: PAM prompts are optimized for GPT-5!")
        print("✨ Companion personality preserved")
        print("⚡ Efficient execution enabled")
        print("🛡️ Failure modes prevented")
    else:
        print("\n⚠️  Some optimizations are missing")
        sys.exit(1)

if __name__ == "__main__":
    main()