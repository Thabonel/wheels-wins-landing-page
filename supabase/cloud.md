# Supabase Database Context

## 🎯 Database Overview

Supabase provides the managed PostgreSQL database infrastructure for Wheels & Wins, featuring real-time subscriptions, Row Level Security (RLS), and integrated authentication.

## 🏗️ Database Architecture

### Core Features
- **PostgreSQL 15**: Advanced SQL database with modern features
- **Real-time**: WebSocket subscriptions for live data updates
- **Row Level Security (RLS)**: Database-level authorization
- **PostgREST**: Automatic REST API generation
- **Edge Functions**: Server-side JavaScript execution
- **Storage**: File upload and management system

### Connection Configuration
```typescript
// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kycoklimpzkyrecbjecn.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

## 📊 Database Schema

### Core Tables Structure
```
Database: Wheels & Wins
├── auth/                    # Supabase Auth (managed)
│   ├── users               # Authentication users
│   ├── sessions            # User sessions
│   └── refresh_tokens      # Token refresh
├── public/                  # Application tables
│   ├── profiles            # User profiles
│   ├── user_settings       # User preferences
│   ├── user_trips          # Trip planning data
│   ├── expenses            # Financial tracking
│   ├── budgets             # Budget management
│   ├── pam_conversations   # AI chat history
│   ├── trip_templates      # Pre-built journeys
│   ├── campgrounds         # RV park data
│   └── social_interactions # Community features
└── storage/                 # File storage buckets
    ├── avatars             # User profile images
    ├── trip_photos         # Travel photos
    ├── receipts            # Expense receipts
    └── documents           # User documents
```

### Key Table Definitions

#### User Profiles (profiles)
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  full_name VARCHAR,
  avatar_url VARCHAR,
  bio TEXT,
  location VARCHAR,
  preferences JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  PRIMARY KEY (id)
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

#### User Trips (user_trips)
```sql
CREATE TABLE user_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status trip_status DEFAULT 'planning',
  
  -- Route and location data
  origin JSONB, -- {lat, lng, address}
  destination JSONB,
  waypoints JSONB DEFAULT '[]',
  route_data JSONB,
  
  -- Trip preferences and metadata
  vehicle_type VARCHAR DEFAULT 'rv',
  travel_style VARCHAR DEFAULT 'leisurely',
  budget_total DECIMAL(10,2),
  preferences JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Indexes for performance
  INDEX idx_user_trips_user_id (user_id),
  INDEX idx_user_trips_status (status),
  INDEX idx_user_trips_dates (start_date, end_date)
);

-- Trip status enum
CREATE TYPE trip_status AS ENUM ('planning', 'active', 'completed', 'cancelled');

-- RLS Policies
ALTER TABLE user_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips" ON user_trips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trips" ON user_trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON user_trips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON user_trips
  FOR DELETE USING (auth.uid() = user_id);
```

#### Expenses (expenses)
```sql
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES user_trips(id) ON DELETE SET NULL,
  
  -- Core expense data
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  category expense_category NOT NULL,
  subcategory VARCHAR,
  description VARCHAR NOT NULL,
  date DATE NOT NULL,
  
  -- Transaction details
  merchant VARCHAR,
  payment_method VARCHAR,
  transaction_id VARCHAR,
  
  -- Location and receipt
  location JSONB, -- {lat, lng, address}
  receipt_url VARCHAR,
  receipt_data JSONB,
  
  -- Metadata
  tags VARCHAR[] DEFAULT '{}',
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB,
  
  -- Audit trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Performance indexes
  INDEX idx_expenses_user_id (user_id),
  INDEX idx_expenses_trip_id (trip_id),
  INDEX idx_expenses_date (date),
  INDEX idx_expenses_category (category),
  INDEX idx_expenses_amount (amount)
);

-- Expense categories enum
CREATE TYPE expense_category AS ENUM (
  'fuel', 'food', 'lodging', 'maintenance', 'entertainment', 
  'shopping', 'health', 'insurance', 'utilities', 'other'
);

-- RLS Policies
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id);
```

#### PAM Conversations (pam_conversations)
```sql
CREATE TABLE pam_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Conversation metadata
  session_id UUID DEFAULT gen_random_uuid(),
  title VARCHAR,
  summary TEXT,
  
  -- Message data
  messages JSONB DEFAULT '[]', -- Array of message objects
  context JSONB DEFAULT '{}',  -- Conversation context
  
  -- AI metadata
  model_version VARCHAR,
  tokens_used INTEGER DEFAULT 0,
  cost_estimate DECIMAL(8,4) DEFAULT 0,
  
  -- Status and timing
  status conversation_status DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  ended_at TIMESTAMP WITH TIME ZONE,
  
  -- Performance indexes
  INDEX idx_pam_conversations_user_id (user_id),
  INDEX idx_pam_conversations_session_id (session_id),
  INDEX idx_pam_conversations_status (status),
  INDEX idx_pam_conversations_last_message (last_message_at)
);

CREATE TYPE conversation_status AS ENUM ('active', 'paused', 'completed', 'archived');

-- RLS Policies
ALTER TABLE pam_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations" ON pam_conversations
  FOR ALL USING (auth.uid() = user_id);
```

#### Budgets (budgets)
```sql
CREATE TABLE budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES user_trips(id) ON DELETE CASCADE,
  
  -- Budget details
  name VARCHAR NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Time period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Category allocations
  category_allocations JSONB DEFAULT '{}', -- {category: amount}
  spent_amounts JSONB DEFAULT '{}',       -- {category: spent}
  
  -- Settings
  alert_threshold DECIMAL(3,2) DEFAULT 0.80, -- 80%
  notifications_enabled BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Performance indexes
  INDEX idx_budgets_user_id (user_id),
  INDEX idx_budgets_trip_id (trip_id),
  INDEX idx_budgets_dates (start_date, end_date),
  INDEX idx_budgets_active (is_active)
);

-- RLS Policies
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own budgets" ON budgets
  FOR ALL USING (auth.uid() = user_id);
```

## 🔐 Row Level Security (RLS)

### Security Philosophy
- **Zero Trust**: All access is verified and authorized
- **User Isolation**: Users can only access their own data
- **Granular Control**: Fine-grained permissions per operation
- **Performance Optimized**: Indexes support RLS policies

### Common RLS Patterns
```sql
-- Standard user data access
CREATE POLICY "users_own_data" ON table_name
  FOR ALL USING (auth.uid() = user_id);

-- Read-only shared data
CREATE POLICY "public_read_access" ON public_data
  FOR SELECT USING (is_public = true);

-- Time-based access
CREATE POLICY "active_subscriptions" ON premium_features
  FOR SELECT USING (
    auth.uid() = user_id AND 
    subscription_end > now()
  );

-- Role-based access
CREATE POLICY "admin_access" ON admin_tables
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );
```

### RLS Performance Optimization
```sql
-- Composite indexes for RLS policies
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX idx_trips_user_status ON user_trips(user_id, status);

-- Partial indexes for common filters
CREATE INDEX idx_active_budgets ON budgets(user_id) 
  WHERE is_active = true;

-- GIN indexes for JSONB columns
CREATE INDEX idx_trip_preferences ON user_trips 
  USING GIN (preferences);
```

## 🔄 Real-time Subscriptions

### Real-time Features
```typescript
// Subscribe to expense updates
const expenseSubscription = supabase
  .channel('expenses-changes')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'expenses',
      filter: `user_id=eq.${userId}`
    }, 
    (payload) => {
      console.log('Expense updated:', payload)
      updateExpensesList(payload)
    }
  )
  .subscribe()

// Subscribe to trip updates
const tripSubscription = supabase
  .channel('trip-updates')
  .on('postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'user_trips',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      updateTripDisplay(payload.new)
    }
  )
  .subscribe()

// PAM conversation real-time updates
const pamSubscription = supabase
  .channel(`pam-${sessionId}`)
  .on('postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'pam_conversations',
      filter: `session_id=eq.${sessionId}`
    },
    (payload) => {
      displayNewMessage(payload.new)
    }
  )
  .subscribe()
```

## 💾 Storage Buckets

### File Storage Structure
```typescript
// Storage bucket configuration
const storageConfig = {
  avatars: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    public: true
  },
  receipts: {
    allowedMimeTypes: ['image/*', 'application/pdf'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    public: false
  },
  trip_photos: {
    allowedMimeTypes: ['image/*'],
    maxFileSize: 20 * 1024 * 1024, // 20MB
    public: false
  },
  documents: {
    allowedMimeTypes: ['application/pdf', 'text/*'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    public: false
  }
}

// File upload with progress
async function uploadFile(
  bucket: string, 
  file: File, 
  path: string,
  onProgress?: (progress: number) => void
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      onUploadProgress: (progress) => {
        onProgress?.(progress.loaded / progress.total * 100)
      }
    })

  if (error) throw error
  return data
}
```

### Storage RLS Policies
```sql
-- Avatar access policies
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Receipt access policies
CREATE POLICY "Users can view own receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

## 🔧 Database Functions

### PostgreSQL Functions
```sql
-- Calculate trip statistics
CREATE OR REPLACE FUNCTION calculate_trip_stats(trip_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  total_expenses DECIMAL(10,2);
  expense_count INTEGER;
  avg_daily_spend DECIMAL(10,2);
BEGIN
  -- Calculate expense totals
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO total_expenses, expense_count
  FROM expenses 
  WHERE trip_id = trip_uuid;
  
  -- Calculate daily average
  SELECT 
    CASE 
      WHEN t.end_date IS NOT NULL AND t.start_date IS NOT NULL 
      THEN total_expenses / GREATEST((t.end_date - t.start_date), 1)
      ELSE 0
    END
  INTO avg_daily_spend
  FROM user_trips t
  WHERE t.id = trip_uuid;
  
  -- Build result object
  result := jsonb_build_object(
    'total_expenses', total_expenses,
    'expense_count', expense_count,
    'avg_daily_spend', avg_daily_spend,
    'calculated_at', now()
  );
  
  RETURN result;
END;
$$;

-- Update expense categories with AI suggestions
CREATE OR REPLACE FUNCTION suggest_expense_category(
  expense_description TEXT,
  merchant_name TEXT DEFAULT NULL
)
RETURNS expense_category
LANGUAGE plpgsql
AS $$
DECLARE
  suggested_category expense_category;
BEGIN
  -- Simple rule-based categorization
  -- In production, this would call an AI service
  
  IF merchant_name ILIKE '%gas%' OR merchant_name ILIKE '%fuel%' OR 
     expense_description ILIKE '%gas%' OR expense_description ILIKE '%fuel%' THEN
    suggested_category := 'fuel';
  ELSIF merchant_name ILIKE '%restaurant%' OR merchant_name ILIKE '%food%' OR
        expense_description ILIKE '%meal%' OR expense_description ILIKE '%dining%' THEN
    suggested_category := 'food';
  ELSIF merchant_name ILIKE '%park%' OR merchant_name ILIKE '%campground%' OR
        expense_description ILIKE '%campsite%' THEN
    suggested_category := 'lodging';
  ELSE
    suggested_category := 'other';
  END IF;
  
  RETURN suggested_category;
END;
$$;
```

### Edge Functions
```typescript
// Edge Function for AI-powered expense categorization
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { expense_description, merchant_name, amount } = await req.json()
  
  try {
    // Call OpenAI API for categorization
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: 'Categorize this expense into one of: fuel, food, lodging, maintenance, entertainment, shopping, health, insurance, utilities, other'
        }, {
          role: 'user',
          content: `Expense: ${expense_description}, Merchant: ${merchant_name}, Amount: ${amount}`
        }],
        max_tokens: 10
      })
    })
    
    const aiResult = await response.json()
    const category = aiResult.choices[0].message.content.trim().toLowerCase()
    
    return new Response(
      JSON.stringify({ category, confidence: 0.95 }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

## 📊 Performance Optimization

### Database Tuning
```sql
-- Analyze table statistics
ANALYZE expenses;
ANALYZE user_trips;
ANALYZE pam_conversations;

-- Vacuum and reindex maintenance
VACUUM ANALYZE expenses;
REINDEX TABLE expenses;

-- Materialized views for complex queries
CREATE MATERIALIZED VIEW user_expense_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', date) as month,
  category,
  SUM(amount) as total_amount,
  COUNT(*) as expense_count,
  AVG(amount) as avg_amount
FROM expenses
WHERE date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY user_id, DATE_TRUNC('month', date), category;

-- Refresh materialized view daily
CREATE OR REPLACE FUNCTION refresh_expense_summaries()
RETURNS void
LANGUAGE sql
AS $$
  REFRESH MATERIALIZED VIEW user_expense_summary;
$$;

-- Schedule refresh
SELECT cron.schedule('refresh-summaries', '0 2 * * *', 'SELECT refresh_expense_summaries();');
```

### Query Optimization
- **Proper Indexing**: Composite indexes for common query patterns
- **Query Planning**: Regular EXPLAIN ANALYZE for performance monitoring
- **Connection Pooling**: PgBouncer for connection management
- **Read Replicas**: Separate analytics queries from transactional loads

## 🔄 Migration Strategy

### Migration Management
```sql
-- Migration file structure
migrations/
├── 20250101000001_initial_schema.sql
├── 20250115000002_add_trip_templates.sql
├── 20250120000003_pam_conversations.sql
├── 20250125000004_expense_categories.sql
└── 20250131000005_performance_indexes.sql

-- Migration tracking table
CREATE TABLE schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration template
-- Migration: Add budget alerts
-- Up Migration
ALTER TABLE budgets ADD COLUMN alert_threshold DECIMAL(3,2) DEFAULT 0.80;
ALTER TABLE budgets ADD COLUMN notifications_enabled BOOLEAN DEFAULT true;

CREATE INDEX idx_budgets_alerts ON budgets(user_id, alert_threshold)
  WHERE notifications_enabled = true;

-- Insert migration record
INSERT INTO schema_migrations (version) VALUES ('20250131000006');

-- Down Migration (in separate file)
ALTER TABLE budgets DROP COLUMN alert_threshold;
ALTER TABLE budgets DROP COLUMN notifications_enabled;
DROP INDEX idx_budgets_alerts;
DELETE FROM schema_migrations WHERE version = '20250131000006';
```

---

**Database Schema Version**: 2.1  
**Last Updated**: January 31, 2025  
**PostgreSQL Version**: 15+  
**Total Tables**: 25+ tables  
**Storage Buckets**: 4 buckets  
**RLS Policies**: 50+ policies