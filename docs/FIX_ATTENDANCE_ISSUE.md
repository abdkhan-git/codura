# Fix: Study Pod Session Attendance Marking Issue

## Problem
Users are unable to mark attendance for study pod sessions. The "Mark Attendance" button fails with an error.

## Root Causes (Possible)
1. **RLS Policy Issue**: Row Level Security policies may be blocking the insert
2. **Missing Pod Membership**: User might not be properly registered as an active pod member
3. **Foreign Key Constraint**: Session or user IDs might not match
4. **Permission Issue**: Service role or authenticated role might lack permissions

## Solution Steps

### Step 1: Run the Diagnostic SQL Script

Execute the SQL script at `scripts/fix-session-attendance.sql` in your Supabase SQL Editor. This will:
- Check RLS status
- Verify existing policies
- Check attendance records
- Recreate the INSERT policy with better error handling
- Add a service role policy for server-side operations
- Grant necessary permissions

### Step 2: Check the Enhanced Error Logs

The API endpoint now provides detailed error information. After attempting to mark attendance, check your server logs for output like:

```json
{
  "error": "Failed to mark attendance",
  "details": "new row violates row-level security policy",
  "code": "42501"
}
```

Common error codes:
- `42501`: RLS policy violation
- `23503`: Foreign key constraint violation
- `23505`: Unique constraint violation (already joined)

### Step 3: Verify Pod Membership

Run this query in Supabase SQL Editor (replace with actual IDs):

```sql
SELECT 
  spm.user_id,
  spm.pod_id,
  spm.status,
  spm.role,
  sps.id as session_id,
  sps.title as session_title,
  sps.status as session_status
FROM study_pod_members spm
JOIN study_pod_sessions sps ON sps.pod_id = spm.pod_id
WHERE sps.id = 'YOUR_SESSION_ID'
  AND spm.user_id = 'YOUR_USER_ID';
```

Expected result: Should return 1 row with `status = 'active'`

### Step 4: Test the Fix

1. Navigate to a study pod session
2. Click "Mark Attendance"
3. Check the browser console and server logs for any errors
4. Verify the attendance record was created:

```sql
SELECT * FROM study_pod_session_attendance 
WHERE session_id = 'YOUR_SESSION_ID' 
ORDER BY joined_at DESC;
```

## Quick Fix (If Above Doesn't Work)

If the issue persists, temporarily disable RLS to isolate the problem:

```sql
-- TEMPORARY - FOR DEBUGGING ONLY
ALTER TABLE study_pod_session_attendance DISABLE ROW LEVEL SECURITY;

-- Test marking attendance

-- IMPORTANT: RE-ENABLE IMMEDIATELY AFTER TESTING
ALTER TABLE study_pod_session_attendance ENABLE ROW LEVEL SECURITY;
```

If attendance works with RLS disabled, the issue is definitely with the policies.

## Permanent Fix

Run this SQL to ensure proper policies:

```sql
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view attendance for their pod sessions" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "Pod members can mark their own attendance" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "Users can update their own attendance" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "Hosts and moderators can manage attendance" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "Service role can manage all attendance" ON study_pod_session_attendance;

-- Recreate policies with proper checks
CREATE POLICY "Pod members can mark their own attendance"
ON study_pod_session_attendance
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 
    FROM study_pod_sessions sps
    INNER JOIN study_pod_members spm 
      ON sps.pod_id = spm.pod_id
      AND spm.user_id = auth.uid()
      AND spm.status = 'active'
    WHERE sps.id = study_pod_session_attendance.session_id
  )
);

CREATE POLICY "Users can view attendance for their pod sessions"
ON study_pod_session_attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM study_pod_sessions sps
    JOIN study_pod_members spm ON sps.pod_id = spm.pod_id
    WHERE sps.id = study_pod_session_attendance.session_id
    AND spm.user_id = auth.uid()
    AND spm.status = 'active'
  )
);

CREATE POLICY "Users can update their own attendance"
ON study_pod_session_attendance
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Hosts and moderators can manage attendance"
ON study_pod_session_attendance
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM study_pod_sessions sps
    JOIN study_pod_members spm ON sps.pod_id = spm.pod_id
    WHERE sps.id = study_pod_session_attendance.session_id
    AND (
      sps.host_user_id = auth.uid()
      OR (
        spm.user_id = auth.uid()
        AND spm.role IN ('owner', 'moderator')
      )
    )
  )
);

CREATE POLICY "Service role can manage all attendance"
ON study_pod_session_attendance
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON study_pod_session_attendance TO authenticated;
GRANT ALL ON study_pod_session_attendance TO service_role;
```

## Verification

After applying the fix:

1. ✅ User can mark attendance for sessions in pods they're a member of
2. ✅ User cannot mark attendance for sessions in pods they're not a member of
3. ✅ Attendance count updates correctly on the session
4. ✅ Member's `sessions_attended` count increments
5. ✅ No errors in server logs

## Additional Notes

- The API endpoint now returns detailed error information for debugging
- The `study_pod_session_attendance` table has proper RLS policies
- Service role has full access for server-side operations
- Users can only mark their own attendance
- Hosts and moderators have full management access

## Related Files
- `app/api/study-pods/sessions/[sessionId]/join/route.ts` - Enhanced with better error logging
- `scripts/fix-session-attendance.sql` - Diagnostic and fix script
- `supabase/migrations/20250121_study_pod_sessions_rls.sql` - Original RLS policies


