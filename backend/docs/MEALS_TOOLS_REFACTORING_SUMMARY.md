# Meals Tools Refactoring Summary

**Date**: January 29, 2026
**Pattern Applied**: backend/docs/REFACTORING_PATTERN.md
**Reference Implementation**: backend/app/services/pam/tools/fuel/fuel_crud.py

## Files Refactored (7 total)

1. ✅ backend/app/services/pam/tools/meals/generate_shopping_list.py
2. ✅ backend/app/services/pam/tools/meals/manage_dietary_prefs.py
3. ✅ backend/app/services/pam/tools/meals/manage_pantry.py
4. ✅ backend/app/services/pam/tools/meals/plan_meals.py
5. ✅ backend/app/services/pam/tools/meals/save_recipe.py
6. ✅ backend/app/services/pam/tools/meals/search_recipes.py
7. ✅ backend/app/services/pam/tools/meals/share_recipe.py

## Changes Applied to Each File

### 1. Imports Added
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
async def manage_pantry(user_id: str, action: str, ...):
    try:
        supabase = get_supabase_client()
```

**After**: Comprehensive validation
```python
async def manage_pantry(user_id: str, action: str, ...):
    try:
        validate_uuid(user_id, "user_id")

        valid_actions = ["add", "update", "remove", "list", "check_expiry"]
        if action not in valid_actions:
            raise ValidationError(
                f"Invalid action. Must be one of: {', '.join(valid_actions)}",
                context={"action": action, "valid_actions": valid_actions}
            )

        if quantity is not None:
            validate_positive_number(quantity, "quantity")
```

### 3. Database Operations
**Before**: Direct Supabase calls with manual error checking
```python
result = supabase.table("pantry_items").insert(data).execute()

if result.data:
    return {"success": True, "item": result.data[0]}
else:
    return {"success": False, "error": "Failed"}
```

**After**: Safe database wrappers
```python
item = await safe_db_insert("pantry_items", data, user_id)

return {
    "success": True,
    "item": item,
    "message": f"Added {quantity} {unit} of {ingredient_name} to your pantry"
}
```

### 4. Error Handling
**Before**: Generic exceptions with error dicts
```python
except Exception as e:
    logger.error(f"Error managing pantry: {str(e)}")
    return {
        "success": False,
        "error": str(e)
    }
```

**After**: Specific exception types with context
```python
except ValidationError:
    raise
except ResourceNotFoundError:
    raise
except DatabaseError:
    raise
except Exception as e:
    logger.error(
        f"Unexpected error managing pantry",
        extra={"user_id": user_id, "action": action, "item_id": item_id},
        exc_info=True
    )
    raise DatabaseError(
        "Failed to manage pantry",
        context={"user_id": user_id, "action": action, "error": str(e)}
    )
```

### 5. Validation Instead of Error Dicts
**Before**: Return error dicts
```python
if not ingredient_name or quantity is None or not unit:
    return {
        "success": False,
        "error": "ingredient_name, quantity, and unit are required"
    }
```

**After**: Raise ValidationError
```python
if not ingredient_name or quantity is None or not unit:
    raise ValidationError(
        "ingredient_name, quantity, and unit are required for adding items",
        context={"ingredient_name": ingredient_name, "quantity": quantity, "unit": unit}
    )
```

### 6. Docstring Updates
**Added to all functions**:
```python
Raises:
    ValidationError: Invalid input parameters
    DatabaseError: Database operation failed
    ResourceNotFoundError: Resource not found
```

## Tool-Specific Changes

### generate_shopping_list.py
- Added validation for user_id, dates, meal_plan_ids
- Changed ResourceNotFoundError for no meal plans (was error dict)
- Replaced direct insert with safe_db_insert
- Added structured exception handling

### manage_dietary_prefs.py
- Added validation for user_id and action
- Added validation for nutrition goals (positive numbers)
- Changed ValidationError for invalid action (was error dict)
- Improved error context in exception handlers

### manage_pantry.py
- Added validation for user_id, item_id, action, quantity, expiry_date
- Replaced direct insert/update/delete with safe_db_* wrappers
- Changed ValidationError for missing required fields
- Changed ResourceNotFoundError for item not found (was error dict)

### plan_meals.py
- Added validation for user_id, days (must be positive, max 30)
- Changed ResourceNotFoundError for no recipes (was error dict)
- Changed ValidationError for AI parsing failure
- Replaced direct insert with safe_db_insert in loop

### save_recipe.py
- Added validation for user_id and URL format
- Changed ValidationError for missing/invalid URL
- Changed ValidationError for recipe extraction failure
- Changed DatabaseError for save failure
- Improved error context with URL information

### search_recipes.py
- Added validation for user_id, limit (positive, max 100)
- Added validation for max_prep_time
- Enhanced error logging with search parameters
- Added structured exception handling

### share_recipe.py
- Added validation for user_id, recipe_id, friend_ids, action
- Changed ResourceNotFoundError for recipe not found
- Changed ValidationError for missing friend_ids
- Improved error context with recipe and action info

## Benefits Achieved

1. **Type Safety**: All inputs validated early
2. **Specific Errors**: Caller can distinguish validation vs database errors
3. **Structured Context**: All errors include relevant context for debugging
4. **Reduced Boilerplate**: Validation logic in utils, not duplicated
5. **Better Logging**: Extra context in all error logs
6. **Consistent Pattern**: All 7 tools follow same pattern
7. **Database Safety**: All DB operations use safe wrappers with automatic error handling

## Verification

```bash
# Syntax check passed
python -m py_compile app/services/pam/tools/meals/*.py
✓ All meals tools compile successfully
```

## Next Steps

- Apply same pattern to remaining 78 tools across other categories
- Update tests to expect exceptions instead of error dicts
- Monitor production for any issues with exception handling
