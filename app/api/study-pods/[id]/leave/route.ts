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
    const { data: member, error: memberError } = await supabase
      .from('study_pod_members')
      .select('*, study_pods!inner(created_by)')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Not a member of this pod' }, { status: 404 });
    }

    // Check if user is the owner
    if (member.role === 'owner') {
      return NextResponse.json(
        { error: 'Pod owner cannot leave. Transfer ownership or delete the pod instead.' },
        { status: 400 }
      );
    }

    // Update member status to 'left'
    const { error: updateError } = await supabase
      .from('study_pod_members')
      .update({ status: 'left' })
      .eq('id', member.id);

    if (updateError) {
      console.error('Error leaving pod:', updateError);
      return NextResponse.json(
        { error: 'Failed to leave pod', details: updateError.message },
        { status: 500 }
      );
    }

    // Get current member count
    const { data: activeMembers } = await supabase
      .from('study_pod_members')
      .select('id')
      .eq('pod_id', podId)
      .eq('status', 'active');

    const newCount = activeMembers?.length || 0;

    // Update pod member count
    await supabase
      .from('study_pods')
      .update({ current_member_count: newCount })
      .eq('id', podId);

    // Create activity
    await supabase.from('study_pod_activities').insert({
      pod_id: podId,
      user_id: user.id,
      activity_type: 'member_left',
      title: 'Member left',
      description: 'A member left the pod',
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully left the pod',
    });
  } catch (error) {
    console.error('Unexpected error leaving pod:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
