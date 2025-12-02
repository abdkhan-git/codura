-- ============================================
-- DEFINITIVE FIX FOR STUDY POD ATTENDANCE
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- Step 1: Temporarily disable RLS to isolate the issue
ALTER TABLE study_pod_session_attendance DISABLE ROW LEVEL SECURITY;

-- Step 2: Check if there are any existing attendance records
SELECT 'Existing attendance records:' as info, COUNT(*) as count FROM study_pod_session_attendance;

-- Step 3: Check the foreign key constraint on user_id
-- The issue might be that user_id FK references auth.users but insert is failing
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'study_pod_session_attendance';

-- Step 4: Drop the problematic unique constraint if it exists
-- (It shouldn't exist based on your schema, but just in case)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'study_pod_session_attendance_unique'
    AND table_name = 'study_pod_session_attendance'
  ) THEN
    ALTER TABLE study_pod_session_attendance DROP CONSTRAINT study_pod_session_attendance_unique;
    RAISE NOTICE 'Dropped study_pod_session_attendance_unique constraint';
  ELSE
    RAISE NOTICE 'No unique constraint to drop';
  END IF;
END $$;

-- Step 5: Add proper unique constraint (session_id, user_id) if needed
-- This allows one attendance record per user per session
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'study_pod_session_attendance_session_user_unique'
    AND table_name = 'study_pod_session_attendance'
  ) THEN
    ALTER TABLE study_pod_session_attendance 
    ADD CONSTRAINT study_pod_session_attendance_session_user_unique 
    UNIQUE (session_id, user_id);
    RAISE NOTICE 'Added proper unique constraint on (session_id, user_id)';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Constraint already exists (caught exception)';
END $$;

-- Step 6: Drop ALL existing RLS policies
DROP POLICY IF EXISTS "Users can view attendance for their pod sessions" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "Pod members can mark their own attendance" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "Users can update their own attendance" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "Hosts and moderators can manage attendance" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "Service role can manage all attendance" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON study_pod_session_attendance;

-- Step 7: Create SIMPLE permissive policies
-- SELECT policy - users can see attendance for sessions in their pods
CREATE POLICY "select_own_pod_attendance"
ON study_pod_session_attendance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM study_pod_sessions sps
    JOIN study_pod_members spm ON sps.pod_id = spm.pod_id
    WHERE sps.id = study_pod_session_attendance.session_id
    AND spm.user_id = auth.uid()
    AND spm.status = 'active'
  )
);

-- INSERT policy - users can mark their own attendance if they're pod members
CREATE POLICY "insert_own_attendance"
ON study_pod_session_attendance
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 
    FROM study_pod_sessions sps
    JOIN study_pod_members spm ON sps.pod_id = spm.pod_id
    WHERE sps.id = session_id
    AND spm.user_id = auth.uid()
    AND spm.status = 'active'
  )
);

-- UPDATE policy - users can update their own attendance
CREATE POLICY "update_own_attendance"
ON study_pod_session_attendance
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE policy - users can delete their own attendance
CREATE POLICY "delete_own_attendance"
ON study_pod_session_attendance
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Service role bypass policy
CREATE POLICY "service_role_all"
ON study_pod_session_attendance
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 8: Re-enable RLS
ALTER TABLE study_pod_session_attendance ENABLE ROW LEVEL SECURITY;

-- Step 9: Grant permissions
GRANT ALL ON study_pod_session_attendance TO authenticated;
GRANT ALL ON study_pod_session_attendance TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Step 10: Verify policies are in place
SELECT 
  'Policies after fix:' as info,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'study_pod_session_attendance'
ORDER BY policyname;

-- Step 11: Test insert (replace with actual values)
-- Uncomment and run this to test:
/*
-- First, get a valid session ID and user ID
SELECT 
  sps.id as session_id,
  spm.user_id,
  sps.title
FROM study_pod_sessions sps
JOIN study_pod_members spm ON sps.pod_id = spm.pod_id
WHERE spm.status = 'active'
LIMIT 5;

-- Then test insert (replace IDs)
INSERT INTO study_pod_session_attendance (session_id, user_id, joined_at)
VALUES (
  'YOUR_SESSION_ID'::uuid,
  'YOUR_USER_ID'::uuid,
  NOW()
)
ON CONFLICT (session_id, user_id) DO UPDATE SET joined_at = NOW()
RETURNING *;
*/

-- Done!
SELECT 'ATTENDANCE FIX COMPLETE! Try marking attendance now.' as result;


