-- Fix Study Pod Session Real-time Features
-- Run this script to ensure all tables and constraints are properly set up

-- ============================================
-- 1. Add unique constraint for session_active_participants upsert
-- ============================================
DO $$
BEGIN
    -- Check if constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'session_active_participants_session_user_unique'
    ) THEN
        ALTER TABLE public.session_active_participants
        ADD CONSTRAINT session_active_participants_session_user_unique 
        UNIQUE (session_id, user_id);
        RAISE NOTICE 'Added unique constraint on session_active_participants';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on session_active_participants';
    END IF;
END $$;

-- ============================================
-- 2. Enable RLS on session tables
-- ============================================
ALTER TABLE public.session_active_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_code_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_code_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Create RLS policies for session_active_participants
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view participants in their sessions" ON public.session_active_participants;
DROP POLICY IF EXISTS "Users can insert themselves as participants" ON public.session_active_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON public.session_active_participants;

-- SELECT: Pod members can view participants
CREATE POLICY "Users can view participants in their sessions"
ON public.session_active_participants FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.study_pod_sessions s
        JOIN public.study_pod_members m ON m.pod_id = s.pod_id
        WHERE s.id = session_active_participants.session_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
);

-- INSERT: Users can add themselves as participants
CREATE POLICY "Users can insert themselves as participants"
ON public.session_active_participants FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own record
CREATE POLICY "Users can update their own participant record"
ON public.session_active_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- 4. Create RLS policies for session_chat_messages
-- ============================================

DROP POLICY IF EXISTS "Users can view chat messages in their sessions" ON public.session_chat_messages;
DROP POLICY IF EXISTS "Users can send chat messages" ON public.session_chat_messages;

-- SELECT: Pod members can view messages
CREATE POLICY "Users can view chat messages in their sessions"
ON public.session_chat_messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.study_pod_sessions s
        JOIN public.study_pod_members m ON m.pod_id = s.pod_id
        WHERE s.id = session_chat_messages.session_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
);

-- INSERT: Users can send messages (API handles attendance check)
CREATE POLICY "Users can send chat messages"
ON public.session_chat_messages FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================
-- 5. Create RLS policies for session_code_executions
-- ============================================

DROP POLICY IF EXISTS "Users can view code executions in their sessions" ON public.session_code_executions;
DROP POLICY IF EXISTS "Users can insert code executions" ON public.session_code_executions;

-- SELECT: Pod members can view executions
CREATE POLICY "Users can view code executions in their sessions"
ON public.session_code_executions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.study_pod_sessions s
        JOIN public.study_pod_members m ON m.pod_id = s.pod_id
        WHERE s.id = session_code_executions.session_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
);

-- INSERT: Users can insert their own executions
CREATE POLICY "Users can insert code executions"
ON public.session_code_executions FOR INSERT
TO authenticated
WITH CHECK (executed_by = auth.uid());

-- ============================================
-- 6. Create RLS policies for session_code_snapshots
-- ============================================

DROP POLICY IF EXISTS "Users can view code snapshots in their sessions" ON public.session_code_snapshots;
DROP POLICY IF EXISTS "Users can create code snapshots" ON public.session_code_snapshots;

-- SELECT: Pod members can view snapshots
CREATE POLICY "Users can view code snapshots in their sessions"
ON public.session_code_snapshots FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.study_pod_sessions s
        JOIN public.study_pod_members m ON m.pod_id = s.pod_id
        WHERE s.id = session_code_snapshots.session_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
);

-- INSERT: Users can create snapshots
CREATE POLICY "Users can create code snapshots"
ON public.session_code_snapshots FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

-- ============================================
-- 7. Enable Realtime for session tables
-- ============================================

-- Note: The session page now uses Supabase Realtime Channels with Presence
-- This doesn't require table-level realtime, but we enable it for backup/fallback

-- Enable realtime for session_active_participants (if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'session_active_participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.session_active_participants;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add session_active_participants to realtime: %', SQLERRM;
END $$;

-- Enable realtime for session_chat_messages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'session_chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.session_chat_messages;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add session_chat_messages to realtime: %', SQLERRM;
END $$;

-- Enable realtime for study_pod_session_attendance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'study_pod_session_attendance'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.study_pod_session_attendance;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add study_pod_session_attendance to realtime: %', SQLERRM;
END $$;

-- ============================================
-- 8. Create indexes for better performance
-- ============================================

-- Index for faster participant lookups
CREATE INDEX IF NOT EXISTS idx_session_participants_session_active 
ON public.session_active_participants(session_id, is_active);

-- Index for faster chat message lookups
CREATE INDEX IF NOT EXISTS idx_session_chat_messages_session_created 
ON public.session_chat_messages(session_id, created_at);

-- Index for faster attendance lookups
CREATE INDEX IF NOT EXISTS idx_session_attendance_session_user 
ON public.study_pod_session_attendance(session_id, user_id);

-- ============================================
-- 9. Grant permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE ON public.session_active_participants TO authenticated;
GRANT SELECT, INSERT ON public.session_chat_messages TO authenticated;
GRANT SELECT, INSERT ON public.session_code_executions TO authenticated;
GRANT SELECT, INSERT ON public.session_code_snapshots TO authenticated;

-- ============================================
-- Done!
-- ============================================
SELECT 'Session realtime setup complete!' AS result;

