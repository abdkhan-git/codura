-- Create function to create activities
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
