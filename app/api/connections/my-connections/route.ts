import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/connections/my-connections
 * Get user's accepted connections with search and sorting
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('q') || null;
    const sortBy = searchParams.get('sort') || 'recent';

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
        avatar_url,
        job_title,
        university,
        graduation_year,
        bio,
        is_public
      `)
      .in('user_id', connectionUserIds);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // Fetch user stats for all connections
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select(`
        user_id,
        total_solved,
        current_streak,
        contest_rating
      `)
      .in('user_id', connectionUserIds);

    if (statsError) {
      console.error('Error fetching user stats:', statsError);
      // Continue without stats
    }

    // Process the connections data
    const processedConnections = connections.map(conn => {
      const connectionUserId = conn.from_user_id === user.id ? conn.to_user_id : conn.from_user_id;
      const userData = users?.find(u => u.user_id === connectionUserId);
      const statsData = userStats?.find(s => s.user_id === connectionUserId);
      
      if (!userData) {
        return null; // Skip if user data not found
      }


      return {
        user: {
          user_id: userData.user_id,
          username: userData.username,
          full_name: userData.full_name,
          avatar_url: userData.avatar_url,
          job_title: userData.job_title,
          university: userData.university,
          graduation_year: userData.graduation_year,
          bio: userData.bio,
          total_solved: statsData?.total_solved || 0,
          current_streak: statsData?.current_streak || 0,
          contest_rating: statsData?.contest_rating || 0,
        },
        connected_at: conn.created_at,
        mutual_connections: 0, // Will be calculated separately if needed
      };
    }).filter(Boolean);

    // Apply search filter if provided
    let filteredConnections = processedConnections;
    if (searchQuery) {
      filteredConnections = processedConnections.filter(conn =>
        conn.user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conn.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conn.user.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conn.user.university?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'name':
        filteredConnections.sort((a, b) => (a.user.full_name || '').localeCompare(b.user.full_name || ''));
        break;
      case 'activity':
        filteredConnections.sort((a, b) => (b.user.total_solved || 0) - (a.user.total_solved || 0));
        break;
      case 'mutual':
        // For mutual connections, we'll sort by connection date as a proxy
        filteredConnections.sort((a, b) => new Date(b.connected_at).getTime() - new Date(a.connected_at).getTime());
        break;
      case 'recent':
      default:
        filteredConnections.sort((a, b) => new Date(b.connected_at).getTime() - new Date(a.connected_at).getTime());
        break;
    }

    // Calculate mutual connections for each connection
    for (const connection of filteredConnections) {
      const { data: mutualCount } = await supabase.rpc('get_mutual_connections_count', {
        user1_id: user.id,
        user2_id: connection.user.user_id,
      });
      connection.mutual_connections = mutualCount || 0;
    }

    return NextResponse.json({
      connections: processedConnections,
      total: processedConnections.length,
    });
  } catch (error) {
    console.error('Error in my-connections API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

