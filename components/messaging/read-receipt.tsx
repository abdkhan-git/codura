"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DefaultAvatar } from "@/components/ui/default-avatar";
import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReadReceiptProps {
  messageId: string;
  senderId: string;
  currentUserId: string;
  readReceipts: Array<{
    user_id: string;
    read_at: string;
    user: {
      user_id: string;
      full_name: string;
      avatar_url?: string;
    };
  }>;
  conversationType: "direct" | "group" | "pod_chat";
  totalParticipants: number;
}

export function ReadReceipt({
  messageId,
  senderId,
  currentUserId,
  readReceipts = [],
  conversationType,
  totalParticipants,
}: ReadReceiptProps) {
  const { theme } = useTheme();

  // Only show read receipts for messages sent by current user
  if (senderId !== currentUserId) return null;

  const readCount = readReceipts.length;
  const isRead = readCount > 0;

  // Format read time for tooltip - shows actual time in user's timezone
  const formatReadTimeForTooltip = (readAt: string) => {
    const date = new Date(readAt);

    // Format as: "2:45 PM" or "14:45" depending on user's locale
    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    const time = timeFormatter.format(date);
    const dateStr = dateFormatter.format(date);

    // If same day, just show time. Otherwise show date and time
    const today = new Date();
    const isSameDay =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    return isSameDay ? time : `${dateStr} at ${time}`;
  };

  // Build tooltip content
  const buildTooltipContent = () => {
    if (!isRead) return "Sent";

    if (conversationType === "direct") {
      const receipt = readReceipts[0];
      return `Read at ${formatReadTimeForTooltip(receipt.read_at)}`;
    }

    // Group chat - show list of readers with read times
    return (
      <div className="space-y-1">
        <div className="font-semibold text-xs">
          Read by {readCount} of {totalParticipants - 1}
        </div>
        <div className="text-xs space-y-0.5">
          {readReceipts.map((receipt) => (
            <div key={receipt.user_id}>
              {receipt.user.full_name} - {formatReadTimeForTooltip(receipt.read_at)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-pointer">
            {!isRead ? (
              // Single check - sent but not read
              <Check
                className={cn(
                  "w-3 h-3",
                  theme === "light" ? "text-gray-400" : "text-gray-500"
                )}
              />
            ) : (
              // Double check - read
              <div className="flex relative">
                <Check
                  className={cn(
                    "w-3 h-3",
                    theme === "light" ? "text-blue-600" : "text-blue-400"
                  )}
                />
                <Check
                  className={cn(
                    "w-3 h-3 -ml-1.5",
                    theme === "light" ? "text-blue-600" : "text-blue-400"
                  )}
                />
              </div>
            )}

            {/* In group chats, show avatars of first 3 readers */}
            {conversationType === "group" && isRead && (
              <div className="flex -space-x-1">
                {readReceipts.slice(0, 3).map((receipt) => (
                  <DefaultAvatar
                    key={receipt.user_id}
                    src={receipt.user.avatar_url}
                    name={receipt.user.full_name}
                    className="w-4 h-4 border border-background"
                  />
                ))}
                {readCount > 3 && (
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-semibold border border-background",
                      theme === "light"
                        ? "bg-gray-200 text-gray-700"
                        : "bg-zinc-700 text-gray-300"
                    )}
                  >
                    +{readCount - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className={cn(
            "max-w-xs",
            theme === "light"
              ? "bg-gray-900 text-white"
              : "bg-zinc-800 text-white"
          )}
        >
          {buildTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
