import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/users
 * Debug endpoint to check user data including avatar URLs
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users with their data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        user_id,
        username,
        full_name,
        avatar_url,
        is_public,
        created_at
      `)
      .limit(20);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // Process the data to show what we have
    const processedUsers = users?.map(user => ({
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      has_avatar: !!user.avatar_url,
      avatar_url_length: user.avatar_url?.length || 0,
      is_public: user.is_public,
      created_at: user.created_at
    })) || [];

    return NextResponse.json({
      total_users: processedUsers.length,
      users_with_avatars: processedUsers.filter(u => u.has_avatar).length,
      users_without_avatars: processedUsers.filter(u => !u.has_avatar).length,
      users: processedUsers
    });

  } catch (error) {
    console.error('Debug users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}