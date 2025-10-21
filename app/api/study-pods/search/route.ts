import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/search
 * Search and filter study pods
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user (optional for public pods)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || null;
    const subject = searchParams.get('subject') || null;
    const skillLevel = searchParams.get('skill_level') || null;
    const status = searchParams.get('status') || 'active';
    const onlyPublic = searchParams.get('only_public') !== 'false';
    const onlyWithSpace = searchParams.get('only_with_space') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let podsQuery = supabase
      .from('study_pods')
      .select('*');

    // Apply filters
    if (onlyPublic) {
      podsQuery = podsQuery.eq('is_public', true);
    }

    if (status) {
      podsQuery = podsQuery.eq('status', status);
    }

    if (subject) {
      podsQuery = podsQuery.eq('subject', subject);
    }

    if (skillLevel) {
      podsQuery = podsQuery.eq('skill_level', skillLevel);
    }

    if (query) {
      podsQuery = podsQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }

    // Execute query
    const { data: pods, error: podsError } = await podsQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (podsError) {
      console.error('Error searching study pods:', podsError);
      return NextResponse.json(
        { error: 'Failed to search study pods', details: podsError.message },
        { status: 500 }
      );
    }

    // Get member counts and details for each pod
    const podIds = pods?.map((p: any) => p.id) || [];

    let membersData: any[] = [];
    let memberCounts: Map<string, number> = new Map();

    if (podIds.length > 0) {
      // Get all active members for member count
      const { data: allMembers } = await supabase
        .from('study_pod_members')
        .select('pod_id')
        .in('pod_id', podIds)
        .eq('status', 'active');

      // Count members per pod
      allMembers?.forEach((m: any) => {
        memberCounts.set(m.pod_id, (memberCounts.get(m.pod_id) || 0) + 1);
      });

      console.log('Search - Member counts:', Object.fromEntries(memberCounts));

      // Get member records
      const { data: memberRecords } = await supabase
        .from('study_pod_members')
        .select('pod_id, user_id, role')
        .in('pod_id', podIds)
        .eq('status', 'active')
        .order('joined_at', { ascending: true });

      // Get user details for all members
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
      membersData = memberRecords?.map(member => ({
        ...member,
        users: usersData.find(u => u.user_id === member.user_id) || null,
      })) || [];
    }

    // Enrich pods with member data
    const enrichedPods = pods
      ?.filter((pod: any) => {
        // Apply "only with space" filter
        if (onlyWithSpace) {
          const currentCount = memberCounts.get(pod.id) || 0;
          return currentCount < pod.max_members;
        }
        return true;
      })
      .map((pod: any) => {
        const currentMemberCount = memberCounts.get(pod.id) || 0;
        const allPodMembers = membersData.filter((m: any) => m.pod_id === pod.id);
        const podMembersForDisplay = allPodMembers
          .slice(0, 5) // Limit to 5 for performance
          .map((m: any) => ({
            user_id: m.users?.user_id || m.user_id,
            username: m.users?.username,
            full_name: m.users?.full_name,
            avatar_url: m.users?.avatar_url,
            role: m.role,
          }));

        // Check membership against ALL members, not just the 5 displayed
        const isMember = userId ? allPodMembers.some((m: any) => m.user_id === userId) : false;
        const userRole = isMember ? allPodMembers.find((m: any) => m.user_id === userId)?.role : null;

        return {
          ...pod,
          current_member_count: currentMemberCount, // Real count from database
          members: podMembersForDisplay,
          members_preview: podMembersForDisplay.slice(0, 3), // First 3 for card display
          is_member: isMember,
          current_user_id: userId,
          user_role: userRole,
        };
      });

    return NextResponse.json({
      pods: enrichedPods || [],
      total: enrichedPods?.length || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Unexpected error searching study pods:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
