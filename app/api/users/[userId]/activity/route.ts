import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const activityType = searchParams.get('type');

    const { userId } = await params;

    // Fetch different types of activities in parallel
    const [postsResult, likesResult, commentsResult, repostsResult] = await Promise.all([
      // Posts
      supabase
        .from('social_posts')
        .select('id, content, created_at, like_count, comment_count, repost_count, user_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(activityType === 'posts' ? limit : 50),

      // Likes
      supabase
        .from('post_likes')
        .select('id, created_at, post_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(activityType === 'likes' ? limit : 50),

      // Comments
      supabase
        .from('post_comments')
        .select('id, content, created_at, post_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(activityType === 'comments' ? limit : 50),

      // Reposts
      supabase
        .from('post_reposts')
        .select('id, created_at, post_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(activityType === 'reposts' ? limit : 50)
    ]);

    // Collect all unique post IDs to fetch post and user data
    const postIds = new Set<string>();

    likesResult.data?.forEach(like => postIds.add(like.post_id));
    commentsResult.data?.forEach(comment => postIds.add(comment.post_id));
    repostsResult.data?.forEach(repost => postIds.add(repost.post_id));

    // Fetch all posts with their user data
    const postsMap = new Map<string, any>();
    if (postIds.size > 0) {
      const { data: postsData } = await supabase
        .from('social_posts')
        .select('id, content, user_id')
        .in('id', Array.from(postIds));

      if (postsData) {
        // Get unique user IDs from posts
        const userIds = [...new Set(postsData.map(p => p.user_id))];

        // Fetch user data
        const { data: usersData } = await supabase
          .from('users')
          .select('user_id, full_name, username')
          .in('user_id', userIds);

        const usersMap = new Map(usersData?.map(u => [u.user_id, u]) || []);

        // Build posts map with user data
        postsData.forEach(post => {
          const user = usersMap.get(post.user_id);
          postsMap.set(post.id, {
            ...post,
            author_name: user?.full_name || 'Unknown User',
            author_username: user?.username
          });
        });
      }
    }

    // Transform and combine activities
    const activities: any[] = [];

    // Add posts
    if (!activityType || activityType === 'all' || activityType === 'posts') {
      postsResult.data?.forEach(post => {
        activities.push({
          id: `post-${post.id}`,
          type: 'post',
          created_at: post.created_at,
          content: post.content,
          post_id: post.id,
          metadata: {
            like_count: post.like_count,
            comment_count: post.comment_count,
            repost_count: post.repost_count
          }
        });
      });
    }

    // Add likes
    if (!activityType || activityType === 'all' || activityType === 'likes') {
      likesResult.data?.forEach((like: any) => {
        const post = postsMap.get(like.post_id);
        if (post) {
          activities.push({
            id: `like-${like.id}`,
            type: 'like',
            created_at: like.created_at,
            post_id: like.post_id,
            post_content: post.content,
            post_author: post.author_name
          });
        }
      });
    }

    // Add comments
    if (!activityType || activityType === 'all' || activityType === 'comments') {
      commentsResult.data?.forEach((comment: any) => {
        const post = postsMap.get(comment.post_id);
        if (post) {
          activities.push({
            id: `comment-${comment.id}`,
            type: 'comment',
            created_at: comment.created_at,
            content: comment.content,
            post_id: comment.post_id,
            post_content: post.content,
            post_author: post.author_name
          });
        }
      });
    }

    // Add reposts
    if (!activityType || activityType === 'all' || activityType === 'reposts') {
      repostsResult.data?.forEach((repost: any) => {
        const post = postsMap.get(repost.post_id);
        if (post) {
          activities.push({
            id: `repost-${repost.id}`,
            type: 'repost',
            created_at: repost.created_at,
            post_id: repost.post_id,
            post_content: post.content,
            post_author: post.author_name
          });
        }
      });
    }

    // Sort by created_at (most recent first)
    activities.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Apply pagination
    const paginatedActivities = activities.slice(offset, offset + limit);

    return NextResponse.json({
      activities: paginatedActivities,
      total: activities.length,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < activities.length
      }
    });

  } catch (error) {
    console.error('User activity API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
