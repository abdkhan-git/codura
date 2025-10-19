-- Ensure all required functions exist for social feed
-- This migration creates the functions if they don't exist

-- 1. Create get_social_feed function
CREATE OR REPLACE FUNCTION public.get_social_feed(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_post_types text[] DEFAULT NULL,
  p_connections_only boolean DEFAULT false
) RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  media_urls text[],
  post_type text,
  metadata jsonb,
  is_public boolean,
  is_pinned boolean,
  parent_post_id uuid,
  original_post_id uuid,
  repost_count integer,
  like_count integer,
  comment_count integer,
  view_count integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  author_username text,
  author_full_name text,
  author_avatar_url text,
  original_author_username text,
  original_author_full_name text,
  original_author_avatar_url text,
  original_post_content text,
  original_post_media_urls text[],
  original_post_type text,
  original_post_metadata jsonb,
  has_liked boolean,
  has_reposted boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.user_id,
    sp.content,
    sp.media_urls,
    sp.post_type,
    sp.metadata,
    sp.is_public,
    sp.is_pinned,
    sp.parent_post_id,
    sp.original_post_id,
    sp.repost_count,
    sp.like_count,
    sp.comment_count,
    sp.view_count,
    sp.created_at,
    sp.updated_at,
    u.username AS author_username,
    u.full_name AS author_full_name,
    u.avatar_url AS author_avatar_url,
    ou.username AS original_author_username,
    ou.full_name AS original_author_full_name,
    ou.avatar_url AS original_author_avatar_url,
    osp.content AS original_post_content,
    osp.media_urls AS original_post_media_urls,
    osp.post_type AS original_post_type,
    osp.metadata AS original_post_metadata,
    CASE WHEN user_likes.post_id IS NOT NULL THEN true ELSE false END AS has_liked,
    CASE WHEN user_reposts.post_id IS NOT NULL THEN true ELSE false END AS has_reposted
  FROM public.social_posts sp
  JOIN public.users u ON sp.user_id = u.user_id
  LEFT JOIN public.social_posts osp ON sp.original_post_id = osp.id
  LEFT JOIN public.users ou ON osp.user_id = ou.user_id
  LEFT JOIN (
    SELECT DISTINCT post_id, user_id
    FROM public.post_likes
    WHERE user_id = p_user_id
  ) user_likes ON sp.id = user_likes.post_id
  LEFT JOIN (
    SELECT DISTINCT post_id, user_id
    FROM public.post_reposts
    WHERE user_id = p_user_id
  ) user_reposts ON sp.id = user_reposts.post_id
  WHERE (
    sp.is_public = true OR 
    sp.user_id = p_user_id OR
    EXISTS (
      SELECT 1 FROM public.connections 
      WHERE (from_user_id = p_user_id AND to_user_id = sp.user_id) 
      OR (to_user_id = p_user_id AND from_user_id = sp.user_id)
    )
  )
  AND (
    CASE 
      WHEN p_connections_only = true THEN
        sp.user_id = p_user_id OR
        EXISTS (
          SELECT 1 FROM public.connections 
          WHERE (from_user_id = p_user_id AND to_user_id = sp.user_id AND status = 'accepted') 
          OR (to_user_id = p_user_id AND from_user_id = sp.user_id AND status = 'accepted')
        )
      ELSE true
    END
  )
  AND (p_post_types IS NULL OR sp.post_type = ANY(p_post_types))
  ORDER BY sp.is_pinned DESC, sp.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create get_activity_feed function
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
  target_study_plan_id uuid,
  is_public boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  author_username text,
  author_full_name text,
  author_avatar_url text,
  target_user_username text,
  target_user_full_name text,
  target_user_avatar_url text,
  reactions_count bigint,
  comments_count bigint
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
    af.target_study_plan_id,
    af.is_public,
    af.created_at,
    af.updated_at,
    u.username AS author_username,
    u.full_name AS author_full_name,
    u.avatar_url AS author_avatar_url,
    tu.username AS target_user_username,
    tu.full_name AS target_user_full_name,
    tu.avatar_url AS target_user_avatar_url,
    COALESCE(reactions.count, 0) AS reactions_count,
    COALESCE(comments.count, 0) AS comments_count
  FROM public.activity_feed af
  JOIN public.users u ON af.user_id = u.user_id
  LEFT JOIN public.users tu ON af.target_user_id = tu.user_id
  LEFT JOIN (
    SELECT activity_id, COUNT(*) as count
    FROM public.activity_reactions
    GROUP BY activity_id
  ) reactions ON af.id = reactions.activity_id
  LEFT JOIN (
    SELECT activity_id, COUNT(*) as count
    FROM public.activity_comments
    GROUP BY activity_id
  ) comments ON af.id = comments.activity_id
  WHERE (
    af.is_public = true OR 
    af.user_id = p_user_id OR
    EXISTS (
      SELECT 1 FROM public.connections 
      WHERE (from_user_id = p_user_id AND to_user_id = af.user_id) 
      OR (to_user_id = p_user_id AND from_user_id = af.user_id)
    )
  )
  AND (p_activity_types IS NULL OR af.activity_type = ANY(p_activity_types))
  ORDER BY af.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create create_activity function
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

-- 4. Create helper functions for post interactions
CREATE OR REPLACE FUNCTION public.update_post_like_count(p_post_id uuid, p_increment integer)
RETURNS void AS $$
BEGIN
  UPDATE public.social_posts 
  SET like_count = like_count + p_increment
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_post_comment_count(p_post_id uuid, p_increment integer)
RETURNS void AS $$
BEGIN
  UPDATE public.social_posts 
  SET comment_count = comment_count + p_increment
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_post_repost_count(p_post_id uuid, p_increment integer)
RETURNS void AS $$
BEGIN
  UPDATE public.social_posts 
  SET repost_count = repost_count + p_increment
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_post_comments(p_post_id uuid)
RETURNS TABLE (
  id uuid,
  post_id uuid,
  user_id uuid,
  content text,
  parent_comment_id uuid,
  like_count integer,
  reply_count integer,
  is_edited boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  author_username text,
  author_full_name text,
  author_avatar_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.post_id,
    pc.user_id,
    pc.content,
    pc.parent_comment_id,
    pc.like_count,
    pc.reply_count,
    pc.is_edited,
    pc.created_at,
    pc.updated_at,
    u.username AS author_username,
    u.full_name AS author_full_name,
    u.avatar_url AS author_avatar_url
  FROM public.post_comments pc
  JOIN public.users u ON pc.user_id = u.user_id
  WHERE pc.post_id = p_post_id
  ORDER BY pc.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
