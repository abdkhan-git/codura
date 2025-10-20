-- Helper Functions for Study Pods and Messaging
-- Production-ready functions with edge case handling

-- ============================================
-- STUDY POD FUNCTIONS
-- ============================================

-- Get user's study pods with full details
CREATE OR REPLACE FUNCTION get_user_study_pods(user_uuid uuid)
RETURNS TABLE (
  pod_id uuid,
  pod_name text,
  pod_description text,
  subject text,
  skill_level text,
  status text,
  current_members integer,
  max_members integer,
  user_role text,
  next_session timestamp with time zone,
  total_sessions integer,
  completed_problems integer,
  is_owner boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.name,
    sp.description,
    sp.subject,
    sp.skill_level,
    sp.status,
    sp.current_member_count,
    sp.max_members,
    spm.role,
    sp.next_session_at,
    sp.total_sessions,
    sp.completed_problems_count,
    (sp.created_by = user_uuid) as is_owner
  FROM public.study_pods sp
  INNER JOIN public.study_pod_members spm ON sp.id = spm.pod_id
  WHERE spm.user_id = user_uuid
    AND spm.status = 'active'
  ORDER BY sp.updated_at DESC;
END;
$$;

-- Check if user can join a pod (validates all edge cases)
CREATE OR REPLACE FUNCTION can_user_join_pod(user_uuid uuid, pod_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pod_record RECORD;
  member_record RECORD;
  existing_request RECORD;
  result jsonb;
BEGIN
  -- Get pod details
  SELECT * INTO pod_record
  FROM public.study_pods
  WHERE id = pod_uuid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_join', false,
      'reason', 'pod_not_found',
      'message', 'Study pod does not exist'
    );
  END IF;

  -- Check if pod is archived
  IF pod_record.status = 'archived' THEN
    RETURN jsonb_build_object(
      'can_join', false,
      'reason', 'pod_archived',
      'message', 'This study pod has been archived'
    );
  END IF;

  -- Check if already a member
  SELECT * INTO member_record
  FROM public.study_pod_members
  WHERE pod_id = pod_uuid AND user_id = user_uuid;

  IF FOUND THEN
    IF member_record.status = 'active' THEN
      RETURN jsonb_build_object(
        'can_join', false,
        'reason', 'already_member',
        'message', 'You are already a member of this pod'
      );
    ELSIF member_record.status = 'pending' THEN
      RETURN jsonb_build_object(
        'can_join', false,
        'reason', 'request_pending',
        'message', 'Your join request is pending approval'
      );
    ELSIF member_record.status = 'removed' THEN
      RETURN jsonb_build_object(
        'can_join', false,
        'reason', 'previously_removed',
        'message', 'You were removed from this pod and cannot rejoin'
      );
    END IF;
  END IF;

  -- Check if pod is full
  IF pod_record.current_member_count >= pod_record.max_members THEN
    RETURN jsonb_build_object(
      'can_join', false,
      'reason', 'pod_full',
      'message', 'This study pod is full',
      'current_members', pod_record.current_member_count,
      'max_members', pod_record.max_members
    );
  END IF;

  -- Check if there's a pending invitation
  SELECT * INTO existing_request
  FROM public.study_pod_invitations
  WHERE pod_id = pod_uuid
    AND invited_user_id = user_uuid
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());

  IF FOUND THEN
    RETURN jsonb_build_object(
      'can_join', true,
      'reason', 'has_invitation',
      'message', 'You have been invited to this pod',
      'requires_approval', false,
      'invitation_id', existing_request.id
    );
  END IF;

  -- Check if pod requires approval
  IF pod_record.requires_approval THEN
    -- Check if there's already a join request
    SELECT * INTO existing_request
    FROM public.study_pod_join_requests
    WHERE pod_id = pod_uuid
      AND user_id = user_uuid
      AND status = 'pending';

    IF FOUND THEN
      RETURN jsonb_build_object(
        'can_join', false,
        'reason', 'request_already_submitted',
        'message', 'You have already submitted a join request'
      );
    END IF;

    RETURN jsonb_build_object(
      'can_join', true,
      'reason', 'requires_request',
      'message', 'You can submit a join request',
      'requires_approval', true
    );
  END IF;

  -- Check if pod is public
  IF NOT pod_record.is_public THEN
    RETURN jsonb_build_object(
      'can_join', false,
      'reason', 'pod_private',
      'message', 'This is a private pod. You need an invitation to join'
    );
  END IF;

  -- All checks passed
  RETURN jsonb_build_object(
    'can_join', true,
    'reason', 'eligible',
    'message', 'You can join this pod',
    'requires_approval', false
  );
END;
$$;

-- Get unread message count for a user across all conversations
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COALESCE(SUM(
    (SELECT COUNT(*)
     FROM public.messages m
     WHERE m.conversation_id = cp.conversation_id
       AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamp)
       AND m.sender_id != user_uuid
       AND m.is_deleted = false)
  ), 0)::integer INTO unread_count
  FROM public.conversation_participants cp
  WHERE cp.user_id = user_uuid
    AND cp.status = 'active';

  RETURN unread_count;
END;
$$;

-- Get unread count for specific conversation
CREATE OR REPLACE FUNCTION get_conversation_unread_count(user_uuid uuid, conv_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_read timestamp with time zone;
  unread_count integer;
BEGIN
  -- Get user's last read time for this conversation
  SELECT last_read_at INTO last_read
  FROM public.conversation_participants
  WHERE conversation_id = conv_uuid
    AND user_id = user_uuid
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Count messages since last read
  SELECT COUNT(*)::integer INTO unread_count
  FROM public.messages
  WHERE conversation_id = conv_uuid
    AND created_at > COALESCE(last_read, '1970-01-01'::timestamp)
    AND sender_id != user_uuid
    AND is_deleted = false;

  RETURN COALESCE(unread_count, 0);
END;
$$;

-- Mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_as_read(user_uuid uuid, conv_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  latest_message_id uuid;
  latest_message_time timestamp with time zone;
BEGIN
  -- Get the latest message in the conversation
  SELECT id, created_at INTO latest_message_id, latest_message_time
  FROM public.messages
  WHERE conversation_id = conv_uuid
    AND is_deleted = false
  ORDER BY created_at DESC
  LIMIT 1;

  -- Update participant's last read time
  UPDATE public.conversation_participants
  SET last_read_at = COALESCE(latest_message_time, now()),
      last_read_message_id = latest_message_id,
      updated_at = now()
  WHERE conversation_id = conv_uuid
    AND user_id = user_uuid;

  RETURN FOUND;
END;
$$;

-- Get or create direct conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(user1_uuid uuid, user2_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_uuid uuid;
  existing_conversation uuid;
BEGIN
  -- Check if conversation already exists (bidirectional)
  SELECT c.id INTO existing_conversation
  FROM public.conversations c
  WHERE c.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp1
      WHERE cp1.conversation_id = c.id
        AND cp1.user_id = user1_uuid
        AND cp1.status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp2
      WHERE cp2.conversation_id = c.id
        AND cp2.user_id = user2_uuid
        AND cp2.status = 'active'
    )
  LIMIT 1;

  IF existing_conversation IS NOT NULL THEN
    RETURN existing_conversation;
  END IF;

  -- Create new conversation
  INSERT INTO public.conversations (type, created_by)
  VALUES ('direct', user1_uuid)
  RETURNING id INTO conversation_uuid;

  -- Add both participants
  INSERT INTO public.conversation_participants (conversation_id, user_id, role, added_by)
  VALUES
    (conversation_uuid, user1_uuid, 'member', user1_uuid),
    (conversation_uuid, user2_uuid, 'member', user1_uuid);

  RETURN conversation_uuid;
END;
$$;

-- Search study pods with filters
CREATE OR REPLACE FUNCTION search_study_pods(
  search_query text DEFAULT NULL,
  filter_subject text DEFAULT NULL,
  filter_skill_level text DEFAULT NULL,
  filter_status text DEFAULT 'active',
  only_public boolean DEFAULT true,
  only_with_space boolean DEFAULT false,
  user_uuid uuid DEFAULT NULL,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  subject text,
  skill_level text,
  status text,
  current_member_count integer,
  max_members integer,
  created_by uuid,
  next_session_at timestamp with time zone,
  is_public boolean,
  requires_approval boolean,
  total_sessions integer,
  completed_problems_count integer,
  thumbnail_url text,
  color_scheme text,
  created_at timestamp with time zone,
  is_member boolean,
  user_role text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.name,
    sp.description,
    sp.subject,
    sp.skill_level,
    sp.status,
    sp.current_member_count,
    sp.max_members,
    sp.created_by,
    sp.next_session_at,
    sp.is_public,
    sp.requires_approval,
    sp.total_sessions,
    sp.completed_problems_count,
    sp.thumbnail_url,
    sp.color_scheme,
    sp.created_at,
    EXISTS (
      SELECT 1 FROM public.study_pod_members spm
      WHERE spm.pod_id = sp.id
        AND spm.user_id = user_uuid
        AND spm.status = 'active'
    ) as is_member,
    (
      SELECT spm.role FROM public.study_pod_members spm
      WHERE spm.pod_id = sp.id
        AND spm.user_id = user_uuid
        AND spm.status = 'active'
      LIMIT 1
    ) as user_role
  FROM public.study_pods sp
  WHERE
    (filter_status IS NULL OR sp.status = filter_status)
    AND (filter_subject IS NULL OR sp.subject ILIKE '%' || filter_subject || '%')
    AND (filter_skill_level IS NULL OR sp.skill_level = filter_skill_level)
    AND (NOT only_public OR sp.is_public = true)
    AND (NOT only_with_space OR sp.current_member_count < sp.max_members)
    AND (search_query IS NULL OR
         sp.name ILIKE '%' || search_query || '%' OR
         sp.description ILIKE '%' || search_query || '%' OR
         sp.subject ILIKE '%' || search_query || '%')
  ORDER BY
    -- Prioritize pods with upcoming sessions
    CASE WHEN sp.next_session_at IS NOT NULL THEN 0 ELSE 1 END,
    sp.next_session_at ASC NULLS LAST,
    sp.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Get pod statistics for a user
CREATE OR REPLACE FUNCTION get_user_pod_statistics(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_pods', COUNT(*),
    'active_pods', COUNT(*) FILTER (WHERE sp.status = 'active'),
    'pods_created', COUNT(*) FILTER (WHERE sp.created_by = user_uuid),
    'total_sessions_attended', COALESCE(SUM(spm.sessions_attended), 0),
    'total_problems_solved_in_pods', COALESCE(SUM(spm.problems_solved), 0),
    'total_contribution_score', COALESCE(SUM(spm.contribution_score), 0),
    'moderator_roles', COUNT(*) FILTER (WHERE spm.role = 'moderator'),
    'owner_roles', COUNT(*) FILTER (WHERE spm.role = 'owner')
  ) INTO stats
  FROM public.study_pod_members spm
  INNER JOIN public.study_pods sp ON sp.id = spm.pod_id
  WHERE spm.user_id = user_uuid
    AND spm.status = 'active';

  RETURN stats;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_study_pods(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_join_pod(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_unread_count(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_as_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_direct_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION search_study_pods(text, text, text, text, boolean, boolean, uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_pod_statistics(uuid) TO authenticated;
