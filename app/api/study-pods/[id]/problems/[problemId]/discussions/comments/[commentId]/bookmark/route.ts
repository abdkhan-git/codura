import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Params = { id: string; problemId: string; commentId: string };

/**
 * POST /api/study-pods/[id]/problems/[problemId]/discussions/comments/[commentId]/bookmark
 * Toggle bookmark on a comment
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, commentId } = await params;
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
        { error: 'You must be a pod member to bookmark' },
        { status: 403 }
      );
    }

    // Check if comment exists
    const { data: comment } = await supabase
      .from('thread_comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if already bookmarked
    const { data: existingBookmark } = await supabase
      .from('thread_bookmarks')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single();

    if (existingBookmark) {
      // Remove bookmark
      await supabase
        .from('thread_bookmarks')
        .delete()
        .eq('id', existingBookmark.id);

      return NextResponse.json({
        is_bookmarked: false,
        message: 'Bookmark removed',
      });
    }

    // Create bookmark
    await supabase
      .from('thread_bookmarks')
      .insert({
        comment_id: commentId,
        user_id: user.id,
        note: body.note || null,
      });

    return NextResponse.json({
      is_bookmarked: true,
      message: 'Bookmarked successfully',
    });
  } catch (error) {
    console.error('Unexpected error bookmarking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
