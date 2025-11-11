import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/study-pods/[id]/members/[memberId]
 * Update member role (promote/demote)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, memberId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if requester is owner or moderator
    const { data: requesterMember } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!requesterMember || !['owner', 'moderator'].includes(requesterMember.role)) {
      return NextResponse.json(
        { error: 'Only pod owners and moderators can manage members' },
        { status: 403 }
      );
    }

    // Get the member to be updated
    const { data: targetMember } = await supabase
      .from('study_pod_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('pod_id', podId)
      .eq('status', 'active')
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { role } = body;

    if (!['member', 'moderator'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "member" or "moderator"' },
        { status: 400 }
      );
    }

    // Only owner can promote to moderator or demote moderators
    if (requesterMember.role !== 'owner' && (role === 'moderator' || targetMember.role === 'moderator')) {
      return NextResponse.json(
        { error: 'Only pod owner can promote/demote moderators' },
        { status: 403 }
      );
    }

    // Cannot change owner role
    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change owner role. Transfer ownership instead.' },
        { status: 400 }
      );
    }

    // Update member role
    const { error: updateError } = await supabase
      .from('study_pod_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', memberId);

    if (updateError) {
      console.error('Error updating member role:', updateError);
      return NextResponse.json(
        { error: 'Failed to update member role' },
        { status: 500 }
      );
    }

    // Create activity log
    await supabase.from('study_pod_activities').insert({
      pod_id: podId,
      user_id: targetMember.user_id,
      activity_type: 'announcement',
      title: role === 'moderator' ? 'Member promoted' : 'Moderator demoted',
      description: `Role changed to ${role}`,
    });

    return NextResponse.json({
      success: true,
      message: `Member role updated to ${role}`,
    });
  } catch (error) {
    console.error('Unexpected error updating member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/study-pods/[id]/members/[memberId]
 * Remove member from pod
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, memberId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if requester is owner or moderator
    const { data: requesterMember } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!requesterMember || !['owner', 'moderator'].includes(requesterMember.role)) {
      return NextResponse.json(
        { error: 'Only pod owners and moderators can remove members' },
        { status: 403 }
      );
    }

    // Get the member to be removed
    const { data: targetMember } = await supabase
      .from('study_pod_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('pod_id', podId)
      .eq('status', 'active')
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot remove owner
    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove pod owner' },
        { status: 400 }
      );
    }

    // Only owner can remove moderators
    if (requesterMember.role !== 'owner' && targetMember.role === 'moderator') {
      return NextResponse.json(
        { error: 'Only pod owner can remove moderators' },
        { status: 403 }
      );
    }

    // Update member status to 'removed'
    const { error: updateError } = await supabase
      .from('study_pod_members')
      .update({
        status: 'removed',
        removed_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (updateError) {
      console.error('Error removing member:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      );
    }

    // Update member count
    const { data: activeMembers } = await supabase
      .from('study_pod_members')
      .select('id')
      .eq('pod_id', podId)
      .eq('status', 'active');

    await supabase
      .from('study_pods')
      .update({ current_member_count: activeMembers?.length || 0 })
      .eq('id', podId);

    // Create activity log
    await supabase.from('study_pod_activities').insert({
      pod_id: podId,
      user_id: targetMember.user_id,
      activity_type: 'member_left',
      title: 'Member removed',
      description: 'Member was removed from the pod',
    });

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    console.error('Unexpected error removing member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
