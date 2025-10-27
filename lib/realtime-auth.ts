/**
 * Global realtime authentication management
 * Ensures realtime.setAuth() is called exactly once with valid credentials
 * All subscriptions should wait for this to complete
 */

import { createClient } from "@/utils/supabase/client";

let authInitialized = false;
let authPromise: Promise<string | null> | null = null;

/**
 * Initialize realtime auth globally
 * This must be called ONCE before any subscriptions are created
 */
export async function initializeRealtimeAuth(): Promise<string | null> {
  // Return cached promise if already initializing
  if (authPromise) {
    return authPromise;
  }

  // Create initialization promise
  authPromise = (async () => {
    try {
      const supabase = createClient();

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.warn("⚠️  No active session for realtime auth");
        return null;
      }

      // Set realtime auth with access token
      supabase.realtime.setAuth(session.access_token);
      console.log("✅ Realtime auth initialized with access token");

      authInitialized = true;
      return session.access_token;
    } catch (error) {
      console.error("❌ Failed to initialize realtime auth:", error);
      return null;
    }
  })();

  return authPromise;
}

/**
 * Wait for realtime auth to be ready before subscribing
 * Used in hooks to ensure auth is set before creating channels
 */
export async function waitForRealtimeAuth(): Promise<void> {
  // If auth hasn't been initialized yet, initialize it
  if (!authInitialized && !authPromise) {
    await initializeRealtimeAuth();
    return;
  }

  // If initialization is in progress, wait for it
  if (authPromise) {
    await authPromise;
    return;
  }

  // Auth is already initialized
  return;
}

/**
 * Update realtime auth when session changes
 */
export function updateRealtimeAuth(accessToken: string | null): void {
  if (!accessToken) {
    console.log("👋 Realtime auth cleared");
    return;
  }

  try {
    const supabase = createClient();
    supabase.realtime.setAuth(accessToken);
    console.log("🔄 Realtime auth updated");
  } catch (error) {
    console.error("❌ Failed to update realtime auth:", error);
  }
}
