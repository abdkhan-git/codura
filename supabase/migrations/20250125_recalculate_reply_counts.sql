-- =====================================================
-- Recalculate Reply Counts for Existing Comments
-- =====================================================
-- This migration fixes reply_count discrepancies for existing data
-- The trigger in 20250124_fix_discussion_triggers.sql handles new replies correctly,
-- but existing data may have incorrect counts

-- Update reply_count for all comments based on actual replies
UPDATE thread_comments
SET reply_count = (
  SELECT COUNT(*)
  FROM thread_comments AS replies
  WHERE replies.parent_id = thread_comments.id
);

-- Verify the counts are correct
DO $$
DECLARE
  total_updated INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_updated
  FROM thread_comments
  WHERE reply_count > 0;

  RAISE NOTICE 'Updated reply counts. Found % comments with replies.', total_updated;
END $$;
