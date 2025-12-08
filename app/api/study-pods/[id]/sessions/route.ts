import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/[id]/sessions
 * Get all sessions for a pod (upcoming, past, or all)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId } = await params;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, upcoming, past

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
        { error: 'You must be a pod member to view sessions' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from('study_pod_sessions')
      .select('*')
      .eq('pod_id', podId);

    // Apply filters
    if (filter === 'upcoming') {
      query = query
        .in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });
    } else if (filter === 'past') {
      query = query
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });
    } else {
      // All sessions
      query = query.order('scheduled_at', { ascending: false });
    }

    const { data: sessions, error: sessionsError } = await query;

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    // Get attendance counts for each session
    const sessionIds = sessions?.map(s => s.id) || [];
    let attendanceCounts: Record<string, number> = {};

    if (sessionIds.length > 0) {
      const { data: attendance } = await supabase
        .from('study_pod_session_attendance')
        .select('session_id, user_id')
        .in('session_id', sessionIds);

      // Count unique attendees per session
      attendance?.forEach(a => {
        attendanceCounts[a.session_id] = (attendanceCounts[a.session_id] || 0) + 1;
      });
    }

    // Get user's attendance status for each session
    let userAttendance: Record<string, boolean> = {};
    if (sessionIds.length > 0) {
      const { data: userAttendanceData } = await supabase
        .from('study_pod_session_attendance')
        .select('session_id')
        .in('session_id', sessionIds)
        .eq('user_id', user.id);

      userAttendanceData?.forEach(a => {
        userAttendance[a.session_id] = true;
      });
    }

    // Get host details for all sessions
    const hostIds = [...new Set(sessions?.map(s => s.host_user_id) || [])];
    let hostDetails: Record<string, any> = {};

    if (hostIds.length > 0) {
      const { data: hosts } = await supabase
        .from('users')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', hostIds);

      hosts?.forEach(host => {
        hostDetails[host.user_id] = host;
      });
    }

    // Enrich sessions with attendance data and host details
    const enrichedSessions = sessions?.map(session => ({
      ...session,
      attendance_count: attendanceCounts[session.id] || 0,
      user_attending: userAttendance[session.id] || false,
      host: hostDetails[session.host_user_id] || null,
    })) || [];

    return NextResponse.json({
      sessions: enrichedSessions,
      total: enrichedSessions.length,
    });
  } catch (error) {
    console.error('Unexpected error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/study-pods/[id]/sessions
 * Create a new session (owner/moderator only)
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

    // Check if user is owner or moderator
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member || !['owner', 'moderator'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Only pod owners and moderators can create sessions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      title,
      description,
      scheduled_at,
      ended_at,
      session_type,
      problems_covered,
      duration_minutes,
    } = body;

    // Validation
    if (!title || !scheduled_at || !session_type) {
      return NextResponse.json(
        { error: 'title, scheduled_at, and session_type are required' },
        { status: 400 }
      );
    }

    // Validate session_type
    const validTypes = ['study', 'problem_solving', 'mock_interview', 'discussion', 'review'];
    if (!validTypes.includes(session_type)) {
      return NextResponse.json(
        { error: 'Invalid session_type' },
        { status: 400 }
      );
    }

    const startTime = new Date(scheduled_at);
    
    // Validate scheduled_at is in the future
    if (startTime < new Date()) {
      return NextResponse.json(
        { error: 'Session start time must be in the future' },
        { status: 400 }
      );
    }

    // Determine end time
    let endTime: Date;
    if (ended_at) {
      endTime = new Date(ended_at);
      if (endTime <= startTime) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        );
      }
    } else if (duration_minutes) {
      // Calculate end time from duration if not provided
      endTime = new Date(startTime.getTime() + duration_minutes * 60 * 1000);
    } else {
      return NextResponse.json(
        { error: 'Either ended_at or duration_minutes must be provided' },
        { status: 400 }
      );
    }

    // Create session
    const { data: session, error: insertError } = await supabase
      .from('study_pod_sessions')
      .insert({
        pod_id: podId,
        title,
        description: description || null,
        scheduled_at,
        ended_at: endTime.toISOString(),
        host_user_id: user.id,
        status: 'scheduled',
        session_type,
        problems_covered: problems_covered || [],
        duration_minutes: duration_minutes || Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating session:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to create session' },
        { status: 500 }
      );
    }

    // Get host details separately
    const { data: hostUser } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    // Attach host to session
    session.host = hostUser;

    // Get pod details for calendar event
    const { data: pod } = await supabase
      .from('study_pods')
      .select('name, color_scheme')
      .eq('id', podId)
      .single();

    // Create calendar event for the session
    const sessionDate = new Date(scheduled_at);
    const { error: calendarError } = await supabase
      .from('calendar_events')
      .insert({
        user_id: user.id,
        title: `${pod?.name}: ${title}`,
        description: description || `Study pod session: ${session_type}`,
        event_type: 'study_pod',
        event_date: sessionDate.toISOString().split('T')[0],
        start_time: sessionDate.toTimeString().split(' ')[0],
        end_time: duration_minutes
          ? new Date(sessionDate.getTime() + duration_minutes * 60000).toTimeString().split(' ')[0]
          : null,
        metadata: {
          pod_id: podId,
          session_id: session.id,
          session_type,
        },
        reminder_minutes: 60, // 1 hour before
      });

    if (calendarError) {
      console.error('Error creating calendar event:', calendarError);
      // Don't fail the session creation if calendar event fails
    }

    // Update pod's next_session_at if this is the next upcoming session
    try {
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
      }
    } catch (error) {
      console.error('Error updating pod next_session_at:', error);
      // Don't fail the session creation
    }

    // Get all pod members for notifications
    try {
      const { data: members } = await supabase
        .from('study_pod_members')
        .select('user_id')
        .eq('pod_id', podId)
        .eq('status', 'active')
        .neq('user_id', user.id); // Exclude the creator

      // Create notifications for all members
      if (members && members.length > 0) {
        const notifications = members.map(m => ({
          user_id: m.user_id,
          actor_id: user.id,
          type: 'message', // Will update this when we add session notification types
          title: 'New Study Session Scheduled',
          message: `${title} scheduled for ${new Date(scheduled_at).toLocaleString()}`,
          link: `/study-pods/${podId}?tab=sessions`,
          metadata: {
            pod_id: podId,
            session_id: session.id,
            notification_type: 'session_scheduled',
          },
        }));

        await supabase.from('notifications').insert(notifications);
      }
    } catch (error) {
      console.error('Error creating notifications:', error);
      // Don't fail the session creation
    }

    // Create activity log
    try {
      await supabase.from('study_pod_activities').insert({
        pod_id: podId,
        user_id: user.id,
        activity_type: 'announcement',
        title: 'Session scheduled',
        description: `${title} scheduled for ${new Date(scheduled_at).toLocaleString()}`,
        metadata: {
          session_id: session.id,
          session_type,
        },
      });
    } catch (error) {
      console.error('Error creating activity log:', error);
      // Don't fail the session creation
    }

    return NextResponse.json({
      success: true,
      session,
      message: 'Session created successfully',
    });
  } catch (error) {
    console.error('Unexpected error creating session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
