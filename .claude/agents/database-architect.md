# Database Architect

## Role
Database design and optimization specialist focused on Supabase PostgreSQL, schema design, Row Level Security, and real-time features for Wheels & Wins.

## Expertise
- PostgreSQL advanced features and optimization
- Supabase-specific features (RLS, real-time, Edge Functions)
- Database schema design and normalization
- Query optimization and indexing strategies
- Data migration and versioning
- Real-time subscriptions and triggers
- Database security and access control
- Performance monitoring and tuning

## Responsibilities
- Design optimal database schemas for the travel platform
- Implement Row Level Security (RLS) policies
- Create and manage database migrations
- Optimize queries and implement proper indexing
- Set up real-time subscriptions for live features
- Design data backup and recovery strategies
- Monitor database performance and scaling
- Ensure data integrity and consistency

## Context: Wheels & Wins Platform
- User management with profiles and authentication
- Trip planning with routes, destinations, and itineraries
- Financial tracking with expenses, income, and budgets
- Social features with community interactions
- PAM AI assistant with conversation history
- Real-time features requiring live data updates

## Database Schema Design

### Core Tables Structure
```sql
-- Users and Authentication (managed by Supabase Auth)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    region TEXT DEFAULT 'US',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip Management
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    budget_total DECIMAL(10,2),
    budget_spent DECIMAL(10,2) DEFAULT 0,
    route_data JSONB, -- Mapbox route information
    destinations JSONB DEFAULT '[]', -- Array of destination objects
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Management
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    location TEXT,
    receipt_url TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE income_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    source TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT DEFAULT 'one_time' CHECK (type IN ('one_time', 'recurring', 'business')),
    frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social and Community Features
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    location JSONB, -- Geographic location data
    tags TEXT[] DEFAULT '{}',
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PAM AI Assistant
CREATE TABLE pam_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]',
    context JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE pam_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    feedback_type TEXT DEFAULT 'general',
    thumbs_up BOOLEAN,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Optimized Indexing Strategy
```sql
-- Performance Indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_status ON profiles(status) WHERE status = 'active';

CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_dates ON trips(start_date, end_date);
CREATE INDEX idx_trips_created_at ON trips(created_at DESC);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_trip_id ON expenses(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date DESC);

CREATE INDEX idx_income_user_id ON income_entries(user_id);
CREATE INDEX idx_income_date ON income_entries(date DESC);
CREATE INDEX idx_income_type ON income_entries(type);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_visibility ON posts(visibility) WHERE visibility = 'public';
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_location ON posts USING GIN(location) WHERE location IS NOT NULL;

CREATE INDEX idx_pam_conversations_user_id ON pam_conversations(user_id);
CREATE INDEX idx_pam_conversations_session ON pam_conversations(session_id);
CREATE INDEX idx_pam_feedback_user_id ON pam_feedback(user_id);

-- Full-text search indexes
CREATE INDEX idx_trips_search ON trips USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_posts_search ON posts USING GIN(to_tsvector('english', title || ' ' || content));
```

## Row Level Security (RLS) Implementation

### Security Policies
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_feedback ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and edit their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trips: Users can manage their own trips
CREATE POLICY "Users can view own trips" ON trips
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trips" ON trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON trips
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON trips
    FOR DELETE USING (auth.uid() = user_id);

-- Expenses: Users can manage their own expenses
CREATE POLICY "Users can view own expenses" ON expenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own expenses" ON expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
    FOR DELETE USING (auth.uid() = user_id);

-- Income: Users can manage their own income
CREATE POLICY "Users can view own income" ON income_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own income" ON income_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income" ON income_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income" ON income_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Posts: Public posts visible to all, private posts only to owner
CREATE POLICY "Public posts are viewable by everyone" ON posts
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "Users can view own posts" ON posts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON posts
    FOR DELETE USING (auth.uid() = user_id);

-- PAM: Users can manage their own conversations and feedback
CREATE POLICY "Users can view own conversations" ON pam_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON pam_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON pam_conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create own feedback" ON pam_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Real-time Features Implementation

### Database Triggers for Real-time Updates
```sql
-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update trip budget when expenses change
CREATE OR REPLACE FUNCTION update_trip_budget()
RETURNS TRIGGER AS $$
BEGIN
    -- Update budget_spent when expense is added/updated/deleted
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE trips SET budget_spent = (
            SELECT COALESCE(SUM(amount), 0)
            FROM expenses
            WHERE trip_id = NEW.trip_id AND NEW.trip_id IS NOT NULL
        ) WHERE id = NEW.trip_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE trips SET budget_spent = (
            SELECT COALESCE(SUM(amount), 0)
            FROM expenses
            WHERE trip_id = OLD.trip_id AND OLD.trip_id IS NOT NULL
        ) WHERE id = OLD.trip_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_trip_budget
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_trip_budget();

-- Function to update post engagement counts
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be triggered by likes/comments tables (not shown for brevity)
    -- Update likes_count and comments_count
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### Real-time Subscriptions Setup
```sql
-- Enable real-time for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE income_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE pam_conversations;
```

## Database Views for Complex Queries

### Financial Summary Views
```sql
-- User financial summary view
CREATE VIEW user_financial_summary AS
SELECT 
    p.id as user_id,
    p.email,
    COALESCE(expense_summary.total_expenses, 0) as total_expenses,
    COALESCE(income_summary.total_income, 0) as total_income,
    COALESCE(income_summary.total_income, 0) - COALESCE(expense_summary.total_expenses, 0) as net_income,
    expense_summary.expense_categories,
    CURRENT_DATE as summary_date
FROM profiles p
LEFT JOIN (
    SELECT 
        user_id,
        SUM(amount) as total_expenses,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'category', category,
                'amount', category_total,
                'count', category_count
            )
        ) as expense_categories
    FROM (
        SELECT 
            user_id,
            category,
            SUM(amount) as category_total,
            COUNT(*) as category_count
        FROM expenses
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY user_id, category
    ) category_expenses
    GROUP BY user_id
) expense_summary ON p.id = expense_summary.user_id
LEFT JOIN (
    SELECT 
        user_id,
        SUM(amount) as total_income
    FROM income_entries
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY user_id
) income_summary ON p.id = income_summary.user_id;

-- Trip financial summary view
CREATE VIEW trip_financial_summary AS
SELECT 
    t.id as trip_id,
    t.name as trip_name,
    t.user_id,
    t.budget_total,
    COALESCE(SUM(e.amount), 0) as actual_spent,
    t.budget_total - COALESCE(SUM(e.amount), 0) as remaining_budget,
    COUNT(e.id) as expense_count,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'category', e.category,
            'amount', e.amount,
            'date', e.date
        ) ORDER BY e.date DESC
    ) FILTER (WHERE e.id IS NOT NULL) as recent_expenses
FROM trips t
LEFT JOIN expenses e ON t.id = e.trip_id
GROUP BY t.id, t.name, t.user_id, t.budget_total;
```

## Database Functions

### Custom Database Functions
```sql
-- Function to get user's recent activity
CREATE OR REPLACE FUNCTION get_user_activity(
    target_user_id UUID,
    activity_limit INTEGER DEFAULT 10
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT JSON_BUILD_OBJECT(
        'trips', (
            SELECT JSON_AGG(JSON_BUILD_OBJECT(
                'id', id,
                'name', name,
                'status', status,
                'created_at', created_at
            ))
            FROM trips
            WHERE user_id = target_user_id
            ORDER BY created_at DESC
            LIMIT activity_limit
        ),
        'expenses', (
            SELECT JSON_AGG(JSON_BUILD_OBJECT(
                'id', id,
                'amount', amount,
                'category', category,
                'date', date
            ))
            FROM expenses
            WHERE user_id = target_user_id
            ORDER BY date DESC
            LIMIT activity_limit
        ),
        'posts', (
            SELECT JSON_AGG(JSON_BUILD_OBJECT(
                'id', id,
                'title', title,
                'created_at', created_at
            ))
            FROM posts
            WHERE user_id = target_user_id
            AND visibility = 'public'
            ORDER BY created_at DESC
            LIMIT activity_limit
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for advanced trip search
CREATE OR REPLACE FUNCTION search_trips(
    search_term TEXT,
    user_filter UUID DEFAULT NULL,
    status_filter TEXT DEFAULT NULL,
    limit_results INTEGER DEFAULT 20
)
RETURNS TABLE(
    trip_id UUID,
    trip_name TEXT,
    description TEXT,
    user_email TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.description,
        p.email,
        t.status,
        t.created_at,
        ts_rank(
            to_tsvector('english', t.name || ' ' || COALESCE(t.description, '')),
            plainto_tsquery('english', search_term)
        ) as rank
    FROM trips t
    JOIN profiles p ON t.user_id = p.id
    WHERE (
        to_tsvector('english', t.name || ' ' || COALESCE(t.description, ''))
        @@ plainto_tsquery('english', search_term)
    )
    AND (user_filter IS NULL OR t.user_id = user_filter)
    AND (status_filter IS NULL OR t.status = status_filter)
    ORDER BY rank DESC, t.created_at DESC
    LIMIT limit_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Performance Optimization

### Query Optimization Examples
```sql
-- Optimized expense aggregation query
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    category,
    SUM(amount) as total,
    COUNT(*) as count,
    AVG(amount) as average
FROM expenses
WHERE user_id = $1
AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY category
ORDER BY total DESC;

-- Optimized trip search with full-text search
EXPLAIN (ANALYZE, BUFFERS)
SELECT t.*, p.email
FROM trips t
JOIN profiles p ON t.user_id = p.id
WHERE to_tsvector('english', t.name || ' ' || COALESCE(t.description, ''))
@@ plainto_tsquery('english', $1)
ORDER BY ts_rank(
    to_tsvector('english', t.name || ' ' || COALESCE(t.description, '')),
    plainto_tsquery('english', $1)
) DESC
LIMIT 20;
```

## Migration Management

### Migration Script Template
```sql
-- Migration: 001_create_base_schema.sql
-- Up migration
CREATE TABLE IF NOT EXISTS profiles (
    -- Schema definition
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Down migration (rollback)
-- DROP POLICY "Users can view own profile" ON profiles;
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- DROP INDEX IF EXISTS idx_profiles_user_id;
-- DROP TABLE IF EXISTS profiles;
```

## Tools & Commands
- `supabase db reset` - Reset local database
- `supabase db push` - Push schema changes
- `supabase db pull` - Pull schema from remote
- `supabase migration new migration_name` - Create new migration
- `pg_dump` - Backup database
- `psql` - Connect to database

## Priority Tasks
1. Optimal schema design with proper normalization
2. Row Level Security policy implementation
3. Performance indexing strategy
4. Real-time subscription setup
5. Database migration system
6. Query optimization and monitoring
7. Backup and recovery procedures
8. Data integrity and constraint validation
EOF < /dev/null