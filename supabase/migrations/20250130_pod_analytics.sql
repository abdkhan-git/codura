-- =====================================================
-- Pod Analytics & AI-Powered Insights
-- =====================================================
-- Adds comprehensive analytics tracking and AI-generated insights for study pods

-- =====================================================
-- 1. Study Pod Analytics Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,

  -- Time period for this analytics snapshot
  analytics_date DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly')),

  -- ===== Health Metrics =====
  health_score DECIMAL(5,2), -- Overall pod health (0-100)
  engagement_rate DECIMAL(5,2), -- Percentage of active members
  completion_rate DECIMAL(5,2), -- Percentage of assigned problems completed
  consistency_score DECIMAL(5,2), -- Regularity of activity
  collaboration_score DECIMAL(5,2), -- Level of member interaction

  -- ===== Activity Metrics =====
  active_members_count INTEGER DEFAULT 0,
  total_members_count INTEGER DEFAULT 0,
  sessions_held INTEGER DEFAULT 0,
  total_session_minutes INTEGER DEFAULT 0,
  problems_attempted INTEGER DEFAULT 0,
  problems_completed INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,

  -- ===== Performance Metrics =====
  average_problem_time_minutes DECIMAL(8,2),
  average_attempts_per_problem DECIMAL(5,2),
  success_rate DECIMAL(5,2), -- First-attempt success rate

  -- ===== Skill Analysis (JSONB) =====
  skill_gaps JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"topic": "Dynamic Programming", "weakness_score": 75, "problems_failed": 12, "avg_attempts": 3.5}]

  strengths JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"topic": "Arrays", "strength_score": 90, "problems_solved": 45, "avg_time": "18 mins"}]

  topic_performance JSONB DEFAULT '{}'::jsonb,
  -- Example: {"arrays": {"solved": 30, "attempted": 35, "success_rate": 85.7}, "graphs": {...}}

  difficulty_distribution JSONB DEFAULT '{}'::jsonb,
  -- Example: {"easy": {"solved": 20, "attempted": 22}, "medium": {...}, "hard": {...}}

  -- ===== AI Recommendations (JSONB) =====
  ai_recommendations JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"type": "focus_area", "priority": "high", "recommendation": "Focus on dynamic programming", "reasoning": "..."},
  --   {"type": "problem_suggestion", "problem_ids": [123, 456], "reasoning": "..."}
  -- ]

  next_problem_suggestions JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"problem_id": 123, "reason": "Addresses DP weakness", "difficulty": "medium", "confidence": 0.85}]

  -- ===== Scheduling Insights =====
  optimal_schedule_times JSONB DEFAULT '{}' ::jsonb,
  -- Example: {"best_days": ["Tuesday", "Thursday"], "best_times": ["19:00", "20:00"], "timezone": "UTC"}

  member_activity_patterns JSONB DEFAULT '{}'::jsonb,
  -- Example: {"peak_hours": [18, 19, 20], "peak_days": [2, 4], "consistency_by_member": {...}}

  -- ===== Progress Forecasting =====
  progress_forecast JSONB DEFAULT '{}'::jsonb,
  -- Example: {
  --   "estimated_completion_date": "2024-06-15",
  --   "current_pace": "on_track",
  --   "confidence": 0.78,
  --   "milestones_ahead": ["Arrays Mastery", "Tree Problems"],
  --   "risk_factors": ["Low engagement on weekends"]
  -- }

  interview_readiness JSONB DEFAULT '{}'::jsonb,
  -- Example: {
  --   "overall_score": 72,
  --   "ready_members": ["user-id-1", "user-id-2"],
  --   "needs_practice": ["user-id-3"],
  --   "by_category": {"arrays": 85, "graphs": 60, "dp": 45}
  -- }

  -- ===== Comparative Analytics =====
  percentile_rank INTEGER, -- Rank among all pods (0-100)
  similar_pods_comparison JSONB DEFAULT '{}'::jsonb,
  -- Example: {
  --   "similar_pods_count": 150,
  --   "average_completion_rate": 65.3,
  --   "this_pod_ranking": 45,
  --   "top_performing_pod_metrics": {...}
  -- }

  -- ===== Metadata =====
  metadata JSONB DEFAULT '{}'::jsonb,
  generation_details JSONB DEFAULT '{}'::jsonb, -- AI model info, processing time, etc.

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pod_id, analytics_date, period_type)
);

CREATE INDEX idx_pod_analytics_pod ON study_pod_analytics(pod_id);
CREATE INDEX idx_pod_analytics_date ON study_pod_analytics(analytics_date DESC);
CREATE INDEX idx_pod_analytics_period ON study_pod_analytics(period_type);
CREATE INDEX idx_pod_analytics_health_score ON study_pod_analytics(health_score DESC);
CREATE INDEX idx_pod_analytics_percentile ON study_pod_analytics(percentile_rank DESC);

-- =====================================================
-- 2. Study Pod Member Insights Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_member_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time period
  insight_date DATE NOT NULL,

  -- ===== Performance Metrics =====
  performance_trend TEXT CHECK (performance_trend IN ('improving', 'declining', 'stable', 'insufficient_data')),
  trend_score DECIMAL(5,2), -- -100 to +100, negative = declining

  problems_solved_count INTEGER DEFAULT 0,
  problems_attempted_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  average_attempts DECIMAL(5,2),

  -- ===== Activity Metrics =====
  sessions_attended INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  solutions_shared INTEGER DEFAULT 0,
  helpful_comments INTEGER DEFAULT 0, -- Based on upvotes

  -- ===== Time Analysis =====
  total_time_spent_minutes INTEGER DEFAULT 0,
  average_session_duration_minutes DECIMAL(8,2),
  most_active_hours INTEGER[] DEFAULT '{}',
  most_active_days INTEGER[] DEFAULT '{}', -- 0-6

  -- ===== Skill Assessment =====
  needs_help_topics JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"topic": "Dynamic Programming", "struggle_indicators": ["high attempts", "long solve time"], "suggested_problems": [123, 456]}]

  strong_topics JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"topic": "Arrays", "mastery_score": 90, "problems_solved": 45}]

  learning_velocity JSONB DEFAULT '{}'::jsonb,
  -- Example: {"current_pace": "moderate", "problems_per_week": 8, "trend": "increasing"}

  -- ===== Collaboration Metrics =====
  collaboration_score DECIMAL(5,2), -- How much they help others
  mentorship_potential BOOLEAN DEFAULT false,
  peer_rating DECIMAL(3,2), -- Average rating from peers (1-5)

  -- ===== Activity Pattern =====
  activity_pattern JSONB DEFAULT '{}'::jsonb,
  -- Example: {
  --   "consistency": "high",
  --   "preferred_times": ["18:00-20:00"],
  --   "streak_current": 5,
  --   "streak_longest": 15
  -- }

  -- ===== Interview Readiness =====
  interview_readiness_score DECIMAL(5,2), -- 0-100
  estimated_weeks_until_ready INTEGER,
  ready_for_companies JSONB DEFAULT '[]'::jsonb, -- Based on problem patterns
  -- Example: [{"company": "Google", "readiness": 75, "focus_areas": ["System Design"]}, ...]

  -- ===== AI Suggestions =====
  ai_suggestions JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"type": "practice_more", "topic": "Trees", "priority": "high"},
  --   {"type": "review", "problem_ids": [123], "reason": "You struggled with this"},
  --   {"type": "learning_resource", "title": "...", "url": "...", "reason": "..."}
  -- ]

  personalized_study_plan JSONB DEFAULT '{}'::jsonb,
  -- Example: {
  --   "focus_this_week": ["Trees", "Graph Traversal"],
  --   "recommended_problems": [123, 456, 789],
  --   "estimated_hours": 8,
  --   "milestones": ["Complete 5 tree problems", "Review BFS/DFS"]
  -- }

  -- ===== Alerts & Warnings =====
  alerts JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"type": "inactivity", "severity": "medium", "message": "No activity in 7 days"},
  --   {"type": "struggling", "severity": "high", "message": "Low success rate in graphs"}
  -- ]

  -- ===== Metadata =====
  metadata JSONB DEFAULT '{}'::jsonb,

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pod_id, user_id, insight_date)
);

CREATE INDEX idx_member_insights_pod ON study_pod_member_insights(pod_id);
CREATE INDEX idx_member_insights_user ON study_pod_member_insights(user_id);
CREATE INDEX idx_member_insights_date ON study_pod_member_insights(insight_date DESC);
CREATE INDEX idx_member_insights_readiness ON study_pod_member_insights(interview_readiness_score DESC);
CREATE INDEX idx_member_insights_trend ON study_pod_member_insights(performance_trend);

-- =====================================================
-- 3. Analytics Processing Queue Table
-- =====================================================
-- Track which pods need analytics regeneration
CREATE TABLE IF NOT EXISTS study_pod_analytics_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,

  analytics_type TEXT NOT NULL CHECK (analytics_type IN ('pod_analytics', 'member_insights', 'both')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- Trigger information
  trigger_event TEXT, -- What caused this regeneration
  trigger_metadata JSONB DEFAULT '{}'::jsonb,

  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create partial unique index to prevent duplicate pending/processing entries
CREATE UNIQUE INDEX idx_analytics_queue_unique_active
ON study_pod_analytics_queue(pod_id, analytics_type, status)
WHERE status IN ('pending', 'processing');

CREATE INDEX idx_analytics_queue_status ON study_pod_analytics_queue(status);
CREATE INDEX idx_analytics_queue_priority ON study_pod_analytics_queue(priority, scheduled_at);
CREATE INDEX idx_analytics_queue_pod ON study_pod_analytics_queue(pod_id);

-- =====================================================
-- 4. Global Analytics Leaderboard Cache
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_global_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,

  -- Ranking categories
  category TEXT NOT NULL CHECK (category IN (
    'overall_health', 'completion_rate', 'consistency',
    'collaboration', 'activity', 'growth'
  )),

  -- Ranking data
  rank INTEGER NOT NULL,
  score DECIMAL(10,2) NOT NULL,
  percentile DECIMAL(5,2),

  -- Change tracking
  previous_rank INTEGER,
  rank_change INTEGER, -- Positive = moved up

  -- Time period
  period TEXT NOT NULL DEFAULT 'current' CHECK (period IN ('current', 'weekly', 'monthly', 'all_time')),

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day'),

  metadata JSONB DEFAULT '{}'::jsonb,

  UNIQUE(pod_id, category, period)
);

CREATE INDEX idx_global_leaderboard_category ON study_pod_global_leaderboard(category, rank);
CREATE INDEX idx_global_leaderboard_pod ON study_pod_global_leaderboard(pod_id);
CREATE INDEX idx_global_leaderboard_expires ON study_pod_global_leaderboard(expires_at);

-- =====================================================
-- Functions
-- =====================================================

-- Queue analytics regeneration when significant events occur
CREATE OR REPLACE FUNCTION queue_analytics_regeneration()
RETURNS TRIGGER AS $$
DECLARE
  v_pod_id UUID;
BEGIN
  -- Determine pod_id based on the table
  IF TG_TABLE_NAME = 'study_pod_problem_completions' THEN
    SELECT spp.pod_id INTO v_pod_id
    FROM study_pod_problems spp
    WHERE spp.id = NEW.pod_problem_id;
  ELSIF TG_TABLE_NAME = 'study_pod_challenge_submissions' THEN
    SELECT spc.pod_id INTO v_pod_id
    FROM study_pod_challenges spc
    WHERE spc.id = NEW.challenge_id;
  ELSIF TG_TABLE_NAME = 'study_pod_session_attendance' THEN
    SELECT sps.pod_id INTO v_pod_id
    FROM study_pod_sessions sps
    WHERE sps.id = NEW.session_id;
  ELSIF TG_TABLE_NAME = 'study_pod_members' THEN
    v_pod_id := NEW.pod_id;
  END IF;

  -- Queue regeneration
  IF v_pod_id IS NOT NULL THEN
    INSERT INTO study_pod_analytics_queue (pod_id, analytics_type, trigger_event)
    VALUES (v_pod_id, 'both', TG_TABLE_NAME || '_change')
    ON CONFLICT (pod_id, analytics_type, status)
    WHERE status IN ('pending', 'processing')
    DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to relevant tables
DROP TRIGGER IF EXISTS trigger_queue_analytics_on_completion ON study_pod_problem_completions;
CREATE TRIGGER trigger_queue_analytics_on_completion
AFTER INSERT ON study_pod_problem_completions
FOR EACH ROW EXECUTE FUNCTION queue_analytics_regeneration();

DROP TRIGGER IF EXISTS trigger_queue_analytics_on_submission ON study_pod_challenge_submissions;
CREATE TRIGGER trigger_queue_analytics_on_submission
AFTER INSERT ON study_pod_challenge_submissions
FOR EACH ROW EXECUTE FUNCTION queue_analytics_regeneration();

DROP TRIGGER IF EXISTS trigger_queue_analytics_on_attendance ON study_pod_session_attendance;
CREATE TRIGGER trigger_queue_analytics_on_attendance
AFTER INSERT ON study_pod_session_attendance
FOR EACH ROW EXECUTE FUNCTION queue_analytics_regeneration();

-- Function to calculate pod health score
CREATE OR REPLACE FUNCTION calculate_pod_health_score(
  p_engagement_rate DECIMAL,
  p_completion_rate DECIMAL,
  p_consistency_score DECIMAL,
  p_collaboration_score DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  -- Weighted average of key metrics
  RETURN ROUND(
    (p_engagement_rate * 0.3) +
    (p_completion_rate * 0.3) +
    (p_consistency_score * 0.25) +
    (p_collaboration_score * 0.15),
    2
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get top performing pods for comparison
CREATE OR REPLACE FUNCTION get_top_performing_pods(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  pod_id UUID,
  pod_name TEXT,
  health_score DECIMAL,
  completion_rate DECIMAL,
  member_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    spa.pod_id,
    sp.name,
    spa.health_score,
    spa.completion_rate,
    sp.member_count
  FROM study_pod_analytics spa
  JOIN study_pods sp ON sp.id = spa.pod_id
  WHERE spa.period_type = 'weekly'
    AND spa.analytics_date = CURRENT_DATE - INTERVAL '7 days'
  ORDER BY spa.health_score DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE study_pod_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_member_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_analytics_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_global_leaderboard ENABLE ROW LEVEL SECURITY;

-- Pod Analytics Policies
CREATE POLICY "Pod members can view pod analytics"
  ON study_pod_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_analytics.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "System can manage analytics"
  ON study_pod_analytics FOR ALL
  USING (true)
  WITH CHECK (true);

-- Member Insights Policies
CREATE POLICY "Users can view their own insights"
  ON study_pod_member_insights FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_member_insights.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "System can manage member insights"
  ON study_pod_member_insights FOR ALL
  USING (true)
  WITH CHECK (true);

-- Analytics Queue Policies (system-only table)
CREATE POLICY "System can manage queue"
  ON study_pod_analytics_queue FOR ALL
  USING (true)
  WITH CHECK (true);

-- Global Leaderboard Policies
CREATE POLICY "Anyone can view global leaderboard"
  ON study_pod_global_leaderboard FOR SELECT
  USING (true);

CREATE POLICY "System can manage leaderboard"
  ON study_pod_global_leaderboard FOR INSERT
  WITH CHECK (true);

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Pod analytics migration completed successfully';
  RAISE NOTICE 'Tables: study_pod_analytics, study_pod_member_insights, study_pod_analytics_queue, study_pod_global_leaderboard';
END $$;
