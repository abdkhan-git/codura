-- Enable RLS on submissions table
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can create their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can update their own submissions" ON public.submissions;

-- Create policy for viewing own submissions
CREATE POLICY "Users can view their own submissions"
ON public.submissions
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for inserting own submissions
CREATE POLICY "Users can create their own submissions"
ON public.submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy for updating own submissions
CREATE POLICY "Users can update their own submissions"
ON public.submissions
FOR UPDATE
USING (auth.uid() = user_id);

