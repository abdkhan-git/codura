/**
 * ConversationList - Shows all conversations with search and controls
 * Glassmorphic design with conversation items
 */

'use client';

import React, { useState, useMemo } from 'react';
import { ConversationWithDetails } from '@/types/messaging';
import { GlassmorphismCard } from './GlassmorphismCard';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  selectedConversationId?: string | null;
  onSelectConversation: (conversationId: string) => void;
  onStartNewConversation: () => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onStartNewConversation,
  isLoading = false,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }
    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) =>
      conv.other_user?.full_name?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Sort by pinned first, then by last message time
  const sortedConversations = useMemo(() => {
    return [...filteredConversations].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1;
      }
      const aTime = new Date(a.last_message_at || a.created_at).getTime();
      const bTime = new Date(b.last_message_at || b.created_at).getTime();
      return bTime - aTime;
    });
  }, [filteredConversations]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header with new conversation button */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Conversations</h2>
        <button
          onClick={onStartNewConversation}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium',
            'bg-blue-600 hover:bg-blue-700 text-white',
            'transition-colors shadow-md hover:shadow-lg'
          )}
          title="Start new conversation"
        >
          ✎
        </button>
      </div>

      {/* Search input */}
      <div>
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            'w-full backdrop-blur-md bg-white/10 dark:bg-white/5',
            'border border-white/20 dark:border-white/10',
            'rounded-lg px-4 py-2 text-sm',
            'text-gray-800 dark:text-gray-100',
            'placeholder-gray-500 dark:placeholder-gray-500',
            'focus:outline-none focus:border-white/40 dark:focus:border-white/20',
            'focus:bg-white/15 dark:focus:bg-white/10'
          )}
        />
      </div>

      {/* Conversations list */}
      <GlassmorphismCard className="flex-1 overflow-y-auto p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading conversations...</p>
            </div>
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
              <button
                onClick={onStartNewConversation}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
              >
                Start a new conversation
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {sortedConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={cn(
                  'w-full px-4 py-3 text-left transition-all',
                  'hover:bg-white/10 dark:hover:bg-white/5',
                  selectedConversationId === conversation.id &&
                    'bg-white/15 dark:bg-white/10 border-l-2 border-blue-500'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {/* User avatar */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold">
                        {conversation.other_user?.full_name?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      {/* Name and unread badge */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                          {conversation.other_user?.full_name ?? 'Unknown'}
                        </p>
                      </div>
                      {/* Pin indicator */}
                      {conversation.is_pinned && (
                        <span className="text-sm flex-shrink-0">📌</span>
                      )}
                    </div>

                    {/* Last message preview */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                      {conversation.last_message || 'No messages yet'}
                    </p>
                  </div>

                  {/* Right column - unread count and time */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {/* Unread badge */}
                    {conversation.unread_count > 0 && (
                      <span className="px-2 py-0.5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                        {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                      </span>
                    )}

                    {/* Last message time */}
                    {conversation.last_message_at && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(conversation.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}

                    {/* Mute indicator */}
                    {conversation.is_muted && (
                      <span className="text-xs flex-shrink-0">🔕</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </GlassmorphismCard>
    </div>
  );
}
