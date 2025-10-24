"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { formatDistanceToNow } from "date-fns";
import { format } from "date-fns";
import type { ConversationListItem } from "@/types/messaging";
import { Users, CheckCheck } from "lucide-react";

interface ConversationListItemProps {
  conversation: ConversationListItem;
  isActive?: boolean;
  onClick?: () => void;
}

export function ConversationListItemComponent({
  conversation,
  isActive = false,
  onClick,
}: ConversationListItemProps) {
  const { theme } = useTheme();
  const { conversation: conv, other_user, unread_count, last_message, is_typing } = conversation;

  // For direct messages, show the other user's info
  const displayName = conv.type === "direct"
    ? other_user?.full_name || other_user?.username || "Unknown"
    : conv.name || "Group Chat";

  const displayAvatar = conv.type === "direct"
    ? other_user?.avatar_url
    : conv.avatar_url;

  const isOnline = other_user?.is_online;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-4 cursor-pointer transition-all duration-200",
        theme === 'light' 
          ? "bg-white hover:bg-gray-50 border-b border-gray-200"
          : "bg-zinc-900/50 hover:bg-zinc-800/50 border-b border-white/5",
        isActive && (theme === 'light' 
          ? "bg-blue-50 border-l-2 border-l-blue-500"
          : "bg-zinc-800/80 border-l-2 border-l-brand")
      )}
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        {conv.type === "group" ? (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center">
            <Users className={cn(
              "w-6 h-6",
              theme === 'light' ? "text-white" : "text-white"
            )} />
          </div>
        ) : (
          <Avatar className="w-12 h-12">
            <AvatarImage src={displayAvatar || ""} />
            <AvatarFallback className={cn(
              "bg-gradient-to-br from-brand to-purple-600",
              theme === 'light' ? "text-white" : "text-white"
            )}>
              {displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Online indicator for direct messages */}
        {conv.type === "direct" && isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
        )}

        {/* Unread badge */}
        {unread_count > 0 && (
          <div className={cn(
            "absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold",
            theme === 'light' ? "text-white" : "text-white"
          )}>
            {unread_count > 9 ? "9+" : unread_count}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className={cn(
            "font-medium truncate",
            theme === 'light' 
              ? (isActive ? "text-gray-900" : (unread_count > 0 ? "text-gray-900" : "text-gray-600"))
              : (unread_count > 0 ? "text-foreground" : "text-muted-foreground")
          )}>
            {displayName}
          </h3>

          {/* Timestamp */}
          {last_message && (
            <span className={cn(
              "text-[10px] flex-shrink-0 ml-2",
              theme === 'light' 
                ? (isActive ? "text-gray-600" : "text-gray-500")
                : "text-muted-foreground"
            )}>
              {format(new Date(last_message.created_at), 'h:mm a')}
            </span>
          )}
        </div>

        {/* Last message or typing indicator */}
        <div className="flex items-center gap-1">
          {is_typing ? (
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span>typing...</span>
            </div>
          ) : last_message ? (
            <div className="flex items-center gap-1 min-w-0">
              {/* Read indicator for own messages */}
              {last_message.is_own_message && (
                <CheckCheck className={cn(
                  "w-3 h-3 flex-shrink-0",
                  unread_count === 0 ? "text-blue-400" : "text-muted-foreground"
                )} />
              )}

              <p className={cn(
                "text-sm truncate",
                theme === 'light' 
                  ? (isActive ? "text-gray-800" : (unread_count > 0 ? "text-gray-900 font-medium" : "text-gray-600"))
                  : (unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground")
              )}>
                {last_message.is_own_message && "You: "}
                {last_message.sender_name && !last_message.is_own_message && conv.type === "group" && (
                  <span className="font-medium">{last_message.sender_name}: </span>
                )}
                {last_message.content}
              </p>
            </div>
          ) : (
            <p className={cn(
              "text-sm italic",
              theme === 'light' ? "text-gray-500" : "text-muted-foreground"
            )}>
              No messages yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
