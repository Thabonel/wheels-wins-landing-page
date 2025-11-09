# Quick Test Instructions - Transition Module

## Step 1: Run SQL Migration (Do This First!)

1. Go to: https://supabase.com/dashboard/project/ydevatqwkoccxhtejdor/sql
2. Click "New Query"
3. Open: `docs/sql-fixes/make_transition_fields_nullable.sql`
4. Copy entire contents
5. Paste into Supabase SQL Editor
6. Click "Run"
7. **Expected output**: 3 rows showing fields are now nullable

## Step 2: Push Code to Staging

```bash
git push origin staging
```

Wait for Netlify deployment (~2-3 minutes)

## Step 3: Test in Browser

1. **Go to**: https://wheels-wins-staging.netlify.app
2. **Log in** (if not already)
3. **Navigate to**: You page
4. **Click**: "Start Planning My Transition" button
5. **Expected**: Successfully navigates to /transition page (no 403 error!)

## Step 4: Test Settings Dialog

1. **On Transition Dashboard**: Click "Settings" button (top right)
2. **Try changing**:
   - Departure date (pick any date)
   - Transition type (switch to "Part-Time RV Travel")
   - Current phase (change to "Preparing")
   - Add motivation text
3. **Click**: "Save Changes"
4. **Expected**: Toast notification "Settings updated successfully"
5. **Verify**: Dashboard updates with your changes

## Step 5: Test Flexibility

1. **Clear departure date**: Open Settings → Delete date → Save
2. **Expected**: Dashboard shows "Plan your transition to RV living"
3. **Set new date**: Open Settings → Pick date 30 days out → Save
4. **Expected**: Countdown shows "30 days until departure"

## Troubleshooting

### If you still get 403 error:
1. **Log out completely**
2. **Clear site data**: DevTools → Application → Clear site data
3. **Close browser entirely**
4. **Reopen and log in** (fresh JWT token)
5. **Try again**

### If Settings button does nothing:
- Check browser console for errors
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### If SQL migration fails:
- Make sure you're connected to the right project
- Check you have admin permissions
- Try running each ALTER statement separately

---

**Summary**:
- SQL migration = Makes fields flexible
- Button click = Creates profile with defaults
- Settings = Change everything anytime
- No more rigid requirements!
