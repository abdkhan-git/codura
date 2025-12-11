import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getTestCasesForProblem,
  wrapCodeWithTestcases,
  pollSubmissionStatus,
  parseTestResults,
  storeSubmission,
  analyzeComplexityWithAI,
} from '@/lib/judge/judge-utils';

export async function POST(request: NextRequest) {
  const {
    problem_title,
    problem_title_slug,
    problem_id,
    problem_difficulty,
    language,
    source_code,
    language_id,
    stdin,
    user_id,
    submitted_at
  } = await request.json();

  console.log('Submitting:', problem_title_slug, 'User:', user_id);

  try {
    const testcases = await getTestCasesForProblem(problem_title_slug, true);

    if (testcases.length === 0) {
      return NextResponse.json(
        { error: 'No test cases found. Run the metadata extractor first.' },
        { status: 404 }
      );
    }

    // Analyze code complexity with AI (includes snippets)
    let complexityResult;
    try {
      console.log('[Submit] Starting AI complexity analysis...');
      const aiResult = await analyzeComplexityWithAI(source_code, language || 'python');

      if (aiResult) {
        complexityResult = aiResult;
        console.log('[Submit] AI analysis successful:', {
          time: complexityResult.timeComplexity,
          space: complexityResult.spaceComplexity
        });
      } else {
        throw new Error('AI analysis returned null');
      }
    } catch (error: any) {
      console.error('[Submit] AI complexity analysis failed:', error.message);

      // Fallback: Safe default complexity
      complexityResult = {
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        confidence: 0.1,
        spaceConfidence: 0.1,
        analysis: 'Unable to analyze time complexity accurately.',
        spaceAnalysis: 'Unable to analyze space complexity accurately.',
        timeSnippets: [],
        spaceSnippets: [],
        details: { loops: 0, nestedLoops: 0, recursiveCalls: 0, maxNestingDepth: 0 },
        spaceDetails: { variables: 0, arrays: 0, objects: 0, recursionDepth: 0, auxiliaryStructures: 0 }
      };
    }

    const wrappedCode = await wrapCodeWithTestcases(
      source_code,
      problem_title_slug,
      true,
      language || 'python'
    );

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

    const savedSubmission = await storeSubmission(
      user_id,
      problem_id,
      problem_title,
      problem_difficulty,
      language,
      judge0Result,
      testcaseResults.label,
      source_code,
      submitted_at,
      complexityResult
    );

    return NextResponse.json({
      judge0Result,
      testcaseResults,
      savedSubmission,
      complexityAnalysis: complexityResult
    });

  } catch (error: any) {
    console.error('Error in /submit:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
