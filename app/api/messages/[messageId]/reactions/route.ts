import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    // Use regular client for auth
    const supabase = await createClient();

    // Use service role client for database queries (bypasses RLS)
    const supabaseService = createServiceClient();

    const { messageId } = params;
    const { emoji } = await request.json();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the message to verify the user is a participant in the conversation
    const { data: message, error: messageError } = await supabaseService
      .from('messages')
      .select(`
        id,
        conversation_id,
        reactions
      `)
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user is a participant in the conversation
    const { data: participant, error: participantError } = await supabaseService
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Not a participant in this conversation' }, { status: 403 });
    }

    // Get current reactions
    const currentReactions = message.reactions || {};
    const userReactions = currentReactions[user.id] || [];

    // Toggle reaction
    let updatedUserReactions;
    if (userReactions.includes(emoji)) {
      // Remove reaction
      updatedUserReactions = userReactions.filter((e: string) => e !== emoji);
    } else {
      // Add reaction
      updatedUserReactions = [...userReactions, emoji];
    }

    // Update reactions
    const updatedReactions = {
      ...currentReactions,
      [user.id]: updatedUserReactions
    };

    const { error: updateError } = await supabaseService
      .from('messages')
      .update({ reactions: updatedReactions })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error updating message reactions:', updateError);
      return NextResponse.json({ error: 'Failed to update reactions' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reactions: updatedReactions });
  } catch (error) {
    console.error('Error in message reactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
