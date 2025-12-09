-- =====================================================
-- Live Streams Table
-- =====================================================
-- Tracks active live streaming sessions for discovery

CREATE TABLE IF NOT EXISTS live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

  -- Note: We'll handle one active stream per streamer in application logic
  -- The unique constraint would prevent multiple streams even if one is inactive
);

-- Indexes for efficient queries
CREATE INDEX idx_live_streams_is_active ON live_streams(is_active) WHERE is_active = true;
CREATE INDEX idx_live_streams_problem_id ON live_streams(problem_id);
CREATE INDEX idx_live_streams_streamer_id ON live_streams(streamer_id);
CREATE INDEX idx_live_streams_started_at ON live_streams(started_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_live_streams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_live_streams_updated_at
  BEFORE UPDATE ON live_streams
  FOR EACH ROW
  EXECUTE FUNCTION update_live_streams_updated_at();

-- RLS Policies
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active streams
CREATE POLICY "Anyone can view active streams"
  ON live_streams
  FOR SELECT
  USING (is_active = true);

-- Policy: Users can manage their own streams
CREATE POLICY "Users can manage their own streams"
  ON live_streams
  FOR ALL
  USING (auth.uid() = streamer_id);

-- Policy: Users can update viewer counts (for their own streams or any active stream)
CREATE POLICY "Users can update viewer counts"
  ON live_streams
  FOR UPDATE
  USING (is_active = true);

