import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Like a comment
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { comment_id } = body;

    if (!comment_id) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', comment_id)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      return NextResponse.json({ error: 'Already liked this comment' }, { status: 400 });
    }

    // Add like
    const { error } = await supabase
      .from('comment_likes')
      .insert({
        comment_id,
        user_id: user.id
      });

    if (error) {
      console.error('Error liking comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update comment counters
    await supabase.rpc('update_comment_counters', { p_comment_id: comment_id });

    // Get comment data for notification
    const { data: commentData } = await supabase
      .from('post_comments')
      .select('user_id, post_id')
      .eq('id', comment_id)
      .single();

    // Create notification for comment author (if not the current user)
    if (commentData && commentData.user_id !== user.id) {
      try {
        await supabase.from('notifications').insert({
          user_id: commentData.user_id,
          actor_id: user.id,
          type: 'comment_like',
          notification_type: 'comment_like',
          title: 'Someone liked your comment',
          message: 'Your comment received a like',
          link: `/feed/${commentData.post_id}`,
          priority: 'normal',
          metadata: { comment_id, post_id: commentData.post_id }
        });
      } catch (notificationError) {
        console.error('Error creating like notification:', notificationError);
        // Don't fail the like if notification fails
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Like comment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Unlike a comment
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

    // Delete like
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', comment_id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error unliking comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update comment counters
    await supabase.rpc('update_comment_counters', { p_comment_id: comment_id });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Unlike comment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
