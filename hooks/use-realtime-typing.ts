"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface TypingUser {
  user_id: string;
  name: string;
}

interface UseRealtimeTypingProps {
  conversationId: string | null;
  currentUserId: string;
}

export function useRealtimeTyping({
  conversationId,
  currentUserId,
}: UseRealtimeTypingProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  const supabase = createClient();
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingUsersTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(
    new Map()
  );
  const userTypingRef = useRef(false);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async () => {
    if (!conversationId) return;

    // Don't send too frequently
    if (userTypingRef.current) {
      // Reset the auto-stop timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } else {
      userTypingRef.current = true;
    }

    try {
      await fetch(`/api/conversations/${conversationId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      console.log("⌨️ Typing indicator sent");
    } catch (err) {
      console.error("Error sending typing indicator:", err);
    }

    // Auto-stop typing after 3 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTypingIndicator();
    }, 3000);
  }, [conversationId]);

  // Stop typing indicator
  const stopTypingIndicator = useCallback(async () => {
    if (!conversationId || !userTypingRef.current) return;

    userTypingRef.current = false;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    try {
      await fetch(`/api/conversations/${conversationId}/typing`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      console.log("⌨️ Typing indicator stopped");
    } catch (err) {
      console.error("Error stopping typing indicator:", err);
    }
  }, [conversationId]);

  // Set up real-time subscription for typing indicators
  useEffect(() => {
    if (!conversationId || !currentUserId) {
      setTypingUsers([]);
      return;
    }

    // Clean up previous channel
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }

    // Subscribe to typing indicators using postgres_changes
    const typingChannel = supabase
      .channel(`typing:${conversationId}`, { config: { private: true } })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_typing_indicators",
        },
        async (payload: any) => {
          const indicator = payload.new;

          // Client-side filtering - only for this conversation
          if (indicator.conversation_id !== conversationId) return;

          // Ignore own typing indicator
          if (indicator.user_id === currentUserId) {
            console.log("⏭️ Ignoring own typing indicator");
            return;
          }

          console.log("⌨️ Typing indicator received from:", indicator.user_id);

          // Fetch user info
          const { data: user } = await supabase
            .from("users")
            .select("user_id, full_name, username")
            .eq("user_id", indicator.user_id)
            .single();

          if (user) {
            setTypingUsers((prev) => {
              const exists = prev.some((u) => u.user_id === user.user_id);
              if (exists) {
                // Update timeout for existing typing user
                const existingTimeout = typingUsersTimeoutRef.current.get(
                  user.user_id
                );
                if (existingTimeout) {
                  clearTimeout(existingTimeout);
                }
              } else {
                // Add new typing user
                return [
                  ...prev,
                  {
                    user_id: user.user_id,
                    name: user.full_name || user.username || "Someone",
                  },
                ];
              }
              return prev;
            });

            // Auto-remove typing indicator after 5 seconds of inactivity
            const existingTimeout = typingUsersTimeoutRef.current.get(
              user.user_id
            );
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }

            const newTimeout = setTimeout(() => {
              console.log("⏱️ Removing typing indicator for:", user.user_id);
              setTypingUsers((prev) =>
                prev.filter((u) => u.user_id !== user.user_id)
              );
              typingUsersTimeoutRef.current.delete(user.user_id);
            }, 5000);

            typingUsersTimeoutRef.current.set(user.user_id, newTimeout);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Subscribed to typing indicators for conversation:", conversationId);
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Channel error subscribing to typing indicators");
        }
      });

    typingChannelRef.current = typingChannel;

    // Cleanup on unmount or conversation change
    return () => {
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingUsersTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      typingUsersTimeoutRef.current.clear();
    };
  }, [conversationId, currentUserId, supabase]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingUsersTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      typingUsersTimeoutRef.current.clear();

      // Notify server that user stopped typing on unmount
      if (conversationId && userTypingRef.current) {
        fetch(`/api/conversations/${conversationId}/typing`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }).catch(console.error);
      }
    };
  }, [conversationId]);

  return {
    typingUsers,
    sendTypingIndicator,
    stopTypingIndicator,
  };
}
