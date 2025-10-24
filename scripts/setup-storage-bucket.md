# Setup Supabase Storage Bucket for Message Attachments

## Steps to Create Storage Bucket

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click on "Storage" in the left sidebar

2. **Create New Bucket**
   - Click "New bucket"
   - Name: `attachments`
   - Public bucket: **Yes** (check this box)
   - Click "Create bucket"

3. **Set Up Storage Policies** (Optional - for more security)

If you want to restrict who can upload/delete files, add these policies:

### Allow authenticated users to upload
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');
```

### Allow public read access
```sql
CREATE POLICY "Allow public downloads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'attachments');
```

### Allow users to delete their own files
```sql
CREATE POLICY "Allow users to delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## File Structure

Files will be organized as:
```
attachments/
  └── message-attachments/
      └── {user_id}/
          └── {timestamp}-{random}.{ext}
```

## Supported File Types

- **Images:** .jpg, .jpeg, .png, .gif, .webp
- **Documents:** .pdf, .doc, .docx, .txt
- **Archives:** .zip, .rar
- **Maximum file size:** 10MB

## Testing

After setup, test by:
1. Sending a message with an attachment
2. Verifying the file appears in Storage > attachments
3. Clicking the file link in the message
4. Confirming it downloads/displays correctly
