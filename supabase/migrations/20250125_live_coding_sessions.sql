-- =====================================================
-- Live Coding Sessions Infrastructure
-- =====================================================
-- This migration adds support for real-time collaborative coding sessions
-- including code snapshots, active participants, and execution results

-- =====================================================
-- 1. Session Code Snapshots Table
-- =====================================================
-- Stores code state at different points during a session
CREATE TABLE IF NOT EXISTS session_code_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES study_pod_sessions(id) ON DELETE CASCADE,
  code TEXT NOT NULL DEFAULT '',
  language VARCHAR(50) NOT NULL DEFAULT 'javascript',
  snapshot_type VARCHAR(20) NOT NULL DEFAULT 'auto', -- auto, manual, final
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Add index for faster lookups
  CONSTRAINT valid_snapshot_type CHECK (snapshot_type IN ('auto', 'manual', 'final', 'initial'))
);

CREATE INDEX idx_session_code_snapshots_session ON session_code_snapshots(session_id);
CREATE INDEX idx_session_code_snapshots_created_at ON session_code_snapshots(created_at);

-- =====================================================
-- 2. Session Active Participants Table
-- =====================================================
-- Tracks real-time presence of users in a session
CREATE TABLE IF NOT EXISTS session_active_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES study_pod_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cursor_color VARCHAR(7), -- Hex color for cursor (e.g., #FF5733)
  cursor_position JSONB, -- {line: number, column: number}
  selection_range JSONB, -- {start: {line, column}, end: {line, column}}
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate entries for same user in same session
  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_session_participants_session ON session_active_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_active_participants(user_id);
CREATE INDEX idx_session_participants_active ON session_active_participants(session_id, is_active);

-- =====================================================
-- 3. Session Code Executions Table
-- =====================================================
-- Stores code execution results to broadcast to all participants
CREATE TABLE IF NOT EXISTS session_code_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES study_pod_sessions(id) ON DELETE CASCADE,
  executed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language VARCHAR(50) NOT NULL,
  input TEXT, -- Test input if provided
  output TEXT, -- Execution output
  error TEXT, -- Error message if any
  status VARCHAR(20) NOT NULL, -- success, error, timeout
  execution_time_ms INTEGER, -- Execution duration
  memory_used_kb INTEGER, -- Memory usage
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_execution_status CHECK (status IN ('success', 'error', 'timeout', 'running'))
);

CREATE INDEX idx_session_executions_session ON session_code_executions(session_id);
CREATE INDEX idx_session_executions_created_at ON session_code_executions(created_at);

-- =====================================================
-- 4. Session Chat Messages Table
-- =====================================================
-- In-session chat for quick communication
CREATE TABLE IF NOT EXISTS session_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES study_pod_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text', -- text, system, code_snippet
  metadata JSONB, -- For code snippets: {language, code}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_message_type CHECK (message_type IN ('text', 'system', 'code_snippet', 'announcement'))
);

CREATE INDEX idx_session_chat_session ON session_chat_messages(session_id);
CREATE INDEX idx_session_chat_created_at ON session_chat_messages(created_at);

-- =====================================================
-- 5. Add Current Code State to Sessions Table
-- =====================================================
-- Add column to store current code state directly in session
ALTER TABLE study_pod_sessions
ADD COLUMN IF NOT EXISTS current_code TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS current_language VARCHAR(50) DEFAULT 'javascript',
ADD COLUMN IF NOT EXISTS current_problem_id VARCHAR(255);

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE session_code_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_active_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_code_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_chat_messages ENABLE ROW LEVEL SECURITY;

-- Session Code Snapshots Policies
CREATE POLICY "Pod members can view snapshots"
  ON session_code_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_sessions s
      JOIN study_pod_members m ON m.pod_id = s.pod_id
      WHERE s.id = session_code_snapshots.session_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "Session participants can create snapshots"
  ON session_code_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_pod_session_attendance a
      WHERE a.session_id = session_code_snapshots.session_id
        AND a.user_id = auth.uid()
    )
  );

-- Active Participants Policies
CREATE POLICY "Pod members can view participants"
  ON session_active_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_sessions s
      JOIN study_pod_members m ON m.pod_id = s.pod_id
      WHERE s.id = session_active_participants.session_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "Users can manage their own participation"
  ON session_active_participants FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Code Executions Policies
CREATE POLICY "Pod members can view executions"
  ON session_code_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_sessions s
      JOIN study_pod_members m ON m.pod_id = s.pod_id
      WHERE s.id = session_code_executions.session_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "Session participants can create executions"
  ON session_code_executions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_pod_session_attendance a
      WHERE a.session_id = session_code_executions.session_id
        AND a.user_id = auth.uid()
    )
  );

-- Session Chat Policies
CREATE POLICY "Pod members can view chat"
  ON session_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_sessions s
      JOIN study_pod_members m ON m.pod_id = s.pod_id
      WHERE s.id = session_chat_messages.session_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "Session participants can send messages"
  ON session_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_pod_session_attendance a
      WHERE a.session_id = session_chat_messages.session_id
        AND a.user_id = auth.uid()
    )
  );

-- =====================================================
-- Utility Functions
-- =====================================================

-- Function to automatically clean up inactive participants
CREATE OR REPLACE FUNCTION cleanup_inactive_participants()
RETURNS void AS $$
BEGIN
  UPDATE session_active_participants
  SET is_active = false
  WHERE last_seen_at < NOW() - INTERVAL '5 minutes'
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get active participant count
CREATE OR REPLACE FUNCTION get_session_active_count(p_session_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM session_active_participants
  WHERE session_id = p_session_id
    AND is_active = true
    AND last_seen_at > NOW() - INTERVAL '2 minutes';
$$ LANGUAGE sql STABLE;

-- Verify tables were created
DO $$
BEGIN
  RAISE NOTICE 'Live coding session tables created successfully';
  RAISE NOTICE 'Tables: session_code_snapshots, session_active_participants, session_code_executions, session_chat_messages';
END $$;
