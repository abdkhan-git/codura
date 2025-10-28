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
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

export function useReadReceipts({
  conversationId,
  messages,
  currentUserId,
  enabled = true,
  scrollContainerRef,
}: UseReadReceiptsOptions) {
  const supabase = createClient();
  const [readReceipts, setReadReceipts] = useState<Record<string, any[]>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const markedIdsRef = useRef<Set<string>>(new Set());
  const refetchTimeoutRef = useRef<NodeJS.Timeout>();
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch read receipts for current messages
  const fetchReadReceipts = useCallback(async () => {
    if (!conversationId || messages.length === 0) return;

    const messageIds = messages.map((m) => m.id);
    const receipts = await getReadReceipts(messageIds);
    setReadReceipts(receipts);
  }, [conversationId, messages]);

  // Mark all unread messages from other users as read on mount
  useEffect(() => {
    if (!enabled || !conversationId || !currentUserId || messages.length === 0) return;

    // Get all messages from other users that haven't been marked
    const messagesToMark = messages
      .filter((m) => m.sender_id !== currentUserId && !markedIdsRef.current.has(m.id))
      .map((m) => m.id);

    if (messagesToMark.length > 0) {
      // Mark as read immediately - don't wait
      markMessagesAsRead(messagesToMark);

      // Track that we've marked these
      messagesToMark.forEach((id) => markedIdsRef.current.add(id));

      // Refetch receipts after a short delay to ensure DB has processed
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
      refetchTimeoutRef.current = setTimeout(() => {
        fetchReadReceipts();
      }, 100);
    }
  }, [conversationId, currentUserId, messages, enabled, fetchReadReceipts]);

  // Initial fetch of read receipts
  useEffect(() => {
    if (enabled) {
      fetchReadReceipts();
    }
  }, [enabled, fetchReadReceipts]);

  // Subscribe to read receipt updates - handles both sender and receiver seeing reads
  useEffect(() => {
    if (!conversationId || !enabled) return;

    const messageIds = messages.map((m) => m.id);
    if (messageIds.length === 0) return;

    // Subscribe to new read receipts being inserted
    const channel = supabase
      .channel(`read-receipts:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_read_receipts",
        },
        (payload) => {
          // Check if the new receipt is for a message in this conversation
          const newReceipt = payload.new as any;
          if (messageIds.includes(newReceipt.message_id)) {
            // Immediately update UI without waiting for full refetch
            setReadReceipts((prev) => {
              const updated = { ...prev };
              if (!updated[newReceipt.message_id]) {
                updated[newReceipt.message_id] = [];
              }

              // Check if this user already has a receipt for this message
              const existingIndex = updated[newReceipt.message_id].findIndex(
                (r: any) => r.user_id === newReceipt.user_id
              );

              if (existingIndex === -1) {
                // Add new receipt - fetch user data in background
                updated[newReceipt.message_id].push({
                  user_id: newReceipt.user_id,
                  read_at: newReceipt.read_at,
                  user: { user_id: newReceipt.user_id, full_name: "User", avatar_url: null },
                });
              }

              return updated;
            });

            // Refetch in background to get latest user data
            setTimeout(() => {
              fetchReadReceipts();
            }, 50);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, enabled, messages, fetchReadReceipts, supabase]);

  // Setup scroll detection - mark messages as read when scrolled to bottom
  useEffect(() => {
    if (!enabled || !scrollContainerRef?.current) return;

    const container = scrollContainerRef.current;

    const handleScroll = () => {
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Debounce scroll events
      scrollTimeoutRef.current = setTimeout(() => {
        // Check if scrolled to bottom (within 100px)
        const isAtBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 100;

        if (isAtBottom && messages.length > 0) {
          // Mark all visible messages from others as read
          const messagesToMark = messages
            .filter((m) => m.sender_id !== currentUserId && !markedIdsRef.current.has(m.id))
            .map((m) => m.id);

          if (messagesToMark.length > 0) {
            markMessagesAsRead(messagesToMark);
            messagesToMark.forEach((id) => markedIdsRef.current.add(id));
          }
        }
      }, 100);
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [enabled, scrollContainerRef, messages, currentUserId]);

  // Setup Intersection Observer for messages that appear after initial mount
  useEffect(() => {
    if (!enabled || !conversationId || !currentUserId) return;

    // Cleanup existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Collect all newly visible messages
        const visibleMessages = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => ({
            messageId: entry.target.getAttribute("data-message-id"),
            senderId: entry.target.getAttribute("data-sender-id"),
          }))
          .filter(
            (msg) =>
              msg.messageId &&
              msg.senderId &&
              msg.senderId !== currentUserId &&
              !markedIdsRef.current.has(msg.messageId)
          );

        // Mark all visible messages at once
        if (visibleMessages.length > 0) {
          const messagesToMark = visibleMessages.map((m) => m.messageId as string);
          markMessagesAsRead(messagesToMark);
          messagesToMark.forEach((id) => markedIdsRef.current.add(id));
        }
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
    };
  }, [enabled, conversationId, currentUserId, messages]);

  // Manually mark a message as read (for immediate reads like clicking)
  const markAsRead = useCallback(
    (messageId: string) => {
      if (!markedIdsRef.current.has(messageId)) {
        markMessageAsRead(messageId);
        markedIdsRef.current.add(messageId);
        // Refetch after brief delay
        setTimeout(() => {
          fetchReadReceipts();
        }, 50);
      }
    },
    [fetchReadReceipts]
  );

  return {
    readReceipts,
    markAsRead,
  };
}
