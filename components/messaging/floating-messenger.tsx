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
  ChevronUp,
  ChevronDown,
  Search,
  Plus,
  Users,
  GripVertical,
  Minimize2,
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
  console.log("FloatingMessenger component mounted with userId:", currentUserId);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dragging state for floating button
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const [isButtonDragging, setIsButtonDragging] = useState(false);
  const [buttonDragOffset, setButtonDragOffset] = useState({ x: 0, y: 0 });
  const [showButton, setShowButton] = useState(true);
  const buttonRef = useRef<HTMLDivElement>(null);
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

  // Dragging handlers for floating button
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleButtonMouseDown = (e: React.MouseEvent) => {
    if (!buttonRef.current) return;

    // Record start position to detect if this is a drag or click
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    const rect = buttonRef.current.getBoundingClientRect();
    setButtonDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsButtonDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isButtonDragging) return;

      const newX = e.clientX - buttonDragOffset.x;
      const newY = e.clientY - buttonDragOffset.y;

      // Constrain to viewport
      const buttonSize = 56; // 14 * 4 (w-14 h-14)
      const maxX = window.innerWidth - buttonSize;
      const maxY = window.innerHeight - buttonSize;

      setButtonPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsButtonDragging(false);

      // Check if this was a click (no movement) or a drag
      const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
      const deltaY = Math.abs(e.clientY - dragStartPos.current.y);
      const wasClick = deltaX < 5 && deltaY < 5;

      if (wasClick) {
        // This was a click, open the widget
        setIsOpen(true);
      }
    };

    if (isButtonDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isButtonDragging, buttonDragOffset]);

  // Listen for open-conversation events to open conversations from anywhere
  useEffect(() => {
    const handleOpenConversation = (event: CustomEvent) => {
      console.log("open-conversation event received", event.detail);
      setIsOpen(true);
      if (event.detail?.conversationId) {
        setActiveConversation(event.detail.conversationId);
        loadMessages(event.detail.conversationId);
      }
      // Load conversations when messenger opens
      loadConversations();
    };

    const handleConversationsReload = () => {
      console.log("conversations:reload event received");
      loadConversations();
      // Reload messages for active conversation
      if (activeConversation) {
        loadMessages(activeConversation);
      }
    };

    console.log("Adding event listeners");
    window.addEventListener("open-conversation" as any, handleOpenConversation);
    window.addEventListener("conversations:reload" as any, handleConversationsReload);

    return () => {
      console.log("Removing event listeners");
      window.removeEventListener("open-conversation" as any, handleOpenConversation);
      window.removeEventListener("conversations:reload" as any, handleConversationsReload);
    };
  }, [activeConversation]);

  const loadConversations = async () => {
    console.log("Loading conversations...");
    try {
      const response = await fetch("/api/conversations");
      console.log("Conversations API response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("Conversations data:", data);
        console.log("Current user ID:", currentUserId);

        // Transform to ConversationListItem format
        const items: ConversationListItem[] = data.conversations.map((conv: any) => {
          console.log("Processing conversation:", conv.id, "participants:", conv.participants);

          // For direct messages, find the other participant
          let otherUser = null;
          if (conv.type === "direct" && conv.participants?.length >= 2) {
            const otherParticipant = conv.participants.find((p: any) => p.id !== currentUserId);
            console.log("Other participant found:", otherParticipant);

            if (otherParticipant) {
              otherUser = {
                user_id: otherParticipant.id,
                full_name: otherParticipant.name || 'Unknown',
                username: otherParticipant.username || '',
                avatar_url: otherParticipant.avatar || null,
                is_online: false
              };
            }
          }

          return {
            conversation: conv,
            other_user: otherUser,
            unread_count: conv.unread_count || 0,
            last_message: conv.last_message,
            is_typing: false,
          };
        });
        setConversations(items);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error("Failed to load conversations:", response.status, errorData);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
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
      {/* Floating Button - Draggable */}
      {!isOpen && showButton && (
        <div
          ref={buttonRef}
          className={cn(
            "fixed z-50 group",
            isButtonDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          style={{
            left: buttonPosition.x > 0 ? `${buttonPosition.x}px` : undefined,
            top: buttonPosition.y > 0 ? `${buttonPosition.y}px` : undefined,
            right: buttonPosition.x === 0 && buttonPosition.y === 0 ? "24px" : undefined,
            bottom: buttonPosition.x === 0 && buttonPosition.y === 0 ? "24px" : undefined,
            transition: isButtonDragging ? "none" : "all 0.3s",
          }}
          onMouseDown={handleButtonMouseDown}
        >
          {/* Close button for floating button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setShowButton(false);
            }}
            className={cn(
              "absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full z-10",
              "bg-red-500/90 hover:bg-red-600 text-white",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
              "shadow-lg"
            )}
            title="Hide messenger"
          >
            <X className="w-3 h-3" />
          </Button>

          <div
            className={cn(
              "h-14 w-14 rounded-full",
              "bg-gradient-to-br from-brand via-purple-500 to-cyan-500",
              "shadow-2xl shadow-brand/50",
              "relative overflow-hidden flex items-center justify-center"
            )}
          >
            {/* Animated glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <MessageSquare className="w-6 h-6 relative z-10" />

            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 rounded-full bg-red-500 text-white text-xs font-bold border-2 border-background shadow-lg z-20 animate-pulse pointer-events-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </div>

          {/* Drag hint */}
          <div className={cn(
            "absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap",
            "text-xs text-muted-foreground bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none",
            "shadow-lg border border-white/10"
          )}>
            Drag to move
          </div>
        </div>
      )}

      {/* Messenger Window */}
      {isOpen && (
        <div
          ref={widgetRef}
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "bg-gradient-to-br from-card/95 via-card/85 to-card/75 border-2 border-white/10 rounded-2xl shadow-2xl",
            "backdrop-blur-2xl overflow-hidden transition-all duration-300",
            isMinimized ? "w-80 h-16" : "w-96 h-[600px]",
            "flex flex-col"
          )}
        >
          {/* Glassmorphic overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-2xl" />

          {/* Header */}
          <div className="relative flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-brand/10 via-purple-600/10 to-transparent backdrop-blur-sm">
            <div className="flex items-center gap-2 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand via-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-brand/25">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                {activeConversation ? "Chat" : "Messages"}
              </h3>
              {unreadCount > 0 && (
                <Badge className="h-5 px-2 bg-gradient-to-br from-brand to-purple-500 text-white text-[10px] font-bold shadow-lg shadow-brand/50">
                  {unreadCount}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 relative z-10">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0 hover:bg-white/10 transition-all duration-300 hover:scale-110"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? (
                  <ChevronUp className="w-4 h-4" />
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
                  setIsMinimized(false);
                }}
                className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400 transition-all duration-300 hover:scale-110"
                title="Close"
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
