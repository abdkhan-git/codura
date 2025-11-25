"use client";

import React, { useState, useEffect } from "react";
import { usePublicInterview } from "@/contexts/public-interview-context";
import { PublicInterviewWindow } from "./public-interview-window";

interface UserData {
  name: string;
  email: string;
  avatar: string;
  user_id?: string;
}

/**
 * Global wrapper for PublicInterviewWindow that fetches user data
 * and renders the window when activeSession exists
 */
export function PublicInterviewGlobalWindow() {
  const { activeSession, isWindowOpen } = usePublicInterview();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user data only when activeSession first becomes available
  // Don't refetch on activeSession updates to prevent window flicker
  useEffect(() => {
    if (!activeSession) {
      setUser(null);
      return;
    }

    // Only fetch if we don't already have user data
    if (user) {
      return;
    }

    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/users/me');
        if (!response.ok) throw new Error('Failed to fetch user data');
        const data = await response.json();

        setUser({
          name: data.full_name || data.username || 'User',
          email: data.email || '',
          avatar: data.avatar_url || data.username?.charAt(0).toUpperCase() || 'U',
          user_id: data.id,
        });
      } catch (error) {
        console.error('Error fetching user for public interview window:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [activeSession, user]);

  // Don't render if no active session, no user data, or window is closed
  if (!activeSession || !user || isLoading || !isWindowOpen) {
    return null;
  }

  return <PublicInterviewWindow user={user} onClose={() => {}} />;
}
