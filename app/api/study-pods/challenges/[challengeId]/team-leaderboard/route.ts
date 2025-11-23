import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/challenges/[challengeId]/team-leaderboard
 * Get the team vs team leaderboard for a challenge
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const supabase = await createClient();
    const { challengeId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get challenge details
    const { data: challenge, error: challengeError } = await supabase
      .from('study_pod_challenges')
      .select(`
        *,
        initiator_pod:study_pods!study_pod_challenges_pod_id_fkey (
          id, name, avatar_url, subject
        ),
        opponent_pod:study_pods!study_pod_challenges_opponent_pod_id_fkey (
          id, name, avatar_url, subject
        )
      `)
      .eq('id', challengeId)
      .eq('is_team_challenge', true)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'Team challenge not found' },
        { status: 404 }
      );
    }

    // Verify user has access (member of either pod)
    const { data: membership } = await supabase
      .from('study_pod_members')
      .select('pod_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('pod_id', [challenge.pod_id, challenge.opponent_pod_id]);

    if (!membership || membership.length === 0) {
      return NextResponse.json(
        { error: 'You do not have access to this challenge' },
        { status: 403 }
      );
    }

    // Get all participants with their pod membership
    const { data: participants, error: participantsError } = await supabase
      .from('study_pod_challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('total_points', { ascending: false });

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    // Get user details and pod membership for participants
    const userIds = participants?.map(p => p.user_id) || [];

    const { data: users } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .in('user_id', userIds);

    const { data: memberships } = await supabase
      .from('study_pod_members')
      .select('user_id, pod_id')
      .in('user_id', userIds)
      .in('pod_id', [challenge.pod_id, challenge.opponent_pod_id])
      .eq('status', 'active');

    // Create lookup maps
    const userDetails: Record<string, any> = {};
    users?.forEach(u => {
      userDetails[u.user_id] = u;
    });

    const userPodMap: Record<string, string> = {};
    memberships?.forEach(m => {
      userPodMap[m.user_id] = m.pod_id;
    });

    // Separate participants by team
    const team1Participants: any[] = [];
    const team2Participants: any[] = [];

    participants?.forEach(participant => {
      const enrichedParticipant = {
        ...participant,
        user: userDetails[participant.user_id] || {
          username: 'Unknown',
          full_name: 'Unknown User',
          avatar_url: '',
        },
        pod_id: userPodMap[participant.user_id],
      };

      if (userPodMap[participant.user_id] === challenge.pod_id) {
        team1Participants.push(enrichedParticipant);
      } else if (userPodMap[participant.user_id] === challenge.opponent_pod_id) {
        team2Participants.push(enrichedParticipant);
      }
    });

    // Calculate team totals
    const team1Stats = {
      total_points: team1Participants.reduce((sum, p) => sum + (p.total_points || 0), 0),
      problems_solved: team1Participants.reduce((sum, p) => sum + (p.problems_solved || 0), 0),
      participants: team1Participants.length,
      avg_points: team1Participants.length > 0
        ? Math.round(team1Participants.reduce((sum, p) => sum + (p.total_points || 0), 0) / team1Participants.length)
        : 0,
    };

    const team2Stats = {
      total_points: team2Participants.reduce((sum, p) => sum + (p.total_points || 0), 0),
      problems_solved: team2Participants.reduce((sum, p) => sum + (p.problems_solved || 0), 0),
      participants: team2Participants.length,
      avg_points: team2Participants.length > 0
        ? Math.round(team2Participants.reduce((sum, p) => sum + (p.total_points || 0), 0) / team2Participants.length)
        : 0,
    };

    // Determine leading team
    let leadingTeam: 'team1' | 'team2' | 'tie' = 'tie';
    if (team1Stats.total_points > team2Stats.total_points) {
      leadingTeam = 'team1';
    } else if (team2Stats.total_points > team1Stats.total_points) {
      leadingTeam = 'team2';
    }

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        title: challenge.title,
        status: challenge.status,
        start_time: challenge.start_time,
        end_time: challenge.end_time,
        total_problems: challenge.total_problems,
        winner_pod_id: challenge.winner_pod_id,
      },
      team1: {
        pod: challenge.initiator_pod,
        stats: team1Stats,
        participants: team1Participants,
      },
      team2: {
        pod: challenge.opponent_pod,
        stats: team2Stats,
        participants: team2Participants,
      },
      leading_team: leadingTeam,
      point_difference: Math.abs(team1Stats.total_points - team2Stats.total_points),
    });
  } catch (error) {
    console.error('Unexpected error fetching team leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
