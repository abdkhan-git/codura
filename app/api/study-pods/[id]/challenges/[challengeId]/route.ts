import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/study-pods/[id]/challenges/[challengeId]
 * Get challenge details with leaderboard
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; challengeId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, challengeId } = await params;

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
        { error: 'You must be a pod member to view challenge details' },
        { status: 403 }
      );
    }

    // Get challenge details
    const { data: challenge, error: challengeError } = await supabase
      .from('study_pod_challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('pod_id', podId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    // Get creator details
    const { data: creator } = await supabase
      .from('users')
      .select('user_id, username, full_name, avatar_url')
      .eq('user_id', challenge.created_by)
      .single();

    challenge.creator = creator;

    // Get leaderboard
    const { data: participants } = await supabase
      .from('study_pod_challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('total_points', { ascending: false })
      .order('completed_at', { ascending: true });

    // Get user details for participants
    const participantIds = participants?.map(p => p.user_id) || [];
    let participantDetails: Record<string, any> = {};

    if (participantIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', participantIds);

      users?.forEach(u => {
        participantDetails[u.user_id] = u;
      });
    }

    // Enrich participants with user details and calculate ranks
    const enrichedParticipants = participants?.map((p, index) => ({
      ...p,
      user: participantDetails[p.user_id] || null,
      rank: index + 1,
    })) || [];

    // Get problem details
    let problemDetails = [];
    if (challenge.problem_ids && challenge.problem_ids.length > 0) {
      const { data: problems } = await supabase
        .from('problems')
        .select('id, leetcode_id, title, title_slug, difficulty')
        .in('id', challenge.problem_ids);

      problemDetails = problems || [];
    }

    // Get user's participation
    const userParticipation = enrichedParticipants.find(p => p.user_id === user.id);

    // Get user's submissions
    let userSubmissions = [];
    if (userParticipation) {
      const { data: submissions } = await supabase
        .from('study_pod_challenge_submissions')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id);

      userSubmissions = submissions || [];
    }

    return NextResponse.json({
      challenge: {
        ...challenge,
        leaderboard: enrichedParticipants,
        problems: problemDetails,
        user_participation: userParticipation || null,
        user_submissions: userSubmissions,
      },
    });
  } catch (error) {
    console.error('Unexpected error fetching challenge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/study-pods/[id]/challenges/[challengeId]
 * Update challenge details (only by creator, owner, or moderator)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; challengeId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, challengeId } = await params;
    const body = await request.json();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get challenge to check ownership and status
    const { data: challenge, error: challengeError } = await supabase
      .from('study_pod_challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('pod_id', podId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    // Check if user is creator, owner, or moderator
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const isCreator = challenge.created_by === user.id;
    const isAdmin = member?.role === 'owner' || member?.role === 'moderator';

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Only the challenge creator or pod admins can edit challenges' },
        { status: 403 }
      );
    }

    // Build update object with allowed fields
    const allowedUpdates: Record<string, any> = {};

    // Title and description can always be updated
    if (body.title !== undefined) {
      allowedUpdates.title = body.title;
    }
    if (body.description !== undefined) {
      allowedUpdates.description = body.description;
    }

    // Time can only be extended (not shortened if challenge has started)
    const now = new Date();
    const startTime = new Date(challenge.start_time);
    const hasStarted = now >= startTime;

    if (body.start_time !== undefined && !hasStarted) {
      // Can only change start time if challenge hasn't started
      const newStartTime = new Date(body.start_time);
      if (newStartTime > now) {
        allowedUpdates.start_time = newStartTime.toISOString();
      }
    }

    if (body.end_time !== undefined) {
      const newEndTime = new Date(body.end_time);
      const currentEndTime = new Date(challenge.end_time);

      // Can extend end time, or reduce if challenge hasn't started
      if (!hasStarted || newEndTime > currentEndTime) {
        allowedUpdates.end_time = newEndTime.toISOString();

        // Recalculate duration
        const start = new Date(allowedUpdates.start_time || challenge.start_time);
        allowedUpdates.duration_minutes = Math.round((newEndTime.getTime() - start.getTime()) / 60000);
      }
    }

    // Problems can be added (but not removed if challenge has started and has submissions)
    if (body.problem_ids !== undefined) {
      if (!hasStarted) {
        // Before start: can change problems freely
        allowedUpdates.problem_ids = body.problem_ids;
        allowedUpdates.total_problems = body.problem_ids.length;
      } else {
        // After start: can only add new problems
        const existingIds = challenge.problem_ids || [];
        const newIds = body.problem_ids.filter((id: number) => !existingIds.includes(id));

        if (newIds.length > 0) {
          allowedUpdates.problem_ids = [...existingIds, ...newIds];
          allowedUpdates.total_problems = allowedUpdates.problem_ids.length;
        }
      }
    }

    // Point config can be updated if challenge hasn't started
    if (body.point_config !== undefined && !hasStarted) {
      allowedUpdates.point_config = body.point_config;
    }

    // Max participants can be increased
    if (body.max_participants !== undefined) {
      if (body.max_participants === null || body.max_participants > (challenge.max_participants || 0)) {
        allowedUpdates.max_participants = body.max_participants;
      }
    }

    // Rules can be updated
    if (body.rules !== undefined) {
      allowedUpdates.rules = body.rules;
    }

    // Status can be changed (e.g., cancel)
    if (body.status !== undefined) {
      const allowedStatuses = ['upcoming', 'active', 'cancelled'];
      if (allowedStatuses.includes(body.status)) {
        // Can't revert from completed
        if (challenge.status !== 'completed') {
          allowedUpdates.status = body.status;
        }
      }
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    // Perform the update
    const { data: updatedChallenge, error: updateError } = await supabase
      .from('study_pod_challenges')
      .update(allowedUpdates)
      .eq('id', challengeId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating challenge:', updateError);
      return NextResponse.json(
        { error: 'Failed to update challenge' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('study_pod_activities').insert({
      pod_id: podId,
      user_id: user.id,
      activity_type: 'challenge_updated',
      title: `Challenge updated: ${updatedChallenge.title}`,
      metadata: { challenge_id: challengeId, updates: Object.keys(allowedUpdates) },
    });

    return NextResponse.json({
      challenge: updatedChallenge,
      message: 'Challenge updated successfully',
    });
  } catch (error) {
    console.error('Unexpected error updating challenge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/study-pods/[id]/challenges/[challengeId]
 * Delete a challenge (only if not started, by creator/admin)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; challengeId: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, challengeId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('study_pod_challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('pod_id', podId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    // Check if user is creator or admin
    const { data: member } = await supabase
      .from('study_pod_members')
      .select('role')
      .eq('pod_id', podId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    const isCreator = challenge.created_by === user.id;
    const isAdmin = member?.role === 'owner' || member?.role === 'moderator';

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Only the challenge creator or pod admins can delete challenges' },
        { status: 403 }
      );
    }

    // Check if challenge has started
    const now = new Date();
    const startTime = new Date(challenge.start_time);

    if (now >= startTime && challenge.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot delete a challenge that has already started. Cancel it instead.' },
        { status: 400 }
      );
    }

    // Delete the challenge (cascades to participants and submissions)
    const { error: deleteError } = await supabase
      .from('study_pod_challenges')
      .delete()
      .eq('id', challengeId);

    if (deleteError) {
      console.error('Error deleting challenge:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete challenge' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('study_pod_activities').insert({
      pod_id: podId,
      user_id: user.id,
      activity_type: 'challenge_deleted',
      title: `Challenge deleted: ${challenge.title}`,
      metadata: { challenge_id: challengeId },
    });

    return NextResponse.json({
      message: 'Challenge deleted successfully',
    });
  } catch (error) {
    console.error('Unexpected error deleting challenge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
