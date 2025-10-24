"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageEditProps {
  messageId: string;
  originalContent: string;
  onSave: (messageId: string, newContent: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function MessageEdit({ messageId, originalContent, onSave, onCancel, disabled }: MessageEditProps) {
  const [editContent, setEditContent] = useState(originalContent);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus and select all text when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSave = () => {
    if (!editContent.trim() || editContent === originalContent) {
      onCancel();
      return;
    }
    onSave(messageId, editContent.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
      <Input
        ref={inputRef}
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Edit message..."
        className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
        disabled={disabled}
      />
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={disabled || !editContent.trim() || editContent === originalContent}
          className="h-8 w-8 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10"
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={disabled}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
