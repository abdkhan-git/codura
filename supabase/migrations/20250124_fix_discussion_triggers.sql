-- =====================================================
-- IMPORTANT: Prerequisites
-- =====================================================
-- You MUST run 20250123_problem_discussion_threads.sql FIRST
-- to create the base tables (thread_comments, thread_votes,
-- thread_reactions, thread_bookmarks, study_pod_problem_threads)
-- =====================================================

-- Fix vote count triggers for thread_votes
-- This ensures upvotes and downvotes are properly updated when votes change

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_vote_counts ON thread_votes;
DROP FUNCTION IF EXISTS update_vote_counts();

-- Create improved function to update vote counts
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 1 THEN
      UPDATE thread_comments SET upvotes = upvotes + 1 WHERE id = NEW.comment_id;
    ELSIF NEW.vote_type = -1 THEN
      UPDATE thread_comments SET downvotes = downvotes + 1 WHERE id = NEW.comment_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 1 THEN
      UPDATE thread_comments SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.comment_id;
    ELSIF OLD.vote_type = -1 THEN
      UPDATE thread_comments SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = OLD.comment_id;
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle vote change (e.g., upvote to downvote)
    IF OLD.vote_type != NEW.vote_type THEN
      IF OLD.vote_type = 1 THEN
        -- Was upvote, now downvote
        UPDATE thread_comments
        SET upvotes = GREATEST(upvotes - 1, 0), downvotes = downvotes + 1
        WHERE id = NEW.comment_id;
      ELSIF OLD.vote_type = -1 THEN
        -- Was downvote, now upvote
        UPDATE thread_comments
        SET downvotes = GREATEST(downvotes - 1, 0), upvotes = upvotes + 1
        WHERE id = NEW.comment_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for vote counts
CREATE TRIGGER trigger_update_vote_counts
AFTER INSERT OR UPDATE OR DELETE ON thread_votes
FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

-- Fix thread stats trigger
DROP TRIGGER IF EXISTS trigger_update_thread_stats ON thread_comments;
DROP FUNCTION IF EXISTS update_thread_stats();

CREATE OR REPLACE FUNCTION update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE study_pod_problem_threads
    SET
      comment_count = comment_count + 1,
      solution_count = CASE WHEN NEW.comment_type = 'solution' THEN solution_count + 1 ELSE solution_count END,
      last_activity_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.thread_id;

    -- Update parent reply count if this is a reply
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE thread_comments
      SET reply_count = reply_count + 1
      WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE study_pod_problem_threads
    SET
      comment_count = GREATEST(comment_count - 1, 0),
      solution_count = CASE WHEN OLD.comment_type = 'solution' THEN GREATEST(solution_count - 1, 0) ELSE solution_count END,
      updated_at = NOW()
    WHERE id = OLD.thread_id;

    -- Update parent reply count if this was a reply
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE thread_comments
      SET reply_count = GREATEST(reply_count - 1, 0)
      WHERE id = OLD.parent_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for thread stats
CREATE TRIGGER trigger_update_thread_stats
AFTER INSERT OR DELETE ON thread_comments
FOR EACH ROW EXECUTE FUNCTION update_thread_stats();

-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create index for faster bookmark lookups by user
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_comment ON thread_bookmarks(user_id, comment_id);

-- Create index for faster reaction lookups
CREATE INDEX IF NOT EXISTS idx_reactions_comment_user ON thread_reactions(comment_id, user_id);

-- Add a view for user's bookmarked comments with full details
CREATE OR REPLACE VIEW user_bookmarked_comments AS
SELECT
  tb.id as bookmark_id,
  tb.user_id as bookmark_user_id,
  tb.note as bookmark_note,
  tb.created_at as bookmarked_at,
  tc.*,
  sppt.pod_id,
  sppt.problem_id,
  p.title as problem_title,
  p.difficulty as problem_difficulty,
  u.username as author_username,
  u.full_name as author_full_name,
  u.avatar_url as author_avatar_url
FROM thread_bookmarks tb
JOIN thread_comments tc ON tb.comment_id = tc.id
JOIN study_pod_problem_threads sppt ON tc.thread_id = sppt.id
JOIN problems p ON sppt.problem_id = p.id
LEFT JOIN users u ON tc.user_id = u.user_id;

-- Grant access to the view
GRANT SELECT ON user_bookmarked_comments TO authenticated;
