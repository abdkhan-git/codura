import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const supabase = await createClient();
    const supabaseService = createServiceClient();
    const { messageId } = await params;

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if this is a temporary message ID (optimistic update)
    if (messageId.startsWith('temp-') || messageId.includes('temp')) {
      return NextResponse.json({ success: true, message: 'Temporary message, no action needed' });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(messageId)) {
      return NextResponse.json({ error: 'Invalid message ID format' }, { status: 400 });
    }

    // Use service client to bypass RLS and check message + authorization
    const { data: message, error: messageError } = await supabaseService
      .from('messages')
      .select('id, sender_id, conversation_id')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      console.error('Message not found:', messageError);
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user is a participant in the conversation
    const { data: participant, error: participantError } = await supabaseService
      .from('conversation_participants')
      .select('user_id, status')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (participantError || !participant) {
      console.error('User not authorized to access this conversation:', participantError);
      return NextResponse.json({ error: 'User not authorized' }, { status: 403 });
    }

    // Don't mark own messages as read
    if (message.sender_id === user.id) {
      return NextResponse.json({ success: true, message: 'Own message, no action needed' });
    }

    // Insert or update read receipt using service client
    const { error: receiptError } = await supabaseService
      .from('message_read_receipts')
      .upsert({
        message_id: messageId,
        user_id: user.id,
        read_at: new Date().toISOString()
      }, {
        onConflict: 'message_id,user_id'
      });

    if (receiptError) {
      console.error('Error creating read receipt:', receiptError);
      return NextResponse.json({ error: 'Failed to mark message as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in mark message as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
