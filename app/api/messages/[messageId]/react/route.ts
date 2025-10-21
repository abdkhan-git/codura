import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/messages/[messageId]/react
 * Add or remove a reaction to/from a message
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const supabase = await createClient();
    const { messageId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emoji } = body;

    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json(
        { error: 'emoji is required and must be a string' },
        { status: 400 }
      );
    }

    // Get the message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('id, conversation_id, reactions')
      .eq('id', messageId)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify user is a participant
    const { data: participation } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!participation) {
      return NextResponse.json(
        { error: 'You are not a participant in this conversation' },
        { status: 403 }
      );
    }

    // Update reactions
    const currentReactions = (message.reactions || {}) as Record<string, string[]>;
    const reactionUsersList = currentReactions[emoji] || [];

    let updatedReactions: Record<string, string[]>;
    let action: 'added' | 'removed';

    if (reactionUsersList.includes(user.id)) {
      // Remove reaction
      updatedReactions = {
        ...currentReactions,
        [emoji]: reactionUsersList.filter(id => id !== user.id)
      };
      // Remove emoji key if no users left
      if (updatedReactions[emoji].length === 0) {
        delete updatedReactions[emoji];
      }
      action = 'removed';
    } else {
      // Add reaction
      updatedReactions = {
        ...currentReactions,
        [emoji]: [...reactionUsersList, user.id]
      };
      action = 'added';
    }

    // Update the message
    const { error: updateError } = await supabase
      .from('messages')
      .update({ reactions: updatedReactions })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error updating message reactions:', updateError);
      return NextResponse.json(
        { error: 'Failed to update reaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action,
      reactions: updatedReactions
    });

  } catch (error) {
    console.error('Error in POST /api/messages/[messageId]/react:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
