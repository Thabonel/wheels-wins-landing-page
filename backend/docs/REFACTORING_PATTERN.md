# Tool Refactoring Pattern

This document shows the before/after pattern for refactoring PAM tools to use the new exception hierarchy and utility functions.

## Example: add_fuel_entry()

### BEFORE (Generic Error Handling)

```python
"""
PAM Fuel CRUD Tools
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, date, timedelta

from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)

async def add_fuel_entry(
    user_id: str,
    odometer: float,
    volume: Optional[float] = None,
    # ... other params
) -> Dict[str, Any]:
    """
    Add a fuel log entry with smart calculation.

    Returns:
        Dict with created entry and consumption info
    """
    try:
        # No validation - assumes input is valid

        # Manual calculation logic
        provided = sum(x is not None for x in [volume, price, total])
        if provided < 2:
            return {
                "success": False,
                "needs_more_info": True,
                "error": "Please provide at least 2 of: volume, price per unit, total cost",
                # ... dict with error details
            }

        # Direct database access
        supabase = get_supabase_client()
        result = supabase.table("fuel_log").insert(record_data).execute()

        if result.data:
            entry = result.data[0]
            logger.info(f"Added fuel entry for user {user_id}: {volume}L @ ${price}/L")
            return {
                "success": True,
                "entry_id": entry.get("id"),
                # ... success dict
            }
        else:
            return {
                "success": False,
                "error": "Failed to create fuel entry"
            }

    except Exception as e:
        # Generic exception handling - loses error context
        logger.error(f"Error adding fuel entry: {e}")
        return {
            "success": False,
            "error": str(e)
        }
```

### AFTER (Custom Exceptions & Utilities)

```python
"""
PAM Fuel CRUD Tools
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, date, timedelta

from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    validate_date_format,
    safe_db_insert,
    safe_db_update,
    safe_db_delete,
    safe_db_select,
)

logger = logging.getLogger(__name__)

async def add_fuel_entry(
    user_id: str,
    odometer: float,
    volume: Optional[float] = None,
    # ... other params
) -> Dict[str, Any]:
    """
    Add a fuel log entry with smart calculation.

    Returns:
        Dict with created entry and consumption info

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        # Validate inputs using utility functions
        validate_uuid(user_id, "user_id")
        validate_positive_number(odometer, "odometer")

        if entry_date:
            validate_date_format(entry_date, "entry_date")

        # Calculate missing value (same logic)
        provided = sum(x is not None for x in [volume, price, total])
        if provided < 2:
            # Raise exception instead of returning error dict
            raise ValidationError(
                "Please provide at least 2 of: volume, price per unit, total cost",
                context={
                    "missing": {
                        "volume": volume is None,
                        "price": price is None,
                        "total": total is None
                    }
                }
            )

        # ... calculation logic (same)

        # Use safe database wrapper
        entry = await safe_db_insert("fuel_log", record_data, user_id)

        # No need to check if result.data - safe_db_insert raises exception on failure
        logger.info(f"Added fuel entry for user {user_id}: {volume}L @ ${price}/L")

        return {
            "success": True,
            "entry_id": entry.get("id"),
            # ... success dict
        }

    except ValidationError:
        # Re-raise custom exceptions as-is
        raise
    except DatabaseError:
        raise
    except Exception as e:
        # Convert unexpected errors to DatabaseError with context
        logger.error(
            f"Unexpected error adding fuel entry",
            extra={"user_id": user_id, "odometer": odometer},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to add fuel entry",
            context={"user_id": user_id, "error": str(e)}
        )
```

## Key Changes

### 1. Imports
**Add:**
```python
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    validate_date_format,
    safe_db_insert,
    safe_db_update,
    safe_db_delete,
    safe_db_select,
)
```

### 2. Input Validation
**Before:**
```python
# No validation - assumes input is valid
```

**After:**
```python
validate_uuid(user_id, "user_id")
validate_positive_number(odometer, "odometer")
if entry_date:
    validate_date_format(entry_date, "entry_date")
```

### 3. Error Handling
**Before:**
```python
if provided < 2:
    return {
        "success": False,
        "error": "..."
    }
```

**After:**
```python
if provided < 2:
    raise ValidationError(
        "Please provide at least 2 of: volume, price per unit, total cost",
        context={"missing": {...}}
    )
```

### 4. Database Operations
**Before:**
```python
supabase = get_supabase_client()
result = supabase.table("fuel_log").insert(record_data).execute()

if result.data:
    entry = result.data[0]
    # ... success
else:
    return {"success": False, "error": "Failed"}
```

**After:**
```python
# safe_db_insert raises exception on failure
entry = await safe_db_insert("fuel_log", record_data, user_id)
# Continue with success path
```

### 5. Exception Handling
**Before:**
```python
except Exception as e:
    logger.error(f"Error adding fuel entry: {e}")
    return {"success": False, "error": str(e)}
```

**After:**
```python
except ValidationError:
    raise  # Re-raise custom exceptions
except DatabaseError:
    raise
except Exception as e:
    logger.error(
        f"Unexpected error adding fuel entry",
        extra={"user_id": user_id, "odometer": odometer},
        exc_info=True
    )
    raise DatabaseError(
        "Failed to add fuel entry",
        context={"user_id": user_id, "error": str(e)}
    )
```

### 6. Documentation
**Add to docstring:**
```python
Raises:
    ValidationError: Invalid input parameters
    DatabaseError: Database operation failed
```

## Benefits

1. **Specific Error Types**: Caller can handle different errors differently
2. **Consistent Error Context**: All errors include structured context
3. **Reduced Duplication**: Validation and database logic in one place
4. **Better Logging**: Structured logging with extra context
5. **Cleaner Code**: Less boilerplate, clearer intent
6. **Type Safety**: Validation ensures correct types early

## Apply to All Tools

This pattern should be applied to all 85 registered tools:
- Add validation for all inputs
- Use safe_db_* wrappers for database operations
- Replace generic exceptions with specific types
- Add proper context to all errors
- Update docstrings with Raises section
