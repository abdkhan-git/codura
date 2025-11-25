-- Migration: Add complexity code snippets columns to submissions table
-- Description: Adds time_complexity_snippets and space_complexity_snippets fields to store AI-generated code snippets

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS time_complexity_snippets TEXT[],
ADD COLUMN IF NOT EXISTS space_complexity_snippets TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN submissions.time_complexity_snippets IS 'AI-generated code snippets explaining what causes the time complexity';
COMMENT ON COLUMN submissions.space_complexity_snippets IS 'AI-generated code snippets explaining what causes the space complexity';
