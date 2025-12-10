import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const post_id = searchParams.get('post_id');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!post_id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Get comments directly from the table
    const { data: rawComments, error, count } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact' })
      .eq('post_id', post_id)
      .is('parent_comment_id', null) // Only top-level comments
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch user data and nested replies for each comment
    const commentsWithUsers = await Promise.all(
      (rawComments || []).map(async (comment) => {
        const { data: userData } = await supabase
          .from('users')
          .select('user_id, full_name, username, avatar_url')
          .eq('user_id', comment.user_id)
          .single();

        // Check if current user liked this comment
        const { data: likeData } = await supabase
          .from('comment_likes')
          .select('id')
          .eq('comment_id', comment.id)
          .eq('user_id', user.id)
          .single();

        // Fetch nested replies
        const { data: replies } = await supabase
          .from('post_comments')
          .select('*')
          .eq('parent_comment_id', comment.id)
          .order('created_at', { ascending: true });

        // Fetch user data for each reply
        const repliesWithUsers = await Promise.all(
          (replies || []).map(async (reply) => {
            const { data: replyUserData } = await supabase
              .from('users')
              .select('user_id, full_name, username, avatar_url')
              .eq('user_id', reply.user_id)
              .single();

            const { data: replyLikeData } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('comment_id', reply.id)
              .eq('user_id', user.id)
              .single();

            return {
              ...reply,
              user_name: replyUserData?.full_name || 'Unknown User',
              user_username: replyUserData?.username || 'unknown',
              user_avatar_url: replyUserData?.avatar_url || null,
              user_liked: !!replyLikeData
            };
          })
        );

        return {
          ...comment,
          user_name: userData?.full_name || 'Unknown User',
          user_username: userData?.username || 'unknown',
          user_avatar_url: userData?.avatar_url || null,
          user_liked: !!likeData,
          replies: repliesWithUsers
        };
      })
    );

    return NextResponse.json({
      comments: commentsWithUsers,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('Get comments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { post_id, content, parent_comment_id } = body;

    if (!post_id || !content) {
      return NextResponse.json({ error: 'Post ID and content are required' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Content too long (max 1000 characters)' }, { status: 400 });
    }

    // Add comment
    const { data: comment, error } = await supabase
      .from('post_comments')
      .insert({
        post_id,
        user_id: user.id,
        content: content.trim(),
        parent_comment_id: parent_comment_id || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch user data separately from the users table
    const { data: userData } = await supabase
      .from('users')
      .select('user_id, full_name, username, avatar_url')
      .eq('user_id', user.id)
      .single();

    // Combine comment with user data
    const commentWithUser = {
      ...comment,
      user: userData || {
        user_id: user.id,
        full_name: user.email?.split('@')[0] || 'Unknown',
        username: user.email?.split('@')[0] || 'unknown',
        avatar_url: null
      }
    };

    // Update post and comment counters
    await supabase.rpc('update_post_counters', { p_post_id: post_id });
    if (parent_comment_id) {
      await supabase.rpc('update_comment_counters', { p_comment_id: parent_comment_id });
    }

    // Get post author for notification
    const { data: postData } = await supabase
      .from('social_posts')
      .select('user_id')
      .eq('id', post_id)
      .single();

    // Create notification for post author (if not the current user)
    if (postData && postData.user_id !== user.id) {
      try {
        await supabase.from('notifications').insert({
          user_id: postData.user_id,
          actor_id: user.id,
          type: 'activity_comment',
          notification_type: 'activity_comment',
          title: 'Someone commented on your post',
          message: 'Your post received a new comment',
          link: `/feed/${post_id}`,
          priority: 'normal',
          metadata: { post_id, comment_id: comment.id }
        });
      } catch (notificationError) {
        console.error('Error creating comment notification:', notificationError);
        // Don't fail the comment if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      comment: commentWithUser
    });

  } catch (error) {
    console.error('Add comment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { comment_id, content } = body;

    if (!comment_id || !content) {
      return NextResponse.json({ error: 'Comment ID and content are required' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Content too long (max 1000 characters)' }, { status: 400 });
    }

    // Update comment
    const { data: comment, error } = await supabase
      .from('post_comments')
      .update({
        content: content.trim(),
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', comment_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch user data separately from the users table
    const { data: userData } = await supabase
      .from('users')
      .select('user_id, full_name, username, avatar_url')
      .eq('user_id', user.id)
      .single();

    // Combine comment with user data
    const commentWithUser = {
      ...comment,
      user: userData || {
        user_id: user.id,
        full_name: user.email?.split('@')[0] || 'Unknown',
        username: user.email?.split('@')[0] || 'unknown',
        avatar_url: null
      }
    };

    return NextResponse.json({
      success: true,
      comment: commentWithUser
    });

  } catch (error) {
    console.error('Update comment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const comment_id = searchParams.get('comment_id');

    if (!comment_id) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    // Get comment data before deletion
    const { data: commentData } = await supabase
      .from('post_comments')
      .select('post_id, parent_comment_id')
      .eq('id', comment_id)
      .single();

    // Delete comment
    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', comment_id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update counters
    if (commentData) {
      await supabase.rpc('update_post_counters', { p_post_id: commentData.post_id });
      if (commentData.parent_comment_id) {
        await supabase.rpc('update_comment_counters', { p_comment_id: commentData.parent_comment_id });
      }
    }

    return NextResponse.json({ 
      success: true 
    });

  } catch (error) {
    console.error('Delete comment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
