-- =====================================================
-- Study Plans & Structured Learning Paths
-- =====================================================
-- Adds comprehensive study plan system with templates, milestones, and progress tracking

-- =====================================================
-- 1. Study Plan Templates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template info
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  detailed_overview TEXT,

  -- Categorization
  category TEXT NOT NULL CHECK (category IN ('interview_prep', 'data_structures', 'algorithms', 'system_design', 'language_specific', 'company_specific', 'custom')),
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  tags TEXT[] DEFAULT '{}',

  -- Scope
  estimated_weeks INTEGER,
  estimated_hours INTEGER,
  total_problems INTEGER DEFAULT 0,
  total_milestones INTEGER DEFAULT 0,

  -- Problem distribution
  easy_problems INTEGER DEFAULT 0,
  medium_problems INTEGER DEFAULT 0,
  hard_problems INTEGER DEFAULT 0,

  -- Visibility
  is_official BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Authorship
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Versioning
  version TEXT DEFAULT '1.0',
  parent_template_id UUID REFERENCES study_plan_templates(id),

  -- Stats
  usage_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,

  -- Icon/visual
  icon TEXT,
  color TEXT,
  banner_image_url TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_study_plan_templates_category ON study_plan_templates(category);
CREATE INDEX idx_study_plan_templates_difficulty ON study_plan_templates(difficulty_level);
CREATE INDEX idx_study_plan_templates_official ON study_plan_templates(is_official) WHERE is_official = true;
CREATE INDEX idx_study_plan_templates_featured ON study_plan_templates(is_featured) WHERE is_featured = true;
CREATE INDEX idx_study_plan_templates_published ON study_plan_templates(is_published) WHERE is_published = true;

-- =====================================================
-- 2. Study Plans Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template reference
  template_id UUID REFERENCES study_plan_templates(id) ON DELETE SET NULL,

  -- Pod or individual
  pod_id UUID REFERENCES study_pods(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- For individual plans

  -- Plan details
  name TEXT NOT NULL,
  description TEXT,
  custom_goals TEXT,

  -- Scheduling
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'abandoned')),

  -- Progress metrics
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  milestones_completed INTEGER DEFAULT 0,
  milestones_total INTEGER DEFAULT 0,
  problems_completed INTEGER DEFAULT 0,
  problems_total INTEGER DEFAULT 0,

  -- Adaptation settings
  adaptive_difficulty BOOLEAN DEFAULT false, -- Adjusts based on performance
  auto_unlock_milestones BOOLEAN DEFAULT true,

  -- Visibility
  is_public BOOLEAN DEFAULT false,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Either pod_id OR user_id must be set, not both
  CONSTRAINT check_plan_owner CHECK (
    (pod_id IS NOT NULL AND user_id IS NULL) OR
    (pod_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE INDEX idx_study_plans_template ON study_plans(template_id);
CREATE INDEX idx_study_plans_pod ON study_plans(pod_id);
CREATE INDEX idx_study_plans_user ON study_plans(user_id);
CREATE INDEX idx_study_plans_status ON study_plans(status);
CREATE INDEX idx_study_plans_progress ON study_plans(progress_percentage);

-- =====================================================
-- 3. Study Plan Milestones Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_plan_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Plan reference
  plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  template_milestone_id UUID, -- Reference to template milestone if applicable

  -- Milestone details
  title TEXT NOT NULL,
  description TEXT,
  learning_objectives TEXT[],

  -- Ordering
  milestone_order INTEGER NOT NULL,

  -- Problem requirements
  problem_ids INTEGER[] DEFAULT '{}',
  required_problems INTEGER, -- Minimum to complete milestone
  total_problems INTEGER DEFAULT 0,

  -- Prerequisites
  prerequisite_milestone_ids UUID[] DEFAULT '{}',

  -- Locking mechanism
  is_locked BOOLEAN DEFAULT false,
  unlock_criteria JSONB, -- Custom unlock rules
  unlocked_at TIMESTAMPTZ,

  -- Resources
  recommended_resources JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"type": "article", "title": "...", "url": "..."}, {"type": "video", "title": "...", "url": "..."}]

  -- Rewards
  rewards JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"type": "badge", "badge_id": "..."}, {"type": "points", "amount": 100}]

  -- Completion tracking
  completion_criteria JSONB DEFAULT '{}'::jsonb,
  -- Example: {"min_problems": 5, "min_percentage": 80, "time_limit_days": 7}

  completed_at TIMESTAMPTZ,
  completed_count INTEGER DEFAULT 0, -- Number of pod members who completed it

  -- Estimated time
  estimated_hours INTEGER,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_plan ON study_plan_milestones(plan_id);
CREATE INDEX idx_milestones_order ON study_plan_milestones(plan_id, milestone_order);
CREATE INDEX idx_milestones_locked ON study_plan_milestones(is_locked) WHERE is_locked = true;

-- =====================================================
-- 4. Study Plan Milestone Progress Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_plan_milestone_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  milestone_id UUID NOT NULL REFERENCES study_plan_milestones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pod_id UUID REFERENCES study_pods(id) ON DELETE CASCADE,

  -- Progress metrics
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  problems_completed INTEGER DEFAULT 0,
  problems_total INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),

  -- Timing
  started_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_minutes INTEGER DEFAULT 0,

  -- Performance
  average_attempts DECIMAL(5,2),
  average_time_per_problem_minutes DECIMAL(8,2),

  -- Notes
  personal_notes TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(milestone_id, user_id)
);

CREATE INDEX idx_milestone_progress_milestone ON study_plan_milestone_progress(milestone_id);
CREATE INDEX idx_milestone_progress_user ON study_plan_milestone_progress(user_id);
CREATE INDEX idx_milestone_progress_pod ON study_plan_milestone_progress(pod_id);
CREATE INDEX idx_milestone_progress_status ON study_plan_milestone_progress(status);

-- =====================================================
-- 5. Template Ratings Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_plan_template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  template_id UUID NOT NULL REFERENCES study_plan_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,

  -- Was the plan completed?
  completed_plan BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id, user_id)
);

CREATE INDEX idx_template_ratings_template ON study_plan_template_ratings(template_id);
CREATE INDEX idx_template_ratings_user ON study_plan_template_ratings(user_id);
CREATE INDEX idx_template_ratings_rating ON study_plan_template_ratings(rating);

-- =====================================================
-- Functions
-- =====================================================

-- Update template usage count
CREATE OR REPLACE FUNCTION increment_template_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE study_plan_templates
    SET usage_count = usage_count + 1
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_template_usage ON study_plans;
CREATE TRIGGER trigger_increment_template_usage
AFTER INSERT ON study_plans
FOR EACH ROW EXECUTE FUNCTION increment_template_usage_count();

-- Update plan progress when milestone progress changes
CREATE OR REPLACE FUNCTION update_plan_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
  v_total_milestones INTEGER;
  v_completed_milestones INTEGER;
  v_total_problems INTEGER;
  v_completed_problems INTEGER;
BEGIN
  -- Get plan_id from milestone
  SELECT plan_id INTO v_plan_id
  FROM study_plan_milestones
  WHERE id = NEW.milestone_id;

  -- Calculate milestone completion
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_milestones, v_completed_milestones
  FROM study_plan_milestones
  WHERE plan_id = v_plan_id;

  -- Calculate problem completion across all milestones
  SELECT
    COALESCE(SUM(problems_total), 0),
    COALESCE(SUM(problems_completed), 0)
  INTO v_total_problems, v_completed_problems
  FROM study_plan_milestone_progress smp
  JOIN study_plan_milestones sm ON sm.id = smp.milestone_id
  WHERE sm.plan_id = v_plan_id
    AND smp.user_id = NEW.user_id;

  -- Update plan progress
  UPDATE study_plans
  SET
    milestones_completed = v_completed_milestones,
    milestones_total = v_total_milestones,
    problems_completed = v_completed_problems,
    problems_total = v_total_problems,
    progress_percentage = CASE
      WHEN v_total_milestones > 0 THEN
        ROUND((v_completed_milestones::DECIMAL / v_total_milestones * 100), 2)
      ELSE 0
    END,
    status = CASE
      WHEN v_completed_milestones = v_total_milestones AND v_total_milestones > 0 THEN 'completed'
      WHEN v_completed_milestones > 0 THEN 'active'
      ELSE status
    END,
    actual_end_date = CASE
      WHEN v_completed_milestones = v_total_milestones AND v_total_milestones > 0 THEN CURRENT_DATE
      ELSE actual_end_date
    END,
    updated_at = NOW()
  WHERE id = v_plan_id;

  -- Unlock next milestone if auto_unlock is enabled
  IF NEW.status = 'completed' THEN
    PERFORM unlock_next_milestone(v_plan_id, NEW.milestone_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_plan_progress ON study_plan_milestone_progress;
CREATE TRIGGER trigger_update_plan_progress
AFTER INSERT OR UPDATE OF status, problems_completed ON study_plan_milestone_progress
FOR EACH ROW EXECUTE FUNCTION update_plan_progress();

-- Unlock next milestone
CREATE OR REPLACE FUNCTION unlock_next_milestone(p_plan_id UUID, p_completed_milestone_id UUID)
RETURNS void AS $$
DECLARE
  v_auto_unlock BOOLEAN;
  v_next_milestone_id UUID;
  v_current_order INTEGER;
BEGIN
  -- Check if auto-unlock is enabled
  SELECT auto_unlock_milestones INTO v_auto_unlock
  FROM study_plans
  WHERE id = p_plan_id;

  IF NOT v_auto_unlock THEN
    RETURN;
  END IF;

  -- Get current milestone order
  SELECT milestone_order INTO v_current_order
  FROM study_plan_milestones
  WHERE id = p_completed_milestone_id;

  -- Find next locked milestone
  SELECT id INTO v_next_milestone_id
  FROM study_plan_milestones
  WHERE plan_id = p_plan_id
    AND milestone_order = v_current_order + 1
    AND is_locked = true
  LIMIT 1;

  -- Unlock it
  IF v_next_milestone_id IS NOT NULL THEN
    UPDATE study_plan_milestones
    SET
      is_locked = false,
      unlocked_at = NOW()
    WHERE id = v_next_milestone_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update template rating statistics
CREATE OR REPLACE FUNCTION update_template_ratings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE study_plan_templates
  SET
    average_rating = (
      SELECT AVG(rating)
      FROM study_plan_template_ratings
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM study_plan_template_ratings
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
    )
  WHERE id = COALESCE(NEW.template_id, OLD.template_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_template_ratings ON study_plan_template_ratings;
CREATE TRIGGER trigger_update_template_ratings
AFTER INSERT OR UPDATE OR DELETE ON study_plan_template_ratings
FOR EACH ROW EXECUTE FUNCTION update_template_ratings();

-- Update milestone completion count
CREATE OR REPLACE FUNCTION update_milestone_completion_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    UPDATE study_plan_milestones
    SET completed_count = completed_count + 1
    WHERE id = NEW.milestone_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status != 'completed' THEN
    UPDATE study_plan_milestones
    SET completed_count = GREATEST(completed_count - 1, 0)
    WHERE id = NEW.milestone_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_milestone_completion_count ON study_plan_milestone_progress;
CREATE TRIGGER trigger_update_milestone_completion_count
AFTER UPDATE OF status ON study_plan_milestone_progress
FOR EACH ROW EXECUTE FUNCTION update_milestone_completion_count();

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE study_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_milestone_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_template_ratings ENABLE ROW LEVEL SECURITY;

-- Template Policies
CREATE POLICY "Anyone can view published templates"
  ON study_plan_templates FOR SELECT
  USING (is_published = true);

CREATE POLICY "Users can create templates"
  ON study_plan_templates FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creators can update their templates"
  ON study_plan_templates FOR UPDATE
  USING (created_by = auth.uid());

-- Study Plans Policies
CREATE POLICY "Users can view their own plans"
  ON study_plans FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_plans.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    ) OR
    is_public = true
  );

CREATE POLICY "Users can create their own plans or pod plans"
  ON study_plans FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_plans.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "Users can update their own plans or pod plans"
  ON study_plans FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_plans.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

-- Milestone Policies
CREATE POLICY "Users can view milestones for their plans"
  ON study_plan_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_plans sp
      WHERE sp.id = study_plan_milestones.plan_id
        AND (
          sp.user_id = auth.uid() OR
          sp.is_public = true OR
          EXISTS (
            SELECT 1 FROM study_pod_members
            WHERE study_pod_members.pod_id = sp.pod_id
              AND study_pod_members.user_id = auth.uid()
              AND study_pod_members.status = 'active'
          )
        )
    )
  );

CREATE POLICY "Users can manage milestones for their plans"
  ON study_plan_milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM study_plans sp
      WHERE sp.id = study_plan_milestones.plan_id
        AND (
          sp.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM study_pod_members
            WHERE study_pod_members.pod_id = sp.pod_id
              AND study_pod_members.user_id = auth.uid()
              AND study_pod_members.role IN ('owner', 'moderator')
              AND study_pod_members.status = 'active'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_plans sp
      WHERE sp.id = study_plan_milestones.plan_id
        AND (
          sp.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM study_pod_members
            WHERE study_pod_members.pod_id = sp.pod_id
              AND study_pod_members.user_id = auth.uid()
              AND study_pod_members.role IN ('owner', 'moderator')
              AND study_pod_members.status = 'active'
          )
        )
    )
  );

-- Milestone Progress Policies
CREATE POLICY "Users can view their own progress"
  ON study_plan_milestone_progress FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_plan_milestone_progress.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "Users can manage their own progress"
  ON study_plan_milestone_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Template Ratings Policies
CREATE POLICY "Anyone can view ratings"
  ON study_plan_template_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own ratings"
  ON study_plan_template_ratings FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- Insert Official Templates
-- =====================================================
INSERT INTO study_plan_templates (
  name, display_name, description, category, difficulty_level,
  estimated_weeks, estimated_hours, total_problems,
  easy_problems, medium_problems, hard_problems,
  is_official, is_published, is_featured,
  icon, color
) VALUES
  (
    'faang_prep_75',
    'FAANG Interview Prep - 75 Essential Problems',
    'Master the most commonly asked interview questions at top tech companies. This curated list covers all essential patterns and data structures.',
    'interview_prep',
    'intermediate',
    8, 150, 75,
    25, 40, 10,
    true, true, true,
    '🎯', 'blue'
  ),
  (
    'blind_75',
    'Blind 75 - LeetCode Must-Do List',
    'The famous Blind 75 list covering the most important LeetCode problems for interview preparation.',
    'interview_prep',
    'intermediate',
    6, 120, 75,
    20, 40, 15,
    true, true, true,
    '👁️', 'purple'
  ),
  (
    'neetcode_150',
    'NeetCode 150 - Complete Interview Roadmap',
    'Comprehensive problem set covering all major patterns and concepts needed for technical interviews.',
    'interview_prep',
    'intermediate',
    12, 240, 150,
    50, 75, 25,
    true, true, true,
    '🚀', 'green'
  ),
  (
    'dsa_fundamentals',
    'Data Structures & Algorithms Fundamentals',
    'Build a strong foundation in DSA from scratch. Perfect for beginners starting their interview prep journey.',
    'data_structures',
    'beginner',
    10, 180, 100,
    60, 35, 5,
    true, true, false,
    '📚', 'orange'
  ),
  (
    'system_design_primer',
    'System Design Interview Preparation',
    'Learn system design fundamentals and practice with real-world scenarios commonly asked in senior engineer interviews.',
    'system_design',
    'advanced',
    6, 100, 30,
    0, 20, 10,
    true, true, false,
    '🏗️', 'red'
  );

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Study plans migration completed successfully';
  RAISE NOTICE 'Tables: study_plan_templates, study_plans, study_plan_milestones, study_plan_milestone_progress, study_plan_template_ratings';
END $$;
