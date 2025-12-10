-- Pod Group Chats with Admin Roles
-- This ensures all study pods have group chats with proper admin assignment
-- Date: 2025-10-27

-- Step 1: Create group chats for all study pods that don't have them
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

-- Step 2: Add all active pod members to their group chats
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
  c.id,
  spm.user_id,
  CASE
    WHEN spm.user_id = sp.created_by THEN 'admin'
    ELSE 'member'
  END,
  'active',
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

-- Step 3: Ensure pod creator/owner is marked as admin in their pod chat
UPDATE conversation_participants
SET role = 'admin'
WHERE role = 'member'
AND EXISTS (
  SELECT 1 FROM conversations c
  INNER JOIN study_pods sp ON c.type = 'pod_chat' AND c.name = sp.name
  WHERE c.id = conversation_participants.conversation_id
  AND conversation_participants.user_id = sp.created_by
);

-- Step 4: Verify the changes
-- Run this to see the pod chats:
-- SELECT c.id, c.name, COUNT(cp.user_id) as member_count
-- FROM conversations c
-- LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.status = 'active'
-- WHERE c.type = 'pod_chat'
-- GROUP BY c.id, c.name;

-- Run this to see admin assignments:
-- SELECT c.name, u.full_name, cp.role
-- FROM conversation_participants cp
-- INNER JOIN conversations c ON cp.conversation_id = c.id
-- INNER JOIN users u ON cp.user_id = u.user_id
-- WHERE c.type = 'pod_chat'
-- ORDER BY c.name, cp.role DESC;
