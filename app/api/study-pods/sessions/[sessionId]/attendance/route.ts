import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/sessions/[sessionId]/attendance
 * Get attendance list for a session with user details
 */
export async function GET(
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

    // Get session details to verify pod membership
    const { data: session, error: sessionError } = await supabase
      .from('study_pod_sessions')
      .select('pod_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if user is a pod member
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', session.pod_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You must be a pod member to view attendance' },
        { status: 403 }
      );
    }

    // Get attendance list
    const { data: attendance, error: attendanceError } = await supabase
      .from('study_pod_session_attendance')
      .select('id, user_id, joined_at, left_at, duration_minutes, participation_score')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      return NextResponse.json(
        { error: 'Failed to fetch attendance' },
        { status: 500 }
      );
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

    // Calculate summary statistics
    const totalAttendees = enrichedAttendance.length;
    const currentlyPresent = enrichedAttendance.filter(a => !a.left_at).length;
    const averageDuration = enrichedAttendance.length
      ? Math.round(
          enrichedAttendance
            .filter(a => a.duration_minutes)
            .reduce((sum, a) => sum + (a.duration_minutes || 0), 0) /
            enrichedAttendance.filter(a => a.duration_minutes).length
        )
      : 0;
    const totalParticipationScore = enrichedAttendance.reduce(
      (sum, a) => sum + (a.participation_score || 0),
      0
    );

    return NextResponse.json({
      attendance: enrichedAttendance,
      summary: {
        total_attendees: totalAttendees,
        currently_present: currentlyPresent,
        average_duration_minutes: averageDuration,
        total_participation_score: totalParticipationScore,
      },
    });
  } catch (error) {
    console.error('Unexpected error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
