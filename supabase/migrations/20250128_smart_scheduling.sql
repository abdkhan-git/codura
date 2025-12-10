-- =====================================================
-- Smart Scheduling & Session Management
-- =====================================================
-- Adds member availability tracking and intelligent scheduling features

-- =====================================================
-- 1. Member Availability Table
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_member_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time slot
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',

  -- Recurrence
  is_recurring BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_until DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_member_availability_pod ON study_pod_member_availability(pod_id);
CREATE INDEX idx_member_availability_user ON study_pod_member_availability(user_id);
CREATE INDEX idx_member_availability_day ON study_pod_member_availability(day_of_week);
CREATE INDEX idx_member_availability_active ON study_pod_member_availability(is_active) WHERE is_active = true;

-- =====================================================
-- 2. Session Reminders Table (extends notifications)
-- =====================================================
CREATE TABLE IF NOT EXISTS study_pod_session_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES study_pod_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Reminder timing
  remind_at TIMESTAMPTZ NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24_hours', '1_hour', '15_minutes', 'custom')),

  -- Status
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,

  -- Delivery method
  delivery_method TEXT[] DEFAULT ARRAY['in_app'], -- in_app, email, push

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, user_id, reminder_type)
);

CREATE INDEX idx_session_reminders_session ON study_pod_session_reminders(session_id);
CREATE INDEX idx_session_reminders_user ON study_pod_session_reminders(user_id);
CREATE INDEX idx_session_reminders_pending ON study_pod_session_reminders(remind_at)
  WHERE is_sent = false;

-- =====================================================
-- 3. Optimal Meeting Times Cache Table
-- =====================================================
-- Stores calculated optimal meeting times for pods
CREATE TABLE IF NOT EXISTS study_pod_optimal_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,

  -- Time slot
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Metrics
  available_members_count INTEGER NOT NULL,
  total_members_count INTEGER NOT NULL,
  availability_percentage DECIMAL(5,2) NOT NULL,

  -- Confidence score based on consistency of availability
  confidence_score DECIMAL(5,2), -- 0-100

  -- Common timezone for this slot
  suggested_timezone TEXT,

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  metadata JSONB DEFAULT '{}'::jsonb,

  UNIQUE(pod_id, day_of_week, start_time)
);

CREATE INDEX idx_optimal_times_pod ON study_pod_optimal_times(pod_id);
CREATE INDEX idx_optimal_times_availability ON study_pod_optimal_times(availability_percentage DESC);
CREATE INDEX idx_optimal_times_expires ON study_pod_optimal_times(expires_at);

-- =====================================================
-- 4. Session Attendance Streaks Table
-- =====================================================
-- Track consistency and attendance patterns
CREATE TABLE IF NOT EXISTS study_pod_attendance_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_sessions_attended INTEGER DEFAULT 0,
  total_sessions_missed INTEGER DEFAULT 0,

  last_attended_session_id UUID REFERENCES study_pod_sessions(id),
  last_attended_at TIMESTAMPTZ,

  streak_started_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pod_id, user_id)
);

CREATE INDEX idx_attendance_streaks_pod ON study_pod_attendance_streaks(pod_id);
CREATE INDEX idx_attendance_streaks_user ON study_pod_attendance_streaks(user_id);
CREATE INDEX idx_attendance_streaks_current ON study_pod_attendance_streaks(current_streak DESC);

-- =====================================================
-- Functions
-- =====================================================

-- Function to calculate optimal meeting times for a pod
CREATE OR REPLACE FUNCTION calculate_optimal_meeting_times(p_pod_id UUID)
RETURNS TABLE(
  day_of_week INTEGER,
  start_time TIME,
  end_time TIME,
  available_count INTEGER,
  total_count INTEGER,
  percentage DECIMAL(5,2)
) AS $$
DECLARE
  v_total_members INTEGER;
BEGIN
  -- Get total active members
  SELECT COUNT(*) INTO v_total_members
  FROM study_pod_members
  WHERE pod_id = p_pod_id AND status = 'active';

  -- Find overlapping availability slots
  RETURN QUERY
  SELECT
    a.day_of_week,
    a.start_time,
    a.end_time,
    COUNT(DISTINCT a.user_id)::INTEGER as available_count,
    v_total_members as total_count,
    ROUND((COUNT(DISTINCT a.user_id)::DECIMAL / NULLIF(v_total_members, 0) * 100), 2) as percentage
  FROM study_pod_member_availability a
  WHERE a.pod_id = p_pod_id
    AND a.is_active = true
    AND (a.valid_until IS NULL OR a.valid_until >= CURRENT_DATE)
  GROUP BY a.day_of_week, a.start_time, a.end_time
  HAVING COUNT(DISTINCT a.user_id) >= (v_total_members * 0.6) -- At least 60% availability
  ORDER BY percentage DESC, available_count DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh optimal times cache for a pod
CREATE OR REPLACE FUNCTION refresh_optimal_times_cache(p_pod_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete expired cache
  DELETE FROM study_pod_optimal_times
  WHERE pod_id = p_pod_id;

  -- Insert new calculations
  INSERT INTO study_pod_optimal_times (
    pod_id, day_of_week, start_time, end_time,
    available_members_count, total_members_count, availability_percentage
  )
  SELECT
    p_pod_id,
    day_of_week,
    start_time,
    end_time,
    available_count,
    total_count,
    percentage
  FROM calculate_optimal_meeting_times(p_pod_id);
END;
$$ LANGUAGE plpgsql;

-- Function to create automatic reminders when session is scheduled
CREATE OR REPLACE FUNCTION create_session_reminders()
RETURNS TRIGGER AS $$
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

DROP TRIGGER IF EXISTS trigger_create_session_reminders ON study_pod_sessions;
CREATE TRIGGER trigger_create_session_reminders
AFTER INSERT ON study_pod_sessions
FOR EACH ROW EXECUTE FUNCTION create_session_reminders();

-- Function to update attendance streaks
CREATE OR REPLACE FUNCTION update_attendance_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_previous_session_id UUID;
  v_previous_session_time TIMESTAMPTZ;
  v_streak_record RECORD;
BEGIN
  -- Get or create streak record
  INSERT INTO study_pod_attendance_streaks (pod_id, user_id, current_streak, total_sessions_attended)
  VALUES (
    (SELECT pod_id FROM study_pod_sessions WHERE id = NEW.session_id),
    NEW.user_id,
    1,
    1
  )
  ON CONFLICT (pod_id, user_id) DO NOTHING;

  -- Get streak record
  SELECT * INTO v_streak_record
  FROM study_pod_attendance_streaks sas
  JOIN study_pod_sessions s ON s.pod_id = sas.pod_id
  WHERE sas.user_id = NEW.user_id
    AND s.id = NEW.session_id;

  -- Check if this continues the streak
  IF v_streak_record.last_attended_session_id IS NOT NULL THEN
    SELECT scheduled_at INTO v_previous_session_time
    FROM study_pod_sessions
    WHERE id = v_streak_record.last_attended_session_id;

    -- If sessions are within 14 days, continue streak
    IF (NEW.joined_at - v_previous_session_time) <= INTERVAL '14 days' THEN
      UPDATE study_pod_attendance_streaks
      SET
        current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        total_sessions_attended = total_sessions_attended + 1,
        last_attended_session_id = NEW.session_id,
        last_attended_at = NEW.joined_at,
        updated_at = NOW()
      WHERE pod_id = v_streak_record.pod_id
        AND user_id = NEW.user_id;
    ELSE
      -- Streak broken, restart
      UPDATE study_pod_attendance_streaks
      SET
        current_streak = 1,
        longest_streak = GREATEST(longest_streak, 1),
        total_sessions_attended = total_sessions_attended + 1,
        last_attended_session_id = NEW.session_id,
        last_attended_at = NEW.joined_at,
        streak_started_at = NEW.joined_at,
        updated_at = NOW()
      WHERE pod_id = v_streak_record.pod_id
        AND user_id = NEW.user_id;
    END IF;
  ELSE
    -- First session
    UPDATE study_pod_attendance_streaks
    SET
      current_streak = 1,
      longest_streak = 1,
      total_sessions_attended = 1,
      last_attended_session_id = NEW.session_id,
      last_attended_at = NEW.joined_at,
      streak_started_at = NEW.joined_at,
      updated_at = NOW()
    WHERE pod_id = v_streak_record.pod_id
      AND user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_attendance_streak ON study_pod_session_attendance;
CREATE TRIGGER trigger_update_attendance_streak
AFTER INSERT ON study_pod_session_attendance
FOR EACH ROW EXECUTE FUNCTION update_attendance_streak();

-- Function to refresh optimal times when availability changes
CREATE OR REPLACE FUNCTION refresh_optimal_times_on_availability_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh cache asynchronously (in practice, you'd use a job queue)
  PERFORM refresh_optimal_times_cache(COALESCE(NEW.pod_id, OLD.pod_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_refresh_optimal_times ON study_pod_member_availability;
CREATE TRIGGER trigger_refresh_optimal_times
AFTER INSERT OR UPDATE OR DELETE ON study_pod_member_availability
FOR EACH ROW EXECUTE FUNCTION refresh_optimal_times_on_availability_change();

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE study_pod_member_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_session_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_optimal_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_pod_attendance_streaks ENABLE ROW LEVEL SECURITY;

-- Member Availability Policies
CREATE POLICY "Pod members can view pod availability"
  ON study_pod_member_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_member_availability.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "Users can manage their own availability"
  ON study_pod_member_availability FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Session Reminders Policies
CREATE POLICY "Users can view their own reminders"
  ON study_pod_session_reminders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own reminders"
  ON study_pod_session_reminders FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can create reminders"
  ON study_pod_session_reminders FOR INSERT
  WITH CHECK (true); -- Created by trigger

-- Optimal Times Policies
CREATE POLICY "Pod members can view optimal times"
  ON study_pod_optimal_times FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_optimal_times.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    )
  );

CREATE POLICY "Pod admins can manage optimal times"
  ON study_pod_optimal_times FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_optimal_times.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

-- Attendance Streaks Policies
CREATE POLICY "Pod members can view pod streaks"
  ON study_pod_attendance_streaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_pod_members
      WHERE study_pod_members.pod_id = study_pod_attendance_streaks.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.status = 'active'
    )
  );

-- Add notification type for session reminders
DO $$
BEGIN
  -- Check if the column exists and has a constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notifications_notification_type_check'
  ) THEN
    -- Extend the notification_type check constraint
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
    ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check
      CHECK (notification_type IN (
        'connection_request', 'connection_accepted', 'connection_milestone',
        'activity_reaction', 'activity_comment', 'study_plan_shared',
        'achievement_milestone', 'system_announcement', 'message',
        'session_reminder', 'session_starting', 'session_invitation'
      ));
  END IF;
END $$;

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Smart scheduling migration completed successfully';
  RAISE NOTICE 'Tables: study_pod_member_availability, study_pod_session_reminders, study_pod_optimal_times, study_pod_attendance_streaks';
END $$;
