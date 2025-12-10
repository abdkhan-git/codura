-- FIX RLS POLICY V2 - More permissive approach
-- The issue might be with how the INSERT policy references columns

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "select_own_pod_attendance" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "insert_own_attendance" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "update_own_attendance" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "delete_own_attendance" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "service_role_all" ON study_pod_session_attendance;

-- Step 2: Create a simpler INSERT policy
-- The key issue: In WITH CHECK, we can't reference the table being inserted into
-- We need to reference the VALUES being inserted

CREATE POLICY "allow_pod_members_to_insert_attendance"
ON study_pod_session_attendance
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only insert their own attendance
  user_id = auth.uid()
);

-- Step 3: Create SELECT policy
CREATE POLICY "allow_pod_members_to_view_attendance"
ON study_pod_session_attendance
FOR SELECT
TO authenticated
USING (
  -- Users can see attendance for sessions in pods they're members of
  EXISTS (
    SELECT 1 
    FROM study_pod_sessions sps
    JOIN study_pod_members spm ON sps.pod_id = spm.pod_id
    WHERE sps.id = study_pod_session_attendance.session_id
    AND spm.user_id = auth.uid()
    AND spm.status = 'active'
  )
);

-- Step 4: Create UPDATE policy
CREATE POLICY "allow_users_to_update_own_attendance"
ON study_pod_session_attendance
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 5: Create DELETE policy
CREATE POLICY "allow_users_to_delete_own_attendance"
ON study_pod_session_attendance
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Step 6: Service role bypass
CREATE POLICY "service_role_bypass"
ON study_pod_session_attendance
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 7: Verify RLS is enabled
ALTER TABLE study_pod_session_attendance ENABLE ROW LEVEL SECURITY;

-- Step 8: Grant permissions
GRANT ALL ON study_pod_session_attendance TO authenticated;
GRANT ALL ON study_pod_session_attendance TO service_role;

-- Step 9: Verify policies
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'study_pod_session_attendance';

SELECT 'RLS POLICY V2 APPLIED! Try marking attendance now.' as result;


