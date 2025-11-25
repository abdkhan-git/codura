import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/study-pods/sessions/[sessionId]/leave
 * Mark leaving a session and calculate duration
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

    // Get attendance record
    const { data: attendance, error: attendanceError } = await supabase
      .from('study_pod_session_attendance')
      .select('id, joined_at, left_at')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (attendanceError || !attendance) {
      return NextResponse.json(
        { error: 'Attendance record not found. Did you join the session?' },
        { status: 404 }
      );
    }

    // Check if already left
    if (attendance.left_at) {
      return NextResponse.json(
        { error: 'You have already left this session' },
        { status: 400 }
      );
    }

    // Calculate duration in minutes
    const joinedAt = new Date(attendance.joined_at);
    const leftAt = new Date();
    const durationMinutes = Math.round((leftAt.getTime() - joinedAt.getTime()) / 60000);

    // Calculate participation score (1 point per minute, max 100)
    const participationScore = Math.min(durationMinutes, 100);

    // Update attendance record
    const { data: updated, error: updateError } = await supabase
      .from('study_pod_session_attendance')
      .update({
        left_at: leftAt.toISOString(),
        duration_minutes: durationMinutes,
        participation_score: participationScore,
      })
      .eq('id', attendance.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating attendance:', updateError);
      return NextResponse.json(
        { error: 'Failed to update attendance' },
        { status: 500 }
      );
    }

    // Get session pod_id for member update
    const { data: session } = await supabase
      .from('study_pod_sessions')
      .select('pod_id')
      .eq('id', sessionId)
      .single();

    // Update member's contribution score
    if (session) {
      const { data: member } = await supabase
        .from('study_pod_members')
        .select('contribution_score')
        .eq('pod_id', session.pod_id)
        .eq('user_id', user.id)
        .single();

      if (member) {
        await supabase
          .from('study_pod_members')
          .update({
            contribution_score: (member.contribution_score || 0) + participationScore,
            last_active_at: new Date().toISOString(),
          })
          .eq('pod_id', session.pod_id)
          .eq('user_id', user.id);
      }
    }

    return NextResponse.json({
      success: true,
      attendance: updated,
      duration_minutes: durationMinutes,
      participation_score: participationScore,
      message: 'Successfully left session',
    });
  } catch (error) {
    console.error('Unexpected error leaving session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
