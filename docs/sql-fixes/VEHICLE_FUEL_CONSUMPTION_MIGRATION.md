# Vehicle Fuel Consumption Migration

**Date**: October 10, 2025
**Migration File**: `supabase/migrations/20251010000000-add-vehicle-fuel-consumption.sql`
**Status**: ✅ Ready to apply

## Overview

This migration enables PAM to store and use vehicle fuel consumption data for accurate trip cost calculations.

## What It Does

### Creates vehicles table if missing
- Full schema with 24 columns (name, make, model, year, etc.)
- RLS policies for user data isolation
- Indexes for performance
- Updated_at trigger for automatic timestamp updates

### Adds fuel consumption tracking
- `fuel_consumption_mpg` - Miles per gallon (US metric)
- `fuel_consumption_l_per_100km` - Liters per 100km (international)
- `fuel_consumption_source` - How data was obtained (user_provided, calculated_from_fillups, manufacturer_spec)
- `fuel_consumption_last_updated` - Timestamp of last update
- `fuel_consumption_sample_size` - Number of fill-ups used for calculation

## Migration Safety

**This migration is 100% idempotent and safe to run multiple times:**

✅ **If vehicles table doesn't exist** → Creates complete table with all columns
✅ **If vehicles table exists** → Only adds missing fuel columns
✅ **If fuel columns exist** → Does nothing (no errors)
✅ **All operations use IF NOT EXISTS** → Safe concurrent execution

## How to Apply

### Via Supabase Dashboard

1. **Navigate to SQL Editor**
   - Go to https://supabase.com/dashboard/project/ydevatqwkoccxhtejdor
   - Click "SQL Editor" in left sidebar
   - Click "New query"

2. **Copy Migration SQL**
   - Open: `supabase/migrations/20251010000000-add-vehicle-fuel-consumption.sql`
   - Copy all contents (109 lines)
   - Paste into SQL Editor

3. **Execute Migration**
   - Click "Run" or press Cmd/Ctrl + Enter
   - Wait for "Success" confirmation
   - Review output for any errors

4. **Verify Tables Created**
   ```sql
   -- Run this to verify:
   SELECT table_name, column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'vehicles'
   AND column_name LIKE '%fuel%';
   ```

   **Expected output:**
   ```
   vehicles | fuel_type | text
   vehicles | fuel_capacity_gallons | numeric
   vehicles | fuel_consumption_mpg | numeric
   vehicles | fuel_consumption_l_per_100km | numeric
   vehicles | fuel_consumption_source | text
   vehicles | fuel_consumption_last_updated | timestamp with time zone
   vehicles | fuel_consumption_sample_size | integer
   ```

## PAM Tool Integration

Once migration is applied, users can tell PAM their fuel consumption:

**Examples:**
- "My truck uses 24 liters per 100km"
- "My RV gets 8 miles per gallon"
- "Update fuel consumption to 12 MPG"

**What Happens:**
1. PAM calls `update_vehicle_fuel_consumption` tool
2. Data stored in user's primary vehicle record
3. `calculate_gas_cost` tool uses stored data for trip planning
4. Automatic unit conversion (MPG ↔ L/100km using factor 235.214)

## Future Enhancements

**Auto-Learning from Fill-Ups (Not Yet Implemented):**
- Analyze `fuel_log` table entries
- Calculate average MPG from actual fill-ups
- Update `fuel_consumption_mpg` when sample size ≥ 5
- Change source to `calculated_from_fillups`
- Notify user of auto-update

## Testing After Migration

### 1. Via PAM Chat
```
User: "My truck uses 24 liters per 100km"
PAM: "Got it! I've recorded that your truck uses 24.0 L/100km (9.8 MPG). I'll use this for trip cost calculations."
```

### 2. Via Database Query
```sql
-- Check if data was stored
SELECT
  name,
  fuel_consumption_mpg,
  fuel_consumption_l_per_100km,
  fuel_consumption_source,
  fuel_consumption_last_updated
FROM vehicles
WHERE user_id = 'YOUR_USER_ID';
```

### 3. Via Trip Cost Calculation
```
User: "Calculate gas cost for 500 miles"
PAM: "Estimated gas cost: $204.17 for 500 miles (51.0 gallons at 9.8 MPG)"
```

## Rollback (If Needed)

**To remove fuel consumption columns:**
```sql
ALTER TABLE vehicles
DROP COLUMN IF EXISTS fuel_consumption_mpg,
DROP COLUMN IF EXISTS fuel_consumption_l_per_100km,
DROP COLUMN IF EXISTS fuel_consumption_source,
DROP COLUMN IF EXISTS fuel_consumption_last_updated,
DROP COLUMN IF EXISTS fuel_consumption_sample_size;

DROP INDEX IF EXISTS idx_vehicles_fuel_consumption;
```

**To remove entire vehicles table (DANGEROUS):**
```sql
DROP TABLE IF EXISTS vehicles CASCADE;
```

## Related Files

**Backend:**
- `backend/app/services/pam/tools/trip/update_vehicle_fuel_consumption.py` - PAM tool to update fuel data
- `backend/app/services/pam/tools/trip/calculate_gas_cost.py` - Uses stored fuel data
- `backend/app/services/pam/core/pam.py` - Tool registration

**Migration:**
- `supabase/migrations/20251010000000-add-vehicle-fuel-consumption.sql` - This migration
- `supabase/migrations/05_vehicle_management.sql` - Original vehicles schema

## Troubleshooting

**Error: "relation 'vehicles' does not exist"**
- ✅ Fixed! New migration creates table if missing

**Error: "column already exists"**
- ✅ Safe! Migration uses ADD COLUMN IF NOT EXISTS

**Error: "policy already exists"**
- ✅ Safe! Migration checks policy existence before creating

**No error but columns not added**
- Check you're running on correct database
- Verify connection to production (not local)
- Check user has DDL permissions

## Next Steps

1. ✅ Apply migration via Supabase dashboard
2. ⬜ Test fuel consumption tracking end-to-end
3. ⬜ Monitor PAM logs for successful tool execution
4. ⬜ Implement auto-learning from fuel_log averages (future)

---

**Commit**: `1efbf2ac`
**Branch**: `staging`
**Ready to Deploy**: Yes
