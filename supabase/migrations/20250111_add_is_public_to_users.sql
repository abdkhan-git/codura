-- Add is_public column to users table for profile privacy settings
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.users.is_public IS 'Controls whether the user profile is publicly visible';
