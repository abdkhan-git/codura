import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/[id]/sessions/[sessionId]
 * Get detailed information about a specific session
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, sessionId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a pod member
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You must be a pod member to view session details' },
        { status: 403 }
      );
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('study_pod_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('pod_id', podId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get host details separately
    const { data: hostUser } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .eq('user_id', session.host_user_id)
      .single();

    // Attach host to session
    session.host = hostUser;

    // Get attendance list
    const { data: attendance, error: attendanceError } = await supabase
      .from('study_pod_session_attendance')
      .select('*')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
    }

    // Get user details for attendees
    const attendeeIds = attendance?.map(a => a.user_id) || [];
    let attendeeDetails: Record<string, any> = {};

    if (attendeeIds.length > 0) {
      const { data: attendees } = await supabase
        .from('users')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', attendeeIds);

      attendees?.forEach(attendee => {
        attendeeDetails[attendee.user_id] = attendee;
      });
    }

    // Enrich attendance with user details
    const enrichedAttendance = attendance?.map(a => ({
      ...a,
      user: attendeeDetails[a.user_id] || null,
    })) || [];

    // Get problem details if problems_covered is not empty
    let problemDetails = [];
    if (session.problems_covered && Array.isArray(session.problems_covered) && session.problems_covered.length > 0) {
      const { data: problems } = await supabase
        .from('problems')
        .select('id, leetcode_id, title, title_slug, difficulty, topic_tags')
        .in('id', session.problems_covered);

      problemDetails = problems || [];
    }

    // Check if current user is attending
    const userAttending = enrichedAttendance?.some(a => a.user_id === user.id) || false;

    return NextResponse.json({
      session: {
        ...session,
        attendance: enrichedAttendance,
        attendance_count: enrichedAttendance.length,
        problems: problemDetails,
        user_attending: userAttending,
      },
    });
  } catch (error) {
    console.error('Unexpected error fetching session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/study-pods/[id]/sessions/[sessionId]
 * Update session details (host, owner, or moderator only)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, sessionId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session to check if user is host
    const { data: session } = await supabase
      .from('study_pod_sessions')
      .select('host_user_id, scheduled_at, title')
      .eq('id', sessionId)
      .eq('pod_id', podId)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if user is owner, moderator, or host
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const isHost = session.host_user_id === user.id;
    const canEdit = member && (['owner', 'moderator'].includes(member.role) || isHost);

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Only the host, owner, or moderators can edit this session' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      title,
      description,
      scheduled_at,
      session_type,
      problems_covered,
      duration_minutes,
      notes,
      recording_url,
    } = body;

    // Validate session_type if provided
    if (session_type) {
      const validTypes = ['study', 'problem_solving', 'mock_interview', 'discussion', 'review'];
      if (!validTypes.includes(session_type)) {
        return NextResponse.json(
          { error: 'Invalid session_type' },
          { status: 400 }
        );
      }
    }

    // Validate scheduled_at if provided and not in the past
    if (scheduled_at && new Date(scheduled_at) < new Date()) {
      return NextResponse.json(
        { error: 'Session must be scheduled for a future time' },
        { status: 400 }
      );
    }

    // Build update object (only include provided fields)
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (scheduled_at !== undefined) updates.scheduled_at = scheduled_at;
    if (session_type !== undefined) updates.session_type = session_type;
    if (problems_covered !== undefined) updates.problems_covered = problems_covered;
    if (duration_minutes !== undefined) updates.duration_minutes = duration_minutes;
    if (notes !== undefined) updates.notes = notes;
    if (recording_url !== undefined) updates.recording_url = recording_url;

    // Update session
    const { data: updatedSession, error: updateError } = await supabase
      .from('study_pod_sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('pod_id', podId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }

    // Get host details separately
    const { data: hostUser } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .eq('user_id', updatedSession.host_user_id)
      .single();

    // Attach host to session
    updatedSession.host = hostUser;

    // If scheduled_at was changed, update calendar event
    if (scheduled_at && scheduled_at !== session.scheduled_at) {
      const sessionDate = new Date(scheduled_at);

      // Update or create calendar event
      const { data: existingEvent } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('metadata->>session_id', sessionId)
        .single();

      if (existingEvent) {
        await supabase
          .from('calendar_events')
          .update({
            event_date: sessionDate.toISOString().split('T')[0],
            start_time: sessionDate.toTimeString().split(' ')[0],
            end_time: duration_minutes
              ? new Date(sessionDate.getTime() + duration_minutes * 60000).toTimeString().split(' ')[0]
              : null,
          })
          .eq('id', existingEvent.id);
      }

      // Notify members about reschedule
      const { data: members } = await supabase
        .from('study_pod_members')
        .select('user_id')
        .eq('pod_id', podId)
        .eq('status', 'active')
        .neq('user_id', user.id);

      if (members && members.length > 0) {
        const notifications = members.map(m => ({
          user_id: m.user_id,
          actor_id: user.id,
          type: 'message',
          title: 'Session Rescheduled',
          message: `${session.title} has been rescheduled to ${new Date(scheduled_at).toLocaleString()}`,
          link: `/study-pods/${podId}?tab=sessions`,
          metadata: {
            pod_id: podId,
            session_id: sessionId,
            notification_type: 'session_rescheduled',
          },
        }));

        await supabase.from('notifications').insert(notifications);
      }
    }

    // Update pod's next_session_at
    const { data: upcomingSessions } = await supabase
      .from('study_pod_sessions')
      .select('scheduled_at')
      .eq('pod_id', podId)
      .in('status', ['scheduled', 'in_progress'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1);

    if (upcomingSessions && upcomingSessions.length > 0) {
      await supabase
        .from('study_pods')
        .update({ next_session_at: upcomingSessions[0].scheduled_at })
        .eq('id', podId);
    } else {
      await supabase
        .from('study_pods')
        .update({ next_session_at: null })
        .eq('id', podId);
    }

    return NextResponse.json({
      success: true,
      session: updatedSession,
      message: 'Session updated successfully',
    });
  } catch (error) {
    console.error('Unexpected error updating session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/study-pods/[id]/sessions/[sessionId]
 * Cancel a session (host, owner, or moderator only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, sessionId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session to check if user is host
    const { data: session } = await supabase
      .from('study_pod_sessions')
      .select('host_user_id, title, scheduled_at, status')
      .eq('id', sessionId)
      .eq('pod_id', podId)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Cannot cancel completed sessions
    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed session' },
        { status: 400 }
      );
    }

    // Check if user is owner, moderator, or host
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const isHost = session.host_user_id === user.id;
    const canDelete = member && (['owner', 'moderator'].includes(member.role) || isHost);

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Only the host, owner, or moderators can cancel this session' },
        { status: 403 }
      );
    }

    // Update session status to cancelled
    const { error: updateError } = await supabase
      .from('study_pod_sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId)
      .eq('pod_id', podId);

    if (updateError) {
      console.error('Error cancelling session:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel session' },
        { status: 500 }
      );
    }

    // Delete associated calendar event
    await supabase
      .from('calendar_events')
      .delete()
      .eq('metadata->>session_id', sessionId);

    // Update pod's next_session_at
    const { data: upcomingSessions } = await supabase
      .from('study_pod_sessions')
      .select('scheduled_at')
      .eq('pod_id', podId)
      .in('status', ['scheduled', 'in_progress'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1);

    if (upcomingSessions && upcomingSessions.length > 0) {
      await supabase
        .from('study_pods')
        .update({ next_session_at: upcomingSessions[0].scheduled_at })
        .eq('id', podId);
    } else {
      await supabase
        .from('study_pods')
        .update({ next_session_at: null })
        .eq('id', podId);
    }

    // Notify all pod members about cancellation
    const { data: members } = await supabase
      .from('study_pod_members')
      .select('user_id')
      .eq('pod_id', podId)
      .eq('status', 'active')
      .neq('user_id', user.id);

    if (members && members.length > 0) {
      const notifications = members.map(m => ({
        user_id: m.user_id,
        actor_id: user.id,
        type: 'message',
        title: 'Session Cancelled',
        message: `${session.title} scheduled for ${new Date(session.scheduled_at).toLocaleString()} has been cancelled`,
        link: `/study-pods/${podId}?tab=sessions`,
        metadata: {
          pod_id: podId,
          session_id: sessionId,
          notification_type: 'session_cancelled',
        },
      }));

      await supabase.from('notifications').insert(notifications);
    }

    // Create activity log
    await supabase.from('study_pod_activities').insert({
      pod_id: podId,
      user_id: user.id,
      activity_type: 'announcement',
      title: 'Session cancelled',
      description: `${session.title} has been cancelled`,
      metadata: {
        session_id: sessionId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Session cancelled successfully',
    });
  } catch (error) {
    console.error('Unexpected error cancelling session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
