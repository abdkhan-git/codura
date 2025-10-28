"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  getReadReceipts,
  markMessagesAsRead,
  markMessageAsRead,
} from "@/lib/messaging-utils";

interface UseReadReceiptsOptions {
  conversationId: string | null;
  messages: any[];
  currentUserId: string | null;
  enabled?: boolean;
}

export function useReadReceipts({
  conversationId,
  messages,
  currentUserId,
  enabled = true,
}: UseReadReceiptsOptions) {
  const supabase = createClient();
  const [readReceipts, setReadReceipts] = useState<Record<string, any[]>>({});
  const [isTabFocused, setIsTabFocused] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pendingReadsRef = useRef<Set<string>>(new Set());
  const batchTimeoutRef = useRef<NodeJS.Timeout>();

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabFocused(!document.hidden);
    };

    const handleFocus = () => setIsTabFocused(true);
    const handleBlur = () => setIsTabFocused(false);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Batch mark messages as read
  const flushPendingReads = useCallback(async () => {
    if (pendingReadsRef.current.size === 0) return;

    const messageIds = Array.from(pendingReadsRef.current);
    pendingReadsRef.current.clear();

    try {
      await markMessagesAsRead(messageIds);
    } catch (error) {
      console.error("Failed to batch mark messages as read:", error);
    }
  }, []);

  // Queue a message to be marked as read
  const queueMessageRead = useCallback(
    (messageId: string) => {
      pendingReadsRef.current.add(messageId);

      // Clear existing timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      // Batch reads every 500ms
      batchTimeoutRef.current = setTimeout(() => {
        flushPendingReads();
      }, 500);
    },
    [flushPendingReads]
  );

  // Fetch read receipts for current messages
  const fetchReadReceipts = useCallback(async () => {
    if (!conversationId || messages.length === 0) return;

    const messageIds = messages.map((m) => m.id);
    const receipts = await getReadReceipts(messageIds);
    setReadReceipts(receipts);
  }, [conversationId, messages]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchReadReceipts();
    }
  }, [enabled, fetchReadReceipts]);

  // Subscribe to read receipt updates
  useEffect(() => {
    if (!conversationId || !enabled) return;

    const messageIds = messages.map((m) => m.id);
    if (messageIds.length === 0) return;

    const channel = supabase
      .channel(`read-receipts:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_read_receipts",
        },
        async (payload) => {
          // Check if the new receipt is for a message in this conversation
          const newReceipt = payload.new as any;
          if (messageIds.includes(newReceipt.message_id)) {
            // Refetch all receipts
            await fetchReadReceipts();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, enabled, messages, fetchReadReceipts, supabase]);

  // Setup Intersection Observer for viewport detection
  useEffect(() => {
    if (!enabled || !isTabFocused || !conversationId || !currentUserId) return;

    // Cleanup existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute("data-message-id");
            const senderId = entry.target.getAttribute("data-sender-id");

            // Only mark as read if message is from someone else
            if (
              messageId &&
              senderId &&
              senderId !== currentUserId &&
              isTabFocused
            ) {
              queueMessageRead(messageId);
            }
          }
        });
      },
      {
        threshold: 0.5, // Message must be 50% visible
        root: null, // Use viewport as root
      }
    );

    // Observe all message elements
    const messageElements = document.querySelectorAll("[data-message-id]");
    messageElements.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
      // Flush any pending reads on cleanup
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      flushPendingReads();
    };
  }, [
    enabled,
    isTabFocused,
    conversationId,
    currentUserId,
    messages,
    queueMessageRead,
    flushPendingReads,
  ]);

  // Manually mark a message as read (for immediate reads like clicking)
  const markAsRead = useCallback(
    async (messageId: string) => {
      await markMessageAsRead(messageId);
      await fetchReadReceipts();
    },
    [fetchReadReceipts]
  );

  return {
    readReceipts,
    markAsRead,
    isTabFocused,
  };
}
