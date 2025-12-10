import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/my-sessions
 * Get upcoming sessions for the current user across all their pods
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's pod memberships
    const { data: memberships } = await supabase
      .from('study_pod_members')
      .select('pod_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({
        sessions: [],
        total: 0,
      });
    }

    const podIds = memberships.map(m => m.pod_id);

    // Get upcoming sessions from all user's pods
    const { data: sessions, error: sessionsError } = await supabase
      .from('study_pod_sessions')
      .select('*')
      .in('pod_id', podIds)
      .in('status', ['scheduled', 'in_progress'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        sessions: [],
        total: 0,
      });
    }

    // Get pod details
    const uniquePodIds = [...new Set(sessions.map(s => s.pod_id))];
    const { data: pods } = await supabase
      .from('study_pods')
      .select('id, name, color_scheme')
      .in('id', uniquePodIds);

    const podDetails: Record<string, any> = {};
    pods?.forEach(pod => {
      podDetails[pod.id] = pod;
    });

    // Get host details
    const hostIds = [...new Set(sessions.map(s => s.host_user_id))];
    const { data: hosts } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .in('user_id', hostIds);

    const hostDetails: Record<string, any> = {};
    hosts?.forEach(host => {
      hostDetails[host.user_id] = host;
    });

    // Get attendance counts
    const sessionIds = sessions.map(s => s.id);
    const { data: attendance } = await supabase
      .from('study_pod_session_attendance')
      .select('session_id, user_id')
      .in('session_id', sessionIds);

    const attendanceCounts: Record<string, number> = {};
    attendance?.forEach(a => {
      attendanceCounts[a.session_id] = (attendanceCounts[a.session_id] || 0) + 1;
    });

    // Get user's attendance status
    const { data: userAttendanceData } = await supabase
      .from('study_pod_session_attendance')
      .select('session_id')
      .in('session_id', sessionIds)
      .eq('user_id', user.id);

    const userAttendance: Record<string, boolean> = {};
    userAttendanceData?.forEach(a => {
      userAttendance[a.session_id] = true;
    });

    // Enrich sessions with all details
    const enrichedSessions = sessions.map(session => ({
      ...session,
      pod: podDetails[session.pod_id] || null,
      host: hostDetails[session.host_user_id] || null,
      attendance_count: attendanceCounts[session.id] || 0,
      user_attending: userAttendance[session.id] || false,
    }));

    return NextResponse.json({
      sessions: enrichedSessions,
      total: enrichedSessions.length,
    });
  } catch (error) {
    console.error('Unexpected error fetching my sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
