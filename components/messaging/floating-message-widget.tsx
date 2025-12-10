"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  Send,
  X,
  MoreVertical,
  Smile,
  Reply,
  Trash2,
  Archive,
  BellOff,
  Minimize,
  Maximize,
  MessageCircle,
  EyeOff,
} from "lucide-react";
import {
  getUserConversations,
  getConversationMessages,
  sendMessage as sendMessageUtil,
  addReaction,
  deleteMessage as deleteMessageUtil,
  sendTypingIndicator,
  clearTypingIndicator,
  getTypingUsers,
  archiveConversation,
  muteConversation,
  markLatestMessageAsRead,
} from "@/lib/messaging-utils";
import { toast } from "sonner";
import { DefaultAvatar } from "@/components/ui/default-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReadReceipts } from "@/hooks/use-read-receipts";
import { ReadReceipt } from "@/components/messaging/read-receipt";

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function FloatingMessageWidget() {
  const { theme } = useTheme();
  const pathname = usePathname();
  const supabase = createClient();
  
  // Hide widget on problems and live streams pages to avoid blocking stream chat send button
  const isProblemsPage = pathname?.startsWith('/problems/');
  const isLiveStreamsPage = pathname?.startsWith('/live-streams/');
  const shouldHideWidget = isProblemsPage || isLiveStreamsPage;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Read receipts
  const { readReceipts } = useReadReceipts({
    conversationId: selectedConversationId,
    messages,
    currentUserId,
    enabled: !!selectedConversationId,
    scrollContainerRef: messagesContainerRef,
  });

  // Get current user
  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    }
    fetchUser();
  }, [supabase.auth]);

  // Fetch conversations
  useEffect(() => {
    if (!currentUserId) return;

    async function fetchConversations() {
      try {
        const convs = await getUserConversations();
        setConversations(convs);

        // Calculate unread count
        const totalUnread = convs.reduce(
          (acc: number, conv: any) => acc + (conv.unread_count || 0),
          0
        );
        setUnreadCount(totalUnread);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    }

    fetchConversations();

    // Subscribe to conversation updates
    const channel = supabase
      .channel("widget-conversations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const newMessage = payload.new as any;
            // Auto-open widget for new messages from others
            if (newMessage.sender_id !== currentUserId && !isOpen) {
              setIsOpen(true);
              setIsMinimized(false);
              // Find and select the conversation
              const convs = await getUserConversations();
              const conv = convs.find(
                (c: any) => c.id === newMessage.conversation_id
              );
              if (conv) {
                setSelectedConversationId(conv.id);
              }
            }
          }
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId, isOpen, supabase]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversationId) return;

    async function fetchMessages() {
      try {
        const msgs = await getConversationMessages(selectedConversationId);
        setMessages(msgs);

        // Mark latest message as read when opening conversation
        markLatestMessageAsRead(selectedConversationId);

        setTimeout(() => scrollToBottom(), 100);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    }

    fetchMessages();

    // Subscribe to message updates
    const messageChannel = supabase
      .channel(`widget-messages:${selectedConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        async () => {
          const msgs = await getConversationMessages(selectedConversationId);
          setMessages(msgs);
          setTimeout(() => scrollToBottom(), 100);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        async () => {
          const msgs = await getConversationMessages(selectedConversationId);
          setMessages(msgs);
        }
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel(`widget-typing:${selectedConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_typing_indicators",
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        async () => {
          const users = await getTypingUsers(selectedConversationId);
          setTypingUsers(users);
        }
      )
      .subscribe();

    return () => {
      messageChannel.unsubscribe();
      typingChannel.unsubscribe();
    };
  }, [selectedConversationId, supabase]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTyping = (value: string) => {
    setMessageInput(value);

    if (selectedConversationId) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send typing indicator
      if (value.length > 0) {
        sendTypingIndicator(selectedConversationId);

        // Clear indicator after 3 seconds of no typing
        typingTimeoutRef.current = setTimeout(() => {
          clearTypingIndicator(selectedConversationId);
        }, 3000);
      } else {
        clearTypingIndicator(selectedConversationId);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversationId || isSending) return;

    try {
      setIsSending(true);
      await sendMessageUtil(
        selectedConversationId,
        messageInput.trim(),
        replyToMessage?.id
      );
      setMessageInput("");
      setReplyToMessage(null);
      if (selectedConversationId) {
        await clearTypingIndicator(selectedConversationId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction(messageId, emoji);
      setShowEmojiPicker(null);
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast.error("Failed to add reaction");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessageUtil(messageId);
      toast.success("Message deleted");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  const handleArchiveConversation = async (conversationId: string) => {
    try {
      await archiveConversation(conversationId);
      toast.success("Conversation archived");
      setSelectedConversationId(null);
    } catch (error) {
      console.error("Error archiving conversation:", error);
      toast.error("Failed to archive conversation");
    }
  };

  const handleMuteConversation = async (conversationId: string) => {
    try {
      await muteConversation(conversationId);
      toast.success("Conversation muted");
    } catch (error) {
      console.error("Error muting conversation:", error);
      toast.error("Failed to mute conversation");
    }
  };

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  // Listen for toggle event from navbar
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => !prev);
      if (isHidden) setIsHidden(false);
    };

    window.addEventListener('toggle-messenger', handleToggle);
    return () => window.removeEventListener('toggle-messenger', handleToggle);
  }, [isHidden]);

  // Don't render on problems or live streams pages, or if hidden by user
  if (shouldHideWidget || isHidden) {
    return null;
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 left-6 z-30">
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "relative h-14 w-14 rounded-full shadow-lg transition-all hover:scale-110",
            "bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          )}
          aria-label="Open Messages"
        >
          <Send className="w-6 h-6 text-white" />
          {unreadCount > 0 && (
            <Badge
              className={cn(
                "absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center animate-pulse",
                "bg-red-500 text-white text-xs font-bold border-2 border-background"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  // Don't render on problems page
  if (isProblemsPage) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-30">
      <Card
        className={cn(
          "backdrop-blur-xl border-2 shadow-2xl transition-all duration-300",
          theme === "light"
            ? "bg-white/95 border-gray-200/50"
            : "bg-zinc-900/95 border-white/10",
          isMinimized
            ? "w-80 h-16"
            : "w-96 h-[600px] flex flex-col overflow-hidden"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "p-4 border-b flex items-center justify-between",
            theme === "light" ? "border-gray-200/50" : "border-white/10",
            "bg-gradient-to-br",
            theme === "light"
              ? "from-blue-50 to-purple-50"
              : "from-blue-950/20 to-purple-950/20"
          )}
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-brand" />
            <h3 className="font-semibold text-sm">
              {selectedConversation
                ? selectedConversation.type === "direct"
                  ? selectedConversation.other_user?.full_name || "User"
                  : selectedConversation.name || "Group Chat"
                : "Messages"}
            </h3>
            {unreadCount > 0 && !selectedConversation && (
              <Badge className="bg-red-500 text-white text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {selectedConversation && (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleArchiveConversation(selectedConversation.id)}
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleMuteConversation(selectedConversation.id)}
                    >
                      <BellOff className="w-4 h-4 mr-2" />
                      Mute
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    setIsHidden(true);
                    setIsOpen(false);
                    setSelectedConversationId(null);
                  }}
                >
                  <EyeOff className="w-4 h-4 mr-2" />
                  Hide Widget
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? (
                <Maximize className="w-4 h-4" />
              ) : (
                <Minimize className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setIsOpen(false);
                setSelectedConversationId(null);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {!selectedConversation ? (
              /* Conversation List */
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <div
                      className={cn(
                        "p-3 rounded-full mb-3",
                        theme === "light" ? "bg-gray-200" : "bg-zinc-800"
                      )}
                    >
                      <Send
                        className={cn(
                          "w-6 h-6",
                          theme === "light" ? "text-gray-500" : "text-gray-600"
                        )}
                      />
                    </div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        theme === "light" ? "text-gray-700" : "text-gray-400"
                      )}
                    >
                      No conversations yet
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversationId(conv.id)}
                        className={cn(
                          "w-full p-3 text-left transition-all flex items-start gap-3",
                          theme === "light"
                            ? "hover:bg-gray-100"
                            : "hover:bg-zinc-800/80",
                          theme === "light"
                            ? "border-gray-200"
                            : "border-white/10"
                        )}
                      >
                        <DefaultAvatar
                          name={
                            conv.type === "direct"
                              ? conv.other_user?.full_name || "User"
                              : conv.name || "Chat"
                          }
                          src={conv.other_user?.avatar_url}
                          className="w-10 h-10 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                "font-semibold text-sm truncate",
                                theme === "light"
                                  ? "text-gray-900"
                                  : "text-white"
                              )}
                            >
                              {conv.type === "direct"
                                ? conv.other_user?.full_name
                                : conv.name}
                            </p>
                            {conv.unread_count > 0 && (
                              <Badge className="flex-shrink-0 text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                                {conv.unread_count > 99
                                  ? "99+"
                                  : conv.unread_count}
                              </Badge>
                            )}
                          </div>
                          <p
                            className={cn(
                              "text-xs truncate mt-1",
                              theme === "light"
                                ? "text-gray-600"
                                : "text-gray-400"
                            )}
                          >
                            {conv.last_message || "No messages yet"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Message View */
              <>
                {/* Back button */}
                <div
                  className={cn(
                    "p-2 border-b flex items-center gap-2",
                    theme === "light" ? "border-gray-200/50" : "border-white/10"
                  )}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConversationId(null)}
                    className="text-xs"
                  >
                    ← Back
                  </Button>
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      data-message-id={msg.id}
                      data-sender-id={msg.sender_id}
                      className={cn(
                        "flex gap-2 group",
                        msg.sender_id === currentUserId && "justify-end"
                      )}
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      {msg.sender_id !== currentUserId && (
                        <DefaultAvatar
                          name={msg.sender?.full_name || "User"}
                          src={msg.sender?.avatar_url}
                          className="w-6 h-6 flex-shrink-0"
                        />
                      )}
                      <div className="flex flex-col max-w-xs">
                        {/* Reply preview */}
                        {msg.reply_to_message && (
                          <div
                            className={cn(
                              "text-xs mb-1 px-2 py-1 rounded-lg border-l-2 flex flex-col gap-0.5",
                              msg.sender_id === currentUserId
                                ? "bg-white/10 border-white/30"
                                : theme === "light"
                                ? "bg-gray-200/50 border-gray-400"
                                : "bg-zinc-700/50 border-zinc-500"
                            )}
                          >
                            <span
                              className={cn(
                                "font-semibold text-[10px]",
                                msg.sender_id === currentUserId
                                  ? "text-white/90"
                                  : theme === "light"
                                  ? "text-gray-700"
                                  : "text-gray-300"
                              )}
                            >
                              {msg.reply_to_message.sender?.full_name
                                ?.split(" ")[0] || "Someone"}
                            </span>
                            <span
                              className={cn(
                                "truncate max-w-[200px] text-[10px]",
                                msg.sender_id === currentUserId
                                  ? "text-white/70"
                                  : theme === "light"
                                  ? "text-gray-600"
                                  : "text-gray-400"
                              )}
                            >
                              {msg.reply_to_message.content}
                            </span>
                          </div>
                        )}

                        <div className="relative">
                          <div
                            className={cn(
                              "px-3 py-2 rounded-2xl backdrop-blur-sm border text-sm",
                              msg.sender_id === currentUserId
                                ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white border-blue-400/50"
                                : theme === "light"
                                ? "bg-gray-100 text-gray-900 border-gray-200/50"
                                : "bg-zinc-800/50 text-white border-white/10"
                            )}
                          >
                            {/* Message actions */}
                            {hoveredMessageId === msg.id && (
                              <div
                                className={cn(
                                  "absolute -top-6 flex gap-1 p-1 rounded-lg border backdrop-blur-sm shadow-lg z-10",
                                  msg.sender_id === currentUserId
                                    ? "right-0"
                                    : "left-0",
                                  theme === "light"
                                    ? "bg-white/90 border-gray-200"
                                    : "bg-zinc-800/90 border-white/10"
                                )}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() =>
                                    setShowEmojiPicker(
                                      showEmojiPicker === msg.id ? null : msg.id
                                    )
                                  }
                                >
                                  <Smile className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => setReplyToMessage(msg)}
                                >
                                  <Reply className="w-3 h-3" />
                                </Button>
                                {msg.sender_id === currentUserId && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-red-600 hover:text-red-700"
                                    onClick={() => handleDeleteMessage(msg.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Emoji picker */}
                            {showEmojiPicker === msg.id && (
                              <div
                                className={cn(
                                  "absolute z-20 p-2 rounded-lg border backdrop-blur-xl shadow-xl flex gap-1",
                                  msg.sender_id === currentUserId
                                    ? "right-0 -top-12"
                                    : "left-0 -top-12",
                                  theme === "light"
                                    ? "bg-white border-gray-200"
                                    : "bg-zinc-800 border-white/10"
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {EMOJI_LIST.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReaction(msg.id, emoji);
                                    }}
                                    className="hover:scale-125 transition-transform text-lg"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowEmojiPicker(null);
                                  }}
                                  className={cn(
                                    "ml-1 px-2 text-xs font-semibold",
                                    theme === "light"
                                      ? "text-gray-600"
                                      : "text-gray-400"
                                  )}
                                >
                                  ✕
                                </button>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-1">
                              <p className="break-words text-xs flex-1">{msg.content}</p>
                              <ReadReceipt
                                messageId={msg.id}
                                senderId={msg.sender_id}
                                currentUserId={currentUserId || ''}
                                readReceipts={readReceipts[msg.id] || []}
                                conversationType={selectedConversation?.type || 'direct'}
                                totalParticipants={2}
                              />
                            </div>

                            {/* Reactions */}
                            {msg.reactions &&
                              Object.keys(msg.reactions).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {Object.entries(msg.reactions).map(
                                    ([emoji, userIds]) => {
                                      const reactedUsers = (
                                        userIds as string[]
                                      ).map((userId) => {
                                        if (userId === currentUserId)
                                          return "You";
                                        const sender = messages.find(
                                          (m) => m.sender_id === userId
                                        )?.sender;
                                        return (
                                          sender?.full_name?.split(" ")[0] ||
                                          "Someone"
                                        );
                                      });
                                      const tooltipText =
                                        reactedUsers.join(", ");

                                      return (
                                        <button
                                          key={emoji}
                                          onClick={() =>
                                            handleReaction(msg.id, emoji)
                                          }
                                          title={tooltipText}
                                          className={cn(
                                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-all",
                                            (userIds as string[]).includes(
                                              currentUserId!
                                            )
                                              ? theme === "light"
                                                ? "bg-blue-100 border border-blue-300"
                                                : "bg-blue-900/30 border border-blue-500/30"
                                              : theme === "light"
                                              ? "bg-gray-100 border border-gray-300"
                                              : "bg-zinc-700/50 border border-zinc-600"
                                          )}
                                        >
                                          <span>{emoji}</span>
                                          <span
                                            className={cn(
                                              "text-[10px]",
                                              (userIds as string[]).includes(
                                                currentUserId!
                                              )
                                                ? theme === "light"
                                                  ? "text-blue-700"
                                                  : "text-blue-300"
                                                : theme === "light"
                                                ? "text-gray-600"
                                                : "text-gray-400"
                                            )}
                                          >
                                            {(userIds as string[]).length}
                                          </span>
                                        </button>
                                      );
                                    }
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {typingUsers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex gap-1 px-3 py-2 rounded-2xl",
                          theme === "light"
                            ? "bg-gray-200"
                            : "bg-zinc-800"
                        )}
                      >
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.4s" }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-xs",
                          theme === "light" ? "text-gray-600" : "text-gray-400"
                        )}
                      >
                        {typingUsers[0]?.full_name?.split(" ")[0] || "User"} is
                        typing...
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Reply preview above input */}
                {replyToMessage && (
                  <div
                    className={cn(
                      "px-4 py-2 border-t flex items-center justify-between",
                      theme === "light"
                        ? "bg-gray-50 border-gray-200"
                        : "bg-zinc-900/50 border-white/10"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">
                        Replying to{" "}
                        {replyToMessage.sender?.full_name?.split(" ")[0] ||
                          "User"}
                      </p>
                      <p
                        className={cn(
                          "text-xs truncate",
                          theme === "light" ? "text-gray-600" : "text-gray-400"
                        )}
                      >
                        {replyToMessage.content}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => setReplyToMessage(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                {/* Input */}
                <div
                  className={cn(
                    "p-3 border-t",
                    theme === "light" ? "border-gray-200/50" : "border-white/10"
                  )}
                >
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => handleTyping(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e as any);
                        }
                      }}
                      disabled={isSending}
                      className="flex-1 text-sm"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={
                        !messageInput.trim() || isSending
                      }
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
