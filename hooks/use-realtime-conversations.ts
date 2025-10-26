"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

interface UseRealtimeConversationsProps {
  currentUserId: string;
}

export function useRealtimeConversations({
  currentUserId,
}: UseRealtimeConversationsProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const messagesChannelRef = useRef<RealtimeChannel | null>(null);
  const conversationsLoadedRef = useRef(false);

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
      conversationsLoadedRef.current = true;
      setIsLoading(false);

      console.log("💬 Conversations loaded:", data.conversations?.length || 0);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError("Failed to load conversations");
      setIsLoading(false);
    }
  }, [currentUserId]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!currentUserId) return;

    // Clean up previous channel
    if (messagesChannelRef.current) {
      supabase.removeChannel(messagesChannelRef.current);
      messagesChannelRef.current = null;
    }

    // Subscribe to all new messages to update last_message in conversations
    const messageChannel = supabase
      .channel("all-new-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload: any) => {
          const newMessage = payload.new as any;

          console.log("💬 New message in conversation:", newMessage.conversation_id);

          // Optimization: Check if conversation exists before fetching sender info
          setConversations((prev) => {
            const conversationExists = prev.some((conv) => conv.id === newMessage.conversation_id);

            if (!conversationExists) {
              console.log("⏭️ Skipping message for conversation not in list:", newMessage.conversation_id);
              return prev;
            }

            return prev;
          });

          // Fetch sender info only if conversation exists
          const { data: sender } = await supabase
            .from("users")
            .select("user_id, full_name, username")
            .eq("user_id", newMessage.sender_id)
            .single();

          // Update conversations list with new last_message
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id === newMessage.conversation_id) {
                return {
                  ...conv,
                  last_message: {
                    content: newMessage.content,
                    sender_name: sender?.full_name || sender?.username || "Unknown",
                    created_at: newMessage.created_at,
                    message_type: newMessage.message_type,
                  },
                  updated_at: newMessage.created_at,
                };
              }
              return conv;
            })
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Subscribed to new messages for conversations");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Channel error subscribing to messages");
        }
      });

    messagesChannelRef.current = messageChannel;

    return () => {
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }
    };
  }, [currentUserId, supabase]);

  // Fetch conversations on mount only
  useEffect(() => {
    if (!currentUserId) return;

    if (!conversationsLoadedRef.current) {
      fetchConversations();
    }
  }, [currentUserId, fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
  };
}
