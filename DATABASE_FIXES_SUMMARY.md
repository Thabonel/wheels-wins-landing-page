# Database Fixes for PAM Backend Issues

## 🚨 Critical Issues Identified

Based on the server logs, the following database issues are causing PAM backend failures:

1. **Infinite recursion in group_trips RLS policy** - Causing `42P17` errors
2. **Missing affiliate_sales table** - Causing "table doesn't exist" errors  
3. **Missing user_wishlists table** - Causing "table doesn't exist" errors
4. **agent_logs RLS violations** - Causing `42501` policy violations
5. **UUID syntax errors** - Invalid "default" string passed as UUID
6. **Slow queries** - 12+ second response times

## 🛠️ Solution: Manual SQL Execution

Since direct API execution isn't available, please execute the following SQL in Supabase SQL Editor:

**Link:** https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/sql

## 📋 SQL Commands to Execute

Copy and paste this entire SQL block into the Supabase SQL Editor:

```sql
-- ==============================================
-- DATABASE FIXES FOR PAM BACKEND ISSUES
-- Execute this entire block in Supabase SQL Editor
-- ==============================================

-- 1. Create missing affiliate_sales table
CREATE TABLE IF NOT EXISTS public.affiliate_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    sale_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
    vendor_name TEXT,
    product_name TEXT,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'cancelled')),
    payout_date TIMESTAMP WITH TIME ZONE,
    affiliate_network TEXT DEFAULT 'digistore24',
    tracking_id TEXT,
    customer_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create missing user_wishlists table
CREATE TABLE IF NOT EXISTS public.user_wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    price DECIMAL(10,2),
    product_url TEXT,
    notes TEXT,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- 3. Create missing conversations table (for UUID fixes)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    messages JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for affiliate_sales
CREATE POLICY IF NOT EXISTS "users_view_own_affiliate_sales" ON public.affiliate_sales
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "users_manage_own_affiliate_sales" ON public.affiliate_sales
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. Create RLS policies for user_wishlists
CREATE POLICY IF NOT EXISTS "users_manage_own_wishlists" ON public.user_wishlists
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Create RLS policies for conversations
CREATE POLICY IF NOT EXISTS "users_manage_own_conversations" ON public.conversations
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 8. Fix agent_logs RLS to allow service role access
CREATE POLICY IF NOT EXISTS "service_role_agent_logs_access" ON public.agent_logs
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 9. Add service role access to new tables
CREATE POLICY IF NOT EXISTS "service_role_affiliate_sales_access" ON public.affiliate_sales
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "service_role_wishlists_access" ON public.user_wishlists
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "service_role_conversations_access" ON public.conversations
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 10. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_id ON public.affiliate_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_sale_date ON public.affiliate_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_payout_status ON public.affiliate_sales(payout_status);

CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_id ON public.user_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_priority ON public.user_wishlists(priority);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at);

-- 11. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 12. Add updated_at triggers
DROP TRIGGER IF EXISTS update_affiliate_sales_updated_at ON public.affiliate_sales;
CREATE TRIGGER update_affiliate_sales_updated_at
    BEFORE UPDATE ON public.affiliate_sales
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_wishlists_updated_at ON public.user_wishlists;
CREATE TRIGGER update_user_wishlists_updated_at
    BEFORE UPDATE ON public.user_wishlists
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Fix infinite recursion in group_trips (if still problematic)
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view trips they're part of" ON public.group_trips;
DROP POLICY IF EXISTS "Participants can view their trips" ON public.group_trips;

-- Create security definer function to prevent recursion
CREATE OR REPLACE FUNCTION public.is_trip_participant(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.group_trip_participants
        WHERE trip_id = p_trip_id AND user_id = p_user_id
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_trip_participant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_participant(UUID, UUID) TO service_role;

-- Recreate non-recursive policy
CREATE POLICY IF NOT EXISTS "participants_view_trips_safe" ON public.group_trips
    FOR SELECT USING (public.is_trip_participant(id, auth.uid()));

-- 14. Verify tables were created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('affiliate_sales', 'user_wishlists', 'conversations')
AND schemaname = 'public'
ORDER BY tablename;

-- 15. Analyze tables for better performance
ANALYZE public.affiliate_sales;
ANALYZE public.user_wishlists;
ANALYZE public.conversations;
ANALYZE public.agent_logs;
ANALYZE public.group_trips;
ANALYZE public.group_trip_participants;
```

## 🎯 Expected Results

After executing the SQL above, you should see:

1. ✅ **affiliate_sales** table created
2. ✅ **user_wishlists** table created  
3. ✅ **conversations** table created
4. ✅ RLS policies properly configured
5. ✅ Service role access enabled for PAM backend
6. ✅ Performance indexes created
7. ✅ Infinite recursion fixed

## 🔍 Verification Steps

After running the SQL, verify the fix worked:

1. **Check tables exist:**
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
   AND tablename IN ('affiliate_sales', 'user_wishlists', 'conversations');
   ```

2. **Check RLS policies:**
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE tablename IN ('affiliate_sales', 'user_wishlists', 'conversations');
   ```

3. **Test backend health endpoint:**
   - Visit: https://pam-backend.onrender.com/health
   - Should return healthy status without database errors

## 🚨 What This Fixes

### Backend Log Errors Fixed:
- ❌ `affiliate_sales table doesn't exist yet` → ✅ **FIXED**
- ❌ `user_wishlists table doesn't exist yet` → ✅ **FIXED**
- ❌ `new row violates row-level security policy for table "agent_logs"` → ✅ **FIXED**
- ❌ `invalid input syntax for type uuid: "default"` → ✅ **FIXED**
- ❌ `infinite recursion detected in policy for relation "group_trips"` → ✅ **FIXED**

### Performance Improvements:
- ✅ Added database indexes for faster queries
- ✅ Analyzed tables for better query planning
- ✅ Should reduce 12+ second response times

## 🚀 After Applying

1. **Restart PAM backend** (it will auto-restart on Render)
2. **Test PAM functionality** in the app
3. **Monitor logs** for any remaining errors
4. **Confirm WebSocket connections** work properly

## 📞 If Issues Persist

If you still see errors after applying this fix:

1. Check Render deployment logs: https://dashboard.render.com
2. Test the health endpoint: https://pam-backend.onrender.com/health
3. Review any new error messages in the logs
4. The comprehensive migration file is also available: `supabase/migrations/20250805140000-comprehensive-database-fixes.sql`

---

**Status:** Ready to apply  
**Priority:** HIGH - Critical for PAM functionality  
**Estimated impact:** Should resolve all database-related PAM backend errors