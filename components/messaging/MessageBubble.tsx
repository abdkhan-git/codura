/**
 * MessageBubble - Individual message display with reactions
 * Handles own vs other user messages with different styling
 */

'use client';

import React, { useState } from 'react';
import { MessageWithSender } from '@/types/messaging';
import { GlassmorphismCard } from './GlassmorphismCard';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwnMessage: boolean;
  onReact: (emoji: string, hasReacted: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  currentUserId: string;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏'];

export function MessageBubble({
  message,
  isOwnMessage,
  onReact,
  onEdit,
  onDelete,
  currentUserId,
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);

  const handleReactionClick = (emoji: string) => {
    const hasReacted = message.reactions?.[emoji]?.includes(currentUserId) ?? false;
    onReact(emoji, hasReacted);
    setShowReactions(false);
  };

  const getReactionEmojis = () => {
    if (!message.reactions) return [];
    return Object.entries(message.reactions).filter(([_, users]) => users.length > 0);
  };

  return (
    <div className={cn('flex gap-3 mb-4', isOwnMessage && 'justify-end')}>
      {/* User avatar for other messages */}
      {!isOwnMessage && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold">
          {message.sender?.full_name?.[0]?.toUpperCase() ?? 'U'}
        </div>
      )}

      {/* Message content */}
      <div className={cn('flex flex-col gap-1', isOwnMessage && 'items-end')}>
        {/* Message bubble */}
        <GlassmorphismCard
          className={cn(
            'px-4 py-2 max-w-xs lg:max-w-md',
            isOwnMessage
              ? 'bg-blue-500/20 dark:bg-blue-500/15 border-blue-400/30 dark:border-blue-400/20'
              : 'bg-gray-500/20 dark:bg-gray-500/15 border-gray-400/30 dark:border-gray-400/20'
          )}
        >
          {/* Message header for other users */}
          {!isOwnMessage && (
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              {message.sender?.full_name ?? 'Unknown'}
            </p>
          )}

          {/* Message text */}
          <p className="text-sm text-gray-800 dark:text-gray-100 break-words">
            {message.content}
          </p>

          {/* Message meta */}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {message.is_edited && <span className="ml-1">(edited)</span>}
          </p>
        </GlassmorphismCard>

        {/* Reactions display */}
        {getReactionEmojis().length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {getReactionEmojis().map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 text-xs rounded-full',
                  'bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10',
                  'hover:bg-white/20 dark:hover:bg-white/10 transition-colors',
                  message.reactions?.[emoji]?.includes(currentUserId) && 'bg-blue-500/30 dark:bg-blue-500/20'
                )}
              >
                <span>{emoji}</span>
                <span className="text-gray-600 dark:text-gray-400">{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action buttons - only show on hover for own messages */}
        {isOwnMessage && (
          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="text-xs px-2 py-1 rounded hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
              title="Add reaction"
            >
              😊
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-xs px-2 py-1 rounded hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
                title="Edit"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-xs px-2 py-1 rounded hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
                title="Delete"
              >
                🗑️
              </button>
            )}
          </div>
        )}

        {/* Reaction picker - shown when user clicks emoji button */}
        {showReactions && (
          <div className="flex gap-1 p-2 bg-white/10 dark:bg-white/5 rounded-lg border border-white/20 dark:border-white/10">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className="text-lg hover:scale-125 transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User avatar for own messages - placeholder space */}
      {isOwnMessage && <div className="w-8 flex-shrink-0" />}
    </div>
  );
}
