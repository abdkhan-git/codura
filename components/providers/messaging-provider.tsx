"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { FloatingMessenger } from "@/components/messaging/floating-messenger";

export function MessagingProvider() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user?.id || null);
      setIsLoading(false);
    };

    checkUser();
  }, []);

  // Only render the messenger if user is authenticated
  if (isLoading || !userId) {
    return null;
  }

  return <FloatingMessenger currentUserId={userId} />;
}
