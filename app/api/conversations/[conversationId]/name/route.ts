import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const supabase = await createClient();
    const { conversationId } = params;
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin/owner of the conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Not a participant in this conversation' }, { status: 403 });
    }

    if (!['owner', 'admin'].includes(participant.role)) {
      return NextResponse.json({ error: 'Not authorized to change group name' }, { status: 403 });
    }

    // Update conversation name
    const { data: updatedConversation, error: updateError } = await supabase
      .from('conversations')
      .update({
        name: name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating conversation name:', updateError);
      return NextResponse.json({ error: 'Failed to update group name' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      conversation: updatedConversation
    });

  } catch (error) {
    console.error('Error in update group name:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
