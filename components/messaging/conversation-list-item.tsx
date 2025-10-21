"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
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
        "hover:bg-zinc-900/50 border-b border-white/5",
        isActive && "bg-zinc-900/80 border-l-2 border-l-brand"
      )}
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        {conv.type === "group" ? (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
        ) : (
          <Avatar className="w-12 h-12">
            <AvatarImage src={displayAvatar || ""} />
            <AvatarFallback className="bg-gradient-to-br from-brand to-purple-600 text-white">
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
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand rounded-full flex items-center justify-center text-[10px] font-bold text-white">
            {unread_count > 9 ? "9+" : unread_count}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className={cn(
            "font-medium truncate",
            unread_count > 0 ? "text-foreground" : "text-muted-foreground"
          )}>
            {displayName}
          </h3>

          {/* Timestamp */}
          {last_message && (
            <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
              {formatDistanceToNow(new Date(last_message.created_at), {
                addSuffix: false,
              })}
            </span>
          )}
        </div>

        {/* Last message or typing indicator */}
        <div className="flex items-center gap-1">
          {is_typing ? (
            <div className="flex items-center gap-1 text-sm text-brand">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
                unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {last_message.is_own_message && "You: "}
                {last_message.sender_name && !last_message.is_own_message && conv.type === "group" && (
                  <span className="font-medium">{last_message.sender_name}: </span>
                )}
                {last_message.content}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No messages yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
