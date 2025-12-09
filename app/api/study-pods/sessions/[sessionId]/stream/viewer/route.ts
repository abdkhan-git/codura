import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Params {
  sessionId: string;
}

/**
 * POST /api/study-pods/sessions/[sessionId]/stream/viewer
 * Join as a viewer or update viewer status
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

    // Get active stream for this session
    const { data: stream, error: streamError } = await supabase
      .from('session_live_streams')
      .select('id, session_id, host_user_id')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'No active stream found' },
        { status: 404 }
      );
    }

    // Get session details
    const { data: session } = await supabase
      .from('study_pod_sessions')
      .select('pod_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
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

    // Check if viewer entry already exists
    const { data: existingViewer } = await supabase
      .from('session_stream_viewers')
      .select('id')
      .eq('stream_id', stream.id)
      .eq('user_id', user.id)
      .single();

    if (existingViewer) {
      // Update existing viewer
      const { error: updateError } = await supabase
        .from('session_stream_viewers')
        .update({
          is_active: true,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', existingViewer.id);

      if (updateError) {
        console.error('Error updating viewer:', updateError);
        return NextResponse.json(
          { error: 'Failed to update viewer status' },
          { status: 500 }
        );
      }
    } else {
      // Create new viewer entry
      const { error: insertError } = await supabase
        .from('session_stream_viewers')
        .insert({
          stream_id: stream.id,
          user_id: user.id,
          is_active: true,
        });

      if (insertError) {
        console.error('Error creating viewer:', insertError);
        return NextResponse.json(
          { error: 'Failed to join as viewer' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
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
 * PATCH /api/study-pods/sessions/[sessionId]/stream/viewer
 * Update viewer heartbeat (keep alive)
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
    const { data: stream } = await supabase
      .from('session_live_streams')
      .select('id')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single();

    if (!stream) {
      return NextResponse.json(
        { error: 'No active stream found' },
        { status: 404 }
      );
    }

    // Update last_seen_at for viewer
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
    console.error('Unexpected error updating heartbeat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/study-pods/sessions/[sessionId]/stream/viewer
 * Leave stream as viewer
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
    const { data: stream } = await supabase
      .from('session_live_streams')
      .select('id')
      .eq('session_id', sessionId)
      .in('status', ['active', 'paused'])
      .single();

    if (!stream) {
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
