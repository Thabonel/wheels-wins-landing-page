# PRD: PAM Fuel Log Write Access

**Document ID**: PRD-PAM-003
**Date**: 2026-01-29
**Priority**: Medium
**Effort**: Low (2-3 days)
**Status**: Planning

---

## 1. Overview

### Problem Statement

PAM can currently READ fuel log entries via `get_fuel_log` but cannot CREATE, UPDATE, or DELETE entries. This means users must manually enter fuel data through the UI, even when chatting with PAM about their trip.

### Business Value

- **Convenience**: Log fuel at the pump via voice/chat
- **Accuracy**: Capture data immediately while fresh
- **Complete Integration**: Fuel tracking is core to trip planning
- **Quick Win**: Low effort, high user satisfaction

### Success Metrics

- Users can log fuel via PAM
- PAM correctly calculates price/volume/total (any 2 of 3)
- Fuel consumption tracking works (filled_to_top logic)
- Error rate < 1% for calculations

---

## 2. Current State

### Existing Tool

| Tool | Capability |
|------|------------|
| `get_fuel_log` | Read-only access to fuel entries |

### Existing UI Features

The FuelLog component (`src/components/wheels/FuelLog.tsx`) supports:
- Add fuel entry with smart calculation (enter 2 of 3: volume, price, total)
- Edit existing entries
- Delete entries
- "Filled to top" checkbox for consumption tracking
- Automatic consumption calculation when both entries are filled to top

### Database Table

| Table | Key Fields |
|-------|------------|
| `fuel_log` | `date`, `odometer`, `volume`, `price`, `total`, `filled_to_top`, `consumption` |

---

## 3. Proposed Tools

### 3.1 `add_fuel_entry`

**Purpose**: Create a new fuel log entry

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "date": {
      "type": "string",
      "format": "date",
      "description": "Fill-up date (defaults to today)"
    },
    "odometer": {
      "type": "number",
      "description": "Current odometer reading"
    },
    "volume": {
      "type": "number",
      "description": "Liters/gallons filled"
    },
    "price": {
      "type": "number",
      "description": "Price per liter/gallon"
    },
    "total": {
      "type": "number",
      "description": "Total cost"
    },
    "filled_to_top": {
      "type": "boolean",
      "default": true,
      "description": "Was the tank filled completely?"
    },
    "station": {
      "type": "string",
      "description": "Gas station name/location"
    },
    "notes": {
      "type": "string"
    }
  },
  "required": ["odometer"]
}
```

**Smart Calculation Logic**:
- If volume + total provided: calculate price = total / volume
- If volume + price provided: calculate total = volume * price
- If price + total provided: calculate volume = total / price

**Returns**:
```json
{
  "success": true,
  "entry_id": "uuid",
  "message": "Logged 45L at $1.50/L = $67.50",
  "consumption": "8.5 L/100km",
  "consumption_note": "Calculated from last fill-up"
}
```

**Example Usage**:
```
User: "I just filled up - 45 liters for $67.50"
PAM: "Got it! What's your odometer reading?"
User: "44,850"
PAM: "Logged: 45L at $1.50/L = $67.50 at 44,850 km.
      Your fuel consumption is 8.5 L/100km since your last fill-up."

User: "Filled up 50 liters at $1.45 per liter"
PAM: "What's your odometer?"
User: "45,200"
PAM: "Logged: 50L at $1.45/L = $72.50 at 45,200 km."
```

---

### 3.2 `update_fuel_entry`

**Purpose**: Modify an existing fuel entry

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "entry_id": {"type": "string"},
    "date": {"type": "string", "format": "date"},
    "odometer": {"type": "number"},
    "volume": {"type": "number"},
    "price": {"type": "number"},
    "total": {"type": "number"},
    "filled_to_top": {"type": "boolean"},
    "station": {"type": "string"},
    "notes": {"type": "string"}
  },
  "required": ["entry_id"]
}
```

**Example Usage**:
```
User: "Actually that last fill-up was 46 liters, not 45"
PAM: "Updated last entry to 46L. New total: $69.00 at $1.50/L."
```

---

### 3.3 `delete_fuel_entry`

**Purpose**: Remove a fuel entry

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "entry_id": {"type": "string"},
    "confirm": {"type": "boolean"}
  },
  "required": ["entry_id", "confirm"]
}
```

**Example Usage**:
```
User: "Delete my last fuel entry"
PAM: "Delete the entry from January 29th (45L, $67.50)?"
User: "Yes"
PAM: "Deleted fuel entry."
```

---

### 3.4 `get_fuel_stats`

**Purpose**: Get fuel statistics and trends (enhancement to existing get_fuel_log)

**Parameters**:
```json
{
  "type": "object",
  "properties": {
    "period": {
      "type": "string",
      "enum": ["week", "month", "year", "all"],
      "default": "month"
    }
  },
  "required": []
}
```

**Returns**:
```json
{
  "period": "month",
  "total_spent": 285.50,
  "total_volume": 195,
  "fill_ups": 4,
  "average_consumption": "8.2 L/100km",
  "best_consumption": "7.8 L/100km",
  "worst_consumption": "9.1 L/100km",
  "average_price": "1.46/L"
}
```

**Example Usage**:
```
User: "How much have I spent on fuel this month?"
PAM: "This month you've spent $285.50 on 195 liters across 4 fill-ups.
      Average consumption: 8.2 L/100km. Average price: $1.46/L."
```

---

## 4. Technical Implementation

### File Structure

```
backend/app/services/pam/tools/fuel/
├── __init__.py
└── fuel_crud.py
```

### Smart Calculation Implementation

```python
async def add_fuel_entry(
    user_id: str,
    odometer: float,
    volume: float = None,
    price: float = None,
    total: float = None,
    date: str = None,
    filled_to_top: bool = True,
    station: str = None,
    notes: str = None
) -> dict:
    """Add fuel entry with smart calculation"""

    # Smart calculation: need 2 of 3 (volume, price, total)
    provided = sum(x is not None for x in [volume, price, total])

    if provided < 2:
        return {
            "success": False,
            "error": "Please provide at least 2 of: volume, price per unit, total cost"
        }

    if provided == 2:
        if volume is None:
            volume = total / price
        elif price is None:
            price = total / volume
        elif total is None:
            total = volume * price

    # Round appropriately
    volume = round(volume, 2)
    price = round(price, 3)
    total = round(total, 2)

    # Get previous entry for consumption calculation
    consumption = None
    if filled_to_top:
        prev_entry = await get_last_filled_entry(user_id)
        if prev_entry and prev_entry['filled_to_top']:
            distance = odometer - prev_entry['odometer']
            if distance > 0:
                consumption = round((volume / distance) * 100, 1)

    # Insert record
    supabase = get_supabase_client()
    record = {
        "user_id": user_id,
        "date": date or get_today_local(),
        "odometer": odometer,
        "volume": volume,
        "price": price,
        "total": total,
        "filled_to_top": filled_to_top,
        "consumption": consumption,
        "station": station,
        "notes": notes
    }

    result = await supabase.table('fuel_log').insert(record).execute()

    if result.error:
        return {"success": False, "error": str(result.error)}

    return {
        "success": True,
        "entry_id": result.data[0]['id'],
        "message": f"Logged {volume}L at ${price}/L = ${total}",
        "consumption": f"{consumption} L/100km" if consumption else None
    }
```

### Registration

```python
# In tool_registry.py

from app.services.pam.tools.fuel import (
    add_fuel_entry,
    update_fuel_entry,
    delete_fuel_entry,
    get_fuel_stats,
)
```

---

## 5. User Stories

### US-001: Quick Fuel Logging
**As a** user at a gas station
**I want to** quickly log my fill-up via PAM
**So that** I don't forget details

### US-002: Calculate Missing Values
**As a** user
**I want** PAM to calculate the third value
**So that** I only need to enter what I see

### US-003: Track Consumption
**As a** user
**I want** PAM to tell me my fuel consumption
**So that** I can monitor efficiency

### US-004: Fix Mistakes
**As a** user who made an entry error
**I want to** correct it via PAM
**So that** my records are accurate

---

## 6. Conversation Examples

### Example 1: Full Entry
```
User: "Log 45 liters at $1.50 per liter, odometer 44850"
PAM: "Logged: 45L at $1.50/L = $67.50 at 44,850 km.
      Consumption: 8.5 L/100km (based on last fill-up at 44,350 km)."
```

### Example 2: Calculate Price
```
User: "Filled 50 liters for $72.50"
PAM: "What's your current odometer?"
User: "45200"
PAM: "Logged: 50L at $1.45/L = $72.50 at 45,200 km."
```

### Example 3: Partial Fill
```
User: "Put in 20 liters, didn't fill completely"
PAM: "What was the price per liter and odometer?"
User: "$1.48 per liter, 45400"
PAM: "Logged partial fill: 20L at $1.48/L = $29.60 at 45,400 km.
      (Consumption not calculated - partial fill)"
```

### Example 4: Check Stats
```
User: "What's my average fuel consumption?"
PAM: "Over the past month:
      - Average: 8.2 L/100km
      - Best: 7.8 L/100km (Jan 15)
      - Worst: 9.1 L/100km (Jan 22)
      - Total spent: $285.50 on 195 liters"
```

---

## 7. Testing Plan

### Unit Tests
- Smart calculation: volume + price -> total
- Smart calculation: volume + total -> price
- Smart calculation: price + total -> volume
- Consumption calculation with filled_to_top
- No consumption for partial fills

### Integration Tests
- Full add flow with consumption
- Update entry
- Delete entry
- Stats calculation

### Edge Cases
- First entry (no previous for consumption)
- Negative odometer difference (error)
- Zero values (validation)

---

## 8. Rollout Plan

### Phase 1: Add Entry (Day 1)
- `add_fuel_entry` with smart calculation

### Phase 2: Full CRUD (Day 2)
- `update_fuel_entry`
- `delete_fuel_entry`

### Phase 3: Enhanced Stats (Day 3)
- `get_fuel_stats`

---

## 9. Dependencies

- `fuel_log` table with `filled_to_top` column (exists)
- Existing `get_fuel_log` tool (exists)
- Supabase service role access

---

## 10. Open Questions

1. Should PAM suggest nearby cheap gas stations when logging?
2. Should fuel entries integrate with expense tracking automatically?
3. Should we support multiple unit systems (liters vs gallons)?

---

**Document End**
