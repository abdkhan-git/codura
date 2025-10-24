"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReplyMessageProps {
  replyTo: {
    id: string;
    content: string;
    sender_name: string;
    sender_avatar?: string;
    created_at: string;
  };
  onSendReply: (content: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function ReplyMessage({ replyTo, onSendReply, onCancel, disabled }: ReplyMessageProps) {
  const [replyContent, setReplyContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    
    onSendReply(replyContent.trim());
    setReplyContent("");
  };

  return (
    <div className="border-t border-white/10 bg-white/[0.02] p-3">
      {/* Reply Preview */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-blue-400">Replying to {replyTo.sender_name}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className="h-5 w-5 p-0 text-muted-foreground hover:text-white"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground bg-white/5 rounded-lg p-2 border-l-2 border-blue-500/50">
            <p className="line-clamp-2">{replyTo.content}</p>
          </div>
        </div>
      </div>

      {/* Reply Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder={`Reply to ${replyTo.sender_name}...`}
          className="flex-1 bg-white/5 border-white/10 focus:border-blue-500/50 focus:bg-white/[0.07] transition-colors rounded-xl text-sm"
          disabled={disabled}
          autoFocus
        />
        <Button
          type="submit"
          size="sm"
          disabled={!replyContent.trim() || disabled}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
