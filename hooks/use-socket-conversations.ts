"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

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
  }>;
  unread_count: number;
  is_pinned: boolean;
  is_archived: boolean;
  updated_at: string;
}

interface UseSocketConversationsProps {
  currentUserId: string;
}

export function useSocketConversations({
  currentUserId,
}: UseSocketConversationsProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Initialize socket
  useEffect(() => {
    if (!currentUserId) return;

    if (!socketRef.current) {
      socketRef.current = io(undefined, {
        auth: { userId: currentUserId },
        reconnection: true,
      });
    }

    return () => {
      // Keep connection alive
    };
  }, [currentUserId]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/conversations");

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();
      setConversations(data.conversations || []);
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError("Failed to load conversations");
      setIsLoading(false);
    }
  }, [currentUserId]);

  // Initial load and listen to updates
  useEffect(() => {
    fetchConversations();

    if (!socketRef.current) return;

    // Listen for new messages (update conversation last_message)
    const handleNewMessage = (message: any) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === message.conversation_id) {
            return {
              ...conv,
              last_message: {
                content: message.content,
                sender_name: message.sender?.full_name || "Someone",
                created_at: message.created_at,
                message_type: message.message_type,
              },
              updated_at: message.created_at,
            };
          }
          return conv;
        })
      );
    };

    // Listen for user online/offline status
    const handleUserOnline = (data: any) => {
      console.log(`✅ User ${data.userId} is online in ${data.conversationId}`);
    };

    const handleUserOffline = (data: any) => {
      console.log(`❌ User ${data.userId} went offline in ${data.conversationId}`);
    };

    socketRef.current.on("new_message", handleNewMessage);
    socketRef.current.on("user_online", handleUserOnline);
    socketRef.current.on("user_offline", handleUserOffline);

    return () => {
      socketRef.current?.off("new_message", handleNewMessage);
      socketRef.current?.off("user_online", handleUserOnline);
      socketRef.current?.off("user_offline", handleUserOffline);
    };
  }, [fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
  };
}
