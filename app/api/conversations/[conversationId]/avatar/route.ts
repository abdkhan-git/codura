import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createClient();
    const { conversationId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a participant in this conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const { avatar_url } = await request.json();

    // Update the conversation avatar
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ avatar_url })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating conversation avatar:', updateError);
      return NextResponse.json(
        { error: 'Failed to update conversation avatar' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in update conversation avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
