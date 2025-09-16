DROP POLICY IF EXISTS "Users can manage own affiliate sales" ON affiliate_sales;
CREATE POLICY "Users can manage own affiliate sales" ON affiliate_sales
    FOR ALL
    USING ((select auth.uid()) = profile_id)
    WITH CHECK ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can manage own budgets" ON budgets;
CREATE POLICY "Users can manage own budgets" ON budgets
    FOR ALL
    USING ((select auth.uid()) = profile_id)
    WITH CHECK ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can manage own expenses" ON expenses;
CREATE POLICY "Users can manage own expenses" ON expenses
    FOR ALL
    USING ((select auth.uid()) = profile_id)
    WITH CHECK ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can manage own income entries" ON income_entries;
CREATE POLICY "Users can manage own income entries" ON income_entries
    FOR ALL
    USING ((select auth.uid()) = profile_id)
    WITH CHECK ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can manage own conversations" ON pam_conversations;
CREATE POLICY "Users can manage own conversations" ON pam_conversations
    FOR ALL
    USING ((select auth.uid()) = profile_id)
    WITH CHECK ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can manage own feedback" ON pam_feedback;
CREATE POLICY "Users can manage own feedback" ON pam_feedback
    FOR ALL
    USING ((select auth.uid()) = profile_id)
    WITH CHECK ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can manage own posts" ON posts;
CREATE POLICY "Users can manage own posts" ON posts
    FOR ALL
    USING ((select auth.uid()) = profile_id)
    WITH CHECK ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
CREATE POLICY "Users can manage own profile" ON profiles
    FOR ALL
    USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can manage own savings challenges" ON savings_challenges;
CREATE POLICY "Users can manage own savings challenges" ON savings_challenges
    FOR ALL
    USING ((select auth.uid()) = profile_id)
    WITH CHECK ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can manage own trips" ON trips;
CREATE POLICY "Users can manage own trips" ON trips
    FOR ALL
    USING ((select auth.uid()) = profile_id)
    WITH CHECK ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings" ON user_settings
    FOR ALL
    USING ((select auth.uid()) = profile_id)
    WITH CHECK ((select auth.uid()) = profile_id);

DROP POLICY IF EXISTS "Users can manage own wishlists" ON user_wishlists;
CREATE POLICY "Users can manage own wishlists" ON user_wishlists
    FOR ALL
    USING ((select auth.uid()) = profile_id)
    WITH CHECK ((select auth.uid()) = profile_id);

ANALYZE affiliate_sales;
ANALYZE budgets;
ANALYZE expenses;
ANALYZE income_entries;
ANALYZE pam_conversations;
ANALYZE pam_feedback;
ANALYZE posts;
ANALYZE profiles;
ANALYZE savings_challenges;
ANALYZE trips;
ANALYZE user_settings;
ANALYZE user_wishlists;