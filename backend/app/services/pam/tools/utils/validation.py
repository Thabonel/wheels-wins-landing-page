"""
Input Validation Utilities

Reusable validation functions to ensure data integrity and provide
clear error messages for invalid inputs.
"""

from uuid import UUID
from typing import Optional, Any
from datetime import datetime

from app.services.pam.tools.exceptions import ValidationError


def validate_uuid(value: str, field_name: str) -> None:
    """
    Validate UUID format.

    Args:
        value: String to validate as UUID
        field_name: Name of field (for error messages)

    Raises:
        ValidationError: If value is not valid UUID format
    """
    if not value:
        raise ValidationError(
            f"{field_name} is required",
            context={field_name: value}
        )

    try:
        UUID(value)
    except (ValueError, AttributeError, TypeError):
        raise ValidationError(
            f"{field_name} must be valid UUID format",
            context={field_name: value}
        )


def validate_positive_number(value: float, field_name: str) -> None:
    """
    Validate number is positive.

    Args:
        value: Number to validate
        field_name: Name of field (for error messages)

    Raises:
        ValidationError: If value is not positive
    """
    if value is None:
        raise ValidationError(
            f"{field_name} is required",
            context={field_name: value}
        )

    try:
        if float(value) <= 0:
            raise ValidationError(
                f"{field_name} must be positive",
                context={field_name: value}
            )
    except (ValueError, TypeError):
        raise ValidationError(
            f"{field_name} must be a valid number",
            context={field_name: value}
        )


def validate_number_range(
    value: float,
    field_name: str,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None
) -> None:
    """
    Validate number is within range.

    Args:
        value: Number to validate
        field_name: Name of field (for error messages)
        min_value: Minimum allowed value (inclusive)
        max_value: Maximum allowed value (inclusive)

    Raises:
        ValidationError: If value is out of range
    """
    if value is None:
        raise ValidationError(
            f"{field_name} is required",
            context={field_name: value}
        )

    try:
        num_value = float(value)
    except (ValueError, TypeError):
        raise ValidationError(
            f"{field_name} must be a valid number",
            context={field_name: value}
        )

    if min_value is not None and num_value < min_value:
        raise ValidationError(
            f"{field_name} must be >= {min_value}",
            context={field_name: value, "min": min_value}
        )

    if max_value is not None and num_value > max_value:
        raise ValidationError(
            f"{field_name} must be <= {max_value}",
            context={field_name: value, "max": max_value}
        )


def validate_date_format(value: str, field_name: str, format: str = "%Y-%m-%d") -> None:
    """
    Validate date string format.

    Args:
        value: Date string to validate
        field_name: Name of field (for error messages)
        format: Expected date format (default: YYYY-MM-DD)

    Raises:
        ValidationError: If value is not valid date format
    """
    if not value:
        raise ValidationError(
            f"{field_name} is required",
            context={field_name: value}
        )

    try:
        datetime.strptime(value, format)
    except (ValueError, TypeError):
        raise ValidationError(
            f"{field_name} must be in {format} format",
            context={field_name: value, "expected_format": format}
        )


def validate_required(value: Any, field_name: str) -> None:
    """
    Validate field is not None or empty.

    Args:
        value: Value to validate
        field_name: Name of field (for error messages)

    Raises:
        ValidationError: If value is None or empty
    """
    if value is None or (isinstance(value, str) and value.strip() == ""):
        raise ValidationError(
            f"{field_name} is required",
            context={field_name: value}
        )
