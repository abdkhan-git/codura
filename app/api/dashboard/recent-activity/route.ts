import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent submissions (problem solving activity)
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('id, problem_title, difficulty, submitted_at, status')
      .eq('user_id', user.id)
      .eq('status', 'Accepted') // Only show successful submissions
      .order('submitted_at', { ascending: false })
      .limit(10);

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return NextResponse.json({ error: submissionsError.message }, { status: 500 });
    }

    // Get recent calendar events (interviews, study pods)
    const { data: events, error: eventsError } = await supabase
      .from('calendar_events')
      .select('id, title, event_type, event_date, start_time, is_completed')
      .eq('user_id', user.id)
      .lte('event_date', new Date().toISOString().split('T')[0]) // Past events
      .eq('is_completed', true)
      .order('event_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(10);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
    }

    // Get recent session attendance (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: attendance, error: attendanceError } = await supabase
      .from('study_pod_session_attendance')
      .select(`
        id,
        joined_at,
        study_pod_sessions (
          id,
          title,
          study_pods (
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .gte('joined_at', sevenDaysAgo.toISOString())
      .order('joined_at', { ascending: false })
      .limit(10);

    if (attendanceError) {
      console.error('Error fetching session attendance:', attendanceError);
    }

    // Combine and format activity
    const activity: any[] = [];

    // Add submissions as problem-type activities
    if (submissions) {
      submissions.forEach(sub => {
        const timeAgo = getTimeAgo(new Date(sub.submitted_at));
        activity.push({
          id: `sub-${sub.id}`,
          type: 'problem',
          title: sub.problem_title,
          difficulty: sub.difficulty,
          time: timeAgo,
          timestamp: new Date(sub.submitted_at).getTime(),
        });
      });
    }

    // Add events as interview/study activities
    if (events) {
      events.forEach(event => {
        const timeAgo = getTimeAgo(new Date(`${event.event_date}T${event.start_time || '00:00:00'}`));
        const type = event.event_type === 'mock_interview' ? 'interview' : 'study';
        activity.push({
          id: `event-${event.id}`,
          type,
          title: event.title,
          time: timeAgo,
          timestamp: new Date(`${event.event_date}T${event.start_time || '00:00:00'}`).getTime(),
        });
      });
    }

    // Add session attendance as study activities
    if (attendance) {
      attendance.forEach(att => {
        const session = att.study_pod_sessions as any;
        const pod = session?.study_pods as any;
        const sessionTitle = session?.title || 'Study Session';
        const podName = pod?.name || '';
        const displayTitle = podName ? `Attended: ${sessionTitle} (${podName})` : `Attended: ${sessionTitle}`;
        
        const timeAgo = getTimeAgo(new Date(att.joined_at));
        activity.push({
          id: `attendance-${att.id}`,
          type: 'study',
          title: displayTitle,
          time: timeAgo,
          timestamp: new Date(att.joined_at).getTime(),
        });
      });
    }

    // Sort by timestamp (most recent first) and limit to 5
    activity.sort((a, b) => b.timestamp - a.timestamp);
    const recentActivity = activity.slice(0, 5).map(({ timestamp, ...rest }) => rest);

    return NextResponse.json({ activity: recentActivity });
  } catch (error) {
    console.error('Error in recent activity API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}