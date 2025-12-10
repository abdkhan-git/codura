import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  sessionId: string;
}

// GET - Get code snapshots for a session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const snapshotType = searchParams.get('type'); // auto, manual, final, initial

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

    // Build query
    let query = supabase
      .from('session_code_snapshots')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (snapshotType) {
      query = query.eq('snapshot_type', snapshotType);
    }

    const { data: snapshots, error: snapshotsError } = await query;

    if (snapshotsError) {
      throw snapshotsError;
    }

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}

// POST - Create a code snapshot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;
    const body = await request.json();
    const { code, language, snapshotType = 'manual' } = body;

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
        { error: 'Must be attending session to create snapshots' },
        { status: 403 }
      );
    }

    // Create snapshot
    const { data: snapshot, error } = await supabase
      .from('session_code_snapshots')
      .insert({
        session_id: sessionId,
        code: code || '',
        language: language || 'javascript',
        snapshot_type: snapshotType,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error('Error creating snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    );
  }
}
