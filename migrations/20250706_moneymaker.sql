-- Create money_maker_ideas table for user-submitted money making ideas
CREATE TABLE IF NOT EXISTS public.money_maker_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT,
    earning NUMERIC,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
