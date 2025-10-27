"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { initializeRealtimeAuth, updateRealtimeAuth } from "@/lib/realtime-auth";
import { FloatingMessenger } from "@/components/messaging/floating-messenger";

export function MessagingProvider() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeMessaging = async () => {
      const supabase = createClient();

      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setUserId(user?.id || null);

        // CRITICAL: Initialize global realtime auth FIRST
        // This ensures all future subscriptions have auth context
        if (user) {
          await initializeRealtimeAuth();
          console.log("✅ Realtime auth initialized for user:", user.id);
        }

        // Listen to auth changes and update realtime auth
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log("🔄 Auth state changed:", event);

          if (session?.access_token) {
            updateRealtimeAuth(session.access_token);
            setUserId(session.user?.id || null);
          } else {
            setUserId(null);
          }
        });

        return () => {
          subscription?.unsubscribe();
        };
      } catch (error) {
        console.error("❌ Failed to initialize messaging provider:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMessaging();
  }, []);

  // Only render the messenger if user is authenticated
  if (isLoading || !userId) {
    return null;
  }

  return <FloatingMessenger currentUserId={userId} />;
}
