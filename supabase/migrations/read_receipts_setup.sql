-- Setup RLS policies and indexes for message_read_receipts

-- Enable RLS
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view read receipts for their conversations" ON public.message_read_receipts;
DROP POLICY IF EXISTS "Users can create read receipts for messages" ON public.message_read_receipts;
DROP POLICY IF EXISTS "Users can delete their own read receipts" ON public.message_read_receipts;

-- Policy: Users can view read receipts for messages in their conversations
CREATE POLICY "Users can view read receipts for their conversations"
  ON public.message_read_receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      INNER JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_read_receipts.message_id
      AND cp.user_id = auth.uid()
      AND cp.status = 'active'
    )
  );

-- Policy: Users can create read receipts for messages they can see
CREATE POLICY "Users can create read receipts for messages"
  ON public.message_read_receipts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      INNER JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_read_receipts.message_id
      AND cp.user_id = auth.uid()
      AND cp.status = 'active'
    )
  );

-- Policy: Users can delete their own read receipts
CREATE POLICY "Users can delete their own read receipts"
  ON public.message_read_receipts FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id
  ON public.message_read_receipts(message_id);

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_id
  ON public.message_read_receipts(user_id);

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_user
  ON public.message_read_receipts(message_id, user_id);

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_read_at
  ON public.message_read_receipts(read_at DESC);

-- Add unique constraint to prevent duplicate read receipts
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_read_receipts_unique
  ON public.message_read_receipts(message_id, user_id);
