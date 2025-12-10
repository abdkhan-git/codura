import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/my-challenges
 * Get challenges for the current user across all their pods
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, active, upcoming, completed
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's pod memberships
    const { data: memberships } = await supabase
      .from('study_pod_members')
      .select('pod_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({
        challenges: [],
        total: 0,
      });
    }

    const podIds = memberships.map(m => m.pod_id);

    // Build query
    let query = supabase
      .from('study_pod_challenges')
      .select('*')
      .in('pod_id', podIds);

    const now = new Date().toISOString();

    // Apply filters
    if (filter === 'active') {
      query = query
        .lte('start_time', now)
        .gte('end_time', now);
    } else if (filter === 'upcoming') {
      query = query.gt('start_time', now);
    } else if (filter === 'completed') {
      query = query.lt('end_time', now);
    }

    query = query
      .order('start_time', { ascending: filter === 'upcoming' })
      .limit(limit);

    const { data: challenges, error: challengesError } = await query;

    if (challengesError) {
      console.error('Error fetching challenges:', challengesError);
      return NextResponse.json(
        { error: 'Failed to fetch challenges' },
        { status: 500 }
      );
    }

    if (!challenges || challenges.length === 0) {
      return NextResponse.json({
        challenges: [],
        total: 0,
      });
    }

    // Get pod details
    const uniquePodIds = [...new Set(challenges.map(c => c.pod_id))];
    const { data: pods } = await supabase
      .from('study_pods')
      .select('id, name, color_scheme')
      .in('id', uniquePodIds);

    const podDetails: Record<string, any> = {};
    pods?.forEach(pod => {
      podDetails[pod.id] = pod;
    });

    // Get user's participation status for each challenge
    const challengeIds = challenges.map(c => c.id);
    const { data: participationData } = await supabase
      .from('study_pod_challenge_participants')
      .select('challenge_id, status, total_points, problems_solved, current_rank')
      .in('challenge_id', challengeIds)
      .eq('user_id', user.id);

    const userParticipation: Record<string, any> = {};
    participationData?.forEach(p => {
      userParticipation[p.challenge_id] = p;
    });

    // Enrich challenges with all details
    const enrichedChallenges = challenges.map(challenge => ({
      ...challenge,
      pod: podDetails[challenge.pod_id] || null,
      user_participation: userParticipation[challenge.id] || null,
    }));

    return NextResponse.json({
      challenges: enrichedChallenges,
      total: enrichedChallenges.length,
    });
  } catch (error) {
    console.error('Unexpected error fetching my challenges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
