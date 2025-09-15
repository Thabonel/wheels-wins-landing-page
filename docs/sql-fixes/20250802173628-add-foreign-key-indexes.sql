-- Add indexes for all foreign key columns that don't already have them
-- This improves JOIN performance and referential integrity checks

-- Check and create indexes for common foreign key columns
DO $$
BEGIN
    -- expenses.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'expenses' AND indexname = 'idx_expenses_user_id') THEN
        CREATE INDEX idx_expenses_user_id ON expenses(user_id);
    END IF;

    -- expenses.trip_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'expenses' AND indexname = 'idx_expenses_trip_id') THEN
        CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
    END IF;

    -- trips.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'trips' AND indexname = 'idx_trips_user_id') THEN
        CREATE INDEX idx_trips_user_id ON trips(user_id);
    END IF;

    -- group_trip_participants.trip_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'group_trip_participants' AND indexname = 'idx_group_trip_participants_trip_id') THEN
        CREATE INDEX idx_group_trip_participants_trip_id ON group_trip_participants(trip_id);
    END IF;

    -- group_trip_participants.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'group_trip_participants' AND indexname = 'idx_group_trip_participants_user_id') THEN
        CREATE INDEX idx_group_trip_participants_user_id ON group_trip_participants(user_id);
    END IF;

    -- messages.conversation_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'messages' AND indexname = 'idx_messages_conversation_id') THEN
        CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
    END IF;

    -- messages.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'messages' AND indexname = 'idx_messages_user_id') THEN
        CREATE INDEX idx_messages_user_id ON messages(user_id);
    END IF;

    -- social_posts.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_posts' AND indexname = 'idx_social_posts_user_id') THEN
        CREATE INDEX idx_social_posts_user_id ON social_posts(user_id);
    END IF;

    -- social_posts.trip_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_posts' AND indexname = 'idx_social_posts_trip_id') THEN
        CREATE INDEX idx_social_posts_trip_id ON social_posts(trip_id);
    END IF;

    -- social_comments.post_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_comments' AND indexname = 'idx_social_comments_post_id') THEN
        CREATE INDEX idx_social_comments_post_id ON social_comments(post_id);
    END IF;

    -- social_comments.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_comments' AND indexname = 'idx_social_comments_user_id') THEN
        CREATE INDEX idx_social_comments_user_id ON social_comments(user_id);
    END IF;

    -- social_likes.post_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_likes' AND indexname = 'idx_social_likes_post_id') THEN
        CREATE INDEX idx_social_likes_post_id ON social_likes(post_id);
    END IF;

    -- social_likes.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_likes' AND indexname = 'idx_social_likes_user_id') THEN
        CREATE INDEX idx_social_likes_user_id ON social_likes(user_id);
    END IF;

    -- user_settings.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'user_settings' AND indexname = 'idx_user_settings_user_id') THEN
        CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
    END IF;

    -- affiliate_sales.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'affiliate_sales' AND indexname = 'idx_affiliate_sales_user_id') THEN
        CREATE INDEX idx_affiliate_sales_user_id ON affiliate_sales(user_id);
    END IF;

    -- affiliate_sales.product_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'affiliate_sales' AND indexname = 'idx_affiliate_sales_product_id') THEN
        CREATE INDEX idx_affiliate_sales_product_id ON affiliate_sales(product_id);
    END IF;

    -- user_wishlists.user_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'user_wishlists' AND indexname = 'idx_user_wishlists_user_id') THEN
        CREATE INDEX idx_user_wishlists_user_id ON user_wishlists(user_id);
    END IF;

    -- Add composite indexes for common query patterns
    
    -- Composite index for trip participants lookup
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'group_trip_participants' AND indexname = 'idx_group_trip_participants_trip_user') THEN
        CREATE INDEX idx_group_trip_participants_trip_user ON group_trip_participants(trip_id, user_id);
    END IF;

    -- Composite index for user's expenses by date
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'expenses' AND indexname = 'idx_expenses_user_date') THEN
        CREATE INDEX idx_expenses_user_date ON expenses(user_id, date DESC);
    END IF;

    -- Composite index for social activity
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_posts' AND indexname = 'idx_social_posts_user_created') THEN
        CREATE INDEX idx_social_posts_user_created ON social_posts(user_id, created_at DESC);
    END IF;

END $$;

-- Create a function to automatically check for missing indexes on foreign keys
CREATE OR REPLACE FUNCTION check_missing_fk_indexes()
RETURNS TABLE(
    table_name text,
    column_name text,
    constraint_name text,
    referenced_table text,
    referenced_column text,
    suggested_index_name text,
    create_index_statement text
) AS $$
BEGIN
    RETURN QUERY
    WITH foreign_keys AS (
        SELECT
            tc.table_schema,
            tc.table_name,
            kcu.column_name,
            tc.constraint_name,
            ccu.table_name AS referenced_table,
            ccu.column_name AS referenced_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
    ),
    existing_indexes AS (
        SELECT
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
    )
    SELECT
        fk.table_name::text,
        fk.column_name::text,
        fk.constraint_name::text,
        fk.referenced_table::text,
        fk.referenced_column::text,
        'idx_' || fk.table_name || '_' || fk.column_name AS suggested_index_name,
        'CREATE INDEX idx_' || fk.table_name || '_' || fk.column_name || 
        ' ON ' || fk.table_name || '(' || fk.column_name || ');' AS create_index_statement
    FROM foreign_keys fk
    WHERE NOT EXISTS (
        SELECT 1
        FROM existing_indexes ei
        WHERE ei.tablename = fk.table_name
            AND ei.indexdef LIKE '%(' || fk.column_name || ')%'
    )
    ORDER BY fk.table_name, fk.column_name;
END;
$$ LANGUAGE plpgsql;

-- Create a monitoring view for foreign key performance
CREATE OR REPLACE VIEW fk_index_status AS
SELECT * FROM check_missing_fk_indexes();

-- Add comment explaining the view
COMMENT ON VIEW fk_index_status IS 'View showing foreign key columns that are missing indexes. Run SELECT * FROM fk_index_status; to check for missing indexes.';
EOF < /dev/null