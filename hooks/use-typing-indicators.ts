"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface TypingUser {
  user_id: string;
  name: string;
}

interface UseTypingIndicatorsProps {
  conversationId: string | null;
  currentUserId: string;
}

export function useTypingIndicators({ conversationId, currentUserId }: UseTypingIndicatorsProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingUsersTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Set up real-time subscription for typing indicators
  useEffect(() => {
    if (!conversationId || !currentUserId) {
      setTypingUsers([]);
      return;
    }

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Subscribe to typing indicators using postgres_changes
    const channel = supabase
      .channel(`conversation:${conversationId}:typing`, { config: { private: true } })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_typing_indicators', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const indicator = payload.new as any;

          console.log('⌨️ Typing indicator event received:', {
            userId: indicator.user_id,
            conversationId: indicator.conversation_id
          });

          // Ignore own typing indicator
          if (indicator.user_id === currentUserId) return;

          // Fetch user info
          const { data: user } = await supabase
            .from('users')
            .select('user_id, full_name, username')
            .eq('user_id', indicator.user_id)
            .single();

          if (user) {
            setTypingUsers(prev => {
              const exists = prev.some(u => u.user_id === user.user_id);
              if (exists) return prev;

              return [...prev, {
                user_id: user.user_id,
                name: user.full_name || user.username || 'Someone'
              }];
            });

            // Auto-remove after 5 seconds
            const timeout = setTimeout(() => {
              setTypingUsers(prev => prev.filter(u => u.user_id !== user.user_id));
            }, 5000);

            typingUsersTimeoutRef.current.set(user.user_id, timeout);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to typing indicators for conversation:', conversationId);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      typingUsersTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingUsersTimeoutRef.current.clear();
    };
  }, [conversationId, currentUserId, supabase]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async () => {
    if (!conversationId) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      // Send typing indicator
      const response = await fetch(`/api/conversations/${conversationId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        console.log('⌨️ Typing indicator sent');
      }

      // Auto-stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(async () => {
        // No explicit stop needed - the indicator will expire
      }, 3000);

    } catch (err) {
      console.error('Error sending typing indicator:', err);
    }
  }, [conversationId]);

  return {
    typingUsers,
    sendTypingIndicator,
  };
}
