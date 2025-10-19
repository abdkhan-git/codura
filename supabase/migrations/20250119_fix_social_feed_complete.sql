-- Complete fix for social feed and related database issues
-- This migration addresses all the schema inconsistencies and missing functions

-- 1. Fix the get_social_feed function with proper column references
DROP FUNCTION IF EXISTS public.get_social_feed(uuid, integer, integer, text[], boolean);

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

-- 2. Create function to get post comments
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

-- 3. Create function to update post like count
CREATE OR REPLACE FUNCTION public.update_post_like_count(p_post_id uuid, p_increment integer)
RETURNS void AS $$
BEGIN
  UPDATE public.social_posts 
  SET like_count = like_count + p_increment
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to update post comment count
CREATE OR REPLACE FUNCTION public.update_post_comment_count(p_post_id uuid, p_increment integer)
RETURNS void AS $$
BEGIN
  UPDATE public.social_posts 
  SET comment_count = comment_count + p_increment
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to update post repost count
CREATE OR REPLACE FUNCTION public.update_post_repost_count(p_post_id uuid, p_increment integer)
RETURNS void AS $$
BEGIN
  UPDATE public.social_posts 
  SET repost_count = repost_count + p_increment
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fix notifications foreign key constraints
-- Drop existing constraints if they exist
DO $$
BEGIN
  -- Drop foreign key constraints if they exist
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'notifications_actor_id_fkey' 
             AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_actor_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'notifications_user_id_fkey' 
             AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_user_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'notifications_activity_id_fkey' 
             AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_activity_id_fkey;
  END IF;
END $$;

-- Add proper foreign key constraints
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_actor_id_fkey 
FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_activity_id_fkey 
FOREIGN KEY (activity_id) REFERENCES public.activity_feed(id) ON DELETE SET NULL;

-- 7. Create RLS policies for social_posts if they don't exist
DO $$
BEGIN
  -- Enable RLS on social_posts if not already enabled
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'social_posts' AND relrowsecurity = true) THEN
    ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Create policies if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'Users can view public posts') THEN
    CREATE POLICY "Users can view public posts" ON public.social_posts 
    FOR SELECT USING (is_public = true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'Users can view their own posts') THEN
    CREATE POLICY "Users can view their own posts" ON public.social_posts 
    FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'Users can view connection posts') THEN
    CREATE POLICY "Users can view connection posts" ON public.social_posts 
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.connections 
        WHERE (from_user_id = auth.uid() AND to_user_id = user_id) 
        OR (to_user_id = auth.uid() AND from_user_id = user_id)
      )
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'Users can insert their own posts') THEN
    CREATE POLICY "Users can insert their own posts" ON public.social_posts 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'Users can update their own posts') THEN
    CREATE POLICY "Users can update their own posts" ON public.social_posts 
    FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'Users can delete their own posts') THEN
    CREATE POLICY "Users can delete their own posts" ON public.social_posts 
    FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 8. Create RLS policies for post_likes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'post_likes' AND relrowsecurity = true) THEN
    ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_likes' AND policyname = 'Users can view post likes') THEN
    CREATE POLICY "Users can view post likes" ON public.post_likes 
    FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_likes' AND policyname = 'Users can insert their own likes') THEN
    CREATE POLICY "Users can insert their own likes" ON public.post_likes 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_likes' AND policyname = 'Users can delete their own likes') THEN
    CREATE POLICY "Users can delete their own likes" ON public.post_likes 
    FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 9. Create RLS policies for post_comments if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'post_comments' AND relrowsecurity = true) THEN
    ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_comments' AND policyname = 'Users can view post comments') THEN
    CREATE POLICY "Users can view post comments" ON public.post_comments 
    FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_comments' AND policyname = 'Users can insert their own comments') THEN
    CREATE POLICY "Users can insert their own comments" ON public.post_comments 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_comments' AND policyname = 'Users can update their own comments') THEN
    CREATE POLICY "Users can update their own comments" ON public.post_comments 
    FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_comments' AND policyname = 'Users can delete their own comments') THEN
    CREATE POLICY "Users can delete their own comments" ON public.post_comments 
    FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 10. Create RLS policies for post_reposts if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'post_reposts' AND relrowsecurity = true) THEN
    ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_reposts' AND policyname = 'Users can view post reposts') THEN
    CREATE POLICY "Users can view post reposts" ON public.post_reposts 
    FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_reposts' AND policyname = 'Users can insert their own reposts') THEN
    CREATE POLICY "Users can insert their own reposts" ON public.post_reposts 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_reposts' AND policyname = 'Users can delete their own reposts') THEN
    CREATE POLICY "Users can delete their own reposts" ON public.post_reposts 
    FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 11. Create RLS policies for notifications if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notifications' AND relrowsecurity = true) THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view their own notifications') THEN
    CREATE POLICY "Users can view their own notifications" ON public.notifications 
    FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update their own notifications') THEN
    CREATE POLICY "Users can update their own notifications" ON public.notifications 
    FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can delete their own notifications') THEN
    CREATE POLICY "Users can delete their own notifications" ON public.notifications 
    FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
