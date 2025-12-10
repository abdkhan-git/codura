-- Create study_pod_join_requests table
CREATE TABLE IF NOT EXISTS public.study_pod_join_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pod_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  message text,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  CONSTRAINT study_pod_join_requests_pkey PRIMARY KEY (id),
  CONSTRAINT study_pod_join_requests_pod_id_fkey FOREIGN KEY (pod_id) REFERENCES public.study_pods(id) ON DELETE CASCADE,
  CONSTRAINT study_pod_join_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT study_pod_join_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_study_pod_join_requests_pod_id ON public.study_pod_join_requests(pod_id);
CREATE INDEX IF NOT EXISTS idx_study_pod_join_requests_user_id ON public.study_pod_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_study_pod_join_requests_status ON public.study_pod_join_requests(status);

-- Add unique constraint to prevent duplicate pending requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_pod_join_requests_unique_pending
  ON public.study_pod_join_requests(pod_id, user_id)
  WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE public.study_pod_join_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own join requests
CREATE POLICY "Users can view their own join requests" ON public.study_pod_join_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Pod owners and moderators can view all join requests for their pods
CREATE POLICY "Pod admins can view join requests" ON public.study_pod_join_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_pod_members
      WHERE study_pod_members.pod_id = study_pod_join_requests.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

-- Policy: Users can insert their own join requests
CREATE POLICY "Users can create join requests" ON public.study_pod_join_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Pod owners and moderators can update join requests for their pods
CREATE POLICY "Pod admins can update join requests" ON public.study_pod_join_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.study_pod_members
      WHERE study_pod_members.pod_id = study_pod_join_requests.pod_id
        AND study_pod_members.user_id = auth.uid()
        AND study_pod_members.role IN ('owner', 'moderator')
        AND study_pod_members.status = 'active'
    )
  );

-- Policy: Users can delete their own pending requests
CREATE POLICY "Users can delete their own pending requests" ON public.study_pod_join_requests
  FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');
