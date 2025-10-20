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

    // Use the search function
    const { data: pods, error: podsError } = await supabase.rpc(
      'search_study_pods',
      {
        search_query: query,
        filter_subject: subject,
        filter_skill_level: skillLevel,
        filter_status: status,
        only_public: onlyPublic,
        only_with_space: onlyWithSpace,
        user_uuid: userId,
        limit_count: limit,
        offset_count: offset,
      }
    );

    if (podsError) {
      console.error('Error searching study pods:', podsError);
      return NextResponse.json(
        { error: 'Failed to search study pods' },
        { status: 500 }
      );
    }

    // Get member details for each pod (up to 5 members for preview)
    const podIds = pods?.map((p: any) => p.id) || [];

    let membersData: any[] = [];
    if (podIds.length > 0) {
      const { data: members } = await supabase
        .from('study_pod_members')
        .select(`
          pod_id,
          user_id,
          role,
          users!inner (
            user_id,
            username,
            full_name,
            avatar_url
          )
        `)
        .in('pod_id', podIds)
        .eq('status', 'active')
        .order('joined_at', { ascending: true })
        .limit(5);

      membersData = members || [];
    }

    // Enrich pods with member data
    const enrichedPods = pods?.map((pod: any) => {
      const podMembers = membersData
        .filter((m: any) => m.pod_id === pod.id)
        .map((m: any) => ({
          user_id: m.users.user_id,
          username: m.users.username,
          full_name: m.users.full_name,
          avatar_url: m.users.avatar_url,
          role: m.role,
        }));

      return {
        ...pod,
        members: podMembers,
        members_preview: podMembers.slice(0, 3), // First 3 for card display
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
