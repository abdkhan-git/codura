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
    const bookmarkedOnly = searchParams.get('bookmarked_only') === 'true';

    console.log('Fetching posts for user:', user.id);
    console.log('Parameters:', { limit, offset, postTypes, connectionsOnly, bookmarkedOnly });

    // Handle bookmarked posts separately
    if (bookmarkedOnly) {
      console.log('Fetching bookmarked posts');

      const { data: savedPosts, error: savedError } = await supabase
        .from('saved_posts')
        .select('post_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (savedError) {
        console.error('Error fetching saved posts:', savedError);
        return NextResponse.json({ error: savedError.message }, { status: 500 });
      }

      if (!savedPosts || savedPosts.length === 0) {
        return NextResponse.json({
          posts: [],
          pagination: { limit, offset, total: 0, hasMore: false }
        });
      }

      const postIds = savedPosts.map(sp => sp.post_id);

      // Fetch the actual posts
      const { data: posts, error: postsError } = await supabase
        .from('social_posts')
        .select('*')
        .in('id', postIds);

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        return NextResponse.json({ error: postsError.message }, { status: 500 });
      }

      // Fetch user data for each post
      const postsWithUsers = await Promise.all(
        (posts || []).map(async (post) => {
          const { data: userData } = await supabase
            .from('users')
            .select('username, full_name, avatar_url')
            .eq('user_id', post.user_id)
            .single();

          const { data: likeData } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .single();

          const { data: repostData } = await supabase
            .from('post_reposts')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .single();

          return {
            ...post,
            user_name: userData?.full_name || 'Unknown User',
            user_username: userData?.username || 'unknown',
            user_avatar_url: userData?.avatar_url || null,
            user_liked: !!likeData,
            user_reposted: !!repostData,
            user_saved: true // All posts in this query are saved
          };
        })
      );

      return NextResponse.json({
        posts: postsWithUsers,
        pagination: {
          limit,
          offset,
          total: postsWithUsers.length,
          hasMore: postsWithUsers.length >= limit
        }
      });
    }

    // Fetch posts with proper joins
    console.log('Fetching posts with joins');

    const { data: posts, error: queryError } = await supabase.rpc('get_social_feed', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset,
      p_post_types: postTypes,
      p_connections_only: connectionsOnly
    });

    if (queryError) {
      console.error('RPC query error:', queryError);
      console.log('Falling back to direct query');

      // Fallback: Use direct query with manual join
      let query = supabase
        .from('social_posts')
        .select('*')
        .or(`is_public.eq.true,user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (postTypes && postTypes.length > 0) {
        query = query.in('post_type', postTypes);
      }

      const { data: fallbackPosts, error: fallbackError } = await query;

      if (fallbackError) {
        console.error('Fallback query error:', fallbackError);
        return NextResponse.json({
          error: fallbackError.message,
          details: fallbackError.details,
          hint: fallbackError.hint,
          code: fallbackError.code
        }, { status: 500 });
      }

      // Fetch user data separately for each post
      const postsWithUsers = await Promise.all(
        (fallbackPosts || []).map(async (post) => {
          const { data: userData } = await supabase
            .from('users')
            .select('username, full_name, avatar_url')
            .eq('user_id', post.user_id)
            .single();

          // Check if user liked/reposted/saved
          const { data: likeData } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .single();

          const { data: repostData } = await supabase
            .from('post_reposts')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .single();

          const { data: savedData } = await supabase
            .from('saved_posts')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .single();

          return {
            ...post,
            user_name: userData?.full_name || 'Unknown User',
            user_username: userData?.username || 'unknown',
            user_avatar_url: userData?.avatar_url || null,
            user_liked: !!likeData,
            user_reposted: !!repostData,
            user_saved: !!savedData
          };
        })
      );

      console.log('Posts from fallback query:', postsWithUsers.length);

      return NextResponse.json({
        posts: postsWithUsers,
        pagination: {
          limit,
          offset,
          total: postsWithUsers.length,
          hasMore: postsWithUsers.length >= limit
        }
      });
    }

    // Transform the data from RPC function and check if posts are saved
    const transformedPosts = await Promise.all(
      (posts || []).map(async (post: any) => {
        // Check if user saved this post (if not already included in RPC result)
        let userSaved = post.user_saved;
        if (userSaved === undefined) {
          const { data: savedData } = await supabase
            .from('saved_posts')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .single();
          userSaved = !!savedData;
        }

        return {
          ...post,
          // Ensure all fields are present
          media_urls: post.media_urls || [],
          metadata: post.metadata || {},
          repost_count: post.repost_count || 0,
          like_count: post.like_count || 0,
          comment_count: post.comment_count || 0,
          view_count: post.view_count || 0,
          user_saved: userSaved
        };
      })
    );

    console.log('Posts from RPC:', transformedPosts.length);

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