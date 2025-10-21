"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type: "text" | "image" | "file" | "code_snippet" | "problem_link";
  attachments?: any[];
  reply_to_message_id?: string;
  reactions?: Record<string, string[]>;
  is_edited?: boolean;
  edited_at?: string;
  read_by?: string[];
  sender?: {
    name: string;
    avatar?: string;
  };
}

interface Conversation {
  id: string;
  name: string;
  type: "direct" | "group";
  last_message?: {
    content: string;
    sender_name: string;
    created_at: string;
    message_type: string;
  };
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    username?: string;
    is_online?: boolean;
    last_seen?: string;
  }>;
  unread_count: number;
  is_pinned: boolean;
  is_archived: boolean;
  updated_at: string;
}

interface UseMessagingProps {
  conversationId?: string;
  currentUserId: string;
}

export function useMessaging({ conversationId, currentUserId }: UseMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const supabase = createClient();

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Add sender info
          const message: Message = {
            id: newMessage.id,
            content: newMessage.content,
            sender_id: newMessage.sender_id,
            created_at: newMessage.created_at,
            message_type: newMessage.message_type,
            attachments: newMessage.attachments,
            reply_to_message_id: newMessage.reply_to_message_id,
            reactions: newMessage.reactions,
            is_edited: newMessage.is_edited,
            edited_at: newMessage.edited_at,
            read_by: newMessage.read_by || [],
            sender: {
              name: 'Unknown', // Will be updated when we fetch sender info
              avatar: undefined
            }
          };

          setMessages(prev => [...prev, message]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as any;
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id 
                ? { ...msg, ...updatedMessage }
                : msg
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_read_receipts',
        },
        (payload) => {
          const receipt = payload.new as any;
          
          setMessages(prev =>
            prev.map(msg =>
              msg.id === receipt.message_id
                ? { ...msg, read_by: [...(msg.read_by || []), receipt.user_id] }
                : msg
            )
          );
        }
      )
      .on(
        'presence',
        { event: 'sync' },
        () => {
          const state = channel.presenceState();
          const users = Object.keys(state).filter(userId => userId !== currentUserId);
          setTypingUsers(users);
        }
      )
      .on(
        'presence',
        { event: 'join' },
        ({ key, newPresences }) => {
          if (key !== currentUserId) {
            setTypingUsers(prev => [...prev, key]);
          }
        }
      )
      .on(
        'presence',
        { event: 'leave' },
        ({ key }) => {
          setTypingUsers(prev => prev.filter(userId => userId !== key));
        }
      )
      .subscribe();

    setChannel(channel);

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, currentUserId, supabase]);

  // Fetch messages for current conversation
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        console.error('Failed to fetch messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations');
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        console.error('Failed to fetch conversations');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (content: string, messageType = 'text', attachments = []) => {
    if (!conversationId || !content.trim()) return;

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: content.trim(),
          message_type: messageType,
          attachments
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [conversationId]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(() => {
    if (!channel) return;

    channel.track({
      user_id: currentUserId,
      is_typing: true,
      timestamp: new Date().toISOString()
    });

    // Stop typing after 3 seconds
    setTimeout(() => {
      channel.track({
        user_id: currentUserId,
        is_typing: false,
        timestamp: new Date().toISOString()
      });
    }, 3000);
  }, [channel, currentUserId]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!conversationId || messageIds.length === 0) return;

    try {
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          message_ids: messageIds
        })
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [conversationId]);

  // Load initial data
  useEffect(() => {
    fetchMessages();
    fetchConversations();
  }, [fetchMessages, fetchConversations]);

  return {
    messages,
    conversations,
    isLoading,
    isTyping,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    fetchMessages,
    fetchConversations
  };
}


