-- Fix pam_conversation_memory table schema
-- Add missing conversation_id column and proper indexes

-- Add conversation_id column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pam_conversation_memory' 
        AND column_name = 'conversation_id'
    ) THEN
        ALTER TABLE pam_conversation_memory 
        ADD COLUMN conversation_id UUID;
        
        -- Add foreign key constraint if pam_conversations table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'pam_conversations'
        ) THEN
            ALTER TABLE pam_conversation_memory 
            ADD CONSTRAINT fk_pam_conversation_memory_conversation_id 
            FOREIGN KEY (conversation_id) REFERENCES pam_conversations(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_pam_conversation_memory_conversation_id 
ON pam_conversation_memory(conversation_id);

-- Create index for user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_pam_conversation_memory_user_id 
ON pam_conversation_memory(user_id);

-- Update RLS policy to include conversation_id
DROP POLICY IF EXISTS "Users can manage their own conversation memory" ON pam_conversation_memory;

CREATE POLICY "Users can manage their own conversation memory" 
ON pam_conversation_memory 
FOR ALL 
USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON pam_conversation_memory TO authenticated;
GRANT ALL ON pam_conversation_memory TO service_role;

-- Add comment for documentation
COMMENT ON COLUMN pam_conversation_memory.conversation_id IS 'Links memory entries to specific conversations for better context management';