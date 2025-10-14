-- Fix daily challenge function to return problem ID
-- This ensures the "Start Challenge" button navigates to the correct problem page

-- Drop the existing function first since we're changing the return type
DROP FUNCTION IF EXISTS get_daily_challenge(UUID);

CREATE OR REPLACE FUNCTION get_daily_challenge(p_user_id UUID)
RETURNS TABLE (
  id INTEGER,
  title TEXT,
  difficulty TEXT,
  topics JSONB,
  slug TEXT
) AS $$
DECLARE
  v_problem RECORD;
  v_seed DOUBLE PRECISION;
  v_today_seed INTEGER;
BEGIN
  -- Create a consistent seed based on current date
  -- This ensures the same "random" problem is selected for the entire day
  v_today_seed := EXTRACT(EPOCH FROM CURRENT_DATE)::INTEGER;

  -- Set seed for consistent random selection (same for all users on the same day)
  PERFORM setseed(((v_today_seed % 10000) / 10000.0));

  -- Get a random unsolved problem for the user
  -- Priority: Medium difficulty, then Easy, then Hard
  -- Exclude premium problems
  -- Check against submissions table for solved problems
  SELECT
    p.id,
    p.title,
    p.difficulty,
    p.topic_tags as topics,
    p.title_slug as slug
  INTO v_problem
  FROM problems p
  LEFT JOIN submissions s
    ON s.problem_id = p.id
    AND s.user_id = p_user_id
    AND s.status = 'Accepted'
  WHERE
    p.is_premium = false
    AND s.id IS NULL  -- Not solved (no accepted submission)
  ORDER BY
    CASE p.difficulty
      WHEN 'Medium' THEN 1
      WHEN 'Easy' THEN 2
      WHEN 'Hard' THEN 3
    END,
    RANDOM()  -- Will be consistent due to setseed
  LIMIT 1;

  -- If no unsolved problems found, return a random problem
  IF v_problem IS NULL THEN
    PERFORM setseed(((v_today_seed % 10000) / 10000.0));

    SELECT
      p.id,
      p.title,
      p.difficulty,
      p.topic_tags as topics,
      p.title_slug as slug
    INTO v_problem
    FROM problems p
    WHERE p.is_premium = false
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  -- If still no problem found, get Two Sum problem from database
  IF v_problem IS NULL THEN
    SELECT
      p.id,
      p.title,
      p.difficulty,
      p.topic_tags as topics,
      p.title_slug as slug
    INTO v_problem
    FROM problems p
    WHERE p.title_slug = 'two-sum'
    LIMIT 1;
    
    -- If Two Sum doesn't exist, get any problem
    IF v_problem IS NULL THEN
      SELECT
        p.id,
        p.title,
        p.difficulty,
        p.topic_tags as topics,
        p.title_slug as slug
      INTO v_problem
      FROM problems p
      LIMIT 1;
    END IF;
  END IF;
  
  -- Return the result (v_problem should never be NULL at this point)
  IF v_problem IS NOT NULL THEN
    RETURN QUERY SELECT 
      v_problem.id,
      v_problem.title,
      v_problem.difficulty,
      v_problem.topics,
      v_problem.slug;
  ELSE
    -- This should never happen, but just in case
    RETURN QUERY SELECT 
      1 as id,
      'Two Sum'::TEXT as title,
      'Easy'::TEXT as difficulty,
      '[{"name": "Array"}, {"name": "Hash Table"}]'::JSONB as topics,
      'two-sum'::TEXT as slug;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_daily_challenge(UUID) TO authenticated;