import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/messages/search
 * Search for messages across conversations
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'messages'; // 'messages' or 'conversations'
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (type === 'conversations') {
      // Search conversations by message content
      const { data: conversations, error: conversationsError } = await supabase
        .rpc('search_conversations_by_content', {
          search_query: query.trim(),
          user_id: user.id,
          limit_count: limit
        });

      if (conversationsError) {
        console.error('Error searching conversations:', conversationsError);
        return NextResponse.json({ error: 'Failed to search conversations' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        type: 'conversations',
        query: query.trim(),
        results: conversations || []
      });
    } else {
      // Search messages within conversations
      const { data: messages, error: messagesError } = await supabase
        .rpc('search_messages_in_conversations', {
          search_query: query.trim(),
          user_id: user.id,
          limit_count: limit
        });

      if (messagesError) {
        console.error('Error searching messages:', messagesError);
        return NextResponse.json({ error: 'Failed to search messages' }, { status: 500 });
      }

      // Group messages by conversation for better organization
      const groupedResults = (messages || []).reduce((acc: any, message: any) => {
        const conversationId = message.conversation_id;
        if (!acc[conversationId]) {
          acc[conversationId] = {
            conversation_id: conversationId,
            conversation_name: message.conversation_name,
            messages: []
          };
        }
        acc[conversationId].messages.push({
          id: message.message_id,
          sender_id: message.sender_id,
          sender_name: message.sender_name,
          content: message.content,
          created_at: message.created_at,
          rank: message.rank
        });
        return acc;
      }, {});

      return NextResponse.json({
        success: true,
        type: 'messages',
        query: query.trim(),
        results: Object.values(groupedResults)
      });
    }

  } catch (error) {
    console.error('Error in /api/messages/search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}