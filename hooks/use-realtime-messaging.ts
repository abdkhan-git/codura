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
  message_type: "text" | "image" | "file" | "code_snippet" | "problem_link" | "system";
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

interface UseRealtimeMessagingProps {
  conversationId: string | null;
  currentUserId: string;
}

export function useRealtimeMessaging({
  conversationId,
  currentUserId,
}: UseRealtimeMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const readReceiptChannelRef = useRef<RealtimeChannel | null>(null);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());

  // Load messages when conversation changes
  useEffect(() => {
    // If no conversation selected, clear messages
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    // Start loading
    setIsLoading(true);
    setError(null);
    setMessages([]);
    processedMessageIdsRef.current.clear();

    // Fetch messages from API
    const loadMessages = async () => {
      try {
        console.log("📨 Fetching messages for conversation:", conversationId);
        const response = await fetch(
          `/api/conversations/${conversationId}/messages`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const loadedMessages = Array.isArray(data.messages) ? data.messages : [];

        console.log("✅ Messages loaded:", loadedMessages.length);
        setMessages(loadedMessages);

        // Mark all loaded messages as processed to avoid duplicates
        loadedMessages.forEach((msg: Message) => {
          processedMessageIdsRef.current.add(msg.id);
        });

        setError(null);
      } catch (err) {
        console.error("❌ Failed to load messages:", err);
        setError(err instanceof Error ? err.message : "Failed to load messages");
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [conversationId]);

  // Set up real-time subscriptions for messages and reactions
  useEffect(() => {
    if (!conversationId || !currentUserId) {
      return;
    }

    // Clean up previous channels
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current);
      messageChannelRef.current = null;
    }
    if (readReceiptChannelRef.current) {
      supabase.removeChannel(readReceiptChannelRef.current);
      readReceiptChannelRef.current = null;
    }

    // Subscribe to new messages and message updates
    const messageChannel = supabase
      .channel(`conversation:${conversationId}:messages`, { config: { private: true } })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: any) => {
          const newMessage = payload.new as Message;

          // Skip if we already processed this message
          if (processedMessageIdsRef.current.has(newMessage.id)) {
            console.log("⏭️ Skipping duplicate message:", newMessage.id);
            return;
          }

          processedMessageIdsRef.current.add(newMessage.id);

          console.log("🔔 New message received:", {
            messageId: newMessage.id,
            senderId: newMessage.sender_id,
            isOwnMessage: newMessage.sender_id === currentUserId,
          });

          // Fetch sender info
          const { data: sender } = await supabase
            .from("users")
            .select("user_id, full_name, username, avatar_url")
            .eq("user_id", newMessage.sender_id)
            .single();

          const messageWithSender = {
            ...newMessage,
            read_by: [],
            sender: sender || {
              user_id: newMessage.sender_id,
              full_name: "Unknown",
              username: "unknown",
              avatar_url: null,
            },
          };

          // Add to state (from any user, including current user)
          setMessages((prev) => [...prev, messageWithSender]);
          console.log("✅ Message added to state:", newMessage.id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const updatedMessage = payload.new as Message;

          console.log("🔄 Message updated (reactions/edit):", updatedMessage.id);

          // Update message in state
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updatedMessage.id
                ? {
                    ...msg,
                    reactions: updatedMessage.reactions || {},
                    is_edited: updatedMessage.is_edited || false,
                    edited_at: updatedMessage.edited_at,
                    content: updatedMessage.content,
                  }
                : msg
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Subscribed to messages for:", conversationId);
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Channel error subscribing to messages");
          setError("Real-time message connection failed");
        }
      });

    messageChannelRef.current = messageChannel;

    // Subscribe to read receipts
    const readReceiptChannel = supabase
      .channel(`conversation:${conversationId}:read_receipts`, {
        config: { private: true },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_read_receipts",
        },
        (payload: any) => {
          const receipt = payload.new as any;

          console.log("📖 Read receipt received:", {
            messageId: receipt.message_id,
            userId: receipt.user_id,
          });

          // Update message read status
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === receipt.message_id) {
                const currentReadBy = msg.read_by || [];
                if (!currentReadBy.includes(receipt.user_id)) {
                  return {
                    ...msg,
                    read_by: [...currentReadBy, receipt.user_id],
                  };
                }
              }
              return msg;
            })
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Subscribed to read receipts for:", conversationId);
        }
      });

    readReceiptChannelRef.current = readReceiptChannel;

    // Cleanup on unmount or conversation change
    return () => {
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
      if (readReceiptChannelRef.current) {
        supabase.removeChannel(readReceiptChannelRef.current);
        readReceiptChannelRef.current = null;
      }
    };
  }, [conversationId, currentUserId, supabase]);

  // Send message
  const sendMessage = useCallback(
    async (content: string, messageType: string = "text", attachments: any[] = []) => {
      if (!conversationId) {
        setError("No conversation selected");
        return;
      }

      if (!content.trim()) {
        return;
      }

      try {
        // Add optimistic message
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: Message = {
          id: tempId,
          content,
          sender_id: currentUserId,
          conversation_id: conversationId,
          created_at: new Date().toISOString(),
          message_type: messageType as any,
          attachments,
          reactions: {},
          read_by: [currentUserId],
          sender: {
            user_id: currentUserId,
            full_name: "You",
            username: "you",
            avatar_url: null,
          },
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        console.log("✨ Added optimistic message:", tempId);

        // Send to API
        const response = await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            content,
            message_type: messageType,
            attachments,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.statusText}`);
        }

        const responseData = await response.json();
        const sentMessage = responseData.message;

        if (!sentMessage?.id) {
          throw new Error("No message ID in response");
        }

        // Mark as processed
        processedMessageIdsRef.current.add(sentMessage.id);

        // Replace optimistic with real message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? { ...sentMessage, read_by: [currentUserId] }
              : msg
          )
        );

        console.log("✅ Message sent successfully:", sentMessage.id);
      } catch (err) {
        console.error("❌ Error sending message:", err);
        setError(err instanceof Error ? err.message : "Failed to send message");
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((msg) => !msg.id.startsWith("temp-")));
      }
    },
    [conversationId, currentUserId]
  );

  // Mark messages as read
  const markAsRead = useCallback(
    async (messageIds: string[]) => {
      if (!conversationId || messageIds.length === 0) return;

      try {
        const response = await fetch("/api/messages/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            message_ids: messageIds,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to mark messages as read");
        }

        console.log("📖 Marked as read:", messageIds.length, "messages");
      } catch (err) {
        console.error("❌ Error marking messages as read:", err);
      }
    },
    [conversationId, currentUserId]
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    markAsRead,
  };
}
