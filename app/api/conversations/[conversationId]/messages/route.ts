import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/messages/[conversationId]
 * Get messages for a conversation with pagination
 */
export async function GET(
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

    // Verify user is a participant in the conversation
    const { data: participation } = await supabase
      .from('conversation_participants')
      .select('role, status')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!participation) {
      return NextResponse.json(
        { error: 'You are not a participant in this conversation' },
        { status: 403 }
      );
    }

    // Get URL parameters for pagination
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const before = url.searchParams.get('before'); // Message ID to fetch messages before

    // Build query - fetch messages first
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Add pagination
    if (before) {
      query = query.lt('id', before);
    } else if (offset > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: messagesError.message },
        { status: 500 }
      );
    }

    // Get sender info from public.users table separately
    const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
    const { data: senders } = await supabase
      .from('users')
      .select('user_id, full_name, username, avatar_url')
      .in('user_id', senderIds);

    // Get read receipts for these messages
    const messageIds = messages?.map(m => m.id) || [];
    const { data: readReceipts } = await supabase
      .from('message_read_receipts')
      .select('message_id, user_id, read_at')
      .in('message_id', messageIds);

    // Process messages with sender info
    const processedMessages = messages?.map(message => {
      const sender = senders?.find(s => s.user_id === message.sender_id);
      return {
        id: message.id,
        content: message.content,
        sender_id: message.sender_id,
        created_at: message.created_at,
        message_type: message.message_type,
        attachments: message.attachments,
        reply_to_message_id: message.reply_to_message_id,
        is_edited: message.is_edited,
        edited_at: message.edited_at,
        reactions: message.reactions,
        metadata: message.metadata,
        sender: {
          user_id: message.sender_id,
          full_name: sender?.full_name || 'Unknown',
          username: sender?.username || '',
          avatar_url: sender?.avatar_url || null
        },
        read_by: readReceipts
          ?.filter(rr => rr.message_id === message.id)
          ?.map(rr => rr.user_id) || []
      };
    }) || [];

    // Mark messages as read for current user
    if (processedMessages.length > 0) {
      const unreadMessageIds = processedMessages
        .filter(m => m.sender_id !== user.id && !m.read_by.includes(user.id))
        .map(m => m.id);

      if (unreadMessageIds.length > 0) {
        await supabase
          .from('message_read_receipts')
          .upsert(
            unreadMessageIds.map(messageId => ({
              message_id: messageId,
              user_id: user.id,
              read_at: new Date().toISOString()
            })),
            { onConflict: 'message_id,user_id' }
          );
      }
    }

    return NextResponse.json({
      messages: processedMessages.reverse(), // Return in chronological order
      has_more: messages?.length === limit,
      total_count: processedMessages.length
    });

  } catch (error) {
    console.error('Error in /api/messages/[conversationId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
