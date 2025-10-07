# Master Security & Reliability Guide
## Production-Ready Security Blueprint for Full-Stack Applications

**Project**: UnimogCommunityHub (React + TypeScript + Supabase)
**Purpose**: Comprehensive template for implementing enterprise-grade security and reliability
**Last Updated**: October 2025
**Born From**: 3-day signup outage incident and subsequent platform hardening

---

## Table of Contents

1. [Database Security](#1-database-security)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Monitoring & Alerting](#3-monitoring--alerting)
4. [Deployment Safety](#4-deployment-safety)
5. [Git Workflow Safeguards](#5-git-workflow-safeguards)
6. [Error Handling & Recovery](#6-error-handling--recovery)
7. [Testing & Validation](#7-testing--validation)
8. [Implementation Checklist](#8-implementation-checklist)

---

## 1. Database Security

### 1.1 SECURITY DEFINER Functions

**Problem**: Functions that interact with RLS-protected tables can fail when executed by users without proper permissions, even within database triggers.

**Solution**: Use `SECURITY DEFINER` to elevate function privileges to the function owner (typically postgres/admin role).

#### ❌ BEFORE (Broken)
```sql
CREATE FUNCTION notify_new_user()
RETURNS trigger AS $$
BEGIN
  PERFORM queue_admin_sms('new_user', NEW.id, 'New signup');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;  -- Missing SECURITY DEFINER!
```

**Result**: New user signups fail because the function runs with the new user's permissions (who doesn't exist yet!), causing RLS policy violations.

#### ✅ AFTER (Secure)
```sql
CREATE FUNCTION notify_new_user()
RETURNS trigger AS $$
BEGIN
  PERFORM queue_admin_sms('new_user', NEW.id, 'New signup');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with elevated privileges
SET search_path TO 'public';  -- Prevents search path injection
```

**Result**: Function bypasses RLS, signups work, notifications sent successfully.

#### When to Use SECURITY DEFINER

✅ **Use when**:
- Function inserts/updates RLS-protected tables
- Trigger functions that need admin access
- Helper functions accessing multiple secured tables
- System operations (logging, notifications, audit trails)

❌ **Don't use when**:
- User-facing query functions (let RLS do its job)
- Simple data retrieval functions
- Functions that should respect user permissions

#### Security Best Practices

```sql
-- ALWAYS pair SECURITY DEFINER with search_path
CREATE FUNCTION secure_function()
RETURNS void AS $$
BEGIN
  -- Your code here
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';  -- Critical for security!
```

**Why `search_path`?** Prevents schema injection attacks where malicious users create functions in their own schema to intercept calls.

#### Verification Query

```sql
-- Check all functions for proper SECURITY DEFINER + search_path
SELECT
    proname as function_name,
    CASE
        WHEN prosecdef THEN '✅ SECURITY DEFINER'
        ELSE '❌ MISSING SECURITY DEFINER'
    END as security_status,
    CASE
        WHEN proconfig IS NOT NULL AND
             array_to_string(proconfig, ',') LIKE '%search_path%'
        THEN '✅ search_path set'
        ELSE '❌ search_path missing'
    END as search_path_status
FROM pg_proc
WHERE proname IN (
    'notify_new_user',
    'notify_new_user_email',
    'handle_new_user',
    'handle_new_user_subscription',
    'queue_admin_sms',
    'queue_admin_email'
);
```

**Expected**: All should show ✅ for both checks.

---

### 1.2 Row Level Security (RLS) Policies

**Purpose**: PostgreSQL's RLS ensures users can only access data they own or have permission to view, enforced at the database level.

#### Standard RLS Pattern

```sql
-- Enable RLS on table
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON your_table
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own data
CREATE POLICY "Users can insert own data" ON your_table
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON your_table
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own data
CREATE POLICY "Users can delete own data" ON your_table
  FOR DELETE USING (auth.uid() = user_id);

-- Admins have full access to everything
CREATE POLICY "Admins have full access" ON your_table
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

#### System Insert Policies (Critical for Triggers)

When triggers need to INSERT into RLS-protected tables:

```sql
-- Allow system/trigger inserts (for SECURITY DEFINER functions)
CREATE POLICY "System can insert logs" ON admin_sms_log
  FOR INSERT WITH CHECK (true);  -- No user check, relies on SECURITY DEFINER

CREATE POLICY "System can insert email logs" ON admin_email_log
  FOR INSERT WITH CHECK (true);
```

**Important**: These policies are safe because only SECURITY DEFINER functions can bypass RLS, and those are controlled by admins.

#### Public Read Policies

For data that should be publicly readable:

```sql
-- Public can view manuals
CREATE POLICY "Public can view manuals" ON manual_chunks
  FOR SELECT USING (true);

-- Public can view marketplace listings
CREATE POLICY "Public can view active listings" ON marketplace_listings
  FOR SELECT USING (status = 'active');
```

#### Verification Queries

```sql
-- Check which tables have RLS enabled
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all policies on a table
SELECT
    policyname,
    cmd,  -- Command: SELECT, INSERT, UPDATE, DELETE, ALL
    qual  -- USING clause
FROM pg_policies
WHERE tablename = 'your_table';

-- Find tables with RLS enabled but no policies (DANGEROUS!)
SELECT
    t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0;
```

---

### 1.3 Database Triggers

**Purpose**: Automatically execute actions when data changes (INSERT, UPDATE, DELETE).

#### Secure Trigger Implementation

```sql
-- 1. Create trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile
  INSERT INTO profiles (id, email, full_name, created_at)
  VALUES (NEW.id, NEW.email, NEW.email, NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';

-- 2. Attach trigger to table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

#### Multiple Triggers Pattern (Signup Flow)

```sql
-- Trigger 1: Create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Trigger 2: Create subscription
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_subscription();

-- Trigger 3: Send SMS notification
CREATE TRIGGER trigger_notify_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_user();

-- Trigger 4: Send email notification
CREATE TRIGGER trigger_notify_new_user_email
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_user_email();
```

**Execution Order**: Triggers fire alphabetically by trigger name (if same timing), or in creation order.

#### Trigger Verification

```sql
-- List all triggers on a table
SELECT
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name,
    CASE
        WHEN tgtype & 1 = 1 THEN 'ROW'
        ELSE 'STATEMENT'
    END as level,
    CASE
        WHEN tgtype & 66 = 2 THEN 'BEFORE'
        WHEN tgtype & 66 = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as timing,
    CASE
        WHEN tgtype & 28 = 4 THEN 'INSERT'
        WHEN tgtype & 28 = 8 THEN 'DELETE'
        WHEN tgtype & 28 = 16 THEN 'UPDATE'
        ELSE 'TRUNCATE'
    END as event
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass
  AND NOT tgisinternal;
```

#### Common Trigger Mistakes

❌ **Don't**: Create triggers without SECURITY DEFINER when accessing RLS tables
❌ **Don't**: Use triggers for complex business logic (use Edge Functions instead)
❌ **Don't**: Forget to handle NULL values (use COALESCE)
❌ **Don't**: Create infinite loops (trigger A updates table B, trigger B updates table A)

✅ **Do**: Keep triggers simple and fast
✅ **Do**: Use PERFORM for function calls that don't need return values
✅ **Do**: Always return NEW (for AFTER triggers) or modified NEW (for BEFORE triggers)
✅ **Do**: Add proper error handling and logging

---

### 1.4 Admin Access Controls

#### Admin Role Table

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Only admins can manage roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

#### Admin Helper Functions

```sql
-- Check if current user is admin
CREATE FUNCTION check_admin_access()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if specific user is admin (for frontend)
CREATE FUNCTION is_admin(user_uuid UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;
```

#### Grant Admin Access

```sql
-- Make user admin
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid-here', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

---

## 2. Authentication & Authorization

### 2.1 Supabase Client Initialization

**Critical**: Only ONE Supabase client instance should exist per application. Multiple instances cause "Invalid API key" errors.

#### ✅ Singleton Pattern (Correct)

```typescript
// src/lib/supabase-client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let clientInstance: SupabaseClient | null = null;
let instanceCount = 0;

function createSupabaseClient() {
  if (clientInstance) {
    console.warn('⚠️ Returning existing Supabase instance');
    return clientInstance;
  }

  instanceCount++;

  if (instanceCount > 1) {
    console.error('🚨 Multiple Supabase instances detected!');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return clientInstance;
}

export const supabase = createSupabaseClient();
```

**Key Features**:
- Singleton enforcement
- Instance counting for debugging
- Environment variable validation
- Automatic token refresh
- Session persistence

#### ❌ Common Mistakes

```typescript
// DON'T: Create client in component
function MyComponent() {
  const supabase = createClient(url, key); // Creates new instance!
  // ...
}

// DON'T: Create client in service
class AuthService {
  private supabase = createClient(url, key); // Creates new instance!
}

// DON'T: Hardcode fallback keys
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';  // NEVER!
```

---

### 2.2 Session Management

#### Auth Context Pattern

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

### 2.3 Error Handling

#### Supabase Error Categorization

```typescript
// src/utils/supabase-error-handler.ts

export function isAuthError(error: any): boolean {
  const message = error?.message || '';
  return (
    message.includes('JWT expired') ||
    message.includes('Invalid login credentials') ||
    message.includes('Email not confirmed') ||
    message.includes('User not found') ||
    message.includes('refresh_token_not_found')
  );
}

export function isNetworkError(error: any): boolean {
  const message = error?.message || '';
  return (
    message.includes('Network') ||
    message.includes('fetch') ||
    message.includes('Connection')
  );
}

export function getUserFriendlyMessage(error: any): string {
  if (!error) return 'An unexpected error occurred';

  const message = error?.message || '';

  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password';
  }

  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email address';
  }

  if (message.includes('User already registered')) {
    return 'An account with this email already exists';
  }

  if (isNetworkError(error)) {
    return 'Network connection issue. Please check your internet.';
  }

  if (message.includes('JWT expired')) {
    return 'Your session has expired. Please sign in again.';
  }

  return message || 'An unexpected error occurred';
}
```

**Key Principle**: Only clear sessions on JWT errors, NOT on API key errors or network failures.

---

## 3. Monitoring & Alerting

### 3.1 Real-Time Health Monitoring

#### Signup Health Check View

```sql
CREATE OR REPLACE VIEW signup_health_check AS
SELECT
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as signups_last_hour,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '6 hours') as signups_last_6h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as signups_last_24h,
    MAX(created_at) as last_signup_time,
    EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 as hours_since_last_signup,
    CASE
        WHEN MAX(created_at) IS NULL THEN '🚨 CRITICAL: NO SIGNUPS EVER'
        WHEN EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 > 12 THEN '🚨 CRITICAL: No signups in 12+ hours'
        WHEN EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 > 6 THEN '⚠️ WARNING: No signups in 6+ hours'
        WHEN EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 3600 > 2 THEN '⚡ NOTICE: No signups in 2+ hours'
        ELSE '✅ OK: Recent signup activity'
    END as health_status
FROM auth.users;
```

#### Daily Health Check (1 minute)

```sql
-- Run this every morning
SELECT * FROM signup_health_check;
```

**Response Actions**:
- **✅ OK**: No action needed
- **⚡ NOTICE**: Normal at night, monitor if during ad campaign
- **⚠️ WARNING**: Check if ads running, test signup manually
- **🚨 CRITICAL**: IMMEDIATE investigation - signups likely broken!

---

### 3.2 SMS/Email Notification System

#### Admin Notification Tables

```sql
-- Notification preferences
CREATE TABLE admin_sms_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) UNIQUE,
  phone_number TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  notify_new_user BOOLEAN DEFAULT true,
  notify_new_post BOOLEAN DEFAULT true,
  notify_feedback BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification log
CREATE TABLE admin_sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_id UUID,
  message TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Queue Function

```sql
CREATE OR REPLACE FUNCTION queue_admin_sms(
  p_event_type TEXT,
  p_event_id UUID,
  p_message TEXT
)
RETURNS UUID AS $$
DECLARE
  v_sms_id UUID;
  v_phone TEXT;
  v_enabled BOOLEAN;
BEGIN
  SELECT phone_number, enabled
  INTO v_phone, v_enabled
  FROM admin_sms_preferences
  WHERE admin_user_id IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  LIMIT 1;

  IF v_enabled THEN
    INSERT INTO admin_sms_log (event_type, event_id, message, phone_number)
    VALUES (p_event_type, p_event_id, p_message, v_phone)
    RETURNING id INTO v_sms_id;

    RETURN v_sms_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. Deployment Safety

### 4.1 Pre-Deployment Checklist

#### Before ANY Database Changes

```sql
-- 1. Run trigger tests
SELECT * FROM test_signup_triggers();
-- Expected: All tests show 'PASS'

-- 2. Verify SECURITY DEFINER
SELECT
    proname,
    CASE WHEN prosecdef THEN '✅ OK' ELSE '❌ MISSING' END as status
FROM pg_proc
WHERE proname IN (
    'handle_new_user',
    'handle_new_user_subscription',
    'notify_new_user',
    'notify_new_user_email'
);
-- Expected: All show ✅ OK
```

#### Staging Deployment Protocol

```bash
# 1. Push to staging
git push staging main:main

# 2. Wait for Netlify deploy (2-3 min)

# 3. Test signup on staging
# URL: https://your-app-staging.netlify.app/signup
# Email: test-$(date +%s)@test.com

# 4. Verify database records
# (Run SQL query to check profile + subscription created)

# 5. If staging works, deploy to production
git push origin main

# 6. IMMEDIATELY test signup on production
# URL: https://your-app.com/signup
```

---

### 4.2 Emergency Rollback

**If signups break in production:**

```sql
-- IMMEDIATE FIX (< 2 minutes): Disable notification triggers
DROP TRIGGER IF EXISTS trigger_notify_new_user ON auth.users;
DROP TRIGGER IF EXISTS trigger_notify_new_user_email ON auth.users;

-- Test signup immediately - should work now
```

**Git Rollback:**

```bash
git revert HEAD
git push origin main
# Wait for deploy, test signup
```

---

## 5. Git Workflow Safeguards

### 5.1 Pre-Push Hook

**Location**: `.git/hooks/pre-push`

**Purpose**: Automated safety checks before deploying to staging or production.

```bash
#!/bin/bash

remote="$1"
url="$2"

# STAGING CHECKS
if [[ "$url" == *"staging"* ]]; then
    echo "🚨 STAGING DEPLOYMENT SAFETY CHECKS"

    # 1. Platform dependency check
    if grep -qE "@rollup/rollup-(darwin|linux|win32)" package.json; then
        echo "❌ Platform-specific packages found"
        exit 1
    fi

    # 2. Build validation
    if ! npm run build > /dev/null 2>&1; then
        echo "❌ Build failed"
        exit 1
    fi

    # 3. Secret detection
    if command -v gitleaks > /dev/null 2>&1; then
        if ! gitleaks detect --verbose > /dev/null 2>&1; then
            echo "❌ Secrets detected"
            exit 1
        fi
    fi

    # 4. Hardcoded keys check
    if grep -r "ydevatqwkoccxhtejdor" src/ > /dev/null 2>&1; then
        echo "❌ Hardcoded Supabase URL"
        exit 1
    fi

    echo "✅ All checks passed"
fi

# PRODUCTION CHECKS (more strict)
if [[ "$url" == *"production"* ]] && [[ "$remote" == "origin" ]]; then
    echo "🚨 PRODUCTION DEPLOYMENT - Requires confirmation"
    # ... (run all staging checks plus production-specific checks)

    echo -n "Confirm production deployment? (yes/no): "
    read -r confirmation </dev/tty

    if [[ "$confirmation" != "yes" ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

exit 0
```

**Install Hook**:
```bash
chmod +x .git/hooks/pre-push
```

---

### 5.2 Secret Scanning Scripts

#### check-secrets.js

```javascript
#!/usr/bin/env node

const secretPatterns = [
  /sk_live_[a-zA-Z0-9]{24,}/g,  // Stripe live keys
  /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,  // SendGrid
  /['"]eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+/g,  // JWT tokens
];

// Scan all files in src/
// Exit 1 if any secrets found
```

**Run Before Commit**:
```bash
node scripts/check-secrets.js
```

---

### 5.3 Platform Dependency Checker

#### check-platform-deps.js

```javascript
#!/usr/bin/env node

const DANGEROUS_PATTERNS = [
  'darwin', 'linux', 'win32', 'x64', 'arm64'
];

// Check package.json and package-lock.json
// for platform-specific dependencies
// Exit 1 if found in devDependencies
```

**Common Fix**:
```bash
# Remove platform-specific packages
npm uninstall @rollup/rollup-darwin-x64

# Let build tools auto-detect
```

---

## 6. Error Handling & Recovery

### 6.1 User-Friendly Error Messages

```typescript
function handleError(error: any, context: string) {
  const userMessage = getUserFriendlyMessage(error);

  // Log for debugging
  console.error(`Error in ${context}:`, error);

  // Show user-friendly message
  toast.error(userMessage);

  // Report to monitoring (optional)
  if (error.message.includes('CRITICAL')) {
    reportToMonitoring(error, context);
  }
}
```

---

### 6.2 Emergency Contact List

**If platform is down:**

1. Check Supabase Status: https://status.supabase.com
2. Check Netlify Status: https://www.netlifystatus.com
3. Review error logs in Supabase Dashboard → Logs
4. Check last deployment in Netlify
5. Review recent commits for breaking changes
6. Consider emergency rollback

---

## 7. Testing & Validation

### 7.1 Trigger Test Function

```sql
CREATE OR REPLACE FUNCTION test_signup_triggers()
RETURNS TABLE(trigger_name text, status text, error_message text) AS $$
DECLARE
  v_result text;
BEGIN
  -- Test 1: Verify handle_new_user has SECURITY DEFINER
  BEGIN
    SELECT CASE WHEN prosecdef THEN 'PASS' ELSE 'FAIL' END
    INTO v_result FROM pg_proc WHERE proname = 'handle_new_user';

    RETURN QUERY SELECT 'handle_new_user'::text, v_result, NULL::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'handle_new_user'::text, 'FAIL'::text, SQLERRM;
  END;

  -- (Repeat for other functions)
END;
$$ LANGUAGE plpgsql;
```

**Run Before Deployments**:
```sql
SELECT * FROM test_signup_triggers();
```

---

## 8. Implementation Checklist

### 8.1 Initial Setup (One-Time)

- [ ] Install monitoring system
  ```sql
  -- Run INSTALL_MONITORING_NOW.sql in Supabase
  ```

- [ ] Configure git hooks
  ```bash
  chmod +x .git/hooks/pre-push
  ```

- [ ] Install security tools
  ```bash
  brew install gitleaks  # macOS
  npm install -g @supabase/cli
  ```

- [ ] Set up admin notifications
  ```sql
  -- Insert admin SMS preferences
  INSERT INTO admin_sms_preferences (admin_user_id, phone_number, enabled)
  VALUES ('your-admin-id', '+1234567890', true);
  ```

---

### 8.2 Daily Operations

**Morning Check (30 seconds)**:
```sql
SELECT * FROM signup_health_check;
```

**Before Database Changes**:
```sql
SELECT * FROM test_signup_triggers();
```

**Before Deployments**:
```bash
# 1. Run security checks
node scripts/check-secrets.js
node scripts/check-platform-deps.js

# 2. Test build
npm run build

# 3. Deploy to staging
git push staging main:main

# 4. Test staging signup manually

# 5. Deploy to production (with permission)
git push origin main
```

---

### 8.3 Emergency Procedures

**Signups Broken**:
1. Run emergency rollback SQL (disable triggers)
2. Verify signups working
3. Investigate root cause
4. Apply proper fix
5. Re-enable triggers

**Build Failures**:
1. Check for platform-specific dependencies
2. Verify environment variables in Netlify
3. Review recent package changes
4. Test build locally

**Database Issues**:
1. Check RLS policies
2. Verify trigger functions have SECURITY DEFINER
3. Review recent migrations
4. Check Supabase logs

---

## 9. Incident Analysis Template

When things break, document using this template:

### Incident: [Title]
**Date**: YYYY-MM-DD
**Duration**: X hours/days
**Impact**: [Business impact]

#### Timeline
- **[Time]**: Normal operation
- **[Time]**: Issue detected
- **[Time]**: Investigation began
- **[Time]**: Root cause identified
- **[Time]**: Fix applied
- **[Time]**: Service restored

#### Root Cause
[Technical explanation]

#### Fix Applied
```sql
-- SQL or code changes
```

#### Prevention Measures
- [ ] Monitoring added
- [ ] Tests created
- [ ] Documentation updated
- [ ] Team trained

#### Lessons Learned
1. What went wrong
2. What we'll do differently
3. How to prevent recurrence

---

## 10. Quick Reference Commands

### Database
```sql
-- Check admin access
SELECT * FROM user_roles WHERE role = 'admin';

-- Verify SECURITY DEFINER
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'your_function';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Test signup health
SELECT * FROM signup_health_check;

-- List all triggers
SELECT * FROM pg_trigger WHERE tgrelid = 'your_table'::regclass;
```

### Git
```bash
# Security checks
node scripts/check-secrets.js
node scripts/check-platform-deps.js

# Deploy to staging
git push staging main:main

# Deploy to production (requires confirmation)
git push origin main

# Emergency rollback
git revert HEAD && git push origin main
```

### Netlify
```bash
# Check deployment status
netlify status

# View build logs
netlify build --dry

# Trigger redeploy
netlify deploy --prod
```

---

## Conclusion

This security blueprint is the result of a **3-day production outage** and subsequent platform hardening. Every measure documented here exists because something broke in production.

**Key Takeaways**:

1. **SECURITY DEFINER is critical** for trigger functions accessing RLS tables
2. **Monitor what matters** - signup health is a business metric
3. **Test before deploy** - staging exists for a reason
4. **Automate validation** - humans forget, git hooks don't
5. **Document everything** - future you will thank you

**This incident won't happen again because it's documented.**

---

**Last Updated**: October 2025
**Maintained By**: Development Team
**Review Schedule**: After each incident + quarterly

---

## Appendix A: File Locations

- **Monitoring**: `docs/INSTALL_MONITORING_NOW.sql`
- **Deployment Checklist**: `docs/DEPLOYMENT_CHECKLIST.md`
- **Emergency Fix**: `docs/CRITICAL_SIGNUP_FIX.sql`
- **Incident Report**: `docs/POST_INCIDENT_SUMMARY.md`
- **Quick Start**: `docs/QUICK_START_GUIDE.md`
- **Git Hook**: `.git/hooks/pre-push`
- **Security Scripts**: `scripts/check-*.js`

## Appendix B: Adaptation Guide for Other Projects

To implement this security blueprint in a different project:

1. **Replace project-specific references**:
   - `auth.users` → your user table
   - `unimogcommunityhub` → your app name
   - Supabase → your backend (adapt RLS to your DB)

2. **Customize monitoring thresholds**:
   - 12 hours no signups → adjust to your traffic
   - Health check intervals → match your usage patterns

3. **Adapt notification channels**:
   - SMS → Slack, Discord, email, etc.
   - Admin phone → your team's contact methods

4. **Platform-specific adjustments**:
   - Netlify → Vercel, Railway, etc.
   - React → Vue, Svelte, etc.
   - PostgreSQL → MySQL (RLS not available, use app-level)

**Core Principles Remain Universal**:
- Database security (SECURITY DEFINER, RLS)
- Monitoring (health checks, alerts)
- Deployment safety (staging, testing, rollback)
- Error handling (user-friendly, logged, categorized)
- Automation (git hooks, validation scripts)

---

**Remember**: Security is not a feature, it's a requirement. Reliability is not optional, it's mandatory. This guide ensures both.
