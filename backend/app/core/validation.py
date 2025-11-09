"""
Input validation utilities for user registration and authentication.

This module provides robust validation for user inputs, particularly
focusing on password strength requirements and email sanitization.
"""

import re
from typing import Dict, List, Tuple
from email_validator import validate_email, EmailNotValidError


class PasswordValidationError(Exception):
    """Raised when password does not meet requirements"""
    pass


class InputValidationError(Exception):
    """Raised when input validation fails"""
    pass


def validate_password_strength(password: str) -> Tuple[bool, List[str]]:
    """
    Validate password against strong security requirements.

    Requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character (@$!%*?&)
    - No common patterns (e.g., "password", "12345678")

    Args:
        password: The password to validate

    Returns:
        Tuple of (is_valid, list_of_errors)

    Example:
        >>> is_valid, errors = validate_password_strength("Test@123")
        >>> if not is_valid:
        ...     print("Password errors:", errors)
    """
    errors = []

    # Check minimum length
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")

    # Check maximum length (prevent DoS attacks)
    if len(password) > 128:
        errors.append("Password must not exceed 128 characters")

    # Check for uppercase letter
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")

    # Check for lowercase letter
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")

    # Check for digit
    if not re.search(r'\d', password):
        errors.append("Password must contain at least one number")

    # Check for special character
    if not re.search(r'[@$!%*?&]', password):
        errors.append("Password must contain at least one special character (@$!%*?&)")

    # Check for common patterns
    common_patterns = [
        'password', 'Password', 'PASSWORD',
        '12345678', '87654321',
        'qwerty', 'QWERTY',
        'abc123', 'ABC123',
        '11111111', '00000000'
    ]

    password_lower = password.lower()
    for pattern in common_patterns:
        if pattern.lower() in password_lower:
            errors.append("Password contains common patterns and is too weak")
            break

    # Check for sequential characters (e.g., "abcd", "1234")
    if re.search(r'(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)', password_lower):
        errors.append("Password contains sequential characters")

    if re.search(r'(0123|1234|2345|3456|4567|5678|6789)', password):
        errors.append("Password contains sequential numbers")

    # Check for repeated characters (e.g., "aaaa", "1111")
    if re.search(r'(.)\1{3,}', password):
        errors.append("Password contains too many repeated characters")

    return (len(errors) == 0, errors)


def sanitize_email(email: str) -> str:
    """
    Sanitize and validate email address.

    Args:
        email: The email address to sanitize

    Returns:
        Sanitized email address (lowercase, trimmed)

    Raises:
        InputValidationError: If email is invalid
    """
    if not email:
        raise InputValidationError("Email address is required")

    # Trim whitespace
    email = email.strip()

    # Convert to lowercase
    email = email.lower()

    # Validate using email-validator library
    try:
        # This checks:
        # - Valid email format
        # - DNS records exist (optional, can be disabled)
        # - No dangerous characters
        valid = validate_email(email, check_deliverability=False)
        return valid.normalized
    except EmailNotValidError as e:
        raise InputValidationError(f"Invalid email address: {str(e)}")


def sanitize_name(name: str) -> str:
    """
    Sanitize user's full name.

    Args:
        name: The name to sanitize

    Returns:
        Sanitized name (trimmed, no dangerous characters)

    Raises:
        InputValidationError: If name contains invalid characters
    """
    if not name:
        return ""

    # Trim whitespace
    name = name.strip()

    # Check maximum length
    if len(name) > 100:
        raise InputValidationError("Name must not exceed 100 characters")

    # Allow letters, spaces, hyphens, apostrophes, and accented characters
    # Block control characters and other dangerous input
    if re.search(r'[<>{}[\]\\|;:"`]', name):
        raise InputValidationError("Name contains invalid characters")

    # Check for excessive whitespace
    if re.search(r'\s{2,}', name):
        # Replace multiple spaces with single space
        name = re.sub(r'\s+', ' ', name)

    return name


def validate_registration_input(
    email: str,
    password: str,
    full_name: str = None
) -> Dict[str, str]:
    """
    Validate all registration inputs.

    Args:
        email: Email address
        password: Password
        full_name: Optional full name

    Returns:
        Dictionary with sanitized inputs

    Raises:
        InputValidationError: If any validation fails
        PasswordValidationError: If password is weak
    """
    errors = []

    # Validate and sanitize email
    try:
        sanitized_email = sanitize_email(email)
    except InputValidationError as e:
        errors.append(str(e))
        sanitized_email = None

    # Validate password strength
    is_valid, password_errors = validate_password_strength(password)
    if not is_valid:
        errors.extend(password_errors)

    # Validate and sanitize name if provided
    sanitized_name = None
    if full_name:
        try:
            sanitized_name = sanitize_name(full_name)
        except InputValidationError as e:
            errors.append(str(e))

    # If there are any errors, raise exception
    if errors:
        raise InputValidationError("; ".join(errors))

    return {
        "email": sanitized_email,
        "password": password,  # Keep original password for hashing
        "full_name": sanitized_name
    }


def get_password_requirements() -> List[str]:
    """
    Get list of password requirements for display to users.

    Returns:
        List of password requirement strings
    """
    return [
        "At least 8 characters long",
        "At least one uppercase letter (A-Z)",
        "At least one lowercase letter (a-z)",
        "At least one number (0-9)",
        "At least one special character (@$!%*?&)",
        "No common patterns (e.g., 'password', '12345678')",
        "No sequential characters (e.g., 'abcd', '1234')",
        "No repeated characters (e.g., 'aaaa')"
    ]
