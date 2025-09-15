-- Create bank statement processing tables with privacy-first design
-- All tables follow GDPR and PCI DSS compliance requirements

-- 1. Bank processing sessions table
CREATE TABLE IF NOT EXISTS bank_processing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'csv', 'xls', 'xlsx')),
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'deleted')),
    processed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    auto_delete_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    error_message TEXT,
    transaction_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Anonymized transactions table (no personal data stored)
CREATE TABLE IF NOT EXISTS anonymized_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES bank_processing_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL, -- Sanitized description
    amount DECIMAL(10, 2) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
    category_id UUID,
    merchant_name TEXT, -- Extracted and sanitized merchant name
    is_recurring BOOLEAN DEFAULT FALSE,
    confidence_score DECIMAL(3, 2) DEFAULT 1.0, -- 0.00 to 1.00
    redacted_fields JSONB DEFAULT '[]', -- List of fields that were redacted
    hash_signature TEXT, -- Hash of original transaction for duplicate detection
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transaction categories table
CREATE TABLE IF NOT EXISTS transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    parent_category_id UUID REFERENCES transaction_categories(id) ON DELETE CASCADE,
    is_system BOOLEAN DEFAULT FALSE, -- System categories vs user-defined
    budget_amount DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 4. Bank processing audit log (GDPR compliance)
CREATE TABLE IF NOT EXISTS bank_processing_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID,
    action TEXT NOT NULL CHECK (action IN ('upload', 'process', 'view', 'delete', 'export', 'auto_delete')),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Data retention policies table
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    retention_days INTEGER NOT NULL DEFAULT 30 CHECK (retention_days >= 0 AND retention_days <= 365),
    auto_delete_enabled BOOLEAN DEFAULT TRUE,
    delete_after_import BOOLEAN DEFAULT TRUE,
    anonymization_level TEXT DEFAULT 'high' CHECK (anonymization_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 6. Anonymization patterns table
CREATE TABLE IF NOT EXISTS anonymization_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('account_number', 'ssn', 'phone', 'email', 'address', 'name', 'custom')),
    regex_pattern TEXT NOT NULL,
    replacement_pattern TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bank_sessions_user_id ON bank_processing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_sessions_status ON bank_processing_sessions(processing_status);
CREATE INDEX IF NOT EXISTS idx_bank_sessions_auto_delete ON bank_processing_sessions(auto_delete_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_anon_transactions_user_id ON anonymized_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_anon_transactions_session_id ON anonymized_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_anon_transactions_date ON anonymized_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_anon_transactions_category ON anonymized_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_anon_transactions_hash ON anonymized_transactions(hash_signature);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON transaction_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON bank_processing_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_session_id ON bank_processing_audit_log(session_id);

-- Enable Row Level Security
ALTER TABLE bank_processing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymized_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_processing_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymization_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Bank processing sessions: Users can only see their own sessions
CREATE POLICY "Users can view own bank sessions" ON bank_processing_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank sessions" ON bank_processing_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank sessions" ON bank_processing_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank sessions" ON bank_processing_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Anonymized transactions: Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON anonymized_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON anonymized_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON anonymized_transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON anonymized_transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Transaction categories: Users can see system categories and their own
CREATE POLICY "Users can view categories" ON transaction_categories
    FOR SELECT USING (is_system = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users can insert own categories" ON transaction_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "Users can update own categories" ON transaction_categories
    FOR UPDATE USING (auth.uid() = user_id AND is_system = FALSE);

CREATE POLICY "Users can delete own categories" ON transaction_categories
    FOR DELETE USING (auth.uid() = user_id AND is_system = FALSE);

-- Audit log: Users can only view their own audit entries
CREATE POLICY "Users can view own audit log" ON bank_processing_audit_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert audit log" ON bank_processing_audit_log
    FOR INSERT WITH CHECK (TRUE);

-- Data retention policies: Users can manage their own policies
CREATE POLICY "Users can view own retention policy" ON data_retention_policies
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own retention policy" ON data_retention_policies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own retention policy" ON data_retention_policies
    FOR UPDATE USING (auth.uid() = user_id);

-- Anonymization patterns: Read-only for all authenticated users
CREATE POLICY "Users can view anonymization patterns" ON anonymization_patterns
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bank_sessions_updated_at BEFORE UPDATE ON bank_processing_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anon_transactions_updated_at BEFORE UPDATE ON anonymized_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON transaction_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_retention_policies_updated_at BEFORE UPDATE ON data_retention_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-delete expired sessions (GDPR compliance)
CREATE OR REPLACE FUNCTION auto_delete_expired_sessions()
RETURNS void AS $$
BEGIN
    -- Mark sessions as deleted that have passed their auto_delete_at time
    UPDATE bank_processing_sessions
    SET processing_status = 'deleted',
        deleted_at = NOW()
    WHERE auto_delete_at < NOW()
        AND deleted_at IS NULL
        AND processing_status != 'deleted';
    
    -- Log the auto-deletion in audit log
    INSERT INTO bank_processing_audit_log (user_id, session_id, action, metadata)
    SELECT user_id, id, 'auto_delete', jsonb_build_object('reason', 'expired')
    FROM bank_processing_sessions
    WHERE deleted_at = NOW()
        AND processing_status = 'deleted';
END;
$$ LANGUAGE plpgsql;

-- Insert default system categories
INSERT INTO transaction_categories (name, icon, color, is_system) VALUES
    ('Food & Dining', '🍽️', '#FF6B6B', TRUE),
    ('Transportation', '🚗', '#4ECDC4', TRUE),
    ('Shopping', '🛍️', '#45B7D1', TRUE),
    ('Entertainment', '🎬', '#96CEB4', TRUE),
    ('Bills & Utilities', '💡', '#FFEAA7', TRUE),
    ('Healthcare', '🏥', '#DDA0DD', TRUE),
    ('Education', '📚', '#98D8C8', TRUE),
    ('Travel', '✈️', '#F06292', TRUE),
    ('RV & Camping', '🚐', '#81C784', TRUE),
    ('Gas & Fuel', '⛽', '#FFB74D', TRUE),
    ('Maintenance', '🔧', '#A1887F', TRUE),
    ('Insurance', '🛡️', '#90A4AE', TRUE),
    ('Groceries', '🛒', '#80CBC4', TRUE),
    ('Other', '📌', '#B0BEC5', TRUE)
ON CONFLICT DO NOTHING;

-- Insert default anonymization patterns
INSERT INTO anonymization_patterns (pattern_type, regex_pattern, replacement_pattern, priority) VALUES
    ('account_number', '\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b', 'XXXX-XXXX-XXXX-####', 100),
    ('ssn', '\b\d{3}-\d{2}-\d{4}\b', 'XXX-XX-####', 90),
    ('phone', '\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', 'XXX-XXX-####', 80),
    ('email', '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[email]', 70),
    ('address', '\d+\s+[A-Za-z\s]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Plaza|Pl)', '[address]', 60)
ON CONFLICT DO NOTHING;