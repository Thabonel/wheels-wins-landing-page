
# Database Schema Documentation

Complete database schema documentation for the PAM system built on Supabase/PostgreSQL.

## Overview

The PAM database is designed with:
- **Row Level Security (RLS)** enabled on all user data tables
- **UUID primary keys** for all entities
- **Timestamps** for audit trails
- **JSONB columns** for flexible data storage
- **Foreign key constraints** for referential integrity

## Authentication & Users

### profiles
Extended user profile information (linked to Supabase Auth).

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    phone TEXT,
    date_of_birth DATE,
    location JSONB, -- {city, state, country, coordinates}
    preferences JSONB DEFAULT '{}', -- User preferences
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
```

### user_sessions
Track user sessions for analytics and security.

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    location JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- RLS Policy
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);
```

## Financial Management

### budgets
User budget definitions.

```sql
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    currency TEXT DEFAULT 'USD',
    budget_period TEXT DEFAULT 'monthly' CHECK (budget_period IN ('weekly', 'monthly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users manage own budgets" ON budgets
    FOR ALL USING (auth.uid() = user_id);
```

### budget_categories
Budget category allocations.

```sql
CREATE TABLE budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    allocated_amount DECIMAL(12,2) NOT NULL CHECK (allocated_amount >= 0),
    spent_amount DECIMAL(12,2) DEFAULT 0 CHECK (spent_amount >= 0),
    category_type TEXT DEFAULT 'expense' CHECK (category_type IN ('income', 'expense', 'savings', 'debt')),
    color TEXT, -- Hex color for UI
    icon TEXT, -- Icon identifier
    parent_category_id UUID REFERENCES budget_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy via budget relationship
CREATE POLICY "Users manage budget categories" ON budget_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM budgets 
            WHERE budgets.id = budget_categories.budget_id 
            AND budgets.user_id = auth.uid()
        )
    );
```

### expenses
User expense tracking.

```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    expense_date DATE NOT NULL,
    payment_method TEXT, -- cash, credit_card, debit_card, etc.
    vendor TEXT,
    location JSONB, -- Store location data
    receipt_url TEXT,
    notes TEXT,
    tags TEXT[], -- Array of tags
    budget_category_id UUID REFERENCES budget_categories(id),
    trip_id UUID REFERENCES trips(id), -- Link to trip if travel expense
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_pattern JSONB, -- For recurring expenses
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users manage own expenses" ON expenses
    FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_expenses_user_date ON expenses(user_id, expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses(user_id, category);
```

### income_sources
Track multiple income sources.

```sql
CREATE TABLE income_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    frequency TEXT NOT NULL CHECK (frequency IN ('one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly')),
    next_payment_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    tax_category TEXT, -- For tax planning
    employer_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users manage own income sources" ON income_sources
    FOR ALL USING (auth.uid() = user_id);
```

### income_entries
Individual income records.

```sql
CREATE TABLE income_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    income_source_id UUID REFERENCES income_sources(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    income_date DATE NOT NULL,
    tax_withheld DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users manage own income entries" ON income_entries
    FOR ALL USING (auth.uid() = user_id);
```

## Vehicle & Travel Management

### vehicles
User vehicle information.

```sql
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year BETWEEN 1900 AND 2100),
    license_plate TEXT,
    vin TEXT,
    color TEXT,
    fuel_type TEXT DEFAULT 'gasoline' CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid', 'other')),
    fuel_efficiency JSONB, -- {city: 25, highway: 35, combined: 30, unit: 'mpg'}
    insurance_info JSONB,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users manage own vehicles" ON vehicles
    FOR ALL USING (auth.uid() = user_id);
```

### vehicle_maintenance
Vehicle maintenance tracking.

```sql
CREATE TABLE vehicle_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_type TEXT NOT NULL, -- oil_change, tire_rotation, inspection, etc.
    description TEXT,
    cost DECIMAL(10,2) CHECK (cost >= 0),
    mileage INTEGER,
    service_date DATE NOT NULL,
    next_service_date DATE,
    next_service_mileage INTEGER,
    vendor TEXT,
    notes TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy via vehicle relationship
CREATE POLICY "Users manage vehicle maintenance" ON vehicle_maintenance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM vehicles 
            WHERE vehicles.id = vehicle_maintenance.vehicle_id 
            AND vehicles.user_id = auth.uid()
        )
    );
```

### trips
Trip planning and tracking.

```sql
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    origin JSONB NOT NULL, -- {address, coordinates, place_id}
    destination JSONB NOT NULL,
    waypoints JSONB DEFAULT '[]', -- Array of waypoint objects
    start_date DATE,
    end_date DATE,
    estimated_distance DECIMAL(10,2), -- in miles/km
    actual_distance DECIMAL(10,2),
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    route_data JSONB, -- Detailed route information from mapping service
    weather_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users manage own trips" ON trips
    FOR ALL USING (auth.uid() = user_id);
```

## Social Features

### social_groups
User groups and communities.

```sql
CREATE TABLE social_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- travel, finance, local, etc.
    privacy_level TEXT DEFAULT 'public' CHECK (privacy_level IN ('public', 'private', 'invite_only')),
    group_image_url TEXT,
    location JSONB,
    member_count INTEGER DEFAULT 0,
    creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Public groups visible to all
CREATE POLICY "Public groups visible to all" ON social_groups
    FOR SELECT USING (privacy_level = 'public' OR auth.uid() IS NOT NULL);
```

### group_memberships
User membership in social groups.

```sql
CREATE TABLE group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES social_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(group_id, user_id)
);

-- RLS Policy
CREATE POLICY "Users see own memberships" ON group_memberships
    FOR SELECT USING (auth.uid() = user_id);
```

### posts
Social posts within groups or user feeds.

```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES social_groups(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    post_type TEXT DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'link', 'poll', 'event')),
    media_urls TEXT[], -- Array of image/video URLs
    metadata JSONB, -- Additional data based on post_type
    visibility TEXT DEFAULT 'group' CHECK (visibility IN ('public', 'group', 'private')),
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy - users can see posts in groups they belong to
CREATE POLICY "Users see posts in their groups" ON posts
    FOR SELECT USING (
        visibility = 'public' OR
        (visibility = 'group' AND EXISTS (
            SELECT 1 FROM group_memberships 
            WHERE group_memberships.group_id = posts.group_id 
            AND group_memberships.user_id = auth.uid()
            AND group_memberships.is_active = TRUE
        ))
    );
```

### comments
Comments on posts.

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy - users can see comments on posts they can see
CREATE POLICY "Users see comments on visible posts" ON comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = comments.post_id 
            AND (
                posts.visibility = 'public' OR
                (posts.visibility = 'group' AND EXISTS (
                    SELECT 1 FROM group_memberships 
                    WHERE group_memberships.group_id = posts.group_id 
                    AND group_memberships.user_id = auth.uid()
                    AND group_memberships.is_active = TRUE
                ))
            )
        )
    );
```

## Content Moderation

### content_moderation
Track flagged content for moderation.

```sql
CREATE TABLE content_moderation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'profile', 'group')),
    content_id UUID NOT NULL,
    content_text TEXT,
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    author_email TEXT,
    reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    flagged_reason TEXT NOT NULL,
    additional_context TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
    moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    moderator_notes TEXT,
    automated_flags JSONB, -- AI-detected issues
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only admins can see moderation data
CREATE POLICY "Admins can manage content moderation" ON content_moderation
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = TRUE
        )
    );
```

## System Administration

### system_settings
Global system configuration.

```sql
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only admins can manage system settings
CREATE POLICY "Admins manage system settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = TRUE
        )
    );
```

### audit_logs
System audit trail.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only admins can view audit logs
CREATE POLICY "Admins view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = TRUE
        )
    );
```

## PAM Assistant & AI

### pam_conversations
Track PAM assistant conversations.

```sql
CREATE TABLE pam_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    title TEXT,
    context JSONB, -- Current app context when conversation started
    message_count INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users manage own PAM conversations" ON pam_conversations
    FOR ALL USING (auth.uid() = user_id);
```

### pam_messages
Individual messages in PAM conversations.

```sql
CREATE TABLE pam_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES pam_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB, -- Token usage, processing time, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy via conversation relationship
CREATE POLICY "Users see messages in own conversations" ON pam_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pam_conversations 
            WHERE pam_conversations.id = pam_messages.conversation_id 
            AND pam_conversations.user_id = auth.uid()
        )
    );
```

### user_knowledge
User-specific knowledge base for PAM.

```sql
CREATE TABLE user_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    document_type TEXT, -- pdf, text, url, etc.
    source_url TEXT,
    embedding VECTOR(1536), -- OpenAI embedding
    metadata JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users manage own knowledge" ON user_knowledge
    FOR ALL USING (auth.uid() = user_id);

-- Vector similarity search index
CREATE INDEX ON user_knowledge USING ivfflat (embedding vector_cosine_ops);
```

## Database Functions & Triggers

### Updated Timestamps
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at column
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- (Apply to all other tables with updated_at...)
```

### Audit Logging
```sql
-- Function to log changes for audit
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id, action, table_name, record_id, 
        old_values, new_values, created_at
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to sensitive tables
CREATE TRIGGER audit_profiles_changes
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION audit_changes();
```

## Performance Optimization

### Indexes
```sql
-- Common query patterns
CREATE INDEX idx_expenses_user_category_date ON expenses(user_id, category, expense_date DESC);
CREATE INDEX idx_trips_user_dates ON trips(user_id, start_date, end_date);
CREATE INDEX idx_posts_group_created ON posts(group_id, created_at DESC) WHERE is_active = TRUE;
CREATE INDEX idx_messages_conversation_created ON pam_messages(conversation_id, created_at);

-- Full-text search
CREATE INDEX idx_posts_content_search ON posts USING gin(to_tsvector('english', content));
CREATE INDEX idx_user_knowledge_search ON user_knowledge USING gin(to_tsvector('english', content));
```

### Views for Common Queries
```sql
-- Budget summary view
CREATE VIEW budget_summaries AS
SELECT 
    b.id,
    b.user_id,
    b.name,
    b.total_amount,
    SUM(bc.allocated_amount) as total_allocated,
    SUM(bc.spent_amount) as total_spent,
    b.total_amount - SUM(bc.spent_amount) as remaining_budget
FROM budgets b
LEFT JOIN budget_categories bc ON b.id = bc.budget_id
WHERE b.is_active = TRUE
GROUP BY b.id, b.user_id, b.name, b.total_amount;
```

This schema provides a robust foundation for the PAM system with proper security, relationships, and scalability considerations.
