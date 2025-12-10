-- Smart Features & Automation for Study Plans
-- Auto-updating progress, recommendations, and collaborative features

BEGIN;

-- ============================================
-- AUTO-UPDATE MILESTONE PROGRESS
-- ============================================

CREATE OR REPLACE FUNCTION update_milestone_progress()
RETURNS TRIGGER AS $$
DECLARE
  milestone_rec RECORD;
  completion_count INT;
BEGIN
  -- Find all milestones that contain this problem
  FOR milestone_rec IN
    SELECT DISTINCT
      spm.id as milestone_id,
      sp.pod_id,
      sp.user_id,
      spm.total_problems,
      spm.required_problems
    FROM study_plan_milestones spm
    JOIN study_plans sp ON sp.template_id = spm.template_id
    WHERE NEW.problem_id = ANY(spm.problem_ids)
      AND sp.status = 'active'
  LOOP
    -- Count how many problems in this milestone are completed by this user/pod
    SELECT COUNT(*)
    INTO completion_count
    FROM study_pod_problem_completions sppc
    JOIN study_pod_problems spp ON spp.id = sppc.pod_problem_id
    WHERE spp.problem_id = ANY(
      SELECT unnest(problem_ids)
      FROM study_plan_milestones
      WHERE id = milestone_rec.milestone_id
    )
    AND (
      (milestone_rec.pod_id IS NOT NULL AND spp.pod_id = milestone_rec.pod_id)
      OR (milestone_rec.user_id IS NOT NULL AND sppc.user_id = milestone_rec.user_id)
    );

    -- Update or insert progress
    INSERT INTO study_plan_milestone_progress (
      milestone_id,
      pod_id,
      user_id,
      progress_percentage,
      problems_completed,
      problems_total,
      status
    ) VALUES (
      milestone_rec.milestone_id,
      milestone_rec.pod_id,
      milestone_rec.user_id,
      CASE
        WHEN milestone_rec.total_problems > 0 THEN
          (completion_count * 100.0 / milestone_rec.total_problems)
        ELSE 0
      END,
      completion_count,
      milestone_rec.total_problems,
      CASE
        WHEN completion_count >= milestone_rec.required_problems THEN 'completed'::text
        WHEN completion_count > 0 THEN 'in_progress'::text
        ELSE 'not_started'::text
      END
    )
    ON CONFLICT (milestone_id, COALESCE(pod_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid))
    DO UPDATE SET
      progress_percentage = EXCLUDED.progress_percentage,
      problems_completed = EXCLUDED.problems_completed,
      status = EXCLUDED.status,
      updated_at = NOW();
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update progress when problem is completed
DROP TRIGGER IF EXISTS auto_update_milestone_progress ON study_pod_problem_completions;
CREATE TRIGGER auto_update_milestone_progress
AFTER INSERT ON study_pod_problem_completions
FOR EACH ROW
EXECUTE FUNCTION update_milestone_progress();


-- ============================================
-- GET NEXT RECOMMENDED PROBLEM
-- ============================================

CREATE OR REPLACE FUNCTION get_next_recommended_problem(
  p_user_id UUID,
  p_pod_id UUID DEFAULT NULL,
  p_template_id UUID DEFAULT NULL
)
RETURNS TABLE (
  problem_id UUID,
  problem_title TEXT,
  difficulty TEXT,
  patterns TEXT[],
  reason TEXT,
  priority INT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_completed AS (
    -- Get all problems user has completed
    SELECT DISTINCT spp.problem_id
    FROM study_pod_problem_completions sppc
    JOIN study_pod_problems spp ON spp.id = sppc.pod_problem_id
    WHERE sppc.user_id = p_user_id
  ),
  active_milestones AS (
    -- Get milestones from user's active plans
    SELECT DISTINCT
      spm.id,
      spm.problem_ids,
      spm.title as milestone_title,
      spm.milestone_order,
      spmp.status as progress_status
    FROM study_plan_milestones spm
    JOIN study_plans sp ON sp.template_id = spm.template_id
    LEFT JOIN study_plan_milestone_progress spmp ON spmp.milestone_id = spm.id
      AND (spmp.user_id = p_user_id OR spmp.pod_id = p_pod_id)
    WHERE sp.status = 'active'
      AND (sp.user_id = p_user_id OR sp.pod_id = p_pod_id)
      AND (p_template_id IS NULL OR sp.template_id = p_template_id)
      AND COALESCE(spmp.status, 'not_started') != 'completed'
    ORDER BY spm.milestone_order
  )
  SELECT
    p.id as problem_id,
    p.title as problem_title,
    p.difficulty,
    p.patterns,
    CASE
      WHEN am.progress_status = 'in_progress' THEN 'Continue current milestone: ' || am.milestone_title
      ELSE 'Start next milestone: ' || am.milestone_title
    END as reason,
    CASE
      WHEN am.progress_status = 'in_progress' THEN 1  -- Highest priority: continue current
      WHEN am.milestone_order = 1 THEN 2              -- Start from beginning
      ELSE 3 + am.milestone_order                      -- Sequential priority
    END as priority
  FROM active_milestones am,
       LATERAL unnest(am.problem_ids) AS problem_id_unnested
  JOIN problems p ON p.id = problem_id_unnested
  WHERE p.id NOT IN (SELECT problem_id FROM user_completed)
  ORDER BY priority, am.milestone_order, p.difficulty
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- GET SIMILAR PROBLEMS
-- ============================================

CREATE OR REPLACE FUNCTION get_similar_problems(
  p_problem_id UUID,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  problem_id UUID,
  problem_title TEXT,
  difficulty TEXT,
  similarity_score NUMERIC,
  shared_patterns TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH source_problem AS (
    SELECT patterns, difficulty, category
    FROM problems
    WHERE id = p_problem_id
  )
  SELECT
    p.id as problem_id,
    p.title as problem_title,
    p.difficulty,
    -- Calculate similarity based on shared patterns and category
    (
      COALESCE(array_length(
        ARRAY(
          SELECT unnest(p.patterns)
          INTERSECT
          SELECT unnest(sp.patterns)
        ), 1
      ), 0) * 30.0 +  -- 30 points per shared pattern
      CASE WHEN p.category = sp.category THEN 20 ELSE 0 END +  -- 20 points for same category
      CASE WHEN p.difficulty = sp.difficulty THEN 15 ELSE 0 END  -- 15 points for same difficulty
    ) as similarity_score,
    ARRAY(
      SELECT unnest(p.patterns)
      INTERSECT
      SELECT unnest(sp.patterns)
    ) as shared_patterns
  FROM problems p, source_problem sp
  WHERE p.id != p_problem_id
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- CALCULATE POD STUDY PLAN HEALTH SCORE
-- ============================================

CREATE OR REPLACE FUNCTION calculate_pod_study_plan_health(p_pod_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  total_milestones INT;
  completed_milestones INT;
  avg_progress NUMERIC;
  consistency_score NUMERIC;
  stuck_count INT;
BEGIN
  -- Get basic stats
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE spmp.status = 'completed'),
    AVG(spmp.progress_percentage)
  INTO total_milestones, completed_milestones, avg_progress
  FROM study_plan_milestone_progress spmp
  WHERE spmp.pod_id = p_pod_id;

  -- Calculate consistency (milestones with progress vs stuck)
  SELECT COUNT(*)
  INTO stuck_count
  FROM study_plan_milestone_progress spmp
  WHERE spmp.pod_id = p_pod_id
    AND spmp.status = 'in_progress'
    AND spmp.updated_at < NOW() - INTERVAL '7 days';

  consistency_score := CASE
    WHEN total_milestones > 0 THEN
      ((total_milestones - stuck_count) * 100.0 / total_milestones)
    ELSE 100
  END;

  result := jsonb_build_object(
    'total_milestones', total_milestones,
    'completed_milestones', completed_milestones,
    'completion_rate', ROUND((completed_milestones * 100.0 / NULLIF(total_milestones, 0))::numeric, 1),
    'average_progress', ROUND(COALESCE(avg_progress, 0)::numeric, 1),
    'consistency_score', ROUND(consistency_score::numeric, 1),
    'stuck_milestones', stuck_count,
    'health_status', CASE
      WHEN avg_progress >= 75 AND consistency_score >= 80 THEN 'excellent'
      WHEN avg_progress >= 50 AND consistency_score >= 60 THEN 'good'
      WHEN avg_progress >= 25 AND consistency_score >= 40 THEN 'fair'
      ELSE 'needs_attention'
    END,
    'recommendations', CASE
      WHEN stuck_count > 0 THEN jsonb_build_array(
        'You have ' || stuck_count || ' milestones with no recent progress. Consider scheduling a focused study session.'
      )
      WHEN completed_milestones = total_milestones THEN jsonb_build_array(
        'Congratulations! All milestones completed. Consider adopting a new study plan.'
      )
      ELSE jsonb_build_array(
        'Keep up the momentum! You''re making good progress.'
      )
    END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- GET POD MEMBERS STRUGGLING WITH PATTERN
-- ============================================

CREATE OR REPLACE FUNCTION get_struggling_members(
  p_pod_id UUID,
  p_pattern TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  pattern TEXT,
  attempts INT,
  completions INT,
  success_rate NUMERIC,
  needs_help BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH member_pattern_stats AS (
    SELECT
      sppc.user_id,
      u.full_name as user_name,
      unnest(p.patterns) as pattern,
      COUNT(*) as attempts,
      COUNT(*) FILTER (WHERE sppc.status = 'completed') as completions
    FROM study_pod_problem_completions sppc
    JOIN study_pod_problems spp ON spp.id = sppc.pod_problem_id
    JOIN problems p ON p.id = spp.problem_id
    JOIN auth.users u ON u.id = sppc.user_id
    WHERE spp.pod_id = p_pod_id
      AND (p_pattern IS NULL OR p.patterns && ARRAY[p_pattern])
    GROUP BY sppc.user_id, u.full_name, unnest(p.patterns)
  )
  SELECT
    mps.user_id,
    mps.user_name,
    mps.pattern,
    mps.attempts::INT,
    mps.completions::INT,
    ROUND((mps.completions * 100.0 / NULLIF(mps.attempts, 0))::numeric, 1) as success_rate,
    (mps.completions * 100.0 / NULLIF(mps.attempts, 0)) < 40 as needs_help
  FROM member_pattern_stats mps
  WHERE mps.attempts >= 3  -- Only consider patterns with sufficient data
  ORDER BY success_rate ASC, mps.attempts DESC;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- SMART STUDY SESSION PROBLEM PICKER
-- ============================================

CREATE OR REPLACE FUNCTION pick_session_problems(
  p_pod_id UUID,
  p_session_duration_minutes INT DEFAULT 90,
  p_difficulty_mix JSONB DEFAULT '{"easy": 0.3, "medium": 0.5, "hard": 0.2}'::jsonb
)
RETURNS TABLE (
  problem_id UUID,
  problem_title TEXT,
  difficulty TEXT,
  estimated_time_minutes INT,
  reason TEXT,
  order_sequence INT
) AS $$
DECLARE
  time_budget INT := p_session_duration_minutes;
  problems_selected INT := 0;
BEGIN
  RETURN QUERY
  WITH pod_completed AS (
    SELECT DISTINCT spp.problem_id
    FROM study_pod_problem_completions sppc
    JOIN study_pod_problems spp ON spp.id = sppc.pod_problem_id
    WHERE spp.pod_id = p_pod_id
  ),
  difficulty_targets AS (
    SELECT
      'easy' as difficulty,
      (p_difficulty_mix->>'easy')::numeric as target_ratio,
      15 as avg_time_mins
    UNION ALL
    SELECT 'medium', (p_difficulty_mix->>'medium')::numeric, 30
    UNION ALL
    SELECT 'hard', (p_difficulty_mix->>'hard')::numeric, 45
  ),
  available_problems AS (
    SELECT
      p.id,
      p.title,
      p.difficulty,
      dt.avg_time_mins as estimated_time,
      CASE
        WHEN p.acceptance_rate > 60 THEN 'High acceptance rate - good warmup'
        WHEN p.likes > 10000 THEN 'Popular problem - must-know pattern'
        WHEN p.companies && ARRAY['Google', 'Amazon', 'Facebook'] THEN 'Frequently asked at top companies'
        ELSE 'Core problem for this pattern'
      END as reason,
      ROW_NUMBER() OVER (
        PARTITION BY p.difficulty
        ORDER BY
          CASE WHEN p.acceptance_rate > 60 THEN 1 ELSE 2 END,  -- Easier first
          p.likes DESC,  -- Popular first
          RANDOM()  -- Add some variety
      ) as difficulty_rank
    FROM problems p
    JOIN difficulty_targets dt ON dt.difficulty = p.difficulty
    WHERE p.id NOT IN (SELECT problem_id FROM pod_completed)
  )
  SELECT
    ap.id as problem_id,
    ap.title as problem_title,
    ap.difficulty,
    ap.estimated_time as estimated_time_minutes,
    ap.reason,
    ROW_NUMBER() OVER (ORDER BY
      CASE ap.difficulty
        WHEN 'easy' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'hard' THEN 3
      END,
      ap.difficulty_rank
    )::INT as order_sequence
  FROM available_problems ap
  WHERE ap.difficulty_rank <= (
    SELECT
      CEIL(
        (p_session_duration_minutes / 60.0) *
        (p_difficulty_mix->>ap.difficulty)::numeric * 3
      )
  )
  ORDER BY order_sequence
  LIMIT 6;  -- Max 6 problems per session
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- GRANT BADGE FOR MILESTONE COMPLETION
-- ============================================

CREATE OR REPLACE FUNCTION grant_milestone_badge()
RETURNS TRIGGER AS $$
BEGIN
  -- Only when milestone is newly completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO study_pod_badges (
      pod_id,
      badge_name,
      badge_tier,
      description,
      icon_emoji,
      earned_at
    )
    SELECT
      NEW.pod_id,
      spm.title || ' Mastered',
      CASE
        WHEN NEW.progress_percentage = 100 THEN 'gold'
        WHEN NEW.problems_completed >= spm.required_problems THEN 'silver'
        ELSE 'bronze'
      END,
      'Completed the ' || spm.title || ' milestone with ' ||
      NEW.problems_completed || ' problems solved!',
      '🏆',
      NOW()
    FROM study_plan_milestones spm
    WHERE spm.id = NEW.milestone_id
      AND NEW.pod_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS grant_badge_on_milestone_complete ON study_plan_milestone_progress;
CREATE TRIGGER grant_badge_on_milestone_complete
AFTER INSERT OR UPDATE ON study_plan_milestone_progress
FOR EACH ROW
EXECUTE FUNCTION grant_milestone_badge();

COMMIT;

-- ============================================
-- EXAMPLE USAGE
-- ============================================

-- Get next recommended problem for a user
-- SELECT * FROM get_next_recommended_problem('user-uuid', 'pod-uuid');

-- Find similar problems to practice a pattern
-- SELECT * FROM get_similar_problems('problem-uuid', 5);

-- Check pod study plan health
-- SELECT calculate_pod_study_plan_health('pod-uuid');

-- Find members struggling with a pattern
-- SELECT * FROM get_struggling_members('pod-uuid', 'dynamic-programming');

-- Pick problems for upcoming study session
-- SELECT * FROM pick_session_problems('pod-uuid', 90, '{"easy": 0.2, "medium": 0.5, "hard": 0.3}');
