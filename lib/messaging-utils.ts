/**
 * Messaging utility functions
 * Helper functions to start conversations from anywhere in the app
 */

import { toast } from "sonner";

/**
 * Start or navigate to a direct message conversation with a user
 * @param userId - The user ID to message
 * @param userName - The user's display name (for toast messages)
 * @returns The conversation ID if successful, null otherwise
 */
export async function startConversation(
  userId: string,
  userName?: string
): Promise<string | null> {
  try {
    // Check if a direct conversation already exists with this user
    const checkResponse = await fetch("/api/conversations");
    if (checkResponse.ok) {
      const { conversations } = await checkResponse.json();

      // Find existing direct conversation with this user
      // Direct conversations have exactly 2 participants, one being the current user and one being the target user
      const existingConv = conversations.find(
        (conv: any) =>
          conv.type === "direct" &&
          conv.participants?.length === 2 &&
          conv.participants?.some((p: any) => p.id === userId)
      );

      if (existingConv) {
        // Open existing conversation in floating messenger
        window.dispatchEvent(
          new CustomEvent("messenger:open", {
            detail: { conversationId: existingConv.id },
          })
        );
        return existingConv.id;
      }
    }

    // Create new conversation
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "direct",
        participant_ids: [userId],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create conversation");
    }

    const { conversation } = await response.json();

    // Open conversation in floating messenger
    window.dispatchEvent(
      new CustomEvent("messenger:open", {
        detail: { conversationId: conversation.id },
      })
    );

    toast.success(`Started conversation with ${userName || "user"}`);
    return conversation.id;
  } catch (error) {
    console.error("Failed to start conversation:", error);
    toast.error(
      error instanceof Error ? error.message : "Failed to start conversation"
    );
    return null;
  }
}

/**
 * Create a group chat
 * @param participantIds - Array of user IDs to add to the group
 * @param groupName - Name of the group chat
 * @param description - Optional description
 * @returns The conversation ID if successful, null otherwise
 */
export async function createGroupChat(
  participantIds: string[],
  groupName: string,
  description?: string
): Promise<string | null> {
  try {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "group",
        participant_ids: participantIds,
        name: groupName,
        description,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create group chat");
    }

    const { conversation } = await response.json();

    // Open conversation in floating messenger
    window.dispatchEvent(
      new CustomEvent("messenger:open", {
        detail: { conversationId: conversation.id },
      })
    );

    toast.success(`Created group "${groupName}"`);
    return conversation.id;
  } catch (error) {
    console.error("Failed to create group chat:", error);
    toast.error(
      error instanceof Error ? error.message : "Failed to create group chat"
    );
    return null;
  }
}

/**
 * Navigate to the full messages page
 */
export function navigateToMessages() {
  window.location.href = "/messages";
}

/**
 * Open the floating messenger (if closed)
 */
export function openMessenger(conversationId?: string) {
  window.dispatchEvent(
    new CustomEvent("messenger:open", {
      detail: conversationId ? { conversationId } : undefined,
    })
  );
}
