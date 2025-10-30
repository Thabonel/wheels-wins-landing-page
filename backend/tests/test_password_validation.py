"""
Test password validation logic
"""

import sys
sys.path.insert(0, '/Users/thabonel/Code/wheels-wins-landing-page/backend')

from app.core.validation import validate_password_strength, get_password_requirements


def test_password_validation():
    """Test various password scenarios"""

    test_cases = [
        # (password, should_be_valid, description)
        ("Test@123", True, "Strong password"),
        ("MyP@ssw0rd", True, "Strong password with mixed case"),
        ("Complex!2Pass", True, "Complex password"),
        ("short", False, "Too short"),
        ("password", False, "Common pattern (lowercase)"),
        ("Password123", False, "Missing special character"),
        ("PASSWORD@123", False, "Missing lowercase"),
        ("password@123", False, "Missing uppercase + common pattern"),
        ("NoSpecial123", False, "Missing special character"),
        ("NoNumbers@", False, "Missing numbers"),
        ("12345678", False, "Common pattern (sequential)"),
        ("qwerty@1A", False, "Common pattern (qwerty)"),
        ("A" * 129, False, "Too long (>128 chars)"),
        ("StrongP@ss1", True, "Valid strong password"),
        ("aaaaAAAA@1", False, "Repeated characters"),
        ("Abcd1234@", False, "Sequential characters"),
    ]

    print("\n" + "="*80)
    print("PASSWORD VALIDATION TEST RESULTS")
    print("="*80 + "\n")

    passed = 0
    failed = 0

    for password, expected_valid, description in test_cases:
        is_valid, errors = validate_password_strength(password)

        # Check if result matches expectation
        if is_valid == expected_valid:
            status = "✅ PASS"
            passed += 1
        else:
            status = "❌ FAIL"
            failed += 1

        # Display result
        print(f"{status} | {description}")
        print(f"   Password: '{password[:20]}{'...' if len(password) > 20 else ''}'")
        print(f"   Expected: {'VALID' if expected_valid else 'INVALID'}")
        print(f"   Got: {'VALID' if is_valid else 'INVALID'}")

        if errors:
            print(f"   Errors: {', '.join(errors[:2])}{'...' if len(errors) > 2 else ''}")

        print()

    print("="*80)
    print(f"SUMMARY: {passed} passed, {failed} failed out of {len(test_cases)} tests")
    print("="*80 + "\n")

    # Print password requirements
    print("PASSWORD REQUIREMENTS:")
    for req in get_password_requirements():
        print(f"  - {req}")

    return failed == 0


if __name__ == "__main__":
    success = test_password_validation()
    sys.exit(0 if success else 1)
