-- Dashboard RPC Functions
-- These functions are required by the /api/dashboard endpoint

-- Function 1: Get daily challenge (random unsolved problem)
CREATE OR REPLACE FUNCTION get_daily_challenge(p_user_id UUID)
RETURNS TABLE (
  id INTEGER,
  title TEXT,
  difficulty TEXT,
  category TEXT,
  acceptance_rate NUMERIC,
  description TEXT,
  constraints TEXT,
  examples JSONB,
  hints JSONB,
  solution TEXT,
  starter_code JSONB,
  test_cases JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.difficulty,
    p.category,
    p.acceptance_rate,
    p.description,
    p.constraints,
    p.examples,
    p.hints,
    p.solution,
    p.starter_code,
    p.test_cases,
    p.created_at,
    p.updated_at
  FROM problems p
  WHERE p.id NOT IN (
    -- Exclude problems the user has already solved
    SELECT problem_id
    FROM submissions
    WHERE user_id = p_user_id
      AND status = 'Accepted'
  )
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Calculate user streak
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER
) AS $$
DECLARE
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_temp_streak INTEGER := 0;
  v_last_date DATE := NULL;
  v_current_date DATE;
  submission_date DATE;
BEGIN
  -- Get all unique submission dates for the user (ordered by date desc)
  FOR submission_date IN
    SELECT DISTINCT DATE(submitted_at) AS submission_date
    FROM submissions
    WHERE user_id = p_user_id
      AND status = 'Accepted'
    ORDER BY submission_date DESC
  LOOP
    IF v_last_date IS NULL THEN
      -- First iteration
      v_last_date := submission_date;
      v_temp_streak := 1;
    ELSIF v_last_date - submission_date = 1 THEN
      -- Consecutive day
      v_temp_streak := v_temp_streak + 1;
      v_last_date := submission_date;
    ELSE
      -- Streak broken
      -- Check if this is the current streak (must include today or yesterday)
      v_current_date := CURRENT_DATE;
      IF v_current_streak = 0 AND
         (v_last_date = v_current_date OR v_last_date = v_current_date - 1) THEN
        v_current_streak := v_temp_streak;
      END IF;

      -- Update longest streak
      IF v_temp_streak > v_longest_streak THEN
        v_longest_streak := v_temp_streak;
      END IF;

      -- Reset temp streak
      v_temp_streak := 1;
      v_last_date := submission_date;
    END IF;
  END LOOP;

  -- Handle final streak
  IF v_last_date IS NOT NULL THEN
    v_current_date := CURRENT_DATE;
    IF v_current_streak = 0 AND
       (v_last_date = v_current_date OR v_last_date = v_current_date - 1) THEN
      v_current_streak := v_temp_streak;
    END IF;

    IF v_temp_streak > v_longest_streak THEN
      v_longest_streak := v_temp_streak;
    END IF;
  END IF;

  RETURN QUERY SELECT v_current_streak, v_longest_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Get user study plans with counts
CREATE OR REPLACE FUNCTION get_user_study_plans_with_counts(p_user_id UUID)
RETURNS TABLE (
  id INTEGER,
  user_id UUID,
  name TEXT,
  description TEXT,
  problem_ids INTEGER[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_problems INTEGER,
  completed_problems INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    upl.id,
    upl.user_id,
    upl.name,
    upl.description,
    upl.problem_ids,
    upl.created_at,
    upl.updated_at,
    -- Total problems in the list
    COALESCE(array_length(upl.problem_ids, 1), 0) AS total_problems,
    -- Count of completed problems (problems in the list that have been solved)
    (
      SELECT COUNT(DISTINCT problem_id)::INTEGER
      FROM submissions s
      WHERE s.user_id = p_user_id
        AND s.status = 'Accepted'
        AND s.problem_id = ANY(upl.problem_ids)
    ) AS completed_problems
  FROM user_problem_lists upl
  WHERE upl.user_id = p_user_id
  ORDER BY upl.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_challenge(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_study_plans_with_counts(UUID) TO authenticated;
