import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

type Params = { id: string; problemId: string; commentId: string };

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/study-pods/[id]/problems/[problemId]/discussions/comments/[commentId]/ai-review
 * Get AI review for a solution's code
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, problemId, commentId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a pod member
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You must be a pod member to request AI review' },
        { status: 403 }
      );
    }

    // Get the comment with code
    const { data: comment, error: commentError } = await supabase
      .from('thread_comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (!comment.code_snippet) {
      return NextResponse.json(
        { error: 'This comment has no code to review' },
        { status: 400 }
      );
    }

    // Get problem details for context
    const { data: problem } = await supabase
      .from('problems')
      .select('title, difficulty, category')
      .eq('id', parseInt(problemId))
      .single();

    // Generate AI review
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert code reviewer helping developers improve their LeetCode solutions. Provide concise, actionable feedback. Focus on:
1. Time and space complexity analysis
2. Code correctness and edge cases
3. Code style and readability
4. Potential optimizations
5. Alternative approaches

Keep your response under 500 words. Use markdown formatting with headers.`,
        },
        {
          role: 'user',
          content: `Review this ${comment.code_language || 'code'} solution for the problem "${problem?.title || 'coding problem'}" (${problem?.difficulty || 'unknown'} difficulty, ${problem?.category || 'general'} category):

${comment.approach_title ? `Approach: ${comment.approach_title}` : ''}
${comment.time_complexity ? `Claimed Time Complexity: ${comment.time_complexity}` : ''}
${comment.space_complexity ? `Claimed Space Complexity: ${comment.space_complexity}` : ''}

\`\`\`${comment.code_language || 'javascript'}
${comment.code_snippet}
\`\`\`

${comment.content ? `Author's explanation: ${comment.content}` : ''}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const review = completion.choices[0]?.message?.content || 'Unable to generate review.';

    // Store the review in the comment metadata
    await supabase
      .from('thread_comments')
      .update({
        metadata: {
          ...comment.metadata,
          ai_review: {
            content: review,
            generated_at: new Date().toISOString(),
            generated_by: user.id,
          },
        },
      })
      .eq('id', commentId);

    return NextResponse.json({
      review,
      message: 'AI review generated successfully',
    });
  } catch (error: any) {
    console.error('Error generating AI review:', error);

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate AI review' },
      { status: 500 }
    );
  }
}
