-- Migration: Social Networking Schema
-- Description: Adds tables for connections, activities, and notifications
-- Date: 2025-01-18

-- =============================================
-- CONNECTIONS TABLE
-- =============================================
-- Stores user-to-user connections with bidirectional relationship handling
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  message TEXT, -- Optional personal message with connection request
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure no duplicate connections (in either direction)
  CONSTRAINT unique_connection UNIQUE (from_user_id, to_user_id),
  -- Prevent self-connections
  CONSTRAINT no_self_connection CHECK (from_user_id != to_user_id)
);

-- Indexes for optimal query performance
CREATE INDEX idx_connections_from_user ON public.connections(from_user_id, status);
CREATE INDEX idx_connections_to_user ON public.connections(to_user_id, status);
CREATE INDEX idx_connections_status ON public.connections(status);
CREATE INDEX idx_connections_created_at ON public.connections(created_at DESC);

-- =============================================
-- USER ACTIVITIES TABLE
-- =============================================
-- Tracks user activities for social feed
CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'solved_problem',
    'earned_achievement',
    'milestone_reached',
    'profile_updated',
    'study_plan_created',
    'streak_milestone'
  )),
  metadata JSONB DEFAULT '{}'::jsonb, -- Flexible storage for activity-specific data
  is_public BOOLEAN DEFAULT TRUE, -- Allow users to hide certain activities
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for feed queries
CREATE INDEX idx_activities_user_created ON public.user_activities(user_id, created_at DESC);
CREATE INDEX idx_activities_type ON public.user_activities(activity_type);
CREATE INDEX idx_activities_public_created ON public.user_activities(is_public, created_at DESC);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
-- Stores user notifications for various events
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User who triggered the notification
  type TEXT NOT NULL CHECK (type IN (
    'connection_request',
    'connection_accepted',
    'connection_milestone',
    'activity_reaction',
    'study_plan_shared',
    'achievement_milestone'
  )),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT, -- URL to navigate to on click
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for notification queries
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- =============================================
-- PRIVACY SETTINGS TABLE
-- =============================================
-- Granular privacy controls for user profiles
CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'connections', 'private')),
  show_submissions_to TEXT NOT NULL DEFAULT 'connections' CHECK (show_submissions_to IN ('everyone', 'connections', 'only_me')),
  show_study_plans_to TEXT NOT NULL DEFAULT 'connections' CHECK (show_study_plans_to IN ('everyone', 'connections', 'only_me')),
  show_calendar_to TEXT NOT NULL DEFAULT 'connections' CHECK (show_calendar_to IN ('everyone', 'connections', 'only_me')),
  show_activity_feed BOOLEAN DEFAULT TRUE, -- Broadcast activities to feed
  allow_connection_requests BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

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

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Connections policies
CREATE POLICY "Users can view their own connections"
  ON public.connections FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create connection requests"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update their received connections"
  ON public.connections FOR UPDATE
  USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

CREATE POLICY "Users can delete their own connections"
  ON public.connections FOR DELETE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Activities policies
CREATE POLICY "Users can view their own activities and public activities from connections"
  ON public.user_activities FOR SELECT
  USING (
    -- Users can always see their own activities (public or private)
    user_id = auth.uid() OR
    -- Users can see public activities from their connections
    (is_public = TRUE AND EXISTS (
      SELECT 1 FROM public.connections
      WHERE status = 'accepted' AND (
        (from_user_id = auth.uid() AND to_user_id = user_activities.user_id) OR
        (to_user_id = auth.uid() AND from_user_id = user_activities.user_id)
      )
    ))
  );

CREATE POLICY "Users can create their own activities"
  ON public.user_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities"
  ON public.user_activities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities"
  ON public.user_activities FOR DELETE
  USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications for others"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = actor_id OR actor_id IS NULL);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Privacy settings policies
CREATE POLICY "Users can view their own privacy settings"
  ON public.user_privacy_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings"
  ON public.user_privacy_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings"
  ON public.user_privacy_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- DEFAULT PRIVACY SETTINGS TRIGGER
-- =============================================

-- Create default privacy settings for new users
-- This trigger fires when a new row is inserted into the public.users table
CREATE OR REPLACE FUNCTION create_default_privacy_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_privacy_settings (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on public.users table (fires when users complete onboarding)
CREATE TRIGGER create_privacy_settings_on_user_creation
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_privacy_settings();

-- Also create privacy settings for existing users (backfill)
INSERT INTO public.user_privacy_settings (user_id)
SELECT user_id FROM public.users
ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.connections IS 'Stores user-to-user connections with status tracking';
COMMENT ON TABLE public.user_activities IS 'Activity feed entries for social networking';
COMMENT ON TABLE public.notifications IS 'User notifications for various events';
COMMENT ON TABLE public.user_privacy_settings IS 'Granular privacy controls per user';

COMMENT ON FUNCTION get_mutual_connections_count IS 'Returns count of mutual connections between two users';
COMMENT ON FUNCTION get_connection_status IS 'Returns connection status between two users';
COMMENT ON FUNCTION get_user_connections_count IS 'Returns total connection count for a user';
COMMENT ON FUNCTION search_users IS 'Advanced user search with filters and connection status';
