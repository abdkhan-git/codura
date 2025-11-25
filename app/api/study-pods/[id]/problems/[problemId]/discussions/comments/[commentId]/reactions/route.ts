import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Params = { id: string; problemId: string; commentId: string };

const VALID_REACTIONS = ['thumbs_up', 'thumbs_down', 'heart', 'rocket', 'eyes', 'tada', 'thinking', 'fire'];

/**
 * GET /api/study-pods/[id]/problems/[problemId]/discussions/comments/[commentId]/reactions
 * Get all reactions for a comment
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

    // Get reactions for the comment
    const { data: reactions, error: reactionsError } = await supabase
      .from('thread_reactions')
      .select('id, reaction, user_id')
      .eq('comment_id', commentId);

    if (reactionsError) {
      console.error('Error fetching reactions:', reactionsError);
      return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
    }

    // Get unique user IDs and fetch their details separately
    const userIds = [...new Set(reactions?.map(r => r.user_id) || [])];
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

    // Group reactions by type and count with user details
    const reactionCounts: Record<string, {
      count: number;
      users: Array<{ id: string; name: string; avatar?: string }>;
      userReacted: boolean
    }> = {};

    reactions?.forEach((r: any) => {
      if (!reactionCounts[r.reaction]) {
        reactionCounts[r.reaction] = { count: 0, users: [], userReacted: false };
      }
      reactionCounts[r.reaction].count++;
      const userInfo = userDetails[r.user_id];
      reactionCounts[r.reaction].users.push({
        id: r.user_id,
        name: userInfo?.full_name || userInfo?.username || 'Anonymous',
        avatar: userInfo?.avatar_url,
      });
      if (r.user_id === user.id) {
        reactionCounts[r.reaction].userReacted = true;
      }
    });

    return NextResponse.json({ reactions: reactionCounts });
  } catch (error) {
    console.error('Unexpected error fetching reactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/study-pods/[id]/problems/[problemId]/discussions/comments/[commentId]/reactions
 * Toggle a reaction on a comment
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

    // Validate reaction type
    const { reaction } = body;
    if (!reaction || !VALID_REACTIONS.includes(reaction)) {
      return NextResponse.json(
        { error: `Invalid reaction. Must be one of: ${VALID_REACTIONS.join(', ')}` },
        { status: 400 }
      );
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
        { error: 'You must be a pod member to react' },
        { status: 403 }
      );
    }

    // Check if user already has this reaction
    const { data: existingReaction } = await supabase
      .from('thread_reactions')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .eq('reaction', reaction)
      .single();

    if (existingReaction) {
      // Remove reaction (toggle off)
      await supabase
        .from('thread_reactions')
        .delete()
        .eq('id', existingReaction.id);

      return NextResponse.json({
        action: 'removed',
        reaction,
        message: 'Reaction removed',
      });
    }

    // Add reaction
    await supabase
      .from('thread_reactions')
      .insert({
        comment_id: commentId,
        user_id: user.id,
        reaction,
      });

    return NextResponse.json({
      action: 'added',
      reaction,
      message: 'Reaction added',
    });
  } catch (error) {
    console.error('Unexpected error toggling reaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
