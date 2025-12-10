import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/study-pods/join-requests/[requestId]
 * Approve or reject a join request
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const supabase = await createClient();
    const { requestId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { action, rejection_reason } = body;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get the join request
    const { data: joinRequest, error: requestError } = await supabase
      .from('study_pod_join_requests')
      .select('*, pod:study_pods!inner(*)')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single();

    if (requestError || !joinRequest) {
      return NextResponse.json(
        { error: 'Join request not found or already processed' },
        { status: 404 }
      );
    }

    // Check if requester is owner or moderator
    const { data: requesterMember } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', joinRequest.pod_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!requesterMember || !['owner', 'moderator'].includes(requesterMember.role)) {
      return NextResponse.json(
        { error: 'Only pod owners and moderators can review join requests' },
        { status: 403 }
      );
    }

    if (action === 'approve') {
      // Check if pod is full
      const { data: activeMembers } = await supabase
        .from('study_pod_members')
        .select('id')
        .eq('pod_id', joinRequest.pod_id)
        .eq('status', 'active');

      if ((activeMembers?.length || 0) >= joinRequest.pod.max_members) {
        return NextResponse.json(
          { error: 'Pod is full' },
          { status: 400 }
        );
      }

      // Check if user already has a membership record
      const { data: existingMember } = await supabase
        .from('study_pod_members')
        .select('id, status')
        .eq('pod_id', joinRequest.pod_id)
        .eq('user_id', joinRequest.user_id)
        .maybeSingle();

      if (existingMember) {
        if (existingMember.status === 'active') {
          return NextResponse.json(
            { error: 'User is already an active member' },
            { status: 400 }
          );
        }
        // Update existing record (rejoining)
        await supabase
          .from('study_pod_members')
          .update({
            status: 'active',
            role: 'member',
            joined_at: new Date().toISOString(),
            last_active_at: new Date().toISOString(),
            removed_by: null,
            removal_reason: null,
          })
          .eq('id', existingMember.id);
      } else {
        // Create new membership
        await supabase
          .from('study_pod_members')
          .insert({
            pod_id: joinRequest.pod_id,
            user_id: joinRequest.user_id,
            role: 'member',
            status: 'active',
          });
      }

      // Update member count
      await supabase
        .from('study_pods')
        .update({ current_member_count: (activeMembers?.length || 0) + 1 })
        .eq('id', joinRequest.pod_id);

      // Create activity log
      await supabase.from('study_pod_activities').insert({
        pod_id: joinRequest.pod_id,
        user_id: joinRequest.user_id,
        activity_type: 'member_joined',
        title: 'New member joined',
        description: 'Join request was approved',
      });

      // Add user to group chat if it exists
      if (joinRequest.pod.group_chat_id) {
        console.log('Adding approved user to group chat:', joinRequest.pod.group_chat_id);
        const { error: chatError } = await supabase
          .from('conversation_participants')
          .insert({
            conversation_id: joinRequest.pod.group_chat_id,
            user_id: joinRequest.user_id,
            role: 'member',
            added_by: user.id,
            status: 'active',
          });

        if (chatError) {
          console.error('Error adding user to group chat:', chatError);
          // Don't fail the approval if chat addition fails
        }
      }
    }

    // Update join request status
    const { error: updateError } = await supabase
      .from('study_pod_join_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: action === 'reject' ? rejection_reason : null,
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating join request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update join request' },
        { status: 500 }
      );
    }

    // Create notification for the requester
    await supabase.from('notifications').insert({
      user_id: joinRequest.user_id,
      actor_id: user.id,
      type: action === 'approve' ? 'connection_accepted' : 'connection_request',
      notification_type: action === 'approve' ? 'connection_accepted' : 'connection_request',
      title: action === 'approve' ? 'Join Request Approved' : 'Join Request Rejected',
      message: action === 'approve'
        ? `Your request to join ${joinRequest.pod.name} has been approved!`
        : `Your request to join ${joinRequest.pod.name} was not approved.`,
      link: `/study-pods/${joinRequest.pod_id}`,
      priority: action === 'approve' ? 'high' : 'normal',
      metadata: {
        pod_id: joinRequest.pod_id,
        pod_name: joinRequest.pod.name,
        action: action,
        rejection_reason: rejection_reason || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: action === 'approve'
        ? 'Join request approved successfully'
        : 'Join request rejected',
    });
  } catch (error) {
    console.error('Unexpected error processing join request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
