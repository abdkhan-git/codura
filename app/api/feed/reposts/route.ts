import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { post_id, content } = body;

    if (!post_id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Check if user already reposted this post
    const { data: existingRepost, error: checkError } = await supabase
      .from('post_reposts')
      .select('id')
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing repost:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingRepost) {
      return NextResponse.json({ error: 'Already reposted this post' }, { status: 400 });
    }

    // Get original post data
    const { data: originalPost, error: postError } = await supabase
      .from('social_posts')
      .select('content, user_id, post_type, metadata')
      .eq('id', post_id)
      .single();

    if (postError || !originalPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Create repost
    const { data: repost, error: insertError } = await supabase
      .from('post_reposts')
      .insert({
        post_id,
        user_id: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding repost:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Create new post for the repost (if content provided)
    let repostPostId = null;
    if (content && content.trim().length > 0) {
      const { data: repostPost, error: repostPostError } = await supabase.rpc('create_post', {
        p_user_id: user.id,
        p_content: content.trim(),
        p_post_type: 'repost',
        p_metadata: { original_post_id: post_id },
        p_is_public: true,
        p_original_post_id: post_id
      });

      if (repostPostError) {
        console.error('Error creating repost post:', repostPostError);
      } else {
        repostPostId = repostPost;
      }
    }

    // Update post counters
    await supabase.rpc('update_post_counters', { p_post_id: post_id });

    // Create notification for original post author (if not the current user)
    if (originalPost.user_id !== user.id) {
      try {
        await supabase.from('notifications').insert({
          user_id: originalPost.user_id,
          actor_id: user.id,
          type: 'activity_reaction',
          notification_type: 'activity_reaction',
          title: 'Someone reposted your post',
          message: 'Your post was reposted',
          link: `/feed/${post_id}`,
          priority: 'normal',
          metadata: { post_id, reaction_type: 'repost' }
        });
      } catch (notificationError) {
        console.error('Error creating repost notification:', notificationError);
        // Don't fail the repost if notification fails
      }
    }

    // Create activity feed entry
    try {
      await supabase.rpc('create_activity', {
        p_user_id: user.id,
        p_activity_type: 'post_reposted',
        p_title: 'Reposted a post',
        p_description: content || 'Reposted without comment',
        p_metadata: { original_post_id: post_id, repost_post_id: repostPostId },
        p_is_public: true
      });
    } catch (activityError) {
      console.error('Error creating repost activity:', activityError);
      // Don't fail the repost if activity creation fails
    }

    return NextResponse.json({ 
      success: true, 
      repost,
      repost_post_id: repostPostId
    });

  } catch (error) {
    console.error('Add repost API error:', error);
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
    const post_id = searchParams.get('post_id');

    if (!post_id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Remove repost
    const { error } = await supabase
      .from('post_reposts')
      .delete()
      .eq('post_id', post_id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing repost:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update post counters
    await supabase.rpc('update_post_counters', { p_post_id: post_id });

    return NextResponse.json({ 
      success: true 
    });

  } catch (error) {
    console.error('Remove repost API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
