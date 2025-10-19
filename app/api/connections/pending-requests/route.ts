import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/connections/pending-requests
 * Get user's pending connection requests (both sent and received)
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

    // Get received requests (where current user is the recipient)
    const { data: receivedRequests, error: receivedError } = await supabase
      .from('connections')
      .select(`
        id,
        created_at,
        message,
        from_user_id
      `)
      .eq('to_user_id', user.id)
      .eq('status', 'pending');

    if (receivedError) {
      console.error('Error fetching received requests:', receivedError);
      return NextResponse.json({ error: receivedError.message }, { status: 500 });
    }

    // Get sent requests (where current user is the sender)
    const { data: sentRequests, error: sentError } = await supabase
      .from('connections')
      .select(`
        id,
        created_at,
        message,
        to_user_id
      `)
      .eq('from_user_id', user.id)
      .eq('status', 'pending');

    if (sentError) {
      console.error('Error fetching sent requests:', sentError);
      return NextResponse.json({ error: sentError.message }, { status: 500 });
    }

    // Get all user IDs involved in requests
    const allUserIds = [
      ...(receivedRequests?.map(req => req.from_user_id) || []),
      ...(sentRequests?.map(req => req.to_user_id) || [])
    ];

    // Fetch user data for all requests
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
      .in('user_id', allUserIds);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    // Fetch user stats for all requests
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select(`
        user_id,
        total_solved,
        current_streak,
        contest_rating
      `)
      .in('user_id', allUserIds);

    if (statsError) {
      console.error('Error fetching user stats:', statsError);
      // Continue without stats
    }

    // Process received requests
    const processedReceivedRequests = receivedRequests?.map(req => {
      const userData = users?.find(u => u.user_id === req.from_user_id);
      const statsData = userStats?.find(s => s.user_id === req.from_user_id);
      
      if (!userData) {
        return null; // Skip if user data not found
      }


      return {
        id: req.id,
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
        message: req.message,
        created_at: req.created_at,
        type: 'received' as const,
      };
    }).filter(Boolean) || [];

    // Process sent requests
    const processedSentRequests = sentRequests?.map(req => {
      const userData = users?.find(u => u.user_id === req.to_user_id);
      const statsData = userStats?.find(s => s.user_id === req.to_user_id);
      
      if (!userData) {
        return null; // Skip if user data not found
      }


      return {
        id: req.id,
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
        message: req.message,
        created_at: req.created_at,
        type: 'sent' as const,
      };
    }).filter(Boolean) || [];

    // Combine and filter by search query
    let allRequests = [...processedReceivedRequests, ...processedSentRequests];

    if (searchQuery) {
      allRequests = allRequests.filter(req =>
        req.user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.user.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.user.university?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by creation date (newest first)
    allRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      requests: allRequests,
      total: allRequests.length,
      received: processedReceivedRequests.length,
      sent: processedSentRequests.length,
    });
  } catch (error) {
    console.error('Error in pending-requests API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

