import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const targetUserId = params.userId;

    // Get recent posts by the user
    const { data: recentPosts, error: postsError } = await supabase
      .from('social_posts')
      .select(`
        id,
        content,
        post_type,
        like_count,
        comment_count,
        repost_count,
        created_at,
        user:users!social_posts_user_id_fkey (
          user_id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (postsError) {
      console.error('Error fetching recent posts:', postsError);
    }

    // Get recent activity feed entries
    const { data: recentActivities, error: activitiesError } = await supabase
      .from('user_activities')
      .select(`
        id,
        activity_type,
        metadata,
        created_at
      `)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (activitiesError) {
      console.error('Error fetching recent activities:', activitiesError);
    }

    // Get recent likes by the user
    const { data: recentLikes, error: likesError } = await supabase
      .from('post_likes')
      .select(`
        id,
        created_at,
        social_posts!post_likes_post_id_fkey (
          id,
          content,
          post_type,
          user_id,
          users!social_posts_user_id_fkey (
            user_id,
            username,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (likesError) {
      console.error('Error fetching recent likes:', likesError);
    }

    // Get recent reposts by the user
    const { data: recentReposts, error: repostsError } = await supabase
      .from('post_reposts')
      .select(`
        id,
        created_at,
        social_posts!post_reposts_post_id_fkey (
          id,
          content,
          post_type,
          user_id,
          users!social_posts_user_id_fkey (
            user_id,
            username,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (repostsError) {
      console.error('Error fetching recent reposts:', repostsError);
    }

    // Get recent comments by the user
    const { data: recentComments, error: commentsError } = await supabase
      .from('post_comments')
      .select(`
        id,
        content,
        created_at,
        social_posts!post_comments_post_id_fkey (
          id,
          content,
          post_type,
          user_id,
          users!social_posts_user_id_fkey (
            user_id,
            username,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (commentsError) {
      console.error('Error fetching recent comments:', commentsError);
    }

    // Combine and format the data
    const activities = [];

    // Add posts as activities
    if (recentPosts) {
      recentPosts.forEach((post: any) => {
        activities.push({
          id: `post-${post.id}`,
          type: 'post',
          title: 'Created a new post',
          description: post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content,
          timestamp: post.created_at,
          metadata: {
            post_type: post.post_type,
            like_count: post.like_count,
            comment_count: post.comment_count,
            repost_count: post.repost_count
          },
          user: post.user,
          post: {
            id: post.id,
            content: post.content,
            post_type: post.post_type,
            like_count: post.like_count,
            comment_count: post.comment_count,
            repost_count: post.repost_count
          }
        });
      });
    }

    // Add likes as activities
    if (recentLikes) {
      recentLikes.forEach((like: any) => {
        const post = like.social_posts;
        if (post) {
          activities.push({
            id: `like-${like.id}`,
            type: 'like',
            title: 'Liked a post',
            description: `Liked "${post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content}"`,
            timestamp: like.created_at,
            metadata: {
              post_id: post.id,
              post_type: post.post_type,
              original_author: post.users
            },
            post: {
              id: post.id,
              content: post.content,
              post_type: post.post_type,
              author: post.users
            }
          });
        }
      });
    }

    // Add reposts as activities
    if (recentReposts) {
      recentReposts.forEach((repost: any) => {
        const post = repost.social_posts;
        if (post) {
          activities.push({
            id: `repost-${repost.id}`,
            type: 'repost',
            title: 'Reposted',
            description: `Reposted "${post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content}"`,
            timestamp: repost.created_at,
            metadata: {
              post_id: post.id,
              post_type: post.post_type,
              original_author: post.users
            },
            post: {
              id: post.id,
              content: post.content,
              post_type: post.post_type,
              author: post.users
            }
          });
        }
      });
    }

    // Add comments as activities
    if (recentComments) {
      recentComments.forEach((comment: any) => {
        const post = comment.social_posts;
        if (post) {
          activities.push({
            id: `comment-${comment.id}`,
            type: 'comment',
            title: 'Commented on a post',
            description: `Commented "${comment.content.length > 50 ? comment.content.substring(0, 50) + '...' : comment.content}"`,
            timestamp: comment.created_at,
            metadata: {
              post_id: post.id,
              post_type: post.post_type,
              original_author: post.users,
              comment_content: comment.content
            },
            post: {
              id: post.id,
              content: post.content,
              post_type: post.post_type,
              author: post.users
            },
            comment: {
              id: comment.id,
              content: comment.content
            }
          });
        }
      });
    }

    // Add activity feed entries
    if (recentActivities) {
      recentActivities.forEach((activity: any) => {
        let title = '';
        let description = '';
        
        switch (activity.activity_type) {
          case 'solved_problem':
            title = 'Solved a problem';
            description = `Solved ${activity.metadata.problem_title || 'a coding problem'}`;
            break;
          case 'earned_achievement':
            title = 'Earned an achievement';
            description = `Earned the ${activity.metadata.achievement_name || 'achievement'}`;
            break;
          case 'milestone_reached':
            title = 'Reached a milestone';
            description = activity.metadata.description || 'Reached a new milestone';
            break;
          case 'profile_updated':
            title = 'Updated profile';
            description = 'Updated their profile information';
            break;
          case 'study_plan_created':
            title = 'Created a study plan';
            description = `Created ${activity.metadata.plan_name || 'a new study plan'}`;
            break;
          case 'streak_milestone':
            title = 'Streak milestone';
            description = `Reached a ${activity.metadata.streak_days || 'new'} day streak`;
            break;
          default:
            title = 'Activity';
            description = 'New activity';
        }

        activities.push({
          id: `activity-${activity.id}`,
          type: activity.activity_type,
          title,
          description,
          timestamp: activity.created_at,
          metadata: activity.metadata
        });
      });
    }

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      activities: limitedActivities,
      total: activities.length
    });

  } catch (error) {
    console.error('Recent activity API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
