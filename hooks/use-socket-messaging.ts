"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { createServiceClient } from "@/utils/supabase/service";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  message_type: "text" | "image" | "file" | "code_snippet" | "problem_link";
  attachments?: any[];
  reactions?: Record<string, string[]>;
  is_edited?: boolean;
  edited_at?: string;
  read_by?: string[];
  sender?: {
    user_id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface UseSocketMessagingProps {
  conversationId: string | null;
  currentUserId: string;
}

export function useSocketMessaging({
  conversationId,
  currentUserId,
}: UseSocketMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const markedAsReadRef = useRef<Set<string>>(new Set());

  // Initialize socket connection
  useEffect(() => {
    if (!currentUserId) return;

    if (!socketRef.current) {
      socketRef.current = io(undefined, {
        auth: {
          userId: currentUserId,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socketRef.current.on("connect", () => {
        console.log("🔌 Socket connected:", socketRef.current?.id);
      });

      socketRef.current.on("disconnect", () => {
        console.log("🔌 Socket disconnected");
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error);
      });
    }

    return () => {
      // Don't disconnect on unmount, keep connection alive
    };
  }, [currentUserId]);

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

      const response = await fetch(
        `/api/conversations/${conversationId}/messages`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      setMessages(data.messages || []);
      markedAsReadRef.current.clear();
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages");
      setIsLoading(false);
    }
  }, [conversationId]);

  // Join conversation and listen to events
  useEffect(() => {
    if (!conversationId || !socketRef.current) return;

    // Fetch initial messages
    fetchMessages();

    // Join conversation room
    socketRef.current.emit("join_conversation", conversationId);
    console.log(`👥 Joining conversation: ${conversationId}`);

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      console.log("💬 New message received:", message.id);
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    };

    // Listen for read receipts
    const handleMessagesRead = (data: any) => {
      const { userId, messageIds } = data;
      console.log(`📖 Messages read by ${userId}:`, messageIds);

      setMessages((prev) =>
        prev.map((msg) => {
          if (messageIds.includes(msg.id)) {
            const currentReadBy = msg.read_by || [];
            if (!currentReadBy.includes(userId)) {
              return {
                ...msg,
                read_by: [...currentReadBy, userId],
              };
            }
          }
          return msg;
        })
      );
    };

    socketRef.current.on("new_message", handleNewMessage);
    socketRef.current.on("messages_read", handleMessagesRead);

    return () => {
      socketRef.current?.off("new_message", handleNewMessage);
      socketRef.current?.off("messages_read", handleMessagesRead);
      socketRef.current?.emit("leave_conversation", conversationId);
    };
  }, [conversationId, fetchMessages]);

  // Send message
  const sendMessage = useCallback(
    async (
      content: string,
      messageType: string = "text",
      attachments: any[] = []
    ) => {
      if (!conversationId || !socketRef.current || !socketRef.current.connected) {
        setError("Not connected to server");
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
        setMessages((prev) => [...prev, optimisticMessage]);
        console.log("✨ Added optimistic message:", messageId);

        // Send via Socket.io (API route will save to DB)
        socketRef.current.emit("send_message", {
          conversationId,
          content,
          messageType,
          attachments,
          messageId,
        });

        // API also saves to database
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
          throw new Error("Failed to send message");
        }

        const { data: savedMessage } = await response.json();

        // Replace optimistic with real message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...savedMessage,
                  read_by: [currentUserId],
                }
              : msg
          )
        );

        console.log("✅ Message sent successfully:", savedMessage.id);
      } catch (err) {
        console.error("Error sending message:", err);
        setError("Failed to send message");

        // Remove optimistic message on error
        setMessages((prev) =>
          prev.filter((msg) => !msg.id.startsWith("temp-"))
        );
      }
    },
    [conversationId, currentUserId]
  );

  // Mark messages as read
  const markAsRead = useCallback(
    async (messageIds: string[]) => {
      if (!conversationId || !socketRef.current || messageIds.length === 0) {
        return;
      }

      try {
        // Filter out already marked messages
        const toMark = messageIds.filter(
          (id) => !markedAsReadRef.current.has(id)
        );

        if (toMark.length === 0) return;

        // Mark as processed before making the request
        toMark.forEach((id) => markedAsReadRef.current.add(id));

        // Broadcast via Socket.io
        socketRef.current.emit("mark_read", {
          conversationId,
          messageIds: toMark,
        });

        // Also save to database
        await fetch("/api/messages/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            message_ids: toMark,
          }),
        });

        console.log("📖 Marked as read:", toMark.length, "messages");
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    },
    [conversationId]
  );

  // Auto-mark visible messages as read
  useEffect(() => {
    if (!currentUserId || !conversationId) return;

    const unreadMessageIds = messages
      .filter(
        (msg) =>
          msg.sender_id !== currentUserId &&
          !msg.read_by?.includes(currentUserId) &&
          !markedAsReadRef.current.has(msg.id)
      )
      .map((msg) => msg.id);

    if (unreadMessageIds.length > 0) {
      // Small delay to batch multiple marks
      const timer = setTimeout(() => {
        markAsRead(unreadMessageIds);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [messages, currentUserId, conversationId, markAsRead]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    markAsRead,
  };
}
