-- Fix missing foreign key relationship between users and user_stats
-- This is needed for the suggestions API to work properly

-- First, check if the foreign key already exists
DO $$
BEGIN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_stats_user_id_fkey' 
        AND table_name = 'user_stats'
    ) THEN
        ALTER TABLE public.user_stats 
        ADD CONSTRAINT user_stats_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint user_stats_user_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint user_stats_user_id_fkey already exists';
    END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);

-- Verify the relationship exists
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'user_stats'
    AND tc.table_schema = 'public';
