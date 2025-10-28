/**
 * Messaging API Layer
 * Handles all database queries for messaging system
 * Properly aligned with the actual database schema
 */

import { createClient } from '@/utils/supabase/client';

export interface User {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  username?: string;
}

export interface ConnectedUser extends User {
  connection_id: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'pod_chat';
  name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithDetails extends Conversation {
  other_user?: User;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  is_pinned: boolean;
  is_muted: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'code_snippet' | 'problem_link' | 'system';
  is_edited: boolean;
  is_deleted: boolean;
  reactions: { [emoji: string]: string[] };
  sent_at: string;
  created_at: string;
  updated_at: string;
}

export interface MessageWithSender extends Message {
  sender?: User;
}

export interface PendingConnection {
  id: string;
  from_user_id: string;
  from_user: User;
  status: 'pending';
  message?: string;
  created_at: string;
}

const supabase = createClient();

/**
 * Get all accepted connections for current user
 */
export async function getConnections(): Promise<ConnectedUser[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const userId = session.user.id;

  try {
    // Get connections where current user is from_user_id
    const { data: fromConnections, error: fromError } = await supabase
      .from('connections')
      .select(`
        id,
        from_user_id,
        to_user_id,
        status,
        to_user:to_user_id (user_id, username, full_name, avatar_url, email)
      `)
      .eq('from_user_id', userId)
      .eq('status', 'accepted')
      .returns<any[]>();

    if (fromError) throw fromError;

    // Get connections where current user is to_user_id
    const { data: toConnections, error: toError } = await supabase
      .from('connections')
      .select(`
        id,
        from_user_id,
        to_user_id,
        status,
        from_user:from_user_id (user_id, username, full_name, avatar_url, email)
      `)
      .eq('to_user_id', userId)
      .eq('status', 'accepted')
      .returns<any[]>();

    if (toError) throw toError;

    const connections: ConnectedUser[] = [];

    // Process from_user connections
    (fromConnections || []).forEach((conn) => {
      const otherUser = conn.to_user;
      if (otherUser) {
        connections.push({
          user_id: otherUser.user_id,
          full_name: otherUser.full_name,
          email: otherUser.email,
          avatar_url: otherUser.avatar_url,
          username: otherUser.username,
          connection_id: conn.id,
        });
      }
    });

    // Process to_user connections
    (toConnections || []).forEach((conn) => {
      const otherUser = conn.from_user;
      if (otherUser) {
        connections.push({
          user_id: otherUser.user_id,
          full_name: otherUser.full_name,
          email: otherUser.email,
          avatar_url: otherUser.avatar_url,
          username: otherUser.username,
          connection_id: conn.id,
        });
      }
    });

    return connections;
  } catch (error) {
    console.error('Error fetching connections:', error);
    // Return empty array on error instead of throwing
    return [];
  }
}

/**
 * Get all conversations for current user with unread counts
 */
export async function getConversations(): Promise<ConversationWithDetails[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const userId = session.user.id;

  // Get all conversations where user is a participant
  const { data: participations, error: participationError } = await supabase
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
    .returns<any[]>();

  if (participationError) {
    console.error('Error fetching conversations:', participationError);
    throw participationError;
  }

  // Transform data and fetch unread counts
  const conversations: ConversationWithDetails[] = [];

  for (const p of participations || []) {
    const conv = p.conversation;

    // Get unread message count
    const { count: unreadCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('is_deleted', false)
      .gt('sent_at', p.last_read_at || new Date(0).toISOString())
      .returns<any[]>();

    // Get other user for direct messages
    let otherUser: User | undefined;
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
}

/**
 * Get messages for a conversation
 */
export async function getMessages(conversationId: string, limit: number = 50): Promise<MessageWithSender[]> {
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
    .limit(limit)
    .returns<any[]>();

  if (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }

  return (data || [])
    .reverse()
    .map((msg) => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      content: msg.content,
      message_type: msg.message_type,
      is_edited: msg.is_edited,
      is_deleted: msg.is_deleted,
      reactions: msg.reactions || {},
      sent_at: msg.sent_at,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      sender: msg.sender,
    }));
}

/**
 * Send a message to a conversation
 */
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<Message> {
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

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }

  // Update conversation's last_message_preview and last_message_at
  await supabase
    .from('conversations')
    .update({
      last_message_preview: content.substring(0, 100),
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  return data;
}

/**
 * Add a reaction to a message
 */
export async function addReaction(
  messageId: string,
  emoji: string
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const userId = session.user.id;

  // Get current reactions
  const { data: message } = await supabase
    .from('messages')
    .select('reactions')
    .eq('id', messageId)
    .single();

  if (!message) throw new Error('Message not found');

  const reactions = message.reactions || {};
  if (!reactions[emoji]) {
    reactions[emoji] = [];
  }

  // Add user to reaction if not already there
  if (!reactions[emoji].includes(userId)) {
    reactions[emoji].push(userId);
  }

  // Update message
  const { error } = await supabase
    .from('messages')
    .update({ reactions })
    .eq('id', messageId);

  if (error) throw error;
}

/**
 * Remove a reaction from a message
 */
export async function removeReaction(
  messageId: string,
  emoji: string
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const userId = session.user.id;

  // Get current reactions
  const { data: message } = await supabase
    .from('messages')
    .select('reactions')
    .eq('id', messageId)
    .single();

  if (!message) throw new Error('Message not found');

  const reactions = message.reactions || {};
  if (reactions[emoji]) {
    reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);
    if (reactions[emoji].length === 0) {
      delete reactions[emoji];
    }
  }

  // Update message
  const { error } = await supabase
    .from('messages')
    .update({ reactions })
    .eq('id', messageId);

  if (error) throw error;
}

/**
 * Edit a message
 */
export async function editMessage(
  messageId: string,
  newContent: string
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({
      content: newContent,
      is_edited: true,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId);

  if (error) throw error;
}

/**
 * Delete (soft delete) a message
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('messages')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: session.user.id,
    })
    .eq('id', messageId);

  if (error) throw error;
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(conversationId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('conversation_participants')
    .update({
      last_read_at: new Date().toISOString(),
    })
    .eq('conversation_id', conversationId)
    .eq('user_id', session.user.id);

  if (error) throw error;
}

/**
 * Pin/unpin a conversation
 */
export async function togglePinConversation(
  conversationId: string,
  pinned: boolean
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('conversation_participants')
    .update({ is_pinned: pinned })
    .eq('conversation_id', conversationId)
    .eq('user_id', session.user.id);

  if (error) throw error;
}

/**
 * Mute/unmute a conversation
 */
export async function toggleMuteConversation(
  conversationId: string,
  muted: boolean
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('conversation_participants')
    .update({ is_muted: muted })
    .eq('conversation_id', conversationId)
    .eq('user_id', session.user.id);

  if (error) throw error;
}

/**
 * Get pending connection requests for current user
 */
export async function getPendingConnections(): Promise<PendingConnection[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const userId = session.user.id;

  const { data, error } = await supabase
    .from('connections')
    .select(`
      id,
      from_user_id,
      status,
      message,
      created_at,
      from_user:from_user_id (user_id, full_name, email, avatar_url, username)
    `)
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .returns<any[]>();

  if (error) {
    console.error('Error fetching pending connections:', error);
    return [];
  }

  return (data || []).map((conn) => ({
    id: conn.id,
    from_user_id: conn.from_user_id,
    from_user: conn.from_user,
    status: 'pending' as const,
    message: conn.message,
    created_at: conn.created_at,
  }));
}

/**
 * Get or create direct message conversation
 */
export async function getOrCreateDirectConversation(otherUserId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');

  const userId = session.user.id;

  try {
    // Check if direct conversation already exists with both users
    const { data: existing, error: queryError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .returns<any[]>();

    if (queryError) throw queryError;

    // Check each conversation to see if both users are in it
    for (const participation of existing || []) {
      const { data: otherParticipant, error: checkError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation:conversation_id (id, type)
        `)
        .eq('conversation_id', participation.conversation_id)
        .eq('user_id', otherUserId)
        .eq('status', 'active')
        .single();

      if (!checkError && otherParticipant?.conversation?.type === 'direct') {
        return otherParticipant.conversation.id;
      }
    }

    // Create new direct conversation
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        type: 'direct',
        created_by: userId,
      })
      .select('id')
      .single();

    if (createError) throw createError;
    if (!newConv) throw new Error('Failed to create conversation');

    // Add both participants
    const { error: participantError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: newConv.id, user_id: userId, role: 'member', status: 'active' },
        { conversation_id: newConv.id, user_id: otherUserId, role: 'member', status: 'active' },
      ]);

    if (participantError) throw participantError;

    return newConv.id;
  } catch (error) {
    console.error('Error in getOrCreateDirectConversation:', error);
    throw error;
  }
}
