-- Migration: Add pin and archive support to conversations
-- Adds is_pinned column to conversation_participants table for per-user pinning

-- Add is_pinned column to conversation_participants for per-user pinning
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversation_participants_pinned
ON conversation_participants(user_id, is_pinned)
WHERE is_pinned = true;

-- Add comment
COMMENT ON COLUMN conversation_participants.is_pinned IS 'Whether this conversation is pinned for this user';

-- Note: is_archived already exists in conversations table
-- We can use that for archiving conversations
