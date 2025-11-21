import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/study-pods/sessions/[sessionId]/complete
 * Complete a session (change status to completed)
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
      .select('pod_id, host_user_id, status, title, started_at')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if session is already completed
    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'Session is already completed' },
        { status: 400 }
      );
    }

    if (session.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot complete a cancelled session' },
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
    const canComplete = member && (['owner', 'moderator'].includes(member.role) || isHost);

    if (!canComplete) {
      return NextResponse.json(
        { error: 'Only the host, owner, or moderators can complete this session' },
        { status: 403 }
      );
    }

    // Calculate duration if session was started
    let durationMinutes = null;
    if (session.started_at) {
      const startedAt = new Date(session.started_at);
      const endedAt = new Date();
      durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
    }

    // Complete the session
    const { data: updated, error: updateError } = await supabase
      .from('study_pod_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error completing session:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete session' },
        { status: 500 }
      );
    }

    // Auto-leave all attendees who haven't left yet
    const { data: activeAttendees } = await supabase
      .from('study_pod_session_attendance')
      .select('id, joined_at, user_id')
      .eq('session_id', sessionId)
      .is('left_at', null);

    if (activeAttendees && activeAttendees.length > 0) {
      const now = new Date().toISOString();
      const updates = activeAttendees.map(a => {
        const joinedAt = new Date(a.joined_at);
        const duration = Math.round((new Date().getTime() - joinedAt.getTime()) / 60000);
        const participationScore = Math.min(duration, 100);

        return {
          id: a.id,
          left_at: now,
          duration_minutes: duration,
          participation_score: participationScore,
        };
      });

      // Update all active attendees
      for (const update of updates) {
        await supabase
          .from('study_pod_session_attendance')
          .update({
            left_at: update.left_at,
            duration_minutes: update.duration_minutes,
            participation_score: update.participation_score,
          })
          .eq('id', update.id);

        // Update member contribution score
        const attendee = activeAttendees.find(a => a.id === update.id);
        if (attendee) {
          const { data: memberData } = await supabase
            .from('study_pod_members')
            .select('contribution_score')
            .eq('pod_id', session.pod_id)
            .eq('user_id', attendee.user_id)
            .single();

          if (memberData) {
            await supabase
              .from('study_pod_members')
              .update({
                contribution_score: (memberData.contribution_score || 0) + update.participation_score,
              })
              .eq('pod_id', session.pod_id)
              .eq('user_id', attendee.user_id);
          }
        }
      }
    }

    // Update pod's total_sessions count
    const { data: pod } = await supabase
      .from('study_pods')
      .select('total_sessions')
      .eq('id', session.pod_id)
      .single();

    if (pod) {
      await supabase
        .from('study_pods')
        .update({ total_sessions: (pod.total_sessions || 0) + 1 })
        .eq('id', session.pod_id);
    }

    // Update pod's next_session_at
    const { data: upcomingSessions } = await supabase
      .from('study_pod_sessions')
      .select('scheduled_at')
      .eq('pod_id', session.pod_id)
      .in('status', ['scheduled', 'in_progress'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1);

    if (upcomingSessions && upcomingSessions.length > 0) {
      await supabase
        .from('study_pods')
        .update({ next_session_at: upcomingSessions[0].scheduled_at })
        .eq('id', session.pod_id);
    } else {
      await supabase
        .from('study_pods')
        .update({ next_session_at: null })
        .eq('id', session.pod_id);
    }

    // Create activity log
    await supabase.from('study_pod_activities').insert({
      pod_id: session.pod_id,
      user_id: user.id,
      activity_type: 'session_completed',
      title: 'Session completed',
      description: `${session.title} has been completed`,
      metadata: {
        session_id: sessionId,
        duration_minutes: durationMinutes,
        attendees_count: activeAttendees?.length || 0,
      },
    });

    return NextResponse.json({
      success: true,
      session: updated,
      duration_minutes: durationMinutes,
      message: 'Session completed successfully',
    });
  } catch (error) {
    console.error('Unexpected error completing session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
