import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Params {
  sessionId: string;
}

/**
 * GET /api/study-pods/sessions/[sessionId]/stream
 * Get current stream status for a session
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

    // Get active stream for this session
    const { data: stream, error: streamError } = await supabase
      .from('session_live_streams')
      .select(`
        id,
        session_id,
        host_user_id,
        stream_type,
        status,
        viewer_count,
        started_at,
        ended_at,
        metadata
      `)
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (streamError) {
      // No active stream found
      return NextResponse.json({
        stream: null,
        isStreaming: false,
      });
    }

    // Get host details
    const { data: host } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .eq('user_id', stream.host_user_id)
      .single();

    // Check if current user is viewing
    const { data: viewerStatus } = await supabase
      .from('session_stream_viewers')
      .select('id, is_active')
      .eq('stream_id', stream.id)
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      stream: {
        ...stream,
        host,
        isHost: stream.host_user_id === user.id,
        isViewing: viewerStatus?.is_active || false,
      },
      isStreaming: true,
    });
  } catch (error) {
    console.error('Error fetching stream status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stream status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/study-pods/sessions/[sessionId]/stream
 * Start a new live stream
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;
    const body = await request.json();
    const { streamType = 'screen', metadata = {} } = body;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('study_pod_sessions')
      .select('pod_id, host_user_id, status, title')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if session is active
    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Session must be in progress to start streaming' },
        { status: 400 }
      );
    }

    // Check if user can start stream (host, owner, or moderator)
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', session.pod_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const isHost = session.host_user_id === user.id;
    const canStream = member && (['owner', 'moderator'].includes(member.role) || isHost);

    if (!canStream) {
      return NextResponse.json(
        { error: 'Only the host, owner, or moderators can start streaming' },
        { status: 403 }
      );
    }

    // Check if there's already an active stream
    const { data: existingStream } = await supabase
      .from('session_live_streams')
      .select('id, host_user_id')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single();

    if (existingStream) {
      if (existingStream.host_user_id === user.id) {
        return NextResponse.json(
          { error: 'You already have an active stream for this session' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: 'Another user is already streaming in this session' },
          { status: 400 }
        );
      }
    }

    // Validate stream type
    if (!['screen', 'camera', 'both'].includes(streamType)) {
      return NextResponse.json(
        { error: 'Invalid stream type' },
        { status: 400 }
      );
    }

    // Create new stream
    const { data: newStream, error: createError } = await supabase
      .from('session_live_streams')
      .insert({
        session_id: sessionId,
        host_user_id: user.id,
        stream_type: streamType,
        status: 'active',
        metadata: metadata,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating stream:', createError);
      return NextResponse.json(
        { error: 'Failed to start stream' },
        { status: 500 }
      );
    }

    // Get host details
    const { data: host } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    // Notify all session participants about the stream
    const { data: participants } = await supabase
      .from('study_pod_session_attendance')
      .select('user_id')
      .eq('session_id', sessionId)
      .neq('user_id', user.id);

    if (participants && participants.length > 0) {
      const notifications = participants.map(p => ({
        user_id: p.user_id,
        actor_id: user.id,
        type: 'message',
        title: 'Live Stream Started',
        message: `${host?.full_name || 'Someone'} started streaming in ${session.title}`,
        link: `/study-pods/${session.pod_id}/session/${sessionId}`,
        metadata: {
          pod_id: session.pod_id,
          session_id: sessionId,
          stream_id: newStream.id,
          notification_type: 'stream_started',
        },
      }));

      await supabase.from('notifications').insert(notifications);
    }

    // Create activity log
    await supabase.from('study_pod_activities').insert({
      pod_id: session.pod_id,
      user_id: user.id,
      activity_type: 'announcement',
      title: 'Live stream started',
      description: `Started streaming ${streamType} in ${session.title}`,
      metadata: {
        session_id: sessionId,
        stream_id: newStream.id,
        stream_type: streamType,
      },
    });

    return NextResponse.json({
      success: true,
      stream: {
        ...newStream,
        host,
        isHost: true,
      },
      message: 'Stream started successfully',
    });
  } catch (error) {
    console.error('Unexpected error starting stream:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/study-pods/sessions/[sessionId]/stream
 * Update stream status (pause/resume)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;
    const body = await request.json();
    const { status } = body;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate status
    if (!['active', 'paused'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "active" or "paused"' },
        { status: 400 }
      );
    }

    // Get active stream
    const { data: stream, error: streamError } = await supabase
      .from('session_live_streams')
      .select('id, host_user_id')
      .eq('session_id', sessionId)
      .in('status', ['active', 'paused'])
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'No active stream found' },
        { status: 404 }
      );
    }

    // Check if user is the host
    if (stream.host_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the stream host can update stream status' },
        { status: 403 }
      );
    }

    // Update stream status
    const { error: updateError } = await supabase
      .from('session_live_streams')
      .update({ status })
      .eq('id', stream.id);

    if (updateError) {
      console.error('Error updating stream:', updateError);
      return NextResponse.json(
        { error: 'Failed to update stream' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Stream ${status === 'paused' ? 'paused' : 'resumed'} successfully`,
    });
  } catch (error) {
    console.error('Unexpected error updating stream:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/study-pods/sessions/[sessionId]/stream
 * Stop the live stream
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
      .select('id, host_user_id, session_id')
      .eq('session_id', sessionId)
      .in('status', ['active', 'paused'])
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'No active stream found' },
        { status: 404 }
      );
    }

    // Check if user is the host
    if (stream.host_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the stream host can stop the stream' },
        { status: 403 }
      );
    }

    // Stop the stream
    const { error: updateError } = await supabase
      .from('session_live_streams')
      .update({
        status: 'stopped',
        ended_at: new Date().toISOString(),
      })
      .eq('id', stream.id);

    if (updateError) {
      console.error('Error stopping stream:', updateError);
      return NextResponse.json(
        { error: 'Failed to stop stream' },
        { status: 500 }
      );
    }

    // Mark all viewers as inactive
    await supabase
      .from('session_stream_viewers')
      .update({ is_active: false })
      .eq('stream_id', stream.id);

    return NextResponse.json({
      success: true,
      message: 'Stream stopped successfully',
    });
  } catch (error) {
    console.error('Unexpected error stopping stream:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
