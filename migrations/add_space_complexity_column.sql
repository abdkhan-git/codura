-- Migration: Add space complexity column to submissions table
-- Description: Adds space_complexity and space_complexity_analysis fields

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS space_complexity VARCHAR(20),
ADD COLUMN IF NOT EXISTS space_complexity_analysis TEXT;

-- Add index for faster queries on space_complexity
CREATE INDEX IF NOT EXISTS idx_submissions_space_complexity ON submissions(space_complexity);

-- Add comment for documentation
COMMENT ON COLUMN submissions.space_complexity IS 'Big O notation for space complexity (e.g., O(1), O(n))';
COMMENT ON COLUMN submissions.space_complexity_analysis IS 'Detailed explanation of the detected space complexity';
