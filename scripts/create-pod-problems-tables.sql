-- Migration: Create tables for Study Pod Problem Sets
-- Session 3: Shared Problem Sets (Assign & Track)

-- Table: study_pod_problems
-- Stores problems assigned to study pods
CREATE TABLE IF NOT EXISTS study_pod_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id uuid NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,
  problem_id integer NOT NULL REFERENCES problems(id),
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_at timestamp with time zone DEFAULT now(),
  deadline timestamp with time zone,
  notes text,
  priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status text CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(pod_id, problem_id)
);

-- Table: study_pod_problem_completions
-- Tracks which pod members completed which assigned problems
CREATE TABLE IF NOT EXISTS study_pod_problem_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_problem_id uuid NOT NULL REFERENCES study_pod_problems(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  completed_at timestamp with time zone DEFAULT now(),
  time_taken_minutes integer,
  notes text,
  solution_link text,
  UNIQUE(pod_problem_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_study_pod_problems_pod_id ON study_pod_problems(pod_id);
CREATE INDEX IF NOT EXISTS idx_study_pod_problems_status ON study_pod_problems(status);
CREATE INDEX IF NOT EXISTS idx_study_pod_problem_completions_pod_problem_id ON study_pod_problem_completions(pod_problem_id);
CREATE INDEX IF NOT EXISTS idx_study_pod_problem_completions_user_id ON study_pod_problem_completions(user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE study_pod_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_problem_completions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone in a pod can view assigned problems
CREATE POLICY "Pod members can view assigned problems"
  ON study_pod_problems
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_problems.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    )
  );

-- Policy: Only owner/moderator can assign problems
CREATE POLICY "Pod owners and moderators can assign problems"
  ON study_pod_problems
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_problems.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

-- Policy: Only owner/moderator can update assigned problems
CREATE POLICY "Pod owners and moderators can update problems"
  ON study_pod_problems
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_problems.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

-- Policy: Only owner/moderator can delete assigned problems
CREATE POLICY "Pod owners and moderators can delete problems"
  ON study_pod_problems
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_problems.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

-- Policy: Pod members can view completions
CREATE POLICY "Pod members can view problem completions"
  ON study_pod_problem_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_problems
      JOIN study_pod_members ON study_pod_members.pod_id = study_pod_problems.pod_id
      WHERE study_pod_problems.id = study_pod_problem_completions.pod_problem_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    )
  );

-- Policy: Pod members can mark problems as complete
CREATE POLICY "Pod members can mark problems complete"
  ON study_pod_problem_completions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM study_pod_problems
      JOIN study_pod_members ON study_pod_members.pod_id = study_pod_problems.pod_id
      WHERE study_pod_problems.id = study_pod_problem_completions.pod_problem_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    )
  );

-- Policy: Users can update their own completions
CREATE POLICY "Users can update their own completions"
  ON study_pod_problem_completions
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Users can delete their own completions (unmark as complete)
CREATE POLICY "Users can delete their own completions"
  ON study_pod_problem_completions
  FOR DELETE
  USING (user_id = auth.uid());
