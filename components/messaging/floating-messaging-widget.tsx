"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Send,
  X,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Settings,
  Plus,
  Check,
  CheckCheck,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMessaging } from "@/hooks/use-messaging";
import { toast } from "sonner";

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

interface FloatingMessagingWidgetProps {
  currentUserId: string;
}

export function FloatingMessagingWidget({ currentUserId }: FloatingMessagingWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showConversations, setShowConversations] = useState(false);

  // Use the real-time messaging hook
  const {
    messages,
    isLoading,
    isTyping,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    fetchConversations
  } = useMessaging({
    conversationId: selectedConversation?.id,
    currentUserId
  });

  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
    }
  }, [currentUserId, fetchConversations]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending || !selectedConversation) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    try {
      await sendMessage(messageContent, "text");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      sendTypingIndicator();
    }
  };

  const getMessageStatus = (message: any) => {
    if (message.sender_id !== currentUserId) return null;
    
    if (message.read_by?.includes(selectedConversation?.participants[0]?.id)) {
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    } else if (message.read_by?.length > 0) {
      return <Check className="w-3 h-3 text-gray-400" />;
    } else {
      return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const formatLastMessage = (message: Conversation["last_message"]) => {
    if (!message) return "No messages yet";
    
    const prefix = message.sender_name ? `${message.sender_name}: ` : "";
    const content = message.content.length > 30 
      ? `${message.content.substring(0, 30)}...` 
      : message.content;
    
    return `${prefix}${content}`;
  };

  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="relative w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
        >
          <Send className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-brand transition-colors" />
          {totalUnreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg">
              {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
            </div>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96">
      <Card className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Messages</h3>
              {totalUnreadCount > 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{totalUnreadCount} unread</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConversations(!showConversations)}
              className="w-8 h-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
            >
              <Settings className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-8 h-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-600 dark:text-zinc-400" /> : <ChevronUp className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="w-8 h-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
            >
              <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </Button>
          </div>
        </div>

        {/* Conversations List */}
        {showConversations && (
          <div className="max-h-64 overflow-y-auto border-b border-zinc-200/50 dark:border-zinc-800/50">
            {conversations.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Send className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No conversations yet</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Start a new conversation</p>
              </div>
            ) : (
              <div className="p-2">
                {conversations.slice(0, 5).map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group",
                      selectedConversation?.id === conversation.id
                        ? "bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    )}
                    onClick={() => {
                      setSelectedConversation(conversation);
                      setShowConversations(false);
                    }}
                  >
                    <Avatar className="w-10 h-10 ring-2 ring-zinc-200 dark:ring-zinc-800">
                      <AvatarImage src={conversation.participants[0]?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-medium">
                        {conversation.participants[0]?.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {conversation.name}
                        </p>
                        {conversation.unread_count > 0 && (
                          <div className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                            {conversation.unread_count}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {formatLastMessage(conversation.last_message)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat Interface */}
        {selectedConversation && isExpanded && (
          <div className="h-96 flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50">
              <Avatar className="w-10 h-10 ring-2 ring-zinc-200 dark:ring-zinc-800">
                <AvatarImage src={selectedConversation.participants[0]?.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-medium">
                  {selectedConversation.participants[0]?.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{selectedConversation.name}</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Active now</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                  <Phone className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                </Button>
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                  <Video className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.sender_id === currentUserId ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.sender_id !== currentUserId && (
                      <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-zinc-200 dark:ring-zinc-800">
                        <AvatarImage src={selectedConversation.participants[0]?.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-medium">
                          {selectedConversation.participants[0]?.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                        message.sender_id === currentUserId
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md"
                      )}
                    >
                      <p className="leading-relaxed">{message.content}</p>
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <span className={cn(
                          "text-xs",
                          message.sender_id === currentUserId 
                            ? "text-blue-100" 
                            : "text-zinc-500 dark:text-zinc-400"
                        )}>
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                        {getMessageStatus(message)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {typingUsers.length > 0 && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-zinc-200 dark:ring-zinc-800">
                      <AvatarImage src={selectedConversation.participants[0]?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-medium">
                        {selectedConversation.participants[0]?.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">typing...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <Input
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 text-sm rounded-xl border-zinc-200 dark:border-zinc-700 focus:border-blue-500 focus:ring-blue-500/20"
                  disabled={isSending}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newMessage.trim() || isSending}
                  className="w-10 h-10 p-0 bg-blue-500 hover:bg-blue-600 rounded-xl shadow-lg"
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {!selectedConversation && (
          <div className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Send className="w-8 h-8 text-zinc-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                {conversations.length === 0 
                  ? "No conversations yet" 
                  : "Select a conversation to start messaging"
                }
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                Start connecting with your network
              </p>
              <Button
                onClick={() => window.location.href = '/messages'}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New Conversation
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
