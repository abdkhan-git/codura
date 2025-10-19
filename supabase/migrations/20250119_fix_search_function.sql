-- Fix the search_users function to work with the current database
-- This migration creates a working search function without complex formatting

-- Drop any existing search_users function
DROP FUNCTION IF EXISTS search_users(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS search_users(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER);

-- Create a simple, working search function
CREATE OR REPLACE FUNCTION search_users(
  p_current_user_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_university TEXT DEFAULT NULL,
  p_graduation_year TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_min_solved INTEGER DEFAULT NULL,
  p_max_solved INTEGER DEFAULT NULL,
  p_min_rating INTEGER DEFAULT NULL,
  p_max_rating INTEGER DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'relevance',
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  university TEXT,
  graduation_year TEXT,
  job_title TEXT,
  bio TEXT,
  total_solved INTEGER,
  current_streak INTEGER,
  contest_rating INTEGER,
  connection_status TEXT,
  mutual_connections_count INTEGER,
  is_public BOOLEAN
) AS $$
BEGIN
  -- Validate input parameters
  IF p_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Current user ID cannot be null';
  END IF;
  
  IF p_limit <= 0 OR p_limit > 100 THEN
    p_limit := 25;
  END IF;
  
  IF p_offset < 0 THEN
    p_offset := 0;
  END IF;

  -- Return the query results
  RETURN QUERY
  SELECT
    u.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    u.university,
    u.graduation_year,
    u.job_title,
    u.bio,
    COALESCE(us.total_solved, 0) as total_solved,
    COALESCE(us.current_streak, 0) as current_streak,
    COALESCE(us.contest_rating, 0) as contest_rating,
    get_connection_status(p_current_user_id, u.user_id) as connection_status,
    COALESCE(get_mutual_connections_count(p_current_user_id, u.user_id), 0) as mutual_connections_count,
    u.is_public
  FROM public.users u
  LEFT JOIN public.user_stats us ON u.user_id = us.user_id
  WHERE
    u.user_id != p_current_user_id -- Exclude current user
    AND (p_search_query IS NULL OR (
      u.username ILIKE '%' || p_search_query || '%' OR
      u.full_name ILIKE '%' || p_search_query || '%' OR
      u.university ILIKE '%' || p_search_query || '%' OR
      u.job_title ILIKE '%' || p_search_query || '%'
    ))
    AND (p_university IS NULL OR u.university ILIKE '%' || p_university || '%')
    AND (p_graduation_year IS NULL OR u.graduation_year = p_graduation_year)
    AND (p_company IS NULL OR u.job_title ILIKE '%' || p_company || '%')
    AND (p_min_solved IS NULL OR COALESCE(us.total_solved, 0) >= p_min_solved)
    AND (p_max_solved IS NULL OR COALESCE(us.total_solved, 0) <= p_max_solved)
    AND (p_min_rating IS NULL OR COALESCE(us.contest_rating, 0) >= p_min_rating)
    AND (p_max_rating IS NULL OR COALESCE(us.contest_rating, 0) <= p_max_rating)
  ORDER BY
    CASE p_sort_by
      WHEN 'activity' THEN COALESCE(us.current_streak, 0)
      WHEN 'connections' THEN COALESCE(get_mutual_connections_count(p_current_user_id, u.user_id), 0)
      WHEN 'rating_high' THEN COALESCE(us.contest_rating, 0)
      WHEN 'rating_low' THEN COALESCE(us.contest_rating, 0)
      WHEN 'problems_high' THEN COALESCE(us.total_solved, 0)
      WHEN 'problems_low' THEN COALESCE(us.total_solved, 0)
      ELSE COALESCE(get_mutual_connections_count(p_current_user_id, u.user_id), 0)
    END DESC,
    COALESCE(us.total_solved, 0) DESC,
    u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION search_users(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, INTEGER, INTEGER) TO authenticated;
