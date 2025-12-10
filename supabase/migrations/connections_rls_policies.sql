-- Fix Connections Table RLS Policies
-- This resolves the silent RLS errors preventing users from viewing their connections
-- Date: 2025-10-27

-- Step 1: Drop ALL existing policies on affected tables to start fresh
-- Connections table
DROP POLICY IF EXISTS "Users can view their connections" ON connections;
DROP POLICY IF EXISTS "Users can create connections" ON connections;
DROP POLICY IF EXISTS "Users can update connection status" ON connections;
DROP POLICY IF EXISTS "Anyone can view connections" ON connections;
DROP POLICY IF EXISTS "Users can send connection requests" ON connections;

-- Users table
DROP POLICY IF EXISTS "Public user profiles are viewable" ON users;
DROP POLICY IF EXISTS "Users can view all users" ON users;

-- Conversations table
DROP POLICY IF EXISTS "Users can view conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

-- Conversation participants table
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can be added to conversations" ON conversation_participants;

-- Messages table
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;

-- Step 2: Ensure RLS is enabled on all tables
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Step 3: Create comprehensive RLS policies for connections

-- Allow users to view connections where they are either party (sent or received)
CREATE POLICY "Users can view their connections"
  ON connections
  FOR SELECT
  USING (
    auth.uid() = from_user_id
    OR auth.uid() = to_user_id
  );

-- Allow users to create connection requests (initiate)
CREATE POLICY "Users can send connection requests"
  ON connections
  FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id
  );

-- Allow users to accept/reject/cancel connections
CREATE POLICY "Users can update connection status"
  ON connections
  FOR UPDATE
  USING (
    auth.uid() = from_user_id
    OR auth.uid() = to_user_id
  )
  WITH CHECK (
    auth.uid() = from_user_id
    OR auth.uid() = to_user_id
  );

-- Step 4: Create RLS policies for users table (for nested select)
-- Allow users to view other users' public profiles
CREATE POLICY "Public user profiles are viewable"
  ON users
  FOR SELECT
  USING (true);

-- Step 5: Create RLS policies for conversations table
-- Allow users to view conversations they are part of
CREATE POLICY "Users can view conversations"
  ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.status = 'active'
    )
  );

-- Allow users to create conversations
CREATE POLICY "Users can create conversations"
  ON conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
  );

-- Step 6: Create RLS policies for conversation_participants table
-- Allow users to view participant lists of conversations they're in
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = auth.uid()
      AND cp2.status = 'active'
    )
  );

-- Allow users to be added to conversations
CREATE POLICY "Users can be added to conversations"
  ON conversation_participants
  FOR INSERT
  WITH CHECK (
    -- User is being added by conversation creator
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_participants.conversation_id
      AND conversations.created_by = auth.uid()
    )
    OR
    -- User is adding themselves
    auth.uid() = user_id
  );

-- Step 7: Create RLS policies for messages table
-- Allow users to view messages in conversations they're part of
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.status = 'active'
    )
  );

-- Allow users to send messages in conversations they're part of
CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.status = 'active'
    )
  );

-- Step 8: Verify policies were created
-- Run this query to check all policies on connections table:
-- SELECT * FROM pg_policies WHERE tablename = 'connections';
