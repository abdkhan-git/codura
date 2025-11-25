import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/study-pods/sessions/[sessionId]/join
 * Mark attendance for a session
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
      .select('pod_id, status, scheduled_at, title')
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
      .select('id, sessions_attended')
      .eq('pod_id', session.pod_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You must be a pod member to join this session' },
        { status: 403 }
      );
    }

    // Check if already joined
    const { data: existingAttendance } = await supabase
      .from('study_pod_session_attendance')
      .select('id, left_at')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (existingAttendance && !existingAttendance.left_at) {
      return NextResponse.json(
        { error: 'You have already joined this session' },
        { status: 400 }
      );
    }

    // If they left and are rejoining, update the existing record
    if (existingAttendance && existingAttendance.left_at) {
      const { data: updated, error: updateError } = await supabase
        .from('study_pod_session_attendance')
        .update({
          left_at: null,
          duration_minutes: null,
        })
        .eq('id', existingAttendance.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error rejoining session:', updateError);
        return NextResponse.json(
          { error: 'Failed to rejoin session' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        attendance: updated,
        message: 'Successfully rejoined session',
      });
    }

    // Create attendance record
    const { data: attendance, error: attendanceError } = await supabase
      .from('study_pod_session_attendance')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (attendanceError) {
      console.error('Error creating attendance:', attendanceError);
      return NextResponse.json(
        { error: 'Failed to mark attendance' },
        { status: 500 }
      );
    }

    // Update session attendees_count
    const { data: attendanceCount } = await supabase
      .from('study_pod_session_attendance')
      .select('user_id', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (attendanceCount) {
      await supabase
        .from('study_pod_sessions')
        .update({ attendees_count: attendanceCount.count || 0 })
        .eq('id', sessionId);
    }

    // Update member's sessions_attended count (only increment once per session)
    await supabase
      .from('study_pod_members')
      .update({ sessions_attended: (member.sessions_attended || 0) + 1 })
      .eq('id', member.id);

    // Update last_active_at for the member
    await supabase
      .from('study_pod_members')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', member.id);

    return NextResponse.json({
      success: true,
      attendance,
      message: 'Successfully joined session',
    });
  } catch (error) {
    console.error('Unexpected error joining session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
