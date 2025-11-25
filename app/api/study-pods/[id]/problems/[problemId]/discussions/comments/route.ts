import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/study-pods/[id]/problems/[problemId]/discussions/comments
 * Create a new comment or solution
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; problemId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, problemId } = await params;
    const problemIdNum = parseInt(problemId);
    const body = await request.json();

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
        { error: 'You must be a pod member to post comments' },
        { status: 403 }
      );
    }

    // Get or create thread
    let { data: thread } = await supabase
      .from('study_pod_problem_threads')
      .select('id, is_locked')
      .eq('pod_id', podId)
      .eq('problem_id', problemIdNum)
      .single();

    if (!thread) {
      // Create thread
      const { data: newThread, error: createError } = await supabase
        .from('study_pod_problem_threads')
        .insert({
          pod_id: podId,
          problem_id: problemIdNum,
        })
        .select('id, is_locked')
        .single();

      if (createError) {
        console.error('Error creating thread:', createError);
        return NextResponse.json(
          { error: 'Failed to create discussion thread' },
          { status: 500 }
        );
      }

      thread = newThread;
    }

    // Check if thread is locked
    if (thread.is_locked && member.role === 'member') {
      return NextResponse.json(
        { error: 'This discussion thread is locked' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    const commentType = body.comment_type || 'discussion';
    const validTypes = ['discussion', 'solution', 'question', 'hint'];

    if (!validTypes.includes(commentType)) {
      return NextResponse.json(
        { error: 'Invalid comment type' },
        { status: 400 }
      );
    }

    // Create the comment
    const commentData: any = {
      thread_id: thread.id,
      user_id: user.id,
      content: body.content,
      comment_type: commentType,
      parent_id: body.parent_id || null,
    };

    // Add optional fields
    if (body.code_snippet) {
      commentData.code_snippet = body.code_snippet;
      commentData.code_language = body.code_language || 'javascript';
    }

    // Solution-specific fields
    if (commentType === 'solution') {
      if (body.approach_title) {
        commentData.approach_title = body.approach_title;
      }
      if (body.time_complexity) {
        commentData.time_complexity = body.time_complexity;
      }
      if (body.space_complexity) {
        commentData.space_complexity = body.space_complexity;
      }
    }

    const { data: comment, error: commentError } = await supabase
      .from('thread_comments')
      .insert(commentData)
      .select()
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    // Get user details
    const { data: userDetails } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    // Log activity
    await supabase.from('study_pod_activities').insert({
      pod_id: podId,
      user_id: user.id,
      activity_type: commentType === 'solution' ? 'solution_posted' : 'comment_posted',
      title: commentType === 'solution'
        ? `${userDetails?.username || 'Someone'} posted a solution`
        : `${userDetails?.username || 'Someone'} commented on a problem`,
      metadata: {
        problem_id: problemIdNum,
        comment_id: comment.id,
        comment_type: commentType,
      },
    });

    return NextResponse.json({
      comment: {
        ...comment,
        user: userDetails,
        user_vote: null,
        is_bookmarked: false,
      },
      message: 'Comment posted successfully',
    });
  } catch (error) {
    console.error('Unexpected error creating comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/study-pods/[id]/problems/[problemId]/discussions/comments
 * Get replies to a specific comment
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; problemId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, problemId } = await params;
    const problemIdNum = parseInt(problemId);

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
        { error: 'You must be a pod member to view comments' },
        { status: 403 }
      );
    }

    // Get parent_id from query params
    const url = new URL(request.url);
    const parentId = url.searchParams.get('parent_id');

    if (!parentId) {
      return NextResponse.json(
        { error: 'parent_id is required' },
        { status: 400 }
      );
    }

    // Get thread
    const { data: thread } = await supabase
      .from('study_pod_problem_threads')
      .select('id')
      .eq('pod_id', podId)
      .eq('problem_id', problemIdNum)
      .single();

    if (!thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      );
    }

    // Get replies
    const { data: replies, error: repliesError } = await supabase
      .from('thread_comments')
      .select('*')
      .eq('thread_id', thread.id)
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true });

    if (repliesError) {
      console.error('Error fetching replies:', repliesError);
      return NextResponse.json(
        { error: 'Failed to fetch replies' },
        { status: 500 }
      );
    }

    // Get user details
    const userIds = [...new Set(replies?.map(r => r.user_id) || [])];
    let userDetails: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', userIds);

      users?.forEach(u => {
        userDetails[u.user_id] = u;
      });
    }

    // Get user's votes for these replies
    const replyIds = replies?.map(r => r.id) || [];
    let userVotes: Record<string, number> = {};

    if (replyIds.length > 0) {
      const { data: votes } = await supabase
        .from('thread_votes')
        .select('comment_id, vote_type')
        .eq('user_id', user.id)
        .in('comment_id', replyIds);

      votes?.forEach(v => {
        userVotes[v.comment_id] = v.vote_type;
      });
    }

    // Enrich replies
    const enrichedReplies = replies?.map(reply => ({
      ...reply,
      user: userDetails[reply.user_id] || null,
      user_vote: userVotes[reply.id] || null,
    })) || [];

    return NextResponse.json({
      replies: enrichedReplies,
    });
  } catch (error) {
    console.error('Unexpected error fetching replies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
