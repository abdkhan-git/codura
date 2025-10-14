import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const avatar = formData.get('avatar') as File;

    if (!avatar) {
      return NextResponse.json({ error: 'No avatar file provided' }, { status: 400 });
    }

    // Validate file type
    if (!avatar.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (avatar.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Get file extension
    const fileExt = avatar.name.split('.').pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = fileName; // Just the filename, not avatars/filename

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await avatar.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Delete old avatar if exists
    const { data: existingFiles } = await supabase
      .storage
      .from('avatars')
      .list('', {
        search: user.id
      });

    if (existingFiles && existingFiles.length > 0) {
      await supabase
        .storage
        .from('avatars')
        .remove(existingFiles.map(file => file.name));
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: avatar.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(filePath);

    return NextResponse.json({ avatarUrl: publicUrl }, { status: 200 });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
