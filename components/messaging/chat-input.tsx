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
} from "lucide-react";
import type { ChatMessage } from "@/types/messaging";

interface ChatInputProps {
  conversationId: string;
  onSendMessage: (content: string, replyToId?: string) => Promise<void>;
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

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

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    const content = message.trim();
    setMessage("");
    setIsSending(true);

    try {
      await onSendMessage(content, replyingTo?.id);
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
      // Restore message on error
      setMessage(content);
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

  return (
    <div className="border-t border-white/5 bg-zinc-950/50 backdrop-blur-xl">
      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-brand font-medium">
              Replying to {replyingTo.sender.full_name}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {replyingTo.content}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancelReply}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2 p-4">
        {/* Attachment button */}
        <Button
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0 flex-shrink-0"
          disabled={disabled}
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className={cn(
              "min-h-[40px] max-h-[200px] resize-none",
              "bg-zinc-900/50 border-white/10 focus:border-brand/50",
              "rounded-xl pr-10"
            )}
            rows={1}
          />

          {/* Emoji picker button */}
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-2 bottom-2 h-6 w-6 p-0"
            disabled={disabled}
          >
            <Smile className="w-4 h-4" />
          </Button>
        </div>

        {/* Send button */}
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!message.trim() || disabled || isSending}
          className={cn(
            "h-9 w-9 p-0 flex-shrink-0 rounded-full",
            "bg-gradient-to-br from-brand to-purple-600",
            "hover:from-brand/90 hover:to-purple-600/90",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "shadow-lg shadow-brand/25"
          )}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Keyboard hint */}
      <div className="px-4 pb-2 text-[10px] text-muted-foreground">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}
