/**
 * ContactsPanel - Shows connected users to start new conversations
 * Allows selecting a contact to message
 */

'use client';

import React, { useState, useMemo } from 'react';
import { ConnectedUser } from '@/types/messaging';
import { GlassmorphismCard } from './GlassmorphismCard';
import { cn } from '@/lib/utils';

interface ContactsPanelProps {
  contacts: ConnectedUser[];
  isLoading?: boolean;
  onSelectContact: (userId: string) => Promise<void>;
  onBack: () => void;
}

export function ContactsPanel({
  contacts,
  isLoading = false,
  onSelectContact,
  onBack,
}: ContactsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) {
      return contacts;
    }
    const query = searchQuery.toLowerCase();
    return contacts.filter((contact) => contact.full_name?.toLowerCase().includes(query));
  }, [contacts, searchQuery]);

  const handleSelectContact = async (userId: string) => {
    setSelectedContactId(userId);
    try {
      await onSelectContact(userId);
    } finally {
      setSelectedContactId(null);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Start Conversation
        </h2>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
          title="Back to conversations"
        >
          ←
        </button>
      </div>

      {/* Search input */}
      <div>
        <input
          type="text"
          placeholder="Search contacts..."
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

      {/* Contacts list */}
      <GlassmorphismCard className="flex-1 overflow-y-auto p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading contacts...</p>
            </div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No contacts found' : 'No connected users yet'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredContacts.map((contact) => (
              <button
                key={contact.user_id}
                onClick={() => handleSelectContact(contact.user_id)}
                disabled={selectedContactId === contact.user_id}
                className={cn(
                  'w-full px-4 py-3 text-left transition-all',
                  'hover:bg-white/10 dark:hover:bg-white/5',
                  'disabled:opacity-50'
                )}
              >
                <div className="flex items-center gap-3">
                  {/* User avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0 flex items-center justify-center text-white font-semibold">
                    {contact.full_name?.[0]?.toUpperCase() ?? 'U'}
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {contact.full_name ?? 'Unknown'}
                    </p>
                    {contact.email && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {contact.email}
                      </p>
                    )}
                  </div>

                  {/* Status indicator */}
                  {selectedContactId === contact.user_id && (
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </GlassmorphismCard>
    </div>
  );
}
