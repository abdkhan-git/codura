-- Social Feed Schema
-- This migration creates the tables for social feed posts, comments, likes, and reposts

-- Social Posts Table
CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  media_urls text[] DEFAULT '{}'::text[],
  post_type text NOT NULL DEFAULT 'text' CHECK (post_type = ANY (ARRAY[
    'text'::text,
    'image'::text,
    'video'::text,
    'link'::text,
    'poll'::text,
    'achievement'::text,
    'problem_solved'::text,
    'study_plan'::text
  ])),
  metadata jsonb DEFAULT '{}'::jsonb,
  is_public boolean DEFAULT true,
  is_pinned boolean DEFAULT false,
  parent_post_id uuid,
  original_post_id uuid,
  repost_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT social_posts_pkey PRIMARY KEY (id),
  CONSTRAINT social_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT social_posts_parent_post_id_fkey FOREIGN KEY (parent_post_id) REFERENCES public.social_posts(id) ON DELETE CASCADE,
  CONSTRAINT social_posts_original_post_id_fkey FOREIGN KEY (original_post_id) REFERENCES public.social_posts(id) ON DELETE CASCADE
);

-- Post Likes Table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_likes_pkey PRIMARY KEY (id),
  CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.social_posts(id) ON DELETE CASCADE,
  CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT post_likes_unique UNIQUE (post_id, user_id)
);

-- Post Comments Table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_comment_id uuid,
  like_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  is_edited boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_comments_pkey PRIMARY KEY (id),
  CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.social_posts(id) ON DELETE CASCADE,
  CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT post_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.post_comments(id) ON DELETE CASCADE
);

-- Comment Likes Table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comment_likes_pkey PRIMARY KEY (id),
  CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.post_comments(id) ON DELETE CASCADE,
  CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT comment_likes_unique UNIQUE (comment_id, user_id)
);

-- Post Reposts Table
CREATE TABLE IF NOT EXISTS public.post_reposts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_reposts_pkey PRIMARY KEY (id),
  CONSTRAINT post_reposts_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.social_posts(id) ON DELETE CASCADE,
  CONSTRAINT post_reposts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT post_reposts_unique UNIQUE (post_id, user_id)
);

-- Post Views Table (for analytics)
CREATE TABLE IF NOT EXISTS public.post_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_views_pkey PRIMARY KEY (id),
  CONSTRAINT post_views_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.social_posts(id) ON DELETE CASCADE,
  CONSTRAINT post_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS social_posts_user_id_idx ON public.social_posts (user_id);
CREATE INDEX IF NOT EXISTS social_posts_created_at_idx ON public.social_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS social_posts_is_public_idx ON public.social_posts (is_public);
CREATE INDEX IF NOT EXISTS social_posts_parent_post_id_idx ON public.social_posts (parent_post_id);
CREATE INDEX IF NOT EXISTS social_posts_original_post_id_idx ON public.social_posts (original_post_id);
CREATE INDEX IF NOT EXISTS social_posts_post_type_idx ON public.social_posts (post_type);

CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS post_likes_user_id_idx ON public.post_likes (user_id);

CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON public.post_comments (post_id);
CREATE INDEX IF NOT EXISTS post_comments_user_id_idx ON public.post_comments (user_id);
CREATE INDEX IF NOT EXISTS post_comments_created_at_idx ON public.post_comments (created_at DESC);
CREATE INDEX IF NOT EXISTS post_comments_parent_comment_id_idx ON public.post_comments (parent_comment_id);

CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON public.comment_likes (comment_id);
CREATE INDEX IF NOT EXISTS comment_likes_user_id_idx ON public.comment_likes (user_id);

CREATE INDEX IF NOT EXISTS post_reposts_post_id_idx ON public.post_reposts (post_id);
CREATE INDEX IF NOT EXISTS post_reposts_user_id_idx ON public.post_reposts (user_id);

CREATE INDEX IF NOT EXISTS post_views_post_id_idx ON public.post_views (post_id);
CREATE INDEX IF NOT EXISTS post_views_user_id_idx ON public.post_views (user_id);

-- RLS Policies
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- Social Posts Policies
CREATE POLICY "Users can view public posts and posts from connections" ON public.social_posts
  FOR SELECT USING (
    is_public = true OR 
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.connections 
      WHERE (from_user_id = auth.uid() AND to_user_id = user_id) 
      OR (to_user_id = auth.uid() AND from_user_id = user_id)
    )
  );

CREATE POLICY "Users can insert their own posts" ON public.social_posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own posts" ON public.social_posts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own posts" ON public.social_posts
  FOR DELETE USING (user_id = auth.uid());

-- Post Likes Policies
CREATE POLICY "Users can view likes on visible posts" ON public.post_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.social_posts 
      WHERE id = post_id AND (
        is_public = true OR 
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.connections 
          WHERE (from_user_id = auth.uid() AND to_user_id = social_posts.user_id) 
          OR (to_user_id = auth.uid() AND from_user_id = social_posts.user_id)
        )
      )
    )
  );

CREATE POLICY "Users can like visible posts" ON public.post_likes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.social_posts 
      WHERE id = post_id AND (
        is_public = true OR 
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.connections 
          WHERE (from_user_id = auth.uid() AND to_user_id = social_posts.user_id) 
          OR (to_user_id = auth.uid() AND from_user_id = social_posts.user_id)
        )
      )
    )
  );

CREATE POLICY "Users can unlike their own likes" ON public.post_likes
  FOR DELETE USING (user_id = auth.uid());

-- Post Comments Policies
CREATE POLICY "Users can view comments on visible posts" ON public.post_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.social_posts 
      WHERE id = post_id AND (
        is_public = true OR 
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.connections 
          WHERE (from_user_id = auth.uid() AND to_user_id = social_posts.user_id) 
          OR (to_user_id = auth.uid() AND from_user_id = social_posts.user_id)
        )
      )
    )
  );

CREATE POLICY "Users can comment on visible posts" ON public.post_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.social_posts 
      WHERE id = post_id AND (
        is_public = true OR 
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.connections 
          WHERE (from_user_id = auth.uid() AND to_user_id = social_posts.user_id) 
          OR (to_user_id = auth.uid() AND from_user_id = social_posts.user_id)
        )
      )
    )
  );

CREATE POLICY "Users can update their own comments" ON public.post_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON public.post_comments
  FOR DELETE USING (user_id = auth.uid());

-- Comment Likes Policies
CREATE POLICY "Users can view comment likes on visible posts" ON public.comment_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.post_comments pc
      JOIN public.social_posts sp ON pc.post_id = sp.id
      WHERE pc.id = comment_id AND (
        sp.is_public = true OR 
        sp.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.connections 
          WHERE (from_user_id = auth.uid() AND to_user_id = sp.user_id) 
          OR (to_user_id = auth.uid() AND from_user_id = sp.user_id)
        )
      )
    )
  );

CREATE POLICY "Users can like visible comments" ON public.comment_likes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.post_comments pc
      JOIN public.social_posts sp ON pc.post_id = sp.id
      WHERE pc.id = comment_id AND (
        sp.is_public = true OR 
        sp.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.connections 
          WHERE (from_user_id = auth.uid() AND to_user_id = sp.user_id) 
          OR (to_user_id = auth.uid() AND from_user_id = sp.user_id)
        )
      )
    )
  );

CREATE POLICY "Users can unlike their own comment likes" ON public.comment_likes
  FOR DELETE USING (user_id = auth.uid());

-- Post Reposts Policies
CREATE POLICY "Users can view reposts on visible posts" ON public.post_reposts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.social_posts 
      WHERE id = post_id AND (
        is_public = true OR 
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.connections 
          WHERE (from_user_id = auth.uid() AND to_user_id = social_posts.user_id) 
          OR (to_user_id = auth.uid() AND from_user_id = social_posts.user_id)
        )
      )
    )
  );

CREATE POLICY "Users can repost visible posts" ON public.post_reposts
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.social_posts 
      WHERE id = post_id AND (
        is_public = true OR 
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.connections 
          WHERE (from_user_id = auth.uid() AND to_user_id = social_posts.user_id) 
          OR (to_user_id = auth.uid() AND from_user_id = social_posts.user_id)
        )
      )
    )
  );

CREATE POLICY "Users can unrepost their own reposts" ON public.post_reposts
  FOR DELETE USING (user_id = auth.uid());

-- Post Views Policies
CREATE POLICY "Users can view analytics for their own posts" ON public.post_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.social_posts 
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert view records" ON public.post_views
  FOR INSERT WITH CHECK (true);

-- Functions for social feed
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

-- Function to get social feed for a user
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
  user_name text,
  user_username text,
  user_avatar_url text,
  user_liked boolean,
  user_reposted boolean,
  original_post_content text,
  original_post_user_name text,
  original_post_user_username text,
  parent_post_content text,
  parent_post_user_name text,
  parent_post_user_username text
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
    u.full_name as user_name,
    u.username as user_username,
    u.avatar_url as user_avatar_url,
    CASE WHEN user_likes.user_id IS NOT NULL THEN true ELSE false END as user_liked,
    CASE WHEN user_reposts.user_id IS NOT NULL THEN true ELSE false END as user_reposted,
    op.content as original_post_content,
    op_user.full_name as original_post_user_name,
    op_user.username as original_post_user_username,
    pp.content as parent_post_content,
    pp_user.full_name as parent_post_user_name,
    pp_user.username as parent_post_user_username
  FROM public.social_posts sp
  JOIN public.users u ON sp.user_id = u.user_id
  LEFT JOIN public.social_posts op ON sp.original_post_id = op.id
  LEFT JOIN public.users op_user ON op.user_id = op_user.user_id
  LEFT JOIN public.social_posts pp ON sp.parent_post_id = pp.id
  LEFT JOIN public.users pp_user ON pp.user_id = pp_user.user_id
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

-- Function to get post comments
CREATE OR REPLACE FUNCTION public.get_post_comments(
  p_post_id uuid,
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
) RETURNS TABLE (
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
  user_name text,
  user_username text,
  user_avatar_url text,
  user_liked boolean
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
    u.full_name as user_name,
    u.username as user_username,
    u.avatar_url as user_avatar_url,
    CASE WHEN user_likes.user_id IS NOT NULL THEN true ELSE false END as user_liked
  FROM public.post_comments pc
  JOIN public.users u ON pc.user_id = u.user_id
  LEFT JOIN (
    SELECT DISTINCT comment_id, user_id
    FROM public.comment_likes
    WHERE user_id = p_user_id
  ) user_likes ON pc.id = user_likes.comment_id
  WHERE pc.post_id = p_post_id
  ORDER BY pc.created_at ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update post counters
CREATE OR REPLACE FUNCTION public.update_post_counters(p_post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.social_posts 
  SET 
    like_count = (SELECT COUNT(*) FROM public.post_likes WHERE post_id = p_post_id),
    comment_count = (SELECT COUNT(*) FROM public.post_comments WHERE post_id = p_post_id),
    repost_count = (SELECT COUNT(*) FROM public.post_reposts WHERE post_id = p_post_id),
    view_count = (SELECT COUNT(*) FROM public.post_views WHERE post_id = p_post_id)
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update comment counters
CREATE OR REPLACE FUNCTION public.update_comment_counters(p_comment_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.post_comments 
  SET 
    like_count = (SELECT COUNT(*) FROM public.comment_likes WHERE comment_id = p_comment_id),
    reply_count = (SELECT COUNT(*) FROM public.post_comments WHERE parent_comment_id = p_comment_id)
  WHERE id = p_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
