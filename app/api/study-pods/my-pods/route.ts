import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/my-pods
 * Get user's study pods (pods they're a member of)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the RPC function to get user's pods
    const { data: pods, error: podsError } = await supabase.rpc(
      'get_user_study_pods',
      {
        user_uuid: user.id,
      }
    );

    if (podsError) {
      console.error('Error fetching user pods:', podsError);
      return NextResponse.json(
        { error: 'Failed to fetch your study pods' },
        { status: 500 }
      );
    }

    // Get member details for each pod
    const podIds = pods?.map((p: any) => p.pod_id) || [];

    let enrichedPods: any[] = [];

    if (podIds.length > 0) {
      // Get full pod details
      const { data: fullPods } = await supabase
        .from('study_pods')
        .select('*')
        .in('id', podIds);

      // Get members for each pod
      const { data: memberRecords } = await supabase
        .from('study_pod_members')
        .select('pod_id, user_id, role')
        .in('pod_id', podIds)
        .eq('status', 'active')
        .order('joined_at', { ascending: true });

      // Get user details
      const memberUserIds = [...new Set(memberRecords?.map(m => m.user_id) || [])];
      let usersData: any[] = [];

      if (memberUserIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('user_id, username, full_name, avatar_url')
          .in('user_id', memberUserIds);

        usersData = users || [];
      }

      // Merge member and user data
      const allMembers = memberRecords?.map(member => ({
        ...member,
        users: usersData.find(u => u.user_id === member.user_id) || null,
      })) || [];

      // Merge data
      enrichedPods = pods?.map((pod: any) => {
        const fullPod = fullPods?.find((p: any) => p.id === pod.pod_id);
        const podMembers = allMembers.filter((m: any) => m.pod_id === pod.pod_id);
        const members = podMembers.map((m: any) => ({
          user_id: m.users?.user_id || m.user_id,
          username: m.users?.username,
          full_name: m.users?.full_name,
          avatar_url: m.users?.avatar_url,
          role: m.role,
        }));

        return {
          ...fullPod,
          user_role: pod.user_role,
          is_owner: pod.is_owner,
          is_member: true, // User is always a member in "My Pods"
          members: members || [],
          members_preview: members?.slice(0, 3) || [],
          current_member_count: podMembers.length,
        };
      }) || [];
    }

    // Get user's pod statistics
    const { data: stats } = await supabase.rpc('get_user_pod_statistics', {
      user_uuid: user.id,
    });

    return NextResponse.json({
      pods: enrichedPods,
      total: enrichedPods.length,
      statistics: stats || {},
    });
  } catch (error) {
    console.error('Unexpected error fetching user pods:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
