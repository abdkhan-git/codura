/**
 * ChatWindow - Main chat interface with messages and input
 * Displays conversation history and message composition
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { ConversationWithDetails, MessageWithSender } from '@/types/messaging';
import { GlassmorphismCard } from './GlassmorphismCard';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  conversation: ConversationWithDetails | null;
  messages: MessageWithSender[];
  isLoading?: boolean;
  isSending?: boolean;
  currentUserId: string;
  onSendMessage: (content: string) => Promise<void>;
  onReactMessage: (messageId: string, emoji: string, hasReacted: boolean) => Promise<void>;
  onEditMessage?: (messageId: string, content: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onPin?: (conversationId: string, pinned: boolean) => Promise<void>;
  onMute?: (conversationId: string, muted: boolean) => Promise<void>;
}

export function ChatWindow({
  conversation,
  messages,
  isLoading = false,
  isSending = false,
  currentUserId,
  onSendMessage,
  onReactMessage,
  onEditMessage,
  onDeleteMessage,
  onPin,
  onMute,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            Select a conversation to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Chat header */}
      <GlassmorphismCard className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* User avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
              {conversation.other_user?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            {/* User info */}
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">
                {conversation.other_user?.full_name ?? 'Unknown User'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {conversation.type === 'direct' ? 'Direct Message' : 'Conversation'}
              </p>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2">
            {/* Pin button */}
            {onPin && (
              <button
                onClick={() => onPin(conversation.id, !conversation.is_pinned)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  conversation.is_pinned
                    ? 'bg-yellow-500/20 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                    : 'hover:bg-white/10 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                )}
                title={conversation.is_pinned ? 'Unpin' : 'Pin'}
              >
                📌
              </button>
            )}

            {/* Mute button */}
            {onMute && (
              <button
                onClick={() => onMute(conversation.id, !conversation.is_muted)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  conversation.is_muted
                    ? 'bg-red-500/20 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'hover:bg-white/10 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                )}
                title={conversation.is_muted ? 'Unmute' : 'Mute'}
              >
                🔕
              </button>
            )}
          </div>
        </div>
      </GlassmorphismCard>

      {/* Messages area */}
      <GlassmorphismCard className="flex-1 p-4 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-2">No messages yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Start the conversation by sending a message
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((message) => (
              <div key={message.id} className="group">
                <MessageBubble
                  message={message}
                  isOwnMessage={message.sender_id === currentUserId}
                  onReact={(emoji, hasReacted) =>
                    onReactMessage(message.id, emoji, hasReacted)
                  }
                  onEdit={
                    message.sender_id === currentUserId && onEditMessage
                      ? () => {
                          const newContent = prompt('Edit message:', message.content);
                          if (newContent && newContent !== message.content) {
                            onEditMessage(message.id, newContent);
                          }
                        }
                      : undefined
                  }
                  onDelete={
                    message.sender_id === currentUserId && onDeleteMessage
                      ? () => {
                          if (confirm('Delete this message?')) {
                            onDeleteMessage(message.id);
                          }
                        }
                      : undefined
                  }
                  currentUserId={currentUserId}
                />
              </div>
            ))}
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </GlassmorphismCard>

      {/* Message input */}
      <MessageInput
        onSend={onSendMessage}
        isSending={isSending}
        disabled={!conversation}
      />
    </div>
  );
}
