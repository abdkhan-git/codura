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

    // 1. Check if database functions exist
    const { data: functions, error: functionsError } = await supabase
      .rpc('debug_social_feed_tables_final');

    if (functionsError) {
      console.error('Error checking functions:', functionsError);
    }

    // 2. Get debug info for the user
    const { data: debugInfo, error: debugError } = await supabase
      .rpc('get_social_feed_debug_info_final', { p_user_id: user.id });

    if (debugError) {
      console.error('Error getting debug info:', debugError);
    }

    // 3. Test the get_social_feed function directly
    const { data: testPosts, error: testError } = await supabase
      .rpc('get_social_feed_final', {
        p_user_id: user.id,
        p_limit: 5,
        p_offset: 0,
        p_post_types: null,
        p_connections_only: false
      });

    if (testError) {
      console.error('Error testing get_social_feed:', testError);
    }

    // 4. Check if user has any posts
    const { data: userPosts, error: userPostsError } = await supabase
      .from('social_posts')
      .select('*')
      .eq('user_id', user.id);

    if (userPostsError) {
      console.error('Error fetching user posts:', userPostsError);
    }

    // 5. Check if user has any connections
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('*')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
    }

    // 6. Check if user exists in users table
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (userDataError) {
      console.error('Error fetching user data:', userDataError);
    }

    // 7. Test creating a post
    const { data: testPost, error: createError } = await supabase
      .from('social_posts')
      .insert({
        user_id: user.id,
        content: 'Debug test post - ' + new Date().toISOString(),
        post_type: 'text',
        is_public: true,
        metadata: { debug: true }
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating test post:', createError);
    }

    // 8. Clean up test post
    if (testPost) {
      await supabase
        .from('social_posts')
        .delete()
        .eq('id', testPost.id);
    }

    return NextResponse.json({
      status: 'debug_complete',
      user: {
        id: user.id,
        email: user.email,
        exists_in_users_table: !!userData,
        user_data: userData
      },
      database: {
        functions_status: functions,
        debug_info: debugInfo,
        test_posts_result: testPosts,
        test_posts_error: testError
      },
      user_data: {
        posts_count: userPosts?.length || 0,
        posts: userPosts,
        connections_count: connections?.length || 0,
        connections: connections
      },
      test_results: {
        can_create_post: !createError,
        create_error: createError,
        test_post_created: !!testPost,
        test_post_cleaned_up: true
      },
      recommendations: {
        needs_user_in_users_table: !userData,
        needs_posts: (userPosts?.length || 0) === 0,
        needs_connections: (connections?.length || 0) === 0,
        functions_working: !testError
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
