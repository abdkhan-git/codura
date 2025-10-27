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

/**
 * Bulletproof real-time typing indicators hook
 *
 * Implementation strategy: Postgres Changes + RLS
 * - Server-side filter by conversation_id
 * - Real-time sync of typing_indicators table
 * - 3-second debounce on client send
 * - 5-second auto-cleanup of received indicators
 *
 * RLS Policy allows users to see typing indicators in conversations they're in
 */
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
  const lastSendTimeRef = useRef(0);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async () => {
    if (!conversationId) return;

    // Debounce: Don't send more than once per 1 second
    const now = Date.now();
    if (now - lastSendTimeRef.current < 1000) {
      return;
    }
    lastSendTimeRef.current = now;

    // Track typing state
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

      console.log("⌨️  Typing indicator sent");
    } catch (err) {
      console.error("❌ Error sending typing indicator:", err);
    }

    // Auto-stop after 3 seconds of inactivity
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
      });

      console.log("⌨️  Typing indicator stopped");
    } catch (err) {
      console.error("❌ Error stopping typing indicator:", err);
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

    const setupTypingChannel = async () => {
      // Ensure auth is set for realtime
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          supabase.realtime.setAuth(session.access_token);
        }
      } catch (err) {
        console.error("⚠️  Could not set realtime auth:", err);
      }

      // Subscribe to typing indicators
      const typingChannel = supabase
        .channel(`typing-${conversationId}`, { config: { private: true } })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "conversation_typing_indicators",
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload: any) => {
            const indicator = payload.new;

            // Ignore own typing indicator
            if (indicator.user_id === currentUserId) {
              return;
            }

            console.log("⌨️  User typing:", indicator.user_id);

            // Fetch user info
            const { data: user } = await supabase
              .from("users")
              .select("user_id, full_name, username")
              .eq("user_id", indicator.user_id)
              .single();

            if (user) {
              setTypingUsers((prev) => {
                const exists = prev.some((u) => u.user_id === user.user_id);

                // Clear existing timeout if user is already typing
                if (exists) {
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

              // Set 5-second timeout to remove typing indicator
              const existingTimeout = typingUsersTimeoutRef.current.get(
                user.user_id
              );
              if (existingTimeout) {
                clearTimeout(existingTimeout);
              }

              const newTimeout = setTimeout(() => {
                console.log("⏱️  Typing timeout for:", user.user_id);
                setTypingUsers((prev) =>
                  prev.filter((u) => u.user_id !== user.user_id)
                );
                typingUsersTimeoutRef.current.delete(user.user_id);
              }, 5000);

              typingUsersTimeoutRef.current.set(user.user_id, newTimeout);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "conversation_typing_indicators",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: any) => {
            const indicator = payload.old;

            if (indicator.user_id === currentUserId) {
              return;
            }

            console.log("🛑 Typing stopped:", indicator.user_id);

            // Clear timeout immediately
            const timeout = typingUsersTimeoutRef.current.get(indicator.user_id);
            if (timeout) {
              clearTimeout(timeout);
              typingUsersTimeoutRef.current.delete(indicator.user_id);
            }

            // Remove immediately
            setTypingUsers((prev) =>
              prev.filter((u) => u.user_id !== indicator.user_id)
            );
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✅ Subscribed to typing indicators:", conversationId);
          } else if (status === "CHANNEL_ERROR") {
            console.error("❌ Channel error subscribing to typing indicators");
          }
        });

      typingChannelRef.current = typingChannel;
    };

    setupTypingChannel();

    // Cleanup on unmount or conversation change
    return () => {
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }

      // Clear all timeouts
      typingUsersTimeoutRef.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      typingUsersTimeoutRef.current.clear();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing when leaving conversation
      stopTypingIndicator();
    };
  }, [conversationId, currentUserId, supabase, stopTypingIndicator]);

  return {
    typingUsers,
    sendTypingIndicator,
    stopTypingIndicator,
  };
}
