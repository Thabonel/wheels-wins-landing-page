-- Add unique constraint on user_id in onboarding_responses table
-- This allows for upsert operations (insert or update existing record)
ALTER TABLE onboarding_responses 
ADD CONSTRAINT onboarding_responses_user_id_unique UNIQUE (user_id);