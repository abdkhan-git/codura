import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const supabase = await createClient();
    const { messageId } = params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is the sender of the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('sender_id, created_at')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.sender_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to edit this message' }, { status: 403 });
    }

    // Check if message is within edit time limit (5 minutes)
    const messageTime = new Date(message.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - messageTime.getTime();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (timeDiff > fiveMinutes) {
      return NextResponse.json({ error: 'Message is too old to edit' }, { status: 400 });
    }

    // Update the message
    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
        is_edited: true
      })
      .eq('id', messageId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating message:', updateError);
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: updatedMessage
    });

  } catch (error) {
    console.error('Error in message update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}