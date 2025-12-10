import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/[id]/recent-discussions
 * Get recent discussion activity for this pod
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId } = await params;

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

    // Get recent comments from all threads in this pod (without user join)
    const { data: comments, error: commentsError } = await supabase
      .from('thread_comments')
      .select(`
        id,
        content,
        comment_type,
        approach_title,
        upvotes,
        downvotes,
        created_at,
        user_id,
        thread:study_pod_problem_threads!inner(
          id,
          pod_id,
          problem_id,
          problem:problems(
            id,
            title,
            difficulty
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (commentsError) {
      console.error('Error fetching recent discussions:', commentsError);
      return NextResponse.json(
        { error: 'Failed to fetch recent discussions' },
        { status: 500 }
      );
    }

    // Filter comments that belong to this pod
    const podComments = comments?.filter(
      c => (c.thread as any)?.pod_id === podId
    ) || [];

    // Get unique user IDs and fetch their details separately
    const userIds = [...new Set(podComments.map(c => c.user_id).filter(Boolean))];
    let userDetails: Record<string, { user_id: string; username: string; full_name: string; avatar_url: string }> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', userIds);

      if (users) {
        users.forEach(u => {
          userDetails[u.user_id] = u;
        });
      }
    }

    // Merge user details with comments
    const commentsWithUsers = podComments.map(comment => ({
      ...comment,
      user: userDetails[comment.user_id] || null
    }));

    return NextResponse.json({
      discussions: commentsWithUsers,
      total: commentsWithUsers.length,
    });
  } catch (error) {
    console.error('Unexpected error fetching recent discussions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
