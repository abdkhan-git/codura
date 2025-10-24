import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const supabase = await createClient();
    const { conversationId } = params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is a participant in the conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Not a participant in this conversation' }, { status: 403 });
    }

    // Update the conversation to archive it
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ is_archived: true })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error archiving conversation:', updateError);
      return NextResponse.json({ error: 'Failed to archive conversation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in archive API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}