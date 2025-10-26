"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  message_type: "text" | "image" | "file" | "code_snippet" | "problem_link";
  attachments?: any[];
  reply_to_message_id?: string;
  reactions?: Record<string, string[]>;
  is_edited?: boolean;
  edited_at?: string;
  metadata?: any;
  read_by?: string[];
  sender?: {
    user_id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface UseMessagingProps {
  conversationId: string | null;
  currentUserId: string;
}

export function useMessagingV2({ conversationId, currentUserId }: UseMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const messagesLoadedRef = useRef(false);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use API route which has service role access
      const response = await fetch(`/api/conversations/${conversationId}/messages`);

      if (!response.ok) {
        console.error('Error fetching messages:', response.statusText);
        setError('Failed to load messages');
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setMessages(data.messages || []);
      messagesLoadedRef.current = true;
      setIsLoading(false);

    } catch (err) {
      console.error('Error in fetchMessages:', err);
      setError('An error occurred while loading messages');
      setIsLoading(false);
    }
  }, [conversationId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId || !currentUserId) {
      return;
    }

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create new channel for this conversation using postgres_changes
    const channel = supabase
      .channel(`conversation:${conversationId}:messages`, { config: { private: true } })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          // Filter on client side to avoid RLS issues
          if (payload.new.conversation_id !== conversationId) return;
          const newMessage = payload.new as any;

          console.log('🔔 Real-time INSERT event received:', {
            messageId: newMessage.id,
            senderId: newMessage.sender_id,
          });

          // Fetch sender info
          const { data: sender } = await supabase
            .from('users')
            .select('user_id, full_name, username, avatar_url')
            .eq('user_id', newMessage.sender_id)
            .single();

          const messageWithSender = {
            ...newMessage,
            read_by: [],
            sender
          };

          setMessages(prev => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) {
              return prev;
            }

            if (newMessage.sender_id === currentUserId) {
              return prev;
            }

            console.log('✅ Adding new message from real-time:', newMessage.id);
            return [...prev, messageWithSender];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          // Filter on client side
          if (payload.new.conversation_id !== conversationId) return;
          const updatedMessage = payload.new as any;

          console.log('🔄 Real-time UPDATE event received:', updatedMessage.id);

          setMessages(prev =>
            prev.map(msg =>
              msg.id === updatedMessage.id
                ? {
                    ...msg,
                    reactions: updatedMessage.reactions,
                    is_edited: updatedMessage.is_edited,
                    edited_at: updatedMessage.edited_at
                  }
                : msg
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to conversation:', conversationId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error for conversation:', conversationId);
          setError('Real-time connection error');
        }
      });

    channelRef.current = channel;

    // Create separate channel for read receipts
    const readReceiptsChannel = supabase
      .channel(`conversation:${conversationId}:read_receipts`, { config: { private: true } })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_read_receipts' },
        (payload) => {
          const receipt = payload.new as any;

          console.log('📖 Read receipt event received:', {
            messageId: receipt.message_id,
            userId: receipt.user_id
          });

          setMessages(prev =>
            prev.map(msg => {
              if (msg.id === receipt.message_id) {
                const currentReadBy = msg.read_by || [];
                if (!currentReadBy.includes(receipt.user_id)) {
                  return {
                    ...msg,
                    read_by: [...currentReadBy, receipt.user_id]
                  };
                }
              }
              return msg;
            })
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to read receipts for conversation:', conversationId);
        }
      });

    // Cleanup on unmount or conversation change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      supabase.removeChannel(readReceiptsChannel);
    };
  }, [conversationId, currentUserId, supabase]);

  // Load messages when conversation changes
  useEffect(() => {
    messagesLoadedRef.current = false;
    fetchMessages();
  }, [fetchMessages]);

  // Send message
  const sendMessage = useCallback(async (content: string, messageType: string = 'text', attachments: any[] = []) => {
    if (!conversationId) {
      setError('No conversation selected');
      return;
    }

    try {
      const messageId = `temp-${Date.now()}`;

      // Create optimistic message
      const optimisticMessage: Message = {
        id: messageId,
        content,
        sender_id: currentUserId,
        conversation_id: conversationId,
        created_at: new Date().toISOString(),
        message_type: messageType as any,
        attachments,
        reactions: {},
        read_by: [currentUserId],
      };

      // Add to state immediately
      setMessages(prev => [...prev, optimisticMessage]);
      console.log('✨ Added optimistic message:', messageId);

      // Send to API
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          content,
          message_type: messageType,
          attachments
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const responseData = await response.json();
      const sentMessage = responseData.message;

      if (!sentMessage) {
        throw new Error('No message data in response');
      }

      // Replace optimistic with real message
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...sentMessage, read_by: [currentUserId] }
            : msg
        )
      );

      console.log('✅ Message sent successfully:', sentMessage.id);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      setMessages(prev => prev.filter(msg => msg.id && msg.id.startsWith('temp-')));
    }
  }, [conversationId, currentUserId]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!conversationId || messageIds.length === 0) return;

    try {
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          message_ids: messageIds,
        }),
      });

      console.log('📖 Marked as read:', messageIds.length, 'messages');
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [conversationId]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    markAsRead,
  };
}
