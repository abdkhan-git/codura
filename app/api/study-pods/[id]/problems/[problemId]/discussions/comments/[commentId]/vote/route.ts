import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Params = { id: string; problemId: string; commentId: string };

/**
 * GET /api/study-pods/[id]/problems/[problemId]/discussions/comments/[commentId]/vote
 * Get who has voted on this comment
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, commentId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all votes for this comment
    const { data: votes, error: votesError } = await supabase
      .from('thread_votes')
      .select('user_id, vote_type')
      .eq('comment_id', commentId);

    if (votesError) {
      console.error('Error fetching votes:', votesError);
      return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
    }

    // Get user details for voters
    const userIds = [...new Set(votes?.map(v => v.user_id) || [])];
    let userDetails: Record<string, { username: string; full_name: string; avatar_url: string }> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', userIds);

      users?.forEach(u => {
        userDetails[u.user_id] = u;
      });
    }

    // Group votes by type
    const upvoters: Array<{ id: string; name: string; avatar?: string }> = [];
    const downvoters: Array<{ id: string; name: string; avatar?: string }> = [];

    votes?.forEach(v => {
      const userInfo = userDetails[v.user_id];
      const voter = {
        id: v.user_id,
        name: userInfo?.full_name || userInfo?.username || 'Anonymous',
        avatar: userInfo?.avatar_url,
      };

      if (v.vote_type === 1) {
        upvoters.push(voter);
      } else if (v.vote_type === -1) {
        downvoters.push(voter);
      }
    });

    return NextResponse.json({
      upvoters,
      downvoters,
      userVote: votes?.find(v => v.user_id === user.id)?.vote_type || null,
    });
  } catch (error) {
    console.error('Unexpected error fetching votes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/study-pods/[id]/problems/[problemId]/discussions/comments/[commentId]/vote
 * Vote on a comment (upvote or downvote)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const supabase = await createClient();
    const { id: podId, commentId } = await params;
    const body = await request.json();

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
        { error: 'You must be a pod member to vote' },
        { status: 403 }
      );
    }

    // Validate vote type
    const voteType = body.vote_type;
    if (voteType !== 1 && voteType !== -1) {
      return NextResponse.json(
        { error: 'Invalid vote type. Must be 1 (upvote) or -1 (downvote)' },
        { status: 400 }
      );
    }

    // Check if comment exists
    const { data: comment } = await supabase
      .from('thread_comments')
      .select('id, user_id')
      .eq('id', commentId)
      .single();

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Can't vote on your own comment
    if (comment.user_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot vote on your own comment' },
        { status: 400 }
      );
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('thread_votes')
      .select('id, vote_type')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single();

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Same vote, remove it (toggle off)
        await supabase
          .from('thread_votes')
          .delete()
          .eq('id', existingVote.id);

        // Get updated comment
        const { data: updatedComment } = await supabase
          .from('thread_comments')
          .select('upvotes, downvotes')
          .eq('id', commentId)
          .single();

        return NextResponse.json({
          vote: null,
          upvotes: updatedComment?.upvotes || 0,
          downvotes: updatedComment?.downvotes || 0,
          message: 'Vote removed',
        });
      } else {
        // Different vote, update it
        await supabase
          .from('thread_votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);

        // Get updated comment
        const { data: updatedComment } = await supabase
          .from('thread_comments')
          .select('upvotes, downvotes')
          .eq('id', commentId)
          .single();

        return NextResponse.json({
          vote: voteType,
          upvotes: updatedComment?.upvotes || 0,
          downvotes: updatedComment?.downvotes || 0,
          message: voteType === 1 ? 'Changed to upvote' : 'Changed to downvote',
        });
      }
    }

    // Create new vote
    await supabase
      .from('thread_votes')
      .insert({
        comment_id: commentId,
        user_id: user.id,
        vote_type: voteType,
      });

    // Get updated comment
    const { data: updatedComment } = await supabase
      .from('thread_comments')
      .select('upvotes, downvotes')
      .eq('id', commentId)
      .single();

    return NextResponse.json({
      vote: voteType,
      upvotes: updatedComment?.upvotes || 0,
      downvotes: updatedComment?.downvotes || 0,
      message: voteType === 1 ? 'Upvoted' : 'Downvoted',
    });
  } catch (error) {
    console.error('Unexpected error voting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
