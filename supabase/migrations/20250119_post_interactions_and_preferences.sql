-- Post Interactions and Feed Preferences Schema
-- This migration adds saved posts, not interested posts, and feed preferences

-- Saved Posts Table (Bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  collection_name text DEFAULT 'general',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT saved_posts_pkey PRIMARY KEY (id),
  CONSTRAINT saved_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT saved_posts_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.social_posts(id) ON DELETE CASCADE,
  CONSTRAINT saved_posts_unique UNIQUE (user_id, post_id)
);

-- Post Preferences Table (Not Interested, Hide, etc.)
CREATE TABLE IF NOT EXISTS public.post_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  preference_type text NOT NULL CHECK (preference_type = ANY (ARRAY[
    'not_interested'::text,
    'hide_post'::text,
    'hide_author'::text,
    'report'::text
  ])),
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT post_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT post_preferences_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.social_posts(id) ON DELETE CASCADE,
  CONSTRAINT post_preferences_unique UNIQUE (user_id, post_id, preference_type)
);

-- User Feed Preferences Table (Algorithm personalization)
CREATE TABLE IF NOT EXISTS public.user_feed_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  preference_key text NOT NULL,
  preference_value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_feed_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_feed_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_feed_preferences_unique UNIQUE (user_id, preference_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS saved_posts_user_id_idx ON public.saved_posts (user_id);
CREATE INDEX IF NOT EXISTS saved_posts_post_id_idx ON public.saved_posts (post_id);
CREATE INDEX IF NOT EXISTS saved_posts_created_at_idx ON public.saved_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS saved_posts_collection_idx ON public.saved_posts (user_id, collection_name);

CREATE INDEX IF NOT EXISTS post_preferences_user_id_idx ON public.post_preferences (user_id);
CREATE INDEX IF NOT EXISTS post_preferences_post_id_idx ON public.post_preferences (post_id);
CREATE INDEX IF NOT EXISTS post_preferences_type_idx ON public.post_preferences (user_id, preference_type);

CREATE INDEX IF NOT EXISTS user_feed_preferences_user_id_idx ON public.user_feed_preferences (user_id);
CREATE INDEX IF NOT EXISTS user_feed_preferences_key_idx ON public.user_feed_preferences (user_id, preference_key);

-- RLS Policies
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feed_preferences ENABLE ROW LEVEL SECURITY;

-- Saved Posts Policies
CREATE POLICY "Users can view their own saved posts" ON public.saved_posts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can save posts" ON public.saved_posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their saved posts" ON public.saved_posts
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can update their saved posts" ON public.saved_posts
  FOR UPDATE USING (user_id = auth.uid());

-- Post Preferences Policies
CREATE POLICY "Users can view their own post preferences" ON public.post_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can set post preferences" ON public.post_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their post preferences" ON public.post_preferences
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can update their post preferences" ON public.post_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- User Feed Preferences Policies
CREATE POLICY "Users can view their own feed preferences" ON public.user_feed_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can set feed preferences" ON public.user_feed_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their feed preferences" ON public.user_feed_preferences
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can update their feed preferences" ON public.user_feed_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- Function to update feed preferences based on user actions
CREATE OR REPLACE FUNCTION update_feed_preferences_on_action()
RETURNS TRIGGER AS $$
BEGIN
  -- When user marks post as not interested
  IF NEW.preference_type = 'not_interested' THEN
    -- Update user preferences to decrease similar content
    INSERT INTO public.user_feed_preferences (user_id, preference_key, preference_value)
    VALUES (
      NEW.user_id,
      'disliked_post_types',
      jsonb_build_object(
        'post_types', jsonb_build_array(
          (SELECT post_type FROM public.social_posts WHERE id = NEW.post_id)
        ),
        'updated_at', now()
      )
    )
    ON CONFLICT (user_id, preference_key)
    DO UPDATE SET
      preference_value = jsonb_set(
        user_feed_preferences.preference_value,
        '{post_types}',
        (
          SELECT jsonb_agg(DISTINCT value)
          FROM jsonb_array_elements(user_feed_preferences.preference_value->'post_types')
          UNION
          SELECT jsonb_build_array(
            (SELECT post_type FROM public.social_posts WHERE id = NEW.post_id)
          )
        ),
        true
      ),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for feed preference updates
DROP TRIGGER IF EXISTS update_feed_preferences_trigger ON public.post_preferences;
CREATE TRIGGER update_feed_preferences_trigger
  AFTER INSERT ON public.post_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_feed_preferences_on_action();

-- Function to get enhanced feed with preference filtering
CREATE OR REPLACE FUNCTION get_personalized_feed(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
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
  user_saved boolean
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
    EXISTS(SELECT 1 FROM public.post_likes pl WHERE pl.post_id = sp.id AND pl.user_id = p_user_id) as user_liked,
    EXISTS(SELECT 1 FROM public.post_reposts pr WHERE pr.post_id = sp.id AND pr.user_id = p_user_id) as user_reposted,
    EXISTS(SELECT 1 FROM public.saved_posts sap WHERE sap.post_id = sp.id AND sap.user_id = p_user_id) as user_saved
  FROM public.social_posts sp
  INNER JOIN public.users u ON sp.user_id = u.user_id
  WHERE
    sp.is_public = true
    -- Exclude posts user is not interested in
    AND NOT EXISTS (
      SELECT 1 FROM public.post_preferences pp
      WHERE pp.post_id = sp.id
      AND pp.user_id = p_user_id
      AND pp.preference_type IN ('not_interested', 'hide_post')
    )
    -- Exclude posts from hidden authors
    AND NOT EXISTS (
      SELECT 1 FROM public.post_preferences pp2
      WHERE pp2.user_id = p_user_id
      AND pp2.preference_type = 'hide_author'
      AND (SELECT post_id FROM public.social_posts WHERE id = pp2.post_id AND user_id = sp.user_id LIMIT 1) IS NOT NULL
    )
  ORDER BY sp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON public.saved_posts TO authenticated;
GRANT ALL ON public.post_preferences TO authenticated;
GRANT ALL ON public.user_feed_preferences TO authenticated;
