-- Fix session reminders trigger to bypass RLS
-- The trigger needs to run with SECURITY DEFINER to bypass RLS policies

-- Recreate the trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_session_reminders()
RETURNS TRIGGER
SECURITY DEFINER  -- This allows the function to bypass RLS
SET search_path = public
AS $$
BEGIN
  -- Only create reminders for future sessions
  IF NEW.scheduled_at > NOW() THEN
    -- 24 hours before
    IF NEW.scheduled_at > NOW() + INTERVAL '24 hours' THEN
      INSERT INTO study_pod_session_reminders (session_id, user_id, remind_at, reminder_type)
      SELECT
        NEW.id,
        spm.user_id,
        NEW.scheduled_at - INTERVAL '24 hours',
        '24_hours'
      FROM study_pod_members spm
      WHERE spm.pod_id = NEW.pod_id AND spm.status = 'active'
      ON CONFLICT (session_id, user_id, reminder_type) DO NOTHING;
    END IF;

    -- 1 hour before
    IF NEW.scheduled_at > NOW() + INTERVAL '1 hour' THEN
      INSERT INTO study_pod_session_reminders (session_id, user_id, remind_at, reminder_type)
      SELECT
        NEW.id,
        spm.user_id,
        NEW.scheduled_at - INTERVAL '1 hour',
        '1_hour'
      FROM study_pod_members spm
      WHERE spm.pod_id = NEW.pod_id AND spm.status = 'active'
      ON CONFLICT (session_id, user_id, reminder_type) DO NOTHING;
    END IF;

    -- 15 minutes before
    IF NEW.scheduled_at > NOW() + INTERVAL '15 minutes' THEN
      INSERT INTO study_pod_session_reminders (session_id, user_id, remind_at, reminder_type)
      SELECT
        NEW.id,
        spm.user_id,
        NEW.scheduled_at - INTERVAL '15 minutes',
        '15_minutes'
      FROM study_pod_members spm
      WHERE spm.pod_id = NEW.pod_id AND spm.status = 'active'
      ON CONFLICT (session_id, user_id, reminder_type) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE 'Session reminders trigger updated with SECURITY DEFINER';
  RAISE NOTICE 'The trigger can now bypass RLS policies when creating reminders';
END $$;