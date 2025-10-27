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

    // Get all accepted connections (both directions)
    const { data: allConnections, error: connectionsError } = await supabase
      .from('connections')
      .select('id, from_user_id, to_user_id, status, updated_at')
      .eq('status', 'accepted')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

    if (connectionsError) {
      console.error('Error fetching connections:', {
        message: connectionsError?.message,
        code: connectionsError?.code,
        details: connectionsError?.details,
        hint: connectionsError?.hint,
      });
      return [];
    }

    if (!allConnections || allConnections.length === 0) {
      console.log('No accepted connections found for user:', userId);
      return [];
    }

    // Collect all other user IDs
    const otherUserIds = new Set<string>();
    allConnections.forEach((conn) => {
      if (conn.from_user_id === userId) {
        otherUserIds.add(conn.to_user_id);
      } else {
        otherUserIds.add(conn.from_user_id);
      }
    });

    if (otherUserIds.size === 0) {
      return [];
    }

    // Fetch user data for all connected users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, full_name, email, avatar_url, username')
      .in('user_id', Array.from(otherUserIds));

    if (usersError) {
      console.error('Error fetching user data:', {
        message: usersError?.message,
        code: usersError?.code,
        details: usersError?.details,
      });
      return [];
    }

    // Map connection IDs to users
    const userMap = new Map();
    (users || []).forEach((user) => {
      userMap.set(user.user_id, user);
    });

    // Build final result
    const connections = new Map();
    allConnections.forEach((conn) => {
      const otherUserId = conn.from_user_id === userId ? conn.to_user_id : conn.from_user_id;
      const userData = userMap.get(otherUserId);

      if (userData && !connections.has(otherUserId)) {
        connections.set(otherUserId, {
          user_id: userData.user_id,
          full_name: userData.full_name,
          email: userData.email,
          avatar_url: userData.avatar_url,
          username: userData.username,
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

    // Step 1: Get all conversation IDs where user is a participant
    const { data: participations, error: participationError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, is_pinned, is_muted, last_read_at')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (participationError) {
      console.error('Error fetching participation:', participationError);
      return [];
    }

    if (!participations || participations.length === 0) {
      return [];
    }

    const convIds = participations.map((p) => p.conversation_id);

    // Step 2: Get all conversations
    const { data: allConversations, error: convError } = await supabase
      .from('conversations')
      .select('id, type, name, created_by, created_at, updated_at, last_message_preview, last_message_at')
      .in('id', convIds)
      .order('last_message_at', { ascending: false });

    if (convError) {
      console.error('Error fetching conversations:', convError);
      return [];
    }

    // Step 3: For direct chats, get the other user IDs
    const otherUserIds = new Set<string>();
    const { data: allParticipants, error: allParticipantsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convIds)
      .neq('user_id', userId);

    if (allParticipantsError) {
      console.error('Error fetching participants:', allParticipantsError);
    } else {
      (allParticipants || []).forEach((p) => {
        otherUserIds.add(p.user_id);
      });
    }

    // Step 4: Get user data for all other users
    let userMap = new Map();
    if (otherUserIds.size > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('user_id, full_name, email, avatar_url, username')
        .in('user_id', Array.from(otherUserIds));

      if (usersError) {
        console.error('Error fetching user data:', usersError);
      } else {
        (users || []).forEach((u) => {
          userMap.set(u.user_id, u);
        });
      }
    }

    // Step 5: Build result with proper mapping
    const conversationMap = new Map();
    participations.forEach((p) => {
      const conv = allConversations?.find((c) => c.id === p.conversation_id);
      if (!conv) return;

      // For direct chats, find the other user
      let otherUser = null;
      if (conv.type === 'direct') {
        const otherParticipant = allParticipants?.find(
          (ap) => ap.conversation_id === conv.id && ap.user_id !== userId
        );
        if (otherParticipant) {
          otherUser = userMap.get(otherParticipant.user_id) || null;
        }
      }

      conversationMap.set(conv.id, {
        id: conv.id,
        type: conv.type,
        name: conv.name,
        created_by: conv.created_by,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        other_user: otherUser,
        last_message: conv.last_message_preview,
        last_message_at: conv.last_message_at,
        unread_count: 0, // TODO: Calculate unread
        is_pinned: p.is_pinned,
        is_muted: p.is_muted,
      });
    });

    return Array.from(conversationMap.values());
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
    // Step 1: Get all messages (without nested select)
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, message_type, is_edited, is_deleted, reactions, sent_at, created_at, updated_at')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('sent_at', { ascending: true })
      .limit(limit);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return [];
    }

    if (!messages || messages.length === 0) {
      return [];
    }

    // Step 2: Get all sender IDs
    const senderIds = [...new Set(messages.map((m) => m.sender_id))];

    // Step 3: Get sender user data
    const { data: senders, error: sendersError } = await supabase
      .from('users')
      .select('user_id, full_name, email, avatar_url, username')
      .in('user_id', senderIds);

    if (sendersError) {
      console.error('Error fetching senders:', sendersError);
    }

    // Step 4: Build sender map
    const senderMap = new Map();
    (senders || []).forEach((sender) => {
      senderMap.set(sender.user_id, sender);
    });

    // Step 5: Enrich messages with sender data
    const enrichedMessages = messages.map((msg) => ({
      ...msg,
      sender: senderMap.get(msg.sender_id) || null,
    }));

    return enrichedMessages;
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
 * Get group chat members for a conversation (pod chats only)
 */
export async function getGroupChatMembers(conversationId: string) {
  try {
    // Step 1: Get all participants
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('user_id, role, status, joined_at')
      .eq('conversation_id', conversationId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true });

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return [];
    }

    if (!participants || participants.length === 0) {
      return [];
    }

    // Step 2: Get user IDs
    const userIds = participants.map((p) => p.user_id);

    // Step 3: Get user data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, full_name, email, avatar_url, username')
      .in('user_id', userIds);

    if (usersError) {
      console.error('Error fetching user data:', usersError);
      return [];
    }

    // Step 4: Build user map
    const userMap = new Map();
    (users || []).forEach((u) => {
      userMap.set(u.user_id, u);
    });

    // Step 5: Combine participant and user data
    return (participants || []).map((p) => {
      const userData = userMap.get(p.user_id);
      return {
        user_id: p.user_id,
        full_name: userData?.full_name || 'Unknown User',
        email: userData?.email || '',
        avatar_url: userData?.avatar_url,
        username: userData?.username,
        role: p.role,
        status: p.status,
        joined_at: p.joined_at,
      };
    });
  } catch (error) {
    console.error('Failed to get group chat members:', error);
    return [];
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
