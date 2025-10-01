# How to Add PAM Action Tools

**Quick Guide:** Add new site interactions for PAM in 3 simple steps

---

## Step 1: Create the Tool

Create a new file in `backend/app/services/pam/tools/your_action.py`:

```python
"""Your Action Tool for PAM

Allows PAM to [describe what this does] through natural language.

Example usage:
- "PAM, [example user request]"
- "PAM, [another example]"
"""

import logging
from typing import Any, Dict, Optional
from supabase import Client
from .base_tool import BaseTool, ToolResult, ToolCapability

logger = logging.getLogger(__name__)


async def your_action_name(
    user_id: str,
    # Add your required parameters
    required_param: str,
    # Add optional parameters with defaults
    optional_param: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Your action description

    Args:
        user_id: UUID of the user (always required)
        required_param: Description of required parameter
        optional_param: Description of optional parameter

    Returns:
        Dict with action result
    """
    from app.integrations.supabase import get_supabase_client

    try:
        # Get Supabase client
        supabase: Client = get_supabase_client()

        # Your action logic here
        # Example: Insert into database
        data = {
            "user_id": user_id,
            "required_param": required_param,
            "optional_param": optional_param,
            "created_at": "now()"
        }

        response = supabase.table("your_table").insert(data).execute()

        if response.data:
            result = response.data[0]
            logger.info(f"Action completed: {result['id']} for user {user_id}")

            return {
                "success": True,
                "data": result,
                "message": f"Successfully completed your action"
            }
        else:
            return {
                "success": False,
                "error": "Failed to complete action"
            }

    except Exception as e:
        logger.error(f"Error in your_action: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


class YourActionTool(BaseTool):
    """Tool for your action"""

    def __init__(self, user_jwt: Optional[str] = None):
        super().__init__(
            tool_name="your_action_name",
            description=(
                "Brief description of what this tool does. "
                "Use this when the user asks to [describe use cases]."
            ),
            capabilities=[
                ToolCapability.ACTION,  # This is an action tool
                ToolCapability.WRITE,   # It writes data
            ],
            user_jwt=user_jwt
        )

    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> ToolResult:
        """Execute your action"""

        if not parameters:
            return self._create_error_result("No parameters provided")

        # Validate required parameters
        if "required_param" not in parameters:
            return self._create_error_result("Missing required parameter: required_param")

        # Execute the action
        result = await your_action_name(user_id=user_id, **parameters)

        if result.get("success"):
            return self._create_success_result(
                data=result["data"],
                metadata={
                    "message": result["message"],
                }
            )
        else:
            return self._create_error_result(result.get("error", "Unknown error"))
```

## Step 2: Register the Tool

Add to `backend/app/services/pam_hybrid/core/tool_registry.py`:

```python
# In _discover_available_tools() method, add to _available_modules list:

self._available_modules = [
    # ... existing tools ...

    # Your new tool (choose appropriate domain or None for general)
    {"name": "your_action", "domain": "dashboard"},  # or "budget", "trip", "community", "shop", None
]
```

**Domain Selection Guide:**
- `"dashboard"` - General user data, calendar, profile actions
- `"budget"` - Financial operations, expenses, budgets
- `"trip"` - Travel planning, routes, RV parks
- `"community"` - Social posts, friends, messaging
- `"shop"` - Shopping, cart, orders
- `None` - Available to all agents (general utilities)

## Step 3: Add Classification Patterns (Optional)

If your action uses specific keywords, add to `backend/app/services/pam_hybrid/core/classifier.py`:

```python
# Complex query patterns (require multi-step planning or actions)
self.complex_patterns = [
    # ... existing patterns ...

    # Your action patterns
    r"\b(action_verb|create|add|update)\s+.*\b(your_keyword|entity_name)",
]

# Domain patterns (if you want specific routing)
self.domain_patterns = {
    AgentDomain.YOUR_DOMAIN: [
        # ... existing patterns ...
        r"\b(your|keywords|here)\b",
    ],
}
```

**That's it!** Your action is now available to PAM.

---

## Real-World Examples

### Example 1: Create Expense

**1. Create Tool:** `backend/app/services/pam/tools/create_expense.py`

```python
async def create_expense(
    user_id: str,
    amount: float,
    category: str,
    description: Optional[str] = None,
    date: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create an expense entry"""
    supabase = get_supabase_client()

    data = {
        "user_id": user_id,
        "amount": amount,
        "category": category,
        "description": description,
        "expense_date": date or datetime.now().isoformat(),
    }

    response = supabase.table("expenses").insert(data).execute()

    return {
        "success": True,
        "data": response.data[0],
        "message": f"Added ${amount:.2f} {category} expense"
    }
```

**2. Register:**
```python
{"name": "create_expense", "domain": "budget"}
```

**3. Add Pattern:**
```python
r"\b(add|log|record)\s+.*\b(expense|cost|spent|paid)",
```

**Usage:**
- "PAM, add a $50 gas expense"
- "Log a $120 grocery expense"
- "I spent $30 on food today"

---

### Example 2: Update Vehicle Maintenance

**1. Create Tool:** `backend/app/services/pam/tools/log_maintenance.py`

```python
async def log_maintenance(
    user_id: str,
    vehicle_id: str,
    maintenance_type: str,
    mileage: int,
    cost: Optional[float] = None,
    notes: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Log vehicle maintenance"""
    supabase = get_supabase_client()

    data = {
        "user_id": user_id,
        "vehicle_id": vehicle_id,
        "type": maintenance_type,
        "mileage": mileage,
        "cost": cost,
        "notes": notes,
        "performed_at": datetime.now().isoformat(),
    }

    response = supabase.table("vehicle_maintenance").insert(data).execute()

    return {
        "success": True,
        "data": response.data[0],
        "message": f"Logged {maintenance_type} at {mileage} miles"
    }
```

**2. Register:**
```python
{"name": "log_maintenance", "domain": "trip"}  # Vehicles are trip-related
```

**3. Add Pattern:**
```python
r"\b(log|record|track)\s+.*\b(maintenance|service|oil change|repair)",
```

**Usage:**
- "PAM, log an oil change for my RV at 45000 miles"
- "Record tire rotation for $80"
- "Track brake service today"

---

### Example 3: Create Social Post

**1. Create Tool:** `backend/app/services/pam/tools/create_post.py`

```python
async def create_post(
    user_id: str,
    content: str,
    media_ids: Optional[list] = None,
    tags: Optional[list] = None,
    location_name: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create a social post"""
    supabase = get_supabase_client()

    data = {
        "user_id": user_id,
        "content": content,
        "media_ids": media_ids or [],
        "tags": tags or [],
        "location_name": location_name,
        "posted_at": datetime.now().isoformat(),
    }

    response = supabase.table("posts").insert(data).execute()

    return {
        "success": True,
        "data": response.data[0],
        "message": f"Posted to your feed"
    }
```

**2. Register:**
```python
{"name": "create_post", "domain": "community"}
```

**3. Add Pattern:**
```python
r"\b(post|share|publish)\s+.*\b(photo|update|story)",
```

**Usage:**
- "PAM, post a photo from my last trip"
- "Share an update about my travels"
- "Publish this to my feed: [content]"

---

## Advanced Features

### Multi-Step Actions

If your action requires multiple steps, you can call other tools:

```python
async def complex_action(user_id: str, **kwargs):
    """Action that uses multiple tools"""

    # Step 1: Get user data
    profile = await load_user_profile(user_id)

    # Step 2: Calculate something
    calculation = await analyze_budget(user_id, profile["preferences"])

    # Step 3: Create based on analysis
    result = await create_something(user_id, calculation["recommendation"])

    return result
```

### Parameter Validation

Add validation before executing:

```python
async def create_expense(user_id: str, amount: float, category: str, **kwargs):
    # Validate amount
    if amount <= 0:
        return {"success": False, "error": "Amount must be positive"}

    # Validate category
    valid_categories = ["food", "gas", "lodging", "entertainment", "maintenance"]
    if category not in valid_categories:
        return {"success": False, "error": f"Invalid category. Use: {valid_categories}"}

    # Proceed with action
    ...
```

### Error Handling

Always wrap database operations:

```python
try:
    response = supabase.table("table_name").insert(data).execute()

    if not response.data:
        return {"success": False, "error": "Database operation failed"}

    return {"success": True, "data": response.data[0]}

except Exception as e:
    logger.error(f"Error in action: {e}", exc_info=True)
    return {"success": False, "error": "An unexpected error occurred"}
```

### User Feedback

Provide clear, friendly messages:

```python
# Good
"Successfully added 'Doctor Appointment' to your calendar for Tuesday at 2pm"

# Bad
"Insert successful: id=123e4567-e89b-12d3-a456-426614174000"
```

---

## Testing Your Action

### 1. Syntax Check

```bash
cd backend
python3 -m py_compile app/services/pam/tools/your_action.py
```

### 2. Manual WebSocket Test

```python
# Connect via WebSocket
# Send message:
{
    "type": "message",
    "content": "PAM, [your action request]"
}

# Check response:
# - Should route to correct agent
# - Should call your tool
# - Should return success confirmation
```

### 3. Database Verification

```sql
-- Check if action created records
SELECT * FROM your_table
WHERE user_id = 'test-user-id'
ORDER BY created_at DESC
LIMIT 5;
```

### 4. Integration Test

```bash
# Run integration tests
cd backend
pytest tests/integration/test_pam_actions.py -v
```

---

## Common Patterns

### Pattern: Create Entity
- Tool: `create_[entity]`
- Domain: Appropriate domain or general
- Example: create_calendar_event, create_expense, create_trip

### Pattern: Update Entity
- Tool: `update_[entity]`
- Requires: Entity ID + fields to update
- Example: update_budget, update_profile, update_vehicle

### Pattern: Delete Entity
- Tool: `delete_[entity]`
- Requires: Entity ID + confirmation
- Example: delete_expense, delete_post, cancel_trip

### Pattern: Calculate/Analyze
- Tool: `analyze_[domain]` or `calculate_[result]`
- Returns: Analysis or calculation result
- Example: analyze_spending, calculate_route_cost

### Pattern: Search/Find
- Tool: `search_[entity]` or `find_[entity]`
- Parameters: Search criteria
- Example: find_rv_parks, search_posts, find_friends

---

## Best Practices

1. ✅ **Use clear, descriptive names** - `create_calendar_event` not `ce_tool`
2. ✅ **Validate all inputs** - Check required fields, formats, ranges
3. ✅ **Provide user-friendly messages** - "Successfully added..." not "Insert OK"
4. ✅ **Handle errors gracefully** - Return helpful error messages
5. ✅ **Log important actions** - Use logger.info() for audit trail
6. ✅ **Respect user privacy** - Default to private, follow RLS policies
7. ✅ **Keep tools focused** - One tool = one action (not multiple)
8. ✅ **Document with examples** - Show real user requests in docstrings
9. ✅ **Test thoroughly** - Manual + integration tests
10. ✅ **Follow existing patterns** - Study calendar_event tool as reference

---

## Tool Capability Flags

Use these to describe your tool's capabilities:

```python
from .base_tool import ToolCapability

# Read-only tools
capabilities=[ToolCapability.READ]

# Action tools that modify data
capabilities=[ToolCapability.ACTION, ToolCapability.WRITE]

# Analysis tools
capabilities=[ToolCapability.ANALYZE]

# Search tools
capabilities=[ToolCapability.SEARCH]

# External API tools
capabilities=[ToolCapability.EXTERNAL_API]
```

---

## Summary

Adding new PAM actions is simple:

1. **Create tool** → `backend/app/services/pam/tools/your_action.py`
2. **Register tool** → Add to `tool_registry.py` → `_available_modules`
3. **Add patterns** (optional) → Update `classifier.py`

That's it! Your action is immediately available to all users through natural language.

**Next Steps:**
- Study `create_calendar_event.py` as reference
- Choose appropriate domain for your tool
- Add validation and error handling
- Test with real user scenarios
- Deploy and monitor usage

Need help? Check existing tools in `backend/app/services/pam/tools/` for examples.