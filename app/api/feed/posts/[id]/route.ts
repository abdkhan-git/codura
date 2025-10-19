import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// DELETE - Delete a post
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postId = params.id;

    // Check if post exists and belongs to user
    const { data: post, error: fetchError } = await supabase
      .from('social_posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this post' }, { status: 403 });
    }

    // Delete the post (CASCADE will handle related likes, comments, etc.)
    const { error: deleteError } = await supabase
      .from('social_posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Error deleting post:', deleteError);
      return NextResponse.json({
        error: deleteError.message,
        details: deleteError.details
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Delete post API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a post
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postId = params.id;
    const body = await request.json();
    const { content, is_pinned } = body;

    // Check if post exists and belongs to user
    const { data: post, error: fetchError } = await supabase
      .from('social_posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to edit this post' }, { status: 403 });
    }

    // Update the post
    const updateData: any = { updated_at: new Date().toISOString() };
    if (content !== undefined) updateData.content = content.trim();
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;

    const { error: updateError } = await supabase
      .from('social_posts')
      .update(updateData)
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating post:', updateError);
      return NextResponse.json({
        error: updateError.message,
        details: updateError.details
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Post updated successfully'
    });

  } catch (error) {
    console.error('Update post API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}