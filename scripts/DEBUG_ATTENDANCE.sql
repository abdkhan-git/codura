-- DEBUG: Check why attendance marking is failing
-- Run each section separately to diagnose

-- 1. Get the session details (replace with your actual session ID from the URL)
SELECT 
  id,
  pod_id,
  title,
  status,
  host_user_id
FROM study_pod_sessions
WHERE title LIKE '%Dynamic Programming%'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Get your user ID (run this while logged in via Supabase dashboard or use the auth.users table)
-- You can also get this from your browser's localStorage: sb-<project>-auth-token
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- 3. Check if you're a member of the pod (replace IDs)
-- Replace 'YOUR_POD_ID' with the pod_id from query 1
-- Replace 'YOUR_USER_ID' with your user id from query 2
/*
SELECT * FROM study_pod_members 
WHERE pod_id = 'YOUR_POD_ID'
AND user_id = 'YOUR_USER_ID';
*/

-- 4. Check all members of the pod
SELECT 
  spm.user_id,
  spm.status,
  spm.role,
  u.full_name,
  u.email
FROM study_pod_members spm
JOIN users u ON spm.user_id = u.user_id
WHERE spm.pod_id = (
  SELECT pod_id FROM study_pod_sessions 
  WHERE title LIKE '%Dynamic Programming%'
  ORDER BY created_at DESC
  LIMIT 1
);

-- 5. Check existing attendance for this session
SELECT * FROM study_pod_session_attendance
WHERE session_id = (
  SELECT id FROM study_pod_sessions 
  WHERE title LIKE '%Dynamic Programming%'
  ORDER BY created_at DESC
  LIMIT 1
);

-- 6. Check RLS policies
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'study_pod_session_attendance';

-- 7. Try to manually insert (as service role - bypasses RLS)
-- Uncomment and replace IDs to test
/*
INSERT INTO study_pod_session_attendance (session_id, user_id, joined_at)
SELECT 
  (SELECT id FROM study_pod_sessions WHERE title LIKE '%Dynamic Programming%' ORDER BY created_at DESC LIMIT 1),
  (SELECT user_id FROM study_pod_members WHERE pod_id = (SELECT pod_id FROM study_pod_sessions WHERE title LIKE '%Dynamic Programming%' ORDER BY created_at DESC LIMIT 1) AND status = 'active' LIMIT 1),
  NOW()
ON CONFLICT (session_id, user_id) DO UPDATE SET joined_at = NOW()
RETURNING *;
*/

-- 8. Check if the INSERT policy is working correctly
-- This simulates what the RLS policy checks
SELECT EXISTS (
  SELECT 1 
  FROM study_pod_sessions sps
  JOIN study_pod_members spm ON sps.pod_id = spm.pod_id
  WHERE sps.id = (SELECT id FROM study_pod_sessions WHERE title LIKE '%Dynamic Programming%' ORDER BY created_at DESC LIMIT 1)
  AND spm.status = 'active'
) as "should_allow_insert";

-- 9. NUCLEAR OPTION: Completely disable RLS on this table
-- Only use if nothing else works!
-- ALTER TABLE study_pod_session_attendance DISABLE ROW LEVEL SECURITY;

-- 10. Re-enable after testing
-- ALTER TABLE study_pod_session_attendance ENABLE ROW LEVEL SECURITY;


