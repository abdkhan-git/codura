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
  Minimize2,
  Maximize2,
  MoreVertical,
  Settings,
  Plus,
  CheckCircle2,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Phone,
  Video,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { format } from "date-fns";
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
    conversations: allConversations,
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

  // Update local conversations state when allConversations changes
  useEffect(() => {
    if (allConversations) {
      setConversations(allConversations);
    }
  }, [allConversations]);

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
      return <CheckCircle2 className="w-3 h-3 text-blue-500" />;
    } else if (message.read_by?.length > 0) {
      return <CheckCircle2 className="w-3 h-3 text-gray-400" />;
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
          className="relative w-14 h-14 rounded-2xl bg-[#1a1f2e] border border-white/10 shadow-2xl hover:bg-[#1f2537] transition-colors"
        >
          <Send className="w-5 h-5 text-violet-400" />

          {totalUnreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-violet-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
            </div>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96">
      <Card className="bg-[#1a1f2e]/95 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-indigo-500/15 to-pink-500/20 rounded-xl blur-lg animate-pulse" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center border border-violet-500/30 backdrop-blur-sm">
                <Send className="w-5 h-5 text-violet-400" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white">Messages</h3>
              {totalUnreadCount > 0 && (
                <p className="text-xs text-gray-400">{totalUnreadCount} unread</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConversations(!showConversations)}
              className="w-8 h-8 p-0 hover:bg-white/5 transition-colors rounded-lg"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-8 h-8 p-0 hover:bg-white/5 transition-colors rounded-lg"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="w-8 h-8 p-0 hover:bg-white/5 transition-colors rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Conversations List */}
        {showConversations && (
          <div className="max-h-64 overflow-y-auto border-b border-white/5">
            {conversations.length === 0 ? (
              <div className="relative p-6 text-center">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-purple-500/20 rounded-full blur-xl" />
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm flex items-center justify-center">
                    <Send className="w-7 h-7 text-muted-foreground/50" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">No conversations yet</p>
                <p className="text-xs text-muted-foreground/70">Start a new conversation</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {conversations.slice(0, 5).map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors duration-200",
                      selectedConversation?.id === conversation.id
                        ? "bg-violet-500/10 border border-violet-500/20"
                        : "hover:bg-white/[0.03] border border-transparent"
                    )}
                    onClick={() => {
                      setSelectedConversation(conversation);
                      setShowConversations(false);
                    }}
                  >
                    <Avatar className="w-10 h-10 border border-violet-500/30">
                      <AvatarImage src={conversation.participants[0]?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white font-semibold text-sm">
                        {conversation.participants[0]?.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-white truncate">
                          {conversation.name}
                        </p>
                        {conversation.unread_count > 0 && (
                          <Badge className="h-4 min-w-[16px] px-1.5 bg-violet-500 text-white text-[10px] font-bold rounded-full shadow-lg shadow-violet-500/30">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
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
            <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-white/[0.02]">
              <Avatar className="w-10 h-10 border border-white/10">
                <AvatarImage src={selectedConversation.participants[0]?.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white font-medium">
                  {selectedConversation.participants[0]?.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{selectedConversation.name}</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <p className="text-xs text-gray-400">Active now</p>
                  {selectedConversation.type === 'group' && (
                    <div className="flex items-center gap-1 ml-2">
                      <Users className="w-3 h-3 text-violet-400" />
                      <span className="text-xs text-violet-400">
                        {selectedConversation.participants.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {selectedConversation.type === 'group' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-8 h-8 p-0 hover:bg-white/5 rounded-lg"
                    onClick={() => {
                      // Show group members
                      console.log('Show group members');
                    }}
                    title="View group members"
                  >
                    <Users className="w-4 h-4 text-violet-400" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-white/5 rounded-lg">
                  <Phone className="w-4 h-4 text-gray-400" />
                </Button>
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-white/5 rounded-lg">
                  <Video className="w-4 h-4 text-gray-400" />
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
                      "flex gap-3 group relative",
                      message.sender_id === currentUserId ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.sender_id !== currentUserId && (
                      <Avatar className="w-8 h-8 flex-shrink-0 border border-violet-500/30">
                        <AvatarImage src={message.sender?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white font-semibold text-sm">
                          {(message.sender?.full_name || 'U').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm relative",
                        message.sender_id === currentUserId
                          ? "bg-[#6366f1] text-white rounded-br-sm"
                          : "bg-[#2a2f3a] text-gray-100 border border-white/10 rounded-bl-sm"
                      )}
                    >
                      <p className="leading-relaxed">{message.content}</p>
                      
                      {/* Reactions */}
                      {message.reactions && Object.keys(message.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(message.reactions).map(([emoji, userIds]) => (
                            <button
                              key={emoji}
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors",
                                message.sender_id === currentUserId 
                                  ? "bg-white/20 hover:bg-white/30 text-white" 
                                  : "bg-zinc-700 hover:bg-zinc-600 text-gray-200"
                              )}
                            >
                              <span>{emoji}</span>
                              <span>{userIds.length}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action buttons on hover */}
                      <div className={cn(
                        "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
                        message.sender_id === currentUserId ? "left-0 -translate-x-full -ml-2" : "right-0 translate-x-full mr-2"
                      )}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 bg-zinc-800 hover:bg-zinc-700 border border-white/10"
                          onClick={() => {
                            // Handle reaction
                            console.log('React to message:', message.id);
                          }}
                        >
                          😊
                        </Button>
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-1">
                        <span className={cn(
                          "text-[10px]",
                          message.sender_id === currentUserId
                            ? "text-white/70"
                            : "text-gray-400"
                        )}>
                          {format(new Date(message.created_at), 'h:mm a')}
                        </span>
                        {getMessageStatus(message)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {typingUsers.length > 0 && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="w-8 h-8 flex-shrink-0 border border-violet-500/30">
                      <AvatarImage src={selectedConversation.participants[0]?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-brand to-orange-300 text-white font-semibold text-sm">
                        {selectedConversation.participants[0]?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-[#2a2f3a] border border-violet-500/30 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                        <span className="text-xs text-gray-400">typing...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-white/5">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <Input
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 text-sm rounded-xl bg-white/5 border border-violet-500/30 focus:border-violet-500/50 focus:bg-white/[0.07] transition-colors placeholder:text-gray-500"
                  disabled={isSending}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newMessage.trim() || isSending}
                  className={cn(
                    "w-10 h-10 p-0 rounded-xl transition-colors shadow-lg",
                    !newMessage.trim() || isSending
                      ? "bg-violet-500/30 text-violet-300 shadow-violet-500/20"
                      : "bg-violet-500 text-white hover:bg-violet-600 shadow-violet-500/30 hover:shadow-violet-500/40"
                  )}
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
              <div className="relative w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/30 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-indigo-500/15 to-pink-500/20 rounded-2xl blur-lg" />
                <Send className="w-8 h-8 text-violet-400 relative z-10" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">
                {conversations.length === 0
                  ? "No conversations yet"
                  : "Select a conversation to start messaging"
                }
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Start connecting with your network
              </p>
              <Button
                onClick={() => window.location.href = '/messages'}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40"
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
