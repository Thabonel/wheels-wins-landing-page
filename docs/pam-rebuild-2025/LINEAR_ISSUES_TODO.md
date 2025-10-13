# Linear Issues to Create - PAM Fuel Consumption & Unit System

**Date**: October 10, 2025
**Session Context**: Post fuel consumption + unit system implementation
**Action Required**: Create these issues in Linear after session restart

---

## 🎯 Immediate Tasks (Current Sprint)

### Issue 1: Apply Vehicle Fuel Consumption Migration
**Title**: Apply vehicle fuel consumption database migration to production

**Description**:
Apply the comprehensive vehicle fuel consumption migration to Supabase production database.

**Details**:
- Migration file: `supabase/migrations/20251010000000-add-vehicle-fuel-consumption.sql`
- Creates vehicles table if missing (complete schema)
- Adds fuel consumption columns (MPG + L/100km)
- 100% idempotent - safe to run multiple times
- Documentation: `docs/sql-fixes/VEHICLE_FUEL_CONSUMPTION_MIGRATION.md`

**Steps**:
1. Navigate to Supabase dashboard SQL editor
2. Copy migration file contents
3. Execute migration
4. Verify tables created with query from docs

**Acceptance Criteria**:
- [ ] vehicles table exists in production
- [ ] fuel_consumption_mpg column exists
- [ ] fuel_consumption_l_per_100km column exists
- [ ] fuel_consumption_source column exists with CHECK constraint
- [ ] RLS policies created
- [ ] Indexes created

**Labels**: `migration`, `database`, `pam`, `critical`
**Priority**: High
**Estimate**: 30 minutes
**Commit**: `1efbf2ac`, `a324cadb`

---

### Issue 2: End-to-End Testing - Fuel Consumption Tracking
**Title**: Test PAM fuel consumption tracking end-to-end

**Description**:
Verify the complete flow of fuel consumption tracking from user input to database storage to trip cost calculations.

**Test Scenarios**:

**Scenario 1: Imperial User (US)**
```
1. Set user preference: UPDATE user_settings SET regional_preferences = jsonb_set(regional_preferences, '{units}', '"imperial"') WHERE user_id = 'test-user';
2. PAM: "My truck uses 10 MPG"
3. Verify: Check vehicles table shows fuel_consumption_mpg = 10
4. PAM: "Calculate gas cost for 500 miles"
5. Verify: Response shows "500 miles (50.0 gallons at 10.0 MPG)"
```

**Scenario 2: Metric User (International)**
```
1. Set user preference: UPDATE user_settings SET regional_preferences = jsonb_set(regional_preferences, '{units}', '"metric"') WHERE user_id = 'test-user';
2. PAM: "My truck uses 24 liters per 100km"
3. Verify: Check vehicles table shows fuel_consumption_l_per_100km = 24
4. PAM: "Calculate gas cost for 500 miles"
5. Verify: Response shows "804.67 km (193.0 liters at 24.0 L/100km)"
```

**Scenario 3: Mixed Input**
```
1. US user says "24 liters per 100km" (metric input)
2. Verify: PAM converts and responds "9.8 MPG" (imperial output)
3. International user says "10 MPG" (imperial input)
4. Verify: PAM converts and responds "23.5 L/100km" (metric output)
```

**Acceptance Criteria**:
- [ ] Imperial users see responses in MPG/miles/gallons
- [ ] Metric users see responses in L/100km/km/liters
- [ ] Data stored correctly in vehicles table
- [ ] calculate_gas_cost uses stored vehicle data
- [ ] Unit conversions accurate (235.214 factor)
- [ ] No errors in PAM logs

**Labels**: `testing`, `pam`, `trip-tools`, `critical`
**Priority**: High
**Estimate**: 1 hour
**Related Files**:
- `backend/app/services/pam/tools/trip/update_vehicle_fuel_consumption.py`
- `backend/app/services/pam/tools/trip/calculate_gas_cost.py`
- `backend/app/services/pam/tools/trip/unit_conversion.py`

**Commits**: `49eefe78`, `ef6b3007`

---

### Issue 3: Update PAM Frontend to Display Unit Preference
**Title**: Add unit system toggle in user settings

**Description**:
Allow users to change their unit preference (imperial/metric) in the frontend settings page.

**Requirements**:
- Add toggle in Settings → Regional Preferences
- Current options: "Imperial (US)" or "Metric (International)"
- Update `user_settings.regional_preferences.units`
- Show current preference
- Instant update (no page refresh)
- Show confirmation toast

**UI Location**: Settings page → Regional Preferences section

**Implementation**:
```typescript
// Add to regional preferences section
<Select
  label="Distance & Fuel Units"
  value={settings.regional_preferences.units}
  onChange={(value) => updateRegionalPreference('units', value)}
>
  <option value="imperial">Imperial (miles, MPG, gallons)</option>
  <option value="metric">Metric (km, L/100km, liters)</option>
</Select>
```

**Acceptance Criteria**:
- [ ] Toggle visible in Settings
- [ ] Changes saved to database
- [ ] PAM responses update immediately
- [ ] Default is "imperial"
- [ ] Tooltip explains difference

**Labels**: `frontend`, `settings`, `pam`, `enhancement`
**Priority**: Medium
**Estimate**: 2 hours
**Related Files**:
- `src/pages/Settings.tsx` (or wherever settings are)
- `src/hooks/useUserSettings.ts`

---

## 🔮 Future Enhancements (Backlog)

### Issue 4: Auto-Learning Fuel Consumption from Fill-Ups
**Title**: Implement auto-learning of fuel consumption from fuel log entries

**Description**:
Automatically calculate and update vehicle fuel consumption based on actual fill-up data from fuel_log table.

**Algorithm**:
```python
# When user logs a fill-up with full tank:
1. Get last full-tank fill-up for same vehicle
2. Calculate: miles_driven = current_mileage - last_mileage
3. Calculate: mpg = miles_driven / gallons_filled
4. If sample_size >= 5:
   - Calculate rolling average MPG
   - Update vehicles.fuel_consumption_mpg
   - Update vehicles.fuel_consumption_source = 'calculated_from_fillups'
   - Update vehicles.fuel_consumption_sample_size++
   - Notify user: "I've updated your vehicle's fuel consumption to X MPG based on your last 5 fill-ups"
```

**Database Dependencies**:
- fuel_log table with mpg_calculated field
- vehicles table with fuel consumption fields (✅ done)

**Acceptance Criteria**:
- [ ] Auto-calculates MPG from fuel logs
- [ ] Requires minimum 5 full-tank fill-ups
- [ ] Updates vehicles table automatically
- [ ] Notifies user of auto-update
- [ ] More accurate than user-provided data
- [ ] Overrides user-provided after 5 samples

**Labels**: `enhancement`, `pam`, `trip-tools`, `ai`, `future`
**Priority**: Low
**Estimate**: 4 hours
**Related Tables**: `fuel_log`, `vehicles`

---

### Issue 5: Temperature Unit Conversion (Celsius/Fahrenheit)
**Title**: Add temperature unit conversion for weather forecasts

**Description**:
Extend unit conversion system to support temperature in weather-related PAM tools.

**Implementation**:
- Add to `unit_conversion.py`:
  - `convert_fahrenheit_to_celsius(f: float) -> float`
  - `convert_celsius_to_fahrenheit(c: float) -> float`
  - `format_temperature(fahrenheit: float, unit_system: UnitSystem) -> str`

**Affected Tools**:
- `get_weather_forecast` - Return temps in user's preference
- `plan_trip` - Weather along route in correct units

**Example**:
```
Imperial: "Weather in Denver: 72°F, sunny"
Metric: "Weather in Denver: 22°C, sunny"
```

**Labels**: `enhancement`, `pam`, `trip-tools`, `weather`, `future`
**Priority**: Low
**Estimate**: 2 hours

---

### Issue 6: Speed Unit Conversion (MPH/km/h)
**Title**: Add speed unit conversion for route planning

**Description**:
Support MPH and km/h in route planning and ETA calculations.

**Implementation**:
- Add to `unit_conversion.py`:
  - `convert_mph_to_kmh(mph: float) -> float`
  - `convert_kmh_to_mph(kmh: float) -> float`
  - `format_speed(mph: float, unit_system: UnitSystem) -> str`

**Affected Tools**:
- `estimate_travel_time` - Show speed limits in correct units
- `optimize_route` - Display average speed

**Example**:
```
Imperial: "Average speed: 65 MPH"
Metric: "Average speed: 105 km/h"
```

**Labels**: `enhancement`, `pam`, `trip-tools`, `future`
**Priority**: Low
**Estimate**: 2 hours

---

### Issue 7: Auto-Detect Unit Preference from Location
**Title**: Auto-detect unit preference based on user location/locale

**Description**:
Automatically set user's unit preference on first use based on browser locale and IP geolocation.

**Detection Logic**:
```python
async def detect_user_units(user_id: str, browser_locale: str, ip_address: str):
    # 1. Check if already set - if yes, return

    # 2. Detect from browser locale
    if browser_locale.startswith('en-US'):
        return 'imperial'
    elif browser_locale.startswith('en-GB'):  # UK uses metric
        return 'metric'

    # 3. Detect from IP geolocation
    country = geolocate_ip(ip_address)
    if country == 'US':
        return 'imperial'
    else:
        return 'metric'

    # 4. Default to imperial
    return 'imperial'
```

**User Experience**:
- On first PAM interaction, show: "I've detected you're in [Country], so I'll use [metric/imperial] units. You can change this in Settings."
- Store preference in user_settings
- User can override in Settings

**Acceptance Criteria**:
- [ ] Auto-detects on first use
- [ ] Browser locale detection works
- [ ] IP geolocation fallback works
- [ ] Shows confirmation message
- [ ] User can override
- [ ] Stores preference permanently

**Labels**: `enhancement`, `pam`, `ux`, `auto-detection`, `future`
**Priority**: Low
**Estimate**: 3 hours
**Dependencies**: IP geolocation service (e.g., ipapi.co)

---

## 📊 Completed Work (For Reference)

### ✅ Vehicle Fuel Consumption Database Schema
- **Commit**: `1efbf2ac`
- Migration created with full vehicles table + fuel consumption columns
- Idempotent migration (safe to run multiple times)
- Documentation: `VEHICLE_FUEL_CONSUMPTION_MIGRATION.md`

### ✅ Location-Based Unit System Implementation
- **Commit**: `49eefe78`
- Created `unit_conversion.py` with all conversion utilities
- Updated `calculate_gas_cost` to support miles and km input
- Updated `update_vehicle_fuel_consumption` to format responses
- Auto-detects user preference from database
- Documentation: `LOCATION_BASED_UNITS.md`

### ✅ PAM Tools Integration
- 10 budget tools ✅
- 10 trip tools ✅ (including fuel consumption tracking)
- All tools registered in PAM core
- Claude function calling integrated

---

## 🔗 Related Documentation

- **PAM Rebuild Plan**: `docs/pam-rebuild-2025/PAM_FINAL_PLAN.md`
- **Migration Guide**: `docs/sql-fixes/VEHICLE_FUEL_CONSUMPTION_MIGRATION.md`
- **Unit System Guide**: `docs/pam-rebuild-2025/LOCATION_BASED_UNITS.md`
- **Day 4 Complete**: `docs/pam-rebuild-2025/DAY_4_COMPLETE.md`

---

## 📝 How to Use This File

### After Session Restart with Linear Tools:

1. **Create Critical Issues (Do First)**:
   ```
   Me: "Create Linear issues for items 1-3 from LINEAR_ISSUES_TODO.md with high priority"
   ```

2. **Create Future Enhancements**:
   ```
   Me: "Create Linear issues for items 4-7 from LINEAR_ISSUES_TODO.md as backlog items"
   ```

3. **Link to PAM Project**:
   ```
   Me: "Add all created issues to the 'PAM Rebuild 2025' project"
   ```

4. **Assign to Sprint**:
   ```
   Me: "Add issues 1-3 to current sprint"
   ```

### Issue Creation Template for Linear:

**For each issue above, use:**
- Title: [Copy from issue title]
- Description: [Copy from Description + Details/Requirements]
- Labels: [Copy from Labels field]
- Priority: [Copy from Priority field]
- Estimate: [Copy from Estimate field]
- Project: PAM Rebuild 2025
- Status: Todo (or In Progress for issue 1 if migration already applied)

---

**Created**: October 10, 2025
**Status**: Ready for Linear import
**Next Action**: Restart session → Create Linear issues → Continue with Issue 1 (Apply migration)
