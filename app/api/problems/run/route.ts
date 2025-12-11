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

    const response = await fetch(`https://${process.env.RAPIDAPI_HOST}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': process.env.RAPIDAPI_HOST!,
        'x-rapidapi-key': process.env.RAPIDAPI_KEY!
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    const token = data.token;

    const judge0Result = await pollSubmissionStatus(token);
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
