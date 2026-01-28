"""
PAM Tool Utilities

Shared utilities for validation, database operations, and common patterns.
"""

from .validation import (
    validate_uuid,
    validate_positive_number,
    validate_number_range,
    validate_date_format,
    validate_required,
)

from .database import (
    get_user_profile,
    safe_db_insert,
    safe_db_update,
    safe_db_delete,
    safe_db_select,
)

__all__ = [
    # Validation
    "validate_uuid",
    "validate_positive_number",
    "validate_number_range",
    "validate_date_format",
    "validate_required",
    # Database
    "get_user_profile",
    "safe_db_insert",
    "safe_db_update",
    "safe_db_delete",
    "safe_db_select",
]
