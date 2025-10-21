"use client";

import { useState, useEffect } from "react";
import { FloatingMessagingWidget } from "./floating-messaging-widget";

export function MessagingWidgetWrapper() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setUser({
          id: data.user?.id,
          name: data.profile?.full_name || data.user?.email?.split('@')[0] || 'User',
          email: data.user?.email || '',
          avatar: data.profile?.avatar_url || '',
          username: data.profile?.username || '',
        });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show the widget for authenticated users
  if (isLoading || !user?.id) {
    return null;
  }

  return <FloatingMessagingWidget currentUserId={user.id} />;
}


