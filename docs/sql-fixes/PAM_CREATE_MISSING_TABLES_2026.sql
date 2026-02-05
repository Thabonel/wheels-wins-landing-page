-- PAM Missing Tables Creation
-- Tables: messages, pantry_items, recipes
-- Derived from tool file analysis (message_friend.py, manage_pantry.py,
-- share_recipe.py, search_recipes.py, plan_meals.py, web_recipe_scraper.py,
-- youtube_recipe_scraper.py)
--
-- Idempotent - safe to run multiple times
-- Date: 2026-02-06

-- ============================================================================
-- 1. MESSAGES TABLE
-- Used by: backend/app/services/pam/tools/social/message_friend.py
-- Fields from safe_db_insert("messages", {...}) on lines 69-77
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_read ON public.messages(recipient_id, read)
    WHERE read = FALSE;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages they sent or received
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_select_own'
    ) THEN
        CREATE POLICY "messages_select_own" ON public.messages
            FOR SELECT TO authenticated
            USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
    END IF;
END $$;

-- Users can insert messages where they are the sender
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_insert_own'
    ) THEN
        CREATE POLICY "messages_insert_own" ON public.messages
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = sender_id);
    END IF;
END $$;

-- Users can update messages they received (mark as read)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_update_recipient'
    ) THEN
        CREATE POLICY "messages_update_recipient" ON public.messages
            FOR UPDATE TO authenticated
            USING (auth.uid() = recipient_id)
            WITH CHECK (auth.uid() = recipient_id);
    END IF;
END $$;

-- Users can delete messages they sent
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_delete_sender'
    ) THEN
        CREATE POLICY "messages_delete_sender" ON public.messages
            FOR DELETE TO authenticated
            USING (auth.uid() = sender_id);
    END IF;
END $$;

-- Service role has full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_service_role'
    ) THEN
        CREATE POLICY "messages_service_role" ON public.messages
            FOR ALL TO service_role
            USING (true) WITH CHECK (true);
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO service_role;


-- ============================================================================
-- 2. PANTRY_ITEMS TABLE
-- Used by: backend/app/services/pam/tools/meals/manage_pantry.py
-- Fields from safe_db_insert("pantry_items", {...}) on lines 97-106
-- Also queried by plan_meals.py for meal planning
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pantry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ingredient_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    location TEXT,
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pantry_items_user_id ON public.pantry_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_expiry_date ON public.pantry_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_pantry_items_user_ingredient ON public.pantry_items(user_id, ingredient_name);

ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'pantry_items' AND policyname = 'pantry_items_user_all'
    ) THEN
        CREATE POLICY "pantry_items_user_all" ON public.pantry_items
            FOR ALL TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'pantry_items' AND policyname = 'pantry_items_service_role'
    ) THEN
        CREATE POLICY "pantry_items_service_role" ON public.pantry_items
            FOR ALL TO service_role
            USING (true) WITH CHECK (true);
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pantry_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pantry_items TO service_role;


-- ============================================================================
-- 3. RECIPES TABLE
-- Used by: share_recipe.py, search_recipes.py, plan_meals.py,
--          web_recipe_scraper.py, youtube_recipe_scraper.py
-- Columns derived from all insert/select/update operations across these files
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    source_url TEXT,
    source_type TEXT,
    thumbnail_url TEXT,
    ingredients JSONB DEFAULT '[]'::jsonb,
    instructions JSONB DEFAULT '[]'::jsonb,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    servings INTEGER,
    difficulty TEXT,
    nutrition_info JSONB,
    meal_type JSONB DEFAULT '[]'::jsonb,
    cuisine TEXT,
    dietary_tags JSONB DEFAULT '[]'::jsonb,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,
    shared_with JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON public.recipes(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON public.recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_dietary_tags ON public.recipes USING gin (dietary_tags);
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON public.recipes USING gin (meal_type);

-- Trigram index for ILIKE text search on title/description (requires pg_trgm)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_recipes_title ON public.recipes USING gin (title gin_trgm_ops)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_recipes_description ON public.recipes USING gin (description gin_trgm_ops)';
    ELSE
        RAISE NOTICE 'pg_trgm extension not available - skipping trigram indexes on recipes. Text search will still work but slower.';
    END IF;
END $$;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Owner has full access to their recipes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'recipes' AND policyname = 'recipes_owner_all'
    ) THEN
        CREATE POLICY "recipes_owner_all" ON public.recipes
            FOR ALL TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Authenticated users can read public recipes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'recipes' AND policyname = 'recipes_read_public'
    ) THEN
        CREATE POLICY "recipes_read_public" ON public.recipes
            FOR SELECT TO authenticated
            USING (is_public = TRUE);
    END IF;
END $$;

-- Authenticated users can read recipes shared with them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'recipes' AND policyname = 'recipes_read_shared'
    ) THEN
        CREATE POLICY "recipes_read_shared" ON public.recipes
            FOR SELECT TO authenticated
            USING (
                is_shared = TRUE
                AND shared_with ? auth.uid()::text
            );
    END IF;
END $$;

-- Service role has full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'recipes' AND policyname = 'recipes_service_role'
    ) THEN
        CREATE POLICY "recipes_service_role" ON public.recipes
            FOR ALL TO service_role
            USING (true) WITH CHECK (true);
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO service_role;


-- ============================================================================
-- 4. VERIFY CREATION
-- ============================================================================

DO $$
DECLARE
    tbl TEXT;
    missing TEXT[] := '{}';
BEGIN
    FOREACH tbl IN ARRAY ARRAY['messages', 'pantry_items', 'recipes']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            missing := missing || tbl;
        END IF;
    END LOOP;

    IF array_length(missing, 1) IS NOT NULL THEN
        RAISE WARNING 'Tables still missing after migration: %', missing;
    ELSE
        RAISE NOTICE 'All 3 PAM tables created successfully: messages, pantry_items, recipes';
    END IF;
END $$;
