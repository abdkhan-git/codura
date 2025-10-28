-- ============================================================================
-- DIAGNOSTIC DEBUGGER MIGRATIONS - MESSAGES & CONNECTIONS
-- ============================================================================
-- This file contains SQL queries and views to help debug:
-- 1. Why connections aren't fetching properly
-- 2. Why study pod chats aren't auto-created
-- 3. Data structure and relationships
--
-- Run these queries individually in Supabase SQL editor to see results
-- Then export and provide the output for analysis
-- ============================================================================

-- ============================================================================
-- 1. CHECK CONNECTIONS TABLE STRUCTURE & DATA
-- ============================================================================

-- View 1: Show all connections with proper details
CREATE OR REPLACE VIEW connections_debug AS
SELECT
  c.id,
  c.from_user_id,
  c.to_user_id,
  c.status,
  c.created_at,
  fu.full_name as from_user_name,
  fu.email as from_user_email,
  tu.full_name as to_user_name,
  tu.email as to_user_email,
  c.message as connection_message
FROM connections c
LEFT JOIN users fu ON c.from_user_id = fu.id
LEFT JOIN users tu ON c.to_user_id = tu.id
ORDER BY c.created_at DESC;

-- View 2: Check specific user's connections (both directions)
CREATE OR REPLACE VIEW user_connections_debug(user_id) AS
SELECT
  c.id,
  CASE
    WHEN c.from_user_id = $1 THEN 'sent_to'
    WHEN c.to_user_id = $1 THEN 'received_from'
  END as direction,
  c.from_user_id,
  c.to_user_id,
  CASE
    WHEN c.from_user_id = $1 THEN tu.full_name
    WHEN c.to_user_id = $1 THEN fu.full_name
  END as other_user_name,
  CASE
    WHEN c.from_user_id = $1 THEN tu.email
    WHEN c.to_user_id = $1 THEN fu.email
  END as other_user_email,
  c.status,
  c.created_at
FROM connections c
LEFT JOIN users fu ON c.from_user_id = fu.id
LEFT JOIN users tu ON c.to_user_id = tu.id
WHERE c.from_user_id = $1 OR c.to_user_id = $1
ORDER BY c.created_at DESC;

-- Query 1: Count all connections by status
SELECT
  status,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM connections
GROUP BY status;

-- Query 2: Show all accepted connections
SELECT
  c.id,
  fu.full_name as from_user,
  tu.full_name as to_user,
  c.status,
  c.created_at
FROM connections c
LEFT JOIN users fu ON c.from_user_id = fu.id
LEFT JOIN users tu ON c.to_user_id = tu.id
WHERE c.status = 'accepted'
ORDER BY c.created_at DESC;

-- ============================================================================
-- 2. CHECK CONVERSATIONS TABLE & STRUCTURE
-- ============================================================================

-- View: Show all conversations with member counts
CREATE OR REPLACE VIEW conversations_debug AS
SELECT
  c.id,
  c.type,
  c.name,
  c.created_by,
  cb.full_name as creator_name,
  c.created_at,
  c.updated_at,
  COUNT(DISTINCT cp.user_id) as member_count,
  c.last_message_preview,
  c.last_message_at
FROM conversations c
LEFT JOIN users cb ON c.created_by = cb.id
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.status = 'active'
GROUP BY c.id, c.type, c.name, c.created_by, cb.full_name, c.created_at, c.updated_at, c.last_message_preview, c.last_message_at
ORDER BY c.updated_at DESC;

-- Query 3: Show conversation types and counts
SELECT
  type,
  COUNT(*) as total
FROM conversations
GROUP BY type;

-- Query 4: Show direct conversations with participants
SELECT
  c.id,
  c.type,
  STRING_AGG(DISTINCT u.full_name, ', ') as participants,
  COUNT(DISTINCT cp.user_id) as member_count,
  c.created_at
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.status = 'active'
LEFT JOIN users u ON cp.user_id = u.id
WHERE c.type = 'direct'
GROUP BY c.id, c.type, c.created_at
ORDER BY c.created_at DESC;

-- ============================================================================
-- 3. CHECK STUDY PODS & GROUP CHAT RELATIONSHIPS
-- ============================================================================

-- View: Study pods with their group chat info
CREATE OR REPLACE VIEW study_pods_debug AS
SELECT
  sp.id,
  sp.name,
  sp.description,
  u.full_name as created_by,
  sp.created_at,
  COUNT(DISTINCT spm.user_id) as member_count,
  (
    SELECT c.id
    FROM conversations c
    WHERE c.type = 'pod_chat'
    AND c.name = sp.name
    LIMIT 1
  ) as pod_chat_conversation_id
FROM study_pods sp
LEFT JOIN users u ON sp.created_by = u.id
LEFT JOIN study_pod_members spm ON sp.id = spm.pod_id AND spm.status = 'active'
GROUP BY sp.id, sp.name, sp.description, u.full_name, sp.created_at
ORDER BY sp.created_at DESC;

-- Query 5: Show all study pods and their group chats
SELECT
  sp.id as pod_id,
  sp.name as pod_name,
  COUNT(DISTINCT spm.user_id) as pod_member_count,
  (
    SELECT COUNT(*)
    FROM conversation_participants cp
    WHERE cp.conversation_id = (
      SELECT c.id FROM conversations c
      WHERE c.type = 'pod_chat' AND c.name = sp.name LIMIT 1
    ) AND cp.status = 'active'
  ) as chat_member_count,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.type = 'pod_chat' AND c.name = sp.name
    ) THEN 'YES'
    ELSE 'NO'
  END as has_group_chat
FROM study_pods sp
LEFT JOIN study_pod_members spm ON sp.id = spm.pod_id AND spm.status = 'active'
GROUP BY sp.id, sp.name
ORDER BY sp.created_at DESC;

-- Query 6: Missing pod chats (pods without corresponding group chat)
SELECT
  sp.id,
  sp.name,
  COUNT(spm.user_id) as pod_members,
  'MISSING_GROUP_CHAT' as issue
FROM study_pods sp
LEFT JOIN study_pod_members spm ON sp.id = spm.pod_id AND spm.status = 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM conversations c
  WHERE c.type = 'pod_chat' AND c.name = sp.name
)
GROUP BY sp.id, sp.name;

-- ============================================================================
-- 4. CHECK CONVERSATION PARTICIPANTS & PERMISSIONS
-- ============================================================================

-- Query 7: Show conversation participants with roles
SELECT
  c.id as conversation_id,
  c.type,
  c.name,
  COUNT(*) as participant_count,
  STRING_AGG(DISTINCT CONCAT(u.full_name, ' (', cp.role, ')'), ', ') as participants_with_roles
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.status = 'active'
LEFT JOIN users u ON cp.user_id = u.id
GROUP BY c.id, c.type, c.name
ORDER BY c.created_at DESC;

-- Query 8: Check RLS policy impact - can user see their own connections?
-- This requires running as a specific authenticated user
-- Format: SELECT * FROM connections WHERE from_user_id = 'your-user-id' OR to_user_id = 'your-user-id';

-- ============================================================================
-- 5. CHECK MESSAGES TABLE
-- ============================================================================

-- Query 9: Show message statistics
SELECT
  COUNT(*) as total_messages,
  COUNT(DISTINCT conversation_id) as conversations_with_messages,
  COUNT(*) FILTER (WHERE is_deleted = true) as deleted_messages,
  COUNT(*) FILTER (WHERE is_edited = true) as edited_messages
FROM messages;

-- Query 10: Show messages by conversation type
SELECT
  c.type,
  COUNT(m.id) as message_count
FROM messages m
LEFT JOIN conversations c ON m.conversation_id = c.id
GROUP BY c.type
ORDER BY message_count DESC;

-- ============================================================================
-- 6. EXPORT RESULTS
-- ============================================================================
-- Copy results from each query below and provide to your assistant:

-- A. List all connections with full details:
SELECT * FROM connections_debug;

-- B. List all conversations with member counts:
SELECT * FROM conversations_debug;

-- C. List study pods with group chat status:
SELECT
  sp.id, sp.name, sp.created_at,
  COALESCE(pod_members.count, 0) as pod_member_count,
  CASE
    WHEN EXISTS (SELECT 1 FROM conversations c WHERE c.type = 'pod_chat' AND c.name = sp.name) THEN 'YES'
    ELSE 'MISSING'
  END as has_group_chat
FROM study_pods sp
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count
  FROM study_pod_members
  WHERE pod_id = sp.id AND status = 'active'
) pod_members ON true
ORDER BY sp.created_at DESC;

-- D. List all RLS policy violations (messages about policies):
-- Check Supabase logs for auth errors

-- ============================================================================
-- 7. HELPER FUNCTION FOR QUICK USER LOOKUP
-- ============================================================================

-- Get current logged-in user's connections (this won't work in migrations,
-- but shows the proper query structure):
/*
WITH current_user AS (
  SELECT auth.uid() as user_id
)
SELECT
  c.id,
  CASE
    WHEN c.from_user_id = cu.user_id THEN 'sent_to'
    ELSE 'received_from'
  END as direction,
  CASE
    WHEN c.from_user_id = cu.user_id THEN tu.full_name
    ELSE fu.full_name
  END as contact_name,
  c.status,
  c.created_at
FROM connections c, current_user cu
LEFT JOIN users fu ON c.from_user_id = fu.id
LEFT JOIN users tu ON c.to_user_id = tu.id
WHERE c.from_user_id = cu.user_id OR c.to_user_id = cu.user_id
ORDER BY c.created_at DESC;
*/

-- ============================================================================
-- END DIAGNOSTIC MIGRATIONS
-- ============================================================================
