/**
 * Messaging Utilities - Direct database interactions with proper error handling
 */

import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

/**
 * Get accepted connections for current user (both directions)
 * This function uses raw queries to avoid RLS issues
 */
export async function getAcceptedConnections() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return [];

    const userId = session.user.id;

    // Get connections where user is FROM_USER (sent request)
    const { data: sentConnections, error: sentError } = await supabase
      .from('connections')
      .select(`
        id,
        to_user_id,
        status,
        updated_at,
        to_user:to_user_id (
          user_id,
          full_name,
          email,
          avatar_url,
          username
        )
      `)
      .eq('from_user_id', userId)
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false });

    if (sentError) {
      console.error('Error fetching sent connections:', sentError);
    }

    // Get connections where user is TO_USER (received request that was accepted)
    const { data: receivedConnections, error: receivedError } = await supabase
      .from('connections')
      .select(`
        id,
        from_user_id,
        status,
        updated_at,
        from_user:from_user_id (
          user_id,
          full_name,
          email,
          avatar_url,
          username
        )
      `)
      .eq('to_user_id', userId)
      .eq('status', 'accepted')
      .order('updated_at', { ascending: false });

    if (receivedError) {
      console.error('Error fetching received connections:', receivedError);
    }

    // Combine both and remove duplicates
    const connections = new Map();

    (sentConnections || []).forEach((conn) => {
      const otherUser = conn.to_user;
      if (otherUser) {
        connections.set(otherUser.user_id, {
          user_id: otherUser.user_id,
          full_name: otherUser.full_name,
          email: otherUser.email,
          avatar_url: otherUser.avatar_url,
          username: otherUser.username,
          connection_id: conn.id,
        });
      }
    });

    (receivedConnections || []).forEach((conn) => {
      const otherUser = conn.from_user;
      if (otherUser && !connections.has(otherUser.user_id)) {
        connections.set(otherUser.user_id, {
          user_id: otherUser.user_id,
          full_name: otherUser.full_name,
          email: otherUser.email,
          avatar_url: otherUser.avatar_url,
          username: otherUser.username,
          connection_id: conn.id,
        });
      }
    });

    return Array.from(connections.values());
  } catch (error) {
    console.error('Failed to get accepted connections:', error);
    return [];
  }
}

/**
 * Get all conversations for current user (direct + group + pod chats)
 */
export async function getUserConversations() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return [];

    const userId = session.user.id;

    // Get all conversations where user is a participant
    const { data: participations, error } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        is_pinned,
        is_muted,
        last_read_at,
        conversation:conversation_id (
          id,
          type,
          name,
          created_by,
          created_at,
          updated_at,
          last_message_preview,
          last_message_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('conversation(last_message_at)', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    // Transform and enrich conversation data
    const conversations = [];

    for (const p of participations || []) {
      const conv = p.conversation;
      if (!conv) continue;

      // Get other user for direct messages
      let otherUser = null;
      if (conv.type === 'direct') {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select(`user:user_id (user_id, full_name, email, avatar_url, username)`)
          .eq('conversation_id', conv.id)
          .neq('user_id', userId)
          .single();

        if (participants?.user) {
          otherUser = participants.user;
        }
      }

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('is_deleted', false)
        .gt('sent_at', p.last_read_at || new Date(0).toISOString());

      conversations.push({
        id: conv.id,
        type: conv.type,
        name: conv.name,
        created_by: conv.created_by,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        other_user: otherUser,
        last_message: conv.last_message_preview,
        last_message_at: conv.last_message_at,
        unread_count: unreadCount || 0,
        is_pinned: p.is_pinned,
        is_muted: p.is_muted,
      });
    }

    return conversations;
  } catch (error) {
    console.error('Failed to get conversations:', error);
    return [];
  }
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(conversationId: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        message_type,
        is_edited,
        is_deleted,
        reactions,
        sent_at,
        created_at,
        updated_at,
        sender:sender_id (user_id, full_name, email, avatar_url, username)
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return (data || []).reverse();
  } catch (error) {
    console.error('Failed to get messages:', error);
    return [];
  }
}

/**
 * Send a message
 */
export async function sendMessage(conversationId: string, content: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        content,
        message_type: 'text',
        reactions: {},
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation's last message
    await supabase
      .from('conversations')
      .update({
        last_message_preview: content.substring(0, 100),
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return data;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}

/**
 * Start or get existing direct conversation
 */
export async function startConversation(userId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Not authenticated');

    const currentUserId = session.user.id;

    // Check if direct conversation already exists
    const { data: existingConv } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', currentUserId)
      .eq('status', 'active');

    if (existingConv) {
      for (const participation of existingConv) {
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select(`
            conversation:conversation_id (id, type)
          `)
          .eq('conversation_id', participation.conversation_id)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        if (
          otherParticipant?.conversation &&
          otherParticipant.conversation.type === 'direct'
        ) {
          return otherParticipant.conversation.id;
        }
      }
    }

    // Create new direct conversation
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        type: 'direct',
        created_by: currentUserId,
      })
      .select('id')
      .single();

    if (createError) throw createError;
    if (!newConv) throw new Error('Failed to create conversation');

    // Add participants
    const { error: participantError } = await supabase
      .from('conversation_participants')
      .insert([
        {
          conversation_id: newConv.id,
          user_id: currentUserId,
          role: 'member',
          status: 'active',
        },
        {
          conversation_id: newConv.id,
          user_id: userId,
          role: 'member',
          status: 'active',
        },
      ]);

    if (participantError) throw participantError;

    return newConv.id;
  } catch (error) {
    console.error('Failed to start conversation:', error);
    throw error;
  }
}
