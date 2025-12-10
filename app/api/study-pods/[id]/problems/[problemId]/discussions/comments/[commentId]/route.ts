import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Params = { id: string; problemId: string; commentId: string };

/**
 * PATCH /api/study-pods/[id]/problems/[problemId]/discussions/comments/[commentId]
 * Update a comment
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, problemId, commentId } = await params;
    const body = await request.json();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the comment
    const { data: comment, error: commentError } = await supabase
      .from('thread_comments')
      .select('*, thread:study_pod_problem_threads!inner(pod_id)')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if user is the author or an admin
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const isAuthor = comment.user_id === user.id;
    const isAdmin = member?.role === 'owner' || member?.role === 'moderator';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only edit your own comments' },
        { status: 403 }
      );
    }

    // Build update object
    const updates: any = {};

    if (body.content !== undefined) {
      updates.content = body.content;
      updates.is_edited = true;
      updates.edited_at = new Date().toISOString();
    }

    if (body.code_snippet !== undefined) {
      updates.code_snippet = body.code_snippet;
    }

    if (body.code_language !== undefined) {
      updates.code_language = body.code_language;
    }

    // Solution-specific fields (only author can update)
    if (isAuthor && comment.comment_type === 'solution') {
      if (body.approach_title !== undefined) {
        updates.approach_title = body.approach_title;
      }
      if (body.time_complexity !== undefined) {
        updates.time_complexity = body.time_complexity;
      }
      if (body.space_complexity !== undefined) {
        updates.space_complexity = body.space_complexity;
      }
    }

    // Admin-only fields
    if (isAdmin) {
      if (body.is_accepted_solution !== undefined) {
        updates.is_accepted_solution = body.is_accepted_solution;
      }
      if (body.is_hidden !== undefined) {
        updates.is_hidden = body.is_hidden;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    const { data: updatedComment, error: updateError } = await supabase
      .from('thread_comments')
      .update(updates)
      .eq('id', commentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating comment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500 }
      );
    }

    // Get user details
    const { data: userDetails } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .eq('user_id', updatedComment.user_id)
      .single();

    return NextResponse.json({
      comment: {
        ...updatedComment,
        user: userDetails,
      },
      message: 'Comment updated successfully',
    });
  } catch (error) {
    console.error('Unexpected error updating comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/study-pods/[id]/problems/[problemId]/discussions/comments/[commentId]
 * Delete a comment
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, commentId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the comment
    const { data: comment, error: commentError } = await supabase
      .from('thread_comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Check if user is the author or an admin
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const isAuthor = comment.user_id === user.id;
    const isAdmin = member?.role === 'owner' || member?.role === 'moderator';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 }
      );
    }

    // Delete the comment (cascade will handle replies)
    const { error: deleteError } = await supabase
      .from('thread_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Unexpected error deleting comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
