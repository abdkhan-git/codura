import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  sessionId: string;
}

// GET - Get active participants in a session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('study_pod_sessions')
      .select('id, pod_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify user is a pod member
    const { data: membership } = await supabase
      .from('study_pod_members')
      .select('id')
      .eq('pod_id', session.pod_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a pod member' }, { status: 403 });
    }

    // Get active participants
    const { data: participants, error: participantsError } = await supabase
      .from('session_active_participants')
      .select('id, user_id, cursor_color, cursor_position, selection_range, is_active, joined_at, last_seen_at')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .gte('last_seen_at', new Date(Date.now() - 2 * 60 * 1000).toISOString()); // Active in last 2 minutes

    if (participantsError) {
      throw participantsError;
    }

    // Get user details for participants
    const userIds = participants?.map(p => p.user_id) || [];

    if (userIds.length === 0) {
      return NextResponse.json({ participants: [] });
    }

    const { data: users } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .in('user_id', userIds);

    // Create user map
    const userMap: Record<string, any> = {};
    users?.forEach(u => {
      userMap[u.user_id] = u;
    });

    // Combine participant data with user details
    const enrichedParticipants = participants?.map(p => ({
      ...p,
      user: userMap[p.user_id] || null,
    }));

    return NextResponse.json({ participants: enrichedParticipants });
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}

// POST - Join session as active participant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;
    const body = await request.json();
    const { cursorColor } = body;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is attending the session
    const { data: attendance } = await supabase
      .from('study_pod_session_attendance')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!attendance) {
      return NextResponse.json(
        { error: 'Must be attending session' },
        { status: 403 }
      );
    }

    // Upsert participant record
    const { data, error } = await supabase
      .from('session_active_participants')
      .upsert(
        {
          session_id: sessionId,
          user_id: user.id,
          cursor_color: cursorColor || '#' + Math.floor(Math.random()*16777215).toString(16),
          is_active: true,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: 'session_id,user_id',
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ participant: data });
  } catch (error) {
    console.error('Error joining as participant:', error);
    return NextResponse.json(
      { error: 'Failed to join as participant' },
      { status: 500 }
    );
  }
}

// PATCH - Update participant state (cursor, selection, heartbeat)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;
    const body = await request.json();
    const { cursorPosition, selectionRange } = body;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update participant state
    const updateData: any = {
      last_seen_at: new Date().toISOString(),
    };

    if (cursorPosition !== undefined) updateData.cursor_position = cursorPosition;
    if (selectionRange !== undefined) updateData.selection_range = selectionRange;

    const { error } = await supabase
      .from('session_active_participants')
      .update(updateData)
      .eq('session_id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating participant:', error);
    return NextResponse.json(
      { error: 'Failed to update participant' },
      { status: 500 }
    );
  }
}

// DELETE - Leave session (mark as inactive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark participant as inactive
    const { error } = await supabase
      .from('session_active_participants')
      .update({ is_active: false })
      .eq('session_id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving session:', error);
    return NextResponse.json(
      { error: 'Failed to leave session' },
      { status: 500 }
    );
  }
}
