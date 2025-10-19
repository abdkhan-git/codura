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
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const postTypes = searchParams.get('types')?.split(',') || null;
    const connectionsOnly = searchParams.get('connections_only') === 'true';

    console.log('Fetching posts for user:', user.id);
    console.log('Parameters:', { limit, offset, postTypes, connectionsOnly });

    // Use direct query approach (more reliable)
    console.log('Using direct query approach');
    
    let query = supabase
      .from('social_posts')
      .select(`
        id,
        user_id,
        content,
        media_urls,
        post_type,
        metadata,
        is_public,
        is_pinned,
        parent_post_id,
        original_post_id,
        repost_count,
        like_count,
        comment_count,
        view_count,
        created_at,
        updated_at,
        users (
          username,
          full_name,
          avatar_url
        )
      `)
      .or(`is_public.eq.true,user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postTypes && postTypes.length > 0) {
      query = query.in('post_type', postTypes);
    }

    const { data: posts, error: queryError } = await query;

    if (queryError) {
      console.error('Direct query error:', queryError);
      return NextResponse.json({ 
        error: queryError.message,
        details: queryError.details,
        hint: queryError.hint,
        code: queryError.code
      }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedPosts = (posts || []).map(post => ({
      ...post,
      // Map to the expected interface fields
      user_name: post.users?.full_name || 'Unknown User',
      user_username: post.users?.username || 'Unknown',
      user_avatar_url: post.users?.avatar_url || null,
      user_liked: false,
      user_reposted: false,
      // Keep the author fields for compatibility
      author_username: post.users?.username || 'Unknown',
      author_full_name: post.users?.full_name || 'Unknown User',
      author_avatar_url: post.users?.avatar_url || null,
      original_author_username: null,
      original_author_full_name: null,
      original_author_avatar_url: null,
      original_post_content: null,
      original_post_media_urls: null,
      original_post_type: null,
      original_post_metadata: null,
      has_liked: false,
      has_reposted: false
    }));

    console.log('Posts from direct query:', transformedPosts.length);

    return NextResponse.json({
      posts: transformedPosts,
      pagination: {
        limit,
        offset,
        total: transformedPosts.length,
        hasMore: transformedPosts.length >= limit
      }
    });

  } catch (error) {
    console.error('Social feed API error:', error);
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
    const {
      content,
      media_urls = [],
      post_type = 'text',
      metadata = {},
      is_public = true,
      parent_post_id,
      original_post_id
    } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Content too long (max 2000 characters)' }, { status: 400 });
    }

    console.log('Creating post for user:', user.id);

    // Use direct insert approach (more reliable)
    const { data: post, error: insertError } = await supabase
      .from('social_posts')
      .insert({
        user_id: user.id,
        content: content.trim(),
        media_urls: media_urls,
        post_type: post_type,
        metadata: metadata,
        is_public: is_public,
        parent_post_id: parent_post_id,
        original_post_id: original_post_id
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Direct insert error:', insertError);
      return NextResponse.json({ 
        error: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      }, { status: 500 });
    }

    console.log('Post created with direct insert, ID:', post.id);

    return NextResponse.json({ 
      success: true, 
      post_id: post.id 
    });

  } catch (error) {
    console.error('Create post API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}