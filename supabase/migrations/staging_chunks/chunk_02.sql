  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for service_reminders
CREATE POLICY "Users can manage own service reminders" ON service_reminders
  FOR ALL USING (auth.uid() = user_id);

-- Apply updated_at triggers
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_records_updated_at
  BEFORE UPDATE ON maintenance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fuel_log_updated_at
  BEFORE UPDATE ON fuel_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_expenses_updated_at
  BEFORE UPDATE ON vehicle_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_reminders_updated_at
  BEFORE UPDATE ON service_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_primary ON vehicles(user_id, is_primary);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_user_id ON maintenance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_date ON maintenance_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_type ON maintenance_records(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_vehicle_date ON maintenance_records(vehicle_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_fuel_log_user_id ON fuel_log(user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_log_vehicle_id ON fuel_log(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_log_logged_at ON fuel_log(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_log_vehicle_logged ON fuel_log(vehicle_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_log_trip_id ON fuel_log(trip_id) WHERE trip_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_user_id ON vehicle_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_vehicle_id ON vehicle_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_date ON vehicle_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_type ON vehicle_expenses(expense_type);

CREATE INDEX IF NOT EXISTS idx_service_reminders_user_id ON service_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_service_reminders_vehicle_id ON service_reminders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_service_reminders_due_date ON service_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_service_reminders_completed ON service_reminders(is_completed);

-- Spatial indexes for fuel log locations
CREATE INDEX IF NOT EXISTS idx_fuel_log_location ON fuel_log USING GIST(location);

-- Partial indexes for active/pending reminders
CREATE INDEX IF NOT EXISTS idx_service_reminders_pending ON service_reminders(user_id, due_date) WHERE is_completed = false;

-- ============================================================
-- MIGRATION: 06_communication.sql
-- ============================================================

-- Communication System Migration
-- Messaging, notifications, and calendar events

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_id UUID,
  last_message_at TIMESTAMP WITH TIME ZONE,
  is_read_by_user1 BOOLEAN DEFAULT true,
  is_read_by_user2 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CONSTRAINT no_self_conversation CHECK (user1_id != user2_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'location', 'system')),
  file_url TEXT,
  file_type TEXT,
  file_size INTEGER,
  location GEOGRAPHY(POINT, 4326),
  location_name TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'message', 'post_like', 'post_comment', 'event_invitation', 'marketplace_inquiry', 'system', 'maintenance_reminder', 'trip_update')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT false,
  event_type TEXT DEFAULT 'personal' CHECK (event_type IN ('personal', 'trip', 'maintenance', 'meeting', 'reminder', 'birthday', 'holiday')),
  location GEOGRAPHY(POINT, 4326),
  location_name TEXT,
  reminder_minutes INTEGER[], -- Array of minutes before event to remind
  recurring_pattern TEXT CHECK (recurring_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurring_until DATE,
  color TEXT DEFAULT '#3b82f6',
  is_private BOOLEAN DEFAULT true,
  invited_users UUID[],
  trip_id UUID, -- Reference to user_trips if trip-related
  vehicle_id UUID, -- Reference to vehicles if maintenance-related
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File uploads tracking
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT,
  upload_purpose TEXT DEFAULT 'general' CHECK (upload_purpose IN ('profile_avatar', 'message_attachment', 'post_media', 'marketplace_image', 'receipt', 'document', 'general')),
  is_public BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in own conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE id = messages.conversation_id 
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for calendar_events
CREATE POLICY "Users can manage own calendar events" ON calendar_events
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for file_uploads
CREATE POLICY "Users can view own files" ON file_uploads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public files" ON file_uploads
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can upload files" ON file_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Apply updated_at triggers
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation last_message info
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET 
    last_message_id = NEW.id,
    last_message_at = NEW.created_at,
    updated_at = NOW(),
    is_read_by_user1 = CASE WHEN NEW.sender_id = (SELECT user1_id FROM conversations WHERE id = NEW.conversation_id) THEN true ELSE false END,
    is_read_by_user2 = CASE WHEN NEW.sender_id = (SELECT user2_id FROM conversations WHERE id = NEW.conversation_id) THEN true ELSE false END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update conversation when new message is sent
CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_trip_id ON calendar_events(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_vehicle_id ON calendar_events(vehicle_id) WHERE vehicle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_purpose ON file_uploads(upload_purpose);
CREATE INDEX IF NOT EXISTS idx_file_uploads_public ON file_uploads(is_public);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at DESC);

-- Spatial indexes
CREATE INDEX IF NOT EXISTS idx_messages_location ON messages USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_calendar_events_location ON calendar_events USING GIST(location);

-- Partial indexes for unread items
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, created_at DESC) WHERE is_read = false;

-- ============================================================
-- MIGRATION: 20250105000001_create_product_issue_reports.sql
-- ============================================================

-- Create product_issue_reports table for user-reported product issues
CREATE TABLE IF NOT EXISTS public.product_issue_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.affiliate_products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'incorrect_price',
    'out_of_stock',
    'discontinued',
    'broken_link',
    'wrong_image',
    'wrong_description',
    'other'
  )),
  notes TEXT,
  product_snapshot JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes for common queries
CREATE INDEX idx_product_issue_reports_product_id ON public.product_issue_reports(product_id);
CREATE INDEX idx_product_issue_reports_user_id ON public.product_issue_reports(user_id);
CREATE INDEX idx_product_issue_reports_status ON public.product_issue_reports(status);
CREATE INDEX idx_product_issue_reports_issue_type ON public.product_issue_reports(issue_type);
CREATE INDEX idx_product_issue_reports_created_at ON public.product_issue_reports(created_at DESC);

-- Enable RLS
ALTER TABLE public.product_issue_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can create reports (authenticated or anonymous)
CREATE POLICY "allow_insert_reports" ON public.product_issue_reports
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own reports
CREATE POLICY "allow_view_own_reports" ON public.product_issue_reports
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all reports
CREATE POLICY "allow_admin_view_all_reports" ON public.product_issue_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.user_role IN ('super_admin', 'admin')
        AND admin_users.is_active = true
    )
  );

-- Admins can update reports (status, admin_notes, reviewed_at, reviewed_by)
CREATE POLICY "allow_admin_update_reports" ON public.product_issue_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.user_role IN ('super_admin', 'admin')
        AND admin_users.is_active = true
    )
  );

-- Admins can delete reports
CREATE POLICY "allow_admin_delete_reports" ON public.product_issue_reports
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
        AND admin_users.user_role IN ('super_admin', 'admin')
        AND admin_users.is_active = true
    )
  );

-- Update updated_at timestamp on updates
CREATE OR REPLACE FUNCTION public.update_product_issue_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_issue_reports_updated_at
  BEFORE UPDATE ON public.product_issue_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_issue_reports_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON public.product_issue_reports TO authenticated;
GRANT SELECT, INSERT ON public.product_issue_reports TO anon;
GRANT ALL ON public.product_issue_reports TO admin;
GRANT ALL ON public.product_issue_reports TO service_role;


-- ============================================================
-- MIGRATION: 20250110000000-week2-missing-tables.sql
-- ============================================================

-- Week 2: Database Stability - Create Missing Tables
-- Migration created: January 10, 2025
-- Purpose: Create tables referenced in code but never created

-- ============================================
-- 1. BUDGETS TABLE
-- ============================================
-- Referenced by:
-- - supabase/functions/pam-spend-summary/index.ts
-- - supabase/functions/pam-expense-create/index.ts

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.budgets (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    monthly_limit DECIMAL(10,2) NOT NULL CHECK (monthly_limit >= 0),
    alert_threshold DECIMAL(5,2) DEFAULT 80.0 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- Add columns if they don't exist (for existing tables with different structure)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'budgets'
                   AND column_name = 'monthly_limit') THEN
        ALTER TABLE public.budgets ADD COLUMN monthly_limit DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (monthly_limit >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public'
                   AND table_name = 'budgets'
                   AND column_name = 'alert_threshold') THEN
        ALTER TABLE public.budgets ADD COLUMN alert_threshold DECIMAL(5,2) DEFAULT 80.0 CHECK (alert_threshold >= 0 AND alert_threshold <= 100);
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_category ON public.budgets(user_id, category);

-- Enable Row Level Security
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies (create only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'budgets' AND policyname = 'Users can view their own budgets'
    ) THEN
        CREATE POLICY "Users can view their own budgets" ON public.budgets
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'budgets' AND policyname = 'Users can insert their own budgets'
    ) THEN
        CREATE POLICY "Users can insert their own budgets" ON public.budgets
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'budgets' AND policyname = 'Users can update their own budgets'
    ) THEN
        CREATE POLICY "Users can update their own budgets" ON public.budgets
            FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'budgets' AND policyname = 'Users can delete their own budgets'
    ) THEN
        CREATE POLICY "Users can delete their own budgets" ON public.budgets
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Updated_at trigger
CREATE TRIGGER trigger_update_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
-- Grant sequence usage only if it exists (BIGSERIAL creates it automatically)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'budgets_id_seq') THEN
        GRANT USAGE ON SEQUENCE public.budgets_id_seq TO authenticated;
    END IF;
END $$;

-- ============================================
-- 2. INCOME_ENTRIES TABLE
-- ============================================
-- For tracking user income (salary, gigs, refunds, etc.)

CREATE TABLE IF NOT EXISTS public.income_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    source TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    recurring BOOLEAN DEFAULT FALSE,
    recurrence_period TEXT CHECK (recurrence_period IN ('weekly', 'biweekly', 'monthly', 'yearly')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_income_entries_user_id ON public.income_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_date ON public.income_entries(date);
CREATE INDEX IF NOT EXISTS idx_income_entries_user_date ON public.income_entries(user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies (create only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'income_entries' AND policyname = 'Users can view their own income'
    ) THEN
        CREATE POLICY "Users can view their own income" ON public.income_entries
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'income_entries' AND policyname = 'Users can insert their own income'
    ) THEN
        CREATE POLICY "Users can insert their own income" ON public.income_entries
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'income_entries' AND policyname = 'Users can update their own income'
    ) THEN
        CREATE POLICY "Users can update their own income" ON public.income_entries
            FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'income_entries' AND policyname = 'Users can delete their own income'
    ) THEN
        CREATE POLICY "Users can delete their own income" ON public.income_entries
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Updated_at trigger
CREATE TRIGGER trigger_update_income_entries_updated_at
    BEFORE UPDATE ON public.income_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_entries TO authenticated;
-- Grant sequence usage only if it exists (BIGSERIAL creates it automatically)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'income_entries_id_seq') THEN
        GRANT USAGE ON SEQUENCE public.income_entries_id_seq TO authenticated;
    END IF;
END $$;

-- ============================================
-- 3. USER_SUBSCRIPTIONS TABLE
-- ============================================
-- For tracking user subscription status (premium, trials, etc.)

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    plan_name TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'trialing', 'past_due')),
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    price_paid DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON public.user_subscriptions(stripe_customer_id);

-- Enable Row Level Security
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (create only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_subscriptions' AND policyname = 'Users can view their own subscription'
    ) THEN
        CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_subscriptions' AND policyname = 'Users can insert their own subscription'
    ) THEN
        CREATE POLICY "Users can insert their own subscription" ON public.user_subscriptions
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_subscriptions' AND policyname = 'Users can update their own subscription'
    ) THEN
        CREATE POLICY "Users can update their own subscription" ON public.user_subscriptions
            FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Updated_at trigger
CREATE TRIGGER trigger_update_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;

-- ============================================
-- 4. HELPER VIEWS
-- ============================================

-- Budget utilization view (useful for quick queries)
CREATE OR REPLACE VIEW public.budget_utilization AS
SELECT
    b.id AS budget_id,
    b.user_id,
    b.category,
    b.monthly_limit,
    b.alert_threshold,
    COALESCE(SUM(e.amount), 0) AS spent,
    b.monthly_limit - COALESCE(SUM(e.amount), 0) AS remaining,
    CASE
        WHEN b.monthly_limit > 0 THEN (COALESCE(SUM(e.amount), 0) / b.monthly_limit * 100)
        ELSE 0
    END AS percentage_used,
    DATE_TRUNC('month', CURRENT_DATE) AS period_start,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day') AS period_end
FROM public.budgets b
LEFT JOIN public.expenses e ON
    e.user_id = b.user_id
    AND e.category = b.category
    AND e.date >= DATE_TRUNC('month', CURRENT_DATE)
    AND e.date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY b.id, b.user_id, b.category, b.monthly_limit, b.alert_threshold;

-- Grant view access
GRANT SELECT ON public.budget_utilization TO authenticated;

-- ============================================
-- 5. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================

-- Uncomment to insert sample budgets for testing
-- INSERT INTO public.budgets (user_id, category, monthly_limit, alert_threshold)
-- SELECT
--     auth.uid(),
--     category,
--     limit_amount,
--     80.0
-- FROM (VALUES
--     ('gas', 700.00),
--     ('food', 400.00),
--     ('campground', 300.00),
--     ('maintenance', 200.00),
--     ('entertainment', 150.00),
--     ('shopping', 100.00),
--     ('utilities', 100.00)
-- ) AS defaults(category, limit_amount)
-- WHERE auth.uid() IS NOT NULL
-- ON CONFLICT (user_id, category) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these queries to verify tables were created successfully:

-- SELECT table_name, table_type
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('budgets', 'income_entries', 'user_subscriptions')
-- ORDER BY table_name;

-- SELECT
--     schemaname,
--     tablename,
--     policyname,
--     permissive,
--     roles,
--     cmd
-- FROM pg_policies
-- WHERE tablename IN ('budgets', 'income_entries', 'user_subscriptions')
-- ORDER BY tablename, policyname;


-- ============================================================
-- MIGRATION: 20250112000000-create-analytics-tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pam_analytics_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    event_data JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pam_analytics_logs_user_id ON public.pam_analytics_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_pam_analytics_logs_timestamp ON public.pam_analytics_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pam_analytics_logs_event_type ON public.pam_analytics_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_pam_analytics_logs_session_id ON public.pam_analytics_logs(session_id);

CREATE TABLE IF NOT EXISTS public.analytics_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period TEXT NOT NULL CHECK (period IN ('hourly', 'daily')),
    data JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_summary_period ON public.analytics_summary(period);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_timestamp ON public.analytics_summary(timestamp DESC);

CREATE TABLE IF NOT EXISTS public.analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_interactions INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    avg_response_time DECIMAL(10,2),
    error_rate DECIMAL(5,2),
    popular_features JSONB,
    user_engagement JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON public.analytics_daily(date DESC);

ALTER TABLE public.pam_analytics_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analytics logs"
    ON public.pam_analytics_logs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert analytics logs"
    ON public.pam_analytics_logs
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can manage analytics summary"
    ON public.analytics_summary
    FOR ALL
    USING (true);

CREATE POLICY "Service role can manage analytics daily"
    ON public.analytics_daily
    FOR ALL
    USING (true);

CREATE POLICY "Authenticated users can view analytics summary"
    ON public.analytics_summary
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view analytics daily"
    ON public.analytics_daily
    FOR SELECT
    USING (auth.role() = 'authenticated');


-- ============================================================
-- MIGRATION: 20250112000000-create-community-tips.sql
-- ============================================================

-- Community Tips & Contribution System
-- Enables users to share knowledge and track their impact
-- Created: January 12, 2025

-- ============================================================================
-- Table: community_tips
-- Stores user-contributed tips that PAM can use to help others
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.community_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Tip content
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'camping',
        'gas_savings',
        'route_planning',
        'maintenance',
        'safety',
        'cooking',
        'weather',
        'attractions',
        'budget',
        'general'
    )),

    -- Location context (optional)
    location_name TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),

    -- Impact tracking
    view_count INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0, -- Times PAM used this tip in responses
    helpful_count INTEGER DEFAULT 0, -- User upvotes

    -- Metadata
    tags TEXT[], -- Searchable tags
    is_verified BOOLEAN DEFAULT false, -- Admin verified quality
    is_featured BOOLEAN DEFAULT false, -- Featured on homepage
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'flagged')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE -- When PAM last used this tip
);

-- ============================================================================
-- Table: tip_usage_log
-- Tracks when PAM uses a tip to help someone
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tip_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip_id UUID NOT NULL REFERENCES public.community_tips(id) ON DELETE CASCADE,
    contributor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    beneficiary_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who received the tip

    -- Context
    conversation_id UUID, -- Which PAM conversation
    pam_response TEXT, -- How PAM used the tip

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Table: user_contribution_stats
-- Aggregated stats for quick dashboard display
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_contribution_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Contribution counts
    tips_shared INTEGER DEFAULT 0,
    people_helped INTEGER DEFAULT 0, -- Unique beneficiaries
    total_tip_uses INTEGER DEFAULT 0,

    -- Recognition
    badges JSONB DEFAULT '[]', -- Array of earned badges
    reputation_level INTEGER DEFAULT 1,
    reputation_points INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Search tips by category and status
CREATE INDEX IF NOT EXISTS idx_community_tips_category ON public.community_tips(category) WHERE status = 'active';

-- Search tips by user
CREATE INDEX IF NOT EXISTS idx_community_tips_user_id ON public.community_tips(user_id);

-- Search tips by location (for geo-based queries)
CREATE INDEX IF NOT EXISTS idx_community_tips_location ON public.community_tips(location_lat, location_lng) WHERE location_lat IS NOT NULL;

-- Search tips by tags (GIN index for array search)
CREATE INDEX IF NOT EXISTS idx_community_tips_tags ON public.community_tips USING GIN(tags);

-- Full-text search on title and content
CREATE INDEX IF NOT EXISTS idx_community_tips_search ON public.community_tips USING GIN(
    to_tsvector('english', title || ' ' || content)
);

-- Usage log queries
CREATE INDEX IF NOT EXISTS idx_tip_usage_log_tip_id ON public.tip_usage_log(tip_id);
CREATE INDEX IF NOT EXISTS idx_tip_usage_log_contributor ON public.tip_usage_log(contributor_id);
CREATE INDEX IF NOT EXISTS idx_tip_usage_log_beneficiary ON public.tip_usage_log(beneficiary_id);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.community_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tip_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_contribution_stats ENABLE ROW LEVEL SECURITY;

-- Community Tips Policies
-- Anyone authenticated can view active tips
CREATE POLICY "Anyone can view active tips"
ON public.community_tips FOR SELECT
USING (
    auth.role() = 'authenticated'
    AND status = 'active'
);

-- Users can create their own tips
CREATE POLICY "Users can create own tips"
ON public.community_tips FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own tips
CREATE POLICY "Users can update own tips"
ON public.community_tips FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own tips
CREATE POLICY "Users can delete own tips"
ON public.community_tips FOR DELETE
USING (auth.uid() = user_id);

-- Service role can manage all tips (for PAM)
CREATE POLICY "Service role can manage all tips"
ON public.community_tips FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Tip Usage Log Policies
-- Users can view logs about their tips
CREATE POLICY "Users can view logs about their tips"
ON public.tip_usage_log FOR SELECT
USING (
    auth.uid() = contributor_id
    OR auth.uid() = beneficiary_id
);

-- Service role can insert usage logs (PAM)
CREATE POLICY "Service role can insert usage logs"
ON public.tip_usage_log FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Contribution Stats Policies
-- Users can view their own stats
CREATE POLICY "Users can view own stats"
ON public.user_contribution_stats FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage stats
CREATE POLICY "Service role can manage stats"
ON public.user_contribution_stats FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Functions & Triggers
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_community_tips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_community_tips_updated_at
    BEFORE UPDATE ON public.community_tips
    FOR EACH ROW
    EXECUTE FUNCTION update_community_tips_updated_at();

-- Auto-create stats row when user creates first tip
CREATE OR REPLACE FUNCTION create_user_stats_on_first_tip()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_contribution_stats (user_id, tips_shared)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET
        tips_shared = user_contribution_stats.tips_shared + 1,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_stats_on_first_tip
    AFTER INSERT ON public.community_tips
    FOR EACH ROW
    EXECUTE FUNCTION create_user_stats_on_first_tip();

-- Update stats when tip is used
CREATE OR REPLACE FUNCTION update_stats_on_tip_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment tip usage count
