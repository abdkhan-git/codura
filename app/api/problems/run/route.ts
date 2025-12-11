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
  console.log('Running:', problem_title_slug, 'Language:', language);

  try {
    const testcases = await getTestCasesForProblem(problem_title_slug, false);

    if (testcases.length === 0) {
      return NextResponse.json(
        { error: 'No test cases found. Run the metadata extractor first.' },
        { status: 404 }
      );
    }

    const wrappedCode = await wrapCodeWithTestcases(
      source_code,
      problem_title_slug,
      false,
      language || 'python'
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

    // If wait=true didn't work (some Judge0 instances), fall back to polling
    if (judge0Result.token && !judge0Result.stdout && !judge0Result.stderr) {
      console.log('⏳ Falling back to polling...');
      const polledResult = await pollSubmissionStatus(judge0Result.token);
      if (polledResult) {
        Object.assign(judge0Result, polledResult);
      }
    }
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
