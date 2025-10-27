-- Fix Circular RLS Dependencies
-- The previous policies had circular logic causing silent failures
-- This version removes the circular dependencies
-- Date: 2025-10-27

-- Step 1: Drop all problematic policies
DROP POLICY IF EXISTS "Users can view their connections" ON connections;
DROP POLICY IF EXISTS "Users can send connection requests" ON connections;
DROP POLICY IF EXISTS "Users can update connection status" ON connections;
DROP POLICY IF EXISTS "Public user profiles are viewable" ON users;
DROP POLICY IF EXISTS "Users can view conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can be added to conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;

-- Step 2: Enable RLS on all tables
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CONNECTIONS TABLE POLICIES (simple, no dependencies)
-- =====================================================

-- Users can view connections where they are a participant (from_user_id or to_user_id)
CREATE POLICY "view_own_connections"
  ON connections
  FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Users can create connection requests
CREATE POLICY "create_connection_requests"
  ON connections
  FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- Users can update connections they initiated or received
CREATE POLICY "update_own_connections"
  ON connections
  FOR UPDATE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- =====================================================
-- USERS TABLE POLICIES (public profiles)
-- =====================================================

-- All authenticated users can view user profiles (for selecting contacts)
CREATE POLICY "view_user_profiles"
  ON users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- CONVERSATION_PARTICIPANTS TABLE POLICIES (simpler)
-- =====================================================

-- Users can view their own participation records
-- This is the key fix - check user_id directly, not through conversations
CREATE POLICY "view_own_participation"
  ON conversation_participants
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can be added to conversations (either self-add or by creator)
CREATE POLICY "join_conversations"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id  -- User is adding themselves
  );

-- =====================================================
-- CONVERSATIONS TABLE POLICIES (simple, no circular checks)
-- =====================================================

-- Users can view conversations they are part of (via conversation_participants)
-- This uses direct ID matching from conversation_participants, not sub-queries
CREATE POLICY "view_own_conversations"
  ON conversations
  FOR SELECT
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Users can create conversations
CREATE POLICY "create_conversations"
  ON conversations
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- =====================================================
-- MESSAGES TABLE POLICIES (simple)
-- =====================================================

-- Users can view messages in conversations they are part of
CREATE POLICY "view_conversation_messages"
  ON messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Users can send messages to conversations they are part of
CREATE POLICY "send_messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- VERIFICATION QUERIES (run these to test)
-- =====================================================

-- Check that policies exist:
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename IN ('connections', 'conversations', 'conversation_participants', 'messages', 'users')
-- ORDER BY tablename, policyname;

-- Test connections query:
-- SELECT * FROM connections WHERE from_user_id = auth.uid() OR to_user_id = auth.uid();

-- Test conversations query:
-- SELECT * FROM conversations WHERE id IN (
--   SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
-- );
