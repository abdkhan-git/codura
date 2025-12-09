-- Clean up any duplicate or problematic attendance records
-- Run this to fix existing data issues

-- 1. Check for any duplicate attendance records (shouldn't exist due to unique constraint)
SELECT 
  session_id,
  user_id,
  COUNT(*) as count,
  ARRAY_AGG(id) as record_ids,
  ARRAY_AGG(joined_at) as joined_times
FROM study_pod_session_attendance
GROUP BY session_id, user_id
HAVING COUNT(*) > 1;

-- 2. Check for orphaned attendance records (session doesn't exist)
SELECT a.*
FROM study_pod_session_attendance a
LEFT JOIN study_pod_sessions s ON a.session_id = s.id
WHERE s.id IS NULL;

-- 3. Check for attendance where user is not a pod member
SELECT 
  a.id,
  a.session_id,
  a.user_id,
  s.pod_id,
  s.title as session_title
FROM study_pod_session_attendance a
JOIN study_pod_sessions s ON a.session_id = s.id
LEFT JOIN study_pod_members m ON m.pod_id = s.pod_id AND m.user_id = a.user_id
WHERE m.id IS NULL;

-- 4. Delete orphaned attendance records (CAREFUL - only run if you see orphaned records above)
/*
DELETE FROM study_pod_session_attendance a
WHERE NOT EXISTS (
  SELECT 1 FROM study_pod_sessions s WHERE s.id = a.session_id
);
*/

-- 5. Verify the unique constraint exists
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'study_pod_session_attendance'
  AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.constraint_name, tc.constraint_type;

-- 6. Check recent attendance attempts (last 24 hours)
SELECT 
  a.*,
  s.title as session_title,
  s.scheduled_at,
  s.status as session_status,
  u.full_name as user_name
FROM study_pod_session_attendance a
JOIN study_pod_sessions s ON a.session_id = s.id
JOIN users u ON a.user_id = u.user_id
WHERE a.joined_at > NOW() - INTERVAL '24 hours'
ORDER BY a.joined_at DESC;

-- 7. Check if there are any attendance records with left_at set
SELECT 
  COUNT(*) as total_attendance,
  COUNT(CASE WHEN left_at IS NOT NULL THEN 1 END) as left_sessions,
  COUNT(CASE WHEN left_at IS NULL THEN 1 END) as active_sessions
FROM study_pod_session_attendance;

-- 8. Fix attendance counts on sessions (if they're out of sync)
UPDATE study_pod_sessions s
SET attendees_count = (
  SELECT COUNT(*)
  FROM study_pod_session_attendance a
  WHERE a.session_id = s.id
    AND a.left_at IS NULL
)
WHERE s.id IN (
  SELECT DISTINCT session_id 
  FROM study_pod_session_attendance
);

-- 9. Check RLS policies are properly set
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  SUBSTRING(qual::text, 1, 100) as qual_preview,
  SUBSTRING(with_check::text, 1, 100) as with_check_preview
FROM pg_policies
WHERE tablename = 'study_pod_session_attendance'
ORDER BY cmd, policyname;

-- 10. Test query to see if current user can insert (run as authenticated user)
-- This will show if RLS is blocking the insert
/*
EXPLAIN (ANALYZE, VERBOSE, BUFFERS)
INSERT INTO study_pod_session_attendance (session_id, user_id, joined_at)
VALUES (
  'YOUR_SESSION_ID'::uuid,
  auth.uid(),
  NOW()
)
RETURNING *;
*/


