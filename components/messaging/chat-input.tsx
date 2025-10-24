"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Code,
  X,
  Smile,
  File,
  Loader2,
} from "lucide-react";
import type { ChatMessage } from "@/types/messaging";
import { toast } from "sonner";

interface ChatInputProps {
  conversationId: string;
  onSendMessage: (content: string, replyToId?: string) => Promise<void>;
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

interface FileAttachment {
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
}

export function ChatInput({
  conversationId,
  onSendMessage,
  replyingTo,
  onCancelReply,
  disabled = false,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Handle typing indicators
  useEffect(() => {
    if (message.trim() && !isTyping) {
      setIsTyping(true);
      // Send typing indicator to API
      fetch(`/api/conversations/${conversationId}/typing`, {
        method: "POST",
      }).catch(console.error);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        fetch(`/api/conversations/${conversationId}/typing`, {
          method: "DELETE",
        }).catch(console.error);
      }
    }, 3000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, conversationId, isTyping]);

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversation_id', conversationId);

      const response = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments([...attachments, {
          name: data.file.name,
          url: data.file.url,
          path: data.file.path,
          size: file.size,
          type: file.type,
        }]);
        toast.success("File uploaded successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!message.trim() && attachments.length === 0) || isSending) return;

    const content = message.trim() || "(Attachment)";
    setMessage("");
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsSending(true);

    try {
      // If there are attachments, send via custom API call
      if (currentAttachments.length > 0) {
        const response = await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            content,
            reply_to_message_id: replyingTo?.id,
            attachments: currentAttachments,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }
      } else {
        await onSendMessage(content, replyingTo?.id);
      }

      onCancelReply?.();

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        fetch(`/api/conversations/${conversationId}/typing`, {
          method: "DELETE",
        }).catch(console.error);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore message and attachments on error
      setMessage(content);
      setAttachments(currentAttachments);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="relative border-t border-white/10 bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-xl">
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand/5 via-purple-500/5 to-transparent pointer-events-none" />

      {/* Reply indicator */}
      {replyingTo && (
        <div className="relative px-4 py-3 border-b border-white/10 flex items-center justify-between group">
          <div className="absolute inset-0 bg-gradient-to-r from-brand/10 to-purple-500/10 opacity-50" />
          <div className="relative flex-1 min-w-0">
            <div className="text-xs font-semibold bg-gradient-to-r from-brand to-purple-500 bg-clip-text text-transparent">
              Replying to {replyingTo.sender.full_name}
            </div>
            <div className="text-sm text-muted-foreground truncate mt-0.5">
              {replyingTo.content}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancelReply}
            className="relative h-7 w-7 p-0 hover:bg-red-500/20 hover:text-red-400 transition-all duration-300"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* File attachments preview */}
      {attachments.length > 0 && (
        <div className="relative px-4 py-3 border-b border-white/10">
          <div className="relative space-y-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="group relative flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-brand/10 via-purple-500/10 to-transparent border border-white/10 hover:border-brand/30 transition-all duration-300"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-purple-500/20 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />

                {/* File icon */}
                <div className="relative flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-brand/20 to-purple-500/20 flex items-center justify-center">
                  {attachment.type.startsWith('image/') ? (
                    <ImageIcon className="w-5 h-5 text-brand" />
                  ) : (
                    <File className="w-5 h-5 text-brand" />
                  )}
                </div>

                {/* File info */}
                <div className="relative flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{attachment.name}</div>
                  <div className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</div>
                </div>

                {/* Remove button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveAttachment(index)}
                  className="relative h-7 w-7 p-0 hover:bg-red-500/20 hover:text-red-400 transition-all duration-300 opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative flex items-end gap-3 p-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
        />

        {/* Attachment button with premium styling */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-brand/30 to-purple-500/30 rounded-xl opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-500" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className={cn(
              "relative h-10 w-10 p-0 flex-shrink-0 rounded-xl",
              "bg-gradient-to-br from-muted/50 to-muted/30 border border-white/10",
              "hover:border-brand/50 hover:from-brand/10 hover:to-purple-500/10",
              "transition-all duration-300 hover:scale-110",
              "disabled:opacity-50 disabled:hover:scale-100"
            )}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-brand" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Message input with enhanced styling */}
        <div className="flex-1 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-brand/20 via-purple-500/20 to-cyan-500/20 rounded-xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className={cn(
              "relative min-h-[44px] max-h-[200px] resize-none",
              "bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm",
              "border border-white/10 focus:border-brand/50",
              "rounded-xl pr-10 transition-all duration-300",
              "placeholder:text-muted-foreground/50"
            )}
            rows={1}
          />

          {/* Emoji picker button */}
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-2 bottom-2 h-7 w-7 p-0 hover:bg-white/10 transition-all duration-300 hover:scale-110"
            disabled={disabled}
          >
            <Smile className="w-4 h-4" />
          </Button>
        </div>

        {/* Send button with premium glow */}
        <div className="relative group">
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r from-brand via-purple-500 to-cyan-500 rounded-full blur-lg transition-opacity duration-500",
            (!message.trim() && attachments.length === 0) || disabled || isSending
              ? "opacity-0"
              : "opacity-50 group-hover:opacity-75"
          )} />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={(!message.trim() && attachments.length === 0) || disabled || isSending}
            className={cn(
              "relative h-10 w-10 p-0 flex-shrink-0 rounded-full",
              "bg-gradient-to-br from-brand via-purple-500 to-cyan-500",
              "hover:scale-110 transition-all duration-300",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
              "shadow-xl shadow-brand/30"
            )}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Enhanced keyboard hint */}
      <div className="relative px-4 pb-3 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground/60">
          Press <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-mono">Enter</kbd> to send • <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-mono">Shift+Enter</kbd> for new line
        </span>
        {isUploading && (
          <span className="text-brand font-medium animate-pulse">
            Uploading...
          </span>
        )}
      </div>
    </div>
  );
}
