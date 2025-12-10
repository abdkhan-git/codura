import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/study-pods/challenges/[challengeId]/join
 * Join a challenge
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
      .select('pod_id, status, start_time, end_time, max_participants, current_participants')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    // Check if user is a pod member
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('id')
      .eq('pod_id', challenge.pod_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'You must be a pod member to join this challenge' },
        { status: 403 }
      );
    }

    // Check if challenge has ended
    if (new Date(challenge.end_time) < new Date()) {
      return NextResponse.json(
        { error: 'This challenge has ended' },
        { status: 400 }
      );
    }

    // Check if challenge is full
    if (challenge.max_participants && challenge.current_participants >= challenge.max_participants) {
      return NextResponse.json(
        { error: 'This challenge is full' },
        { status: 400 }
      );
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from('study_pod_challenge_participants')
      .select('id, status')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'You have already joined this challenge' },
        { status: 400 }
      );
    }

    // Determine initial status based on challenge timing
    const now = new Date();
    const startTime = new Date(challenge.start_time);
    const initialStatus = now >= startTime ? 'in_progress' : 'registered';

    // Join challenge
    const { data: participant, error: insertError } = await supabase
      .from('study_pod_challenge_participants')
      .insert({
        challenge_id: challengeId,
        user_id: user.id,
        status: initialStatus,
        started_at: initialStatus === 'in_progress' ? now.toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error joining challenge:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to join challenge' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      participant,
      message: 'Successfully joined the challenge!',
    });
  } catch (error) {
    console.error('Unexpected error joining challenge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
