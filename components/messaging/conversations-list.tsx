"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Search,
  Send,
  Plus,
  Filter,
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  Pin,
  Archive,
  Trash2,
  Settings,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useMessaging } from "@/hooks/use-messaging";

interface Conversation {
  id: string;
  name: string;
  type: "direct" | "group";
  last_message?: {
    content: string;
    sender_name: string;
    created_at: string;
    message_type: string;
  };
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    username?: string;
    is_online?: boolean;
    last_seen?: string;
  }>;
  unread_count: number;
  is_pinned: boolean;
  is_archived: boolean;
  updated_at: string;
}

interface ConversationsListProps {
  currentUserId: string;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string;
  onCreateNew?: () => void;
}

export function ConversationsList({
  currentUserId,
  onSelectConversation,
  selectedConversationId,
  onCreateNew,
}: ConversationsListProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "pinned">("all");

  // Use the real-time messaging hook
  const {
    conversations,
    isLoading,
    fetchConversations
  } = useMessaging({
    currentUserId
  });

  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
    }
  }, [currentUserId, fetchConversations]);

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filter === "unread") return matchesSearch && conv.unread_count > 0;
    if (filter === "pinned") return matchesSearch && conv.is_pinned;
    return matchesSearch;
  });

  const formatLastMessage = (message: Conversation["last_message"]) => {
    if (!message) return "No messages yet";
    
    const prefix = message.sender_name ? `${message.sender_name}: ` : "";
    const content = message.content.length > 50 
      ? `${message.content.substring(0, 50)}...` 
      : message.content;
    
    return `${prefix}${content}`;
  };

  const getMessageStatus = (conversation: Conversation) => {
    if (!conversation.last_message) return null;
    
    // This would need to be implemented based on your read receipt logic
    return <CheckCheck className="w-3 h-3 text-blue-500" />;
  };

  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Messages</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateNew}
              className="rounded-full w-8 h-8 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full w-8 h-8 p-0"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="text-xs"
          >
            All
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("unread")}
            className="text-xs"
          >
            Unread
          </Button>
          <Button
            variant={filter === "pinned" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("pinned")}
            className="text-xs"
          >
            Pinned
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center p-4">
            <Send className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateNew}
                className="mt-2"
              >
                Start a conversation
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={cn(
                  "p-3 cursor-pointer transition-all duration-200",
                  theme === 'light' 
                    ? "bg-white hover:bg-gray-50 border-gray-200"
                    : "hover:bg-accent/50",
                  selectedConversationId === conversation.id && (theme === 'light'
                    ? "bg-blue-50 border-blue-200"
                    : "bg-accent border-brand/20"),
                  conversation.is_pinned && "border-l-4 border-l-brand"
                )}
                onClick={() => onSelectConversation(conversation)}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    {conversation.type === "direct" ? (
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={conversation.participants[0]?.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-brand to-purple-600">
                          {conversation.participants[0]?.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="relative w-12 h-12">
                        <Avatar className="w-8 h-8 absolute top-0 left-0">
                          <AvatarImage src={conversation.participants[0]?.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-brand to-purple-600">
                            {conversation.participants[0]?.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <Avatar className="w-8 h-8 absolute bottom-0 right-0">
                          <AvatarImage src={conversation.participants[1]?.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300">
                            {conversation.participants[1]?.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    
                    {/* Online indicator */}
                    {conversation.type === "direct" && conversation.participants[0]?.is_online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={cn(
                        "font-medium truncate",
                        theme === 'light' 
                          ? (selectedConversationId === conversation.id ? "text-gray-900" : "text-gray-900")
                          : "text-foreground"
                      )}>
                        {conversation.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        {conversation.is_pinned && (
                          <Pin className="w-3 h-3 text-brand" />
                        )}
                        {getMessageStatus(conversation)}
                        <span className={cn(
                          "text-xs",
                          theme === 'light' 
                            ? (selectedConversationId === conversation.id ? "text-gray-600" : "text-gray-500")
                            : "text-muted-foreground"
                        )}>
                          {conversation.last_message
                            ? formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: true })
                            : ""}
                        </span>
                      </div>
                    </div>
                    
                    <p className={cn(
                      "text-sm truncate",
                      theme === 'light' 
                        ? (selectedConversationId === conversation.id ? "text-gray-800" : "text-gray-600")
                        : "text-muted-foreground"
                    )}>
                      {formatLastMessage(conversation.last_message)}
                    </p>
                    
                    {conversation.unread_count > 0 && (
                      <div className="flex items-center justify-between mt-1">
                        <Badge variant="default" className="text-xs">
                          {conversation.unread_count}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
