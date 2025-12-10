import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test if the get_social_feed function exists and works
    const { data: posts, error: postsError } = await supabase.rpc('get_social_feed', {
      p_user_id: user.id,
      p_limit: 5,
      p_offset: 0,
      p_post_types: null,
      p_connections_only: false
    });

    if (postsError) {
      return NextResponse.json({ 
        status: 'error',
        message: 'get_social_feed function failed',
        error: postsError.message,
        code: postsError.code
      }, { status: 500 });
    }

    // Test if the get_activity_feed function exists and works
    const { data: activities, error: activitiesError } = await supabase.rpc('get_activity_feed', {
      p_user_id: user.id,
      p_limit: 5,
      p_offset: 0,
      p_activity_types: null
    });

    if (activitiesError) {
      return NextResponse.json({ 
        status: 'error',
        message: 'get_activity_feed function failed',
        error: activitiesError.message,
        code: activitiesError.code
      }, { status: 500 });
    }

    // Test if we can create a test post
    const { data: testPost, error: createError } = await supabase
      .from('social_posts')
      .insert({
        user_id: user.id,
        content: 'Test post from health check',
        post_type: 'text',
        is_public: true
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ 
        status: 'error',
        message: 'Cannot create posts',
        error: createError.message,
        code: createError.code
      }, { status: 500 });
    }

    // Clean up test post
    await supabase
      .from('social_posts')
      .delete()
      .eq('id', testPost.id);

    return NextResponse.json({
      status: 'success',
      message: 'All social feed functions are working correctly',
      functions: {
        get_social_feed: 'working',
        get_activity_feed: 'working',
        create_post: 'working'
      },
      posts_count: posts?.length || 0,
      activities_count: activities?.length || 0
    });

  } catch (error) {
    console.error('Social feed health check error:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
