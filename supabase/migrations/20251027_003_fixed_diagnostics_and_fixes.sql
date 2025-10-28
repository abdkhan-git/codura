-- ============================================================================
-- FIXED DIAGNOSTIC QUERIES & COMPLETE FIXES
-- ============================================================================
-- These queries are corrected to work with auth.users schema structure
-- ============================================================================

-- ============================================================================
-- PART 1: CORRECTED DIAGNOSTIC QUERIES (Run these individually)
-- ============================================================================

-- Query 1: Connection Status Summary
SELECT
  status,
  COUNT(*) as total
FROM connections
GROUP BY status
ORDER BY total DESC;

-- Query 2: All Accepted Connections (CORRECTED)
SELECT
  c.id,
  c.from_user_id,
  c.to_user_id,
  c.status,
  c.created_at
FROM connections c
WHERE c.status = 'accepted'
ORDER BY c.created_at DESC;

-- Query 3: Conversation Type Summary
SELECT
  type,
  COUNT(*) as total
FROM conversations
GROUP BY type;

-- Query 4: Direct Conversations with Participant Count
SELECT
  c.id,
  c.type,
  COUNT(DISTINCT cp.user_id) as participant_count,
  c.created_at
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.status = 'active'
WHERE c.type = 'direct'
GROUP BY c.id, c.type, c.created_at
ORDER BY c.created_at DESC;

-- Query 5: Study Pods Status (CORRECTED - MOST IMPORTANT)
SELECT
  sp.id,
  sp.name,
  COALESCE(pod_members.count, 0) as pod_member_count,
  CASE
    WHEN EXISTS (SELECT 1 FROM conversations c WHERE c.type = 'pod_chat' AND c.name = sp.name)
      THEN 'YES'
      ELSE 'MISSING'
  END as has_group_chat
FROM study_pods sp
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count
  FROM study_pod_members spm
  WHERE spm.pod_id = sp.id AND spm.status = 'active'
) pod_members ON true
ORDER BY sp.created_at DESC;

-- Query 6: Pods Missing Group Chats
SELECT
  sp.id,
  sp.name,
  COUNT(DISTINCT spm.user_id) as pod_member_count
FROM study_pods sp
LEFT JOIN study_pod_members spm ON sp.id = spm.pod_id AND spm.status = 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM conversations c
  WHERE c.type = 'pod_chat' AND c.name = sp.name
)
GROUP BY sp.id, sp.name;

-- Query 7: Message Statistics
SELECT
  COUNT(*) as total_messages,
  COUNT(DISTINCT conversation_id) as conversations_with_messages,
  COUNT(*) FILTER (WHERE is_deleted = true) as deleted_messages,
  COUNT(*) FILTER (WHERE is_edited = true) as edited_messages
FROM messages;

-- Query 8: Study Pod Members Details
SELECT
  sp.id as pod_id,
  sp.name as pod_name,
  spm.user_id,
  spm.role,
  spm.status,
  spm.joined_at
FROM study_pods sp
LEFT JOIN study_pod_members spm ON sp.id = spm.pod_id
WHERE spm.status IN ('active', 'pending')
ORDER BY sp.name, spm.joined_at DESC;

-- ============================================================================
-- PART 2: CREATE POD GROUP CHATS - MANUAL FIX
-- ============================================================================

-- Step 1: Create group chats for each missing pod
INSERT INTO conversations (type, name, created_by, created_at, updated_at)
SELECT
  'pod_chat',
  sp.name,
  sp.created_by,
  NOW(),
  NOW()
FROM study_pods sp
WHERE NOT EXISTS (
  SELECT 1 FROM conversations c
  WHERE c.type = 'pod_chat' AND c.name = sp.name
)
ON CONFLICT DO NOTHING;

-- Step 2: Add all active pod members to their pod's group chat
INSERT INTO conversation_participants (
  conversation_id,
  user_id,
  role,
  status,
  created_at,
  joined_at,
  last_read_at
)
SELECT
  c.id as conversation_id,
  spm.user_id,
  'member' as role,
  'active' as status,
  NOW(),
  NOW(),
  NOW()
FROM conversations c
INNER JOIN study_pods sp ON c.type = 'pod_chat' AND c.name = sp.name
INNER JOIN study_pod_members spm ON spm.pod_id = sp.id AND spm.status = 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_participants cp
  WHERE cp.conversation_id = c.id
  AND cp.user_id = spm.user_id
  AND cp.status = 'active'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 3: VERIFY THE FIXES
-- ============================================================================

-- After running Parts 1-2, run these to verify:

-- Verification 1: Check pods now have group chats
SELECT
  sp.id,
  sp.name,
  COUNT(DISTINCT spm.user_id) as pod_member_count,
  CASE
    WHEN EXISTS (SELECT 1 FROM conversations c WHERE c.type = 'pod_chat' AND c.name = sp.name)
      THEN 'YES - FIXED'
      ELSE 'STILL MISSING'
  END as has_group_chat,
  (
    SELECT COUNT(*)
    FROM conversations c
    INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE c.type = 'pod_chat' AND c.name = sp.name AND cp.status = 'active'
  ) as chat_members
FROM study_pods sp
LEFT JOIN study_pod_members spm ON sp.id = spm.pod_id AND spm.status = 'active'
GROUP BY sp.id, sp.name
ORDER BY sp.name;

-- Verification 2: Check conversation participants
SELECT
  c.id,
  c.type,
  c.name,
  COUNT(DISTINCT cp.user_id) as member_count,
  STRING_AGG(DISTINCT cp.role, ', ') as roles
FROM conversations c
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.status = 'active'
GROUP BY c.id, c.type, c.name
ORDER BY c.created_at DESC;

-- ============================================================================
-- PART 4: CREATE AUTOMATIC TRIGGERS (for future pod creation)
-- ============================================================================

-- Trigger Function: Auto-create pod chat when pod is created
CREATE OR REPLACE FUNCTION create_pod_group_chat_on_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO conversations (type, name, created_by, created_at, updated_at)
  VALUES (
    'pod_chat',
    NEW.name,
    NEW.created_by,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if present
DROP TRIGGER IF EXISTS auto_create_pod_chat_on_pod_insert ON study_pods;

-- Create the trigger
CREATE TRIGGER auto_create_pod_chat_on_pod_insert
AFTER INSERT ON study_pods
FOR EACH ROW
EXECUTE FUNCTION create_pod_group_chat_on_creation();

-- Trigger Function: Auto-add member to pod chat when they join pod
CREATE OR REPLACE FUNCTION add_member_to_pod_chat_on_join()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- Only process new active members
  IF NEW.status = 'active' THEN
    -- Find the pod's group chat
    SELECT c.id INTO v_conversation_id
    FROM conversations c
    INNER JOIN study_pods sp ON c.name = sp.name
    WHERE c.type = 'pod_chat'
    AND sp.id = NEW.pod_id
    LIMIT 1;

    -- If chat doesn't exist yet, create it
    IF v_conversation_id IS NULL THEN
      INSERT INTO conversations (type, name, created_by, created_at, updated_at)
      SELECT
        'pod_chat',
        sp.name,
        sp.created_by,
        NOW(),
        NOW()
      FROM study_pods sp
      WHERE sp.id = NEW.pod_id
      RETURNING id INTO v_conversation_id;
    END IF;

    -- Add member to conversation if not already there
    IF v_conversation_id IS NOT NULL THEN
      INSERT INTO conversation_participants (
        conversation_id,
        user_id,
        role,
        status,
        created_at,
        joined_at,
        last_read_at
      )
      VALUES (
        v_conversation_id,
        NEW.user_id,
        'member',
        'active',
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (conversation_id, user_id) DO UPDATE
      SET status = 'active'
      WHERE conversation_participants.status IN ('left', 'removed');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if present
DROP TRIGGER IF EXISTS auto_add_member_to_pod_chat ON study_pod_members;

-- Create the trigger
CREATE TRIGGER auto_add_member_to_pod_chat
AFTER INSERT ON study_pod_members
FOR EACH ROW
EXECUTE FUNCTION add_member_to_pod_chat_on_join();

-- ============================================================================
-- SUMMARY OF WHAT THIS DOES
-- ============================================================================

/*
This migration:

1. FIXES YOUR DATA:
   - Creates group chats for ALL existing study pods
   - Adds all pod members to their pod's group chat
   - No members lost, no data deleted

2. PREVENTS FUTURE ISSUES:
   - New pods automatically get group chats
   - New members automatically join pod chats
   - No manual intervention needed

3. DIAGNOSTIC QUERIES:
   - Corrected to work with your schema
   - Run before and after to see the fix work

RESULTS YOU SHOULD SEE:
- Query 5 Before: All "MISSING"
- Query 5 After: All "YES - FIXED"
- Verification 1: pod_member_count = chat_members
*/

-- ============================================================================
