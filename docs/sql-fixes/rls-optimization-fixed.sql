DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING ((select auth.uid())::uuid = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING ((select auth.uid())::uuid = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK ((select auth.uid())::uuid = id);

DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;
CREATE POLICY "Users can delete own settings" ON user_settings FOR DELETE USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can view own trips" ON trips;
CREATE POLICY "Users can view own trips" ON trips FOR SELECT USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can insert own trips" ON trips;
CREATE POLICY "Users can insert own trips" ON trips FOR INSERT WITH CHECK ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can update own trips" ON trips;
CREATE POLICY "Users can update own trips" ON trips FOR UPDATE USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
CREATE POLICY "Users can delete own trips" ON trips FOR DELETE USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can manage own conversations" ON pam_conversations;
CREATE POLICY "Users can manage own conversations" ON pam_conversations FOR ALL USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can manage own feedback" ON pam_feedback;
CREATE POLICY "Users can manage own feedback" ON pam_feedback FOR ALL USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can view all posts" ON posts;
CREATE POLICY "Users can view all posts" ON posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
CREATE POLICY "Users can insert own posts" ON posts FOR INSERT WITH CHECK ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can manage own medical records" ON medical_records;
CREATE POLICY "Users can manage own medical records" ON medical_records FOR ALL USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can manage own medications" ON medical_medications;
CREATE POLICY "Users can manage own medications" ON medical_medications FOR ALL USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can manage own emergency info" ON medical_emergency_info;
CREATE POLICY "Users can manage own emergency info" ON medical_emergency_info FOR ALL USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions FOR SELECT USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions FOR INSERT WITH CHECK ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON user_subscriptions FOR UPDATE USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can manage own income" ON income_entries;
CREATE POLICY "Users can manage own income" ON income_entries FOR ALL USING ((select auth.uid())::uuid = user_id);

DROP POLICY IF EXISTS "Users can manage own budgets" ON budgets;
CREATE POLICY "Users can manage own budgets" ON budgets FOR ALL USING ((select auth.uid())::uuid = user_id);

CREATE OR REPLACE FUNCTION optimize_remaining_policies()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    new_qual TEXT;
    new_with_check TEXT;
    policy_sql TEXT;
BEGIN
    FOR r IN
        SELECT tablename, policyname, cmd, qual, with_check
        FROM pg_policies
        WHERE (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
        AND qual NOT LIKE '%(select auth.uid())::uuid%'
        AND (with_check IS NULL OR with_check NOT LIKE '%(select auth.uid())::uuid%')
        AND schemaname = 'public'
    LOOP
        new_qual := r.qual;
        IF new_qual IS NOT NULL THEN
            new_qual := replace(new_qual, 'auth.uid()', '(select auth.uid())::uuid');
        END IF;

        new_with_check := r.with_check;
        IF new_with_check IS NOT NULL THEN
            new_with_check := replace(new_with_check, 'auth.uid()', '(select auth.uid())::uuid');
        END IF;

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);

        policy_sql := format('CREATE POLICY %I ON %I', r.policyname, r.tablename);

        IF r.cmd IS NOT NULL THEN
            policy_sql := policy_sql || format(' FOR %s', r.cmd);
        END IF;

        IF new_qual IS NOT NULL THEN
            policy_sql := policy_sql || format(' USING (%s)', new_qual);
        END IF;

        IF new_with_check IS NOT NULL THEN
            policy_sql := policy_sql || format(' WITH CHECK (%s)', new_with_check);
        END IF;

        EXECUTE policy_sql;
    END LOOP;
END;
$$;

SELECT optimize_remaining_policies();
DROP FUNCTION optimize_remaining_policies();