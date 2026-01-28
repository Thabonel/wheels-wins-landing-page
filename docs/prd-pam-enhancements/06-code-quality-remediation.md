# PRD-PAM-006: Code Quality Remediation & Production Hardening

**Document ID**: PRD-PAM-006
**Date**: 2026-01-29
**Type**: Remediation Plan
**Status**: Active
**Priority**: CRITICAL

---

## Executive Summary

Comprehensive code review of 37 newly created PAM tools revealed **critical blockers** and **quality issues** that must be resolved before production deployment. This PRD provides a systematic, prioritized remediation plan.

**Key Findings:**
- 🔴 **4 Critical Blockers** - Code will not run
- 🟠 **35+ Quality Issues** - AI slop code violations
- 🟡 **0% Test Coverage** - No tests exist
- 🟢 **Good Architecture** - Solid foundation, needs polish

**Total Estimated Effort:** 35-45 hours (5-6 days)

---

## Problem Statement

Four specialized agents conducted parallel analysis of newly created PAM tools and identified issues across four categories:

1. **Code Review Agent** - Found AI slop violations (obvious comments, generic errors)
2. **Bugbot Agent** - Found critical bugs (missing imports, wrong table names, division by zero)
3. **Code Analyzer Agent** - Found architectural issues (high duplication, complex functions)
4. **Test Engineer Agent** - Found missing test coverage (0% coverage, no infrastructure)

**Current State:** Code is functional but not production-ready
**Desired State:** Production-hardened code with 85%+ test coverage

---

## Scope

### In Scope
- Fix all critical blockers (Priority 1)
- Remediate AI slop violations (Priority 2)
- Add comprehensive error handling (Priority 2)
- Reduce code duplication (Priority 3)
- Create test infrastructure and tests (Priority 3)
- Verify database schema alignment (Priority 1)

### Out of Scope
- Feature additions or enhancements
- Performance optimization (separate effort)
- UI/frontend changes
- Database schema changes (use existing schema)

---

## Priority 1: Critical Blockers (MUST FIX TO RUN)

**Estimated Time:** 2-3 hours
**Severity:** 🔴 CRITICAL - Code will crash at runtime

### Issue 1.1: Missing BaseTool Import

**Files Affected:** ALL newly created tool files (13 files)

**Problem:**
```python
from app.services.pam.tools.base import BaseTool
```
❌ BaseTool class does not exist in codebase

**Impact:** ImportError on module load - nothing will work

**Solution Options:**

**Option A: Create BaseTool class (RECOMMENDED)**
```python
# File: backend/app/services/pam/tools/base.py
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

class BaseTool(ABC):
    """Base class for all PAM tools"""

    def __init__(self, user_id: str):
        self.user_id = user_id

    @abstractmethod
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute the tool with given parameters"""
        pass

    def _validate_user_id(self) -> Optional[str]:
        """Validate user_id format"""
        if not self.user_id:
            return "user_id is required"
        return None
```

**Option B: Remove BaseTool inheritance**
- Update all tool files to not inherit from BaseTool
- Less clean architecture but faster fix

**Acceptance Criteria:**
- [ ] All tool files can be imported without ImportError
- [ ] Python interpreter can load all modules
- [ ] No runtime errors on tool registration

---

### Issue 1.2: Wrong Database Table Names

**Files Affected:**
- `backend/app/services/pam/tools/maintenance/schedule_maintenance.py`
- `backend/app/services/pam/tools/maintenance/log_maintenance.py`
- `backend/app/services/pam/tools/maintenance/track_expenses.py`

**Problem:**
Code uses `maintenance_log` but database schema shows `maintenance_logs` (plural)

**Evidence:**
```python
# Code (WRONG)
supabase.table("maintenance_log").insert({...})

# Schema (CORRECT)
Table: maintenance_logs
```

**Solution:**
Global search and replace:
```bash
# Search for wrong table name
grep -r "maintenance_log\"" backend/app/services/pam/tools/

# Replace in all files
sed -i '' 's/maintenance_log/maintenance_logs/g' \
  backend/app/services/pam/tools/maintenance/*.py
```

**Verification Checklist:**
- [ ] Verify against `docs/DATABASE_SCHEMA_REFERENCE.md`
- [ ] Check other table names:
  - `fuel_log` - VERIFY if singular or plural
  - `transition_*` tables - VERIFY names
  - `vehicles` - VERIFY
- [ ] Test database queries in dev environment

**Acceptance Criteria:**
- [ ] All table names match schema exactly
- [ ] No database "table not found" errors
- [ ] Queries execute successfully

---

### Issue 1.3: Missing Python Dependencies

**File Affected:** `backend/requirements.txt`

**Problem:**
```python
# youtube_trip_tool.py
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
```
❌ Package not in requirements.txt

**Solution:**
Add to requirements.txt:
```txt
google-api-python-client==2.111.0
google-auth==2.23.0
google-auth-httplib2==0.1.1
```

**Acceptance Criteria:**
- [ ] `pip install -r requirements.txt` succeeds
- [ ] YouTube tool imports without error
- [ ] No missing module errors in logs

---

### Issue 1.4: Division by Zero

**File:** `backend/app/services/pam/tools/fuel/analyze_fuel_efficiency.py:103`

**Problem:**
```python
average_mpg = sum(mpg_values) / len(mpg_values)  # ❌ Crashes if empty
```

**Solution:**
```python
average_mpg = sum(mpg_values) / len(mpg_values) if mpg_values else 0
```

**Additional Checks Needed:**
- Search for all division operations
- Add zero-division protection everywhere

**Search Command:**
```bash
grep -rn " / " backend/app/services/pam/tools/ | grep -v "http://"
```

**Acceptance Criteria:**
- [ ] No ZeroDivisionError possible
- [ ] All divisions have zero checks
- [ ] Empty data handled gracefully

---

## Priority 2: AI Slop Code Violations (QUALITY CRITICAL)

**Estimated Time:** 6-8 hours
**Severity:** 🟠 HIGH - Maintainability and debugging issues

### Issue 2.1: Obvious Comments (15+ instances)

**Violation from CLAUDE.md:**
> ❌ Obvious comments ("This function does X")

**Examples:**
```python
# ❌ BAD - Comment restates code
# Get user's vehicles
vehicles = await supabase.table("vehicles").select("*")...

# Search YouTube
results = await youtube_api.search()...

# Format search results
formatted = [format_video(v) for v in results]
```

**Solution:**
Remove all obvious comments. Keep only comments that explain **WHY**, not **WHAT**.

```python
# ✅ GOOD - Explains WHY
# Use service account to bypass RLS for admin operations
vehicles = await supabase.table("vehicles").select("*")...

# Limit to 20 results to avoid API quota exhaustion
results = await youtube_api.search(max_results=20)
```

**Detection Command:**
```bash
# Find obvious comment patterns
grep -rn "^[[:space:]]*# Get " backend/app/services/pam/tools/
grep -rn "^[[:space:]]*# Search " backend/app/services/pam/tools/
grep -rn "^[[:space:]]*# Format " backend/app/services/pam/tools/
grep -rn "^[[:space:]]*# Create " backend/app/services/pam/tools/
grep -rn "^[[:space:]]*# Update " backend/app/services/pam/tools/
grep -rn "^[[:space:]]*# Delete " backend/app/services/pam/tools/
```

**Acceptance Criteria:**
- [ ] No comments that restate code
- [ ] All remaining comments explain WHY
- [ ] Code is self-documenting

---

### Issue 2.2: Generic Error Handling (20+ instances)

**Violation from CLAUDE.md:**
> ❌ Generic error handling (bare console.log)

**Current Pattern (BAD):**
```python
try:
    result = await supabase.table("fuel_log").insert({...})
    return {"success": True, "data": result.data[0]}
except Exception as e:
    logger.error(f"Error: {e}")
    return {"error": str(e)}
```

**Issues:**
1. Catches ALL exceptions (hiding bugs)
2. No context for debugging
3. Exposes internal errors to users
4. No recovery strategy

**Solution: Create Exception Hierarchy**

**Step 1:** Create `backend/app/services/pam/tools/exceptions.py`
```python
"""PAM Tool Exceptions

Specific exceptions for different failure modes.
"""

class ToolExecutionError(Exception):
    """Base exception for tool execution errors"""
    def __init__(self, message: str, context: dict = None):
        super().__init__(message)
        self.context = context or {}

class ValidationError(ToolExecutionError):
    """Input validation failed"""
    pass

class DatabaseError(ToolExecutionError):
    """Database operation failed"""
    pass

class ExternalAPIError(ToolExecutionError):
    """External API call failed"""
    pass

class AuthorizationError(ToolExecutionError):
    """User not authorized for operation"""
    pass
```

**Step 2:** Update Error Handling Pattern

```python
# ✅ GOOD - Specific exceptions with context
from app.services.pam.tools.exceptions import (
    ValidationError, DatabaseError, ExternalAPIError
)

async def log_fuel_entry(user_id: str, odometer: float, ...):
    try:
        # Validation
        if odometer <= 0:
            raise ValidationError(
                "Odometer must be positive",
                context={"user_id": user_id, "odometer": odometer}
            )

        # Database operation
        result = await supabase.table("fuel_log").insert({...}).execute()

        if not result.data:
            raise DatabaseError(
                "Failed to insert fuel log",
                context={"user_id": user_id, "table": "fuel_log"}
            )

        return {"success": True, "data": result.data[0]}

    except ValidationError as e:
        logger.warning(f"Validation failed: {e}", extra=e.context)
        return {"success": False, "error": str(e), "type": "validation"}

    except DatabaseError as e:
        logger.error(f"Database error: {e}", extra=e.context, exc_info=True)
        return {"success": False, "error": "Failed to save fuel log", "type": "database"}

    except Exception as e:
        logger.exception(f"Unexpected error in log_fuel_entry", extra={"user_id": user_id})
        return {"success": False, "error": "An unexpected error occurred", "type": "internal"}
```

**Acceptance Criteria:**
- [ ] All exceptions are specific (not bare Exception)
- [ ] All errors include context for debugging
- [ ] User-facing errors are sanitized
- [ ] All errors are logged with exc_info=True
- [ ] 90%+ error handling quality score

---

### Issue 2.3: Missing Input Validation (10+ instances)

**Problem:**
No validation for user inputs - security and data integrity risk

**Current Pattern (BAD):**
```python
async def log_fuel_entry(
    user_id: str,
    vehicle_id: str,
    odometer: float,
    gallons: float,
    cost: float,
    ...
):
    # ❌ No validation - accepts any values
    result = await supabase.table("fuel_log").insert({
        "user_id": user_id,
        "vehicle_id": vehicle_id,
        "odometer": odometer,
        "gallons": gallons,
        "cost": cost,
    }).execute()
```

**Solution: Add Validation Helper**

```python
from uuid import UUID
from typing import Optional

def _validate_inputs(
    user_id: str,
    vehicle_id: str,
    odometer: Optional[float],
    gallons: Optional[float],
    cost: Optional[float]
) -> Optional[ValidationError]:
    """Validate all inputs. Returns ValidationError if invalid, None if valid."""

    # UUID validation
    try:
        UUID(user_id)
        UUID(vehicle_id)
    except ValueError as e:
        raise ValidationError(
            "Invalid UUID format",
            context={"user_id": user_id, "vehicle_id": vehicle_id}
        )

    # Range validation
    if odometer is not None and odometer <= 0:
        raise ValidationError(
            "Odometer must be positive",
            context={"odometer": odometer}
        )

    if gallons is not None and (gallons <= 0 or gallons > 1000):
        raise ValidationError(
            "Gallons must be between 0 and 1000",
            context={"gallons": gallons}
        )

    if cost is not None and cost < 0:
        raise ValidationError(
            "Cost cannot be negative",
            context={"cost": cost}
        )

    return None
```

**Validation Checklist for Each Tool:**
- [ ] UUID format validation (user_id, vehicle_id, etc.)
- [ ] Number range validation (positive, within bounds)
- [ ] Date format validation (ISO 8601)
- [ ] String length validation (not empty, max length)
- [ ] Enum validation (valid category/status values)
- [ ] Required field validation (not None)

**Acceptance Criteria:**
- [ ] All tools validate inputs
- [ ] Invalid inputs return clear error messages
- [ ] No SQL injection possible
- [ ] No type errors at runtime

---

### Issue 2.4: Magic Numbers (10+ instances)

**Problem:**
Unexplained numeric constants

**Examples:**
```python
# ❌ BAD - What is 20? Why 20?
max_results=20

# ❌ BAD - What is this parsing?
duration_seconds = int(duration[2:-1])
```

**Solution:**
```python
# ✅ GOOD - Constants with explanation
MAX_YOUTUBE_RESULTS = 20  # Limit to prevent API quota exhaustion

# ISO 8601 duration format: PT1M30S
# Skip 'PT' prefix (2 chars) and 'S' suffix (1 char)
ISO_DURATION_PREFIX_LEN = 2
ISO_DURATION_SUFFIX_LEN = 1
duration_seconds = int(duration[ISO_DURATION_PREFIX_LEN:-ISO_DURATION_SUFFIX_LEN])
```

**Detection Command:**
```bash
# Find numeric literals (excluding 0, 1, 2)
grep -rn "[^0-9][3-9][0-9]*[^0-9]" backend/app/services/pam/tools/ \
  | grep -v ".pyc" \
  | grep -v "__pycache__"
```

**Acceptance Criteria:**
- [ ] All magic numbers extracted to constants
- [ ] Constants have explanatory names
- [ ] Constants documented with comments

---

## Priority 3: Architecture & Code Duplication

**Estimated Time:** 8-12 hours
**Severity:** 🟡 MEDIUM - Long-term maintainability

### Issue 3.1: High Code Duplication

**Finding:** Identical patterns repeated in 8 files

**Common Duplicated Patterns:**

**Pattern 1: Error Handling Boilerplate**
Appears in all 13 files

**Pattern 2: Supabase Client Initialization**
```python
from app.core.database import get_supabase_client
supabase = get_supabase_client()
```
Repeated in every function

**Pattern 3: User Validation**
```python
# Get user profile
profile = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
if not profile.data:
    return {"success": False, "error": "User not found"}
```
Repeated in 5+ files

**Solution: Create Utility Modules**

**Step 1:** Create `backend/app/services/pam/tools/utils/__init__.py`

**Step 2:** Create `backend/app/services/pam/tools/utils/validation.py`
```python
"""Input validation utilities"""
from uuid import UUID
from typing import Optional
from app.services.pam.tools.exceptions import ValidationError

def validate_uuid(value: str, field_name: str) -> None:
    """Validate UUID format, raise ValidationError if invalid"""
    try:
        UUID(value)
    except ValueError:
        raise ValidationError(
            f"{field_name} must be valid UUID format",
            context={field_name: value}
        )

def validate_positive_number(value: float, field_name: str) -> None:
    """Validate number is positive, raise ValidationError if not"""
    if value <= 0:
        raise ValidationError(
            f"{field_name} must be positive",
            context={field_name: value}
        )

def validate_number_range(
    value: float,
    field_name: str,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None
) -> None:
    """Validate number is within range"""
    if min_value is not None and value < min_value:
        raise ValidationError(
            f"{field_name} must be >= {min_value}",
            context={field_name: value, "min": min_value}
        )
    if max_value is not None and value > max_value:
        raise ValidationError(
            f"{field_name} must be <= {max_value}",
            context={field_name: value, "max": max_value}
        )
```

**Step 3:** Create `backend/app/services/pam/tools/utils/database.py`
```python
"""Database utilities"""
from typing import Optional, Dict, Any
from app.core.database import get_supabase_client
from app.services.pam.tools.exceptions import DatabaseError, AuthorizationError

async def get_user_profile(user_id: str) -> Dict[str, Any]:
    """Get user profile, raise error if not found"""
    supabase = get_supabase_client()
    result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

    if not result.data:
        raise AuthorizationError(
            "User not found",
            context={"user_id": user_id}
        )

    return result.data

async def safe_db_insert(
    table: str,
    data: Dict[str, Any],
    user_id: str
) -> Dict[str, Any]:
    """Safely insert into database with error handling"""
    supabase = get_supabase_client()

    try:
        result = supabase.table(table).insert(data).execute()

        if not result.data:
            raise DatabaseError(
                f"Failed to insert into {table}",
                context={"table": table, "user_id": user_id}
            )

        return result.data[0]
    except Exception as e:
        raise DatabaseError(
            f"Database error inserting into {table}",
            context={"table": table, "user_id": user_id, "error": str(e)}
        )
```

**Step 4:** Refactor Tools to Use Utilities

```python
# BEFORE (duplicated code)
async def log_fuel_entry(user_id: str, vehicle_id: str, ...):
    try:
        UUID(user_id)
        UUID(vehicle_id)
    except ValueError:
        return {"success": False, "error": "Invalid UUID"}

    if odometer <= 0:
        return {"success": False, "error": "Odometer must be positive"}

    supabase = get_supabase_client()
    result = supabase.table("fuel_log").insert({...}).execute()
    ...

# AFTER (using utilities)
from app.services.pam.tools.utils.validation import validate_uuid, validate_positive_number
from app.services.pam.tools.utils.database import safe_db_insert

async def log_fuel_entry(user_id: str, vehicle_id: str, ...):
    validate_uuid(user_id, "user_id")
    validate_uuid(vehicle_id, "vehicle_id")
    validate_positive_number(odometer, "odometer")

    data = {
        "user_id": user_id,
        "vehicle_id": vehicle_id,
        "odometer": odometer,
        ...
    }

    result = await safe_db_insert("fuel_log", data, user_id)
    return {"success": True, "data": result}
```

**Acceptance Criteria:**
- [ ] Utils module created with validation, database helpers
- [ ] Code duplication reduced by 30%+
- [ ] All tools use shared utilities
- [ ] No duplicated validation logic

---

### Issue 3.2: Complex Functions (All 22 functions exceed 50 lines)

**Finding:**
- Average function length: 116 lines (target: <50)
- Average complexity: 10.4 (target: <8)
- Most complex: `update_fuel_entry()` - 132 lines, complexity 18

**Solution: Extract Helper Functions**

**Example Refactoring:**

```python
# BEFORE: 132 lines, complexity 18
async def update_fuel_entry(user_id, entry_id=None, odometer=None, ...):
    # Find entry logic (20 lines)
    if entry_id:
        existing = supabase.table("fuel_log").select("*").eq("id", entry_id)...
    else:
        existing = supabase.table("fuel_log").select("*").eq("user_id", user_id)...

    # Validation logic (15 lines)
    if not existing.data:
        return {"success": False, "error": "Not found"}

    # Build update data (30 lines)
    update_data = {}
    if odometer is not None:
        update_data["odometer"] = odometer
    ...

    # Recalculation logic (40 lines)
    if "volume" in update_data or "price" in update_data:
        ...

    # Database update (20 lines)
    result = supabase.table("fuel_log").update(update_data)...

# AFTER: 4 functions, each <40 lines, complexity <8
async def update_fuel_entry(user_id, entry_id=None, ...):
    """Update fuel entry - main orchestration"""
    entry = await _find_fuel_entry(user_id, entry_id)
    update_data = _build_update_data(entry, odometer, volume, price, ...)
    recalculated = _recalculate_values(update_data, entry)
    result = await _save_fuel_update(entry["id"], recalculated)
    return _format_update_response(result)

async def _find_fuel_entry(user_id, entry_id):
    """Find fuel entry by ID or latest"""
    # 20 lines
    ...

def _build_update_data(entry, odometer, volume, price, ...):
    """Build update data dict from provided fields"""
    # 30 lines
    ...

def _recalculate_values(update_data, entry):
    """Recalculate total/price/volume from 2 of 3"""
    # 40 lines
    ...

async def _save_fuel_update(entry_id, update_data):
    """Save updated fuel entry to database"""
    # 15 lines
    ...
```

**Refactoring Priority:**
1. `update_fuel_entry()` - 132 lines, complexity 18
2. `add_fuel_entry()` - 153 lines, complexity 15
3. `update_maintenance_record()` - 120 lines, complexity 14
4. `get_transition_progress()` - 110 lines, complexity 12

**Acceptance Criteria:**
- [ ] All functions < 50 lines
- [ ] All functions complexity < 8
- [ ] Each function has single responsibility
- [ ] Helper functions are testable in isolation

---

### Issue 3.3: type("Result") Hack

**Finding:** 4 occurrences across 3 files

**Problem:**
```python
existing = type("Result", (), {"data": matching[0]})()
```
❌ Creates anonymous classes at runtime
❌ Violates Python best practices
❌ Confusing for maintainers

**Files Affected:**
- `equipment_tools.py`
- `task_tools.py`
- `maintenance_crud.py`

**Solution:**
```python
# BEFORE (hack)
existing = type("Result", (), {"data": matching[0]})()

# AFTER (clean)
existing_data = matching[0]
```

Then update all references:
```python
# BEFORE
if not existing.data:
    return {"error": "Not found"}

# AFTER
if not existing_data:
    return {"error": "Not found"}
```

**Acceptance Criteria:**
- [ ] No `type("Result")` in codebase
- [ ] All logic uses direct data access
- [ ] Code passes linting (pylint/mypy)

---

## Priority 4: Testing Infrastructure

**Estimated Time:** 15-20 hours
**Severity:** 🟡 MEDIUM - Required for production confidence

### Issue 4.1: Zero Test Coverage

**Current State:** 0% test coverage, no test infrastructure

**Required Test Coverage:** 85%+ for critical paths

### Step 1: Create Test Infrastructure (2 hours)

**Create Test Directory Structure:**
```
backend/tests/
├── __init__.py
├── conftest.py                    # Shared fixtures
├── unit/
│   ├── __init__.py
│   ├── test_ai_core.py
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── fuel/
│   │   │   ├── __init__.py
│   │   │   ├── test_fuel_crud.py
│   │   │   └── test_fuel_stats.py
│   │   ├── maintenance/
│   │   │   ├── __init__.py
│   │   │   ├── test_maintenance_crud.py
│   │   │   └── test_maintenance_queries.py
│   │   └── transition/
│   │       ├── __init__.py
│   │       ├── test_progress_tools.py
│   │       ├── test_task_tools.py
│   │       ├── test_shakedown_tools.py
│   │       ├── test_equipment_tools.py
│   │       └── test_launch_week_tools.py
├── integration/
│   ├── __init__.py
│   └── test_tool_execution.py
└── fixtures/
    ├── __init__.py
    └── pam_fixtures.py
```

**Create conftest.py:**
```python
"""Pytest configuration and shared fixtures"""
import pytest
from unittest.mock import AsyncMock, MagicMock

@pytest.fixture
def mock_supabase():
    """Mock Supabase client"""
    mock = MagicMock()
    mock.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": 1, "user_id": "test-user"}]
    )
    return mock

@pytest.fixture
def sample_user_id():
    """Sample test user ID"""
    return "550e8400-e29b-41d4-a716-446655440000"

@pytest.fixture
def sample_fuel_entry():
    """Sample fuel log entry"""
    return {
        "id": 1,
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "date": "2025-01-15",
        "odometer": 50000.0,
        "volume": 45.0,
        "price": 1.50,
        "total": 67.50,
        "filled_to_top": True,
        "consumption": 8.5
    }
```

**Update requirements.txt:**
```txt
# Testing
pytest>=7.4.0
pytest-asyncio>=0.21.0
pytest-cov>=4.1.0
pytest-mock>=3.11.1
freezegun>=1.2.2
faker>=19.0.0
```

**Acceptance Criteria:**
- [ ] Test directory structure created
- [ ] conftest.py with fixtures
- [ ] pytest.ini configured
- [ ] Test dependencies installed
- [ ] `pytest` command runs successfully

---

### Step 2: Write Critical Path Tests (15-18 hours)

**Priority 1: Fuel Tools (5 hours)**

**File:** `tests/unit/tools/fuel/test_fuel_crud.py`
```python
"""Tests for fuel CRUD operations"""
import pytest
from unittest.mock import AsyncMock, patch
from app.services.pam.tools.fuel.fuel_crud import (
    add_fuel_entry,
    update_fuel_entry,
    delete_fuel_entry,
    get_fuel_stats
)

@pytest.mark.asyncio
async def test_add_fuel_entry_success(mock_supabase, sample_user_id):
    """Test successful fuel entry creation"""
    with patch("app.services.pam.tools.fuel.fuel_crud.get_supabase_client", return_value=mock_supabase):
        result = await add_fuel_entry(
            user_id=sample_user_id,
            odometer=50000.0,
            volume=45.0,
            price=1.50,
            total=67.50
        )

        assert result["success"] is True
        assert "entry_id" in result
        assert result["calculated"]["volume"] == 45.0
        assert result["calculated"]["price"] == 1.50
        assert result["calculated"]["total"] == 67.50

@pytest.mark.asyncio
async def test_add_fuel_entry_smart_calculation(mock_supabase, sample_user_id):
    """Test smart calculation: provide 2 of 3, calculates 3rd"""
    with patch("app.services.pam.tools.fuel.fuel_crud.get_supabase_client", return_value=mock_supabase):
        # Provide volume and total, should calculate price
        result = await add_fuel_entry(
            user_id=sample_user_id,
            odometer=50000.0,
            volume=45.0,
            total=67.50
        )

        assert result["success"] is True
        assert result["calculated"]["price"] == 1.50  # 67.50 / 45.0

@pytest.mark.asyncio
async def test_add_fuel_entry_insufficient_data(sample_user_id):
    """Test error when less than 2 of 3 values provided"""
    result = await add_fuel_entry(
        user_id=sample_user_id,
        odometer=50000.0,
        volume=45.0  # Only 1 value
    )

    assert result["success"] is False
    assert result["needs_more_info"] is True
    assert "at least 2 of" in result["error"]

@pytest.mark.asyncio
async def test_add_fuel_entry_calculates_consumption(mock_supabase, sample_user_id):
    """Test consumption calculation when filled_to_top=True"""
    # Mock previous filled entry
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.lt.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[{"odometer": 49500.0}]  # Previous entry at 49,500 km
    )

    with patch("app.services.pam.tools.fuel.fuel_crud.get_supabase_client", return_value=mock_supabase):
        result = await add_fuel_entry(
            user_id=sample_user_id,
            odometer=50000.0,  # Current: 50,000 km
            volume=45.0,       # 500 km on 45L
            price=1.50,
            filled_to_top=True
        )

        assert result["success"] is True
        # 45L / 500km * 100 = 9.0 L/100km
        assert result["consumption"] == "9.0 L/100km"
```

**Additional Test Files Required:**
- `test_fuel_stats.py` - Statistics calculation tests
- `test_maintenance_crud.py` - Maintenance CRUD tests
- `test_maintenance_queries.py` - Schedule/history tests
- `test_transition_progress.py` - Progress calculation tests
- `test_transition_tasks.py` - Task CRUD tests
- `test_shakedown_tools.py` - Shakedown logging tests
- `test_equipment_tools.py` - Equipment tracking tests
- `test_launch_week_tools.py` - Launch week tests

**Test Coverage Goals:**
- `add_fuel_entry()` - 95%+
- `update_fuel_entry()` - 90%+
- `delete_fuel_entry()` - 90%+
- `get_fuel_stats()` - 95%+
- All maintenance tools - 85%+
- All transition tools - 85%+

**Acceptance Criteria:**
- [ ] All critical functions have tests
- [ ] 85%+ code coverage overall
- [ ] All tests pass
- [ ] Tests run in <10 seconds
- [ ] No flaky tests

---

## Implementation Plan

### Phase 1: Critical Blockers (Day 1)
**Time:** 2-3 hours

**Tasks:**
1. Create BaseTool class or remove inheritance
2. Fix table names (maintenance_log → maintenance_logs)
3. Add google-api-python-client to requirements.txt
4. Fix division by zero in fuel_analytics
5. Verify all table/column names against schema

**Success Criteria:**
- [ ] Code runs without ImportError
- [ ] No database "table not found" errors
- [ ] All dependencies install
- [ ] No runtime crashes

---

### Phase 2: Error Handling (Day 2)
**Time:** 6-8 hours

**Tasks:**
1. Create exceptions.py module
2. Update all 13 tool files with proper error handling
3. Replace generic `except Exception` with specific exceptions
4. Add error context to all catches
5. Sanitize user-facing error messages

**Success Criteria:**
- [ ] No bare `except Exception`
- [ ] All errors include context
- [ ] 90%+ error handling quality score
- [ ] User-facing errors are safe

---

### Phase 3: Code Quality (Day 3)
**Time:** 6-8 hours

**Tasks:**
1. Remove all obvious comments (15+ instances)
2. Add input validation to all tools
3. Extract magic numbers to constants
4. Create utils module (validation, database helpers)

**Success Criteria:**
- [ ] No obvious comments
- [ ] All inputs validated
- [ ] No magic numbers
- [ ] Utils module created

---

### Phase 4: Refactoring (Day 4)
**Time:** 8-10 hours

**Tasks:**
1. Remove type("Result") hacks (4 instances)
2. Refactor complex functions:
   - `update_fuel_entry()` (132 lines → <50)
   - `add_fuel_entry()` (153 lines → <50)
   - `update_maintenance_record()` (120 lines → <50)
3. Reduce code duplication using utils

**Success Criteria:**
- [ ] All functions < 50 lines
- [ ] All functions complexity < 8
- [ ] 30%+ reduction in duplication

---

### Phase 5: Testing (Days 5-6)
**Time:** 15-20 hours

**Tasks:**
1. Create test infrastructure (Day 5 morning)
2. Write unit tests for fuel tools (Day 5 afternoon)
3. Write unit tests for maintenance tools (Day 6 morning)
4. Write unit tests for transition tools (Day 6 afternoon)
5. Achieve 85%+ coverage

**Success Criteria:**
- [ ] Test infrastructure complete
- [ ] 85%+ test coverage
- [ ] All tests pass
- [ ] CI/CD integration ready

---

## Acceptance Criteria

### Overall Success Criteria

**Code Quality:**
- [ ] All critical blockers fixed (4/4)
- [ ] All AI slop violations remediated (35+)
- [ ] 85%+ test coverage achieved
- [ ] Code passes linting (pylint, mypy)
- [ ] All functions < 50 lines
- [ ] All functions complexity < 8
- [ ] Error handling quality 90%+

**Functionality:**
- [ ] All tools can be imported
- [ ] All tools execute without errors
- [ ] All database operations succeed
- [ ] All API integrations work
- [ ] No runtime crashes

**Documentation:**
- [ ] All functions have docstrings
- [ ] All parameters documented
- [ ] All return values documented
- [ ] README updated with testing instructions

**Testing:**
- [ ] Test infrastructure complete
- [ ] All critical paths tested
- [ ] 85%+ coverage
- [ ] Tests run in CI/CD
- [ ] No flaky tests

---

## Testing Strategy

### Unit Tests (85%+ coverage target)

**Critical Functions (95%+ coverage):**
- `add_fuel_entry()` - Smart calculation logic
- `update_fuel_entry()` - Update and recalculation
- `get_fuel_stats()` - Statistics calculations
- `get_transition_progress()` - Readiness calculation

**High Priority (85%+ coverage):**
- All CRUD operations
- All validation functions
- All calculation functions

**Medium Priority (70%+ coverage):**
- Helper functions
- Formatting functions

### Integration Tests

**Database Integration:**
- Actual Supabase test instance
- RLS policy enforcement
- Concurrent access scenarios

**API Integration:**
- YouTube API (using test key)
- External API error handling

### Test Execution

**Local:**
```bash
pytest tests/unit --cov=app/services/pam/tools --cov-report=html
```

**CI/CD:**
```yaml
- name: Run Tests
  run: |
    pytest tests/ --cov=app --cov-report=xml
    coverage report --fail-under=85
```

---

## Rollout Plan

### Development Environment Testing
1. Fix critical blockers
2. Run local tests
3. Manual testing of all tools
4. Code review

### Staging Deployment
1. Deploy to staging branch
2. Run integration tests
3. Manual QA testing
4. Performance testing

### Production Deployment
1. Merge to main after approval
2. Deploy to production
3. Monitor error logs
4. Monitor performance metrics

---

## Risk Assessment

### High Risk
- **BaseTool import fix** - Could break tool registration
  - Mitigation: Test thoroughly before deployment

- **Table name changes** - Could cause data loss if wrong
  - Mitigation: Verify against schema, test in dev first

### Medium Risk
- **Error handling refactor** - Could introduce new bugs
  - Mitigation: Comprehensive testing, gradual rollout

- **Function refactoring** - Could change behavior
  - Mitigation: Write tests before refactoring

### Low Risk
- **Comment removal** - Purely cosmetic
- **Magic number extraction** - Behavior unchanged

---

## Success Metrics

### Code Quality Metrics
- Error handling quality: 40% → 90%+
- Test coverage: 0% → 85%+
- Function length: 116 lines avg → <50 lines
- Code duplication: High → Reduced 30%+

### Bug Metrics
- Critical bugs: 4 → 0
- Import errors: 5+ → 0
- Runtime errors: Unknown → 0

### Development Velocity
- Time to add new tool: Unknown → <2 hours
- Time to fix bug: Unknown → <30 minutes
- CI/CD pipeline: None → <5 minutes

---

## Appendices

### Appendix A: File Inventory

**Files Requiring Changes:**

**Priority 1 (Critical):**
1. `backend/app/services/pam/tools/base.py` - CREATE
2. `backend/app/services/pam/tools/maintenance/*.py` - FIX table names (3 files)
3. `backend/requirements.txt` - ADD google-api-python-client
4. `backend/app/services/pam/tools/fuel/analyze_fuel_efficiency.py` - FIX division by zero

**Priority 2 (Quality):**
5. `backend/app/services/pam/tools/exceptions.py` - CREATE
6. All 13 tool files - UPDATE error handling
7. All 13 tool files - REMOVE obvious comments
8. All 13 tool files - ADD input validation

**Priority 3 (Refactoring):**
9. `backend/app/services/pam/tools/utils/__init__.py` - CREATE
10. `backend/app/services/pam/tools/utils/validation.py` - CREATE
11. `backend/app/services/pam/tools/utils/database.py` - CREATE
12. `backend/app/services/pam/tools/fuel/fuel_crud.py` - REFACTOR complex functions
13. `backend/app/services/pam/tools/maintenance/maintenance_crud.py` - REFACTOR

**Priority 4 (Testing):**
14. `backend/tests/` - CREATE entire test directory
15. 20+ test files - CREATE

**Total Files:** ~50 files to create or modify

---

### Appendix B: Agent Reports

Full agent reports available at:
- **Code Review:** In agent output
- **Bug Report:** In agent output
- **Code Analysis:** `/docs/CODE_QUALITY_ANALYSIS_PAM_TOOLS.md`
- **Refactoring Plan:** `/docs/REFACTORING_PRIORITIES.md`
- **Testing Requirements:** In agent output

---

### Appendix C: Related Documentation

- `docs/DATABASE_SCHEMA_REFERENCE.md` - Database schema reference
- `docs/PAM_SYSTEM_ARCHITECTURE.md` - PAM architecture
- `CLAUDE.md` - Anti-AI-slop rules
- `docs/prd-pam-enhancements/01-transition-system.md` - PRD-01
- `docs/prd-pam-enhancements/02-maintenance-records.md` - PRD-02
- `docs/prd-pam-enhancements/03-fuel-log-write.md` - PRD-03
- `docs/prd-pam-enhancements/04-unregistered-tools.md` - PRD-04
- `docs/prd-pam-enhancements/05-tool-issues-investigation.md` - PRD-05

---

**Document End**

**Next Actions:**
1. Review and approve this PRD
2. Begin Phase 1: Critical Blockers
3. Track progress against acceptance criteria
4. Update status as phases complete
