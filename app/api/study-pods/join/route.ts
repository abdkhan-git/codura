import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/study-pods/join
 * Join a study pod or submit join request
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { pod_id, message } = await request.json();

    if (!pod_id) {
      return NextResponse.json(
        { error: 'pod_id is required' },
        { status: 400 }
      );
    }

    // Check if user can join using our validation function
    const { data: joinCheck, error: checkError } = await supabase.rpc(
      'can_user_join_pod',
      {
        user_uuid: user.id,
        pod_uuid: pod_id,
      }
    );

    if (checkError) {
      console.error('Error checking join eligibility:', checkError);
      return NextResponse.json(
        { error: 'Failed to check join eligibility' },
        { status: 500 }
      );
    }

    if (!joinCheck.can_join) {
      return NextResponse.json(
        {
          error: joinCheck.message,
          reason: joinCheck.reason,
        },
        { status: 400 }
      );
    }

    // Handle invitation acceptance
    if (joinCheck.reason === 'has_invitation') {
      // Update invitation status
      await supabase
        .from('study_pod_invitations')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', joinCheck.invitation_id);

      // Add user as member
      const { error: memberError } = await supabase
        .from('study_pod_members')
        .insert({
          pod_id,
          user_id: user.id,
          role: 'member',
          status: 'active',
          invited_by: (await supabase
            .from('study_pod_invitations')
            .select('invited_by')
            .eq('id', joinCheck.invitation_id)
            .single()).data?.invited_by,
        });

      if (memberError) {
        console.error('Error adding member:', memberError);
        return NextResponse.json(
          { error: 'Failed to join study pod' },
          { status: 500 }
        );
      }

      // Create activity
      await supabase.from('study_pod_activities').insert({
        pod_id,
        user_id: user.id,
        activity_type: 'member_joined',
        title: 'New member joined',
        description: 'Accepted invitation to join the pod',
      });

      return NextResponse.json({
        success: true,
        message: 'Successfully joined the study pod',
        status: 'active',
      });
    }

    // Handle pods requiring approval
    if (joinCheck.requires_approval) {
      // Create join request
      const { error: requestError } = await supabase
        .from('study_pod_join_requests')
        .insert({
          pod_id,
          user_id: user.id,
          message: message || null,
          status: 'pending',
        });

      if (requestError) {
        console.error('Error creating join request:', requestError);
        return NextResponse.json(
          { error: 'Failed to submit join request' },
          { status: 500 }
        );
      }

      // Notify pod owner/moderators
      const { data: pod } = await supabase
        .from('study_pods')
        .select('created_by, name')
        .eq('id', pod_id)
        .single();

      if (pod) {
        await supabase.from('notifications').insert({
          user_id: pod.created_by,
          actor_id: user.id,
          type: 'study_plan_shared', // Reusing existing type, ideally create 'pod_join_request'
          notification_type: 'study_plan_shared',
          title: 'New join request',
          message: `Someone wants to join ${pod.name}`,
          link: `/study-pods/${pod_id}`,
          metadata: {
            pod_id,
            request_message: message,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Join request submitted. Waiting for approval.',
        status: 'pending',
      });
    }

    // Direct join (public pod, no approval needed)
    const { error: memberError } = await supabase
      .from('study_pod_members')
      .insert({
        pod_id,
        user_id: user.id,
        role: 'member',
        status: 'active',
      });

    if (memberError) {
      console.error('Error adding member:', memberError);
      return NextResponse.json(
        { error: 'Failed to join study pod' },
        { status: 500 }
      );
    }

    // Create activity
    await supabase.from('study_pod_activities').insert({
      pod_id,
      user_id: user.id,
      activity_type: 'member_joined',
      title: 'New member joined',
      description: 'Joined the study pod',
    });

    // Notify pod owner
    const { data: pod } = await supabase
      .from('study_pods')
      .select('created_by, name')
      .eq('id', pod_id)
      .single();

    if (pod && pod.created_by !== user.id) {
      await supabase.from('notifications').insert({
        user_id: pod.created_by,
        actor_id: user.id,
        type: 'activity_reaction',
        notification_type: 'activity_reaction',
        title: 'New pod member',
        message: `Someone joined ${pod.name}`,
        link: `/study-pods/${pod_id}`,
        metadata: { pod_id },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the study pod',
      status: 'active',
    });
  } catch (error) {
    console.error('Unexpected error joining study pod:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
