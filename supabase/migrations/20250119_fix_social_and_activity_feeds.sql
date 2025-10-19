-- Fix Social and Activity Feeds
-- This migration ensures all required functions and policies exist

-- ============================================================================
-- PART 1: Fix get_activity_feed function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_activity_feed(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_activity_types text[] DEFAULT NULL
) RETURNS TABLE (
  id uuid,
  user_id uuid,
  activity_type text,
  title text,
  description text,
  metadata jsonb,
  target_user_id uuid,
  target_problem_id integer,
  is_public boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  user_name text,
  user_username text,
  user_avatar_url text,
  target_user_name text,
  target_user_username text,
  target_user_avatar_url text,
  reaction_count bigint,
  comment_count bigint,
  user_reacted boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    af.id,
    af.user_id,
    af.activity_type,
    af.title,
    af.description,
    af.metadata,
    af.target_user_id,
    af.target_problem_id,
    af.is_public,
    af.created_at,
    af.updated_at,
    u.full_name as user_name,
    u.username as user_username,
    u.avatar_url as user_avatar_url,
    tu.full_name as target_user_name,
    tu.username as target_user_username,
    tu.avatar_url as target_user_avatar_url,
    COALESCE(reaction_counts.count, 0) as reaction_count,
    COALESCE(comment_counts.count, 0) as comment_count,
    CASE WHEN user_reactions.user_id IS NOT NULL THEN true ELSE false END as user_reacted
  FROM public.activity_feed af
  JOIN public.users u ON af.user_id = u.user_id
  LEFT JOIN public.users tu ON af.target_user_id = tu.user_id
  LEFT JOIN (
    SELECT activity_id, COUNT(*) as count
    FROM public.activity_reactions
    GROUP BY activity_id
  ) reaction_counts ON af.id = reaction_counts.activity_id
  LEFT JOIN (
    SELECT activity_id, COUNT(*) as count
    FROM public.activity_comments
    GROUP BY activity_id
  ) comment_counts ON af.id = comment_counts.activity_id
  LEFT JOIN (
    SELECT DISTINCT activity_id, user_id
    FROM public.activity_reactions
    WHERE user_id = p_user_id
  ) user_reactions ON af.id = user_reactions.activity_id
  WHERE (
    af.is_public = true OR
    af.user_id = p_user_id OR
    af.target_user_id = p_user_id OR
    EXISTS (
      SELECT 1 FROM public.connections
      WHERE (from_user_id = p_user_id AND to_user_id = af.user_id AND status = 'accepted')
      OR (to_user_id = p_user_id AND from_user_id = af.user_id AND status = 'accepted')
    )
  )
  AND (p_activity_types IS NULL OR af.activity_type = ANY(p_activity_types))
  ORDER BY af.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 2: Ensure create_activity function exists
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_activity(
  p_user_id uuid,
  p_activity_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_target_user_id uuid DEFAULT NULL,
  p_target_problem_id integer DEFAULT NULL,
  p_is_public boolean DEFAULT true
) RETURNS uuid AS $$
DECLARE
  activity_id uuid;
BEGIN
  INSERT INTO public.activity_feed (
    user_id,
    activity_type,
    title,
    description,
    metadata,
    target_user_id,
    target_problem_id,
    is_public
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_title,
    p_description,
    p_metadata,
    p_target_user_id,
    p_target_problem_id,
    p_is_public
  ) RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 3: Verify and fix RLS policies for activity tables
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view public activities" ON public.activity_feed;
DROP POLICY IF EXISTS "Users can create their own activities" ON public.activity_feed;
DROP POLICY IF EXISTS "Users can update their own activities" ON public.activity_feed;
DROP POLICY IF EXISTS "Users can delete their own activities" ON public.activity_feed;

-- Recreate activity_feed policies
CREATE POLICY "Users can view public activities" ON public.activity_feed
  FOR SELECT USING (
    is_public = true OR
    user_id = auth.uid() OR
    target_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.connections
      WHERE (from_user_id = auth.uid() AND to_user_id = activity_feed.user_id AND status = 'accepted')
      OR (to_user_id = auth.uid() AND from_user_id = activity_feed.user_id AND status = 'accepted')
    )
  );

CREATE POLICY "Users can create their own activities" ON public.activity_feed
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own activities" ON public.activity_feed
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own activities" ON public.activity_feed
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- PART 4: Ensure activity_reactions policies exist
-- ============================================================================

DROP POLICY IF EXISTS "Users can view reactions" ON public.activity_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.activity_reactions;
DROP POLICY IF EXISTS "Users can remove their reactions" ON public.activity_reactions;

CREATE POLICY "Users can view reactions" ON public.activity_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can add reactions" ON public.activity_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their reactions" ON public.activity_reactions
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- PART 5: Ensure activity_comments policies exist
-- ============================================================================

DROP POLICY IF EXISTS "Users can view comments" ON public.activity_comments;
DROP POLICY IF EXISTS "Users can add comments" ON public.activity_comments;
DROP POLICY IF EXISTS "Users can update their comments" ON public.activity_comments;
DROP POLICY IF EXISTS "Users can delete their comments" ON public.activity_comments;

CREATE POLICY "Users can view comments" ON public.activity_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can add comments" ON public.activity_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their comments" ON public.activity_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their comments" ON public.activity_comments
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- PART 6: Grant necessary permissions
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_activity_feed TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_social_feed TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_post TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_comments TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_post_counters TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_comment_counters TO authenticated;

-- ============================================================================
-- PART 7: Create indexes for better performance
-- ============================================================================

-- Activity feed indexes
CREATE INDEX IF NOT EXISTS activity_feed_user_id_idx ON public.activity_feed (user_id);
CREATE INDEX IF NOT EXISTS activity_feed_created_at_idx ON public.activity_feed (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_activity_type_idx ON public.activity_feed (activity_type);
CREATE INDEX IF NOT EXISTS activity_feed_is_public_idx ON public.activity_feed (is_public);
CREATE INDEX IF NOT EXISTS activity_feed_target_user_id_idx ON public.activity_feed (target_user_id);

-- Activity reactions indexes
CREATE INDEX IF NOT EXISTS activity_reactions_activity_id_idx ON public.activity_reactions (activity_id);
CREATE INDEX IF NOT EXISTS activity_reactions_user_id_idx ON public.activity_reactions (user_id);

-- Activity comments indexes
CREATE INDEX IF NOT EXISTS activity_comments_activity_id_idx ON public.activity_comments (activity_id);
CREATE INDEX IF NOT EXISTS activity_comments_user_id_idx ON public.activity_comments (user_id);
CREATE INDEX IF NOT EXISTS activity_comments_created_at_idx ON public.activity_comments (created_at DESC);