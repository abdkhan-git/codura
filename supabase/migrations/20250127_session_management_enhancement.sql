-- =====================================================
-- Session Management Enhancement
-- =====================================================
-- Adds session templates, recordings library, and enhanced scheduling

-- =====================================================
-- 1. Session Templates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_session_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID REFERENCES study_pods(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  session_type TEXT NOT NULL CHECK (session_type IN ('study', 'problem_solving', 'mock_interview', 'discussion', 'review', 'custom')),
  default_duration_minutes INTEGER DEFAULT 60,

  -- Role assignments for rotating roles (interviewer, interviewee, observers)
  role_assignments JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"role": "interviewer", "rotation": "sequential"}, {"role": "interviewee", "rotation": "sequential"}]

  -- Recommended preparation
  recommended_problems JSONB DEFAULT '[]'::jsonb,
  preparation_checklist JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"task": "Review arrays", "required": true}, {"task": "Practice whiteboarding", "required": false}]

  -- Template settings
  default_settings JSONB DEFAULT '{}'::jsonb,
  -- Example: {"allow_hints": true, "time_limit_per_problem": 45, "auto_record": true}

  is_official BOOLEAN DEFAULT false, -- System-provided templates
  usage_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_templates_pod ON study_pod_session_templates(pod_id);
CREATE INDEX idx_session_templates_type ON study_pod_session_templates(session_type);
CREATE INDEX idx_session_templates_official ON study_pod_session_templates(is_official) WHERE is_official = true;

-- =====================================================
-- 2. Session Recordings Library Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_session_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES study_pod_sessions(id) ON DELETE CASCADE,
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,

  -- Recording details
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  thumbnail_url TEXT,

  -- Content analysis
  transcription TEXT,
  summary TEXT, -- AI-generated summary
  key_moments JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"timestamp": 300, "type": "breakthrough", "description": "Found optimal solution"}, ...]

  -- Organization
  tags TEXT[] DEFAULT '{}',
  search_vector tsvector,

  -- Metadata
  problems_covered INTEGER[] DEFAULT '{}',
  participants UUID[] DEFAULT '{}',

  -- Access control
  is_public BOOLEAN DEFAULT false,
  allowed_viewers UUID[] DEFAULT '{}',

  -- Stats
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,

  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_recordings_session ON study_pod_session_recordings(session_id);
CREATE INDEX idx_session_recordings_pod ON study_pod_session_recordings(pod_id);
CREATE INDEX idx_session_recordings_created ON study_pod_session_recordings(created_at DESC);
CREATE INDEX idx_session_recordings_search ON study_pod_session_recordings USING GIN(search_vector);
CREATE INDEX idx_session_recordings_tags ON study_pod_session_recordings USING GIN(tags);

-- =====================================================
-- 3. Recording Views Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_recording_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES study_pod_session_recordings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  watch_duration_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  last_position_seconds INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(recording_id, user_id)
);

CREATE INDEX idx_recording_views_recording ON study_pod_recording_views(recording_id);
CREATE INDEX idx_recording_views_user ON study_pod_recording_views(user_id);

-- =====================================================
-- 4. Recording Likes Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_recording_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES study_pod_session_recordings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(recording_id, user_id)
);

CREATE INDEX idx_recording_likes_recording ON study_pod_recording_likes(recording_id);
CREATE INDEX idx_recording_likes_user ON study_pod_recording_likes(user_id);

-- =====================================================
-- Functions
-- =====================================================

-- Update template usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.metadata ? 'template_id' THEN
    UPDATE study_pod_session_templates
    SET usage_count = usage_count + 1
    WHERE id = (NEW.metadata->>'template_id')::UUID;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_template_usage ON study_pod_sessions;
CREATE TRIGGER trigger_increment_template_usage
AFTER INSERT ON study_pod_sessions
FOR EACH ROW EXECUTE FUNCTION increment_template_usage();

-- Update recording view count
CREATE OR REPLACE FUNCTION update_recording_view_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE study_pod_session_recordings
    SET view_count = view_count + 1
    WHERE id = NEW.recording_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_recording_view_count ON study_pod_recording_views;
CREATE TRIGGER trigger_update_recording_view_count
AFTER INSERT ON study_pod_recording_views
FOR EACH ROW EXECUTE FUNCTION update_recording_view_count();

-- Update recording like count
CREATE OR REPLACE FUNCTION update_recording_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE study_pod_session_recordings
    SET like_count = like_count + 1
    WHERE id = NEW.recording_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE study_pod_session_recordings
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.recording_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_recording_like_count ON study_pod_recording_likes;
CREATE TRIGGER trigger_update_recording_like_count
AFTER INSERT OR DELETE ON study_pod_recording_likes
FOR EACH ROW EXECUTE FUNCTION update_recording_like_count();

-- Update search vector for recordings
CREATE OR REPLACE FUNCTION update_recording_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.transcription, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_recording_search_vector ON study_pod_session_recordings;
CREATE TRIGGER trigger_update_recording_search_vector
BEFORE INSERT OR UPDATE OF summary, transcription, tags ON study_pod_session_recordings
FOR EACH ROW EXECUTE FUNCTION update_recording_search_vector();

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE study_pod_session_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_session_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_recording_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_recording_likes ENABLE ROW LEVEL SECURITY;

-- Session Templates Policies
CREATE POLICY "Users can view official templates"
  ON study_pod_session_templates FOR SELECT
  USING (is_official = true);

CREATE POLICY "Pod members can view pod templates"
  ON study_pod_session_templates FOR SELECT
  USING (
    pod_id IS NULL OR
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_session_templates.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "Pod owners and moderators can create templates"
  ON study_pod_session_templates FOR INSERT
  WITH CHECK (
    pod_id IS NULL OR
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_session_templates.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "Template creators can update their templates"
  ON study_pod_session_templates FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_session_templates.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "Template creators can delete their templates"
  ON study_pod_session_templates FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_session_templates.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

-- Session Recordings Policies
CREATE POLICY "Pod members can view pod recordings"
  ON study_pod_session_recordings FOR SELECT
  USING (
    is_public = true OR
    auth.uid() = ANY(allowed_viewers) OR
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_session_recordings.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "Pod members can upload recordings"
  ON study_pod_session_recordings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_session_recordings.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "Uploaders and pod admins can update recordings"
  ON study_pod_session_recordings FOR UPDATE
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_session_recordings.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "Uploaders and pod admins can delete recordings"
  ON study_pod_session_recordings FOR DELETE
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_session_recordings.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

-- Recording Views Policies
CREATE POLICY "Users can view their own recording views"
  ON study_pod_recording_views FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own recording views"
  ON study_pod_recording_views FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own recording views"
  ON study_pod_recording_views FOR UPDATE
  USING (user_id = auth.uid());

-- Recording Likes Policies
CREATE POLICY "Users can view recording likes"
  ON study_pod_recording_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_session_recordings
      WHERE study_pod_session_recordings.id = study_pod_recording_likes.recording_id
        AND (
          study_pod_session_recordings.is_public = true OR
          EXISTS (
            SELECT 1 FROM study_pod_members
            WHERE study_pod_members.pod_id = study_pod_session_recordings.pod_id
              AND study_pod_members.user_id = auth.uid()
              AND study_pod_members.status = 'active'
          )
        )
    )
  );

CREATE POLICY "Users can manage their own recording likes"
  ON study_pod_recording_likes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- Insert Official Templates
-- =====================================================
INSERT INTO study_pod_session_templates (name, description, session_type, default_duration_minutes, role_assignments, preparation_checklist, is_official, default_settings)
VALUES
  (
    'Mock Technical Interview',
    'Practice technical interviews with rotating roles - one person codes while others observe and provide feedback',
    'mock_interview',
    60,
    '[{"role": "interviewer", "rotation": "sequential"}, {"role": "interviewee", "rotation": "sequential"}, {"role": "observer", "rotation": "all"}]'::jsonb,
    '[{"task": "Review common interview patterns", "required": false}, {"task": "Test audio/video setup", "required": true}, {"task": "Prepare 2-3 problems", "required": true}]'::jsonb,
    true,
    '{"allow_hints": true, "time_limit_per_problem": 45, "auto_record": true}'::jsonb
  ),
  (
    'Pair Programming Session',
    'Collaborative problem-solving with shared control and real-time code editing',
    'problem_solving',
    90,
    '[{"role": "driver", "rotation": "interval_15min"}, {"role": "navigator", "rotation": "interval_15min"}]'::jsonb,
    '[{"task": "Choose 1-2 medium problems", "required": true}, {"task": "Review pair programming best practices", "required": false}]'::jsonb,
    true,
    '{"allow_hints": true, "multiple_cursors": true, "auto_record": false}'::jsonb
  ),
  (
    'Solution Review & Discussion',
    'Review and discuss different approaches to solved problems',
    'review',
    45,
    '[]'::jsonb,
    '[{"task": "Complete assigned problems beforehand", "required": true}, {"task": "Prepare to explain your approach", "required": true}]'::jsonb,
    true,
    '{"allow_screen_share": true, "auto_record": false}'::jsonb
  ),
  (
    'Speed Coding Practice',
    'Timed problem-solving to simulate interview pressure',
    'problem_solving',
    30,
    '[]'::jsonb,
    '[{"task": "Review problem-solving strategies", "required": false}, {"task": "Warm up with an easy problem", "required": true}]'::jsonb,
    true,
    '{"time_limit_per_problem": 20, "show_timer": true, "auto_record": false}'::jsonb
  );

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Session management enhancement migration completed successfully';
  RAISE NOTICE 'Tables: study_pod_session_templates, study_pod_session_recordings, study_pod_recording_views, study_pod_recording_likes';
END $$;
