-- ============================================================================
-- PUBLIC INTERVIEW SESSIONS
-- ============================================================================
-- This migration creates tables for public interview sessions where hosts
-- can create sessions that appear in a public list for others to join.
-- ============================================================================

-- Create public_interview_sessions table
CREATE TABLE IF NOT EXISTS public_interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  end_time TIMESTAMPTZ NOT NULL,
  is_available BOOLEAN DEFAULT true,
  session_id VARCHAR(255),
  current_participant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_end_time CHECK (end_time > created_at),
  CONSTRAINT valid_title CHECK (LENGTH(title) > 0)
);

-- Create index for faster queries
CREATE INDEX idx_public_sessions_host ON public_interview_sessions(host_user_id);
CREATE INDEX idx_public_sessions_available ON public_interview_sessions(is_available, end_time) WHERE is_available = true;
CREATE INDEX idx_public_sessions_end_time ON public_interview_sessions(end_time);

-- Create join requests table
CREATE TABLE IF NOT EXISTS public_interview_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public_interview_sessions(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate requests
  UNIQUE(session_id, requester_id)
);

-- Create indexes for join requests
CREATE INDEX idx_join_requests_session ON public_interview_join_requests(session_id, status);
CREATE INDEX idx_join_requests_requester ON public_interview_join_requests(requester_id);

-- Add updated_at trigger for public_interview_sessions
CREATE OR REPLACE FUNCTION update_public_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_public_session_timestamp
  BEFORE UPDATE ON public_interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_public_session_timestamp();

-- Add updated_at trigger for public_interview_join_requests
CREATE OR REPLACE FUNCTION update_join_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_join_request_timestamp
  BEFORE UPDATE ON public_interview_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_join_request_timestamp();

-- Function to automatically expire sessions
CREATE OR REPLACE FUNCTION expire_public_sessions()
RETURNS void AS $$
BEGIN
  UPDATE public_interview_sessions
  SET is_available = false
  WHERE end_time < NOW() AND is_available = true;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE public_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_interview_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public_interview_sessions

-- Anyone can view available public sessions
CREATE POLICY "Anyone can view available public sessions"
  ON public_interview_sessions
  FOR SELECT
  USING (true);

-- Users can create their own sessions
CREATE POLICY "Users can create their own public sessions"
  ON public_interview_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

-- Hosts can update their own sessions
CREATE POLICY "Hosts can update their own sessions"
  ON public_interview_sessions
  FOR UPDATE
  USING (auth.uid() = host_user_id)
  WITH CHECK (auth.uid() = host_user_id);

-- Hosts can delete their own sessions
CREATE POLICY "Hosts can delete their own sessions"
  ON public_interview_sessions
  FOR DELETE
  USING (auth.uid() = host_user_id);

-- RLS Policies for public_interview_join_requests

-- Users can view requests for their sessions (as host) or their own requests
CREATE POLICY "View own or session join requests"
  ON public_interview_join_requests
  FOR SELECT
  USING (
    auth.uid() = requester_id OR
    auth.uid() IN (
      SELECT pis.host_user_id
      FROM public_interview_sessions pis
      WHERE pis.id = public_interview_join_requests.session_id
    )
  );

-- Users can create join requests
CREATE POLICY "Users can create join requests"
  ON public_interview_join_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Hosts can update requests for their sessions, requesters can cancel their own
CREATE POLICY "Update join requests"
  ON public_interview_join_requests
  FOR UPDATE
  USING (
    auth.uid() = requester_id OR
    auth.uid() IN (
      SELECT pis.host_user_id
      FROM public_interview_sessions pis
      WHERE pis.id = public_interview_join_requests.session_id
    )
  )
  WITH CHECK (
    auth.uid() = requester_id OR
    auth.uid() IN (
      SELECT pis.host_user_id
      FROM public_interview_sessions pis
      WHERE pis.id = public_interview_join_requests.session_id
    )
  );

-- Users can delete their own requests
CREATE POLICY "Users can delete their own join requests"
  ON public_interview_join_requests
  FOR DELETE
  USING (auth.uid() = requester_id);

-- Grant permissions
GRANT ALL ON public_interview_sessions TO authenticated;
GRANT ALL ON public_interview_join_requests TO authenticated;
