"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ChatMessage, ConversationListItem } from "@/types/messaging";

interface UseRealtimeMessagingProps {
  conversationId?: string | null;
  currentUserId: string;
  onNewMessage?: (message: any) => void;
  onMessageUpdate?: (message: any) => void;
  onMessageDelete?: (messageId: string) => void;
  onTypingUpdate?: (userId: string, isTyping: boolean) => void;
}

export function useRealtimeMessaging({
  conversationId,
  currentUserId,
  onNewMessage,
  onMessageUpdate,
  onMessageDelete,
  onTypingUpdate,
}: UseRealtimeMessagingProps) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!conversationId) {
      // Clean up if no conversation
      if (channel) {
        channel.unsubscribe();
        setChannel(null);
        setIsConnected(false);
      }
      return;
    }

    // Create a channel for this conversation
    const newChannel = supabase.channel(`conversation:${conversationId}`);

    // Subscribe to new messages
    newChannel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log("New message:", payload);

          // Fetch full message
          const { data: message } = await supabase
            .from("messages")
            .select("*")
            .eq("id", payload.new.id)
            .single();

          if (message) {
            // Fetch sender data separately
            const { data: sender } = await supabase
              .from("users")
              .select("user_id, full_name, username, avatar_url")
              .eq("user_id", message.sender_id)
              .single();

            if (onNewMessage) {
              onNewMessage({
                ...message,
                sender: {
                  user_id: message.sender_id,
                  full_name: sender?.full_name || 'Unknown',
                  username: sender?.username || '',
                  avatar_url: sender?.avatar_url || null
                },
                is_own_message: message.sender_id === currentUserId,
              });
            }
          }
        }
      )
      // Subscribe to message updates (edits)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log("Message updated:", payload);

          if (payload.new.is_deleted && onMessageDelete) {
            onMessageDelete(payload.new.id as string);
          } else if (onMessageUpdate) {
            // Fetch full message
            const { data: message } = await supabase
              .from("messages")
              .select("*")
              .eq("id", payload.new.id)
              .single();

            if (message) {
              // Fetch sender data separately
              const { data: sender } = await supabase
                .from("users")
                .select("user_id, full_name, username, avatar_url")
                .eq("user_id", message.sender_id)
                .single();

              onMessageUpdate({
                ...message,
                sender: {
                  user_id: message.sender_id,
                  full_name: sender?.full_name || 'Unknown',
                  username: sender?.username || '',
                  avatar_url: sender?.avatar_url || null
                },
                is_own_message: message.sender_id === currentUserId,
              });
            }
          }
        }
      )
      // Subscribe to typing indicators
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("Typing indicator:", payload);

          const userId = payload.new?.user_id || payload.old?.user_id;
          if (userId && userId !== currentUserId && onTypingUpdate) {
            onTypingUpdate(userId, payload.eventType !== "DELETE");
          }
        }
      )
      // Subscribe to read receipts
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_read_receipts",
        },
        (payload) => {
          console.log("Read receipt:", payload);
          // Handle read receipts if needed
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    setChannel(newChannel);

    // Cleanup on unmount or conversation change
    return () => {
      newChannel.unsubscribe();
      setChannel(null);
      setIsConnected(false);
    };
  }, [conversationId, currentUserId, supabase, onNewMessage, onMessageUpdate, onMessageDelete, onTypingUpdate]);

  return { isConnected, channel };
}

// Hook for subscribing to all conversations (for the conversation list)
export function useRealtimeConversations(currentUserId: string) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Create a channel for user's conversations
    const newChannel = supabase.channel(`user:${currentUserId}:conversations`);

    // Subscribe to conversation updates
    newChannel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          console.log("Conversation updated:", payload);
          // Trigger conversations reload
          window.dispatchEvent(new CustomEvent("conversations:reload"));
        }
      )
      // Subscribe to messages (to update last message preview)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log("New message in any conversation:", payload);
          // Only trigger reload if the message is NOT from the current user
          // to avoid showing notifications to the sender
          if (payload.new.sender_id !== currentUserId) {
            window.dispatchEvent(new CustomEvent("conversations:reload"));
          }
        }
      )
      // Subscribe to participant changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log("Participant status changed:", payload);
          // Trigger conversations reload
          window.dispatchEvent(new CustomEvent("conversations:reload"));
        }
      )
      .subscribe((status) => {
        console.log("Conversations subscription status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    setChannel(newChannel);

    return () => {
      newChannel.unsubscribe();
      setChannel(null);
      setIsConnected(false);
    };
  }, [currentUserId, supabase]);

  return { isConnected, channel };
}

// Hook for typing indicators with debouncing
export function useTypingIndicator(
  conversationId: string | null,
  currentUserId: string
) {
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeoutId, setTypingTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const startTyping = useCallback(async () => {
    if (!conversationId) return;

    // Clear existing timeout
    if (typingTimeoutId) {
      clearTimeout(typingTimeoutId);
    }

    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true);
      try {
        await fetch(`/api/conversations/${conversationId}/typing`, {
          method: "POST",
        });
      } catch (error) {
        console.error("Failed to send typing indicator:", error);
      }
    }

    // Set timeout to stop typing after 3 seconds
    const timeoutId = setTimeout(async () => {
      await stopTyping();
    }, 3000);

    setTypingTimeoutId(timeoutId);
  }, [conversationId, isTyping, typingTimeoutId]);

  const stopTyping = useCallback(async () => {
    if (!conversationId || !isTyping) return;

    setIsTyping(false);

    if (typingTimeoutId) {
      clearTimeout(typingTimeoutId);
      setTypingTimeoutId(null);
    }

    try {
      await fetch(`/api/conversations/${conversationId}/typing`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to stop typing indicator:", error);
    }
  }, [conversationId, isTyping, typingTimeoutId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutId) {
        clearTimeout(typingTimeoutId);
      }
      if (isTyping && conversationId) {
        fetch(`/api/conversations/${conversationId}/typing`, {
          method: "DELETE",
        }).catch(console.error);
      }
    };
  }, []);

  return { startTyping, stopTyping, isTyping };
}
