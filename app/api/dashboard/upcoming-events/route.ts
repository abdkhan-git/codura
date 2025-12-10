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

    const today = new Date().toISOString().split('T')[0];

    // Get upcoming calendar events
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('id, title, event_type, event_date, start_time, end_time')
      .eq('user_id', user.id)
      .gte('event_date', today) // Future events including today
      .eq('is_completed', false)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5);

    if (error) {
      console.error('Error fetching upcoming events:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format events for frontend
    const upcomingEvents = (events || []).map(event => {
      const eventDate = new Date(event.event_date);
      const dateStr = formatDate(eventDate);
      const timeStr = event.start_time ? formatTime(event.start_time) : null;

      // Map event types to frontend types
      let type = 'other';
      if (event.event_type === 'mock_interview') type = 'mock';
      else if (event.event_type === 'study_pod') type = 'study';
      else if (event.event_type === 'solve_problem') type = 'problem';
      else if (event.event_type === 'live_stream') type = 'stream';

      return {
        id: event.id,
        type,
        title: event.title,
        date: dateStr,
        time: timeStr,
      };
    });

    return NextResponse.json({ events: upcomingEvents });
  } catch (error) {
    console.error('Error in upcoming events API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to format date
function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// Helper function to format time
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}