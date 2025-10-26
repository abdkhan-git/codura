import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/messages/mark-read
 * Mark messages as read for the current user
 */
export async function POST(request: Request) {
  try {
    // Use regular client for auth
    const supabase = await createClient();

    // Use service role client for database queries (bypasses RLS)
    const supabaseService = createServiceClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversation_id, message_ids } = body;

    if (!conversation_id) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      );
    }

    // Verify user is a participant in the conversation
    const { data: participation } = await supabaseService
      .from('conversation_participants')
      .select('role, status')
      .eq('conversation_id', conversation_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!participation) {
      return NextResponse.json(
        { error: 'You are not a participant in this conversation' },
        { status: 403 }
      );
    }

    // If specific message IDs provided, mark those as read
    if (message_ids && Array.isArray(message_ids) && message_ids.length > 0) {
      const { error: receiptsError } = await supabaseService
        .from('message_read_receipts')
        .upsert(
          message_ids.map(messageId => ({
            message_id: messageId,
            user_id: user.id,
            read_at: new Date().toISOString()
          })),
          { onConflict: 'message_id,user_id' }
        );

      if (receiptsError) {
        console.error('Error creating read receipts:', receiptsError);
        return NextResponse.json(
          { error: 'Failed to mark messages as read' },
          { status: 500 }
        );
      }
    } else {
      // Mark all unread messages in the conversation as read
      const { data: unreadMessages } = await supabaseService
        .from('messages')
        .select('id')
        .eq('conversation_id', conversation_id)
        .eq('is_deleted', false)
        .not('sender_id', 'eq', user.id)
        .not('id', 'in', `(SELECT message_id FROM message_read_receipts WHERE user_id = '${user.id}')`);

      if (unreadMessages && unreadMessages.length > 0) {
        const { error: receiptsError } = await supabaseService
          .from('message_read_receipts')
          .upsert(
            unreadMessages.map(msg => ({
              message_id: msg.id,
              user_id: user.id,
              read_at: new Date().toISOString()
            })),
            { onConflict: 'message_id,user_id' }
          );

        if (receiptsError) {
          console.error('Error creating read receipts:', receiptsError);
          return NextResponse.json(
            { error: 'Failed to mark messages as read' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('Error in /api/messages/mark-read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


