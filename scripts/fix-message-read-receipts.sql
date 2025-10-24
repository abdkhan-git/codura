-- Fix message read receipts functionality
-- This migration adds the missing read_by column and fixes the read receipt API

-- Add read_by column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS read_by uuid[] DEFAULT '{}'::uuid[];

-- Add delivery_status column to messages table if it doesn't exist
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'sent'::text CHECK (delivery_status = ANY (ARRAY['sending'::text, 'sent'::text, 'delivered'::text, 'read'::text, 'failed'::text]));

-- Create function to update read_by array when a message is marked as read
CREATE OR REPLACE FUNCTION public.mark_message_as_read(
  p_message_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_exists boolean;
  user_is_participant boolean;
  current_read_by uuid[];
BEGIN
  -- Check if message exists
  SELECT EXISTS(SELECT 1 FROM public.messages WHERE id = p_message_id) INTO message_exists;
  
  IF NOT message_exists THEN
    RETURN false;
  END IF;
  
  -- Check if user is a participant in the conversation
  SELECT EXISTS(
    SELECT 1 FROM public.conversation_participants cp
    JOIN public.messages m ON m.conversation_id = cp.conversation_id
    WHERE m.id = p_message_id 
    AND cp.user_id = p_user_id 
    AND cp.status = 'active'
  ) INTO user_is_participant;
  
  IF NOT user_is_participant THEN
    RETURN false;
  END IF;
  
  -- Don't mark own messages as read
  IF EXISTS(SELECT 1 FROM public.messages WHERE id = p_message_id AND sender_id = p_user_id) THEN
    RETURN true; -- Success but no action needed
  END IF;
  
  -- Get current read_by array
  SELECT read_by INTO current_read_by FROM public.messages WHERE id = p_message_id;
  
  -- Add user to read_by if not already there
  IF NOT (p_user_id = ANY(current_read_by)) THEN
    -- Update the read_by array
    UPDATE public.messages 
    SET 
      read_by = array_append(current_read_by, p_user_id),
      delivery_status = CASE 
        WHEN array_length(array_append(current_read_by, p_user_id), 1) > 0 THEN 'read'
        ELSE 'delivered'
      END
    WHERE id = p_message_id;
    
    -- Also insert into message_read_receipts table for consistency
    INSERT INTO public.message_read_receipts (message_id, user_id, read_at)
    VALUES (p_message_id, p_user_id, now())
    ON CONFLICT (message_id, user_id) DO NOTHING;
  END IF;
  
  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_message_as_read(uuid, uuid) TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_read_by ON public.messages USING GIN (read_by);
CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON public.messages (delivery_status);

-- Update existing messages to have proper delivery_status
UPDATE public.messages 
SET delivery_status = 'sent' 
WHERE delivery_status IS NULL;
