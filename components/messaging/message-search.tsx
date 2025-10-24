"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface SearchResult {
  id: string;
  content: string;
  created_at: string;
  conversation_id: string;
  sender: {
    id: string;
    name: string;
    avatar_url?: string;
    username?: string;
  };
}

interface ConversationSearchResult {
  conversation_id: string;
  conversation_name: string;
  conversation_type: string;
  last_message_content: string;
  last_message_at: string;
  match_count: number;
  rank: number;
}

interface MessageSearchResult {
  conversation_id: string;
  conversation_name: string;
  messages: Array<{
    id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    created_at: string;
    rank: number;
  }>;
}

interface MessageSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMessage: (messageId: string, conversationId: string) => void;
  conversationId?: string;
}

export function MessageSearch({
  isOpen,
  onClose,
  onSelectMessage,
  conversationId
}: MessageSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchType, setSearchType] = useState<'messages' | 'conversations'>('messages');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: searchType,
        limit: '20'
      });

      const response = await fetch(`/api/messages/search?${params}`);
      const data = await response.json();

      if (response.ok) {
        if (data.type === 'conversations') {
          // Convert conversation results to message format for display
          const conversationResults = data.results.map((conv: ConversationSearchResult) => ({
            conversation_id: conv.conversation_id,
            conversation_name: conv.conversation_name,
            messages: [{
              id: 'conversation-' + conv.conversation_id,
              sender_id: '',
              sender_name: '',
              content: conv.last_message_content,
              created_at: conv.last_message_at,
              rank: conv.rank
            }]
          }));
          setResults(conversationResults);
        } else {
          setResults(data.results || []);
        }
      } else {
        console.error('Search failed:', data.error);
        setResults([]);
      }
    } catch (error) {
      console.error('Error searching messages:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      handleSearch(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleSelectMessage = (messageId: string, conversationId: string) => {
    onSelectMessage(messageId, conversationId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#1a1f2e] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Search className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Search Messages</h2>
                <p className="text-sm text-gray-400">
                  {conversationId ? "Search in this conversation" : "Search all conversations"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Search Type Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={searchType === 'messages' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSearchType('messages')}
              className={cn(
                "text-xs",
                searchType === 'messages' 
                  ? "bg-violet-500/20 text-violet-400 border-violet-500/30" 
                  : "text-gray-400 hover:text-white"
              )}
            >
              Messages
            </Button>
            <Button
              variant={searchType === 'conversations' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSearchType('conversations')}
              className={cn(
                "text-xs",
                searchType === 'conversations' 
                  ? "bg-violet-500/20 text-violet-400 border-violet-500/30" 
                  : "text-gray-400 hover:text-white"
              )}
            >
              Conversations
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={searchType === 'messages' ? "Search messages..." : "Search conversations..."}
              className="pl-10 bg-white/5 border-white/10 focus:border-violet-500/50 focus:bg-white/[0.07] transition-colors rounded-xl"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" />
              <span className="ml-2 text-gray-400">Searching...</span>
            </div>
          ) : hasSearched ? (
            results.length > 0 ? (
              <ScrollArea className="max-h-80">
                <div className="p-4 space-y-4">
                  {results.map((conversation) => (
                    <div key={conversation.conversation_id} className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-violet-500 rounded-full" />
                        <span className="text-sm font-medium text-violet-400">
                          {conversation.conversation_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {conversation.messages.length} match{conversation.messages.length !== 1 ? 'es' : ''}
                        </span>
                      </div>
                      {conversation.messages.map((message) => (
                        <button
                          key={message.id}
                          onClick={() => handleSelectMessage(message.id, conversation.conversation_id)}
                          className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors group"
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarImage src="" />
                              <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white text-xs">
                                {message.sender_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-white">
                                  {message.sender_name || 'Unknown'}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-300 line-clamp-2">
                                {message.content}
                              </p>
                            </div>
                            <MessageSquare className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-white mb-1">No messages found</h3>
                <p className="text-xs text-gray-400">Try a different search term</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-sm font-medium text-white mb-1">Search Messages</h3>
              <p className="text-xs text-gray-400">Enter a search term to find messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
