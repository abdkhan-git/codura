import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: identifier } = await params;

    // Try to find user by username or user_id
    let query = supabase
      .from('users')
      .select('*')
      .limit(1);

    // Check if it's a UUID (user_id) or username
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    if (isUUID) {
      query = query.eq('user_id', identifier);
    } else {
      query = query.eq('username', identifier);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Check privacy settings
    const { data: privacySettings } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', user.user_id)
      .single();

    // Check if profile is viewable
    const isOwnProfile = currentUser.id === user.user_id;
    const isPublic = privacySettings?.profile_visibility === 'public' || user.is_public;

    if (!isOwnProfile && !isPublic) {
      // Check if they're connections
      const { data: connection } = await supabase
        .from('connections')
        .select('id')
        .or(`and(from_user_id.eq.${currentUser.id},to_user_id.eq.${user.user_id}),and(from_user_id.eq.${user.user_id},to_user_id.eq.${currentUser.id})`)
        .eq('status', 'accepted')
        .single();

      if (!connection && privacySettings?.profile_visibility === 'connections') {
        return NextResponse.json({ error: 'Profile is private' }, { status: 403 });
      }

      if (!connection && privacySettings?.profile_visibility === 'private') {
        return NextResponse.json({ error: 'Profile is private' }, { status: 403 });
      }
    }

    return NextResponse.json({
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        university: user.university,
        location: user.location,
        job_title: user.job_title,
        github_username: user.github_username,
        linkedin_username: user.linkedin_username,
        is_public: user.is_public,
        created_at: user.created_at,
      }
    });

  } catch (error) {
    console.error('User fetch API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
