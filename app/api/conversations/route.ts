import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations
 * Get user's conversations with last message and participant info
 */
export async function GET(request: Request) {
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

    // First get conversation IDs where user is a participant
    const { data: userConversations, error: userConversationsError } = await supabaseService
      .from('conversation_participants')
      .select('conversation_id, is_pinned')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (userConversationsError || !userConversations || userConversations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const conversationIds = userConversations.map(uc => uc.conversation_id);

    // Get conversations in parallel with other data
    const [
      { data: conversations, error: conversationsError },
      { data: lastMessages },
      { data: participants },
      { data: allMessagesForUnread }
    ] = await Promise.all([
      supabaseService
        .from('conversations')
        .select(`
          id,
          name,
          type,
          is_archived,
          updated_at,
          last_message_at,
          created_by
        `)
        .in('id', conversationIds)
        .order('updated_at', { ascending: false }),
      supabaseService
        .from('messages')
        .select(`
          conversation_id,
          content,
          created_at,
          message_type,
          sender_id
        `)
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
        .limit(1),
      supabaseService
        .from('conversation_participants')
        .select(`
          conversation_id,
          user_id,
          role
        `)
        .in('conversation_id', conversationIds)
        .eq('status', 'active')
        .order('joined_at', { ascending: true }),
      supabaseService
        .from('messages')
        .select('id, conversation_id, sender_id')
        .in('conversation_id', conversationIds)
        .eq('is_deleted', false)
    ]);

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    // Get user data for participants and message senders
    const allUserIds = [
      ...new Set([
        ...participants?.map(p => p.user_id) || [],
        ...lastMessages?.map(m => m.sender_id) || []
      ])
    ];

    const { data: users } = await supabaseService
      .from('users')
      .select(`
        user_id,
        full_name,
        username,
        avatar_url
      `)
      .in('user_id', allUserIds);

    // Get read receipts for current user
    const messageIdsForUnread = allMessagesForUnread?.map(m => m.id) || [];
    const { data: userReadReceipts } = await supabaseService
      .from('message_read_receipts')
      .select('message_id')
      .eq('user_id', user.id)
      .in('message_id', messageIdsForUnread);

    const readMessageIds = new Set(userReadReceipts?.map(r => r.message_id) || []);

    // Process and format the data
    const processedConversations = conversations.map(conversation => {
      const lastMessage = lastMessages?.find(m => m.conversation_id === conversation.id);
      const conversationParticipants = participants?.filter(p => p.conversation_id === conversation.id) || [];
      const userConv = userConversations.find(uc => uc.conversation_id === conversation.id);

      // Calculate unread count - messages in this conversation that are:
      // 1. Not sent by current user
      // 2. Not in the read receipts
      const conversationMessages = allMessagesForUnread?.filter(m =>
        m.conversation_id === conversation.id &&
        m.sender_id !== user.id
      ) || [];

      const unreadCount = conversationMessages.filter(m => !readMessageIds.has(m.id)).length;

      // Get sender info for last message
      const senderInfo = lastMessage ? users?.find(u => u.user_id === lastMessage.sender_id) : null;

      // Generate proper conversation name
      let conversationName = conversation.name;
      
      // Override generic names for direct messages
      if (conversation.type === 'direct') {
        const otherParticipant = conversationParticipants.find(p => p.user_id !== user.id);
        if (otherParticipant) {
          const otherUser = users?.find(u => u.user_id === otherParticipant.user_id);
          // Override if no name, or if it's a generic name like "Chat with X people"
          if (!conversationName || 
              conversationName.includes('Chat with') || 
              conversationName.includes('people') ||
              conversationName === 'Unknown') {
            conversationName = otherUser?.full_name || otherUser?.username || 'Unknown';
          }
        }
      } else if (conversation.type === 'group') {
        // For group chats, only override if no name or generic name
        if (!conversationName || conversationName.includes('Chat with')) {
          const participantCount = conversationParticipants.length;
          conversationName = `Group Chat (${participantCount} members)`;
        }
      }

      return {
        id: conversation.id,
        name: conversationName,
        type: conversation.type,
        is_pinned: userConv?.is_pinned || false,
        is_archived: conversation.is_archived,
        updated_at: conversation.updated_at,
        last_message: lastMessage ? {
          content: lastMessage.content,
          sender_name: senderInfo?.full_name || senderInfo?.username || 'Unknown',
          created_at: lastMessage.created_at,
          message_type: lastMessage.message_type
        } : null,
        participants: conversationParticipants
          .filter(p => conversation.type === 'direct' ? p.user_id !== user.id : true) // Only exclude current user for direct messages
          .map(p => {
            const userInfo = users?.find(u => u.user_id === p.user_id);
            return {
              id: p.user_id,
              name: userInfo?.full_name || userInfo?.username || 'Unknown',
              avatar: userInfo?.avatar_url,
              username: userInfo?.username,
              role: p.role
            };
          }),
        unread_count: unreadCount
      };
    });

    return NextResponse.json({
      conversations: processedConversations
    });

  } catch (error) {
    console.error('Error in /api/conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations
 * Create a new conversation
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
    const { participant_ids, name, type = 'direct' } = body;

    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return NextResponse.json(
        { error: 'participant_ids is required and must be an array' },
        { status: 400 }
      );
    }

    // Validate participant IDs (check if they exist and are connections)
    const { data: connections, error: connectionsError } = await supabaseService
      .from('connections')
      .select('from_user_id, to_user_id')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (connectionsError) {
      console.error('Error fetching connections for validation:', connectionsError);
      return NextResponse.json(
        { error: 'Failed to validate connections' },
        { status: 500 }
      );
    }

    console.log('User connections:', connections?.length || 0);
    console.log('Requested participant_ids:', participant_ids);

    const validParticipantIds = participant_ids.filter(id =>
      connections?.some(conn =>
        (conn.from_user_id === user.id && conn.to_user_id === id) ||
        (conn.to_user_id === user.id && conn.from_user_id === id)
      )
    );

    console.log('Valid participant_ids after filtering:', validParticipantIds);

    if (validParticipantIds.length === 0) {
      console.error('No valid participants found. Connections:', connections, 'Requested:', participant_ids);
      return NextResponse.json(
        { error: 'No valid participants found. You can only message your connections.' },
        { status: 400 }
      );
    }

    // For direct messages, check if conversation already exists
    if (type === 'direct' && validParticipantIds.length === 1) {
      const otherUserId = validParticipantIds[0];

      // Find existing direct conversation between these two users
      const { data: existingConversations } = await supabaseService
        .from('conversations')
        .select(`
          id,
          name,
          type,
          created_at,
          conversation_participants!inner (
            user_id
          )
        `)
        .eq('type', 'direct');

      // Filter to find conversation with exactly these 2 participants
      const existingConv = existingConversations?.find(conv => {
        const participantIds = (conv.conversation_participants as any[]).map(p => p.user_id);
        return participantIds.length === 2 &&
               participantIds.includes(user.id) &&
               participantIds.includes(otherUserId);
      });

      if (existingConv) {
        // Return existing conversation
        return NextResponse.json({
          success: true,
          conversation: {
            id: existingConv.id,
            name: existingConv.name,
            type: existingConv.type,
            created_at: existingConv.created_at
          },
          existing: true
        });
      }
    }

    // Create conversation
    const { data: conversation, error: conversationError } = await supabaseService
      .from('conversations')
      .insert({
        name: name || `Chat with ${validParticipantIds.length} people`,
        type: type,
        created_by: user.id,
        metadata: {
          participant_count: validParticipantIds.length + 1
        }
      })
      .select()
      .single();

    if (conversationError) {
      console.error('Error creating conversation:', conversationError);
      return NextResponse.json(
        { 
          error: 'Failed to create conversation',
          details: conversationError.message,
          code: conversationError.code
        },
        { status: 500 }
      );
    }

    // Add participants
    const participants = [
      { conversation_id: conversation.id, user_id: user.id, role: 'owner', added_by: user.id },
      ...validParticipantIds.map(id => ({
        conversation_id: conversation.id,
        user_id: id,
        role: 'member',
        added_by: user.id
      }))
    ];

    console.log('Attempting to insert participants:', participants);
    console.log('Current user ID:', user.id);
    console.log('Conversation ID:', conversation.id);

    const { data: insertedParticipants, error: participantsError } = await supabaseService
      .from('conversation_participants')
      .insert(participants)
      .select();

    console.log('Participants insertion result:', { insertedParticipants, participantsError });

    if (participantsError) {
      console.error('Error adding participants:', participantsError);
      console.error('Full error details:', JSON.stringify(participantsError, null, 2));
      // Rollback conversation
      await supabaseService.from('conversations').delete().eq('id', conversation.id);
      return NextResponse.json(
        { 
          error: 'Failed to add participants',
          details: participantsError.message,
          code: participantsError.code,
          fullError: participantsError
        },
        { status: 500 }
      );
    }

    // Get the created conversation with participants
    const { data: fullConversation } = await supabaseService
      .from('conversations')
      .select('id, name, type, created_at')
      .eq('id', conversation.id)
      .single();

    // Get participants separately
    const { data: convParticipants } = await supabaseService
      .from('conversation_participants')
      .select('user_id, role')
      .eq('conversation_id', conversation.id);

    // Get user data for participants
    const participantUserIds = convParticipants?.map(p => p.user_id) || [];
    const { data: participantUsers } = await supabaseService
      .from('users')
      .select('user_id, full_name, username, avatar_url')
      .in('user_id', participantUserIds);

    return NextResponse.json({
      success: true,
      conversation: {
        ...fullConversation,
        participants: convParticipants?.map(p => {
          const userInfo = participantUsers?.find(u => u.user_id === p.user_id);
          return {
            user_id: p.user_id,
            role: p.role,
            full_name: userInfo?.full_name || 'Unknown',
            username: userInfo?.username || '',
            avatar_url: userInfo?.avatar_url || null
          };
        })
      }
    });

  } catch (error) {
    console.error('Error in /api/conversations POST:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}
