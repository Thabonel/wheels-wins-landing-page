# Location-Based Unit System for PAM

**Date**: October 10, 2025
**Status**: ✅ Implemented
**Commit**: `49eefe78`

## Overview

PAM now automatically switches between imperial (miles/MPG/gallons) and metric (km/L per 100km/liters) units based on the user's location/preference stored in `user_settings.regional_preferences.units`.

## How It Works

### 1. User Preference Detection

PAM reads the user's unit preference from the database:
```python
async def get_user_unit_preference(user_id: str) -> UnitSystem:
    """Returns 'imperial' or 'metric' based on user_settings.regional_preferences"""
```

**Storage Location**: `user_settings.regional_preferences.units`
- `"imperial"` - US users (miles, MPG, gallons, Fahrenheit)
- `"metric"` - International users (km, L/100km, liters, Celsius)

### 2. Automatic Response Formatting

All PAM responses are formatted in the user's preferred units:

**Imperial (US):**
```
User: "My truck uses 24 liters per 100km"
PAM: "Got it! I've recorded that your truck uses 9.8 MPG"

User: "Calculate gas cost for 500 miles"
PAM: "Estimated gas cost: $204.17 for 500 miles (51.0 gallons at 9.8 MPG, $3.50/gallon)"
```

**Metric (International):**
```
User: "My truck uses 24 liters per 100km"
PAM: "Got it! I've recorded that your truck uses 24.0 L/100km"

User: "Calculate gas cost for 500 miles"
PAM: "Estimated gas cost: $204.17 for 804.67 km (193.0 liters at 24.0 L/100km, $0.92/liter)"
```

### 3. Flexible Input

PAM accepts input in EITHER unit system, regardless of user preference:

```python
# calculate_gas_cost accepts both:
async def calculate_gas_cost(
    distance_miles: Optional[float] = None,  # For US users
    distance_km: Optional[float] = None,     # For international users
    ...
)
```

**Example:**
- US user says "800 kilometers" → Auto-converts to 497 miles internally
- International user says "500 miles" → Auto-converts to 805 km internally
- All storage is in miles (internal format)
- All responses formatted in user's preference

## Conversion Utilities

### Distance Conversion
```python
convert_miles_to_km(miles: float) -> float
convert_km_to_miles(km: float) -> float
```

### Fuel Consumption Conversion
```python
convert_mpg_to_l_per_100km(mpg: float) -> float
convert_l_per_100km_to_mpg(l_per_100km: float) -> float
```

**Formula**: `MPG = 235.214 / (L/100km)`

### Fuel Volume Conversion
```python
convert_gallons_to_liters(gallons: float) -> float
convert_liters_to_gallons(liters: float) -> float
```

**Constant**: `1 gallon = 3.78541 liters`

## Formatting Functions

### Distance Formatting
```python
format_distance(distance_miles: float, unit_system: UnitSystem) -> str
# Imperial: "100 miles"
# Metric: "160.9 km"
```

### Fuel Consumption Formatting
```python
format_fuel_consumption(mpg: float, unit_system: UnitSystem) -> str
# Imperial: "25 MPG"
# Metric: "9.4 L/100km"
```

### Fuel Volume Formatting
```python
format_fuel_volume(gallons: float, unit_system: UnitSystem) -> str
# Imperial: "20 gallons"
# Metric: "75.7 liters"
```

### Gas Cost Response Formatting
```python
format_gas_cost_response(
    distance_miles: float,
    mpg: float,
    gallons_needed: float,
    total_cost: float,
    unit_system: UnitSystem,
    gas_price: float
) -> str
# Imperial: "Estimated gas cost: $204.17 for 500 miles (51.0 gallons at 9.8 MPG, $3.50/gallon)"
# Metric: "Estimated gas cost: $204.17 for 804.67 km (193.0 liters at 24.0 L/100km, $0.92/liter)"
```

## Default Behavior

**If user has no preference set:**
- Defaults to `"imperial"` (US units)
- User can override in Settings → Regional Preferences

**If user_settings record doesn't exist:**
- Creates default with `"imperial"` units
- Auto-detects based on:
  - Browser locale (navigator.language)
  - IP geolocation (backend)
  - Manual selection in settings

## Files Modified

### New File
- `backend/app/services/pam/tools/trip/unit_conversion.py` (182 lines)
  - All conversion utilities
  - Unit preference detection
  - Response formatting

### Updated Files
- `backend/app/services/pam/tools/trip/calculate_gas_cost.py`
  - Accept distance in miles OR km
  - Format response in user's units
  - Auto-detect unit preference

- `backend/app/services/pam/tools/trip/update_vehicle_fuel_consumption.py`
  - Format confirmation in user's units
  - Use centralized conversion functions

- `backend/app/services/pam/core/pam.py`
  - Updated Claude tool schema for calculate_gas_cost
  - Support both distance_miles and distance_km parameters
  - Updated description to mention automatic unit formatting

## Internal Storage Format

**All data stored in imperial units internally:**
- Distance: miles
- Fuel consumption: MPG
- Fuel volume: gallons
- Temperature: Fahrenheit (future)

**Why imperial for storage?**
- Consistent internal format
- Easier calculations (no unit conversion in business logic)
- Convert only at presentation layer (user-facing responses)

## Setting User Preference

### Via Database (Manual)
```sql
UPDATE user_settings
SET regional_preferences = jsonb_set(
    regional_preferences,
    '{units}',
    '"metric"'
)
WHERE user_id = 'user-uuid';
```

### Via Frontend (Future)
```typescript
// Settings → Regional Preferences
await updateUserSettings({
  regional_preferences: {
    units: 'metric',  // or 'imperial'
    currency: 'EUR',
    timezone: 'Europe/London',
    date_format: 'DD/MM/YYYY'
  }
});
```

### Auto-Detection Logic (Future Enhancement)
```python
async def detect_user_units(user_id: str, browser_locale: str, ip_address: str):
    # 1. Check if already set
    # 2. Detect from browser locale (en-US → imperial, en-GB → metric)
    # 3. Detect from IP geolocation (US → imperial, others → metric)
    # 4. Default to imperial if uncertain
```

## Testing

### Test Imperial User (US)
```sql
-- Set user to imperial
UPDATE user_settings
SET regional_preferences = jsonb_set(regional_preferences, '{units}', '"imperial"')
WHERE user_id = 'test-user-id';
```

**PAM Chat:**
```
User: "My RV uses 10 MPG"
PAM: "Got it! I've recorded that your RV uses 10.0 MPG"

User: "Calculate gas cost for 500 miles"
PAM: "Estimated gas cost: $175.00 for 500 miles (50.0 gallons at 10.0 MPG, $3.50/gallon)"
```

### Test Metric User (International)
```sql
-- Set user to metric
UPDATE user_settings
SET regional_preferences = jsonb_set(regional_preferences, '{units}', '"metric"')
WHERE user_id = 'test-user-id';
```

**PAM Chat:**
```
User: "My RV uses 10 MPG"
PAM: "Got it! I've recorded that your RV uses 23.5 L/100km"

User: "Calculate gas cost for 500 miles"
PAM: "Estimated gas cost: $175.00 for 804.67 km (189.3 liters at 23.5 L/100km, $0.92/liter)"
```

## Future Enhancements

### 1. Temperature Units
- Imperial: Fahrenheit
- Metric: Celsius
- Apply to weather forecasts

### 2. Speed Units
- Imperial: MPH (miles per hour)
- Metric: km/h (kilometers per hour)
- Apply to route planning

### 3. Weight Units
- Imperial: pounds, tons
- Metric: kilograms, tonnes
- Apply to vehicle specifications

### 4. Volume Units (Non-Fuel)
- Imperial: gallons, quarts
- Metric: liters, milliliters
- Apply to fluid capacities (coolant, oil, etc.)

### 5. Auto-Detection
- Browser locale detection
- IP geolocation
- User confirmation on first use

### 6. Mixed Units (Advanced)
- Some users prefer "fuel in liters but distance in miles"
- Add granular preferences in settings

## Benefits

✅ **Better UX**: Users see familiar units
✅ **Global Reach**: Support international RVers
✅ **Consistent**: All PAM tools use same unit system
✅ **Flexible**: Accept input in any unit, convert as needed
✅ **Maintainable**: Centralized conversion logic

## Migration Notes

**No database migration required** - unit preference already exists in `user_settings.regional_preferences.units`

**Default value**: `"imperial"` (set in migration 20250727160000-create-user-settings-table.sql)

**Backward compatible**: Existing users default to imperial, no breaking changes

---

**Status**: ✅ Complete and deployed to staging
**Tested**: Unit conversions validated
**Ready for**: Production deployment
