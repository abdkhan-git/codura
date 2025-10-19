-- Create Essential Social Feed Functions
-- This migration creates the minimal required functions for the social feed to work

-- 1. Create the main get_social_feed function
CREATE OR REPLACE FUNCTION public.get_social_feed_final(
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
      WHERE (from_user_id = p_user_id AND to_user_id = sp.user_id AND status = 'accepted') 
      OR (to_user_id = p_user_id AND from_user_id = sp.user_id AND status = 'accepted')
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

-- 2. Create the create_post function
CREATE OR REPLACE FUNCTION public.create_post(
  p_user_id uuid,
  p_content text,
  p_media_urls text[] DEFAULT '{}'::text[],
  p_post_type text DEFAULT 'text',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_is_public boolean DEFAULT true,
  p_parent_post_id uuid DEFAULT NULL,
  p_original_post_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  post_id uuid;
BEGIN
  INSERT INTO public.social_posts (
    user_id,
    content,
    media_urls,
    post_type,
    metadata,
    is_public,
    parent_post_id,
    original_post_id
  ) VALUES (
    p_user_id,
    p_content,
    p_media_urls,
    p_post_type,
    p_metadata,
    p_is_public,
    p_parent_post_id,
    p_original_post_id
  ) RETURNING id INTO post_id;
  
  RETURN post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the create_activity function
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
CREATE OR REPLACE FUNCTION public.update_post_like_count_final(p_post_id uuid, p_increment integer)
RETURNS void AS $$
BEGIN
  UPDATE public.social_posts 
  SET like_count = like_count + p_increment
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_post_comment_count_final(p_post_id uuid, p_increment integer)
RETURNS void AS $$
BEGIN
  UPDATE public.social_posts 
  SET comment_count = comment_count + p_increment
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_post_repost_count_final(p_post_id uuid, p_increment integer)
RETURNS void AS $$
BEGIN
  UPDATE public.social_posts 
  SET repost_count = repost_count + p_increment
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_post_comments_final(p_post_id uuid)
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

-- 5. Create debugging functions
CREATE OR REPLACE FUNCTION public.debug_social_feed_tables_final()
RETURNS TABLE (
  table_name text,
  row_count bigint,
  has_rls boolean,
  policies_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::text,
    COALESCE(s.n_tup_ins, 0) as row_count,
    t.row_security as has_rls,
    COALESCE(p.policies_count, 0) as policies_count
  FROM information_schema.tables t
  LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
  LEFT JOIN (
    SELECT schemaname, tablename, COUNT(*) as policies_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    GROUP BY schemaname, tablename
  ) p ON p.tablename = t.table_name
  WHERE t.table_schema = 'public' 
  AND t.table_name IN ('social_posts', 'post_likes', 'post_comments', 'post_reposts', 'activity_feed', 'activity_reactions', 'activity_comments', 'users', 'connections')
  ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_social_feed_debug_info_final(p_user_id uuid)
RETURNS TABLE (
  total_posts bigint,
  public_posts bigint,
  user_posts bigint,
  connection_posts bigint,
  user_connections bigint,
  functions_exist boolean
) AS $$
DECLARE
  total_posts_count bigint;
  public_posts_count bigint;
  user_posts_count bigint;
  connection_posts_count bigint;
  user_connections_count bigint;
  functions_exist_flag boolean;
BEGIN
  -- Get total posts
  SELECT COUNT(*) INTO total_posts_count FROM public.social_posts;
  
  -- Get public posts
  SELECT COUNT(*) INTO public_posts_count FROM public.social_posts WHERE is_public = true;
  
  -- Get user's posts
  SELECT COUNT(*) INTO user_posts_count FROM public.social_posts WHERE user_id = p_user_id;
  
  -- Get connection posts
  SELECT COUNT(*) INTO connection_posts_count 
  FROM public.social_posts sp
  WHERE EXISTS (
    SELECT 1 FROM public.connections 
    WHERE (from_user_id = p_user_id AND to_user_id = sp.user_id AND status = 'accepted') 
    OR (to_user_id = p_user_id AND from_user_id = sp.user_id AND status = 'accepted')
  );
  
  -- Get user's connections
  SELECT COUNT(*) INTO user_connections_count 
  FROM public.connections 
  WHERE (from_user_id = p_user_id OR to_user_id = p_user_id) AND status = 'accepted';
  
  -- Check if functions exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'get_social_feed_final' AND routine_schema = 'public'
  ) INTO functions_exist_flag;
  
  RETURN QUERY SELECT 
    total_posts_count,
    public_posts_count,
    user_posts_count,
    connection_posts_count,
    user_connections_count,
    functions_exist_flag;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Insert some test data if no posts exist
DO $$
DECLARE
  test_user_id uuid;
  post_count integer;
BEGIN
  -- Check if we have any posts
  SELECT COUNT(*) INTO post_count FROM public.social_posts;
  
  -- If no posts exist, create some test data
  IF post_count = 0 THEN
    -- Get the first user from auth.users
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
      -- Create a test post
      INSERT INTO public.social_posts (
        user_id,
        content,
        post_type,
        is_public,
        metadata
      ) VALUES (
        test_user_id,
        'Welcome to Codura! This is your first post. 🎉',
        'text',
        true,
        '{"welcome": true, "created_by": "migration"}'::jsonb
      );
      
      RAISE LOG 'Created test post for user: %', test_user_id;
    END IF;
  END IF;
END $$;

-- 7. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_social_feed_final TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_post TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_post_like_count_final TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_post_comment_count_final TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_post_repost_count_final TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_comments_final TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_social_feed_tables_final TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_social_feed_debug_info_final TO authenticated;
