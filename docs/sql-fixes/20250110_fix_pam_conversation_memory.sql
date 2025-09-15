-- Fix pam_conversation_memory table by adding missing conversation_id column
-- This resolves the error: "Could not find the 'conversation_id' column of 'pam_conversation_memory' in the schema cache"

-- First check if the table exists
DO $$ 
BEGIN
    -- Check if pam_conversation_memory table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pam_conversation_memory') THEN
        -- Add conversation_id column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'pam_conversation_memory' 
            AND column_name = 'conversation_id'
        ) THEN
            -- First check if conversations table exists
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
                -- Add the column with foreign key reference
                ALTER TABLE pam_conversation_memory 
                ADD COLUMN conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;
                
                -- Create index for better query performance
                CREATE INDEX IF NOT EXISTS idx_pam_conversation_memory_conversation_id 
                ON pam_conversation_memory(conversation_id);
                
                RAISE NOTICE 'Added conversation_id column to pam_conversation_memory table';
            ELSE
                -- If conversations table doesn't exist, add column without foreign key
                ALTER TABLE pam_conversation_memory 
                ADD COLUMN conversation_id UUID;
                
                -- Create index for better query performance
                CREATE INDEX IF NOT EXISTS idx_pam_conversation_memory_conversation_id 
                ON pam_conversation_memory(conversation_id);
                
                RAISE NOTICE 'Added conversation_id column to pam_conversation_memory table (without FK)';
            END IF;
        ELSE
            RAISE NOTICE 'conversation_id column already exists in pam_conversation_memory table';
        END IF;
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE pam_conversation_memory (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            conversation_id UUID,
            message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
            message_content TEXT NOT NULL,
            message_timestamp TIMESTAMPTZ DEFAULT NOW(),
            context JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_pam_conversation_memory_user_id ON pam_conversation_memory(user_id);
        CREATE INDEX idx_pam_conversation_memory_conversation_id ON pam_conversation_memory(conversation_id);
        CREATE INDEX idx_pam_conversation_memory_timestamp ON pam_conversation_memory(message_timestamp);
        
        -- Add RLS policies
        ALTER TABLE pam_conversation_memory ENABLE ROW LEVEL SECURITY;
        
        -- Users can only see their own conversation memory
        CREATE POLICY "Users can view own conversation memory"
            ON pam_conversation_memory FOR SELECT
            USING (auth.uid() = user_id);
            
        -- Users can insert their own conversation memory
        CREATE POLICY "Users can insert own conversation memory"
            ON pam_conversation_memory FOR INSERT
            WITH CHECK (auth.uid() = user_id);
            
        -- Users can update their own conversation memory
        CREATE POLICY "Users can update own conversation memory"
            ON pam_conversation_memory FOR UPDATE
            USING (auth.uid() = user_id);
            
        -- Users can delete their own conversation memory
        CREATE POLICY "Users can delete own conversation memory"
            ON pam_conversation_memory FOR DELETE
            USING (auth.uid() = user_id);
        
        RAISE NOTICE 'Created pam_conversation_memory table with all required columns';
    END IF;
END $$;

-- Also ensure conversations table exists (if needed)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes on conversations table
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

-- Add RLS to conversations table
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own conversations
CREATE POLICY IF NOT EXISTS "Users can view own conversations"
    ON conversations FOR SELECT
    USING (auth.uid() = user_id);
    
CREATE POLICY IF NOT EXISTS "Users can insert own conversations"
    ON conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY IF NOT EXISTS "Users can update own conversations"
    ON conversations FOR UPDATE
    USING (auth.uid() = user_id);
    
CREATE POLICY IF NOT EXISTS "Users can delete own conversations"
    ON conversations FOR DELETE
    USING (auth.uid() = user_id);