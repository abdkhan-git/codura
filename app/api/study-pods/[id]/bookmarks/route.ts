import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/[id]/bookmarks
 * Get all bookmarked discussion comments for the current user in this pod
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
        { error: 'You must be a pod member to view bookmarks' },
        { status: 403 }
      );
    }

    // Get user's bookmarks with full comment details (without user join)
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('thread_bookmarks')
      .select(`
        id,
        note,
        created_at,
        comment:thread_comments!inner(
          id,
          content,
          comment_type,
          code_snippet,
          code_language,
          approach_title,
          time_complexity,
          space_complexity,
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
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (bookmarksError) {
      console.error('Error fetching bookmarks:', bookmarksError);
      return NextResponse.json(
        { error: 'Failed to fetch bookmarks' },
        { status: 500 }
      );
    }

    // Filter bookmarks that belong to this pod
    const podBookmarks = bookmarks?.filter(
      b => b.comment?.thread?.pod_id === podId
    ) || [];

    // Get unique user IDs from comments and fetch their details separately
    const userIds = [...new Set(podBookmarks.map(b => b.comment?.user_id).filter(Boolean))];
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

    // Merge user details with bookmarks
    const bookmarksWithUsers = podBookmarks.map(bookmark => ({
      ...bookmark,
      comment: bookmark.comment ? {
        ...bookmark.comment,
        user: userDetails[bookmark.comment.user_id] || null
      } : null
    }));

    return NextResponse.json({
      bookmarks: bookmarksWithUsers,
      total: bookmarksWithUsers.length,
    });
  } catch (error) {
    console.error('Unexpected error fetching bookmarks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
