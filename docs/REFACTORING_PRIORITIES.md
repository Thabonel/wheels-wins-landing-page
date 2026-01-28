# PAM Tools Refactoring Priorities

Quick reference guide for improving PAM tools code quality.

## Immediate Actions (2 hours)

### 1. Remove `type("Result")` Hack
**Impact:** High | **Effort:** Low | **ROI:** ⭐⭐⭐⭐⭐

**Files to fix:**
- `backend/app/services/pam/tools/transition/equipment_tools.py:205`
- `backend/app/services/pam/tools/transition/task_tools.py:403`
- `backend/app/services/pam/tools/maintenance/maintenance_crud.py:178`
- `backend/app/services/pam/tools/maintenance/maintenance_crud.py:301`

**Replace:**
```python
item_result = type("Result", (), {"data": matching_items[0]})()
```

**With:**
```python
item = matching_items[0]
# Then use item directly instead of item_result.data
```

## Quick Wins (1 Day)

### 2. Create Utils Module
**Impact:** Very High | **Effort:** Medium | **ROI:** ⭐⭐⭐⭐⭐

Create `backend/app/services/pam/tools/utils/` with:

#### `database.py` - Common DB operations (Used in 5 files)
```python
async def get_profile_id(user_id: str) -> tuple[bool, str | None, str | None]:
    """Get transition profile ID for user.
    
    Returns:
        (success, profile_id, error_message)
    """
    supabase = get_supabase_client()
    result = supabase.table("transition_profiles")\
        .select("id")\
        .eq("user_id", user_id)\
        .maybeSingle()\
        .execute()
    
    if not result.data:
        return (False, None, "No transition plan found. Start one at /transition in the app first.")
    
    return (True, result.data["id"], None)
```

#### `fuzzy_match.py` - Fuzzy name matching (Used in 3 files)
```python
def find_by_fuzzy_match(
    items: list,
    search_term: str,
    field_name: str
) -> tuple[bool, Any | list | None, str | None]:
    """Find item by fuzzy matching on field name.
    
    Returns:
        (success, item_or_matches, error_message)
    """
    matching = [
        item for item in items
        if search_term.lower() in item.get(field_name, "").lower()
    ]
    
    if len(matching) == 0:
        return (False, None, f"No item found matching '{search_term}'.")
    
    if len(matching) > 1:
        names = [item[field_name] for item in matching[:5]]
        return (False, names, f"Multiple items match '{search_term}'. Please be more specific.")
    
    return (True, matching[0], None)
```

#### `decorators.py` - Error handling (Used in 8 files)
```python
from functools import wraps
import logging

def handle_pam_tool_errors(operation_name: str):
    """Decorator for consistent error handling in PAM tools."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            logger = logging.getLogger(func.__module__)
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                logger.exception(f"{operation_name} failed")
                return {
                    "success": False,
                    "error": str(e)
                }
        return wrapper
    return decorator
```

**Usage:**
```python
from app.services.pam.tools.utils.database import get_profile_id
from app.services.pam.tools.utils.fuzzy_match import find_by_fuzzy_match
from app.services.pam.tools.utils.decorators import handle_pam_tool_errors

@handle_pam_tool_errors("add_equipment_item")
async def add_equipment_item(user_id: str, name: str, ...):
    success, profile_id, error = await get_profile_id(user_id)
    if not success:
        return {"success": False, "error": error}
    
    # Rest of function without try-except
```

## High Priority (This Sprint)

### 3. Refactor Top 2 Complex Functions
**Impact:** High | **Effort:** High | **ROI:** ⭐⭐⭐⭐

#### Refactor `add_fuel_entry()` - 153 lines, complexity 17
Split into:
- `_validate_and_calculate_fuel()` - Validation + calculation
- `_calculate_consumption()` - Consumption calculation
- `_insert_fuel_entry()` - Database insertion
- `_build_fuel_response()` - Response building

#### Refactor `update_fuel_entry()` - 132 lines, complexity 18
Split into:
- `_find_fuel_entry()` - Entry lookup
- `_recalculate_fuel_values()` - Recalculation logic
- `_apply_fuel_updates()` - Database update

Target: Reduce both to <50 lines each

### 4. Add Type Definitions
**Impact:** Medium | **Effort:** Low | **ROI:** ⭐⭐⭐

Create `backend/app/services/pam/tools/types.py`:
```python
from typing import TypedDict, Optional

class ToolResponse(TypedDict):
    success: bool
    error: Optional[str]
    message: Optional[str]

class FuelEntryResponse(ToolResponse):
    entry_id: Optional[str]
    entry: Optional[dict]
    calculated: Optional[dict]
    consumption: Optional[str]

class EquipmentResponse(ToolResponse):
    item: Optional[dict]
    stats: Optional[dict]
```

## Medium Priority (Next Sprint)

### 5. Optimize Database Queries
**Files with inefficient queries:**
- `mark_equipment_purchased()` - 2 queries instead of 1
- `get_transition_tasks()` - Client-side filtering
- `complete_transition_task()` - Client-side filtering

**Use PostgreSQL `ilike` for fuzzy matching:**
```python
# Instead of fetching all and filtering in Python
result = supabase.table("transition_tasks")\
    .select("*")\
    .ilike("title", f"%{task_title}%")\
    .eq("user_id", user_id)\
    .execute()
```

### 6. Add Unit Tests
**Priority files:**
1. `fuel_crud.py` - 4 functions, complex logic
2. `equipment_tools.py` - Budget calculations
3. `task_tools.py` - Status management

Target: 80% coverage

## Code Metrics Summary

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Average function length | 116 lines | <50 lines | 🔴 |
| Functions >50 lines | 22/22 (100%) | <20% | 🔴 |
| Average complexity | 10.4 | <8 | 🔴 |
| Code duplication | High (8 files) | Low | 🔴 |
| Test coverage | 0% | 80% | 🔴 |
| Type safety | Partial | Full | 🟡 |
| Documentation | Excellent | Excellent | 🟢 |
| Error handling | Good | Excellent | 🟡 |

## Files Requiring Attention

### Critical Priority
1. `fuel_crud.py` - 2 functions with complexity 17-18
2. `equipment_tools.py` - `type()` hack, 148-line function
3. `task_tools.py` - `type()` hack, 125-line function

### High Priority
4. `maintenance_crud.py` - 2x `type()` hack, fuzzy match duplication
5. `progress_tools.py` - 142-line function
6. `launch_week_tools.py` - 136-line function

### Medium Priority
7. `shakedown_tools.py` - Stats calculation optimization
8. `maintenance_queries.py` - Filtering logic

## Quick Reference: Common Patterns

### Pattern 1: Profile Check (5 files)
**Before:**
```python
profile_result = supabase.table("transition_profiles").select("id").eq("user_id", user_id).maybeSingle().execute()
if not profile_result.data:
    return {"success": False, "error": "No transition plan found..."}
profile_id = profile_result.data["id"]
```

**After:**
```python
success, profile_id, error = await get_profile_id(user_id)
if not success:
    return {"success": False, "error": error}
```

### Pattern 2: Fuzzy Match (3 files)
**Before:** 10-15 lines of list comprehension + validation

**After:**
```python
success, item, error = find_by_fuzzy_match(items, search_term, "field_name")
if not success:
    return {"success": False, "error": error}
```

### Pattern 3: Error Handling (8 files)
**Before:** 5 lines of try-except in every function

**After:** Single decorator on function

## Refactoring Checklist

- [ ] Remove all 4 `type("Result")` hacks
- [ ] Create `utils/database.py` with `get_profile_id()`
- [ ] Create `utils/fuzzy_match.py` with `find_by_fuzzy_match()`
- [ ] Create `utils/decorators.py` with `handle_pam_tool_errors()`
- [ ] Update all 5 files to use `get_profile_id()`
- [ ] Update all 3 files to use `find_by_fuzzy_match()`
- [ ] Add `@handle_pam_tool_errors` to all 22 functions
- [ ] Remove try-except blocks after adding decorator
- [ ] Create `types.py` with response TypedDicts
- [ ] Refactor `add_fuel_entry()` into helpers
- [ ] Refactor `update_fuel_entry()` into helpers
- [ ] Add tests for utils module (95% coverage target)
- [ ] Add tests for fuel module (90% coverage target)
- [ ] Optimize database queries in 3 files
- [ ] Run complexity analysis - verify avg <8

---

**See `CODE_QUALITY_ANALYSIS_PAM_TOOLS.md` for full details.**
