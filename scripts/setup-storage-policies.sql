-- ============================================================================
-- Supabase Storage RLS Policies for 'attachments' Bucket
-- ============================================================================
-- Run this after creating the 'attachments' bucket in Supabase Storage
-- Required for file uploads to work!
-- ============================================================================

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow public read access to files
CREATE POLICY "Allow public downloads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'attachments');

-- Allow users to update their own files
CREATE POLICY "Allow users to update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
