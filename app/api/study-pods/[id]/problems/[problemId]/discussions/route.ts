import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/[id]/problems/[problemId]/discussions
 * Get the discussion thread for a problem (creates one if it doesn't exist)
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
        { error: 'You must be a pod member to view discussions' },
        { status: 403 }
      );
    }

    // Get or create thread
    let { data: thread, error: threadError } = await supabase
      .from('study_pod_problem_threads')
      .select('*')
      .eq('pod_id', podId)
      .eq('problem_id', problemIdNum)
      .single();

    if (threadError && threadError.code === 'PGRST116') {
      // Thread doesn't exist, create it
      const { data: newThread, error: createError } = await supabase
        .from('study_pod_problem_threads')
        .insert({
          pod_id: podId,
          problem_id: problemIdNum,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating thread:', createError);
        return NextResponse.json(
          { error: 'Failed to create discussion thread' },
          { status: 500 }
        );
      }

      thread = newThread;
    } else if (threadError) {
      console.error('Error fetching thread:', threadError);
      return NextResponse.json(
        { error: 'Failed to fetch discussion thread' },
        { status: 500 }
      );
    }

    // Get problem details
    const { data: problem } = await supabase
      .from('problems')
      .select('id, leetcode_id, title, title_slug, difficulty')
      .eq('id', problemIdNum)
      .single();

    // Parse query params for pagination and sorting
    const url = new URL(request.url);
    const sort = url.searchParams.get('sort') || 'newest';
    const filter = url.searchParams.get('filter') || 'all';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query for comments
    let commentsQuery = supabase
      .from('thread_comments')
      .select('*', { count: 'exact' })
      .eq('thread_id', thread.id)
      .is('parent_id', null); // Only get top-level comments

    // Apply filter
    if (filter === 'solutions') {
      commentsQuery = commentsQuery.eq('comment_type', 'solution');
    } else if (filter === 'questions') {
      commentsQuery = commentsQuery.eq('comment_type', 'question');
    } else if (filter === 'discussions') {
      commentsQuery = commentsQuery.eq('comment_type', 'discussion');
    }

    // Apply sorting
    if (sort === 'newest') {
      commentsQuery = commentsQuery.order('created_at', { ascending: false });
    } else if (sort === 'oldest') {
      commentsQuery = commentsQuery.order('created_at', { ascending: true });
    } else if (sort === 'top') {
      commentsQuery = commentsQuery.order('upvotes', { ascending: false });
    } else if (sort === 'controversial') {
      commentsQuery = commentsQuery.order('downvotes', { ascending: false });
    }

    // Apply pagination
    commentsQuery = commentsQuery.range(offset, offset + limit - 1);

    const { data: comments, count, error: commentsError } = await commentsQuery;

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
    }

    // Get user details for comments
    const userIds = [...new Set(comments?.map(c => c.user_id) || [])];
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

    // Get user's votes for these comments
    const commentIds = comments?.map(c => c.id) || [];
    let userVotes: Record<string, number> = {};

    if (commentIds.length > 0) {
      const { data: votes } = await supabase
        .from('thread_votes')
        .select('comment_id, vote_type')
        .eq('user_id', user.id)
        .in('comment_id', commentIds);

      votes?.forEach(v => {
        userVotes[v.comment_id] = v.vote_type;
      });
    }

    // Get user's bookmarks for these comments
    let userBookmarks: Set<string> = new Set();

    if (commentIds.length > 0) {
      const { data: bookmarks } = await supabase
        .from('thread_bookmarks')
        .select('comment_id')
        .eq('user_id', user.id)
        .in('comment_id', commentIds);

      bookmarks?.forEach(b => {
        userBookmarks.add(b.comment_id);
      });
    }

    // Enrich comments with user details and votes
    const enrichedComments = comments?.map(comment => ({
      ...comment,
      user: userDetails[comment.user_id] || null,
      user_vote: userVotes[comment.id] || null,
      is_bookmarked: userBookmarks.has(comment.id),
    })) || [];

    return NextResponse.json({
      thread: {
        ...thread,
        problem,
      },
      comments: enrichedComments,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Unexpected error fetching discussion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
