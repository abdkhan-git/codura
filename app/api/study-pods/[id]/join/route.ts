import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/study-pods/[id]/join
 * Join a study pod
 */
export async function POST(
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

    // Get pod details
    const { data: pod, error: podError } = await supabase
      .from('study_pods')
      .select('*, current_member_count, max_members, requires_approval, is_public, status, group_chat_id')
      .eq('id', podId)
      .single();

    if (podError || !pod) {
      return NextResponse.json({ error: 'Pod not found' }, { status: 404 });
    }

    // Check if pod is active
    if (pod.status !== 'active') {
      return NextResponse.json({ error: 'This pod is not active' }, { status: 400 });
    }

    // Check if already a member or has previous membership
    const { data: existingMember } = await supabase
      .from('study_pod_members')
      .select('id, status, role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .maybeSingle(); // Use maybeSingle instead of single to avoid error if not found

    if (existingMember) {
      if (existingMember.status === 'active') {
        return NextResponse.json({ error: 'Already a member of this pod' }, { status: 400 });
      }
      if (existingMember.status === 'pending') {
        return NextResponse.json({ error: 'Join request pending approval' }, { status: 400 });
      }
      // If status is 'left' or 'removed', they can rejoin - we'll update the record below
    }

    // Count current active members
    const { data: members } = await supabase
      .from('study_pod_members')
      .select('id')
      .eq('pod_id', podId)
      .eq('status', 'active');

    const currentCount = members?.length || 0;

    // Check if pod is full
    if (currentCount >= pod.max_members) {
      return NextResponse.json({ error: 'Pod is full' }, { status: 400 });
    }

    // Determine status based on requires_approval
    const memberStatus = pod.requires_approval ? 'pending' : 'active';

    let newMember;
    let memberError;

    if (existingMember) {
      // Update existing record (user is rejoining after leaving/being removed)
      const { data, error } = await supabase
        .from('study_pod_members')
        .update({
          status: memberStatus,
          joined_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          removed_by: null,
          removal_reason: null,
        })
        .eq('id', existingMember.id)
        .select()
        .single();

      newMember = data;
      memberError = error;
    } else {
      // Insert new member record
      const { data, error } = await supabase
        .from('study_pod_members')
        .insert({
          pod_id: podId,
          user_id: user.id,
          role: 'member',
          status: memberStatus,
        })
        .select()
        .single();

      newMember = data;
      memberError = error;
    }

    if (memberError) {
      console.error('Error adding member:', memberError);
      return NextResponse.json(
        { error: 'Failed to join pod', details: memberError.message },
        { status: 500 }
      );
    }

    // If approved automatically, update member count
    if (memberStatus === 'active') {
      await supabase
        .from('study_pods')
        .update({ current_member_count: currentCount + 1 })
        .eq('id', podId);

      // Create activity
      await supabase.from('study_pod_activities').insert({
        pod_id: podId,
        user_id: user.id,
        activity_type: 'member_joined',
        title: 'New member joined',
        description: 'A new member joined the pod',
      });

      // Add user to group chat if it exists
      if (pod.group_chat_id) {
        console.log('Adding user to group chat:', pod.group_chat_id);
        const { error: chatError } = await supabase
          .from('conversation_participants')
          .insert({
            conversation_id: pod.group_chat_id,
            user_id: user.id,
            role: 'member',
            added_by: user.id,
            status: 'active',
          });

        if (chatError) {
          console.error('Error adding user to group chat:', chatError);
          // Don't fail the join if chat addition fails
        } else {
          console.log('User successfully added to group chat');
        }
      }
    } else {
      // Check if a pending join request already exists
      const { data: existingRequest } = await supabase
        .from('study_pod_join_requests')
        .select('id, status')
        .eq('pod_id', podId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (!existingRequest) {
        // Create join request for approval
        const { error: requestError } = await supabase
          .from('study_pod_join_requests')
          .insert({
            pod_id: podId,
            user_id: user.id,
            status: 'pending',
          });

        if (requestError) {
          console.error('Error creating join request:', requestError);
          return NextResponse.json(
            { error: 'Failed to create join request', details: requestError.message },
            { status: 500 }
          );
        }

        // Get pod admins and moderators to notify
        const { data: admins } = await supabase
          .from('study_pod_members')
          .select('user_id')
          .eq('pod_id', podId)
          .in('role', ['owner', 'moderator'])
          .eq('status', 'active');

        // Create notifications for all admins/moderators
        if (admins && admins.length > 0) {
          const notifications = admins.map((admin) => ({
            user_id: admin.user_id,
            actor_id: user.id,
            type: 'connection_request',
            notification_type: 'connection_request',
            title: 'New Join Request',
            message: `Someone wants to join ${pod.name}`,
            link: `/study-pods/${podId}?tab=members`,
            priority: 'normal',
            metadata: {
              pod_id: podId,
              pod_name: pod.name,
              requester_id: user.id,
            },
          }));

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifError) {
            console.error('Error creating notifications:', notifError);
            // Don't fail the join request if notification creation fails
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      member: newMember,
      requires_approval: pod.requires_approval,
      message: pod.requires_approval
        ? 'Join request sent for approval'
        : 'Successfully joined the pod',
    });
  } catch (error) {
    console.error('Unexpected error joining pod:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
