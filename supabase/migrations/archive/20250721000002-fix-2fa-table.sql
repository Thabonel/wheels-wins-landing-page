-- Ensure user_two_factor_auth table has all necessary columns for 2FA functionality

-- Add missing columns if they don't exist
ALTER TABLE public.user_two_factor_auth ADD COLUMN IF NOT EXISTS secret_key TEXT;
ALTER TABLE public.user_two_factor_auth ADD COLUMN IF NOT EXISTS backup_codes TEXT[];
ALTER TABLE public.user_two_factor_auth ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.user_two_factor_auth ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.user_two_factor_auth ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_two_factor_auth_user_id ON public.user_two_factor_auth(user_id);

COMMENT ON TABLE public.user_two_factor_auth IS 'Two-factor authentication settings for users';