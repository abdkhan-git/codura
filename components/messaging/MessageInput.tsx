/**
 * MessageInput - Input field for composing and sending messages
 * Glassmorphic design with send button
 */

'use client';

import React, { useState } from 'react';
import { GlassmorphismCard } from './GlassmorphismCard';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  isSending?: boolean;
  disabled?: boolean;
}

export function MessageInput({ onSend, isSending = false, disabled = false }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!content.trim() || isLoading || disabled) return;

    try {
      setIsLoading(true);
      await onSend(content.trim());
      setContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Cmd+Enter (Mac) or Ctrl+Enter (Windows)
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
    // Also allow Enter on its own for quick send (single line)
    if (e.key === 'Enter' && !e.shiftKey && content.trim()) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <GlassmorphismCard className="p-4">
      <div className="flex gap-3 items-end">
        {/* Message input textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Ctrl+Enter to send)"
          disabled={disabled || isLoading || isSending}
          className={cn(
            // Glass input styling
            'flex-1 backdrop-blur-md bg-white/10 dark:bg-white/5',
            'border border-white/20 dark:border-white/10',
            'rounded-lg px-4 py-2 text-sm',
            'text-gray-800 dark:text-gray-100',
            'placeholder-gray-500 dark:placeholder-gray-500',
            // Focus state
            'focus:outline-none focus:border-white/40 dark:focus:border-white/20',
            'focus:bg-white/15 dark:focus:bg-white/10',
            // Disabled state
            'disabled:opacity-50 disabled:cursor-not-allowed',
            // Resize and height
            'resize-none max-h-24 min-h-10'
          )}
          rows={1}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || isLoading || isSending || !content.trim()}
          className={cn(
            // Base styles
            'px-4 py-2 rounded-lg font-medium text-sm',
            'transition-all duration-200',
            // Enabled state
            'bg-blue-600 hover:bg-blue-700 text-white',
            'shadow-md hover:shadow-lg',
            // Disabled state
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600',
            // Active/loading state
            (isLoading || isSending) && 'opacity-75'
          )}
          title="Send message (Ctrl+Enter or Enter)"
        >
          {isLoading || isSending ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Sending...</span>
            </div>
          ) : (
            '↑'
          )}
        </button>
      </div>
    </GlassmorphismCard>
  );
}
