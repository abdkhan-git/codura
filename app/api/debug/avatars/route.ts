import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/avatars
 * Debug endpoint to check avatar URLs for users
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users with their avatar URLs
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        user_id,
        username,
        full_name,
        avatar_url,
        is_public
      `)
      .limit(10);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    return NextResponse.json({
      users: users?.map(user => ({
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        has_avatar: !!user.avatar_url,
        is_public: user.is_public
      })) || []
    });

  } catch (error) {
    console.error('Debug avatars error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
