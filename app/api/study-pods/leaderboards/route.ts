import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/leaderboards
 * Get public pod leaderboards with rankings
 *
 * Query params:
 * - type: 'challenges' | 'problems' | 'activity' | 'overall' (default: 'overall')
 * - timeframe: 'week' | 'month' | 'all' (default: 'all')
 * - limit: number (default: 20)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type') || 'overall';
    const timeframe = searchParams.get('timeframe') || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    // Calculate date filter based on timeframe
    let dateFilter: Date | null = null;
    if (timeframe === 'week') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'month') {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get all public pods with their stats
    const { data: pods, error: podsError } = await supabase
      .from('study_pods')
      .select(`
        id,
        name,
        description,
        subject,
        skill_level,
        avatar_url,
        created_at,
        study_pod_members!inner (
          id,
          user_id,
          status
        )
      `)
      .eq('visibility', 'public')
      .eq('study_pod_members.status', 'active');

    if (podsError) {
      console.error('Error fetching pods:', podsError);
      return NextResponse.json({ error: 'Failed to fetch pods' }, { status: 500 });
    }

    if (!pods || pods.length === 0) {
      return NextResponse.json({
        leaderboard: [],
        total: 0,
        type,
        timeframe,
      });
    }

    const podIds = pods.map(p => p.id);

    // Get challenge stats for each pod
    let challengeQuery = supabase
      .from('study_pod_challenges')
      .select('pod_id, id, status, winner_pod_id')
      .in('pod_id', podIds);

    if (dateFilter) {
      challengeQuery = challengeQuery.gte('created_at', dateFilter.toISOString());
    }

    const { data: challenges } = await challengeQuery;

    // Get problem completion stats
    let problemsQuery = supabase
      .from('study_pod_problem_completions')
      .select('pod_id, user_id, completed_at')
      .in('pod_id', podIds);

    if (dateFilter) {
      problemsQuery = problemsQuery.gte('completed_at', dateFilter.toISOString());
    }

    const { data: problemCompletions } = await problemsQuery;

    // Get challenge participation and points
    const { data: challengeParticipants } = await supabase
      .from('study_pod_challenge_participants')
      .select(`
        user_id,
        total_points,
        problems_solved,
        challenge_id,
        study_pod_challenges!inner (
          pod_id
        )
      `)
      .in('study_pod_challenges.pod_id', podIds);

    // Calculate stats for each pod
    const podStats = pods.map(pod => {
      const memberCount = pod.study_pod_members?.length || 0;

      // Challenge stats
      const podChallenges = challenges?.filter(c => c.pod_id === pod.id) || [];
      const totalChallenges = podChallenges.length;
      const completedChallenges = podChallenges.filter(c => c.status === 'completed').length;
      const challengeWins = podChallenges.filter(c => c.winner_pod_id === pod.id).length;

      // Problem stats
      const podProblems = problemCompletions?.filter(p => p.pod_id === pod.id) || [];
      const totalProblemsCompleted = podProblems.length;

      // Points from challenge participants
      const podParticipants = challengeParticipants?.filter(
        (p: any) => p.study_pod_challenges?.pod_id === pod.id
      ) || [];
      const totalChallengePoints = podParticipants.reduce((sum: number, p: any) => sum + (p.total_points || 0), 0);
      const totalChallengeProblemsSolved = podParticipants.reduce((sum: number, p: any) => sum + (p.problems_solved || 0), 0);

      // Calculate overall score
      let score = 0;
      switch (type) {
        case 'challenges':
          score = (completedChallenges * 100) + (challengeWins * 200) + totalChallengePoints;
          break;
        case 'problems':
          score = totalProblemsCompleted + totalChallengeProblemsSolved;
          break;
        case 'activity':
          score = (memberCount * 10) + (totalChallenges * 50) + (totalProblemsCompleted * 5);
          break;
        case 'overall':
        default:
          score = (memberCount * 10) +
                  (completedChallenges * 100) +
                  (challengeWins * 200) +
                  (totalProblemsCompleted * 5) +
                  (totalChallengePoints);
          break;
      }

      return {
        id: pod.id,
        name: pod.name,
        description: pod.description,
        subject: pod.subject,
        skill_level: pod.skill_level,
        avatar_url: pod.avatar_url,
        member_count: memberCount,
        stats: {
          total_challenges: totalChallenges,
          completed_challenges: completedChallenges,
          challenge_wins: challengeWins,
          total_problems_completed: totalProblemsCompleted + totalChallengeProblemsSolved,
          total_challenge_points: totalChallengePoints,
        },
        score,
      };
    });

    // Sort by score and assign ranks
    podStats.sort((a, b) => b.score - a.score);

    const leaderboard = podStats.slice(0, limit).map((pod, index) => ({
      ...pod,
      rank: index + 1,
    }));

    return NextResponse.json({
      leaderboard,
      total: podStats.length,
      type,
      timeframe,
    });
  } catch (error) {
    console.error('Unexpected error fetching leaderboards:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
