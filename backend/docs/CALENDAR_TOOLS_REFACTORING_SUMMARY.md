# Calendar Tools Refactoring Summary

**Date**: January 29, 2026
**Pattern Applied**: `backend/docs/REFACTORING_PATTERN.md`
**Reference Implementation**: `backend/app/services/pam/tools/fuel/fuel_crud.py`

## Refactored Files

1. `backend/app/services/pam/tools/create_calendar_event.py`
2. `backend/app/services/pam/tools/update_calendar_event.py`
3. `backend/app/services/pam/tools/delete_calendar_event.py`

## Changes Applied

### 1. Import Statements

**Added:**
```python
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
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
validate_uuid(event_id, "event_id")
if start_date:
    validate_date_format(start_date, "start_date")
if end_date:
    validate_date_format(end_date, "end_date")
```

### 3. Error Handling

**Before:**
```python
if not existing_response.data:
    return {
        "success": False,
        "error": "Event not found"
    }
```

**After:**
```python
if not existing_response.data:
    raise ResourceNotFoundError(
        "Calendar event not found or you don't have permission to modify it",
        context={"user_id": user_id, "event_id": event_id}
    )
```

### 4. Database Operations

**Before:**
```python
supabase = get_supabase_service()
response = supabase.table("calendar_events").insert(event_data).execute()

if response.data:
    event = response.data[0]
    # ... success
else:
    return {"success": False, "error": "Failed"}
```

**After:**
```python
# safe_db_insert raises exception on failure
event = await safe_db_insert("calendar_events", event_data, user_id)
# Continue with success path
```

### 5. Exception Handling

**Before:**
```python
except Exception as e:
    logger.error(f"Error creating calendar event: {e}")
    return {"success": False, "error": str(e)}
```

**After:**
```python
except ValidationError:
    raise
except ResourceNotFoundError:
    raise
except DatabaseError:
    raise
except Exception as e:
    logger.error(
        f"Unexpected error creating calendar event",
        extra={"user_id": user_id, "title": title},
        exc_info=True
    )
    raise DatabaseError(
        "Failed to create calendar event",
        context={"user_id": user_id, "error": str(e)}
    )
```

### 6. Documentation

**Added to all docstrings:**
```python
Raises:
    ValidationError: Invalid input parameters
    ResourceNotFoundError: Event not found (update/delete only)
    DatabaseError: Database operation failed
```

## File-Specific Changes

### create_calendar_event.py

- Added `validate_uuid()` for user_id validation
- Replaced Pydantic `ValidationError` with custom `ValidationError` (renamed Pydantic import to `PydanticValidationError`)
- Replaced direct database insert with `safe_db_insert()`
- Added structured error context with timezone and datetime info
- Improved logging with `extra` context

### update_calendar_event.py

- Added `validate_uuid()` for user_id and event_id
- Added `validate_date_format()` for date strings
- Replaced direct database update with `safe_db_update()`
- Added validation for empty update_data
- Improved event_type validation with proper exception
- Enhanced error context with all relevant fields

### delete_calendar_event.py

- Added `validate_uuid()` for user_id and event_id
- Replaced direct database delete with `safe_db_delete()`
- Improved error messages with structured context
- Enhanced logging with extra context

## Benefits

1. **Consistent Error Handling**: All tools now raise typed exceptions with structured context
2. **Input Validation**: Early validation prevents invalid data from reaching the database
3. **Reduced Duplication**: Shared validation and database logic in utility functions
4. **Better Debugging**: Structured logging with extra context makes troubleshooting easier
5. **Type Safety**: UUID and date format validation ensures correct types
6. **Cleaner Code**: Less boilerplate, clearer intent, easier to maintain

## Testing Checklist

- [ ] Test create_calendar_event with invalid user_id (should raise ValidationError)
- [ ] Test create_calendar_event with invalid date format (should raise ValidationError)
- [ ] Test create_calendar_event with end_date before start_date (should raise ValidationError)
- [ ] Test update_calendar_event with non-existent event_id (should raise ResourceNotFoundError)
- [ ] Test update_calendar_event with invalid event_type (should raise ValidationError)
- [ ] Test update_calendar_event with no update data (should raise ValidationError)
- [ ] Test delete_calendar_event with non-existent event_id (should raise ResourceNotFoundError)
- [ ] Test all operations with database connection failure (should raise DatabaseError)

## Next Steps

This refactoring pattern should be applied to the remaining PAM tools:
- Trip tools (10+ tools)
- Budget tools (10 tools)
- Social tools (10 tools)
- Shop tools (5 tools)
- Profile tools (5+ tools)
- Admin tools (2 tools)

Total: ~85 registered tools to refactor
