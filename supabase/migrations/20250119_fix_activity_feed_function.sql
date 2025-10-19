-- Fix activity feed function to resolve ambiguous column reference errors
-- This migration fixes the activity feed API that's failing with "column reference 'user_id' is ambiguous"

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_activity_feed(uuid, integer, integer, text[]);

-- Create the corrected activity feed function
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

-- Create RLS policies for activity_feed if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'activity_feed' AND relrowsecurity = true) THEN
    ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_feed' AND policyname = 'Users can view public activities') THEN
    CREATE POLICY "Users can view public activities" ON public.activity_feed 
    FOR SELECT USING (is_public = true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_feed' AND policyname = 'Users can view their own activities') THEN
    CREATE POLICY "Users can view their own activities" ON public.activity_feed 
    FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_feed' AND policyname = 'Users can view connection activities') THEN
    CREATE POLICY "Users can view connection activities" ON public.activity_feed 
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.connections 
        WHERE (from_user_id = auth.uid() AND to_user_id = user_id) 
        OR (to_user_id = auth.uid() AND from_user_id = user_id)
      )
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_feed' AND policyname = 'Users can insert their own activities') THEN
    CREATE POLICY "Users can insert their own activities" ON public.activity_feed 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_feed' AND policyname = 'Users can update their own activities') THEN
    CREATE POLICY "Users can update their own activities" ON public.activity_feed 
    FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_feed' AND policyname = 'Users can delete their own activities') THEN
    CREATE POLICY "Users can delete their own activities" ON public.activity_feed 
    FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create RLS policies for activity_reactions if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'activity_reactions' AND relrowsecurity = true) THEN
    ALTER TABLE public.activity_reactions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_reactions' AND policyname = 'Users can view activity reactions') THEN
    CREATE POLICY "Users can view activity reactions" ON public.activity_reactions 
    FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_reactions' AND policyname = 'Users can insert their own reactions') THEN
    CREATE POLICY "Users can insert their own reactions" ON public.activity_reactions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_reactions' AND policyname = 'Users can delete their own reactions') THEN
    CREATE POLICY "Users can delete their own reactions" ON public.activity_reactions 
    FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create RLS policies for activity_comments if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'activity_comments' AND relrowsecurity = true) THEN
    ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_comments' AND policyname = 'Users can view activity comments') THEN
    CREATE POLICY "Users can view activity comments" ON public.activity_comments 
    FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_comments' AND policyname = 'Users can insert their own comments') THEN
    CREATE POLICY "Users can insert their own comments" ON public.activity_comments 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_comments' AND policyname = 'Users can update their own comments') THEN
    CREATE POLICY "Users can update their own comments" ON public.activity_comments 
    FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_comments' AND policyname = 'Users can delete their own comments') THEN
    CREATE POLICY "Users can delete their own comments" ON public.activity_comments 
    FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
