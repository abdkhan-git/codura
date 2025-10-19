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
