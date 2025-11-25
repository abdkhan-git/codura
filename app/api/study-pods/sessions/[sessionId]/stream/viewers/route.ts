import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Params {
  sessionId: string;
}

/**
 * GET /api/study-pods/sessions/[sessionId]/stream/viewers
 * Get list of active viewers for the stream
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active stream
    const { data: stream, error: streamError } = await supabase
      .from('session_live_streams')
      .select('id')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single();

    if (streamError || !stream) {
      return NextResponse.json({
        viewers: [],
        count: 0,
      });
    }

    // Get active viewers
    const { data: viewers, error: viewersError } = await supabase
      .from('session_stream_viewers')
      .select('id, user_id, joined_at, last_seen_at')
      .eq('stream_id', stream.id)
      .eq('is_active', true)
      .gte('last_seen_at', new Date(Date.now() - 60 * 1000).toISOString()); // Active in last minute

    if (viewersError) {
      throw viewersError;
    }

    // Get user details
    const userIds = viewers?.map(v => v.user_id) || [];

    if (userIds.length === 0) {
      return NextResponse.json({
        viewers: [],
        count: 0,
      });
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

    // Combine viewer data with user details
    const enrichedViewers = viewers?.map(v => ({
      ...v,
      user: userMap[v.user_id] || null,
    }));

    return NextResponse.json({
      viewers: enrichedViewers,
      count: enrichedViewers?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching viewers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch viewers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/study-pods/sessions/[sessionId]/stream/viewers
 * Join as a viewer (start watching the stream)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
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
      .select('pod_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify user is a pod member
    const { data: membership } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', session.pod_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a pod member' },
        { status: 403 }
      );
    }

    // Get active stream
    const { data: stream, error: streamError } = await supabase
      .from('session_live_streams')
      .select('id, host_user_id')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'No active stream found' },
        { status: 404 }
      );
    }

    // Don't let host join as viewer
    if (stream.host_user_id === user.id) {
      return NextResponse.json(
        { error: 'Stream host cannot join as viewer' },
        { status: 400 }
      );
    }

    // Upsert viewer record
    const { data: viewer, error: viewerError } = await supabase
      .from('session_stream_viewers')
      .upsert(
        {
          stream_id: stream.id,
          user_id: user.id,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: 'stream_id,user_id',
        }
      )
      .select()
      .single();

    if (viewerError) {
      console.error('Error joining as viewer:', viewerError);
      return NextResponse.json(
        { error: 'Failed to join stream' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      viewer,
      message: 'Joined stream successfully',
    });
  } catch (error) {
    console.error('Unexpected error joining stream:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/study-pods/sessions/[sessionId]/stream/viewers
 * Update viewer heartbeat (keep-alive)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active stream
    const { data: stream, error: streamError } = await supabase
      .from('session_live_streams')
      .select('id')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'No active stream found' },
        { status: 404 }
      );
    }

    // Update viewer heartbeat
    const { error: updateError } = await supabase
      .from('session_stream_viewers')
      .update({
        last_seen_at: new Date().toISOString(),
        is_active: true,
      })
      .eq('stream_id', stream.id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating viewer heartbeat:', updateError);
      return NextResponse.json(
        { error: 'Failed to update heartbeat' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Unexpected error updating viewer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/study-pods/sessions/[sessionId]/stream/viewers
 * Leave stream (stop watching)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active stream
    const { data: stream, error: streamError } = await supabase
      .from('session_live_streams')
      .select('id')
      .eq('session_id', sessionId)
      .in('status', ['active', 'paused'])
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'No active stream found' },
        { status: 404 }
      );
    }

    // Mark viewer as inactive
    const { error: updateError } = await supabase
      .from('session_stream_viewers')
      .update({ is_active: false })
      .eq('stream_id', stream.id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error leaving stream:', updateError);
      return NextResponse.json(
        { error: 'Failed to leave stream' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Left stream successfully',
    });
  } catch (error) {
    console.error('Unexpected error leaving stream:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
