"use client";

import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface MessageButtonProps extends Omit<ButtonProps, "onClick"> {
  userId: string;
  username?: string;
  onConversationCreated?: (conversationId: string) => void;
}

export function MessageButton({
  userId,
  username,
  onConversationCreated,
  ...props
}: MessageButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleMessage = async () => {
    setIsLoading(true);
    try {
      // Create or get existing conversation
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_ids: [userId],
          type: "direct",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create conversation");
      }

      const data = await response.json();
      const conversationId = data.conversation.id;

      // Call the callback if provided
      onConversationCreated?.(conversationId);

      // Trigger the messaging widget to open this conversation
      window.dispatchEvent(
        new CustomEvent("open-conversation", {
          detail: { conversationId },
        })
      );

      toast.success(
        data.existing
          ? "Opening conversation"
          : `Started conversation${username ? ` with ${username}` : ""}`
      );
    } catch (error) {
      console.error("Failed to create conversation:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start conversation"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      disabled={isLoading}
      onClick={handleMessage}
      {...props}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
      ) : (
        <>
          <MessageSquare className="w-4 h-4 mr-2" />
          Message
        </>
      )}
    </Button>
  );
}
