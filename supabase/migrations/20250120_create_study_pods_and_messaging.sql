-- Study Pods & Messaging System
-- Comprehensive schema with edge cases and production-ready features

-- ============================================
-- STUDY PODS TABLES
-- ============================================

-- Study pod main table
CREATE TABLE IF NOT EXISTS public.study_pods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  subject text NOT NULL, -- e.g., "Data Structures", "System Design", "Dynamic Programming"
  skill_level text NOT NULL CHECK (skill_level = ANY (ARRAY['Beginner'::text, 'Intermediate'::text, 'Advanced'::text, 'Mixed'::text])),
  max_members integer NOT NULL DEFAULT 6 CHECK (max_members >= 2 AND max_members <= 20),
  current_member_count integer NOT NULL DEFAULT 1,
  is_public boolean DEFAULT true,
  requires_approval boolean DEFAULT false, -- Pod owner must approve join requests
  meeting_schedule jsonb DEFAULT '[]'::jsonb, -- [{ day: "Monday", time: "18:00", duration: 60, timezone: "UTC" }]
  topics jsonb DEFAULT '[]'::jsonb, -- ["Arrays", "Linked Lists", "Trees"]
  goals text, -- Pod goals/objectives
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'scheduled'::text, 'completed'::text, 'archived'::text])),
  thumbnail_url text, -- Optional pod image
  color_scheme text DEFAULT 'from-green-500 to-emerald-500'::text,
  study_plan_id uuid, -- Optional link to study plan
  target_problems_count integer DEFAULT 0, -- Target problems to solve together
  completed_problems_count integer DEFAULT 0,
  total_sessions integer DEFAULT 0,
  next_session_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb, -- For extensibility
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  archived_at timestamp with time zone,
  CONSTRAINT study_pods_pkey PRIMARY KEY (id),
  CONSTRAINT study_pods_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Study pod members
CREATE TABLE IF NOT EXISTS public.study_pod_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pod_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'moderator'::text, 'member'::text])),
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'pending'::text, 'invited'::text, 'removed'::text, 'left'::text])),
  joined_at timestamp with time zone DEFAULT now(),
  last_active_at timestamp with time zone DEFAULT now(),
  contribution_score integer DEFAULT 0, -- Track member contributions
  problems_solved integer DEFAULT 0,
  sessions_attended integer DEFAULT 0,
  invited_by uuid, -- Track who invited this member
  removed_by uuid, -- Track who removed this member (if applicable)
  removal_reason text, -- Optional reason for removal
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT study_pod_members_pkey PRIMARY KEY (id),
  CONSTRAINT study_pod_members_unique UNIQUE (pod_id, user_id),
  CONSTRAINT study_pod_members_pod_id_fkey FOREIGN KEY (pod_id) REFERENCES public.study_pods(id) ON DELETE CASCADE,
  CONSTRAINT study_pod_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT study_pod_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id),
  CONSTRAINT study_pod_members_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES auth.users(id)
);

-- Study pod sessions (meeting records)
CREATE TABLE IF NOT EXISTS public.study_pod_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pod_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  scheduled_at timestamp with time zone NOT NULL,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  duration_minutes integer, -- Actual duration
  host_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  session_type text NOT NULL DEFAULT 'study'::text CHECK (session_type = ANY (ARRAY['study'::text, 'problem_solving'::text, 'mock_interview'::text, 'discussion'::text, 'review'::text])),
  attendees_count integer DEFAULT 0,
  problems_covered jsonb DEFAULT '[]'::jsonb, -- [{ problem_id: 123, completed: true }]
  notes text, -- Session notes/summary
  recording_url text, -- Optional session recording
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT study_pod_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT study_pod_sessions_pod_id_fkey FOREIGN KEY (pod_id) REFERENCES public.study_pods(id) ON DELETE CASCADE,
  CONSTRAINT study_pod_sessions_host_user_id_fkey FOREIGN KEY (host_user_id) REFERENCES auth.users(id)
);

-- Session attendance tracking
CREATE TABLE IF NOT EXISTS public.study_pod_session_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  left_at timestamp with time zone,
  duration_minutes integer, -- How long they attended
  participation_score integer DEFAULT 0, -- 0-100 based on engagement
  CONSTRAINT study_pod_session_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT study_pod_session_attendance_unique UNIQUE (session_id, user_id),
  CONSTRAINT study_pod_session_attendance_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.study_pod_sessions(id) ON DELETE CASCADE,
  CONSTRAINT study_pod_session_attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Study pod invitations (for private pods or direct invites)
CREATE TABLE IF NOT EXISTS public.study_pod_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pod_id uuid NOT NULL,
  invited_user_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text])),
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  responded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT study_pod_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT study_pod_invitations_unique UNIQUE (pod_id, invited_user_id),
  CONSTRAINT study_pod_invitations_pod_id_fkey FOREIGN KEY (pod_id) REFERENCES public.study_pods(id) ON DELETE CASCADE,
  CONSTRAINT study_pod_invitations_invited_user_id_fkey FOREIGN KEY (invited_user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT study_pod_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Study pod join requests (for public pods with approval required)
CREATE TABLE IF NOT EXISTS public.study_pod_join_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pod_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message text, -- Why they want to join
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT study_pod_join_requests_pkey PRIMARY KEY (id),
  CONSTRAINT study_pod_join_requests_unique UNIQUE (pod_id, user_id),
  CONSTRAINT study_pod_join_requests_pod_id_fkey FOREIGN KEY (pod_id) REFERENCES public.study_pods(id) ON DELETE CASCADE,
  CONSTRAINT study_pod_join_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT study_pod_join_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
);

-- Study pod activity feed (achievements, milestones)
CREATE TABLE IF NOT EXISTS public.study_pod_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pod_id uuid NOT NULL,
  user_id uuid, -- Null for system-generated activities
  activity_type text NOT NULL CHECK (activity_type = ANY (ARRAY[
    'member_joined'::text,
    'member_left'::text,
    'session_completed'::text,
    'milestone_reached'::text,
    'problem_solved'::text,
    'goal_achieved'::text,
    'announcement'::text
  ])),
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT study_pod_activities_pkey PRIMARY KEY (id),
  CONSTRAINT study_pod_activities_pod_id_fkey FOREIGN KEY (pod_id) REFERENCES public.study_pods(id) ON DELETE CASCADE,
  CONSTRAINT study_pod_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- MESSAGING TABLES
-- ============================================

-- Conversations (DMs and group chats)
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct'::text CHECK (type = ANY (ARRAY['direct'::text, 'group'::text, 'pod_chat'::text])),
  name text, -- For group chats, null for DMs
  description text, -- For group chats
  avatar_url text, -- For group chats
  created_by uuid NOT NULL,
  study_pod_id uuid, -- Link to study pod if this is a pod chat
  is_archived boolean DEFAULT false,
  last_message_at timestamp with time zone,
  last_message_preview text, -- Cache last message for list view
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT conversations_study_pod_id_fkey FOREIGN KEY (study_pod_id) REFERENCES public.study_pods(id) ON DELETE CASCADE
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])),
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'left'::text, 'removed'::text])),
  joined_at timestamp with time zone DEFAULT now(),
  last_read_at timestamp with time zone DEFAULT now(), -- For unread count
  last_read_message_id uuid, -- Track exactly which message was last read
  is_muted boolean DEFAULT false,
  muted_until timestamp with time zone,
  is_pinned boolean DEFAULT false, -- Pin important conversations
  added_by uuid,
  removed_by uuid,
  left_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversation_participants_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_participants_unique UNIQUE (conversation_id, user_id),
  CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT conversation_participants_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users(id),
  CONSTRAINT conversation_participants_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES auth.users(id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text, -- Null if only attachments
  message_type text NOT NULL DEFAULT 'text'::text CHECK (message_type = ANY (ARRAY[
    'text'::text,
    'image'::text,
    'file'::text,
    'code_snippet'::text,
    'problem_link'::text,
    'system'::text -- System messages like "User joined"
  ])),
  attachments jsonb DEFAULT '[]'::jsonb, -- [{ url, type, name, size }]
  reply_to_message_id uuid, -- Thread support
  is_edited boolean DEFAULT false,
  edited_at timestamp with time zone,
  is_deleted boolean DEFAULT false,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  reactions jsonb DEFAULT '{}'::jsonb, -- { "👍": ["user_id1", "user_id2"], "❤️": ["user_id3"] }
  metadata jsonb DEFAULT '{}'::jsonb, -- For code snippets, problem links, etc.
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT messages_reply_to_message_id_fkey FOREIGN KEY (reply_to_message_id) REFERENCES public.messages(id) ON DELETE SET NULL,
  CONSTRAINT messages_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id),
  -- Ensure text messages have content
  CONSTRAINT messages_content_check CHECK (
    (message_type = 'text' AND content IS NOT NULL) OR
    (message_type != 'text')
  )
);

-- Message read receipts (who has read which messages)
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_read_receipts_pkey PRIMARY KEY (id),
  CONSTRAINT message_read_receipts_unique UNIQUE (message_id, user_id),
  CONSTRAINT message_read_receipts_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE,
  CONSTRAINT message_read_receipts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Typing indicators (real-time)
CREATE TABLE IF NOT EXISTS public.conversation_typing_indicators (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  started_typing_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversation_typing_indicators_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_typing_indicators_unique UNIQUE (conversation_id, user_id),
  CONSTRAINT conversation_typing_indicators_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
  CONSTRAINT conversation_typing_indicators_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Message delivery status (for sent/delivered tracking)
CREATE TABLE IF NOT EXISTS public.message_delivery_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'sent'::text CHECK (status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text, 'failed'::text])),
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  failed_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_delivery_status_pkey PRIMARY KEY (id),
  CONSTRAINT message_delivery_status_unique UNIQUE (message_id, user_id),
  CONSTRAINT message_delivery_status_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE,
  CONSTRAINT message_delivery_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Study Pods indexes
CREATE INDEX IF NOT EXISTS idx_study_pods_created_by ON public.study_pods(created_by);
CREATE INDEX IF NOT EXISTS idx_study_pods_status ON public.study_pods(status);
CREATE INDEX IF NOT EXISTS idx_study_pods_subject ON public.study_pods(subject);
CREATE INDEX IF NOT EXISTS idx_study_pods_skill_level ON public.study_pods(skill_level);
CREATE INDEX IF NOT EXISTS idx_study_pods_is_public ON public.study_pods(is_public);
CREATE INDEX IF NOT EXISTS idx_study_pods_next_session ON public.study_pods(next_session_at) WHERE next_session_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_pod_members_pod_id ON public.study_pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_study_pod_members_user_id ON public.study_pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_study_pod_members_status ON public.study_pod_members(status);

CREATE INDEX IF NOT EXISTS idx_study_pod_sessions_pod_id ON public.study_pod_sessions(pod_id);
CREATE INDEX IF NOT EXISTS idx_study_pod_sessions_scheduled_at ON public.study_pod_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_study_pod_sessions_status ON public.study_pod_sessions(status);

-- Messaging indexes
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_study_pod_id ON public.conversations(study_pod_id) WHERE study_pod_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_status ON public.conversation_participants(status);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON public.message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_id ON public.message_read_receipts(user_id);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update study pod member count
CREATE OR REPLACE FUNCTION update_study_pod_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.study_pods
    SET current_member_count = current_member_count + 1,
        updated_at = now()
    WHERE id = NEW.pod_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE public.study_pods
      SET current_member_count = GREATEST(current_member_count - 1, 0),
          updated_at = now()
      WHERE id = NEW.pod_id;
    ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE public.study_pods
      SET current_member_count = current_member_count + 1,
          updated_at = now()
      WHERE id = NEW.pod_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE public.study_pods
    SET current_member_count = GREATEST(current_member_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.pod_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_study_pod_member_count
  AFTER INSERT OR UPDATE OR DELETE ON public.study_pod_members
  FOR EACH ROW
  EXECUTE FUNCTION update_study_pod_member_count();

-- Function to update conversation last message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = SUBSTRING(NEW.content, 1, 100),
        updated_at = now()
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function to automatically create pod chat when pod is created
CREATE OR REPLACE FUNCTION create_pod_chat_on_pod_creation()
RETURNS TRIGGER AS $$
DECLARE
  new_conversation_id uuid;
BEGIN
  -- Create conversation for the pod
  INSERT INTO public.conversations (type, name, created_by, study_pod_id, metadata)
  VALUES (
    'pod_chat',
    NEW.name || ' Chat',
    NEW.created_by,
    NEW.id,
    jsonb_build_object('auto_created', true)
  )
  RETURNING id INTO new_conversation_id;

  -- Add creator as participant
  INSERT INTO public.conversation_participants (conversation_id, user_id, role, added_by)
  VALUES (new_conversation_id, NEW.created_by, 'owner', NEW.created_by);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_pod_chat_on_pod_creation
  AFTER INSERT ON public.study_pods
  FOR EACH ROW
  EXECUTE FUNCTION create_pod_chat_on_pod_creation();

-- Function to add new pod members to pod chat
CREATE OR REPLACE FUNCTION add_pod_member_to_pod_chat()
RETURNS TRIGGER AS $$
DECLARE
  pod_conversation_id uuid;
BEGIN
  IF NEW.status = 'active' THEN
    -- Find the pod's conversation
    SELECT id INTO pod_conversation_id
    FROM public.conversations
    WHERE study_pod_id = NEW.pod_id AND type = 'pod_chat'
    LIMIT 1;

    IF pod_conversation_id IS NOT NULL THEN
      -- Add member to conversation
      INSERT INTO public.conversation_participants (conversation_id, user_id, role, added_by)
      VALUES (pod_conversation_id, NEW.user_id, 'member', NEW.invited_by)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_pod_member_to_pod_chat
  AFTER INSERT OR UPDATE ON public.study_pod_members
  FOR EACH ROW
  EXECUTE FUNCTION add_pod_member_to_pod_chat();

-- ============================================
-- RLS POLICIES (Row Level Security)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.study_pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_pod_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_pod_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_pod_session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_pod_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_pod_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_pod_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_delivery_status ENABLE ROW LEVEL SECURITY;

-- Study Pods RLS Policies
CREATE POLICY "Public pods are viewable by everyone" ON public.study_pods
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view pods they are members of" ON public.study_pods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.study_pod_members
      WHERE pod_id = study_pods.id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "Users can create pods" ON public.study_pods
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Pod owners can update their pods" ON public.study_pods
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.study_pod_members
      WHERE pod_id = study_pods.id
        AND user_id = auth.uid()
        AND role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Pod owners can delete their pods" ON public.study_pods
  FOR DELETE USING (created_by = auth.uid());

-- Pod members policies
CREATE POLICY "Users can view members of pods they belong to" ON public.study_pod_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.study_pod_members m
      WHERE m.pod_id = study_pod_members.pod_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

CREATE POLICY "Pod owners can manage members" ON public.study_pod_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.study_pods
      WHERE id = study_pod_members.pod_id
        AND (created_by = auth.uid() OR
             EXISTS (
               SELECT 1 FROM public.study_pod_members m
               WHERE m.pod_id = study_pod_members.pod_id
                 AND m.user_id = auth.uid()
                 AND m.role IN ('owner', 'moderator')
             ))
    )
  );

-- Messaging RLS Policies
CREATE POLICY "Users can view conversations they participate in" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = conversations.id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Conversation participants can view other participants" ON public.conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.status = 'active'
    )
  );

CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "Users can send messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON public.messages
  FOR DELETE USING (sender_id = auth.uid());

-- Grant permissions
GRANT ALL ON public.study_pods TO authenticated;
GRANT ALL ON public.study_pod_members TO authenticated;
GRANT ALL ON public.study_pod_sessions TO authenticated;
GRANT ALL ON public.study_pod_session_attendance TO authenticated;
GRANT ALL ON public.study_pod_invitations TO authenticated;
GRANT ALL ON public.study_pod_join_requests TO authenticated;
GRANT ALL ON public.study_pod_activities TO authenticated;
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversation_participants TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.message_read_receipts TO authenticated;
GRANT ALL ON public.conversation_typing_indicators TO authenticated;
GRANT ALL ON public.message_delivery_status TO authenticated;
