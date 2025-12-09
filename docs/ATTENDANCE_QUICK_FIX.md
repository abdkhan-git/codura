# Quick Fix: Study Pod Attendance Issue

## The Problem
You're getting "Failed to mark attendance" error. Based on the constraints, there's a **UNIQUE constraint on (session_id, user_id)** which means:
- A user can only have ONE attendance record per session
- If a record already exists, trying to insert again fails

## Immediate Fix

### Step 1: Check for Existing Records
Run this in Supabase SQL Editor (replace with your actual session ID and user ID):

```sql
SELECT * FROM study_pod_session_attendance 
WHERE session_id = 'YOUR_SESSION_ID' 
  AND user_id = 'YOUR_USER_ID';
```

**If you see a record:** The attendance is already marked! The UI just needs to reflect this.

**If you see NO record:** Continue to Step 2.

### Step 2: Check Pod Membership
```sql
SELECT 
  spm.*,
  sps.id as session_id,
  sps.title
FROM study_pod_members spm
JOIN study_pod_sessions sps ON sps.pod_id = spm.pod_id
WHERE sps.id = 'YOUR_SESSION_ID'
  AND spm.user_id = 'YOUR_USER_ID'
  AND spm.status = 'active';
```

**If you see NO result:** You're not an active member of this pod. You need to join the pod first.

**If you see a result:** Continue to Step 3.

### Step 3: Try Manual Insert (Testing)
```sql
INSERT INTO study_pod_session_attendance (session_id, user_id, joined_at)
VALUES (
  'YOUR_SESSION_ID'::uuid,
  'YOUR_USER_ID'::uuid,
  NOW()
)
RETURNING *;
```

**If this works:** The issue is with RLS policies. Run the fix script.

**If this fails:** Note the error message and continue to Step 4.

### Step 4: Run the RLS Fix
Execute this in Supabase SQL Editor:

```sql
-- Drop and recreate the INSERT policy
DROP POLICY IF EXISTS "Pod members can mark their own attendance" ON study_pod_session_attendance;

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

-- Add service role policy
DROP POLICY IF EXISTS "Service role can manage all attendance" ON study_pod_session_attendance;

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

### Step 5: Test Again
1. Refresh your browser
2. Try marking attendance again
3. Check the browser console for any error messages
4. Check server logs for detailed error info

## What I Changed in the Code

The API endpoint (`app/api/study-pods/sessions/[sessionId]/join/route.ts`) now:

1. **Uses `maybeSingle()` instead of `single()`** - Won't throw error if no record exists
2. **Returns success if already marked** - If attendance exists, returns success instead of error
3. **Handles unique constraint violations** - If insert fails due to duplicate, checks if record exists and returns success
4. **Better error logging** - Shows detailed error info including error code

## Common Error Codes

- **23505**: Unique constraint violation (record already exists)
  - **Fix**: The updated code now handles this automatically
  
- **42501**: RLS policy violation (permission denied)
  - **Fix**: Run Step 4 above to fix RLS policies
  
- **23503**: Foreign key violation (session or user doesn't exist)
  - **Fix**: Verify the session ID and user ID are correct

## Verify It's Working

After the fix, run this to see recent attendance:

```sql
SELECT 
  a.id,
  a.joined_at,
  a.left_at,
  s.title as session_title,
  u.full_name as user_name,
  s.status as session_status
FROM study_pod_session_attendance a
JOIN study_pod_sessions s ON a.session_id = s.id
JOIN users u ON a.user_id = u.user_id
WHERE a.joined_at > NOW() - INTERVAL '1 hour'
ORDER BY a.joined_at DESC;
```

## Still Not Working?

1. **Check browser console** for the exact error message
2. **Check server logs** for detailed error info (now includes error code, message, details)
3. **Run the cleanup script**: `scripts/cleanup-attendance-duplicates.sql`
4. **Temporarily disable RLS** to test:
   ```sql
   ALTER TABLE study_pod_session_attendance DISABLE ROW LEVEL SECURITY;
   -- Test
   ALTER TABLE study_pod_session_attendance ENABLE ROW LEVEL SECURITY;
   ```

## Need More Help?

Share:
1. The exact error message from browser console
2. The error code from server logs
3. Results from Step 1 and Step 2 above


