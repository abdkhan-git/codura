/**
 * MESSAGING TYPES
 * Aligned with Codura database schema (connections, messages, conversations, conversation_participants)
 */

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

export interface Connection {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  message?: string;
  created_at: string;
  updated_at: string;
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

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏'] as const;
