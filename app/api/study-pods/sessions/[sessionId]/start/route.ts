import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/study-pods/sessions/[sessionId]/start
 * Start a session (change status to in_progress)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('study_pod_sessions')
      .select('pod_id, host_user_id, status, title')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if session is already in progress or completed
    if (session.status === 'in_progress') {
      return NextResponse.json(
        { error: 'Session is already in progress' },
        { status: 400 }
      );
    }

    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'Session is already completed' },
        { status: 400 }
      );
    }

    if (session.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot start a cancelled session' },
        { status: 400 }
      );
    }

    // Check if user is the host, owner, or moderator
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', session.pod_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const isHost = session.host_user_id === user.id;
    const canStart = member && (['owner', 'moderator'].includes(member.role) || isHost);

    if (!canStart) {
      return NextResponse.json(
        { error: 'Only the host, owner, or moderators can start this session' },
        { status: 403 }
      );
    }

    // Start the session
    const { data: updated, error: updateError } = await supabase
      .from('study_pod_sessions')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error starting session:', updateError);
      return NextResponse.json(
        { error: 'Failed to start session' },
        { status: 500 }
      );
    }

    // Notify all pod members that session has started
    const { data: members } = await supabase
      .from('study_pod_members')
      .select('user_id')
      .eq('pod_id', session.pod_id)
      .eq('status', 'active')
      .neq('user_id', user.id);

    if (members && members.length > 0) {
      const notifications = members.map(m => ({
        user_id: m.user_id,
        actor_id: user.id,
        type: 'message',
        title: 'Session Started',
        message: `${session.title} is now live!`,
        link: `/study-pods/${session.pod_id}?tab=sessions`,
        metadata: {
          pod_id: session.pod_id,
          session_id: sessionId,
          notification_type: 'session_started',
        },
      }));

      await supabase.from('notifications').insert(notifications);
    }

    // Create activity log
    await supabase.from('study_pod_activities').insert({
      pod_id: session.pod_id,
      user_id: user.id,
      activity_type: 'announcement',
      title: 'Session started',
      description: `${session.title} is now in progress`,
      metadata: {
        session_id: sessionId,
      },
    });

    return NextResponse.json({
      success: true,
      session: updated,
      message: 'Session started successfully',
    });
  } catch (error) {
    console.error('Unexpected error starting session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
