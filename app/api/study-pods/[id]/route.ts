import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/[id]
 * Get detailed information about a specific study pod
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId } = await params;

    // Get authenticated user (optional for public pods)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Get pod details
    const { data: pod, error: podError } = await supabase
      .from('study_pods')
      .select('*')
      .eq('id', podId)
      .single();

    if (podError || !pod) {
      return NextResponse.json(
        { error: 'Study pod not found' },
        { status: 404 }
      );
    }

    // Check if user is a member or if pod is public
    const { data: membership } = await supabase
      .from('study_pod_members')
      .select('*')
      .eq('pod_id', podId)
      .eq('user_id', userId || '')
      .eq('status', 'active')
      .single();

    if (!pod.is_public && !membership) {
      return NextResponse.json(
        { error: 'This is a private study pod' },
        { status: 403 }
      );
    }

    // Get all active members
    const { data: memberRecords, error: membersError } = await supabase
      .from('study_pod_members')
      .select('*')
      .eq('pod_id', podId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true });

    if (membersError) {
      console.error('Error fetching members:', membersError);
    }

    // Get user details for all members
    const memberUserIds = memberRecords?.map(m => m.user_id) || [];
    let members: any[] = [];

    if (memberUserIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, username, full_name, avatar_url, bio, university, job_title')
        .in('user_id', memberUserIds);

      const { data: statsData } = await supabase
        .from('user_stats')
        .select('user_id, total_solved, current_streak, contest_rating')
        .in('user_id', memberUserIds);

      // Merge the data
      members = memberRecords?.map(member => ({
        ...member,
        users: usersData?.find(u => u.user_id === member.user_id) || null,
        user_stats: statsData?.find(s => s.user_id === member.user_id) || null,
      })) || [];
    }

    console.log('Pod members query result:', { podId, membersCount: members?.length });

    // Get creator details
    const { data: creator } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .eq('user_id', pod.created_by)
      .single();

    // Get upcoming sessions
    const { data: upcomingSessions } = await supabase
      .from('study_pod_sessions')
      .select(`
        *,
        users!study_pod_sessions_host_user_id_fkey (
          user_id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('pod_id', podId)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at', { ascending: true })
      .limit(5);

    // Get recent activities
    const { data: activities } = await supabase
      .from('study_pod_activities')
      .select(`
        *,
        users (
          user_id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('pod_id', podId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Check join eligibility if user is authenticated
    let joinStatus = null;
    if (userId && !membership) {
      const { data: canJoin } = await supabase.rpc('can_user_join_pod', {
        user_uuid: userId,
        pod_uuid: podId,
      });
      joinStatus = canJoin;
    }

    // Get pod statistics
    const enrichedPod = {
      ...pod,
      creator,
      members: members || [],
      upcoming_sessions: upcomingSessions || [],
      recent_activities: activities || [],
      is_member: !!membership,
      user_role: membership?.role || null,
      user_membership: membership || null,
      join_status: joinStatus,
      current_member_count: members?.length || 0,
    };

    return NextResponse.json({
      pod: enrichedPod,
    });
  } catch (error) {
    console.error('Error fetching study pod details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/study-pods/[id]
 * Update study pod details (owner/moderator only)
 */
export async function PATCH(
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

    // Check if user is owner or moderator
    const { data: membership } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'moderator'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only pod owners and moderators can update the pod' },
        { status: 403 }
      );
    }

    // Parse request body
    const updates = await request.json();

    // Filter allowed fields
    const allowedFields = [
      'name',
      'description',
      'subject',
      'skill_level',
      'max_members',
      'is_public',
      'requires_approval',
      'meeting_schedule',
      'topics',
      'goals',
      'status',
      'thumbnail_url',
      'color_scheme',
      'target_problems_count',
      'next_session_at',
    ];

    const filteredUpdates: any = {};
    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    filteredUpdates.updated_at = new Date().toISOString();

    // Update the pod
    const { data: updatedPod, error: updateError } = await supabase
      .from('study_pods')
      .update(filteredUpdates)
      .eq('id', podId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating study pod:', updateError);
      return NextResponse.json(
        { error: 'Failed to update study pod' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pod: updatedPod,
      message: 'Study pod updated successfully',
    });
  } catch (error) {
    console.error('Unexpected error updating study pod:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/study-pods/[id]
 * Delete/archive a study pod (owner only)
 */
export async function DELETE(
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

    // Check if user is owner
    const { data: pod } = await supabase
      .from('study_pods')
      .select('created_by')
      .eq('id', podId)
      .single();

    if (!pod || pod.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only pod owner can delete the pod' },
        { status: 403 }
      );
    }

    // Archive instead of delete (soft delete)
    const { error: archiveError } = await supabase
      .from('study_pods')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', podId);

    if (archiveError) {
      console.error('Error archiving study pod:', archiveError);
      return NextResponse.json(
        { error: 'Failed to archive study pod' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Study pod archived successfully',
    });
  } catch (error) {
    console.error('Unexpected error deleting study pod:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
