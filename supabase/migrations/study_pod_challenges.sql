-- Create study_pod_challenges table
CREATE TABLE IF NOT EXISTS study_pod_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Challenge details
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly', 'custom', 'head_to_head')),

  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,

  -- Problems
  problem_ids INTEGER[] NOT NULL DEFAULT '{}',
  total_problems INTEGER NOT NULL DEFAULT 0,

  -- Point system configuration
  point_config JSONB DEFAULT '{
    "base_points": {"easy": 10, "medium": 20, "hard": 30},
    "speed_multiplier": 1.5,
    "efficiency_multiplier": 1.2,
    "max_speed_bonus": 50,
    "max_efficiency_bonus": 30
  }'::jsonb,

  -- Challenge status
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),

  -- Participation
  max_participants INTEGER,
  current_participants INTEGER NOT NULL DEFAULT 0,

  -- Competition type
  is_team_challenge BOOLEAN DEFAULT false,
  opponent_pod_id UUID REFERENCES study_pods(id),

  -- Results
  winner_user_id UUID REFERENCES auth.users(id),
  winner_pod_id UUID REFERENCES study_pods(id),

  -- Metadata
  rules JSONB DEFAULT '[]'::jsonb,
  badges JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create study_pod_challenge_participants table
CREATE TABLE IF NOT EXISTS study_pod_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES study_pod_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Participation status
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'in_progress', 'completed', 'forfeit')),

  -- Performance metrics
  total_points INTEGER NOT NULL DEFAULT 0,
  problems_solved INTEGER NOT NULL DEFAULT 0,
  problems_attempted INTEGER NOT NULL DEFAULT 0,
  current_rank INTEGER,

  -- Timing
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_time_seconds INTEGER,

  -- Bonuses
  speed_bonus_earned INTEGER DEFAULT 0,
  efficiency_bonus_earned INTEGER DEFAULT 0,
  streak_bonus INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(challenge_id, user_id)
);

-- Create study_pod_challenge_submissions table
CREATE TABLE IF NOT EXISTS study_pod_challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES study_pod_challenges(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES study_pod_challenge_participants(id) ON DELETE CASCADE,
  problem_id INTEGER NOT NULL REFERENCES problems(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Submission details
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  time_taken_seconds INTEGER NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,

  -- Code details
  code TEXT,
  language TEXT NOT NULL,

  -- Results
  is_correct BOOLEAN NOT NULL DEFAULT false,
  test_cases_passed INTEGER DEFAULT 0,
  total_test_cases INTEGER DEFAULT 0,

  -- Points breakdown
  points_earned INTEGER NOT NULL DEFAULT 0,
  base_points INTEGER NOT NULL DEFAULT 0,
  speed_bonus INTEGER DEFAULT 0,
  efficiency_bonus INTEGER DEFAULT 0,

  -- Code efficiency metrics
  code_length INTEGER,
  time_complexity TEXT,
  space_complexity TEXT,
  efficiency_score DECIMAL(5,2),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(challenge_id, user_id, problem_id)
);

-- Create indexes for performance
CREATE INDEX idx_challenges_pod_id ON study_pod_challenges(pod_id);
CREATE INDEX idx_challenges_status ON study_pod_challenges(status);
CREATE INDEX idx_challenges_start_time ON study_pod_challenges(start_time);
CREATE INDEX idx_challenges_end_time ON study_pod_challenges(end_time);

CREATE INDEX idx_participants_challenge_id ON study_pod_challenge_participants(challenge_id);
CREATE INDEX idx_participants_user_id ON study_pod_challenge_participants(user_id);
CREATE INDEX idx_participants_rank ON study_pod_challenge_participants(challenge_id, current_rank);
CREATE INDEX idx_participants_points ON study_pod_challenge_participants(challenge_id, total_points DESC);

CREATE INDEX idx_challenge_submissions_challenge_id ON study_pod_challenge_submissions(challenge_id);
CREATE INDEX idx_challenge_submissions_participant_id ON study_pod_challenge_submissions(participant_id);
CREATE INDEX idx_challenge_submissions_user_id ON study_pod_challenge_submissions(user_id);
CREATE INDEX idx_challenge_submissions_problem_id ON study_pod_challenge_submissions(problem_id);

-- Create function to update challenge participant count
CREATE OR REPLACE FUNCTION update_challenge_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE study_pod_challenges
    SET current_participants = current_participants + 1
    WHERE id = NEW.challenge_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE study_pod_challenges
    SET current_participants = current_participants - 1
    WHERE id = OLD.challenge_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for participant count
DROP TRIGGER IF EXISTS trigger_update_challenge_participant_count ON study_pod_challenge_participants;
CREATE TRIGGER trigger_update_challenge_participant_count
AFTER INSERT OR DELETE ON study_pod_challenge_participants
FOR EACH ROW EXECUTE FUNCTION update_challenge_participant_count();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_challenges_updated_at ON study_pod_challenges;
CREATE TRIGGER trigger_challenges_updated_at
BEFORE UPDATE ON study_pod_challenges
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_participants_updated_at ON study_pod_challenge_participants;
CREATE TRIGGER trigger_participants_updated_at
BEFORE UPDATE ON study_pod_challenge_participants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE study_pod_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_challenge_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_pod_challenges

-- Users can view challenges for their pods
CREATE POLICY "Users can view challenges for their pods"
ON study_pod_challenges
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM study_pod_members
    WHERE study_pod_members.pod_id = study_pod_challenges.pod_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Pod owners and moderators can create challenges
CREATE POLICY "Pod owners and moderators can create challenges"
ON study_pod_challenges
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM study_pod_members
    WHERE study_pod_members.pod_id = study_pod_challenges.pod_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.role IN ('owner', 'moderator')
    AND study_pod_members.status = 'active'
  )
);

-- Creators, owners, and moderators can update challenges
CREATE POLICY "Creators, owners, and moderators can update challenges"
ON study_pod_challenges
FOR UPDATE
USING (
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM study_pod_members
    WHERE study_pod_members.pod_id = study_pod_challenges.pod_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.role IN ('owner', 'moderator')
    AND study_pod_members.status = 'active'
  )
);

-- RLS Policies for study_pod_challenge_participants

-- Users can view participants for challenges they can see
CREATE POLICY "Users can view participants for accessible challenges"
ON study_pod_challenge_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM study_pod_challenges
    JOIN study_pod_members ON study_pod_challenges.pod_id = study_pod_members.pod_id
    WHERE study_pod_challenges.id = study_pod_challenge_participants.challenge_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Pod members can join challenges
CREATE POLICY "Pod members can join challenges"
ON study_pod_challenge_participants
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM study_pod_challenges
    JOIN study_pod_members ON study_pod_challenges.pod_id = study_pod_members.pod_id
    WHERE study_pod_challenges.id = study_pod_challenge_participants.challenge_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Users can update their own participation
CREATE POLICY "Users can update their own participation"
ON study_pod_challenge_participants
FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for study_pod_challenge_submissions

-- Users can view submissions for challenges they can see
CREATE POLICY "Users can view submissions for accessible challenges"
ON study_pod_challenge_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM study_pod_challenges
    JOIN study_pod_members ON study_pod_challenges.pod_id = study_pod_members.pod_id
    WHERE study_pod_challenges.id = study_pod_challenge_submissions.challenge_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Users can submit their own solutions
CREATE POLICY "Users can submit their own solutions"
ON study_pod_challenge_submissions
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM study_pod_challenge_participants
    WHERE study_pod_challenge_participants.id = study_pod_challenge_submissions.participant_id
    AND study_pod_challenge_participants.user_id = auth.uid()
  )
);
