import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  sessionId: string;
}

// POST - Execute code and save result
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;
    const body = await request.json();
    const { code, language, input } = body;

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
        { error: 'Must be attending session to execute code' },
        { status: 403 }
      );
    }

    // Execute code using Judge0 (similar to existing code execution)
    const languageIds: Record<string, number> = {
      javascript: 63,
      python: 71,
      java: 62,
      cpp: 54,
      c: 50,
      typescript: 74,
      go: 60,
      rust: 73,
    };

    const languageId = languageIds[language] || 63; // Default to JavaScript

    const judge0Response = await fetch(
      `${process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com'}/submissions?base64_encoded=false&wait=true`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': process.env.JUDGE0_API_KEY || '',
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin: input || '',
        }),
      }
    );

    if (!judge0Response.ok) {
      throw new Error('Code execution failed');
    }

    const result = await judge0Response.json();

    // Determine status
    let status = 'success';
    let output = result.stdout || '';
    let error = result.stderr || result.compile_output || '';

    if (result.status?.id === 6) {
      // Compilation error
      status = 'error';
      error = result.compile_output || 'Compilation failed';
    } else if (result.status?.id === 13) {
      // Internal error
      status = 'error';
      error = result.stderr || 'Internal error';
    } else if (result.status?.id === 5) {
      // Time limit exceeded
      status = 'timeout';
    } else if (result.stderr) {
      status = 'error';
    }

    // Save execution result to database
    const { data: execution, error: dbError } = await supabase
      .from('session_code_executions')
      .insert({
        session_id: sessionId,
        executed_by: user.id,
        code,
        language,
        input: input || null,
        output: output || null,
        error: error || null,
        status,
        execution_time_ms: result.time ? parseFloat(result.time) * 1000 : null,
        memory_used_kb: result.memory ? parseInt(result.memory) : null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving execution result:', dbError);
      // Don't throw - still return execution result to user
    }

    return NextResponse.json({
      execution: {
        id: execution?.id,
        output,
        error,
        status,
        executionTime: result.time ? parseFloat(result.time) * 1000 : null,
        memoryUsed: result.memory ? parseInt(result.memory) : null,
      },
    });
  } catch (error) {
    console.error('Error executing code:', error);
    return NextResponse.json(
      { error: 'Failed to execute code' },
      { status: 500 }
    );
  }
}

// GET - Get recent execution results
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

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

    // Get executions
    const { data: executions, error } = await supabase
      .from('session_code_executions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    // Get user details for executors
    const userIds = [...new Set(executions?.map(e => e.executed_by) || [])];

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', userIds);

      const userMap: Record<string, any> = {};
      users?.forEach(u => {
        userMap[u.user_id] = u;
      });

      const enrichedExecutions = executions?.map(e => ({
        ...e,
        executor: userMap[e.executed_by] || null,
      }));

      return NextResponse.json({ executions: enrichedExecutions });
    }

    return NextResponse.json({ executions });
  } catch (error) {
    console.error('Error fetching executions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}
