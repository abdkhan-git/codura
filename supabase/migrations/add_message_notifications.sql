-- Add message_notifications column to user_notification_preferences table
ALTER TABLE public.user_notification_preferences
ADD COLUMN IF NOT EXISTS message_notifications BOOLEAN DEFAULT true;
