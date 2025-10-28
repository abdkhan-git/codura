-- ============================================================================
-- FIX TYPING INDICATORS
-- ============================================================================
-- Add unique constraint and auto-cleanup for typing indicators
-- ============================================================================

-- Drop existing typing indicators table if it exists
DROP TABLE IF EXISTS public.conversation_typing_indicators CASCADE;

-- Create typing indicators table with proper constraints
CREATE TABLE public.conversation_typing_indicators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  started_typing_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversation_typing_indicators_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_typing_indicators_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT conversation_typing_indicators_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT conversation_typing_indicators_unique UNIQUE (conversation_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_typing_indicators_conversation ON public.conversation_typing_indicators(conversation_id);
CREATE INDEX idx_typing_indicators_timestamp ON public.conversation_typing_indicators(started_typing_at);

-- Add RLS policies
ALTER TABLE public.conversation_typing_indicators ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see typing indicators in conversations they're part of
CREATE POLICY "Users can see typing in their conversations"
  ON public.conversation_typing_indicators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_typing_indicators.conversation_id
      AND cp.user_id = auth.uid()
      AND cp.status = 'active'
    )
  );

-- Policy: Users can insert their own typing indicator
CREATE POLICY "Users can insert own typing indicator"
  ON public.conversation_typing_indicators
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own typing indicator
CREATE POLICY "Users can update own typing indicator"
  ON public.conversation_typing_indicators
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own typing indicator
CREATE POLICY "Users can delete own typing indicator"
  ON public.conversation_typing_indicators
  FOR DELETE
  USING (auth.uid() = user_id);

-- Drop existing function if it exists (to avoid return type conflicts)
DROP FUNCTION IF EXISTS cleanup_old_typing_indicators();

-- Create function to auto-cleanup old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM public.conversation_typing_indicators
  WHERE started_typing_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- END FIX TYPING INDICATORS
-- ============================================================================
