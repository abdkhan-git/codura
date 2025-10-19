-- Migration: Add RPC Functions for Social Networking
-- Description: Adds helper functions for user search and connection management
-- Date: 2025-01-19
-- Note: This assumes tables already exist from previous migration

-- Drop existing functions if they exist (to avoid conflicts)
DROP FUNCTION IF EXISTS get_mutual_connections_count(UUID, UUID);
DROP FUNCTION IF EXISTS get_connection_status(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_connections_count(UUID);
DROP FUNCTION IF EXISTS search_users(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER);

-- Function to get mutual connections count between two users
CREATE OR REPLACE FUNCTION get_mutual_connections_count(user1_id UUID, user2_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM (
    SELECT to_user_id AS connection_id FROM public.connections
    WHERE from_user_id = user1_id AND status = 'accepted'
    UNION
    SELECT from_user_id AS connection_id FROM public.connections
    WHERE to_user_id = user1_id AND status = 'accepted'
  ) user1_connections
  INNER JOIN (
    SELECT to_user_id AS connection_id FROM public.connections
    WHERE from_user_id = user2_id AND status = 'accepted'
    UNION
    SELECT from_user_id AS connection_id FROM public.connections
    WHERE to_user_id = user2_id AND status = 'accepted'
  ) user2_connections
  ON user1_connections.connection_id = user2_connections.connection_id;
$$ LANGUAGE SQL STABLE;

-- Function to get connection status between two users
CREATE OR REPLACE FUNCTION get_connection_status(user1_id UUID, user2_id UUID)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.connections
      WHERE from_user_id = user1_id AND to_user_id = user2_id AND status = 'accepted'
    ) OR EXISTS (
      SELECT 1 FROM public.connections
      WHERE from_user_id = user2_id AND to_user_id = user1_id AND status = 'accepted'
    ) THEN 'connected'
    WHEN EXISTS (
      SELECT 1 FROM public.connections
      WHERE from_user_id = user1_id AND to_user_id = user2_id AND status = 'pending'
    ) THEN 'pending_sent'
    WHEN EXISTS (
      SELECT 1 FROM public.connections
      WHERE from_user_id = user2_id AND to_user_id = user1_id AND status = 'pending'
    ) THEN 'pending_received'
    WHEN EXISTS (
      SELECT 1 FROM public.connections
      WHERE (from_user_id = user1_id AND to_user_id = user2_id AND status = 'blocked')
      OR (from_user_id = user2_id AND to_user_id = user1_id AND status = 'blocked')
    ) THEN 'blocked'
    ELSE 'none'
  END;
$$ LANGUAGE SQL STABLE;

-- Function to get user's total connection count
CREATE OR REPLACE FUNCTION get_user_connections_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM (
    SELECT to_user_id FROM public.connections
    WHERE from_user_id = p_user_id AND status = 'accepted'
    UNION
    SELECT from_user_id FROM public.connections
    WHERE to_user_id = p_user_id AND status = 'accepted'
  ) connections;
$$ LANGUAGE SQL STABLE;

-- Function to search users with filters
CREATE OR REPLACE FUNCTION search_users(
  p_current_user_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_university TEXT DEFAULT NULL,
  p_graduation_year TEXT DEFAULT NULL,
  p_min_solved INTEGER DEFAULT NULL,
  p_max_solved INTEGER DEFAULT NULL,
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
    get_mutual_connections_count(p_current_user_id, u.user_id) as mutual_connections_count,
    u.is_public
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
    AND (p_min_solved IS NULL OR COALESCE(us.total_solved, 0) >= p_min_solved)
    AND (p_max_solved IS NULL OR COALESCE(us.total_solved, 0) <= p_max_solved)
  ORDER BY
    -- Prioritize mutual connections
    mutual_connections_count DESC,
    -- Then by relevance (total solved as proxy for activity)
    us.total_solved DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_mutual_connections_count(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_connection_status(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_connections_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_users(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;
