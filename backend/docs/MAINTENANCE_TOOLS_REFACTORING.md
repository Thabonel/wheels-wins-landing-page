# Maintenance Tools Refactoring

**Date**: January 29, 2026
**Pattern Applied**: backend/docs/REFACTORING_PATTERN.md
**Files Refactored**: 2 files, 5 tools total

## Files Modified

### 1. maintenance_crud.py (3 tools)
- `create_maintenance_record()`
- `update_maintenance_record()`
- `delete_maintenance_record()`

### 2. maintenance_queries.py (2 tools)
- `get_maintenance_schedule()`
- `get_maintenance_history()`

## Changes Applied

### 1. Added Imports
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
)
```

### 2. Input Validation

**Before**: No validation
```python
async def create_maintenance_record(user_id: str, task: str, ...):
    try:
        supabase = get_supabase_client()
        # Direct database access
```

**After**: Comprehensive validation
```python
async def create_maintenance_record(user_id: str, task: str, ...):
    try:
        validate_uuid(user_id, "user_id")
        validate_date_format(service_date, "service_date")

        if not task or not task.strip():
            raise ValidationError(
                "Task description is required",
                context={"task": task}
            )

        if mileage is not None:
            validate_positive_number(mileage, "mileage")
```

### 3. Database Operations

**Before**: Direct Supabase calls with manual error checking
```python
result = supabase.table("maintenance_records").insert(record_data).execute()

if result.data:
    record = result.data[0]
    # success
else:
    return {"success": False, "error": "Failed to create"}
```

**After**: Safe wrappers with automatic error handling
```python
record = await safe_db_insert("maintenance_records", record_data, user_id)
# Continue with success path - exceptions are raised on failure
```

### 4. Error Handling

**Before**: Generic exception with error dict
```python
except Exception as e:
    logger.error(f"Error creating maintenance record: {e}")
    return {
        "success": False,
        "error": str(e)
    }
```

**After**: Specific exceptions with structured context
```python
except ValidationError:
    raise
except DatabaseError:
    raise
except Exception as e:
    logger.error(
        f"Unexpected error creating maintenance record",
        extra={"user_id": user_id, "task": task},
        exc_info=True
    )
    raise DatabaseError(
        "Failed to create maintenance record",
        context={"user_id": user_id, "task": task, "error": str(e)}
    )
```

### 5. Documentation Updates

Added `Raises` section to all docstrings:
```python
Raises:
    ValidationError: Invalid input parameters
    DatabaseError: Database operation failed
    ResourceNotFoundError: Record not found or multiple matches
```

## Tool-Specific Changes

### create_maintenance_record()
- Added validation for user_id, service_date, task, mileage, cost
- Replaced direct insert with safe_db_insert
- Added structured error context
- Input sanitization (strip whitespace from task and notes)

### update_maintenance_record()
- Added validation for user_id, new_date, new_mileage, cost
- Converted error dicts to ValidationError/ResourceNotFoundError
- Replaced direct update with safe_db_update
- Better error messages for multiple matches

### delete_maintenance_record()
- Added user_id validation
- Converted confirmation check to ValidationError
- Replaced direct delete with safe_db_delete
- Improved error context for not found cases

### get_maintenance_schedule()
- Added user_id validation
- Added status validation (all/upcoming/overdue)
- Added limit validation (1-100)
- Converted generic exceptions to DatabaseError

### get_maintenance_history()
- Added user_id validation
- Added limit validation (1-100)
- Converted generic exceptions to DatabaseError
- Improved error logging with context

## Validation Rules Applied

| Parameter | Validation | Tool |
|-----------|-----------|------|
| user_id | UUID format | All |
| service_date | YYYY-MM-DD format | create_maintenance_record |
| new_date | YYYY-MM-DD format | update_maintenance_record |
| task | Non-empty string | create_maintenance_record |
| mileage | Positive number | create/update |
| cost | Positive number | create/update |
| status | One of: all/upcoming/overdue | get_maintenance_schedule |
| limit | 1-100 | get_maintenance_schedule, get_maintenance_history |

## Error Types Now Raised

| Error Type | When Raised | Tools |
|------------|-------------|-------|
| ValidationError | Invalid input parameters | All |
| ValidationError | Missing confirmation | delete_maintenance_record |
| ValidationError | Multiple matches found | update/delete |
| ValidationError | No updates provided | update_maintenance_record |
| ResourceNotFoundError | Record not found | update/delete |
| DatabaseError | Database operation failed | All |

## Benefits Achieved

1. **Type Safety**: Input validation ensures correct types early
2. **Consistent Errors**: All errors have structured context
3. **Better Debugging**: Structured logging with extra fields
4. **Reduced Duplication**: Validation logic centralized
5. **Clearer Intent**: Exceptions replace error dicts
6. **Caller Control**: Different error types can be handled differently

## Testing Recommendations

Test the following error scenarios:
1. Invalid UUID format for user_id
2. Invalid date format for service_date/new_date
3. Negative numbers for mileage/cost
4. Empty task description
5. Invalid status filter
6. Limit outside 1-100 range
7. Record not found cases
8. Multiple record matches
9. Delete without confirmation
10. Update with no changes

## Next Steps

This refactoring pattern should be applied to:
- Remaining 80 PAM tools (see backend/docs/TOOL_CATEGORIES.md)
- Priority: Budget tools (10 tools)
- Priority: Trip tools (10+ tools)
- Priority: Social tools (10 tools)

## Verification

Syntax check passed:
```bash
python -m py_compile app/services/pam/tools/maintenance/maintenance_crud.py
python -m py_compile app/services/pam/tools/maintenance/maintenance_queries.py
```

No compilation errors.
