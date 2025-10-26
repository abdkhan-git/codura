"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface TypingUser {
  user_id: string;
  name: string;
}

interface UseSocketTypingProps {
  conversationId: string | null;
  currentUserId: string;
}

export function useSocketTyping({
  conversationId,
  currentUserId,
}: UseSocketTypingProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingUsersTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Initialize socket (reuse from messaging hook or create new)
  useEffect(() => {
    if (!currentUserId) return;

    // Try to reuse existing socket or create new one
    if (!socketRef.current) {
      socketRef.current = io(undefined, {
        auth: { userId: currentUserId },
        reconnection: true,
      });
    }

    return () => {
      // Don't disconnect
    };
  }, [currentUserId]);

  // Join conversation and listen to typing events
  useEffect(() => {
    if (!conversationId || !socketRef.current) return;

    socketRef.current.emit("join_conversation", conversationId);

    // Listen for user typing
    const handleUserTyping = async (data: any) => {
      const { userId } = data;

      // Ignore own typing indicator
      if (userId === currentUserId) return;

      // Fetch user info
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) return;

        const user = await response.json();

        setTypingUsers((prev) => {
          const exists = prev.some((u) => u.user_id === userId);
          if (exists) {
            // Clear existing timeout
            const existingTimeout = typingUsersTimeoutRef.current.get(userId);
            if (existingTimeout) clearTimeout(existingTimeout);
          } else {
            return [
              ...prev,
              {
                user_id: userId,
                name: user.full_name || user.username || "Someone",
              },
            ];
          }
          return prev;
        });

        // Set timeout to remove after 5 seconds
        const timeout = setTimeout(() => {
          setTypingUsers((prev) =>
            prev.filter((u) => u.user_id !== userId)
          );
          typingUsersTimeoutRef.current.delete(userId);
        }, 5000);

        typingUsersTimeoutRef.current.set(userId, timeout);
      } catch (err) {
        console.error("Error fetching user info:", err);
      }
    };

    // Listen for user stop typing
    const handleUserStopTyping = (data: any) => {
      const { userId } = data;
      const timeout = typingUsersTimeoutRef.current.get(userId);
      if (timeout) clearTimeout(timeout);
      typingUsersTimeoutRef.current.delete(userId);
      setTypingUsers((prev) => prev.filter((u) => u.user_id !== userId));
    };

    socketRef.current.on("user_typing", handleUserTyping);
    socketRef.current.on("user_stop_typing", handleUserStopTyping);

    return () => {
      socketRef.current?.off("user_typing", handleUserTyping);
      socketRef.current?.off("user_stop_typing", handleUserStopTyping);
      socketRef.current?.emit("leave_conversation", conversationId);

      // Clear all timeouts
      typingUsersTimeoutRef.current.forEach((timeout) =>
        clearTimeout(timeout)
      );
      typingUsersTimeoutRef.current.clear();
    };
  }, [conversationId, currentUserId]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(() => {
    if (!conversationId || !socketRef.current || !socketRef.current.connected)
      return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing event
    socketRef.current.emit("typing", conversationId);
    console.log("⌨️ Typing indicator sent");

    // Auto-stop after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stop_typing", conversationId);
      console.log("⌨️ Stop typing sent");
    }, 3000);
  }, [conversationId]);

  return {
    typingUsers,
    sendTypingIndicator,
  };
}
