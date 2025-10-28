-- Create user privacy settings table
CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_problem_solved boolean DEFAULT true,
  share_achievements boolean DEFAULT true,
  share_streaks boolean DEFAULT true,
  share_study_plans boolean DEFAULT true,
  share_connections boolean DEFAULT false, -- Default false as per user feedback
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_privacy_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_privacy_settings_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can view their own privacy settings" ON public.user_privacy_settings;
DROP POLICY IF EXISTS "Users can update their own privacy settings" ON public.user_privacy_settings;
DROP POLICY IF EXISTS "Users can insert their own privacy settings" ON public.user_privacy_settings;

-- Create policies
CREATE POLICY "Users can view their own privacy settings" ON public.user_privacy_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" ON public.user_privacy_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings" ON public.user_privacy_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to auto-create privacy settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_privacy_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_privacy_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created_privacy_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_privacy_settings();
