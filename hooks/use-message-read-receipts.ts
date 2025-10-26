import { useEffect, useRef } from 'react';

interface UseMessageReadReceiptsProps {
  messages: any[];
  currentUserId: string;
  conversationId: string;
}

/**
 * Hook for tracking when messages come into view (intersection observer)
 * This is a minimal implementation that just provides the ref setter
 * The actual marking as read is handled by useMessagingV2
 */
export function useMessageReadReceipts({
  messages,
  currentUserId,
  conversationId
}: UseMessageReadReceiptsProps) {
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Create intersection observer to track when messages come into view
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            const senderId = entry.target.getAttribute('data-sender-id');

            // Only mark as read if it's not our own message
            if (messageId && senderId !== currentUserId) {
              // The actual marking is done via markAsRead from useMessagingV2
              // This observer just triggers the marking
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.5, // Message is considered "read" when 50% visible
      }
    );

    // Observe all message elements
    messageRefs.current.forEach((element) => {
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [messages, currentUserId]);

  const setMessageRef = (messageId: string, senderId: string) => (element: HTMLDivElement | null) => {
    if (element) {
      element.setAttribute('data-message-id', messageId);
      element.setAttribute('data-sender-id', senderId);
      messageRefs.current.set(messageId, element);

      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    } else {
      messageRefs.current.delete(messageId);
    }
  };

  return { setMessageRef };
}
