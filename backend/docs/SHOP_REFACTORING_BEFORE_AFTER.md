# Shop Tools Refactoring: Before & After Comparison

## Example: search_products.py

This document shows the concrete improvements made by applying the refactoring pattern.

---

## BEFORE: Generic Error Handling

```python
"""Search Products Tool for PAM"""

import logging
from typing import Any, Dict, Optional, List

from app.integrations.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def search_products(
    user_id: str,
    query: str,
    category: Optional[str] = None,
    max_price: Optional[float] = None,
    min_price: Optional[float] = None,
    limit: Optional[int] = 20,
    **kwargs
) -> Dict[str, Any]:
    """
    Search for products in the affiliate_products table

    Args:
        user_id: UUID of the user
        query: Search query string
        category: Optional category filter
        max_price: Optional maximum price filter
        min_price: Optional minimum price filter
        limit: Maximum number of results (default: 20)

    Returns:
        Dict with product search results
    """
    try:
        # NO VALIDATION - assumes input is valid
        if not query or len(query.strip()) == 0:
            return {
                "success": False,
                "error": "Search query is required"
            }

        supabase = get_supabase_client()

        # Build query - affiliate_products table
        db_query = supabase.table("affiliate_products").select("*")
        db_query = db_query.eq("is_active", True)

        if category:
            db_query = db_query.eq("category", category)

        if max_price:
            db_query = db_query.lte("price", max_price)
        if min_price:
            db_query = db_query.gte("price", min_price)

        # ...rest of logic

        return {
            "success": True,
            "query": query,
            "products_found": len(all_products),
            "products": all_products,
            "message": message
        }

    except Exception as e:
        # GENERIC EXCEPTION - loses context
        logger.error(f"Error searching products: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
```

### Problems with BEFORE:
1. ❌ No input validation (invalid UUIDs, negative prices, invalid categories)
2. ❌ Generic `Exception` handling loses error context
3. ❌ No structured error data for debugging
4. ❌ Returns error dicts instead of raising exceptions
5. ❌ No documentation of what exceptions can be raised
6. ❌ No validation that min_price <= max_price
7. ❌ No limit range validation (could request 10,000 products)

---

## AFTER: Custom Exceptions & Utilities

```python
"""Search Products Tool for PAM"""

import logging
from typing import Any, Dict, Optional, List

from app.integrations.supabase import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
)

logger = logging.getLogger(__name__)


async def search_products(
    user_id: str,
    query: str,
    category: Optional[str] = None,
    max_price: Optional[float] = None,
    min_price: Optional[float] = None,
    limit: Optional[int] = 20,
    **kwargs
) -> Dict[str, Any]:
    """
    Search for products in the affiliate_products table

    Args:
        user_id: UUID of the user
        query: Search query string
        category: Optional category filter
        max_price: Optional maximum price filter
        min_price: Optional minimum price filter
        limit: Maximum number of results (default: 20)

    Returns:
        Dict with product search results

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        # COMPREHENSIVE VALIDATION
        validate_uuid(user_id, "user_id")

        if not query or len(query.strip()) == 0:
            raise ValidationError(
                "Search query is required",
                context={"query": query}
            )

        if max_price is not None:
            validate_positive_number(max_price, "max_price")

        if min_price is not None:
            validate_positive_number(min_price, "min_price")

        # LOGICAL VALIDATION
        if min_price is not None and max_price is not None and min_price > max_price:
            raise ValidationError(
                "min_price cannot be greater than max_price",
                context={"min_price": min_price, "max_price": max_price}
            )

        # RANGE VALIDATION
        if limit is not None and (limit < 1 or limit > 100):
            raise ValidationError(
                "Limit must be between 1 and 100",
                context={"limit": limit}
            )

        # ENUM VALIDATION
        valid_categories = [
            "tools_maintenance",
            "camping_expedition",
            "recovery_gear",
            "parts_upgrades",
            "safety_equipment",
            "power_electronics",
            "comfort_living",
            "navigation_tech"
        ]
        if category and category not in valid_categories:
            raise ValidationError(
                f"Invalid category. Must be one of: {', '.join(valid_categories)}",
                context={"category": category, "valid_categories": valid_categories}
            )

        supabase = get_supabase_client()

        # ...rest of logic (same as before)

        return {
            "success": True,
            "query": query,
            "products_found": len(all_products),
            "products": all_products,
            "message": message
        }

    # SPECIFIC EXCEPTION HANDLING
    except ValidationError:
        raise  # Re-raise custom exceptions as-is
    except DatabaseError:
        raise
    except Exception as e:
        # STRUCTURED LOGGING with extra context
        logger.error(
            f"Unexpected error searching products",
            extra={"user_id": user_id, "query": query, "category": category},
            exc_info=True
        )
        # Convert to DatabaseError with context
        raise DatabaseError(
            "Failed to search products",
            context={
                "user_id": user_id,
                "query": query,
                "category": category,
                "error": str(e)
            }
        )
```

### Improvements in AFTER:
1. ✅ Comprehensive input validation (UUID, positive numbers, ranges, enums)
2. ✅ Specific exception types (`ValidationError`, `DatabaseError`)
3. ✅ Structured error context for debugging
4. ✅ Raises exceptions instead of returning error dicts
5. ✅ Documented exceptions in docstring (`Raises` section)
6. ✅ Logical validation (min <= max price)
7. ✅ Range validation (limit 1-100)
8. ✅ Enum validation (valid categories only)
9. ✅ Structured logging with `extra` context
10. ✅ Clear error messages with context data

---

## Error Handling Comparison

### BEFORE: Generic Exception
```python
except Exception as e:
    logger.error(f"Error searching products: {e}", exc_info=True)
    return {
        "success": False,
        "error": str(e)
    }
```

**Problems**:
- No error categorization
- No context about what was being searched
- Caller can't distinguish validation errors from database errors
- Error dict format forces caller to check `success` flag

### AFTER: Specific Exceptions with Context
```python
except ValidationError:
    raise  # Client knows this is input error
except DatabaseError:
    raise  # Client knows this is system error
except Exception as e:
    logger.error(
        f"Unexpected error searching products",
        extra={"user_id": user_id, "query": query, "category": category},
        exc_info=True
    )
    raise DatabaseError(
        "Failed to search products",
        context={
            "user_id": user_id,
            "query": query,
            "category": category,
            "error": str(e)
        }
    )
```

**Benefits**:
- ✅ Clear error categorization
- ✅ Structured context for debugging
- ✅ Caller can handle different error types differently
- ✅ Exception-based flow (more Pythonic)
- ✅ Context includes all relevant search parameters

---

## Validation Comparison

### BEFORE: Minimal Validation
```python
if not query or len(query.strip()) == 0:
    return {
        "success": False,
        "error": "Search query is required"
    }
```

**Only checks**:
- Query is non-empty

**Missing**:
- UUID validation (could pass "invalid-uuid")
- Price validation (could pass negative prices)
- Price logic validation (min > max)
- Limit validation (could request 99999 products)
- Category validation (could pass "invalid_category")

### AFTER: Comprehensive Validation
```python
validate_uuid(user_id, "user_id")

if not query or len(query.strip()) == 0:
    raise ValidationError(
        "Search query is required",
        context={"query": query}
    )

if max_price is not None:
    validate_positive_number(max_price, "max_price")

if min_price is not None:
    validate_positive_number(min_price, "min_price")

if min_price is not None and max_price is not None and min_price > max_price:
    raise ValidationError(
        "min_price cannot be greater than max_price",
        context={"min_price": min_price, "max_price": max_price}
    )

if limit is not None and (limit < 1 or limit > 100):
    raise ValidationError(
        "Limit must be between 1 and 100",
        context={"limit": limit}
    )

valid_categories = [...]
if category and category not in valid_categories:
    raise ValidationError(
        f"Invalid category. Must be one of: {', '.join(valid_categories)}",
        context={"category": category, "valid_categories": valid_categories}
    )
```

**Validates**:
- ✅ UUID format
- ✅ Query is non-empty
- ✅ Prices are positive (when provided)
- ✅ Price range logic (min <= max)
- ✅ Limit is within acceptable range (1-100)
- ✅ Category is valid enum value

---

## Documentation Comparison

### BEFORE: Basic Docstring
```python
"""
Search for products in the affiliate_products table

Args:
    user_id: UUID of the user
    query: Search query string
    category: Optional category filter
    max_price: Optional maximum price filter
    min_price: Optional minimum price filter
    limit: Maximum number of results (default: 20)

Returns:
    Dict with product search results
"""
```

**Missing**:
- What exceptions can be raised?
- How to handle errors?
- What validation is performed?

### AFTER: Comprehensive Docstring
```python
"""
Search for products in the affiliate_products table

Args:
    user_id: UUID of the user
    query: Search query string
    category: Optional category filter (tools_maintenance, camping_expedition, etc)
    max_price: Optional maximum price filter
    min_price: Optional minimum price filter
    limit: Maximum number of results (default: 20)

Returns:
    Dict with product search results

Raises:
    ValidationError: Invalid input parameters
    DatabaseError: Database operation failed
"""
```

**Includes**:
- ✅ Clear documentation of exceptions
- ✅ Caller knows what to expect/handle
- ✅ More explicit about what's validated

---

## Summary of Improvements

| Aspect | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Validation** | Query non-empty only | 6 comprehensive validations | +500% |
| **Error Types** | Generic `Exception` | 3 specific types | Type safety |
| **Error Context** | Error string only | Structured dict with context | Debuggability |
| **Logging** | Basic string message | Structured with `extra` | Observability |
| **Documentation** | Args + Returns | Args + Returns + Raises | Completeness |
| **Error Flow** | Return dict | Raise exceptions | Pythonic |
| **Type Safety** | Runtime errors possible | Early validation | Fail fast |
| **Maintainability** | Tool-specific logic | Reusable utilities | DRY principle |

---

## Real-World Impact

### Frontend Error Handling

**BEFORE**:
```typescript
const result = await pamApi.searchProducts(query);
if (!result.success) {
  // Generic error - can't tell what went wrong
  showError(result.error);
}
```

**AFTER**:
```typescript
try {
  const result = await pamApi.searchProducts(query);
} catch (error) {
  if (error.type === 'ValidationError') {
    // Show user-friendly validation message
    showValidationError(error.message, error.context);
  } else if (error.type === 'DatabaseError') {
    // Show system error, log to monitoring
    showSystemError();
    logToSentry(error);
  }
}
```

### Debugging

**BEFORE**:
```
Error searching products: 'NoneType' object has no attribute 'lower'
```
- No context about what query failed
- No idea which field caused the error
- No structured data to search logs

**AFTER**:
```
Unexpected error searching products
extra: {
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "query": "tire deflator",
  "category": "tools_maintenance"
}
context: {
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "query": "tire deflator",
  "category": "tools_maintenance",
  "error": "'NoneType' object has no attribute 'lower'"
}
```
- Clear what query failed
- All search parameters included
- Structured data for log queries
- Easy to reproduce issue

---

**Conclusion**: The refactoring provides better error handling, comprehensive validation, structured debugging context, and clearer code intent while following Python best practices and the DRY principle.
