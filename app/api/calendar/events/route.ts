import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const id = searchParams.get('id');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get single event by ID
    if (id) {
      const { data: event, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching event:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ event });
    }

    if (year && month) {
      // Get events for specific month using the function
      const { data: events, error } = await supabase.rpc('get_calendar_events_for_month', {
        p_user_id: user.id,
        p_year: parseInt(year),
        p_month: parseInt(month)
      });

      if (error) {
        console.error('Error fetching calendar events:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ events: events || [] });
    } else {
      // Get all events for the user
      const { data: events, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching calendar events:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ events: events || [] });
    }
  } catch (error) {
    console.error('Error in calendar events GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      event_type,
      event_date,
      start_time,
      end_time,
      problem_id,
      reminder_minutes,
      metadata
    } = body;

    // Validate required fields
    if (!title || !event_type || !event_date) {
      return NextResponse.json(
        { error: 'Missing required fields: title, event_type, event_date' },
        { status: 400 }
      );
    }

    // Validate event_type
    const validTypes = ['solve_problem', 'mock_interview', 'study_pod', 'live_stream', 'other'];
    if (!validTypes.includes(event_type)) {
      return NextResponse.json(
        { error: `Invalid event_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create the event
    const { data: event, error } = await supabase
      .from('calendar_events')
      .insert({
        user_id: user.id,
        title,
        description,
        event_type,
        event_date,
        start_time,
        end_time,
        problem_id,
        reminder_minutes,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating calendar event:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Error in calendar events POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Update the event
    const { data: event, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating calendar event:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error in calendar events PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Delete the event
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting calendar event:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in calendar events DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}