-- Add a count function for accurate pagination with filters
-- This migration adds a count_users function that matches the search_users filters

-- Create count function that matches search_users filters
CREATE OR REPLACE FUNCTION count_users(
  p_current_user_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_university TEXT DEFAULT NULL,
  p_graduation_year TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_min_solved INTEGER DEFAULT NULL,
  p_max_solved INTEGER DEFAULT NULL,
  p_min_rating INTEGER DEFAULT NULL,
  p_max_rating INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.users u
    LEFT JOIN public.user_stats us ON u.user_id = us.user_id
    WHERE
      u.user_id != p_current_user_id -- Exclude current user
      AND u.is_public = TRUE -- Only show public profiles
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
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION count_users(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;
