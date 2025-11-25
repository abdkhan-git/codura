import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/challenges/[challengeId]/leaderboard
 * Get the leaderboard for a challenge with participant rankings
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

    // Get challenge details to verify access
    const { data: challenge, error: challengeError } = await supabase
      .from('study_pod_challenges')
      .select('pod_id')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this pod
    const { data: membership } = await supabase
      .from('study_pod_members')
      .select('id')
      .eq('pod_id', challenge.pod_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have access to this challenge' },
        { status: 403 }
      );
    }

    // Get all participants with rankings
    const { data: participants, error: participantsError } = await supabase
      .from('study_pod_challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('total_points', { ascending: false })
      .order('problems_solved', { ascending: false })
      .order('registered_at', { ascending: true });

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json({
        leaderboard: [],
        total: 0,
      });
    }

    // Get user details for all participants
    const userIds = participants.map(p => p.user_id);
    const { data: users } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .in('user_id', userIds);

    const userDetails: Record<string, any> = {};
    users?.forEach(u => {
      userDetails[u.user_id] = u;
    });

    // Enrich participants with user details
    const leaderboard = participants.map(participant => ({
      ...participant,
      user: userDetails[participant.user_id] || {
        username: 'Unknown',
        full_name: 'Unknown User',
        avatar_url: '',
      },
    }));

    return NextResponse.json({
      leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error('Unexpected error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
