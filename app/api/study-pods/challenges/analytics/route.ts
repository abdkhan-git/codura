import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/challenges/analytics
 * Get challenge analytics for the current user
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const podId = searchParams.get('pod_id');

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build participation query
    let participationQuery = supabase
      .from('study_pod_challenge_participants')
      .select(`
        *,
        challenge:study_pod_challenges(
          id, title, challenge_type, start_time, end_time, status,
          total_problems, point_config, pod_id
        )
      `)
      .eq('user_id', user.id);

    if (podId) {
      participationQuery = participationQuery.eq('challenge.pod_id', podId);
    }

    const { data: participations, error: participationsError } = await participationQuery;

    if (participationsError) {
      console.error('Error fetching participations:', participationsError);
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }

    // Get all submissions
    let submissionsQuery = supabase
      .from('study_pod_challenge_submissions')
      .select('*')
      .eq('user_id', user.id);

    const { data: submissions } = await submissionsQuery;

    // Get badges
    let badgesQuery = supabase
      .from('user_challenge_badges')
      .select(`
        *,
        badge:challenge_badges(*)
      `)
      .eq('user_id', user.id);

    if (podId) {
      badgesQuery = badgesQuery.eq('pod_id', podId);
    }

    const { data: badges } = await badgesQuery;

    // Calculate analytics
    const totalChallenges = participations?.length || 0;
    const completedChallenges = participations?.filter(p => p.status === 'completed').length || 0;
    const inProgressChallenges = participations?.filter(p => p.status === 'in_progress').length || 0;

    const totalPoints = participations?.reduce((sum, p) => sum + (p.total_points || 0), 0) || 0;
    const totalProblemsSolved = participations?.reduce((sum, p) => sum + (p.problems_solved || 0), 0) || 0;
    const totalProblemsAttempted = participations?.reduce((sum, p) => sum + (p.problems_attempted || 0), 0) || 0;

    const totalSpeedBonus = participations?.reduce((sum, p) => sum + (p.speed_bonus_earned || 0), 0) || 0;
    const totalEfficiencyBonus = participations?.reduce((sum, p) => sum + (p.efficiency_bonus_earned || 0), 0) || 0;

    // Win statistics
    const firstPlaceFinishes = participations?.filter(p => p.current_rank === 1 && p.status === 'completed').length || 0;
    const topThreeFinishes = participations?.filter(p => p.current_rank && p.current_rank <= 3 && p.status === 'completed').length || 0;

    // Accuracy rate
    const accuracyRate = totalProblemsAttempted > 0
      ? Math.round((totalProblemsSolved / totalProblemsAttempted) * 100)
      : 0;

    // Average points per challenge
    const avgPointsPerChallenge = completedChallenges > 0
      ? Math.round(totalPoints / completedChallenges)
      : 0;

    // Performance by difficulty (from submissions)
    const difficultyStats: Record<string, { solved: number; attempted: number; points: number }> = {
      Easy: { solved: 0, attempted: 0, points: 0 },
      Medium: { solved: 0, attempted: 0, points: 0 },
      Hard: { solved: 0, attempted: 0, points: 0 },
    };

    // Group by difficulty would require problem join - simplified for now

    // Recent performance (last 5 challenges)
    const recentChallenges = participations
      ?.filter(p => p.challenge && p.status !== 'registered')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(p => ({
        challenge_id: p.challenge?.id,
        title: p.challenge?.title,
        type: p.challenge?.challenge_type,
        points: p.total_points,
        rank: p.current_rank,
        problems_solved: p.problems_solved,
        status: p.status,
        date: p.created_at,
      })) || [];

    // Badge statistics
    const badgesByTier: Record<string, number> = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
    };

    const badgesByCategory: Record<string, number> = {
      challenge: 0,
      speed: 0,
      efficiency: 0,
      streak: 0,
      milestone: 0,
    };

    badges?.forEach(ub => {
      if (ub.badge?.tier) {
        badgesByTier[ub.badge.tier] = (badgesByTier[ub.badge.tier] || 0) + 1;
      }
      if (ub.badge?.category) {
        badgesByCategory[ub.badge.category] = (badgesByCategory[ub.badge.category] || 0) + 1;
      }
    });

    // Challenge type performance
    const performanceByType: Record<string, { count: number; wins: number; points: number }> = {};
    participations?.forEach(p => {
      const type = p.challenge?.challenge_type || 'unknown';
      if (!performanceByType[type]) {
        performanceByType[type] = { count: 0, wins: 0, points: 0 };
      }
      performanceByType[type].count++;
      performanceByType[type].points += p.total_points || 0;
      if (p.current_rank === 1 && p.status === 'completed') {
        performanceByType[type].wins++;
      }
    });

    return NextResponse.json({
      overview: {
        total_challenges: totalChallenges,
        completed_challenges: completedChallenges,
        in_progress_challenges: inProgressChallenges,
        total_points: totalPoints,
        total_problems_solved: totalProblemsSolved,
        total_problems_attempted: totalProblemsAttempted,
        accuracy_rate: accuracyRate,
        avg_points_per_challenge: avgPointsPerChallenge,
      },
      bonuses: {
        speed_bonus_total: totalSpeedBonus,
        efficiency_bonus_total: totalEfficiencyBonus,
        total_bonus: totalSpeedBonus + totalEfficiencyBonus,
      },
      rankings: {
        first_place_finishes: firstPlaceFinishes,
        top_three_finishes: topThreeFinishes,
        win_rate: completedChallenges > 0 ? Math.round((firstPlaceFinishes / completedChallenges) * 100) : 0,
      },
      badges: {
        total: badges?.length || 0,
        by_tier: badgesByTier,
        by_category: badgesByCategory,
        recent: badges?.slice(0, 5).map(b => ({
          id: b.id,
          name: b.badge?.display_name,
          icon: b.badge?.icon,
          tier: b.badge?.tier,
          color: b.badge?.color,
          awarded_at: b.awarded_at,
        })) || [],
      },
      performance_by_type: performanceByType,
      recent_challenges: recentChallenges,
    });
  } catch (error) {
    console.error('Unexpected error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
