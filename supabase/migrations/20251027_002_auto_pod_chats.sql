-- ============================================================================
-- AUTO-CREATE STUDY POD GROUP CHATS
-- ============================================================================
-- This migration ensures that whenever a study pod is created or members join,
-- a corresponding group chat is automatically created/updated with all members
-- ============================================================================

-- ============================================================================
-- 1. CREATE TRIGGER FUNCTION FOR POD CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_study_pod_group_chat()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a group conversation for the study pod
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

-- Create trigger for study_pods insert
DROP TRIGGER IF EXISTS study_pods_create_group_chat ON study_pods;
CREATE TRIGGER study_pods_create_group_chat
  AFTER INSERT ON study_pods
  FOR EACH ROW
  EXECUTE FUNCTION create_study_pod_group_chat();

-- ============================================================================
-- 2. CREATE TRIGGER FUNCTION FOR POD MEMBER ADDITION
-- ============================================================================

CREATE OR REPLACE FUNCTION add_member_to_pod_chat()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- Only process active members
  IF NEW.status = 'active' THEN
    -- Find the group chat conversation for this pod
    SELECT id INTO v_conversation_id
    FROM conversations
    WHERE type = 'pod_chat'
    AND name = (SELECT name FROM study_pods WHERE id = NEW.pod_id)
    LIMIT 1;

    -- If conversation exists, add the new member
    IF v_conversation_id IS NOT NULL THEN
      INSERT INTO conversation_participants (conversation_id, user_id, role, status, created_at)
      VALUES (
        v_conversation_id,
        NEW.user_id,
        'member',
        'active',
        NOW()
      )
      ON CONFLICT (conversation_id, user_id) DO UPDATE
      SET status = 'active'
      WHERE conversation_participants.status = 'left';
    ELSE
      -- If conversation doesn't exist yet, get the pod and create one
      INSERT INTO conversations (type, name, created_by, created_at, updated_at)
      SELECT
        'pod_chat',
        p.name,
        p.created_by,
        NOW(),
        NOW()
      FROM study_pods p
      WHERE p.id = NEW.pod_id
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_conversation_id;

      -- Add the member to the newly created conversation
      IF v_conversation_id IS NOT NULL THEN
        INSERT INTO conversation_participants (conversation_id, user_id, role, status, created_at)
        VALUES (
          v_conversation_id,
          NEW.user_id,
          'member',
          'active',
          NOW()
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for study_pod_members insert
DROP TRIGGER IF EXISTS study_pod_members_add_to_chat ON study_pod_members;
CREATE TRIGGER study_pod_members_add_to_chat
  AFTER INSERT ON study_pod_members
  FOR EACH ROW
  EXECUTE FUNCTION add_member_to_pod_chat();

-- Create trigger for study_pod_members update (in case member status changes)
DROP TRIGGER IF EXISTS study_pod_members_update_chat ON study_pod_members;
CREATE TRIGGER study_pod_members_update_chat
  AFTER UPDATE ON study_pod_members
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION add_member_to_pod_chat();

-- ============================================================================
-- 3. FIX EXISTING STUDY PODS - CREATE MISSING GROUP CHATS
-- ============================================================================

-- Create group chats for any study pods that don't have one
INSERT INTO conversations (type, name, created_by, created_at, updated_at)
SELECT DISTINCT
  'pod_chat',
  sp.name,
  sp.created_by,
  sp.created_at,
  NOW()
FROM study_pods sp
WHERE NOT EXISTS (
  SELECT 1 FROM conversations c
  WHERE c.type = 'pod_chat' AND c.name = sp.name
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. ADD EXISTING MEMBERS TO POD CHATS
-- ============================================================================

-- Add all active study pod members to their pod's group chat
INSERT INTO conversation_participants (conversation_id, user_id, role, status, created_at)
SELECT
  c.id,
  spm.user_id,
  'member',
  'active',
  NOW()
FROM conversation_participants cp
-- Get all study pods
INNER JOIN study_pods sp ON true
-- Get the group chat for each pod
INNER JOIN conversations c ON c.type = 'pod_chat' AND c.name = sp.name
-- Get all active members of the pod
INNER JOIN study_pod_members spm ON spm.pod_id = sp.id AND spm.status = 'active'
WHERE NOT EXISTS (
  SELECT 1
  FROM conversation_participants existing
  WHERE existing.conversation_id = c.id
  AND existing.user_id = spm.user_id
  AND existing.status = 'active'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. VERIFY RESULTS
-- ============================================================================

-- After running this migration, check these views to verify:
/*
-- Check that all pods have group chats
SELECT
  sp.id,
  sp.name,
  COUNT(DISTINCT spm.user_id) as pod_members,
  (
    SELECT COUNT(*)
    FROM conversations c
    INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE c.type = 'pod_chat' AND c.name = sp.name AND cp.status = 'active'
  ) as chat_members
FROM study_pods sp
LEFT JOIN study_pod_members spm ON sp.id = spm.pod_id AND spm.status = 'active'
GROUP BY sp.id, sp.name;

-- Expected result: pod_members should equal chat_members for all pods
*/

-- ============================================================================
-- END AUTO-CREATE STUDY POD GROUP CHATS
-- ============================================================================
