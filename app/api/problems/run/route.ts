import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getProblemMetadata,
  getTestCasesForProblem,
  wrapCodeWithTestcases,
  pollSubmissionStatus,
  parseTestResults,
} from '@/lib/judge/judge-utils';

export async function POST(request: NextRequest) {
  const { problem_title_slug, source_code, language_id, language, stdin } = await request.json();
  console.log('Running:', problem_title_slug, 'Language:', language, 'Language ID:', language_id);
  console.log('Source code preview:', source_code?.substring(0, 100));

  try {
    const testcases = await getTestCasesForProblem(problem_title_slug, false);

    if (testcases.length === 0) {
      return NextResponse.json(
        { error: 'No test cases found. Run the metadata extractor first.' },
        { status: 404 }
      );
    }

    // Normalize language value
    const normalizedLanguage = (language || 'python').toLowerCase().trim();
    console.log('Normalized language:', normalizedLanguage);

    const wrappedCode = await wrapCodeWithTestcases(
      source_code,
      problem_title_slug,
      false,
      normalizedLanguage
    );

    console.log('Generated wrapped code:', wrappedCode);

    const body = {
      source_code: wrappedCode,
      language_id,
      stdin
    };

    // Use wait=true to get results synchronously (faster response)
    const response = await fetch(`https://${process.env.RAPIDAPI_HOST}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': process.env.RAPIDAPI_HOST!,
        'x-rapidapi-key': process.env.RAPIDAPI_KEY!
      },
      body: JSON.stringify(body)
    });

    const judge0Result = await response.json();
    console.log('Judge0 full response:', judge0Result);
    console.log('Has token?', !!judge0Result.token, 'Token:', judge0Result.token);

    // Always poll if we got a token, regardless of wait=true
    if (judge0Result.token) {
      console.log('⏳ Polling for submission:', judge0Result.token);
      const polledResult = await pollSubmissionStatus(judge0Result.token);
      if (polledResult) {
        console.log('✅ Poll successful, got stdout:', !!polledResult.stdout);
        Object.assign(judge0Result, polledResult);
      } else {
        console.log('❌ Polling failed or timed out');
      }
    }

    console.log('Final Judge0 result - status:', judge0Result.status, 'stdout length:', judge0Result.stdout?.length);
    const testcaseResults = parseTestResults(judge0Result, testcases);

    return NextResponse.json({ judge0Result, testcaseResults });

  } catch (error: any) {
    console.error('Error in /run:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
