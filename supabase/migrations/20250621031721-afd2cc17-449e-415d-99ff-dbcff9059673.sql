
-- Fix common Supabase warnings and issues

-- 1. Add missing indexes for foreign key relationships
CREATE INDEX IF NOT EXISTS idx_drawers_user_id ON public.drawers(user_id);
CREATE INDEX IF NOT EXISTS idx_items_drawer_id ON public.items(drawer_id);
CREATE INDEX IF NOT EXISTS idx_food_items_category_id ON public.food_items(category_id);
CREATE INDEX IF NOT EXISTS idx_food_items_user_id ON public.food_items(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON public.meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_log_user_id ON public.fuel_log(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_user_id ON public.maintenance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_memory_user_id ON public.pam_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_feedback_user_id ON public.pam_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_life_memory_user_id ON public.pam_life_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_user_id ON public.budget_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_id ON public.income_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_money_maker_ideas_user_id ON public.money_maker_ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_tips_user_id ON public.financial_tips(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_responses_user_id ON public.onboarding_responses(user_id);

-- 2. Add missing foreign key constraints
ALTER TABLE public.food_items 
ADD CONSTRAINT fk_food_items_category 
FOREIGN KEY (category_id) REFERENCES public.food_categories(id) ON DELETE SET NULL;

ALTER TABLE public.items 
ADD CONSTRAINT fk_items_drawer 
FOREIGN KEY (drawer_id) REFERENCES public.drawers(id) ON DELETE CASCADE;

ALTER TABLE public.drawers 
ADD CONSTRAINT fk_drawers_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.food_items 
ADD CONSTRAINT fk_food_items_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.food_categories 
ADD CONSTRAINT fk_food_categories_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.meal_plans 
ADD CONSTRAINT fk_meal_plans_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.budget_categories 
ADD CONSTRAINT fk_budget_categories_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.income_entries 
ADD CONSTRAINT fk_income_entries_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.money_maker_ideas 
ADD CONSTRAINT fk_money_maker_ideas_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.financial_tips 
ADD CONSTRAINT fk_financial_tips_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.onboarding_responses 
ADD CONSTRAINT fk_onboarding_responses_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Fix nullable columns that should have defaults or constraints
ALTER TABLE public.profiles ALTER COLUMN region SET DEFAULT 'Australia';
ALTER TABLE public.profiles ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.profiles ALTER COLUMN last_active SET DEFAULT now();

-- 4. Add missing unique constraints
ALTER TABLE public.admin_users ADD CONSTRAINT unique_admin_user_email UNIQUE (email);
ALTER TABLE public.onboarding_responses ADD CONSTRAINT unique_onboarding_user UNIQUE (user_id);

-- 5. Fix sequence ownership issues for serial columns
ALTER SEQUENCE IF EXISTS fuel_log_id_seq OWNED BY public.fuel_log.id;
ALTER SEQUENCE IF EXISTS pam_logs_id_seq OWNED BY public.pam_logs.id;
ALTER SEQUENCE IF EXISTS pam_metrics_id_seq OWNED BY public.pam_metrics.id;

-- 6. Add missing triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables that have updated_at but no trigger
CREATE TRIGGER update_budget_categories_updated_at 
    BEFORE UPDATE ON public.budget_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_items_updated_at 
    BEFORE UPDATE ON public.food_items
    FOR EACH ROW EXECUTE FUNCTION public.update_food_status();

-- 7. Fix RLS policies that might be missing
-- Enable RLS on tables that should have it
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for tables missing them
CREATE POLICY "Users can manage their own calendar events" ON public.calendar_events
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage their own fuel log" ON public.fuel_log
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own food categories" ON public.food_categories
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own meal plans" ON public.meal_plans
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own onboarding responses" ON public.onboarding_responses
    FOR ALL USING (auth.uid() = user_id);

-- 8. Clean up any orphaned data that might be causing constraint violations
DELETE FROM public.items WHERE drawer_id NOT IN (SELECT id FROM public.drawers);
DELETE FROM public.food_items WHERE category_id IS NOT NULL AND category_id NOT IN (SELECT id FROM public.food_categories);

-- 9. Fix any text columns that should have length constraints
ALTER TABLE public.profiles ALTER COLUMN region TYPE VARCHAR(100);
ALTER TABLE public.profiles ALTER COLUMN fuel_type TYPE VARCHAR(50);
ALTER TABLE public.profiles ALTER COLUMN vehicle_type TYPE VARCHAR(100);

-- 10. Add check constraints for enum-like fields
ALTER TABLE public.maintenance_records 
ADD CONSTRAINT check_status_valid 
CHECK (status IN ('completed', 'pending', 'overdue', 'due'));

ALTER TABLE public.food_items 
ADD CONSTRAINT check_status_valid 
CHECK (status IN ('fresh', 'expiring_soon', 'expired'));
