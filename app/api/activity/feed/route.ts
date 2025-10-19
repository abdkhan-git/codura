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
    const activityTypes = searchParams.get('types')?.split(',') || null;

    // Get activity feed using the database function
    const { data: activities, error } = await supabase.rpc('get_activity_feed', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset,
      p_activity_types: activityTypes
    });

    if (error) {
      console.error('Error fetching activity feed:', error);
      console.log('Falling back to direct query');

      // Fallback: Use direct query
      let query = supabase
        .from('activity_feed')
        .select('*')
        .or(`is_public.eq.true,user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (activityTypes && activityTypes.length > 0) {
        query = query.in('activity_type', activityTypes);
      }

      const { data: fallbackActivities, error: fallbackError } = await query;

      if (fallbackError) {
        console.error('Fallback query error:', fallbackError);
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }

      // Fetch user data separately for each activity
      const activitiesWithUsers = await Promise.all(
        (fallbackActivities || []).map(async (activity) => {
          const { data: userData } = await supabase
            .from('users')
            .select('username, full_name, avatar_url')
            .eq('user_id', activity.user_id)
            .single();

          // Check if user reacted
          const { data: reactionData } = await supabase
            .from('activity_reactions')
            .select('id')
            .eq('activity_id', activity.id)
            .eq('user_id', user.id)
            .single();

          // Get reaction and comment counts
          const { count: reactionCount } = await supabase
            .from('activity_reactions')
            .select('*', { count: 'exact', head: true })
            .eq('activity_id', activity.id);

          const { count: commentCount } = await supabase
            .from('activity_comments')
            .select('*', { count: 'exact', head: true })
            .eq('activity_id', activity.id);

          return {
            ...activity,
            user_name: userData?.full_name || 'Unknown User',
            user_username: userData?.username || 'unknown',
            user_avatar_url: userData?.avatar_url || null,
            user_reacted: !!reactionData,
            reaction_count: reactionCount || 0,
            comment_count: commentCount || 0
          };
        })
      );

      return NextResponse.json({
        activities: activitiesWithUsers,
        pagination: {
          limit,
          offset,
          total: activitiesWithUsers.length,
          hasMore: activitiesWithUsers.length >= limit
        }
      });
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('activity_feed')
      .select('*', { count: 'exact', head: true })
      .or(`is_public.eq.true,user_id.eq.${user.id},target_user_id.eq.${user.id}`);

    if (countError) {
      console.error('Error getting activity count:', countError);
    }

    return NextResponse.json({
      activities: activities || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('Activity feed API error:', error);
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
      activity_type,
      title,
      description,
      metadata = {},
      target_user_id,
      target_problem_id,
      is_public = true
    } = body;

    if (!activity_type || !title) {
      return NextResponse.json({ error: 'Activity type and title are required' }, { status: 400 });
    }

    // Create activity using the database function
    const { data: activityId, error } = await supabase.rpc('create_activity', {
      p_user_id: user.id,
      p_activity_type: activity_type,
      p_title: title,
      p_description: description,
      p_metadata: metadata,
      p_target_user_id: target_user_id,
      p_target_problem_id: target_problem_id,
      p_is_public: is_public
    });

    if (error) {
      console.error('Error creating activity:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      activity_id: activityId 
    });

  } catch (error) {
    console.error('Create activity API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
