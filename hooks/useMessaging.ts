/**
 * useMessaging - Main hook for messaging system
 * Handles real-time subscriptions and state management
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  getConnections,
  getPendingConnections,
  getConversations,
  getMessages,
  sendMessage as sendMessageAPI,
  addReaction,
  removeReaction,
  editMessage,
  deleteMessage,
  markConversationAsRead,
  togglePinConversation,
  toggleMuteConversation,
  getOrCreateConversation,
} from '@/lib/messaging-api';
import {
  ConnectedUser,
  ConversationWithDetails,
  MessageWithSender,
  PendingConnection,
} from '@/types/messaging';

interface UseMessagingReturn {
  // Data
  connections: ConnectedUser[];
  pendingConnections: PendingConnection[];
  conversations: ConversationWithDetails[];
  selectedConversation: ConversationWithDetails | null;
  messages: MessageWithSender[];

  // Loading states
  isLoadingConnections: boolean;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;

  // Actions
  selectConversation: (conversationId: string) => Promise<void>;
  startDirectMessage: (userId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string, hasReacted: boolean) => Promise<void>;
  editMessageContent: (messageId: string, content: string) => Promise<void>;
  deleteMessageContent: (messageId: string) => Promise<void>;
  pinConversation: (conversationId: string, pinned: boolean) => Promise<void>;
  muteConversation: (conversationId: string, muted: boolean) => Promise<void>;

  // Utils
  refreshConversations: () => Promise<void>;
  refreshMessages: () => Promise<void>;
}

export function useMessaging(): UseMessagingReturn {
  const supabase = createClient();

  // Data states
  const [connections, setConnections] = useState<ConnectedUser[]>([]);
  const [pendingConnections, setPendingConnections] = useState<PendingConnection[]>([]);
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);

  // Loading states
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Refs for subscriptions
  const subscriptionsRef = useRef<any[]>([]);

  // Fetch connections
  const fetchConnections = useCallback(async () => {
    try {
      setIsLoadingConnections(true);
      const data = await getConnections();
      setConnections(data);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setIsLoadingConnections(false);
    }
  }, []);

  // Fetch pending connections
  const fetchPendingConnections = useCallback(async () => {
    try {
      const data = await getPendingConnections();
      setPendingConnections(data);
    } catch (error) {
      console.error('Failed to fetch pending connections:', error);
    }
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      const data = await getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async () => {
    if (!selectedConversation) return;

    try {
      setIsLoadingMessages(true);
      const data = await getMessages(selectedConversation.id);
      setMessages(data);
      // Mark as read
      await markConversationAsRead(selectedConversation.id);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [selectedConversation]);

  // Select conversation
  const selectConversation = useCallback(
    async (conversationId: string) => {
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
        await fetchMessages();
      }
    },
    [conversations, fetchMessages]
  );

  // Start direct message
  const startDirectMessage = useCallback(
    async (userId: string) => {
      try {
        const conv = await getOrCreateConversation(userId);
        await fetchConversations();
        await selectConversation(conv.id);
      } catch (error) {
        console.error('Failed to start conversation:', error);
      }
    },
    [fetchConversations, selectConversation]
  );

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!selectedConversation || !content.trim()) return;

      try {
        setIsSending(true);
        await sendMessageAPI(selectedConversation.id, content);
        await fetchMessages();
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setIsSending(false);
      }
    },
    [selectedConversation, fetchMessages]
  );

  // Toggle reaction
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string, hasReacted: boolean) => {
      try {
        if (hasReacted) {
          await removeReaction(messageId, emoji);
        } else {
          await addReaction(messageId, emoji);
        }
        await fetchMessages();
      } catch (error) {
        console.error('Failed to toggle reaction:', error);
      }
    },
    [fetchMessages]
  );

  // Edit message
  const editMessageContent = useCallback(
    async (messageId: string, content: string) => {
      try {
        await editMessage(messageId, content);
        await fetchMessages();
      } catch (error) {
        console.error('Failed to edit message:', error);
      }
    },
    [fetchMessages]
  );

  // Delete message
  const deleteMessageContent = useCallback(
    async (messageId: string) => {
      try {
        await deleteMessage(messageId);
        await fetchMessages();
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    },
    [fetchMessages]
  );

  // Pin conversation
  const pinConversation = useCallback(
    async (conversationId: string, pinned: boolean) => {
      try {
        await togglePinConversation(conversationId, pinned);
        await fetchConversations();
      } catch (error) {
        console.error('Failed to pin conversation:', error);
      }
    },
    [fetchConversations]
  );

  // Mute conversation
  const muteConversation = useCallback(
    async (conversationId: string, muted: boolean) => {
      try {
        await toggleMuteConversation(conversationId, muted);
        await fetchConversations();
      } catch (error) {
        console.error('Failed to mute conversation:', error);
      }
    },
    [fetchConversations]
  );

  // Setup real-time subscriptions
  useEffect(() => {
    // Initial data fetch
    fetchConnections();
    fetchPendingConnections();
    fetchConversations();

    // Subscribe to messages changes
    const messagesSubscription = supabase
      .channel('messages-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => {
        if (selectedConversation) {
          await fetchMessages();
        }
      })
      .subscribe();

    subscriptionsRef.current.push(messagesSubscription);

    // Subscribe to conversations changes
    const conversationsSubscription = supabase
      .channel('conversations-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, async () => {
        await fetchConversations();
      })
      .subscribe();

    subscriptionsRef.current.push(conversationsSubscription);

    // Cleanup subscriptions on unmount
    return () => {
      subscriptionsRef.current.forEach((sub) => {
        supabase.removeChannel(sub);
      });
    };
  }, [selectedConversation]);

  return {
    // Data
    connections,
    pendingConnections,
    conversations,
    selectedConversation,
    messages,

    // Loading states
    isLoadingConnections,
    isLoadingConversations,
    isLoadingMessages,
    isSending,

    // Actions
    selectConversation,
    startDirectMessage,
    sendMessage,
    toggleReaction,
    editMessageContent,
    deleteMessageContent,
    pinConversation,
    muteConversation,

    // Utils
    refreshConversations: fetchConversations,
    refreshMessages: fetchMessages,
  };
}
