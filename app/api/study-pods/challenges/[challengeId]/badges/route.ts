import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/challenges/[challengeId]/badges
 * Get badges awarded for a specific challenge
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

    // Get badges for this challenge
    const { data: userBadges, error: badgesError } = await supabase
      .from('user_challenge_badges')
      .select(`
        *,
        badge:challenge_badges(*)
      `)
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id);

    if (badgesError) {
      console.error('Error fetching badges:', badgesError);
      return NextResponse.json(
        { error: 'Failed to fetch badges' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      badges: userBadges || [],
      total: userBadges?.length || 0,
    });
  } catch (error) {
    console.error('Unexpected error fetching badges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/study-pods/challenges/[challengeId]/badges/check
 * Check and award badges based on current challenge performance
 */
export async function POST(
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
      .select('*')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    // Get participant stats
    const { data: participant, error: participantError } = await supabase
      .from('study_pod_challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'You are not a participant in this challenge' },
        { status: 400 }
      );
    }

    // Get all available badges
    const { data: allBadges } = await supabase
      .from('challenge_badges')
      .select('*');

    if (!allBadges) {
      return NextResponse.json({ badges_awarded: [], message: 'No badges available' });
    }

    // Get user's existing badges
    const { data: existingBadges } = await supabase
      .from('user_challenge_badges')
      .select('badge_id')
      .eq('user_id', user.id);

    const existingBadgeIds = new Set(existingBadges?.map(b => b.badge_id) || []);

    // Get user's overall challenge stats
    const { data: allParticipations } = await supabase
      .from('study_pod_challenge_participants')
      .select('total_points, problems_solved, status')
      .eq('user_id', user.id);

    const totalChallengesCompleted = allParticipations?.filter(p => p.status === 'completed').length || 0;
    const totalProblemsSolved = allParticipations?.reduce((sum, p) => sum + (p.problems_solved || 0), 0) || 0;
    const totalPoints = allParticipations?.reduce((sum, p) => sum + (p.total_points || 0), 0) || 0;

    // Get submissions for this challenge
    const { data: submissions } = await supabase
      .from('study_pod_challenge_submissions')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id);

    const badgesToAward: any[] = [];

    // Check each badge
    for (const badge of allBadges) {
      // Skip if already earned for this challenge
      const alreadyEarned = existingBadgeIds.has(badge.id);
      if (alreadyEarned) continue;

      const requirements = badge.requirements as any;
      let earned = false;

      switch (badge.name) {
        case 'first_place':
          earned = participant.status === 'completed' && participant.current_rank === 1;
          break;

        case 'second_place':
          earned = participant.status === 'completed' && participant.current_rank === 2;
          break;

        case 'third_place':
          earned = participant.status === 'completed' && participant.current_rank === 3;
          break;

        case 'clean_sweep':
          earned = participant.problems_solved === challenge.total_problems;
          break;

        case 'speed_demon':
          // Check if any submission got max speed bonus
          earned = submissions?.some(s =>
            s.speed_bonus >= (challenge.point_config?.max_speed_bonus || 50)
          ) || false;
          break;

        case 'efficiency_expert':
          // Check if any submission got max efficiency bonus
          earned = submissions?.some(s =>
            s.efficiency_bonus >= (challenge.point_config?.max_efficiency_bonus || 30)
          ) || false;
          break;

        case 'optimized':
          // Check if total bonuses exceed 100
          const totalBonuses = (participant.speed_bonus_earned || 0) + (participant.efficiency_bonus_earned || 0);
          earned = totalBonuses >= 100;
          break;

        case 'first_challenge':
          earned = totalChallengesCompleted >= 1 && participant.status === 'completed';
          break;

        case 'challenge_veteran':
          earned = totalChallengesCompleted >= 10;
          break;

        case 'challenge_master':
          earned = totalChallengesCompleted >= 50;
          break;

        case 'problem_crusher':
          earned = totalProblemsSolved >= 100;
          break;

        case 'point_collector':
          earned = totalPoints >= 1000;
          break;

        case 'point_master':
          earned = totalPoints >= 5000;
          break;

        // More badge checks can be added here
      }

      if (earned) {
        badgesToAward.push({
          user_id: user.id,
          badge_id: badge.id,
          challenge_id: challengeId,
          pod_id: challenge.pod_id,
          metadata: {
            participant_stats: {
              rank: participant.current_rank,
              points: participant.total_points,
              problems_solved: participant.problems_solved,
            },
          },
        });
      }
    }

    // Award badges
    if (badgesToAward.length > 0) {
      const { error: insertError } = await supabase
        .from('user_challenge_badges')
        .insert(badgesToAward);

      if (insertError) {
        console.error('Error awarding badges:', insertError);
      }
    }

    // Get full badge details for awarded badges
    const awardedBadgeIds = badgesToAward.map(b => b.badge_id);
    const awardedBadges = allBadges.filter(b => awardedBadgeIds.includes(b.id));

    return NextResponse.json({
      badges_awarded: awardedBadges,
      total_awarded: awardedBadges.length,
      message: awardedBadges.length > 0
        ? `Congratulations! You earned ${awardedBadges.length} badge(s)!`
        : 'No new badges earned',
    });
  } catch (error) {
    console.error('Unexpected error checking badges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
