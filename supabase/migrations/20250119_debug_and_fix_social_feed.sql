-- Comprehensive Social Feed Debug and Fix Migration
-- This migration will create all necessary functions, fix any issues, and add debugging capabilities

-- 1. First, let's ensure all tables have the correct structure and RLS policies

-- Enable RLS on all social feed tables
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;

-- 2. Create comprehensive RLS policies for social_posts
DROP POLICY IF EXISTS "Users can view public posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users can view their own posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users can view connection posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.social_posts;

CREATE POLICY "Users can view public posts" ON public.social_posts 
FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own posts" ON public.social_posts 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view connection posts" ON public.social_posts 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.connections 
    WHERE (from_user_id = auth.uid() AND to_user_id = user_id AND status = 'accepted') 
    OR (to_user_id = auth.uid() AND from_user_id = user_id AND status = 'accepted')
  )
);

CREATE POLICY "Users can insert their own posts" ON public.social_posts 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.social_posts 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.social_posts 
FOR DELETE USING (auth.uid() = user_id);

-- 3. Create RLS policies for post_likes
DROP POLICY IF EXISTS "Users can view post likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can insert their own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.post_likes;

CREATE POLICY "Users can view post likes" ON public.post_likes 
FOR SELECT USING (true);

CREATE POLICY "Users can insert their own likes" ON public.post_likes 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON public.post_likes 
FOR DELETE USING (auth.uid() = user_id);

-- 4. Create RLS policies for post_comments
DROP POLICY IF EXISTS "Users can view post comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.post_comments;

CREATE POLICY "Users can view post comments" ON public.post_comments 
FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comments" ON public.post_comments 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.post_comments 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.post_comments 
FOR DELETE USING (auth.uid() = user_id);

-- 5. Create RLS policies for post_reposts
DROP POLICY IF EXISTS "Users can view post reposts" ON public.post_reposts;
DROP POLICY IF EXISTS "Users can insert their own reposts" ON public.post_reposts;
DROP POLICY IF EXISTS "Users can delete their own reposts" ON public.post_reposts;

CREATE POLICY "Users can view post reposts" ON public.post_reposts 
FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reposts" ON public.post_reposts 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reposts" ON public.post_reposts 
FOR DELETE USING (auth.uid() = user_id);

-- 6. Drop existing get_social_feed function to avoid conflicts
DROP FUNCTION IF EXISTS public.get_social_feed(uuid, integer, integer, text[], boolean);
DROP FUNCTION IF EXISTS public.get_social_feed(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_social_feed(uuid);

-- 7. Create the main get_social_feed function with comprehensive error handling
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
  -- Log the function call for debugging
  RAISE LOG 'get_social_feed called with user_id: %, limit: %, offset: %, post_types: %, connections_only: %', 
    p_user_id, p_limit, p_offset, p_post_types, p_connections_only;

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

-- 8. Drop existing get_activity_feed function to avoid conflicts
DROP FUNCTION IF EXISTS public.get_activity_feed(uuid, integer, integer, text[]);
DROP FUNCTION IF EXISTS public.get_activity_feed(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_activity_feed(uuid);

-- 9. Create get_activity_feed function
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

-- 10. Drop existing helper functions to avoid conflicts
DROP FUNCTION IF EXISTS public.update_post_like_count(uuid, integer);
DROP FUNCTION IF EXISTS public.update_post_comment_count(uuid, integer);
DROP FUNCTION IF EXISTS public.update_post_repost_count(uuid, integer);
DROP FUNCTION IF EXISTS public.get_post_comments(uuid);

-- 11. Create helper functions for post interactions
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

-- 12. Drop existing debugging functions to avoid conflicts
DROP FUNCTION IF EXISTS public.debug_social_feed_tables();
DROP FUNCTION IF EXISTS public.create_test_social_post(uuid, text, text);
DROP FUNCTION IF EXISTS public.get_social_feed_debug_info(uuid);

-- 13. Create debugging functions
CREATE OR REPLACE FUNCTION public.debug_social_feed_tables()
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

-- 10. Create function to test social feed with sample data
CREATE OR REPLACE FUNCTION public.create_test_social_post(
  p_user_id uuid,
  p_content text DEFAULT 'This is a test post from the database migration',
  p_post_type text DEFAULT 'text'
) RETURNS uuid AS $$
DECLARE
  post_id uuid;
BEGIN
  INSERT INTO public.social_posts (
    user_id,
    content,
    post_type,
    is_public,
    metadata
  ) VALUES (
    p_user_id,
    p_content,
    p_post_type,
    true,
    '{"test": true, "created_by": "migration"}'::jsonb
  ) RETURNING id INTO post_id;
  
  RETURN post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to get social feed debug info
CREATE OR REPLACE FUNCTION public.get_social_feed_debug_info(p_user_id uuid)
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
    WHERE routine_name = 'get_social_feed' AND routine_schema = 'public'
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

-- 12. Insert some test data if no posts exist
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

-- 13. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON public.social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_is_public ON public.social_posts(is_public);
CREATE INDEX IF NOT EXISTS idx_social_posts_post_type ON public.social_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_connections_from_user_id ON public.connections(from_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_to_user_id ON public.connections(to_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON public.connections(status);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_post_id ON public.post_reposts(post_id);

-- 14. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_social_feed TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_feed TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_post_like_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_post_comment_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_post_repost_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_comments TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_social_feed_tables TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_test_social_post TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_social_feed_debug_info TO authenticated;
