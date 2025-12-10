import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/study-pods/[id]/challenges/team-challenge
 * Create a Team vs Team challenge between two pods
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId } = await params;
    const body = await request.json();

    const {
      opponent_pod_id,
      title,
      description,
      start_time,
      end_time,
      duration_minutes,
      problem_ids,
      point_config,
      rules,
    } = body;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin of the initiating pod
    const { data: membership } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'moderator'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only pod admins can create team challenges' },
        { status: 403 }
      );
    }

    // Verify opponent pod exists and is public (or user has access)
    const { data: opponentPod } = await supabase
      .from('study_pods')
      .select('id, name, visibility')
      .eq('id', opponent_pod_id)
      .single();

    if (!opponentPod) {
      return NextResponse.json(
        { error: 'Opponent pod not found' },
        { status: 404 }
      );
    }

    // Validate timing
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    const now = new Date();

    if (startDate <= now) {
      return NextResponse.json(
        { error: 'Start time must be in the future' },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Validate problem_ids
    if (!problem_ids || problem_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one problem is required' },
        { status: 400 }
      );
    }

    // Create the team challenge
    const defaultPointConfig = {
      base_points: { easy: 10, medium: 20, hard: 30 },
      speed_multiplier: 1.5,
      efficiency_multiplier: 1.2,
      max_speed_bonus: 50,
      max_efficiency_bonus: 30,
    };

    const { data: challenge, error: challengeError } = await supabase
      .from('study_pod_challenges')
      .insert({
        pod_id: podId,
        created_by: user.id,
        title,
        description,
        challenge_type: 'head_to_head',
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        duration_minutes: duration_minutes || Math.round((endDate.getTime() - startDate.getTime()) / 60000),
        problem_ids,
        total_problems: problem_ids.length,
        point_config: point_config || defaultPointConfig,
        status: 'upcoming',
        is_team_challenge: true,
        opponent_pod_id,
        rules: rules || [],
        metadata: {
          initiator_pod_id: podId,
          challenge_accepted: false,
        },
      })
      .select()
      .single();

    if (challengeError) {
      console.error('Error creating team challenge:', challengeError);
      return NextResponse.json(
        { error: 'Failed to create team challenge' },
        { status: 500 }
      );
    }

    // Create activity for initiating pod
    await supabase.from('study_pod_activities').insert({
      pod_id: podId,
      user_id: user.id,
      activity_type: 'challenge_created',
      title: `Team challenge created: ${title} vs ${opponentPod.name}`,
      metadata: { challenge_id: challenge.id, opponent_pod_id },
    });

    // Create notification/invitation for opponent pod (stored in metadata)
    // In production, you'd also send real notifications here
    await supabase
      .from('study_pod_activities')
      .insert({
        pod_id: opponent_pod_id,
        user_id: user.id,
        activity_type: 'team_challenge_received',
        title: `Team challenge received: ${title}`,
        metadata: {
          challenge_id: challenge.id,
          initiator_pod_id: podId,
          status: 'pending',
        },
      });

    return NextResponse.json({
      challenge,
      message: 'Team challenge created successfully',
    });
  } catch (error) {
    console.error('Unexpected error creating team challenge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/study-pods/[id]/challenges/team-challenge
 * Get all team challenges for a pod (sent and received)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId } = await params;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, sent, received, active

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this pod
    const { data: membership } = await supabase
      .from('study_pod_members')
      .select('id')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this pod' },
        { status: 403 }
      );
    }

    // Build query for team challenges
    let query = supabase
      .from('study_pod_challenges')
      .select(`
        *,
        initiator_pod:study_pods!study_pod_challenges_pod_id_fkey (
          id, name, avatar_url
        ),
        opponent_pod:study_pods!study_pod_challenges_opponent_pod_id_fkey (
          id, name, avatar_url
        )
      `)
      .eq('is_team_challenge', true);

    // Apply filter
    switch (filter) {
      case 'sent':
        query = query.eq('pod_id', podId);
        break;
      case 'received':
        query = query.eq('opponent_pod_id', podId);
        break;
      case 'active':
        query = query
          .or(`pod_id.eq.${podId},opponent_pod_id.eq.${podId}`)
          .eq('status', 'active');
        break;
      default:
        query = query.or(`pod_id.eq.${podId},opponent_pod_id.eq.${podId}`);
    }

    query = query.order('created_at', { ascending: false });

    const { data: challenges, error: challengesError } = await query;

    if (challengesError) {
      console.error('Error fetching team challenges:', challengesError);
      return NextResponse.json(
        { error: 'Failed to fetch team challenges' },
        { status: 500 }
      );
    }

    // Get participant counts for each challenge
    const challengeIds = challenges?.map(c => c.id) || [];

    if (challengeIds.length > 0) {
      const { data: participantCounts } = await supabase
        .from('study_pod_challenge_participants')
        .select('challenge_id, user_id')
        .in('challenge_id', challengeIds);

      // Group participants by challenge and pod
      const participantsByChallenge: Record<string, { pod1: number; pod2: number }> = {};

      if (participantCounts) {
        // Get pod membership for each participant
        const userIds = [...new Set(participantCounts.map(p => p.user_id))];
        const { data: memberships } = await supabase
          .from('study_pod_members')
          .select('user_id, pod_id')
          .in('user_id', userIds)
          .eq('status', 'active');

        participantCounts.forEach(p => {
          if (!participantsByChallenge[p.challenge_id]) {
            participantsByChallenge[p.challenge_id] = { pod1: 0, pod2: 0 };
          }

          const challenge = challenges?.find(c => c.id === p.challenge_id);
          const userMembership = memberships?.find(m => m.user_id === p.user_id);

          if (challenge && userMembership) {
            if (userMembership.pod_id === challenge.pod_id) {
              participantsByChallenge[p.challenge_id].pod1++;
            } else if (userMembership.pod_id === challenge.opponent_pod_id) {
              participantsByChallenge[p.challenge_id].pod2++;
            }
          }
        });
      }

      // Attach participant counts to challenges
      challenges?.forEach(challenge => {
        (challenge as any).participant_counts = participantsByChallenge[challenge.id] || { pod1: 0, pod2: 0 };
      });
    }

    return NextResponse.json({
      challenges: challenges || [],
      total: challenges?.length || 0,
    });
  } catch (error) {
    console.error('Unexpected error fetching team challenges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
