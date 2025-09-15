-- Create user_feedback table for PAM feedback and issue reporting
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Feedback identification
    type VARCHAR(50) NOT NULL CHECK (type IN ('bug', 'suggestion', 'issue', 'complaint', 'feature_request')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('voice', 'calendar', 'maps', 'ui', 'performance', 'general')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status VARCHAR(20) NOT NULL CHECK (status IN ('new', 'in_progress', 'resolved', 'closed', 'duplicate')) DEFAULT 'new',
    
    -- Content
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    user_message TEXT NOT NULL, -- Original user message
    
    -- User information
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    
    -- Context and metadata
    user_context JSONB DEFAULT '{}', -- Page, action, device, browser info
    metadata JSONB DEFAULT '{}', -- Additional data like timestamp, session_id, source
    
    -- Admin response
    admin_response TEXT,
    admin_notes TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_category ON user_feedback(category);
CREATE INDEX IF NOT EXISTS idx_user_feedback_severity ON user_feedback(severity);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_feedback_status_severity ON user_feedback(status, severity);
CREATE INDEX IF NOT EXISTS idx_user_feedback_category_type ON user_feedback(category, type);

-- Enable Row Level Security
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can insert their own feedback (including anonymous)
CREATE POLICY "Users can insert feedback" ON user_feedback
    FOR INSERT 
    WITH CHECK (
        user_id IS NULL OR user_id = auth.uid()
    );

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON user_feedback
    FOR SELECT 
    USING (
        user_id = auth.uid()
    );

-- Admin users can view all feedback
CREATE POLICY "Admins can view all feedback" ON user_feedback
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email IN ('admin@wheelsandwins.com', 'thabonel0@gmail.com')
        )
    );

-- Admin users can update feedback (status, response, etc.)
CREATE POLICY "Admins can update feedback" ON user_feedback
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email IN ('admin@wheelsandwins.com', 'thabonel0@gmail.com')
        )
    );

-- Admin users can delete feedback if needed
CREATE POLICY "Admins can delete feedback" ON user_feedback
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email IN ('admin@wheelsandwins.com', 'thabonel0@gmail.com')
        )
    );

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Set resolved_at when status changes to resolved
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        NEW.resolved_at = NOW();
    END IF;
    
    -- Clear resolved_at if status changes away from resolved
    IF NEW.status != 'resolved' AND OLD.status = 'resolved' THEN
        NEW.resolved_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_feedback_updated_at_trigger
    BEFORE UPDATE ON user_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_user_feedback_updated_at();

-- Add some helpful comments
COMMENT ON TABLE user_feedback IS 'User feedback, bug reports, and feature requests collected via PAM and other channels';
COMMENT ON COLUMN user_feedback.type IS 'Type of feedback: bug, suggestion, issue, complaint, feature_request';
COMMENT ON COLUMN user_feedback.category IS 'Area of the application: voice, calendar, maps, ui, performance, general';
COMMENT ON COLUMN user_feedback.severity IS 'Impact level: low, medium, high, critical';
COMMENT ON COLUMN user_feedback.status IS 'Current status: new, in_progress, resolved, closed, duplicate';
COMMENT ON COLUMN user_feedback.user_message IS 'Original message from user (e.g., from PAM conversation)';
COMMENT ON COLUMN user_feedback.user_context IS 'Context data: page, action, device, browser information';
COMMENT ON COLUMN user_feedback.metadata IS 'Additional metadata: timestamp, session_id, source, etc.';