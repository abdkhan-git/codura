"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  notification_type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  priority: string;
  metadata: any;
  created_at: string;
  actor?: {
    user_id: string;
    full_name: string;
    username: string;
    avatar_url?: string;
  };
}

interface UseRealtimeNotificationsProps {
  currentUserId: string;
  limit?: number;
  unreadOnly?: boolean;
}

export function useRealtimeNotifications({
  currentUserId,
  limit = 10,
  unreadOnly = false,
}: UseRealtimeNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const supabase = createClient();

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/notifications?limit=${limit}&unread_only=${unreadOnly}`
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(
          data.notifications.filter((n: Notification) => !n.read).length
        );
      } else {
        console.error("Failed to fetch notifications");
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [limit, unreadOnly]);

  // Subscribe to real-time notification updates
  useEffect(() => {
    if (!currentUserId) return;

    // Initial fetch
    fetchNotifications();

    // Create channel for this user's notifications
    const newChannel = supabase.channel(`notifications:${currentUserId}`);

    // Subscribe to new notifications
    newChannel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          console.log("New notification received:", payload);

          // Fetch full notification with actor details
          const { data: notification } = await supabase
            .from("notifications")
            .select(
              `
              *,
              actor:actor_id (
                user_id,
                full_name,
                username,
                avatar_url
              )
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (notification) {
            setNotifications((prev) => [notification, ...prev].slice(0, limit));
            if (!notification.read) {
              setUnreadCount((prev) => prev + 1);
            }
          }
        }
      )
      // Subscribe to notification updates (mark as read, etc.)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log("Notification updated:", payload);

          setNotifications((prev) =>
            prev.map((n) =>
              n.id === payload.new.id
                ? { ...n, ...(payload.new as any) }
                : n
            )
          );

          // Update unread count
          const wasRead = (payload.old as any)?.read;
          const isRead = (payload.new as any)?.read;

          if (!wasRead && isRead) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          } else if (wasRead && !isRead) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      // Subscribe to notification deletions
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log("Notification deleted:", payload);

          const deletedNotification = notifications.find(
            (n) => n.id === (payload.old as any).id
          );

          setNotifications((prev) =>
            prev.filter((n) => n.id !== (payload.old as any).id)
          );

          if (deletedNotification && !deletedNotification.read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        console.log("Notifications subscription status:", status);
      });

    setChannel(newChannel);

    // Cleanup
    return () => {
      newChannel.unsubscribe();
      setChannel(null);
    };
  }, [currentUserId, limit, fetchNotifications, supabase]);

  // Mark notification(s) as read
  const markAsRead = useCallback(
    async (notificationIds: string[]) => {
      try {
        const response = await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notification_ids: notificationIds,
            read: true,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to mark notifications as read");
        }

        // Optimistically update UI
        setNotifications((prev) =>
          prev.map((notification) =>
            notificationIds.includes(notification.id)
              ? { ...notification, read: true }
              : notification
          )
        );

        setUnreadCount((prev) => Math.max(0, prev - notificationIds.length));

        return true;
      } catch (error) {
        console.error("Error marking notifications as read:", error);
        return false;
      }
    },
    []
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter((n) => !n.read);
    if (unreadNotifications.length === 0) return true;

    return markAsRead(unreadNotifications.map((n) => n.id));
  }, [notifications, markAsRead]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isConnected: channel?.state === "joined",
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
