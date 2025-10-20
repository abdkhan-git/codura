import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/study-pods/[id]/leave
 * Leave a study pod
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

    // Check if user is a member
    const { data: membership } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this study pod' },
        { status: 400 }
      );
    }

    // Check if user is the owner
    const { data: pod } = await supabase
      .from('study_pods')
      .select('created_by, name, current_member_count')
      .eq('id', podId)
      .single();

    if (pod?.created_by === user.id) {
      // Owner leaving - check if there are other members
      if (pod.current_member_count > 1) {
        // Transfer ownership to oldest moderator or member
        const { data: nextOwner } = await supabase
          .from('study_pod_members')
          .select('user_id, role')
          .eq('pod_id', podId)
          .eq('status', 'active')
          .neq('user_id', user.id)
          .order('role', { ascending: true }) // Prefer moderators
          .order('joined_at', { ascending: true })
          .limit(1)
          .single();

        if (nextOwner) {
          // Promote next member to owner
          await supabase
            .from('study_pod_members')
            .update({ role: 'owner', updated_at: new Date().toISOString() })
            .eq('pod_id', podId)
            .eq('user_id', nextOwner.user_id);

          // Notify new owner
          await supabase.from('notifications').insert({
            user_id: nextOwner.user_id,
            actor_id: user.id,
            type: 'system_announcement',
            notification_type: 'system_announcement',
            title: 'You are now pod owner',
            message: `You have been promoted to owner of ${pod.name}`,
            link: `/study-pods/${podId}`,
            metadata: { pod_id: podId },
          });
        }
      } else {
        // Last member leaving - archive the pod
        await supabase
          .from('study_pods')
          .update({
            status: 'archived',
            archived_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', podId);
      }
    }

    // Update member status to 'left'
    const { error: leaveError } = await supabase
      .from('study_pod_members')
      .update({
        status: 'left',
        updated_at: new Date().toISOString(),
      })
      .eq('pod_id', podId)
      .eq('user_id', user.id);

    if (leaveError) {
      console.error('Error leaving study pod:', leaveError);
      return NextResponse.json(
        { error: 'Failed to leave study pod' },
        { status: 500 }
      );
    }

    // Create activity
    await supabase.from('study_pod_activities').insert({
      pod_id: podId,
      user_id: user.id,
      activity_type: 'member_left',
      title: 'Member left',
      description: 'Left the study pod',
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully left the study pod',
    });
  } catch (error) {
    console.error('Unexpected error leaving study pod:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
