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

    // Get all conversations where current user is a participant
    const { data: allConversations } = await supabase
      .from('conversations')
      .select('id, type, last_message_preview, last_message_at')
      .eq('type', 'direct');

    // Get all participants for these conversations
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .eq('status', 'active');

    // Create a map of user_id to last message
    const lastMessageMap = new Map();
    if (allConversations && allParticipants) {
      allConversations.forEach((conv) => {
        const participants = allParticipants.filter(p => p.conversation_id === conv.id);
        const hasCurrentUser = participants.some(p => p.user_id === userId);
        if (hasCurrentUser) {
          const otherParticipant = participants.find(p => p.user_id !== userId);
          if (otherParticipant) {
            lastMessageMap.set(otherParticipant.user_id, {
              message: conv.last_message_preview,
              timestamp: conv.last_message_at,
            });
          }
        }
      });
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
      const lastMessageData = lastMessageMap.get(otherUserId);

      if (userData && !connections.has(otherUserId)) {
        connections.set(otherUserId, {
          user_id: userData.user_id,
          full_name: userData.full_name,
          email: userData.email,
          avatar_url: userData.avatar_url,
          username: userData.username,
          connection_id: conn.id,
          last_message: lastMessageData?.message || null,
          last_message_at: lastMessageData?.timestamp || null,
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
      .select('id, conversation_id, sender_id, content, message_type, is_edited, is_deleted, reactions, reply_to_message_id, sent_at, created_at, updated_at')
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

    // Step 2: Get all sender IDs and reply message IDs
    const senderIds = [...new Set(messages.map((m) => m.sender_id))];
    const replyToIds = [...new Set(messages.map((m) => m.reply_to_message_id).filter(Boolean))];

    // Step 3: Get sender user data
    const { data: senders, error: sendersError } = await supabase
      .from('users')
      .select('user_id, full_name, email, avatar_url, username')
      .in('user_id', senderIds);

    if (sendersError) {
      console.error('Error fetching senders:', sendersError);
    }

    // Step 4: Get parent messages for replies
    let parentMessages = [];
    if (replyToIds.length > 0) {
      const { data: parents, error: parentsError } = await supabase
        .from('messages')
        .select('id, sender_id, content')
        .in('id', replyToIds);

      if (parentsError) {
        console.error('Error fetching parent messages:', parentsError);
      } else {
        parentMessages = parents || [];
      }
    }

    // Step 5: Build sender map and parent message map
    const senderMap = new Map();
    (senders || []).forEach((sender) => {
      senderMap.set(sender.user_id, sender);
    });

    const parentMap = new Map();
    parentMessages.forEach((parent) => {
      parentMap.set(parent.id, {
        ...parent,
        sender: senderMap.get(parent.sender_id) || null,
      });
    });

    // Step 6: Enrich messages with sender data and parent message
    const enrichedMessages = messages.map((msg) => ({
      ...msg,
      sender: senderMap.get(msg.sender_id) || null,
      reply_to_message: msg.reply_to_message_id ? parentMap.get(msg.reply_to_message_id) : null,
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
export async function sendMessage(conversationId: string, content: string, replyToMessageId?: string) {
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
        reply_to_message_id: replyToMessageId || null,
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

    // Create notifications for other participants
    await createMessageNotifications(conversationId, session.user.id, content);

    return data;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}

/**
 * Create notifications for new messages
 */
async function createMessageNotifications(conversationId: string, senderId: string, messageContent: string) {
  try {
    // Get all participants except the sender
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('status', 'active')
      .neq('user_id', senderId);

    if (!participants || participants.length === 0) return;

    // Get conversation details
    const { data: conversation } = await supabase
      .from('conversations')
      .select('type, name, is_muted')
      .eq('id', conversationId)
      .single();

    if (!conversation) return;

    // Check if conversation is muted for each user
    const { data: mutedConversations } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('is_muted', true)
      .in('user_id', participants.map(p => p.user_id));

    const mutedUserIds = new Set((mutedConversations || []).map(c => c.user_id));

    // Get sender info
    const { data: sender } = await supabase
      .from('users')
      .select('full_name')
      .eq('user_id', senderId)
      .single();

    const senderName = sender?.full_name || 'Someone';

    // Get notification preferences for each user
    const { data: preferences } = await supabase
      .from('user_notification_preferences')
      .select('user_id, message_notifications')
      .in('user_id', participants.map(p => p.user_id));

    const preferencesMap = new Map((preferences || []).map(p => [p.user_id, p.message_notifications]));

    // Create notifications for non-muted participants who have message notifications enabled
    const notificationsToCreate = participants
      .filter(p => !mutedUserIds.has(p.user_id) && preferencesMap.get(p.user_id) !== false)
      .map(p => ({
        user_id: p.user_id,
        actor_id: senderId,
        type: 'message',
        notification_type: 'message',
        title: conversation.type === 'direct' ? `${senderName} sent you a message` : `New message in ${conversation.name}`,
        message: messageContent.substring(0, 100),
        link: `/messages?conversation=${conversationId}`,
        read: false,
        priority: 'normal',
        metadata: {
          conversation_id: conversationId,
          conversation_type: conversation.type,
        }
      }));

    if (notificationsToCreate.length > 0) {
      await supabase
        .from('notifications')
        .insert(notificationsToCreate);
    }
  } catch (error) {
    console.error('Failed to create message notifications:', error);
    // Don't throw - notification failure shouldn't prevent message sending
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

/**
 * Add reaction to a message
 */
export async function addReaction(messageId: string, emoji: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Not authenticated');

    const userId = session.user.id;

    // Get current message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;

    // Update reactions
    const reactions = message.reactions || {};
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    // Toggle reaction
    if (reactions[emoji].includes(userId)) {
      reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      reactions[emoji].push(userId);
    }

    // Update message
    const { error: updateError } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId);

    if (updateError) throw updateError;

    return reactions;
  } catch (error) {
    console.error('Failed to add reaction:', error);
    throw error;
  }
}

/**
 * Delete a message (soft delete for user)
 */
export async function deleteMessage(messageId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: session.user.id,
      })
      .eq('id', messageId)
      .eq('sender_id', session.user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete message:', error);
    throw error;
  }
}

/**
 * Archive a conversation
 */
export async function archiveConversation(conversationId: string) {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({ is_archived: true })
      .eq('id', conversationId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to archive conversation:', error);
    throw error;
  }
}

/**
 * Unarchive a conversation
 */
export async function unarchiveConversation(conversationId: string) {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({ is_archived: false })
      .eq('id', conversationId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to unarchive conversation:', error);
    throw error;
  }
}

/**
 * Mute a conversation
 */
export async function muteConversation(conversationId: string, duration?: number) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Not authenticated');

    const mutedUntil = duration
      ? new Date(Date.now() + duration).toISOString()
      : null;

    const { error } = await supabase
      .from('conversation_participants')
      .update({
        is_muted: true,
        muted_until: mutedUntil,
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to mute conversation:', error);
    throw error;
  }
}

/**
 * Unmute a conversation
 */
export async function unmuteConversation(conversationId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('conversation_participants')
      .update({
        is_muted: false,
        muted_until: null,
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to unmute conversation:', error);
    throw error;
  }
}

/**
 * Leave a group chat
 */
export async function leaveGroupChat(conversationId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('conversation_participants')
      .update({
        status: 'left',
        left_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to leave group chat:', error);
    throw error;
  }
}

/**
 * Send typing indicator
 */
export async function sendTypingIndicator(conversationId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Not authenticated');

    // Upsert typing indicator
    const { error } = await supabase
      .from('conversation_typing_indicators')
      .upsert({
        conversation_id: conversationId,
        user_id: session.user.id,
        started_typing_at: new Date().toISOString(),
      }, {
        onConflict: 'conversation_id,user_id'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to send typing indicator:', error);
  }
}

/**
 * Clear typing indicator
 */
export async function clearTypingIndicator(conversationId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('conversation_typing_indicators')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to clear typing indicator:', error);
  }
}

/**
 * Get typing users for a conversation
 */
export async function getTypingUsers(conversationId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return [];

    const currentUserId = session.user.id;
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();

    const { data, error } = await supabase
      .from('conversation_typing_indicators')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', currentUserId)
      .gte('started_typing_at', fiveSecondsAgo);

    if (error) {
      console.error('Failed to get typing users:', error);
      return [];
    }

    const userIds = data.map(d => d.user_id);
    if (userIds.length === 0) return [];

    // Get user data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, full_name')
      .in('user_id', userIds);

    if (usersError) {
      console.error('Failed to get user data:', usersError);
      return [];
    }

    return users || [];
  } catch (error) {
    console.error('Failed to get typing users:', error);
    return [];
  }
}

/**
 * Delete conversation for current user (sets participant status to left)
 */
export async function deleteConversationForUser(conversationId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('conversation_participants')
      .update({
        status: 'left',
        left_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    throw error;
  }
}

/**
 * Mark a message as read - OPTIMIZED (fire and forget, DB handles duplicates)
 */
export async function markMessageAsRead(messageId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    // Fire and forget - don't await, let upsert handle duplicates
    supabase
      .from('message_read_receipts')
      .upsert({
        message_id: messageId,
        user_id: session.user.id,
        read_at: new Date().toISOString(),
      })
      .then(() => {
        // Success - read receipt inserted
      })
      .catch(error => {
        // Silently catch - duplicates are expected and OK
        if (error?.code !== 'PGRST116') {
          console.error('Error marking message as read:', error);
        }
      });
  } catch (error) {
    console.error('Failed to initiate read marking:', error);
  }
}

/**
 * Mark multiple messages as read (batch operation) - OPTIMIZED
 */
export async function markMessagesAsRead(messageIds: string[]) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    if (messageIds.length === 0) return;

    // Build receipts without checking existing ones - upsert handles duplicates
    const receipts = messageIds.map(messageId => ({
      message_id: messageId,
      user_id: session.user.id,
      read_at: new Date().toISOString(),
    }));

    // Fire and forget - don't await for instant UX
    supabase
      .from('message_read_receipts')
      .upsert(receipts)
      .then(() => {
        // Success
      })
      .catch(error => {
        // Silently catch - duplicate key errors are expected and OK
        if (error?.code !== 'PGRST116') {
          console.error('Error marking messages as read:', error);
        }
      });
  } catch (error) {
    console.error('Failed to initiate batch read marking:', error);
  }
}

/**
 * Get read receipts for messages - OPTIMIZED (2-query approach for Supabase compatibility)
 */
export async function getReadReceipts(messageIds: string[]) {
  try {
    if (messageIds.length === 0) return {};

    // Query 1: Get all read receipts for these messages
    const { data: receipts, error: receiptsError } = await supabase
      .from('message_read_receipts')
      .select('message_id, user_id, read_at')
      .in('message_id', messageIds)
      .order('read_at', { ascending: true });

    if (receiptsError) {
      console.error('Error fetching read receipts:', receiptsError);
      return {};
    }

    if (!receipts || receipts.length === 0) return {};

    // Get unique user IDs
    const userIds = [...new Set(receipts.map(r => r.user_id))];

    // Query 2: Get user data for all users who read messages
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    if (usersError) {
      console.error('Error fetching user data:', usersError);
    }

    // Build user map
    const userMap = new Map();
    (users || []).forEach(u => {
      userMap.set(u.user_id, u);
    });

    // Group receipts by message_id with user data
    const grouped: Record<string, any[]> = {};
    receipts.forEach(receipt => {
      if (!grouped[receipt.message_id]) {
        grouped[receipt.message_id] = [];
      }
      const userData = userMap.get(receipt.user_id);
      grouped[receipt.message_id].push({
        user_id: receipt.user_id,
        read_at: receipt.read_at,
        user: userData || { user_id: receipt.user_id, full_name: 'Unknown', avatar_url: null },
      });
    });

    return grouped;
  } catch (error) {
    console.error('Failed to get read receipts:', error);
    return {};
  }
}

/**
 * Get read receipt count for a message
 */
export async function getReadReceiptCount(messageId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('message_read_receipts')
      .select('*', { count: 'exact', head: true })
      .eq('message_id', messageId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Failed to get read receipt count:', error);
    return 0;
  }
}

/**
 * Mark the latest unread message in a conversation as read
 * Used when opening a conversation or widget
 */
export async function markLatestMessageAsRead(conversationId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    // Get the latest message from someone else
    const { data: latestMessage } = await supabase
      .from('messages')
      .select('id, sender_id')
      .eq('conversation_id', conversationId)
      .neq('sender_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (latestMessage) {
      // Mark it as read
      markMessageAsRead(latestMessage.id);
    }
  } catch (error) {
    console.error('Failed to mark latest message as read:', error);
  }
}
