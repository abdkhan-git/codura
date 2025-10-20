// Messaging TypeScript Types
// Production-ready real-time messaging system

export type ConversationType = 'direct' | 'group' | 'pod_chat';
export type ParticipantRole = 'owner' | 'admin' | 'member';
export type ParticipantStatus = 'active' | 'left' | 'removed';
export type MessageType =
  | 'text'
  | 'image'
  | 'file'
  | 'code_snippet'
  | 'problem_link'
  | 'system';
export type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null; // For group chats
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  study_pod_id: string | null; // Link to pod if pod_chat
  is_archived: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  joined_at: string;
  last_read_at: string;
  last_read_message_id: string | null;
  is_muted: boolean;
  muted_until: string | null;
  is_pinned: boolean;
  added_by: string | null;
  removed_by: string | null;
  left_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MessageAttachment {
  url: string;
  type: 'image' | 'file' | 'video' | 'audio';
  name: string;
  size: number; // bytes
  mime_type?: string;
  thumbnail_url?: string;
}

export interface MessageReactions {
  [emoji: string]: string[]; // emoji -> array of user IDs
}

export interface CodeSnippetMetadata {
  language: string;
  code: string;
  filename?: string;
}

export interface ProblemLinkMetadata {
  problem_id: number;
  problem_title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  attachments: MessageAttachment[];
  reply_to_message_id: string | null;
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  reactions: MessageReactions;
  metadata: Record<string, any>; // For code snippets, problem links, etc.
  created_at: string;
  updated_at: string;
}

export interface MessageReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface TypingIndicator {
  id: string;
  conversation_id: string;
  user_id: string;
  started_typing_at: string;
}

export interface MessageDeliveryStatus {
  id: string;
  message_id: string;
  user_id: string;
  status: DeliveryStatus;
  delivered_at: string | null;
  read_at: string | null;
  failed_reason: string | null;
  created_at: string;
  updated_at: string;
}

// Extended types with user data for UI
export interface ConversationWithParticipants extends Conversation {
  participants: Array<ConversationParticipant & {
    user: {
      user_id: string;
      username: string;
      full_name: string;
      avatar_url: string | null;
      is_online?: boolean;
    };
  }>;
  unread_count?: number;
  last_message?: Message & {
    sender: {
      user_id: string;
      username: string;
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export interface MessageWithSender extends Message {
  sender: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  reply_to?: Message & {
    sender: {
      user_id: string;
      username: string;
      full_name: string;
    };
  };
  read_by?: Array<{
    user_id: string;
    username: string;
    full_name: string;
    read_at: string;
  }>;
  delivery_status?: DeliveryStatus;
}

// API Request/Response types
export interface CreateConversationRequest {
  type: ConversationType;
  participant_ids: string[];
  name?: string; // For group chats
  description?: string;
  avatar_url?: string;
}

export interface SendMessageRequest {
  conversation_id: string;
  content?: string;
  message_type?: MessageType;
  attachments?: MessageAttachment[];
  reply_to_message_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateMessageRequest {
  content: string;
  metadata?: Record<string, any>;
}

export interface AddParticipantsRequest {
  conversation_id: string;
  user_ids: string[];
}

export interface UpdateParticipantRequest {
  role?: ParticipantRole;
  is_muted?: boolean;
  muted_until?: string;
  is_pinned?: boolean;
}

export interface ReactToMessageRequest {
  message_id: string;
  emoji: string; // e.g., "👍", "❤️", "😂"
}

export interface SearchMessagesRequest {
  conversation_id?: string;
  query: string;
  before?: string; // ISO date string
  after?: string;
  limit?: number;
  offset?: number;
}

export interface GetMessagesRequest {
  conversation_id: string;
  limit?: number;
  before?: string; // ISO date string (for pagination)
  after?: string;
}

// UI-specific types
export interface ConversationListItem {
  conversation: Conversation;
  other_user?: {
    // For direct messages
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    is_online: boolean;
    last_seen?: string;
  };
  unread_count: number;
  last_message: {
    content: string;
    sender_name: string;
    is_own_message: boolean;
    created_at: string;
  } | null;
  is_typing: boolean;
  typing_users?: string[]; // User names
}

export interface ChatMessage extends MessageWithSender {
  is_own_message: boolean;
  is_sending?: boolean;
  send_failed?: boolean;
  show_sender?: boolean; // Group consecutive messages
  show_timestamp?: boolean; // Show timestamp for time gaps
}

export interface MessageGroup {
  sender: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  messages: ChatMessage[];
  timestamp: string;
}

// Real-time events
export interface MessageEvent {
  type: 'new_message' | 'message_updated' | 'message_deleted';
  message: MessageWithSender;
  conversation_id: string;
}

export interface TypingEvent {
  type: 'typing_start' | 'typing_stop';
  conversation_id: string;
  user: {
    user_id: string;
    username: string;
    full_name: string;
  };
}

export interface ReadReceiptEvent {
  type: 'message_read';
  message_id: string;
  conversation_id: string;
  user: {
    user_id: string;
    username: string;
    full_name: string;
  };
  read_at: string;
}

export interface ParticipantEvent {
  type: 'participant_added' | 'participant_removed' | 'participant_left';
  conversation_id: string;
  participant: {
    user_id: string;
    username: string;
    full_name: string;
  };
}

export type RealtimeEvent =
  | MessageEvent
  | TypingEvent
  | ReadReceiptEvent
  | ParticipantEvent;

// File upload types
export interface UploadProgress {
  file_name: string;
  progress: number; // 0-100
  uploaded_bytes: number;
  total_bytes: number;
}

export interface MessageDraft {
  conversation_id: string;
  content: string;
  reply_to_message_id?: string;
  attachments?: File[];
  saved_at: string;
}

// Search and filter types
export interface MessageSearchResult {
  message: MessageWithSender;
  conversation: {
    id: string;
    name: string | null;
    type: ConversationType;
  };
  match_context: string; // Snippet showing the match
  match_position: number; // Character position in content
}

export interface ConversationFilters {
  type?: ConversationType;
  unread_only?: boolean;
  pinned_only?: boolean;
  archived?: boolean;
  search_query?: string;
}

export type ConversationSortOption = 'recent' | 'unread' | 'name' | 'oldest';

// Emoji reactions (commonly used)
export const COMMON_REACTIONS = [
  '👍',
  '❤️',
  '😂',
  '😮',
  '😢',
  '🎉',
  '🔥',
  '💯',
] as const;

export type CommonReaction = (typeof COMMON_REACTIONS)[number];

// System message types
export interface SystemMessageMetadata {
  type:
    | 'user_joined'
    | 'user_left'
    | 'user_removed'
    | 'user_added'
    | 'group_created'
    | 'group_renamed'
    | 'group_description_changed';
  user_id?: string;
  user_name?: string;
  actor_id?: string; // User who performed the action
  actor_name?: string;
  old_value?: string; // For renames
  new_value?: string;
}

// Online status
export interface UserOnlineStatus {
  user_id: string;
  is_online: boolean;
  last_seen: string | null;
}

// Notification preferences for messaging
export interface MessagingNotificationPreferences {
  dm_notifications: boolean;
  group_notifications: boolean;
  pod_chat_notifications: boolean;
  mention_notifications: boolean;
  reaction_notifications: boolean;
  mute_all_until?: string; // ISO date string
  muted_conversations: string[]; // Conversation IDs
}

// Blocked users (for DMs)
export interface BlockedUser {
  user_id: string;
  blocked_at: string;
  reason?: string;
}

// Message templates (for quick replies)
export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category?: string;
  usage_count: number;
  created_at: string;
}
