-- Check table column types first
DO $$
DECLARE
    rec RECORD;
    user_id_type TEXT;
    policy_sql TEXT;
BEGIN
    -- Loop through each table and check user_id column type
    FOR rec IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('profiles', 'expenses', 'income_entries', 'trips', 'posts', 'pam_conversations', 'user_settings', 'medical_records', 'medical_medications', 'medical_emergency_info', 'user_subscriptions')
    LOOP
        -- Get the data type of user_id column (or id for profiles)
        IF rec.table_name = 'profiles' THEN
            SELECT data_type INTO user_id_type
            FROM information_schema.columns
            WHERE table_name = rec.table_name
            AND table_schema = 'public'
            AND column_name = 'id';
        ELSE
            SELECT data_type INTO user_id_type
            FROM information_schema.columns
            WHERE table_name = rec.table_name
            AND table_schema = 'public'
            AND column_name = 'user_id';
        END IF;

        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', rec.table_name);

        -- Create policies based on table and column type
        CASE rec.table_name
            WHEN 'profiles' THEN
                EXECUTE 'DROP POLICY IF EXISTS "Users can view own profile" ON profiles';
                EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile" ON profiles';
                EXECUTE 'DROP POLICY IF EXISTS "Users can insert own profile" ON profiles';
                EXECUTE 'DROP POLICY IF EXISTS "profile_select_own" ON profiles';
                EXECUTE 'DROP POLICY IF EXISTS "profile_insert_own" ON profiles';
                EXECUTE 'DROP POLICY IF EXISTS "profile_update_own" ON profiles';

                IF user_id_type = 'uuid' THEN
                    EXECUTE 'CREATE POLICY "profile_select_own" ON profiles FOR SELECT USING (auth.uid() = id)';
                    EXECUTE 'CREATE POLICY "profile_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id)';
                    EXECUTE 'CREATE POLICY "profile_update_own" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)';
                ELSE
                    EXECUTE 'CREATE POLICY "profile_select_own" ON profiles FOR SELECT USING (auth.uid()::text = id::text)';
                    EXECUTE 'CREATE POLICY "profile_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid()::text = id::text)';
                    EXECUTE 'CREATE POLICY "profile_update_own" ON profiles FOR UPDATE USING (auth.uid()::text = id::text) WITH CHECK (auth.uid()::text = id::text)';
                END IF;

            WHEN 'expenses' THEN
                EXECUTE 'DROP POLICY IF EXISTS "Users can view own expenses" ON expenses';
                EXECUTE 'DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses';
                EXECUTE 'DROP POLICY IF EXISTS "Users can update own expenses" ON expenses';
                EXECUTE 'DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses';
                EXECUTE 'DROP POLICY IF EXISTS "Users can manage own expenses" ON expenses';
                EXECUTE 'DROP POLICY IF EXISTS "expenses_select_own" ON expenses';
                EXECUTE 'DROP POLICY IF EXISTS "expenses_insert_own" ON expenses';
                EXECUTE 'DROP POLICY IF EXISTS "expenses_update_own" ON expenses';
                EXECUTE 'DROP POLICY IF EXISTS "expenses_delete_own" ON expenses';

                IF user_id_type = 'uuid' THEN
                    EXECUTE 'CREATE POLICY "expenses_select_own" ON expenses FOR SELECT USING (auth.uid() = user_id)';
                    EXECUTE 'CREATE POLICY "expenses_insert_own" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id)';
                    EXECUTE 'CREATE POLICY "expenses_update_own" ON expenses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
                    EXECUTE 'CREATE POLICY "expenses_delete_own" ON expenses FOR DELETE USING (auth.uid() = user_id)';
                ELSE
                    EXECUTE 'CREATE POLICY "expenses_select_own" ON expenses FOR SELECT USING (auth.uid()::text = user_id::text)';
                    EXECUTE 'CREATE POLICY "expenses_insert_own" ON expenses FOR INSERT WITH CHECK (auth.uid()::text = user_id::text)';
                    EXECUTE 'CREATE POLICY "expenses_update_own" ON expenses FOR UPDATE USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text)';
                    EXECUTE 'CREATE POLICY "expenses_delete_own" ON expenses FOR DELETE USING (auth.uid()::text = user_id::text)';
                END IF;

            WHEN 'income_entries' THEN
                EXECUTE 'DROP POLICY IF EXISTS "Users can manage own income" ON income_entries';
                EXECUTE 'DROP POLICY IF EXISTS "income_select_own" ON income_entries';
                EXECUTE 'DROP POLICY IF EXISTS "income_insert_own" ON income_entries';
                EXECUTE 'DROP POLICY IF EXISTS "income_update_own" ON income_entries';
                EXECUTE 'DROP POLICY IF EXISTS "income_delete_own" ON income_entries';

                IF user_id_type = 'uuid' THEN
                    EXECUTE 'CREATE POLICY "income_select_own" ON income_entries FOR SELECT USING (auth.uid() = user_id)';
                    EXECUTE 'CREATE POLICY "income_insert_own" ON income_entries FOR INSERT WITH CHECK (auth.uid() = user_id)';
                    EXECUTE 'CREATE POLICY "income_update_own" ON income_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
                    EXECUTE 'CREATE POLICY "income_delete_own" ON income_entries FOR DELETE USING (auth.uid() = user_id)';
                ELSE
                    EXECUTE 'CREATE POLICY "income_select_own" ON income_entries FOR SELECT USING (auth.uid()::text = user_id::text)';
                    EXECUTE 'CREATE POLICY "income_insert_own" ON income_entries FOR INSERT WITH CHECK (auth.uid()::text = user_id::text)';
                    EXECUTE 'CREATE POLICY "income_update_own" ON income_entries FOR UPDATE USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text)';
                    EXECUTE 'CREATE POLICY "income_delete_own" ON income_entries FOR DELETE USING (auth.uid()::text = user_id::text)';
                END IF;

            WHEN 'trips' THEN
                EXECUTE 'DROP POLICY IF EXISTS "Users can manage own trips" ON trips';
                EXECUTE 'DROP POLICY IF EXISTS "Users can view own trips" ON trips';
                EXECUTE 'DROP POLICY IF EXISTS "trips_select_own" ON trips';
                EXECUTE 'DROP POLICY IF EXISTS "trips_manage_own" ON trips';

                IF user_id_type = 'uuid' THEN
                    EXECUTE 'CREATE POLICY "trips_select_own" ON trips FOR SELECT USING (auth.uid() = user_id)';
                    EXECUTE 'CREATE POLICY "trips_manage_own" ON trips FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
                ELSE
                    EXECUTE 'CREATE POLICY "trips_select_own" ON trips FOR SELECT USING (auth.uid()::text = user_id::text)';
                    EXECUTE 'CREATE POLICY "trips_manage_own" ON trips FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text)';
                END IF;

            WHEN 'posts' THEN
                EXECUTE 'DROP POLICY IF EXISTS "Users can manage own posts" ON posts';
                EXECUTE 'DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts';
                EXECUTE 'DROP POLICY IF EXISTS "posts_select_all" ON posts';
                EXECUTE 'DROP POLICY IF EXISTS "posts_manage_own" ON posts';

                EXECUTE 'CREATE POLICY "posts_select_all" ON posts FOR SELECT USING (true)';

                IF user_id_type = 'uuid' THEN
                    EXECUTE 'CREATE POLICY "posts_manage_own" ON posts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
                ELSE
                    EXECUTE 'CREATE POLICY "posts_manage_own" ON posts FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text)';
                END IF;

            WHEN 'pam_conversations' THEN
                EXECUTE 'DROP POLICY IF EXISTS "Users can manage own conversations" ON pam_conversations';
                EXECUTE 'DROP POLICY IF EXISTS "pam_conversations_manage_own" ON pam_conversations';

                IF user_id_type = 'uuid' THEN
                    EXECUTE 'CREATE POLICY "pam_conversations_manage_own" ON pam_conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
                ELSE
                    EXECUTE 'CREATE POLICY "pam_conversations_manage_own" ON pam_conversations FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text)';
                END IF;

            ELSE
                -- Handle remaining tables with generic pattern
                EXECUTE format('DROP POLICY IF EXISTS "Users can manage own %s" ON %I', REPLACE(rec.table_name, '_', ' '), rec.table_name);
                EXECUTE format('DROP POLICY IF EXISTS "%s_manage_own" ON %I', rec.table_name, rec.table_name);

                IF user_id_type = 'uuid' THEN
                    EXECUTE format('CREATE POLICY "%s_manage_own" ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', rec.table_name, rec.table_name);
                ELSE
                    EXECUTE format('CREATE POLICY "%s_manage_own" ON %I FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text)', rec.table_name, rec.table_name);
                END IF;
        END CASE;

        RAISE NOTICE 'Processed table: % with user_id type: %', rec.table_name, user_id_type;
    END LOOP;
END $$;