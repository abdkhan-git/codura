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
    const { post_id } = body;

    if (!post_id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Check if user already liked this post
    const { data: existingLike, error: checkError } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing like:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingLike) {
      return NextResponse.json({ error: 'Already liked this post' }, { status: 400 });
    }

    // Add like
    const { data: like, error: insertError } = await supabase
      .from('post_likes')
      .insert({
        post_id,
        user_id: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding like:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update post counters
    await supabase.rpc('update_post_counters', { p_post_id: post_id });

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
          type: 'activity_reaction',
          notification_type: 'activity_reaction',
          title: 'Someone liked your post',
          message: 'Your post received a new like',
          link: `/feed/${post_id}`,
          priority: 'normal',
          metadata: { post_id, reaction_type: 'like' }
        });
      } catch (notificationError) {
        console.error('Error creating like notification:', notificationError);
        // Don't fail the like if notification fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      like 
    });

  } catch (error) {
    console.error('Add like API error:', error);
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

    // Remove like
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', post_id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing like:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update post counters
    await supabase.rpc('update_post_counters', { p_post_id: post_id });

    return NextResponse.json({ 
      success: true 
    });

  } catch (error) {
    console.error('Remove like API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
