import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/[id]/join-requests
 * Get all pending join requests for a pod (owner/moderator only)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if requester is owner or moderator
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member || !['owner', 'moderator'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Only pod owners and moderators can view join requests' },
        { status: 403 }
      );
    }

    // Get all pending join requests with user details
    const { data: requests, error: requestsError } = await supabase
      .from('study_pod_join_requests')
      .select('*')
      .eq('pod_id', podId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching join requests:', requestsError);
      return NextResponse.json(
        { error: 'Failed to fetch join requests' },
        { status: 500 }
      );
    }

    // Get user details for all requesters
    const userIds = requests?.map(r => r.user_id) || [];
    let enrichedRequests: any[] = [];

    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', userIds);

      enrichedRequests = requests?.map(request => ({
        ...request,
        user: usersData?.find(u => u.user_id === request.user_id) || null,
      })) || [];
    }

    return NextResponse.json({
      requests: enrichedRequests,
      total: enrichedRequests.length,
    });
  } catch (error) {
    console.error('Unexpected error fetching join requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
