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

  // Fetch conversations on mount only
  useEffect(() => {
    if (!currentUserId) return;

    if (!conversationsLoadedRef.current) {
      fetchConversations();
    }
  }, [currentUserId]); // Don't include fetchConversations to avoid re-runs

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchConversations,
  };
}
