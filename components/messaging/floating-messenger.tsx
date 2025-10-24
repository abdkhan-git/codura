"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  X,
  Minimize2,
  Maximize2,
  Search,
  Plus,
  Users,
  Move,
} from "lucide-react";
import { ConversationListItemComponent } from "./conversation-list-item";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { NewMessageDialog } from "./new-message-dialog";
import type { ConversationListItem, ChatMessage } from "@/types/messaging";
import { toast } from "sonner";

interface FloatingMessengerProps {
  currentUserId: string;
}

export function FloatingMessenger({ currentUserId }: FloatingMessengerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Calculate total unread count
  useEffect(() => {
    const total = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);
    setUnreadCount(total);
  }, [conversations]);

  // Listen for messenger:open events to open conversations from anywhere
  useEffect(() => {
    const handleOpenMessenger = (event: CustomEvent) => {
      setIsOpen(true);
      if (event.detail?.conversationId) {
        setActiveConversation(event.detail.conversationId);
      }
      // Load conversations when messenger opens
      loadConversations();
    };

    const handleToggleMessenger = () => {
      setIsOpen(prev => !prev);
      if (!isOpen) {
        loadConversations();
      }
    };

    window.addEventListener("messenger:open" as any, handleOpenMessenger);
    window.addEventListener("toggle-messenger" as any, handleToggleMessenger);
    return () => {
      window.removeEventListener("messenger:open" as any, handleOpenMessenger);
      window.removeEventListener("toggle-messenger" as any, handleToggleMessenger);
    };
  }, [isOpen]);

  // Drag functionality - only for floating button (when closed)
  const handleFloatingButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const loadConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();
        // Transform to ConversationListItem format
        const items: ConversationListItem[] = data.conversations.map((conv: any) => ({
          conversation: conv,
          other_user: conv.type === "direct" && conv.participants?.length > 0
            ? {
                user_id: conv.participants[0]?.id,
                username: conv.participants[0]?.username || '',
                full_name: conv.participants[0]?.name,
                avatar_url: conv.participants[0]?.avatar || undefined,
                is_online: conv.participants[0]?.is_online || false,
                last_seen: conv.participants[0]?.last_seen,
              }
            : null,
          unread_count: conv.unread_count || 0,
          last_message: conv.last_message,
          is_typing: false,
        }));
        setConversations(items);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        // Transform to ChatMessage format
        const chatMessages: ChatMessage[] = data.messages.map((msg: any) => ({
          ...msg,
          is_own_message: msg.sender_id === currentUserId,
          show_sender: true,
          show_timestamp: true,
        }));
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string, replyToId?: string) => {
    if (!activeConversation) return;

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: activeConversation,
          content,
          reply_to_message_id: replyToId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Add new message to list
        const newMessage: ChatMessage = {
          ...data.message,
          is_own_message: true,
          show_sender: true,
          show_timestamp: true,
        };
        setMessages([...messages, newMessage]);
        setReplyingTo(null);
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      toast.error("Failed to send message");
      throw error;
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update message reactions
        setMessages(messages.map(msg =>
          msg.id === messageId ? { ...msg, reactions: data.reactions } : msg
        ));
      }
    } catch (error) {
      toast.error("Failed to add reaction");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove message from list
        setMessages(messages.filter(msg => msg.id !== messageId));
        toast.success("Message deleted");
      }
    } catch (error) {
      toast.error("Failed to delete message");
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = conv.conversation.type === "direct"
      ? conv.other_user?.full_name || conv.other_user?.username || ""
      : conv.conversation.name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <>
      {/* Floating Button - Draggable when closed */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          onMouseDown={handleFloatingButtonMouseDown}
          className={cn(
            "fixed h-14 w-14 rounded-full z-50",
            "bg-gradient-to-br from-brand to-purple-600",
            "hover:from-brand/90 hover:to-purple-600/90",
            "shadow-2xl shadow-brand/50",
            "transition-all duration-200",
            "hover:scale-110 hover:shadow-3xl",
            isDragging ? "cursor-grabbing scale-105" : "cursor-grab",
            // Visual drag indicator - subtle pulsing effect
            "animate-pulse hover:animate-none",
            // Subtle border to indicate draggability
            "border-2 border-white/20 hover:border-white/40"
          )}
          style={{
            left: position.x || undefined,
            top: position.y || undefined,
            right: position.x ? undefined : 24,
            bottom: position.y ? undefined : 24,
          }}
          title="Drag to move • Click to open messages"
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6" />
            {/* Subtle drag indicator */}
            <Move className="absolute -bottom-1 -right-1 w-3 h-3 text-white/60" />
          </div>
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 rounded-full"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      )}

      {/* Messenger Window */}
      {isOpen && (
        <div
          ref={widgetRef}
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "bg-zinc-950 border-2 border-white/10 rounded-2xl shadow-2xl",
            "backdrop-blur-xl overflow-hidden transition-all duration-300",
            isMinimized ? "w-80 h-16" : "w-96 h-[600px]",
            "flex flex-col"
          )}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-brand/10 to-purple-600/10"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand" />
              <h3 className="font-semibold">
                {activeConversation ? "Chat" : "Messages"}
              </h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="h-5 px-2">
                  {unreadCount}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0"
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsOpen(false);
                  setActiveConversation(null);
                }}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <>
              {!activeConversation ? (
                // Conversations List
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Search and New Message */}
                  <div className="p-4 border-b border-white/5 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search conversations..."
                        className="pl-10 bg-zinc-900/50 border-white/10"
                      />
                    </div>
                    <Button
                      onClick={() => setShowNewMessageDialog(true)}
                      className="w-full bg-gradient-to-br from-brand to-purple-600 hover:from-brand/90 hover:to-purple-600/90"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Message
                    </Button>
                  </div>

                  {/* Conversations */}
                  <ScrollArea className="flex-1">
                    {filteredConversations.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No conversations yet</p>
                        <p className="text-sm mt-2">
                          Start messaging your connections!
                        </p>
                      </div>
                    ) : (
                      filteredConversations.map((conv) => (
                        <ConversationListItemComponent
                          key={conv.conversation.id}
                          conversation={conv}
                          isActive={activeConversation === conv.conversation.id}
                          onClick={() => setActiveConversation(conv.conversation.id)}
                        />
                      ))
                    )}
                  </ScrollArea>
                </div>
              ) : (
                // Chat View
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-white/5 flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActiveConversation(null);
                        setMessages([]);
                        setReplyingTo(null);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>

                    {(() => {
                      const conv = conversations.find(
                        (c) => c.conversation.id === activeConversation
                      );
                      if (!conv) return null;

                      const displayName =
                        conv.conversation.type === "direct"
                          ? conv.other_user?.full_name ||
                            conv.other_user?.username ||
                            "Unknown"
                          : conv.conversation.name || "Group Chat";

                      const displayAvatar =
                        conv.conversation.type === "direct"
                          ? conv.other_user?.avatar_url
                          : conv.conversation.avatar_url;

                      return (
                        <>
                          {conv.conversation.type === "group" ? (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center flex-shrink-0">
                              <Users className="w-5 h-5 text-white" />
                            </div>
                          ) : (
                            <Avatar className="w-10 h-10 flex-shrink-0">
                              <AvatarImage src={displayAvatar || ""} />
                              <AvatarFallback className="bg-gradient-to-br from-brand to-purple-600 text-white">
                                {displayName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{displayName}</h4>
                            {conv.conversation.type === "direct" &&
                              conv.other_user?.is_online && (
                                <span className="text-xs text-green-400">
                                  Active now
                                </span>
                              )}
                            {conv.is_typing && (
                              <span className="text-xs text-brand">Typing...</span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No messages yet</p>
                          <p className="text-sm mt-2">
                            Send a message to start the conversation!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message, index) => {
                          const prevMessage = messages[index - 1];
                          const showSender =
                            !prevMessage ||
                            prevMessage.sender_id !== message.sender_id ||
                            new Date(message.created_at).getTime() -
                              new Date(prevMessage.created_at).getTime() >
                              300000; // 5 minutes

                          return (
                            <MessageBubble
                              key={message.id}
                              message={{ ...message, show_sender: showSender }}
                              showSender={showSender}
                              onReply={setReplyingTo}
                              onDelete={handleDeleteMessage}
                              onReact={handleReact}
                            />
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Input */}
                  <ChatInput
                    conversationId={activeConversation}
                    onSendMessage={handleSendMessage}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* New Message Dialog */}
      <NewMessageDialog
        open={showNewMessageDialog}
        onClose={() => setShowNewMessageDialog(false)}
        onConversationCreated={(conversationId) => {
          setActiveConversation(conversationId);
          loadConversations();
        }}
      />
    </>
  );
}
