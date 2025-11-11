import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test basic connection
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'No authenticated user',
        userError: userError?.message 
      }, { status: 401 });
    }

    // Test direct query to social_posts
    const { data: posts, error: postsError } = await supabase
      .from('social_posts')
      .select('*')
      .limit(5);

    if (postsError) {
      return NextResponse.json({ 
        error: 'Database query failed',
        postsError: postsError.message,
        code: postsError.code
      }, { status: 500 });
    }

    // Test users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .limit(5);

    return NextResponse.json({
      status: 'success',
      user: {
        id: user.id,
        email: user.email
      },
      posts: {
        count: posts?.length || 0,
        data: posts || []
      },
      users: {
        count: users?.length || 0,
        data: users || []
      },
      message: 'Basic database connection test completed'
    });

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
