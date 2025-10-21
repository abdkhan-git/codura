"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  MoreVertical,
  Reply,
  Smile,
  Edit2,
  Trash2,
  Copy,
  Check,
  CheckCheck,
} from "lucide-react";
import type { ChatMessage } from "@/types/messaging";
import { COMMON_REACTIONS } from "@/types/messaging";
import { formatDistanceToNow } from "date-fns";

interface MessageBubbleProps {
  message: ChatMessage;
  showSender?: boolean;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

export function MessageBubble({
  message,
  showSender = true,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwn = message.is_own_message;

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReact = (emoji: string) => {
    onReact?.(message.id, emoji);
    setShowReactions(false);
  };

  // System messages (like user joined, etc.)
  if (message.message_type === "system") {
    return (
      <div className="flex justify-center my-4">
        <div className="text-xs text-muted-foreground bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
          {message.content}
        </div>
      </div>
    );
  }

  // Calculate read status icon
  const ReadStatusIcon = () => {
    if (!isOwn) return null;

    if (message.delivery_status === "read") {
      return <CheckCheck className="w-3 h-3 text-blue-400" />;
    } else if (message.delivery_status === "delivered") {
      return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
    } else if (message.delivery_status === "sent") {
      return <Check className="w-3 h-3 text-muted-foreground" />;
    } else if (message.delivery_status === "failed") {
      return <span className="text-xs text-red-400">Failed</span>;
    }
    return null;
  };

  return (
    <div
      className={cn(
        "flex gap-3 group relative",
        isOwn ? "flex-row-reverse" : "flex-row",
        !showSender && "mt-1"
      )}
    >
      {/* Avatar */}
      {showSender && !isOwn && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={message.sender.avatar_url || ""} />
          <AvatarFallback className="bg-gradient-to-br from-brand to-purple-600 text-white text-xs">
            {message.sender.full_name?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Spacer when sender is hidden */}
      {!showSender && !isOwn && <div className="w-8 flex-shrink-0" />}

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col max-w-[70%]",
          isOwn ? "items-end" : "items-start"
        )}
      >
        {/* Sender name */}
        {showSender && !isOwn && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {message.sender.full_name || message.sender.username}
          </span>
        )}

        {/* Reply reference */}
        {message.reply_to && (
          <div
            className={cn(
              "text-xs p-2 rounded-lg mb-1 border-l-2 max-w-full",
              isOwn
                ? "bg-brand/10 border-brand/50"
                : "bg-zinc-900/50 border-zinc-700"
            )}
          >
            <div className="font-medium text-muted-foreground">
              {message.reply_to.sender.full_name}
            </div>
            <div className="text-muted-foreground truncate">
              {message.reply_to.content}
            </div>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "relative px-4 py-2 rounded-2xl break-words",
            isOwn
              ? "bg-gradient-to-br from-brand to-purple-600 text-white rounded-tr-sm"
              : "bg-zinc-900/80 backdrop-blur-xl border border-white/5 rounded-tl-sm"
          )}
        >
          {/* Message content */}
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>

          {/* Edited indicator */}
          {message.is_edited && (
            <span className="text-[10px] opacity-50 ml-2">(edited)</span>
          )}

          {/* Actions menu */}
          <div
            className={cn(
              "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
              isOwn ? "left-0 -translate-x-full -ml-2" : "right-0 translate-x-full mr-2"
            )}
          >
            {/* Emoji reactions */}
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 bg-zinc-800 hover:bg-zinc-700 border border-white/10"
                onClick={() => setShowReactions(!showReactions)}
              >
                <Smile className="w-3 h-3" />
              </Button>

              {showReactions && (
                <div className="absolute top-full mt-1 z-50 flex gap-1 bg-zinc-800 border border-white/10 rounded-lg p-2 shadow-xl">
                  {COMMON_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      className="hover:scale-125 transition-transform text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* More actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 bg-zinc-800 hover:bg-zinc-700 border border-white/10"
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"}>
                {onReply && (
                  <DropdownMenuItem onClick={() => onReply(message)}>
                    <Reply className="w-4 h-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </DropdownMenuItem>
                {isOwn && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(message)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {isOwn && onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(message.id)}
                    className="text-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {Object.entries(message.reactions).map(([emoji, userIds]) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                  "bg-zinc-900/80 border border-white/10 hover:border-white/20 transition-colors",
                  userIds.includes(message.sender.user_id) && "border-brand"
                )}
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{userIds.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Timestamp and read status */}
        {(showSender || message.show_timestamp) && (
          <div
            className={cn(
              "flex items-center gap-1 mt-1 text-[10px] text-muted-foreground px-1",
              isOwn && "flex-row-reverse"
            )}
          >
            <span>
              {formatDistanceToNow(new Date(message.created_at), {
                addSuffix: true,
              })}
            </span>
            <ReadStatusIcon />
          </div>
        )}
      </div>
    </div>
  );
}
