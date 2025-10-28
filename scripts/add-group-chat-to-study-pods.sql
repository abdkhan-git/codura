-- Migration: Add group chat support to study pods
-- Adds group_chat_id column and automatically adds new members to the group chat

-- Add group_chat_id column to study_pods table
ALTER TABLE study_pods
ADD COLUMN IF NOT EXISTS group_chat_id uuid REFERENCES conversations(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_study_pods_group_chat_id ON study_pods(group_chat_id);

-- Add comment
COMMENT ON COLUMN study_pods.group_chat_id IS 'Reference to the group chat conversation for this study pod';
