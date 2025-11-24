-- Create study_pod_problem_threads table
-- Each problem in a pod can have one discussion thread
CREATE TABLE IF NOT EXISTS study_pod_problem_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES study_pods(id) ON DELETE CASCADE,
  problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,

  -- Thread metadata
  title TEXT,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,

  -- Stats (denormalized for performance)
  comment_count INTEGER NOT NULL DEFAULT 0,
  solution_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pod_id, problem_id)
);

-- Create thread_comments table
CREATE TABLE IF NOT EXISTS thread_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES study_pod_problem_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  parent_id UUID REFERENCES thread_comments(id) ON DELETE CASCADE,

  -- Comment type
  comment_type TEXT NOT NULL DEFAULT 'discussion' CHECK (comment_type IN ('discussion', 'solution', 'question', 'hint')),

  -- Content
  content TEXT NOT NULL,
  code_snippet TEXT,
  code_language TEXT,

  -- Solution-specific fields
  approach_title TEXT,
  time_complexity TEXT,
  space_complexity TEXT,

  -- Edit history
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,

  -- Status
  is_accepted_solution BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,

  -- Stats (denormalized)
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create thread_votes table
CREATE TABLE IF NOT EXISTS thread_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES thread_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Vote type: 1 for upvote, -1 for downvote
  vote_type INTEGER NOT NULL CHECK (vote_type IN (1, -1)),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(comment_id, user_id)
);

-- Create thread_bookmarks table
CREATE TABLE IF NOT EXISTS thread_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES thread_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Optional note
  note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(comment_id, user_id)
);

-- Create thread_reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS thread_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES thread_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Reaction type (emoji)
  reaction TEXT NOT NULL CHECK (reaction IN ('thumbs_up', 'thumbs_down', 'heart', 'rocket', 'eyes', 'tada', 'thinking', 'fire')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(comment_id, user_id, reaction)
);

-- Create indexes for performance (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS idx_threads_pod_id ON study_pod_problem_threads(pod_id);
CREATE INDEX IF NOT EXISTS idx_threads_problem_id ON study_pod_problem_threads(problem_id);
CREATE INDEX IF NOT EXISTS idx_threads_last_activity ON study_pod_problem_threads(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_thread_id ON thread_comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON thread_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON thread_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_type ON thread_comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON thread_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_upvotes ON thread_comments(upvotes DESC);

CREATE INDEX IF NOT EXISTS idx_votes_comment_id ON thread_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON thread_votes(user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON thread_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_comment_id ON thread_bookmarks(comment_id);

CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON thread_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON thread_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON thread_reactions(reaction);

-- Create function to update thread stats on comment changes
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
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for thread stats
DROP TRIGGER IF EXISTS trigger_update_thread_stats ON thread_comments;
CREATE TRIGGER trigger_update_thread_stats
AFTER INSERT OR DELETE ON thread_comments
FOR EACH ROW EXECUTE FUNCTION update_thread_stats();

-- Create function to update vote counts
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 1 THEN
      UPDATE thread_comments SET upvotes = upvotes + 1 WHERE id = NEW.comment_id;
    ELSE
      UPDATE thread_comments SET downvotes = downvotes + 1 WHERE id = NEW.comment_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 1 THEN
      UPDATE thread_comments SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.comment_id;
    ELSE
      UPDATE thread_comments SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = OLD.comment_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle vote change (e.g., upvote to downvote)
    IF OLD.vote_type != NEW.vote_type THEN
      IF OLD.vote_type = 1 THEN
        UPDATE thread_comments
        SET upvotes = GREATEST(upvotes - 1, 0), downvotes = downvotes + 1
        WHERE id = NEW.comment_id;
      ELSE
        UPDATE thread_comments
        SET downvotes = GREATEST(downvotes - 1, 0), upvotes = upvotes + 1
        WHERE id = NEW.comment_id;
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote counts
DROP TRIGGER IF EXISTS trigger_update_vote_counts ON thread_votes;
CREATE TRIGGER trigger_update_vote_counts
AFTER INSERT OR UPDATE OR DELETE ON thread_votes
FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_threads_updated_at ON study_pod_problem_threads;
CREATE TRIGGER trigger_threads_updated_at
BEFORE UPDATE ON study_pod_problem_threads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_comments_updated_at ON thread_comments;
CREATE TRIGGER trigger_comments_updated_at
BEFORE UPDATE ON thread_comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE study_pod_problem_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_pod_problem_threads
-- Drop existing policies first for idempotency
DROP POLICY IF EXISTS "Pod members can view threads" ON study_pod_problem_threads;
DROP POLICY IF EXISTS "Pod members can create threads" ON study_pod_problem_threads;
DROP POLICY IF EXISTS "Pod admins can update threads" ON study_pod_problem_threads;

-- Pod members can view threads
CREATE POLICY "Pod members can view threads"
ON study_pod_problem_threads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM study_pod_members
    WHERE study_pod_members.pod_id = study_pod_problem_threads.pod_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Pod members can create threads
CREATE POLICY "Pod members can create threads"
ON study_pod_problem_threads
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM study_pod_members
    WHERE study_pod_members.pod_id = study_pod_problem_threads.pod_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Pod owners and moderators can update threads
CREATE POLICY "Pod admins can update threads"
ON study_pod_problem_threads
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM study_pod_members
    WHERE study_pod_members.pod_id = study_pod_problem_threads.pod_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.role IN ('owner', 'moderator')
    AND study_pod_members.status = 'active'
  )
);

-- RLS Policies for thread_comments
-- Drop existing policies first for idempotency
DROP POLICY IF EXISTS "Pod members can view comments" ON thread_comments;
DROP POLICY IF EXISTS "Pod members can create comments" ON thread_comments;
DROP POLICY IF EXISTS "Users can update own comments, admins can update any" ON thread_comments;
DROP POLICY IF EXISTS "Users can delete own comments, admins can delete any" ON thread_comments;

-- Pod members can view comments
CREATE POLICY "Pod members can view comments"
ON thread_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM study_pod_problem_threads
    JOIN study_pod_members ON study_pod_problem_threads.pod_id = study_pod_members.pod_id
    WHERE study_pod_problem_threads.id = thread_comments.thread_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Pod members can create comments
CREATE POLICY "Pod members can create comments"
ON thread_comments
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM study_pod_problem_threads
    JOIN study_pod_members ON study_pod_problem_threads.pod_id = study_pod_members.pod_id
    WHERE study_pod_problem_threads.id = thread_comments.thread_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Users can update their own comments, admins can update any
CREATE POLICY "Users can update own comments, admins can update any"
ON thread_comments
FOR UPDATE
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM study_pod_problem_threads
    JOIN study_pod_members ON study_pod_problem_threads.pod_id = study_pod_members.pod_id
    WHERE study_pod_problem_threads.id = thread_comments.thread_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.role IN ('owner', 'moderator')
    AND study_pod_members.status = 'active'
  )
);

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete own comments, admins can delete any"
ON thread_comments
FOR DELETE
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM study_pod_problem_threads
    JOIN study_pod_members ON study_pod_problem_threads.pod_id = study_pod_members.pod_id
    WHERE study_pod_problem_threads.id = thread_comments.thread_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.role IN ('owner', 'moderator')
    AND study_pod_members.status = 'active'
  )
);

-- RLS Policies for thread_votes
-- Drop existing policies first for idempotency
DROP POLICY IF EXISTS "Pod members can view votes" ON thread_votes;
DROP POLICY IF EXISTS "Pod members can vote" ON thread_votes;
DROP POLICY IF EXISTS "Users can update own votes" ON thread_votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON thread_votes;

-- Pod members can view votes
CREATE POLICY "Pod members can view votes"
ON thread_votes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM thread_comments
    JOIN study_pod_problem_threads ON thread_comments.thread_id = study_pod_problem_threads.id
    JOIN study_pod_members ON study_pod_problem_threads.pod_id = study_pod_members.pod_id
    WHERE thread_comments.id = thread_votes.comment_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Pod members can vote
CREATE POLICY "Pod members can vote"
ON thread_votes
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM thread_comments
    JOIN study_pod_problem_threads ON thread_comments.thread_id = study_pod_problem_threads.id
    JOIN study_pod_members ON study_pod_problem_threads.pod_id = study_pod_members.pod_id
    WHERE thread_comments.id = thread_votes.comment_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Users can update their own votes
CREATE POLICY "Users can update own votes"
ON thread_votes
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes"
ON thread_votes
FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for thread_bookmarks
-- Drop existing policies first for idempotency
DROP POLICY IF EXISTS "Users can view own bookmarks" ON thread_bookmarks;
DROP POLICY IF EXISTS "Users can create bookmarks" ON thread_bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON thread_bookmarks;

-- Users can view their own bookmarks
CREATE POLICY "Users can view own bookmarks"
ON thread_bookmarks
FOR SELECT
USING (user_id = auth.uid());

-- Users can create bookmarks
CREATE POLICY "Users can create bookmarks"
ON thread_bookmarks
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
ON thread_bookmarks
FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for thread_reactions
-- Drop existing policies first for idempotency
DROP POLICY IF EXISTS "Pod members can view reactions" ON thread_reactions;
DROP POLICY IF EXISTS "Pod members can add reactions" ON thread_reactions;
DROP POLICY IF EXISTS "Users can remove own reactions" ON thread_reactions;

-- Pod members can view reactions
CREATE POLICY "Pod members can view reactions"
ON thread_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM thread_comments
    JOIN study_pod_problem_threads ON thread_comments.thread_id = study_pod_problem_threads.id
    JOIN study_pod_members ON study_pod_problem_threads.pod_id = study_pod_members.pod_id
    WHERE thread_comments.id = thread_reactions.comment_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Pod members can add reactions
CREATE POLICY "Pod members can add reactions"
ON thread_reactions
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM thread_comments
    JOIN study_pod_problem_threads ON thread_comments.thread_id = study_pod_problem_threads.id
    JOIN study_pod_members ON study_pod_problem_threads.pod_id = study_pod_members.pod_id
    WHERE thread_comments.id = thread_reactions.comment_id
    AND study_pod_members.user_id = auth.uid()
    AND study_pod_members.status = 'active'
  )
);

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
ON thread_reactions
FOR DELETE
USING (user_id = auth.uid());
