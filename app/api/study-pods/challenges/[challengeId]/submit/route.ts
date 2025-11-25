import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Calculate points for a challenge submission
 */
function calculatePoints(
  difficulty: string,
  timeTakenSeconds: number,
  codeLength: number,
  isCorrect: boolean,
  pointConfig: any,
  challengeDurationMinutes: number
) {
  if (!isCorrect) return { total: 0, base: 0, speed: 0, efficiency: 0 };

  // Base points based on difficulty
  const basePoints = pointConfig.base_points?.[difficulty.toLowerCase()] || 0;

  // Speed bonus calculation
  // Faster completion within challenge time = more points
  const challengeDurationSeconds = challengeDurationMinutes * 60;
  const speedRatio = 1 - (timeTakenSeconds / challengeDurationSeconds);
  const maxSpeedBonus = pointConfig.max_speed_bonus || 50;
  const speedBonus = Math.max(0, Math.round(speedRatio * maxSpeedBonus));

  // Efficiency bonus based on code length
  // Shorter code = more efficient (with reasonable bounds)
  const targetCodeLength = difficulty === 'Easy' ? 50 : difficulty === 'Medium' ? 100 : 150;
  const efficiencyRatio = Math.max(0, 1 - Math.abs(codeLength - targetCodeLength) / targetCodeLength);
  const maxEfficiencyBonus = pointConfig.max_efficiency_bonus || 30;
  const efficiencyBonus = Math.round(efficiencyRatio * maxEfficiencyBonus);

  const totalPoints = basePoints + speedBonus + efficiencyBonus;

  return {
    total: totalPoints,
    base: basePoints,
    speed: speedBonus,
    efficiency: efficiencyBonus,
  };
}

/**
 * POST /api/study-pods/challenges/[challengeId]/submit
 * Submit a problem solution for a challenge
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

    // Parse request body
    const body = await request.json();
    const {
      problem_id,
      code,
      language,
      time_taken_seconds,
      is_correct,
      test_cases_passed,
      total_test_cases,
    } = body;

    // Validation
    if (!problem_id || !code || !language || time_taken_seconds === undefined || is_correct === undefined) {
      return NextResponse.json(
        { error: 'problem_id, code, language, time_taken_seconds, and is_correct are required' },
        { status: 400 }
      );
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

    // Check if challenge is active
    const now = new Date();
    if (now < new Date(challenge.start_time) || now > new Date(challenge.end_time)) {
      return NextResponse.json(
        { error: 'Challenge is not currently active' },
        { status: 400 }
      );
    }

    // Check if problem is part of challenge
    if (!challenge.problem_ids.includes(problem_id)) {
      return NextResponse.json(
        { error: 'Problem is not part of this challenge' },
        { status: 400 }
      );
    }

    // Get participant record
    const { data: participant, error: participantError } = await supabase
      .from('study_pod_challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'You must join the challenge before submitting' },
        { status: 400 }
      );
    }

    // Get problem difficulty
    const { data: problem } = await supabase
      .from('problems')
      .select('difficulty')
      .eq('id', problem_id)
      .single();

    if (!problem) {
      return NextResponse.json(
        { error: 'Problem not found' },
        { status: 404 }
      );
    }

    // Check if already submitted this problem
    const { data: existingSubmission } = await supabase
      .from('study_pod_challenge_submissions')
      .select('id, is_correct')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .eq('problem_id', problem_id)
      .single();

    // If already correctly solved, don't allow resubmission
    if (existingSubmission?.is_correct) {
      return NextResponse.json(
        { error: 'You have already correctly solved this problem' },
        { status: 400 }
      );
    }

    // Calculate attempt number
    const attemptNumber = existingSubmission ? 2 : 1;

    // Calculate code metrics
    const codeLength = code.split('\n').length;
    const efficiencyScore = Math.max(0, 100 - codeLength); // Simple metric

    // Calculate points
    const pointConfig = challenge.point_config || {};
    const points = calculatePoints(
      problem.difficulty,
      time_taken_seconds,
      codeLength,
      is_correct,
      pointConfig,
      challenge.duration_minutes
    );

    // Create or update submission
    const submissionData = {
      challenge_id: challengeId,
      participant_id: participant.id,
      problem_id,
      user_id: user.id,
      code,
      language,
      time_taken_seconds,
      attempt_number: attemptNumber,
      is_correct,
      test_cases_passed: test_cases_passed || 0,
      total_test_cases: total_test_cases || 0,
      points_earned: points.total,
      base_points: points.base,
      speed_bonus: points.speed,
      efficiency_bonus: points.efficiency,
      code_length: codeLength,
      efficiency_score: efficiencyScore,
    };

    let submission;
    if (existingSubmission) {
      // Update existing submission
      const { data, error } = await supabase
        .from('study_pod_challenge_submissions')
        .update(submissionData)
        .eq('id', existingSubmission.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating submission:', error);
        return NextResponse.json(
          { error: 'Failed to update submission' },
          { status: 500 }
        );
      }
      submission = data;
    } else {
      // Create new submission
      const { data, error } = await supabase
        .from('study_pod_challenge_submissions')
        .insert(submissionData)
        .select()
        .single();

      if (error) {
        console.error('Error creating submission:', error);
        return NextResponse.json(
          { error: 'Failed to create submission' },
          { status: 500 }
        );
      }
      submission = data;
    }

    // Update participant stats if correct solution
    if (is_correct) {
      // Get all correct submissions for this participant
      const { data: allSubmissions } = await supabase
        .from('study_pod_challenge_submissions')
        .select('points_earned, speed_bonus, efficiency_bonus')
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id)
        .eq('is_correct', true);

      const totalPoints = allSubmissions?.reduce((sum, s) => sum + (s.points_earned || 0), 0) || 0;
      const totalSpeedBonus = allSubmissions?.reduce((sum, s) => sum + (s.speed_bonus || 0), 0) || 0;
      const totalEfficiencyBonus = allSubmissions?.reduce((sum, s) => sum + (s.efficiency_bonus || 0), 0) || 0;
      const problemsSolved = allSubmissions?.length || 0;

      // Check if all problems are solved
      const allProblemsSolved = problemsSolved === challenge.total_problems;

      // Update participant
      const { error: updateError } = await supabase
        .from('study_pod_challenge_participants')
        .update({
          total_points: totalPoints,
          problems_solved: problemsSolved,
          problems_attempted: participant.problems_attempted + (existingSubmission ? 0 : 1),
          speed_bonus_earned: totalSpeedBonus,
          efficiency_bonus_earned: totalEfficiencyBonus,
          status: allProblemsSolved ? 'completed' : 'in_progress',
          completed_at: allProblemsSolved ? now.toISOString() : null,
        })
        .eq('id', participant.id);

      if (updateError) {
        console.error('Error updating participant:', updateError);
      }

      // Update participant ranks
      try {
        const { data: allParticipants } = await supabase
          .from('study_pod_challenge_participants')
          .select('id, total_points')
          .eq('challenge_id', challengeId)
          .order('total_points', { ascending: false });

        if (allParticipants) {
          for (let i = 0; i < allParticipants.length; i++) {
            await supabase
              .from('study_pod_challenge_participants')
              .update({ current_rank: i + 1 })
              .eq('id', allParticipants[i].id);
          }
        }
      } catch (error) {
        console.error('Error updating ranks:', error);
      }
    } else {
      // Increment problems_attempted for incorrect submission
      if (!existingSubmission) {
        await supabase
          .from('study_pod_challenge_participants')
          .update({
            problems_attempted: participant.problems_attempted + 1,
          })
          .eq('id', participant.id);
      }
    }

    // Check and award badges after successful submission
    let newBadges: any[] = [];
    if (is_correct) {
      try {
        newBadges = await checkAndAwardBadges(supabase, user.id, challengeId, challenge, participant, submission);
      } catch (error) {
        console.error('Error checking badges:', error);
      }
    }

    return NextResponse.json({
      success: true,
      submission,
      points,
      badges_awarded: newBadges,
      message: is_correct ? `Great job! You earned ${points.total} points!` : 'Keep trying!',
    });
  } catch (error) {
    console.error('Unexpected error submitting solution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check and award badges based on submission performance
 */
async function checkAndAwardBadges(
  supabase: any,
  userId: string,
  challengeId: string,
  challenge: any,
  participant: any,
  submission: any
) {
  // Get all available badges
  const { data: allBadges } = await supabase
    .from('challenge_badges')
    .select('*');

  if (!allBadges) return [];

  // Get user's existing badges for this challenge
  const { data: existingBadges } = await supabase
    .from('user_challenge_badges')
    .select('badge_id')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId);

  const existingBadgeIds = new Set(existingBadges?.map((b: any) => b.badge_id) || []);

  // Get updated participant stats
  const { data: updatedParticipant } = await supabase
    .from('study_pod_challenge_participants')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .single();

  // Get user's overall stats
  const { data: allParticipations } = await supabase
    .from('study_pod_challenge_participants')
    .select('total_points, problems_solved, status')
    .eq('user_id', userId);

  const totalChallengesCompleted = allParticipations?.filter((p: any) => p.status === 'completed').length || 0;
  const totalProblemsSolved = allParticipations?.reduce((sum: number, p: any) => sum + (p.problems_solved || 0), 0) || 0;
  const totalPoints = allParticipations?.reduce((sum: number, p: any) => sum + (p.total_points || 0), 0) || 0;

  const badgesToAward: any[] = [];

  for (const badge of allBadges) {
    if (existingBadgeIds.has(badge.id)) continue;

    let earned = false;

    switch (badge.name) {
      case 'clean_sweep':
        earned = updatedParticipant?.problems_solved === challenge.total_problems;
        break;

      case 'speed_demon':
        earned = submission.speed_bonus >= (challenge.point_config?.max_speed_bonus || 50);
        break;

      case 'efficiency_expert':
        earned = submission.efficiency_bonus >= (challenge.point_config?.max_efficiency_bonus || 30);
        break;

      case 'optimized':
        const totalBonuses = (updatedParticipant?.speed_bonus_earned || 0) + (updatedParticipant?.efficiency_bonus_earned || 0);
        earned = totalBonuses >= 100;
        break;

      case 'first_challenge':
        earned = totalChallengesCompleted >= 1 && updatedParticipant?.status === 'completed';
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
    }

    if (earned) {
      badgesToAward.push({
        user_id: userId,
        badge_id: badge.id,
        challenge_id: challengeId,
        pod_id: challenge.pod_id,
        metadata: {
          submission_id: submission.id,
          points_at_award: updatedParticipant?.total_points,
        },
      });
    }
  }

  // Award badges
  if (badgesToAward.length > 0) {
    await supabase
      .from('user_challenge_badges')
      .insert(badgesToAward);
  }

  // Return awarded badge details
  const awardedBadgeIds = badgesToAward.map(b => b.badge_id);
  return allBadges.filter((b: any) => awardedBadgeIds.includes(b.id));
}
