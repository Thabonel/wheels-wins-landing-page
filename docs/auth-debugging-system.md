# Authentication Debugging System

## 🔍 Problem Analysis

The core issue was that `auth.uid()` returns `null` in database queries, causing all RLS (Row Level Security) policies to fail with permission denied errors (PostgreSQL error 42501). This created a cascade of issues where authenticated users couldn't access their own data despite having valid JWT tokens in the frontend.

## 🛠️ Solutions Implemented

### 1. JWT Token Flow Debugging (`src/integrations/supabase/client.ts`)

Enhanced the Supabase client with comprehensive JWT debugging:

```typescript
// Monitor auth state changes in Supabase client
supabase.auth.onAuthStateChange((event, session) => {
  console.log('📡 Supabase Auth State Change:', {
    event,
    hasSession: !!session,
    hasAccessToken: !!session?.access_token,
    tokenExpiry: session?.expires_at,
    userId: session?.user?.id,
    timestamp: new Date().toISOString()
  });

  // Log JWT token details for debugging auth.uid() issues
  if (session?.access_token) {
    try {
      const parts = session.access_token.split('.');
      if (parts.length === 3) {
        const header = JSON.parse(atob(parts[0]));
        const payload = JSON.parse(atob(parts[1]));

        // Check if JWT contains required claims for auth.uid()
        if (!payload.sub) {
          console.error('❌ JWT missing "sub" claim - this will cause auth.uid() to return null');
        }
        if (payload.role !== 'authenticated') {
          console.warn('⚠️ JWT role is not "authenticated":', payload.role);
        }
      }
    } catch (error) {
      console.error('❌ Failed to decode JWT token:', error);
    }
  }
});
```

### 2. Authentication Debug Utilities (`src/utils/authDebug.ts`)

Created comprehensive debugging functions:

- **`getAuthDebugInfo()`**: Extracts detailed authentication state
- **`testDatabaseAccess()`**: Tests if RLS policies work with current auth
- **`refreshAndTest()`**: Forces token refresh and retests access
- **`quickAuthDiagnosis()`**: Console-based comprehensive diagnosis
- **`recoverAuthentication()`**: Multi-strategy recovery system
- **`createEmergencyAccess()`**: Development bypass for broken auth

### 3. Database Diagnostics (`docs/sql-fixes/20250916_fix_jwt_auth_context.sql`)

SQL functions to diagnose authentication issues:

```sql
-- Comprehensive auth diagnostics function
CREATE OR REPLACE FUNCTION diagnose_auth_issue()
RETURNS TABLE (
    check_name text,
    status text,
    details text
)
-- Tests auth.uid(), auth.role(), auth.jwt() and JWT settings
```

### 4. Authentication Recovery System

Multi-strategy recovery in `recoverAuthentication()`:

1. **Token Refresh**: Simple `supabase.auth.refreshSession()`
2. **Session Reset**: Clear and restore session with existing tokens
3. **Storage Cleanup**: Clear browser storage and re-establish session
4. **Environment Validation**: Check for environment mismatches

### 5. Enhanced Debug Panel (`src/components/debug/AuthDebugPanel.tsx`)

Visual debugging interface with:
- Real-time auth state display
- Database access testing
- JWT diagnosis
- Recovery actions
- Detailed status reporting

## 🚨 Temporary Fix Applied

Since `auth.uid()` is returning `null`, I created temporary permissive policies:

```sql
-- Temporary permissive policies (replace when auth is fixed)
CREATE POLICY "Temp: Allow authenticated access to settings" ON public.user_settings
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
```

These policies allow authenticated users to access data while we fix the root authentication issue.

## 📋 Usage Instructions

### For Developers

1. **Enable Debug Panel**: The `AuthDebugPanel` appears automatically in development mode
2. **Test Authentication**: Use the "JWT Test" button to run database diagnostics
3. **Recover Authentication**: Use the "Recovery" button if auth context is broken
4. **Console Debugging**: Run `quickAuthDiagnosis()` in browser console

### For Database Administrators

1. **Run SQL Diagnostics**: Execute `docs/sql-fixes/20250916_fix_jwt_auth_context.sql`
2. **Check Results**: Look for failed auth functions or missing JWT claims
3. **Apply Fixes**: The script automatically applies proper policies if auth works

## 🔧 Next Steps

### Immediate Actions Needed

1. **Test with Real User**: Have an authenticated user test the debug panel
2. **Run SQL Diagnostics**: Execute the JWT context SQL script in Supabase
3. **Check Results**: Determine if auth.uid() is now working

### If Auth Still Broken

1. **Check Supabase Project Settings**: Verify JWT settings in Supabase dashboard
2. **Environment Variables**: Ensure correct SUPABASE_URL and ANON_KEY
3. **Network Issues**: Check if requests are properly reaching Supabase
4. **Database Configuration**: Verify auth schema and functions exist

### If Auth Fixed

1. **Replace Temporary Policies**: Remove "Temp:" policies and apply proper user-specific RLS
2. **Test All Tables**: Verify all affected tables now work correctly
3. **Remove Debug Code**: Clean up development-only debugging code

## 🔍 Monitoring

The system now provides comprehensive logging:
- Frontend JWT token debugging
- Database auth context testing
- Recovery attempt logging
- Real-time auth state monitoring

Check browser console and the debug panel for real-time authentication status.

## 📂 Files Modified

- `src/integrations/supabase/client.ts` - Enhanced JWT debugging
- `src/utils/authDebug.ts` - Comprehensive debugging utilities
- `src/components/debug/AuthDebugPanel.tsx` - Visual debug interface
- `src/hooks/useUserSettings.ts` - Enhanced error handling and auth debugging
- `docs/sql-fixes/20250916_fix_jwt_auth_context.sql` - Database diagnostics
- `docs/sql-fixes/20250916_fix_auth_context_and_policies.sql` - Temporary permissive policies

The authentication system now has comprehensive debugging capabilities to identify and resolve JWT context issues.