-- Fix problem_ids column type in study_plan_template_milestones
-- Change from uuid[] to integer[] to match problems table

BEGIN;

-- First, clear any existing data in problem_ids (they're wrong type anyway)
UPDATE study_plan_template_milestones
SET problem_ids = NULL;

-- Drop the old column
ALTER TABLE study_plan_template_milestones
DROP COLUMN IF EXISTS problem_ids;

-- Add the column with correct type
ALTER TABLE study_plan_template_milestones
ADD COLUMN problem_ids INTEGER[] DEFAULT '{}';

COMMIT;

-- Verify the change
DO $$
BEGIN
  RAISE NOTICE 'Column problem_ids type changed to integer[]';
END $$;

