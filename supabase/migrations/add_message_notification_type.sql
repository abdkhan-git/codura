-- Add 'message' to the notification type constraints

-- First, drop the existing constraint on the 'type' column
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the constraint back with 'message' included
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['connection_request'::text, 'connection_accepted'::text, 'connection_milestone'::text, 'activity_reaction'::text, 'study_plan_shared'::text, 'achievement_milestone'::text, 'message'::text]));

-- Do the same for notification_type column
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type = ANY (ARRAY['connection_request'::text, 'connection_accepted'::text, 'connection_milestone'::text, 'activity_reaction'::text, 'activity_comment'::text, 'study_plan_shared'::text, 'achievement_milestone'::text, 'system_announcement'::text, 'message'::text]));
