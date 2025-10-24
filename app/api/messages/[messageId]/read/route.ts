import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

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

    // Check if this is a temporary message ID (optimistic update)
    if (messageId.startsWith('temp-') || messageId.includes('temp')) {
      return NextResponse.json({ success: true, message: 'Temporary message, no action needed' });
    }

    // Use the database function to mark message as read
    const { data, error } = await supabase.rpc('mark_message_as_read', {
      p_message_id: messageId,
      p_user_id: user.id
    });

    if (error) {
      console.error('Error marking message as read:', error);
      return NextResponse.json({ error: 'Failed to mark message as read' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Message not found or user not authorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in mark message as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
