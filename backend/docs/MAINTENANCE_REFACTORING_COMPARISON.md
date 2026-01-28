# Maintenance Tools: Before/After Comparison

## create_maintenance_record() - Side-by-Side

### BEFORE (Generic Error Handling)

```python
async def create_maintenance_record(
    user_id: str,
    task: str,
    service_date: str,
    mileage: Optional[int] = None,
    notes: Optional[str] = None,
    cost: Optional[float] = None
) -> Dict[str, Any]:
    """
    Create a new maintenance record.

    Returns:
        Dict with created record details
    """
    try:
        supabase = get_supabase_client()

        # No validation - assumes input is valid

        # Manual date parsing with error dict
        try:
            parsed_date = datetime.strptime(service_date, "%Y-%m-%d").date()
        except ValueError:
            return {
                "success": False,
                "error": f"Invalid date format. Please use YYYY-MM-DD format."
            }

        # Direct database access
        record_data = {
            "user_id": user_id,
            "task": task,
            "date": service_date,
            "mileage": mileage or 0,
        }

        if notes:
            record_data["notes"] = notes
        if cost:
            record_data["cost"] = cost

        result = supabase.table("maintenance_records").insert(record_data).execute()

        # Manual success checking
        if result.data:
            record = result.data[0]
            is_future = parsed_date > date.today()
            action = "Scheduled" if is_future else "Logged"

            logger.info(f"{action} maintenance '{task}' for user {user_id}")

            message = f"{action} {task} for {service_date}"
            if mileage:
                message += f" at {mileage:,} miles"
            if cost:
                message += f" (${cost:.2f})"
            if is_future:
                days_until = (parsed_date - date.today()).days
                message += f". That's {days_until} days from now."

            return {
                "success": True,
                "record_id": record.get("id"),
                "record": record,
                "is_scheduled": is_future,
                "calendar_event_suggested": is_future,
                "message": message
            }
        else:
            # Generic error dict
            return {
                "success": False,
                "error": "Failed to create maintenance record"
            }

    except Exception as e:
        # Generic exception - loses context
        logger.error(f"Error creating maintenance record: {e}")
        return {
            "success": False,
            "error": str(e)
        }
```

### AFTER (Custom Exceptions & Utilities)

```python
async def create_maintenance_record(
    user_id: str,
    task: str,
    service_date: str,
    mileage: Optional[int] = None,
    notes: Optional[str] = None,
    cost: Optional[float] = None
) -> Dict[str, Any]:
    """
    Create a new maintenance record.

    Returns:
        Dict with created record details

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        # Input validation with utility functions
        validate_uuid(user_id, "user_id")
        validate_date_format(service_date, "service_date")

        if not task or not task.strip():
            raise ValidationError(
                "Task description is required",
                context={"task": task}
            )

        if mileage is not None:
            validate_positive_number(mileage, "mileage")

        if cost is not None:
            validate_positive_number(cost, "cost")

        # Date parsing with validation already done
        parsed_date = datetime.strptime(service_date, "%Y-%m-%d").date()

        # Input sanitization
        record_data = {
            "user_id": user_id,
            "task": task.strip(),
            "date": service_date,
            "mileage": mileage or 0,
        }

        if notes:
            record_data["notes"] = notes.strip()
        if cost:
            record_data["cost"] = cost

        # Safe database wrapper - raises exception on failure
        record = await safe_db_insert("maintenance_records", record_data, user_id)

        # No need to check result - exception raised on failure
        is_future = parsed_date > date.today()
        action = "Scheduled" if is_future else "Logged"

        logger.info(f"{action} maintenance '{task}' for user {user_id}")

        message = f"{action} {task} for {service_date}"
        if mileage:
            message += f" at {mileage:,} miles"
        if cost:
            message += f" (${cost:.2f})"
        if is_future:
            days_until = (parsed_date - date.today()).days
            message += f". That's {days_until} days from now."

        return {
            "success": True,
            "record_id": record.get("id"),
            "record": record,
            "is_scheduled": is_future,
            "calendar_event_suggested": is_future,
            "message": message
        }

    except ValidationError:
        # Re-raise custom exceptions as-is
        raise
    except DatabaseError:
        raise
    except Exception as e:
        # Convert unexpected errors with structured context
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

## Key Improvements Highlighted

| Aspect | Before | After |
|--------|--------|-------|
| **Validation** | None | UUID, date format, positive numbers, non-empty strings |
| **Date Error** | Error dict with generic message | ValidationError with structured context |
| **Database Call** | Direct Supabase + manual result checking | safe_db_insert wrapper with automatic error handling |
| **Error Handling** | Generic Exception → error dict | Specific exception types (ValidationError, DatabaseError) |
| **Logging** | Simple string: `f"Error: {e}"` | Structured with extra fields: `extra={"user_id": ..., "task": ...}` |
| **Error Context** | Just error message string | Structured dict with user_id, task, error details |
| **Input Sanitization** | None | Strip whitespace from task and notes |
| **Documentation** | No Raises section | Explicit Raises section in docstring |

## Error Handling Flow Comparison

### BEFORE
```
User Input → No Validation → Direct DB Call → Manual Result Check → Error Dict or Success Dict
```

### AFTER
```
User Input → Validation (raises ValidationError) → Safe DB Wrapper (raises DatabaseError) → Success
                ↓                                              ↓
         ValidationError raised                    DatabaseError raised
```

## Caller Experience

### BEFORE - Caller must check success dict
```python
result = await create_maintenance_record(user_id, task, date)
if result["success"]:
    record_id = result["record_id"]
    # Handle success
else:
    error = result["error"]
    # Handle error - but what type? Unknown!
```

### AFTER - Caller can catch specific exceptions
```python
try:
    result = await create_maintenance_record(user_id, task, date)
    record_id = result["record_id"]
    # Handle success
except ValidationError as e:
    # Handle invalid input - show to user
    print(f"Invalid input: {e.message}")
except DatabaseError as e:
    # Handle database error - log and retry
    logger.error(f"DB error: {e.message}", extra=e.context)
```

## Error Context Examples

### BEFORE - Generic error string
```python
{
    "success": False,
    "error": "Failed to create maintenance record"
}
```

### AFTER - Structured context
```python
DatabaseError(
    message="Failed to create maintenance record",
    context={
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "task": "Oil change",
        "error": "connection timeout"
    }
)
```

## Benefits Summary

1. **Early Failure**: Invalid inputs caught before database access
2. **Type Safety**: Validation ensures correct types (UUID, date format, positive numbers)
3. **Cleaner Code**: Less boilerplate, no manual result checking
4. **Better Debugging**: Structured error context for logging
5. **Caller Control**: Different error types can be handled differently
6. **Consistent**: Same pattern across all tools
7. **Testable**: Easy to test validation separately from database logic
