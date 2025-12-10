import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/[id]/challenges
 * Get all challenges for a pod
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId } = await params;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, active, upcoming, completed

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a pod member
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You must be a pod member to view challenges' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from('study_pod_challenges')
      .select('*')
      .eq('pod_id', podId);

    // Apply filters
    if (filter === 'active') {
      query = query
        .eq('status', 'active')
        .lte('start_time', new Date().toISOString())
        .gte('end_time', new Date().toISOString());
    } else if (filter === 'upcoming') {
      query = query
        .eq('status', 'upcoming')
        .gt('start_time', new Date().toISOString());
    } else if (filter === 'completed') {
      query = query.eq('status', 'completed');
    }

    query = query.order('start_time', { ascending: false });

    const { data: challenges, error: challengesError } = await query;

    if (challengesError) {
      console.error('Error fetching challenges:', challengesError);
      return NextResponse.json(
        { error: 'Failed to fetch challenges' },
        { status: 500 }
      );
    }

    // Get creator details
    const creatorIds = [...new Set(challenges?.map(c => c.created_by) || [])];
    let creatorDetails: Record<string, any> = {};

    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('users')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', creatorIds);

      creators?.forEach(creator => {
        creatorDetails[creator.user_id] = creator;
      });
    }

    // Get user's participation status for each challenge
    const challengeIds = challenges?.map(c => c.id) || [];
    let userParticipation: Record<string, any> = {};

    if (challengeIds.length > 0) {
      const { data: participationData } = await supabase
        .from('study_pod_challenge_participants')
        .select('challenge_id, status, total_points, problems_solved, problems_attempted, current_rank, speed_bonus_earned, efficiency_bonus_earned')
        .in('challenge_id', challengeIds)
        .eq('user_id', user.id);

      participationData?.forEach(p => {
        userParticipation[p.challenge_id] = p;
      });
    }

    // Enrich challenges
    const enrichedChallenges = challenges?.map(challenge => ({
      ...challenge,
      creator: creatorDetails[challenge.created_by] || null,
      user_participation: userParticipation[challenge.id] || null,
    })) || [];

    return NextResponse.json({
      challenges: enrichedChallenges,
      total: enrichedChallenges.length,
    });
  } catch (error) {
    console.error('Unexpected error fetching challenges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/study-pods/[id]/challenges
 * Create a new challenge (owner/moderator only)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is owner or moderator
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member || !['owner', 'moderator'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Only pod owners and moderators can create challenges' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      title,
      description,
      challenge_type,
      start_time,
      end_time,
      problem_ids,
      max_participants,
      point_config,
    } = body;

    // Validation
    if (!title || !start_time || !end_time || !problem_ids || problem_ids.length === 0) {
      return NextResponse.json(
        { error: 'title, start_time, end_time, and problem_ids are required' },
        { status: 400 }
      );
    }

    // Validate challenge_type
    const validTypes = ['daily', 'weekly', 'custom', 'head_to_head'];
    if (challenge_type && !validTypes.includes(challenge_type)) {
      return NextResponse.json(
        { error: 'Invalid challenge_type' },
        { status: 400 }
      );
    }

    // Calculate duration in minutes
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

    if (durationMinutes <= 0) {
      return NextResponse.json(
        { error: 'end_time must be after start_time' },
        { status: 400 }
      );
    }

    // Create challenge
    const { data: challenge, error: insertError } = await supabase
      .from('study_pod_challenges')
      .insert({
        pod_id: podId,
        created_by: user.id,
        title,
        description: description || null,
        challenge_type: challenge_type || 'custom',
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        duration_minutes: durationMinutes,
        problem_ids,
        total_problems: problem_ids.length,
        max_participants: max_participants || null,
        point_config: point_config || undefined,
        status: startDate > new Date() ? 'upcoming' : 'active',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating challenge:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to create challenge' },
        { status: 500 }
      );
    }

    // Get creator details
    const { data: creator } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    challenge.creator = creator;

    // Create activity log
    try {
      await supabase.from('study_pod_activities').insert({
        pod_id: podId,
        user_id: user.id,
        activity_type: 'announcement',
        title: 'Challenge created',
        description: `${title} - ${problem_ids.length} problems`,
        metadata: {
          challenge_id: challenge.id,
          challenge_type: challenge.challenge_type,
        },
      });
    } catch (error) {
      console.error('Error creating activity log:', error);
    }

    // Notify all pod members
    try {
      const { data: members } = await supabase
        .from('study_pod_members')
        .select('user_id')
        .eq('pod_id', podId)
        .eq('status', 'active')
        .neq('user_id', user.id);

      if (members && members.length > 0) {
        const notifications = members.map(m => ({
          user_id: m.user_id,
          actor_id: user.id,
          type: 'message',
          title: 'New Challenge Created',
          message: `${title} - Starts ${new Date(start_time).toLocaleString()}`,
          link: `/study-pods/${podId}?tab=challenges`,
          metadata: {
            pod_id: podId,
            challenge_id: challenge.id,
            notification_type: 'challenge_created',
          },
        }));

        await supabase.from('notifications').insert(notifications);
      }
    } catch (error) {
      console.error('Error creating notifications:', error);
    }

    return NextResponse.json({
      success: true,
      challenge,
      message: 'Challenge created successfully',
    });
  } catch (error) {
    console.error('Unexpected error creating challenge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
