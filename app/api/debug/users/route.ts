import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/users
 * Debug endpoint to check users in database
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('user_id, full_name, university, graduation_year, created_at')
      .order('created_at', { ascending: false });

    // Get current user's profile
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select('user_id, full_name, university, graduation_year')
      .eq('user_id', user.id)
      .single();

    // Get connections
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('from_user_id, to_user_id, status')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

    return NextResponse.json({
      currentUser,
      currentUserError: currentUserError?.message,
      allUsers: allUsers?.slice(0, 10), // First 10 users
      allUsersCount: allUsers?.length || 0,
      allUsersError: allUsersError?.message,
      connections: connections,
      connectionsCount: connections?.length || 0,
      connectionsError: connectionsError?.message,
    });

  } catch (error) {
    console.error('Debug users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
