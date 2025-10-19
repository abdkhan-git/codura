import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/[username]/connections
 * Get a user's connections (public list)
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 50)
 */
export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = params.username;

    // Get the target user's ID from username
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('user_id, username, is_public')
      .eq('username', username)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user can view this profile
    if (!targetUser.is_public && targetUser.user_id !== user.id) {
      // Check if they're connected
      const { data: connectionStatus } = await supabase.rpc('get_connection_status', {
        user1_id: user.id,
        user2_id: targetUser.user_id,
      });

      if (connectionStatus !== 'connected') {
        return NextResponse.json({ error: 'This profile is private' }, { status: 403 });
      }
    }

    // Parse pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = (page - 1) * limit;

    // Get connections (bidirectional)
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select(`
        id,
        from_user_id,
        to_user_id,
        created_at
      `)
      .eq('status', 'accepted')
      .or(`from_user_id.eq.${targetUser.user_id},to_user_id.eq.${targetUser.user_id}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (connectionsError) {
      console.error('Connections error:', connectionsError);
      return NextResponse.json({ error: connectionsError.message }, { status: 500 });
    }

    // Get total count
    const { data: totalConnectionsCount } = await supabase.rpc('get_user_connections_count', {
      p_user_id: targetUser.user_id,
    });

    // Extract the other user's ID from each connection
    const connectionUserIds = connections.map((conn) =>
      conn.from_user_id === targetUser.user_id ? conn.to_user_id : conn.from_user_id
    );

    if (connectionUserIds.length === 0) {
      return NextResponse.json({
        connections: [],
        pagination: {
          page,
          limit,
          total: totalConnectionsCount || 0,
          totalPages: Math.ceil((totalConnectionsCount || 0) / limit),
          hasMore: false,
        },
      });
    }

    // Get user details for each connection
    const { data: connectionUsers, error: usersError } = await supabase
      .from('users')
      .select(`
        user_id,
        username,
        full_name,
        avatar_url,
        university,
        graduation_year,
        job_title,
        bio,
        user_stats (
          total_solved,
          current_streak,
          contest_rating
        )
      `)
      .in('user_id', connectionUserIds);

    if (usersError) {
      console.error('Users error:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // Get connection status and mutual connections for each user (relative to viewing user)
    const connectionsWithDetails = await Promise.all(
      connectionUsers.map(async (connectionUser: any) => {
        const { data: connectionStatus } = await supabase.rpc('get_connection_status', {
          user1_id: user.id,
          user2_id: connectionUser.user_id,
        });

        const { data: mutualCount } = await supabase.rpc('get_mutual_connections_count', {
          user1_id: user.id,
          user2_id: connectionUser.user_id,
        });

        const stats = connectionUser.user_stats?.[0] || {
          total_solved: 0,
          current_streak: 0,
          contest_rating: 0,
        };

        return {
          user_id: connectionUser.user_id,
          username: connectionUser.username,
          full_name: connectionUser.full_name,
          avatar_url: connectionUser.avatar_url,
          university: connectionUser.university,
          graduation_year: connectionUser.graduation_year,
          job_title: connectionUser.job_title,
          bio: connectionUser.bio,
          total_solved: stats.total_solved,
          current_streak: stats.current_streak,
          contest_rating: stats.contest_rating,
          connection_status: connectionStatus || 'none',
          mutual_connections_count: mutualCount || 0,
          is_public: true, // Only showing public profiles
        };
      })
    );

    return NextResponse.json({
      connections: connectionsWithDetails,
      pagination: {
        page,
        limit,
        total: totalConnectionsCount || 0,
        totalPages: Math.ceil((totalConnectionsCount || 0) / limit),
        hasMore: offset + limit < (totalConnectionsCount || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
