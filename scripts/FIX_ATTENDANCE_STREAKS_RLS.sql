-- Fix RLS for study_pod_attendance_streaks so attendance triggers can run

-- Enable RLS (in case it was disabled/enabled inconsistently)
ALTER TABLE study_pod_attendance_streaks ENABLE ROW LEVEL SECURITY;

-- Drop any existing broad policies we might have experimented with
DROP POLICY IF EXISTS "attendance_streaks_manage_all" ON study_pod_attendance_streaks;

-- Keep existing SELECT policy from the migration (Pod members can view pod streaks)
-- and add simple permissive policies for writes so triggers can insert/update.

-- Triggers typically run under the same role as the client (anon/authenticated),
-- so these need to be permissive.

-- INSERT policy
CREATE POLICY "attendance_streaks_auth_insert"
ON study_pod_attendance_streaks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE policy
CREATE POLICY "attendance_streaks_auth_update"
ON study_pod_attendance_streaks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow service_role (if used by any background jobs) full access
CREATE POLICY "attendance_streaks_service_full"
ON study_pod_attendance_streaks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Optional: allow deletes by service role only (already covered by ALL above)

-- Verify policies
SELECT
  policyname,
  cmd,
  roles,
  permissive
FROM pg_policies
WHERE tablename = 'study_pod_attendance_streaks';

SELECT 'FIX_ATTENDANCE_STREAKS_RLS applied – try marking attendance again.' AS result;


