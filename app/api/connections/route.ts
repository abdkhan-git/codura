import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/connections
 * Get user's accepted connections (simplified format for messaging)
 * For full connection details, use /api/connections/my-connections
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get accepted connections
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select(`
        id,
        created_at,
        from_user_id,
        to_user_id
      `)
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      return NextResponse.json({ error: connectionsError.message }, { status: 500 });
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        connections: [],
        total: 0,
      });
    }

    // Get user IDs of connections
    const connectionUserIds = connections.map(conn =>
      conn.from_user_id === user.id ? conn.to_user_id : conn.from_user_id
    );

    // Fetch user data for all connections
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        user_id,
        username,
        full_name,
        avatar_url
      `)
      .in('user_id', connectionUserIds);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // Process the connections data (simplified format)
    const processedConnections = connections.map(conn => {
      const connectionUserId = conn.from_user_id === user.id ? conn.to_user_id : conn.from_user_id;
      const userData = users?.find(u => u.user_id === connectionUserId);

      if (!userData) {
        return null;
      }

      return {
        user_id: userData.user_id,
        username: userData.username,
        full_name: userData.full_name,
        avatar_url: userData.avatar_url,
        connected_at: conn.created_at,
      };
    }).filter(Boolean);

    return NextResponse.json({
      connections: processedConnections,
      total: processedConnections.length,
    });
  } catch (error) {
    console.error('Error in /api/connections:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
