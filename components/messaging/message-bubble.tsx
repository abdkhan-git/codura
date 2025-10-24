"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DefaultAvatar } from "@/components/ui/default-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MessageEdit } from "@/components/messaging/message-edit";
import {
  MoreVertical,
  MessageSquare as ReplyIcon,
  Smile as SmileIcon,
  Edit as EditIcon,
  Trash as TrashIcon,
  Copy as CopyIcon,
  Check as CheckIcon,
  CheckCircle2 as CheckCheckIcon,
  Download as DownloadIcon,
  FileText as FileTextIcon,
  Image as ImageIcon,
  ExternalLink as ExternalLinkIcon,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import type { ChatMessage } from "@/types/messaging";
import { COMMON_REACTIONS } from "@/types/messaging";
import { formatDistanceToNow } from "date-fns";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: ChatMessage;
  showSender?: boolean;
  onReply?: (message: ChatMessage) => void;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  messageRef?: (element: HTMLDivElement | null) => void;
}

export function MessageBubble({
  message,
  showSender = true,
  onReply,
  onEdit,
  onDelete,
  onReact,
  messageRef,
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isOwn = message.is_own_message;

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (isReacting) return;
    
    setIsReacting(true);
    try {
      const response = await fetch(`/api/messages/${message.id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      });

      if (response.ok) {
        // Call the onReact callback if provided
        onReact?.(message.id, emoji);
      } else {
        console.error('Failed to add reaction');
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    } finally {
      setIsReacting(false);
      setShowReactions(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = (messageId: string, newContent: string) => {
    if (onEdit) {
      onEdit({ ...message, content: newContent });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleReact = (emoji: string) => {
    if (onReact) {
      onReact(message.id, emoji);
    }
  };

  // Get reaction counts
  const getReactionCounts = () => {
    const reactions = message.reactions || {};
    const counts: Record<string, number> = {};
    
    Object.values(reactions).forEach((userReactions: string[]) => {
      userReactions.forEach((emoji: string) => {
        counts[emoji] = (counts[emoji] || 0) + 1;
      });
    });
    
    return counts;
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return FileImage;
    if (fileType === 'application/pdf') return FileText; // Use FileText for PDF since FilePdf doesn't exist
    if (fileType.includes('word') || fileType.includes('document')) return FileText;
    if (fileType.includes('sheet') || fileType.includes('excel')) return FileSpreadsheet;
    return File;
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

  // Calculate read status icon with enhanced indicators
  const ReadStatusIcon = () => {
    if (!isOwn) return null;

    // Debug logging
    console.log('ReadStatusIcon - Message data:', {
      id: message.id,
      read_by: message.read_by,
      delivery_status: message.delivery_status,
      isOwn
    });

    const readByCount = message.read_by?.length || 0;
    const totalParticipants = (message as any).total_participants || 1;

    if (message.delivery_status === "read") {
      return (
        <div className="flex items-center gap-1">
          <CheckCheckIcon className="w-3 h-3 text-blue-400" />
          {readByCount > 1 && (
            <span className="text-xs text-blue-400 font-medium">
              {readByCount}
            </span>
          )}
        </div>
      );
    } else if (message.delivery_status === "delivered") {
      return (
        <div className="flex items-center gap-1">
          <CheckCheckIcon className="w-3 h-3 text-muted-foreground" />
          {readByCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {readByCount}
            </span>
          )}
        </div>
      );
    } else if (message.delivery_status === "sending") {
      return (
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border border-muted-foreground border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground">Sending...</span>
        </div>
      );
    } else if (message.delivery_status === "sent") {
      return <CheckIcon className="w-3 h-3 text-muted-foreground" />;
    } else if (message.delivery_status === "failed") {
      return (
        <div className="flex items-center gap-1">
          <span className="text-xs text-red-400 font-medium">Failed</span>
          <button 
            onClick={() => {
              // TODO: Implement retry functionality
              console.log('Retry sending message:', message.id);
            }}
            className="text-xs text-red-400 hover:text-red-300 underline"
          >
            Retry
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      ref={messageRef}
      className={cn(
        "flex gap-3 group relative",
        isOwn ? "flex-row-reverse" : "flex-row",
        !showSender && "mt-1",
        showSender && "mb-2"
      )}
    >
      {/* Avatar */}
      {showSender && !isOwn && (
        <DefaultAvatar
          src={message.sender.avatar_url}
          name={message.sender.full_name}
          username={message.sender.username}
          size="sm"
          className="flex-shrink-0 border border-white/10"
        />
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
            "relative px-4 py-2 rounded-2xl break-words backdrop-blur-xl",
            isOwn
              ? "bg-gradient-to-br from-violet-500/90 to-indigo-500/90 text-white rounded-br-sm border border-violet-400/30 shadow-lg shadow-violet-500/20"
              : "bg-zinc-800/80 text-gray-100 border border-white/10 rounded-bl-sm shadow-lg shadow-black/20 backdrop-blur-xl",
            !showSender && "mt-1"
          )}
        >
          {/* File attachments */}
          {message.metadata?.attachments && message.metadata.attachments.length > 0 && (
            <div className="space-y-2 mb-3">
              {message.metadata.attachments.map((attachment: any, idx: number) => {
                const isImage = attachment.type?.startsWith('image/');

                return (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-lg overflow-hidden border",
                      isOwn
                        ? "border-white/20 bg-white/10"
                        : "border-white/10 bg-black/20"
                    )}
                  >
                    {isImage ? (
                      // Image preview
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block group relative"
                      >
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="max-w-full h-auto max-h-64 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                          <ExternalLinkIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      </a>
                    ) : (
                      // File preview
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors duration-300 group"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          isOwn
                            ? "bg-white/20"
                            : "bg-brand/20"
                        )}>
                          {(() => {
                            const FileIcon = getFileIcon(attachment.type);
                            return <FileIcon className="w-5 h-5" />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{attachment.name}</div>
                          <div className={cn(
                            "text-xs",
                            isOwn ? "text-white/70" : "text-muted-foreground"
                          )}>
                            Click to download
                          </div>
                        </div>
                        <DownloadIcon className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Message content */}
          {isEditing ? (
            <MessageEdit
              messageId={message.id}
              originalContent={message.content || ''}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              disabled={false}
            />
          ) : (
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
          )}

          {/* Reactions */}
          {Object.keys(getReactionCounts()).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(getReactionCounts()).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all duration-200 hover:scale-105 backdrop-blur-sm",
                    isOwn 
                      ? "bg-white/20 hover:bg-white/30 text-white border border-white/20" 
                      : "bg-zinc-700/80 hover:bg-zinc-600/80 text-gray-200 border border-white/10"
                  )}
                >
                  <span>{emoji}</span>
                  <span>{count}</span>
                </button>
              ))}
            </div>
          )}

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
                className="h-6 w-6 p-0 bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 hover:scale-110 transition-all duration-200 backdrop-blur-sm"
                onClick={() => setShowReactions(!showReactions)}
              >
                <SmileIcon className="w-3 h-3" />
              </Button>

              {showReactions && (
                <div className="absolute top-full mt-1 z-50 flex gap-1 bg-zinc-800/95 border border-white/10 rounded-lg p-2 shadow-xl backdrop-blur-md">
                  {COMMON_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className="hover:scale-125 transition-transform text-lg p-1 rounded hover:bg-white/10"
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
                  className="h-6 w-6 p-0 bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 hover:scale-110 transition-all duration-200 backdrop-blur-sm"
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? "end" : "start"}>
                {onReply && (
                  <DropdownMenuItem onClick={() => onReply(message)}>
                    <ReplyIcon className="w-4 h-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                )}
                {onEdit && isOwn && (
                  <DropdownMenuItem onClick={handleEdit}>
                    <EditIcon className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleCopy}>
                  {copied ? (
                    <>
                      <CheckIcon className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </DropdownMenuItem>
                {isOwn && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(message)}>
                    <EditIcon className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {isOwn && onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(message.id)}
                    className="text-red-400"
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
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
              <div
                key={emoji}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs backdrop-blur-sm",
                  "bg-zinc-900/80 border border-white/10 hover:border-white/20 transition-all duration-200 hover:scale-105"
                )}
              >
                <span>{emoji}</span>
                <div className="flex -space-x-1">
                  {userIds.slice(0, 3).map((userId) => (
                    <DefaultAvatar
                      key={userId}
                      size="sm"
                      className="w-4 h-4 border border-white/20"
                    />
                  ))}
                  {userIds.length > 3 && (
                    <div className="w-4 h-4 rounded-full bg-zinc-700 border border-white/20 flex items-center justify-center text-xs text-white">
                      +{userIds.length - 3}
                    </div>
                  )}
                </div>
              </div>
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
              {message.created_at ? format(new Date(message.created_at), 'h:mm a') : 'Just now'}
            </span>
            <ReadStatusIcon />
          </div>
        )}
      </div>
    </div>
  );
}
