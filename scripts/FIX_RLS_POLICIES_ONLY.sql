-- CRITICAL RLS POLICY FIXES
-- These policies were missing and are blocking conversation creation

-- Allow users to create conversations
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Allow users to add themselves and others as participants
CREATE POLICY "Users can add participants to conversations they manage"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    -- Case 1: User adding themselves (joining existing conversation)
    user_id = auth.uid()
    OR
    -- Case 2: Conversation creator adding others
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.created_by = auth.uid()
    )
    OR
    -- Case 3: Pod admins adding members to pod chats
    EXISTS (
      SELECT 1 FROM public.conversations c
      INNER JOIN public.study_pods sp ON c.study_pod_id = sp.id
      INNER JOIN public.study_pod_members spm ON sp.id = spm.pod_id
      WHERE c.id = conversation_participants.conversation_id
        AND spm.user_id = auth.uid()
        AND spm.role IN ('owner', 'moderator')
    )
  );

-- Allow users to leave conversations
CREATE POLICY "Users can leave conversations"
  ON public.conversation_participants FOR UPDATE
  WITH CHECK (
    user_id = auth.uid()
    AND (status = 'active' OR status = 'left')
  );

-- Allow users to delete their participant records (soft delete by setting status)
CREATE POLICY "Users can remove themselves from conversations"
  ON public.conversation_participants FOR DELETE
  USING (user_id = auth.uid());

-- Allow conversation creators/admins to remove participants
CREATE POLICY "Admins can remove participants from conversations"
  ON public.conversation_participants FOR DELETE
  USING (
    -- Creator can remove anyone
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.created_by = auth.uid()
    )
    OR
    -- Pod admin can remove from pod chats
    EXISTS (
      SELECT 1 FROM public.conversations c
      INNER JOIN public.study_pods sp ON c.study_pod_id = sp.id
      INNER JOIN public.study_pod_members spm ON sp.id = spm.pod_id
      WHERE c.id = conversation_participants.conversation_id
        AND spm.user_id = auth.uid()
        AND spm.role IN ('owner', 'moderator')
    )
  );
