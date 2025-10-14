-- =====================================================
-- APPLY ALL PERFORMANCE FIXES AT ONCE
-- =====================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- =====================================================

-- Step 1: Add database indexes (INSTANT performance boost)
CREATE INDEX IF NOT EXISTS idx_user_list_problems_list_id
ON user_list_problems(list_id);

CREATE INDEX IF NOT EXISTS idx_user_problem_progress_user_status
ON user_problem_progress(user_id, status, problem_id);

CREATE INDEX IF NOT EXISTS idx_submissions_user_date
ON submissions(user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date
ON calendar_events(user_id, event_date);

CREATE INDEX IF NOT EXISTS idx_problems_difficulty
ON problems(difficulty) WHERE is_premium = false;

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id
ON user_achievements(user_id, earned_at DESC);

-- Step 2: Create study plans function (fixes N+1 queries)
CREATE OR REPLACE FUNCTION get_user_study_plans_with_counts(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  description TEXT,
  color TEXT,
  is_default BOOLEAN,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  problem_count BIGINT,
  solved_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    upl.id,
    upl.user_id,
    upl.name,
    upl.description,
    upl.color,
    upl.is_default,
    upl.is_public,
    upl.created_at,
    upl.updated_at,
    COUNT(DISTINCT ulp.problem_id) as problem_count,
    COUNT(DISTINCT CASE WHEN upp.status = 'Solved' THEN upp.problem_id END) as solved_count
  FROM user_problem_lists upl
  LEFT JOIN user_list_problems ulp ON ulp.list_id = upl.id
  LEFT JOIN user_problem_progress upp ON upp.problem_id = ulp.problem_id
    AND upp.user_id = p_user_id
  WHERE upl.user_id = p_user_id
  GROUP BY
    upl.id, upl.user_id, upl.name, upl.description, upl.color,
    upl.is_default, upl.is_public, upl.created_at, upl.updated_at
  ORDER BY upl.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_user_study_plans_with_counts(UUID) TO authenticated;

-- Step 3: Create streak calculation function
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID)
RETURNS TABLE (current_streak INTEGER, longest_streak INTEGER) AS $$
DECLARE
  submission_dates DATE[];
  curr_streak INT := 0;
  max_streak INT := 0;
  temp_streak INT := 1;
  today DATE := CURRENT_DATE;
  yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  i INT;
  prev_date DATE;
BEGIN
  SELECT ARRAY_AGG(submit_date ORDER BY submit_date DESC)
  INTO submission_dates
  FROM (
    SELECT DISTINCT DATE(submitted_at) as submit_date
    FROM submissions
    WHERE user_id = p_user_id
    ORDER BY submit_date DESC
  ) dates;

  IF submission_dates IS NULL OR array_length(submission_dates, 1) = 0 THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  IF submission_dates[1] = today OR submission_dates[1] = yesterday THEN
    curr_streak := 1;
    prev_date := submission_dates[1];

    FOR i IN 2..array_length(submission_dates, 1) LOOP
      IF submission_dates[i] = prev_date - INTERVAL '1 day' THEN
        curr_streak := curr_streak + 1;
        prev_date := submission_dates[i];
      ELSE
        EXIT;
      END IF;
    END LOOP;
  END IF;

  temp_streak := 1;
  FOR i IN 2..array_length(submission_dates, 1) LOOP
    IF submission_dates[i] = submission_dates[i-1] - INTERVAL '1 day' THEN
      temp_streak := temp_streak + 1;
      max_streak := GREATEST(max_streak, temp_streak);
    ELSE
      temp_streak := 1;
    END IF;
  END LOOP;
  max_streak := GREATEST(max_streak, temp_streak, curr_streak);

  RETURN QUERY SELECT curr_streak, max_streak;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION calculate_user_streak(UUID) TO authenticated;

-- Step 4: Analyze tables for optimizer
ANALYZE user_list_problems;
ANALYZE user_problem_progress;
ANALYZE submissions;
ANALYZE calendar_events;
ANALYZE problems;
ANALYZE user_achievements;

-- Done! Your database is now optimized.