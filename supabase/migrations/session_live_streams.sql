-- =====================================================
-- Session Live Streams Infrastructure
-- =====================================================
-- This migration adds support for live streaming within sessions
-- allowing hosts to broadcast their screen/camera to participants

-- =====================================================
-- 1. Session Live Streams Table
-- =====================================================
CREATE TABLE IF NOT EXISTS session_live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES study_pod_sessions(id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_type VARCHAR(20) NOT NULL DEFAULT 'screen', -- screen, camera, both
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, stopped, paused
  viewer_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', -- For WebRTC signaling data, settings, etc.

  CONSTRAINT valid_stream_type CHECK (stream_type IN ('screen', 'camera', 'both')),
  CONSTRAINT valid_stream_status CHECK (status IN ('active', 'stopped', 'paused'))
);

CREATE INDEX idx_session_streams_session ON session_live_streams(session_id);
CREATE INDEX idx_session_streams_host ON session_live_streams(host_user_id);
CREATE INDEX idx_session_streams_status ON session_live_streams(status);

-- Only one active stream per session at a time (partial unique index)
CREATE UNIQUE INDEX idx_session_streams_unique_active
ON session_live_streams(session_id)
WHERE status = 'active';

-- =====================================================
-- 2. Stream Viewers Table
-- =====================================================
-- Tracks who is actively viewing the live stream
CREATE TABLE IF NOT EXISTS session_stream_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES session_live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- One viewer entry per stream per user
  UNIQUE(stream_id, user_id)
);

CREATE INDEX idx_stream_viewers_stream ON session_stream_viewers(stream_id);
CREATE INDEX idx_stream_viewers_user ON session_stream_viewers(user_id);
CREATE INDEX idx_stream_viewers_active ON session_stream_viewers(stream_id, is_active);

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE session_live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_stream_viewers ENABLE ROW LEVEL SECURITY;

-- Stream Policies
CREATE POLICY "Pod members can view streams"
  ON session_live_streams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_sessions s
      JOIN study_pod_members m ON m.pod_id = s.pod_id
      WHERE s.id = session_live_streams.session_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "Session hosts can create streams"
  ON session_live_streams FOR INSERT
  WITH CHECK (
    host_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM study_pod_sessions s
      JOIN study_pod_members m ON m.pod_id = s.pod_id
      WHERE s.id = session_live_streams.session_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND (s.host_user_id = auth.uid() OR m.role IN ('owner', 'moderator'))
    )
  );

CREATE POLICY "Stream hosts can update their streams"
  ON session_live_streams FOR UPDATE
  USING (host_user_id = auth.uid())
  WITH CHECK (host_user_id = auth.uid());

-- Viewer Policies
CREATE POLICY "Pod members can view viewers"
  ON session_stream_viewers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM session_live_streams st
      JOIN study_pod_sessions s ON s.id = st.session_id
      JOIN study_pod_members m ON m.pod_id = s.pod_id
      WHERE st.id = session_stream_viewers.stream_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "Users can manage their viewer status"
  ON session_stream_viewers FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- Utility Functions
-- =====================================================

-- Function to update viewer count
CREATE OR REPLACE FUNCTION update_stream_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE session_live_streams
    SET viewer_count = (
      SELECT COUNT(*)
      FROM session_stream_viewers
      WHERE stream_id = NEW.stream_id
        AND is_active = true
        AND last_seen_at > NOW() - INTERVAL '30 seconds'
    )
    WHERE id = NEW.stream_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE session_live_streams
    SET viewer_count = (
      SELECT COUNT(*)
      FROM session_stream_viewers
      WHERE stream_id = OLD.stream_id
        AND is_active = true
        AND last_seen_at > NOW() - INTERVAL '30 seconds'
    )
    WHERE id = OLD.stream_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update viewer count
CREATE TRIGGER update_stream_viewers_count
AFTER INSERT OR UPDATE OR DELETE ON session_stream_viewers
FOR EACH ROW
EXECUTE FUNCTION update_stream_viewer_count();

-- Function to cleanup inactive viewers
CREATE OR REPLACE FUNCTION cleanup_inactive_stream_viewers()
RETURNS void AS $$
BEGIN
  UPDATE session_stream_viewers
  SET is_active = false
  WHERE last_seen_at < NOW() - INTERVAL '1 minute'
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get active viewer count for a stream
CREATE OR REPLACE FUNCTION get_stream_viewer_count(p_stream_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM session_stream_viewers
  WHERE stream_id = p_stream_id
    AND is_active = true
    AND last_seen_at > NOW() - INTERVAL '30 seconds';
$$ LANGUAGE sql STABLE;

-- Verify tables were created
DO $$
BEGIN
  RAISE NOTICE 'Session live streaming tables created successfully';
  RAISE NOTICE 'Tables: session_live_streams, session_stream_viewers';
END $$;
