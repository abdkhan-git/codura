import { useEffect, useRef } from 'react';

interface UseMessageReadReceiptsProps {
  messages: any[];
  currentUserId: string;
  conversationId: string;
}

export function useMessageReadReceipts({
  messages,
  currentUserId,
  conversationId
}: UseMessageReadReceiptsProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const readMessages = useRef<Set<string>>(new Set());

  const markMessageAsRead = async (messageId: string) => {
    // Enhanced validation for message ID
    if (!messageId || messageId === 'temp-' || messageId.startsWith('temp-') || messageId === 'undefined' || messageId === 'null') {
      console.log('Skipping invalid message ID:', messageId);
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(messageId)) {
      console.log('Invalid UUID format for message ID:', messageId);
      return;
    }

    // Don't mark the same message as read multiple times
    if (readMessages.current.has(messageId)) {
      console.log('Message already marked as read:', messageId);
      return;
    }

    try {
      console.log('Attempting to mark message as read:', messageId);
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to mark message as read:', errorData.error || 'Unknown error');
        console.error('Response status:', response.status);
        console.error('Message ID:', messageId);
        return;
      } else {
        console.log('Message marked as read:', messageId);
        readMessages.current.add(messageId);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

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
              markMessageAsRead(messageId);
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
