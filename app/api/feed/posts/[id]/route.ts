import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - Get a specific post by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const postId = params.id;

    // Fetch the post with user details
    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Fetch user details
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, username, avatar_url')
      .eq('user_id', post.user_id)
      .single();

    // Check if current user liked, reposted, or saved the post
    let userLiked = false;
    let userReposted = false;
    let userSaved = false;

    if (user) {
      const [likeResult, repostResult, saveResult] = await Promise.all([
        supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('post_reposts')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('saved_posts')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .single()
      ]);

      userLiked = !!likeResult.data;
      userReposted = !!repostResult.data;
      userSaved = !!saveResult.data;
    }

    // Fetch original post if this is a repost
    let originalPost = null;
    if (post.original_post_id) {
      const { data: origPost } = await supabase
        .from('social_posts')
        .select('content, user_id')
        .eq('id', post.original_post_id)
        .single();

      if (origPost) {
        const { data: origUser } = await supabase
          .from('users')
          .select('full_name, username')
          .eq('user_id', origPost.user_id)
          .single();

        originalPost = {
          content: origPost.content,
          user_name: origUser?.full_name,
          user_username: origUser?.username
        };
      }
    }

    // Fetch parent post if this is a comment
    let parentPost = null;
    if (post.parent_post_id) {
      const { data: parPost } = await supabase
        .from('social_posts')
        .select('content, user_id')
        .eq('id', post.parent_post_id)
        .single();

      if (parPost) {
        const { data: parUser } = await supabase
          .from('users')
          .select('full_name, username')
          .eq('user_id', parPost.user_id)
          .single();

        parentPost = {
          content: parPost.content,
          user_name: parUser?.full_name,
          user_username: parUser?.username
        };
      }
    }

    return NextResponse.json({
      post: {
        ...post,
        user_name: userData?.full_name,
        user_username: userData?.username,
        user_avatar_url: userData?.avatar_url,
        user_liked: userLiked,
        user_reposted: userReposted,
        user_saved: userSaved,
        original_post_content: originalPost?.content,
        original_post_user_name: originalPost?.user_name,
        original_post_user_username: originalPost?.user_username,
        parent_post_content: parentPost?.content,
        parent_post_user_name: parentPost?.user_name,
        parent_post_user_username: parentPost?.user_username
      }
    });

  } catch (error) {
    console.error('Get post API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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