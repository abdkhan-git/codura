-- Fix Study Pod Session Attendance Issues
-- Run this to diagnose and fix attendance marking problems

-- 1. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'study_pod_session_attendance';

-- 2. Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'study_pod_session_attendance';

-- 3. Check for any failed attendance records (if there's a log table)
SELECT 
  s.id as session_id,
  s.title,
  s.pod_id,
  s.scheduled_at,
  s.status,
  COUNT(a.id) as attendance_count
FROM study_pod_sessions s
LEFT JOIN study_pod_session_attendance a ON s.id = a.session_id
GROUP BY s.id, s.title, s.pod_id, s.scheduled_at, s.status
ORDER BY s.scheduled_at DESC
LIMIT 20;

-- 4. Check if the user is actually a member of the pod
-- Replace 'YOUR_SESSION_ID' and 'YOUR_USER_ID' with actual values
/*
SELECT 
  spm.user_id,
  spm.pod_id,
  spm.status,
  sps.id as session_id,
  sps.title as session_title
FROM study_pod_members spm
JOIN study_pod_sessions sps ON sps.pod_id = spm.pod_id
WHERE sps.id = 'YOUR_SESSION_ID'
  AND spm.user_id = 'YOUR_USER_ID';
*/

-- 5. Temporarily disable RLS to test (ONLY FOR DEBUGGING - RE-ENABLE AFTER)
-- ALTER TABLE study_pod_session_attendance DISABLE ROW LEVEL SECURITY;

-- 6. Re-enable RLS (run this after testing)
-- ALTER TABLE study_pod_session_attendance ENABLE ROW LEVEL SECURITY;

-- 7. Drop and recreate the INSERT policy with better error handling
DROP POLICY IF EXISTS "Pod members can mark their own attendance" ON study_pod_session_attendance;

CREATE POLICY "Pod members can mark their own attendance"
ON study_pod_session_attendance
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 
    FROM study_pod_sessions sps
    INNER JOIN study_pod_members spm 
      ON sps.pod_id = spm.pod_id
      AND spm.user_id = auth.uid()
      AND spm.status = 'active'
    WHERE sps.id = study_pod_session_attendance.session_id
  )
);

-- 8. Add a policy for service role (for server-side operations)
DROP POLICY IF EXISTS "Service role can manage all attendance" ON study_pod_session_attendance;

CREATE POLICY "Service role can manage all attendance"
ON study_pod_session_attendance
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 9. Grant necessary permissions
GRANT ALL ON study_pod_session_attendance TO authenticated;
GRANT ALL ON study_pod_session_attendance TO service_role;

-- 10. Check if there are any constraints that might be failing
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'study_pod_session_attendance';


