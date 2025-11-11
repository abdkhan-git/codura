-- Function to automatically create social posts from activities
CREATE OR REPLACE FUNCTION public.handle_activity_auto_post()
RETURNS trigger AS $$
DECLARE
  privacy_settings RECORD;
  should_share BOOLEAN := FALSE;
  post_content TEXT;
  post_metadata JSONB;
BEGIN
  -- Get user's privacy settings
  SELECT * INTO privacy_settings
  FROM public.user_privacy_settings
  WHERE user_id = NEW.user_id;

  -- If no privacy settings exist, use defaults
  IF privacy_settings IS NULL THEN
    privacy_settings.share_problem_solved := TRUE;
    privacy_settings.share_achievements := TRUE;
    privacy_settings.share_streaks := TRUE;
    privacy_settings.share_study_plans := TRUE;
    privacy_settings.share_connections := FALSE;
  END IF;

  -- Determine if this activity should be shared
  CASE NEW.activity_type
    WHEN 'problem_solved' THEN
      should_share := privacy_settings.share_problem_solved;
      post_content := 'Just solved "' || COALESCE(NEW.metadata->>'problem_title', 'a problem') || '"! 🎯';
      post_metadata := jsonb_build_object(
        'auto_generated', true,
        'source_activity_id', NEW.id,
        'problem_id', NEW.target_problem_id,
        'difficulty', NEW.metadata->>'difficulty'
      );
    WHEN 'achievement_earned' THEN
      should_share := privacy_settings.share_achievements;
      post_content := 'Earned the "' || COALESCE(NEW.metadata->>'achievement_name', 'achievement') || '" achievement! 🏆';
      post_metadata := jsonb_build_object(
        'auto_generated', true,
        'source_activity_id', NEW.id,
        'achievement_id', NEW.metadata->>'achievement_id'
      );
    WHEN 'streak_milestone' THEN
      should_share := privacy_settings.share_streaks;
      post_content := 'Hit a ' || COALESCE(NEW.metadata->>'streak_days', '0') || '-day study streak! 🔥';
      post_metadata := jsonb_build_object(
        'auto_generated', true,
        'source_activity_id', NEW.id,
        'streak_days', NEW.metadata->>'streak_days'
      );
    WHEN 'study_plan_shared' THEN
      should_share := privacy_settings.share_study_plans;
      post_content := 'Shared my study plan: "' || COALESCE(NEW.metadata->>'plan_title', 'Study Plan') || '" 📚';
      post_metadata := jsonb_build_object(
        'auto_generated', true,
        'source_activity_id', NEW.id,
        'study_plan_id', NEW.target_study_plan_id
      );
    ELSE
      -- Don't share connection_made, profile_updated, or other activities
      should_share := FALSE;
  END CASE;

  -- Create social post if should share
  IF should_share THEN
    INSERT INTO public.social_posts (
      user_id,
      content,
      post_type,
      metadata,
      is_public,
      created_at
    ) VALUES (
      NEW.user_id,
      post_content,
      NEW.activity_type,
      post_metadata,
      TRUE,
      NEW.created_at
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS activity_auto_post_trigger ON public.activity_feed;

-- Create trigger
CREATE TRIGGER activity_auto_post_trigger
  AFTER INSERT ON public.activity_feed
  FOR EACH ROW EXECUTE FUNCTION public.handle_activity_auto_post();
