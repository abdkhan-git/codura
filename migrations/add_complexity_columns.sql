-- Migration: Add complexity analysis columns to submissions table
-- Description: Adds time_complexity, complexity_confidence, and complexity_analysis fields

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS time_complexity VARCHAR(20),
ADD COLUMN IF NOT EXISTS complexity_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS complexity_analysis TEXT;

-- Add index for faster queries on time_complexity
CREATE INDEX IF NOT EXISTS idx_submissions_time_complexity ON submissions(time_complexity);

-- Add comment for documentation
COMMENT ON COLUMN submissions.time_complexity IS 'Big O notation for time complexity (e.g., O(n), O(n²))';
COMMENT ON COLUMN submissions.complexity_confidence IS 'Confidence score for complexity analysis (0.0 to 1.0)';
COMMENT ON COLUMN submissions.complexity_analysis IS 'Detailed explanation of the detected complexity';
