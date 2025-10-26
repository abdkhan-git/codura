"use client";

import { useState, useEffect, useCallback } from "react";

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

        // Update local state
        setMessages((prev) =>
          prev.map((msg) =>
            messageIds.includes(msg.id)
              ? {
                  ...msg,
                  read_by: Array.from(
                    new Set([...(msg.read_by || []), currentUserId])
                  ),
                }
              : msg
          )
        );

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
