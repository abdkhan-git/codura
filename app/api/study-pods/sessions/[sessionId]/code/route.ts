import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  sessionId: string;
}

// GET - Get current code state for a session
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

    // Get session with current code state
    const { data: session, error: sessionError } = await supabase
      .from('study_pod_sessions')
      .select('id, current_code, current_language, current_problem_id, pod_id')
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

    return NextResponse.json({
      code: session.current_code || '',
      language: session.current_language || 'javascript',
      problemId: session.current_problem_id,
    });
  } catch (error) {
    console.error('Error fetching session code:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session code' },
      { status: 500 }
    );
  }
}

// PATCH - Update current code state
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;
    const body = await request.json();
    const { code, language, problemId } = body;

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

    // Verify user is attending the session
    const { data: attendance } = await supabase
      .from('study_pod_session_attendance')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (!attendance) {
      return NextResponse.json(
        { error: 'Must be attending session to update code' },
        { status: 403 }
      );
    }

    // Update session code state
    const updateData: any = {};
    if (code !== undefined) updateData.current_code = code;
    if (language !== undefined) updateData.current_language = language;
    if (problemId !== undefined) updateData.current_problem_id = problemId;

    const { error: updateError } = await supabase
      .from('study_pod_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating session code:', error);
    return NextResponse.json(
      { error: 'Failed to update session code' },
      { status: 500 }
    );
  }
}
