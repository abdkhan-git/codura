"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { FloatingMessenger } from "@/components/messaging/floating-messenger";

export function MessagingProvider() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user?.id || null);

      // CRITICAL: Set up realtime auth with current session
      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          supabase.realtime.setAuth(session.access_token);
          console.log("✅ Realtime auth initialized for user:", user.id);
        }
      }

      setIsLoading(false);

      // Listen to auth changes and update realtime auth whenever user logs in/out
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("🔄 Auth state changed:", event);

        if (session?.access_token) {
          // Update realtime connection with new access token
          supabase.realtime.setAuth(session.access_token);
          console.log("✅ Realtime auth updated");
          setUserId(session.user?.id || null);
        } else {
          // User signed out
          setUserId(null);
          console.log("👋 User signed out");
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    };

    initializeAuth();
  }, []);

  // Only render the messenger if user is authenticated
  if (isLoading || !userId) {
    return null;
  }

  return <FloatingMessenger currentUserId={userId} />;
}
