-- Enable RLS on study_pod_sessions table
ALTER TABLE study_pod_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view sessions for their pods" ON study_pod_sessions;
DROP POLICY IF EXISTS "Pod owners and moderators can create sessions" ON study_pod_sessions;
DROP POLICY IF EXISTS "Hosts, owners, and moderators can update sessions" ON study_pod_sessions;
DROP POLICY IF EXISTS "Hosts, owners, and moderators can delete sessions" ON study_pod_sessions;

-- Policy: Users can view sessions for pods they are members of
CREATE POLICY "Users can view sessions for their pods"
ON study_pod_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM study_pod_members
    WHERE study_pod_members.pod_id = study_pod_sessions.pod_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Policy: Pod owners and moderators can create sessions
CREATE POLICY "Pod owners and moderators can create sessions"
ON study_pod_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM study_pod_members
    WHERE study_pod_members.pod_id = study_pod_sessions.pod_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.role IN ('owner', 'moderator')
    AND study_pod_members.status = 'active'
  )
);

-- Policy: Hosts, owners, and moderators can update sessions
CREATE POLICY "Hosts, owners, and moderators can update sessions"
ON study_pod_sessions
FOR UPDATE
USING (
  -- User is the host
  host_user_id = auth.uid()
  OR
  -- User is owner or moderator of the pod
  EXISTS (
    SELECT 1 FROM study_pod_members
    WHERE study_pod_members.pod_id = study_pod_sessions.pod_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.role IN ('owner', 'moderator')
    AND study_pod_members.status = 'active'
  )
);

-- Policy: Hosts, owners, and moderators can delete/cancel sessions
CREATE POLICY "Hosts, owners, and moderators can delete sessions"
ON study_pod_sessions
FOR DELETE
USING (
  -- User is the host
  host_user_id = auth.uid()
  OR
  -- User is owner or moderator of the pod
  EXISTS (
    SELECT 1 FROM study_pod_members
    WHERE study_pod_members.pod_id = study_pod_sessions.pod_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.role IN ('owner', 'moderator')
    AND study_pod_members.status = 'active'
  )
);

-- Enable RLS on study_pod_session_attendance table
ALTER TABLE study_pod_session_attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view attendance for their pod sessions" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "Pod members can mark their own attendance" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "Users can update their own attendance" ON study_pod_session_attendance;
DROP POLICY IF EXISTS "Hosts and moderators can view all attendance" ON study_pod_session_attendance;

-- Policy: Pod members can view attendance for sessions in their pods
CREATE POLICY "Users can view attendance for their pod sessions"
ON study_pod_session_attendance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM study_pod_sessions
    JOIN study_pod_members ON study_pod_sessions.pod_id = study_pod_members.pod_id
    WHERE study_pod_sessions.id = study_pod_session_attendance.session_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Policy: Pod members can mark their own attendance
CREATE POLICY "Pod members can mark their own attendance"
ON study_pod_session_attendance
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM study_pod_sessions
    JOIN study_pod_members ON study_pod_sessions.pod_id = study_pod_members.pod_id
    WHERE study_pod_sessions.id = study_pod_session_attendance.session_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Policy: Users can update their own attendance
CREATE POLICY "Users can update their own attendance"
ON study_pod_session_attendance
FOR UPDATE
USING (
  user_id = auth.uid()
);

-- Policy: Hosts and moderators can manage attendance
CREATE POLICY "Hosts and moderators can manage attendance"
ON study_pod_session_attendance
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM study_pod_sessions
    JOIN study_pod_members ON study_pod_sessions.pod_id = study_pod_members.pod_id
    WHERE study_pod_sessions.id = study_pod_session_attendance.session_id
    AND (
      study_pod_sessions.host_user_id = auth.uid()
      OR (
        study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
      )
    )
  )
);
