import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  sessionId: string;
}

// Piston language mappings (free, open-source code execution)
// Full list: https://emkc.org/api/v2/piston/runtimes
const PISTON_LANGUAGES: Record<string, { language: string; version: string }> = {
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  java: { language: 'java', version: '15.0.2' },
  cpp: { language: 'c++', version: '10.2.0' },
  c: { language: 'c', version: '10.2.0' },
  go: { language: 'go', version: '1.16.2' },
  rust: { language: 'rust', version: '1.68.2' },
};

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

    // Get Piston language config
    const pistonLang = PISTON_LANGUAGES[language] || PISTON_LANGUAGES.python;

    // Execute code using Piston API (FREE, no API key required!)
    // Piston is open-source: https://github.com/engineer-man/piston
    const pistonResponse = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: pistonLang.language,
        version: pistonLang.version,
        files: [
          {
            name: `main.${getFileExtension(language)}`,
            content: code,
          },
        ],
        stdin: input || '',
        run_timeout: 10000, // 10 second timeout
      }),
    });

    if (!pistonResponse.ok) {
      const errorText = await pistonResponse.text();
      console.error('Piston API error:', pistonResponse.status, errorText);
      throw new Error(`Code execution failed: ${pistonResponse.status}`);
    }

    const result = await pistonResponse.json();

    // Piston response format:
    // { run: { stdout, stderr, code, signal, output }, compile?: { stdout, stderr, code, signal, output } }
    
    // Determine status based on Piston response
    let status = 'success';
    let output = '';
    let error = '';

    // Check for compile errors first (for compiled languages)
    if (result.compile && result.compile.code !== 0) {
      status = 'error';
      error = result.compile.stderr || result.compile.output || 'Compilation failed';
    } else if (result.run) {
      // Check runtime result
      output = result.run.stdout || result.run.output || '';
      error = result.run.stderr || '';
      
      if (result.run.code !== 0 || result.run.signal) {
        status = 'error';
        if (result.run.signal === 'SIGKILL') {
          status = 'timeout';
          error = 'Time limit exceeded';
        } else if (!error) {
          error = `Process exited with code ${result.run.code}`;
        }
      }
    } else {
      status = 'error';
      error = 'No execution result returned';
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
        executionTime: null, // Piston doesn't provide execution time
        memoryUsed: null, // Piston doesn't provide memory usage
        language: result.language,
        version: result.version,
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

// Helper function to get file extension
function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    go: 'go',
    rust: 'rs',
  };
  return extensions[language] || 'txt';
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
