import { NextRequest, NextResponse } from 'next/server';

// Language mapping for Piston API
const LANGUAGE_MAPPING: Record<string, string> = {
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  java: 'java',
  cpp: 'c++',
  c: 'c',
  go: 'go',
  rust: 'rust',
  ruby: 'ruby',
  php: 'php',
  swift: 'swift',
  kotlin: 'kotlin',
  csharp: 'csharp',
};

export async function POST(request: NextRequest) {
  const executionId = Math.random().toString(36).substring(7);
  console.log(`[API Code Execute ${executionId}] Received execution request`);

  try {
    const { code, language } = await request.json();

    console.log(`[API Code Execute ${executionId}] Language: ${language}, Code length: ${code?.length || 0}`);

    if (!code || !language) {
      return NextResponse.json(
        { error: 'Code and language are required' },
        { status: 400 }
      );
    }

    // Map the language to Piston API format
    const pistonLanguage = LANGUAGE_MAPPING[language] || language;
    console.log(`[API Code Execute ${executionId}] Executing with Piston API...`);

    // Call Piston API for code execution
    const pistonResponse = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: pistonLanguage,
        version: '*', // Use latest version
        files: [
          {
            name: getFileName(language),
            content: code,
          },
        ],
        stdin: '',
        args: [],
        compile_timeout: 10000,
        run_timeout: 3000,
        compile_memory_limit: -1,
        run_memory_limit: -1,
      }),
    });

    if (!pistonResponse.ok) {
      const errorText = await pistonResponse.text();
      console.error(`[API Code Execute ${executionId}] Piston API error:`, errorText);
      return NextResponse.json(
        { error: 'Failed to execute code' },
        { status: 500 }
      );
    }

    const result = await pistonResponse.json();
    console.log(`[API Code Execute ${executionId}] Execution complete`);

    // Format the response
    let output = '';
    let error = '';

    if (result.compile && result.compile.output) {
      output += `Compilation Output:\n${result.compile.output}\n`;
    }

    if (result.run) {
      // Use stdout/stderr separately, NOT result.run.output which combines them
      if (result.run.stdout) {
        output += result.run.stdout;
      }
      if (result.run.stderr) {
        error = result.run.stderr;
      }
    }

    const response = {
      output: output || '(no output)',
      error: error || null,
      language: pistonLanguage,
    };

    console.log(`[API Code Execute ${executionId}] Returning response`);
    return NextResponse.json(response);
  } catch (error) {
    console.error(`[API Code Execute] Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getFileName(language: string): string {
  const fileNames: Record<string, string> = {
    python: 'main.py',
    javascript: 'main.js',
    typescript: 'main.ts',
    java: 'Main.java',
    cpp: 'main.cpp',
    c: 'main.c',
    go: 'main.go',
    rust: 'main.rs',
    ruby: 'main.rb',
    php: 'main.php',
    swift: 'main.swift',
    kotlin: 'main.kt',
    csharp: 'main.cs',
  };
  return fileNames[language] || 'main.txt';
}
