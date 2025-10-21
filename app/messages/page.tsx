"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Search,
  Plus,
  MoreVertical,
  Info,
  Star,
  Archive,
  Trash2,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Send,
  Check,
  CheckCheck,
} from "lucide-react";
import { MessageBubble } from "@/components/messaging/message-bubble";
import { ChatInput } from "@/components/messaging/chat-input";
import { NewMessageDialog } from "@/components/messaging/new-message-dialog";
import { useRealtimeMessaging } from "@/hooks/use-realtime-messaging";
import type { ConversationListItem, ChatMessage } from "@/types/messaging";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import DashboardNavbar from "@/components/navigation/dashboard-navbar";

export default function MessagesPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredConversations, setFilteredConversations] = useState<ConversationListItem[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          setCurrentUserId(authUser.id);

          const profileResponse = await fetch('/api/profile');
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            setUser({
              name: profileData.profile?.full_name || authUser.email?.split('@')[0] || 'User',
              email: authUser.email || '',
              avatar: profileData.profile?.avatar_url || '',
              username: profileData.profile?.username || '',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Memoized load conversations function
  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();

        const items: ConversationListItem[] = data.conversations.map((conv: any) => {
          let otherUser = null;
          if (conv.type === "direct" && conv.participants?.length >= 2) {
            const otherParticipant = conv.participants.find((p: any) => p.id !== currentUserId);
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
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  }, [currentUserId]);

  // Load conversations when currentUserId is available
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Filter conversations based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredConversations(
        conversations.filter((conv) => {
          const otherUser = conv.other_user;
          const name = otherUser?.full_name || otherUser?.username || conv.conversation.name || '';
          return name.toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  // Load messages when conversation changes
  const loadMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        const chatMessages: ChatMessage[] = (data.messages || []).map((msg: any) => ({
          ...msg,
          is_own_message: msg.sender_id === currentUserId,
          show_sender: true,
          show_timestamp: true,
        }));
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation, loadMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for open-conversation events
  useEffect(() => {
    const handleOpenConversation = (event: CustomEvent) => {
      if (event.detail?.conversationId) {
        setActiveConversation(event.detail.conversationId);
        loadConversations();
      }
    };

    const handleConversationsReload = () => {
      loadConversations();
      if (activeConversation) {
        loadMessages(activeConversation);
      }
    };

    window.addEventListener("open-conversation" as any, handleOpenConversation);
    window.addEventListener("conversations:reload" as any, handleConversationsReload);

    return () => {
      window.removeEventListener("open-conversation" as any, handleOpenConversation);
      window.removeEventListener("conversations:reload" as any, handleConversationsReload);
    };
  }, [activeConversation, loadConversations, loadMessages]);

  // Real-time messaging
  const handleNewMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  const handleMessageUpdate = useCallback((message: ChatMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
  }, []);

  const handleMessageDelete = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  useRealtimeMessaging({
    conversationId: activeConversation,
    currentUserId: currentUserId || '',
    onNewMessage: handleNewMessage,
    onMessageUpdate: handleMessageUpdate,
    onMessageDelete: handleMessageDelete,
  });

  const handleSendMessage = async (content: string, replyToId?: string) => {
    if (!activeConversation || !content.trim()) return;

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: activeConversation,
          content: content.trim(),
          reply_to_message_id: replyToId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newMessage: ChatMessage = {
          ...data.message,
          is_own_message: true,
          show_sender: true,
          show_timestamp: true,
        };
        setMessages((prev) => [...prev, newMessage]);
        setReplyingTo(null);
        loadConversations();
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversation(conversationId);
  };

  const activeConversationData = conversations.find(
    (conv) => conv.conversation.id === activeConversation
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-brand via-purple-500 to-cyan-500 rounded-full blur-2xl opacity-20 animate-pulse" />
          <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-brand" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col overflow-hidden">
      {/* Animated background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-brand/10 via-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-500/10 via-blue-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      {/* Navbar */}
      {user && <DashboardNavbar user={user} />}

      {/* Main Container */}
      <div className="flex-1 flex pt-20 px-6 pb-6 gap-4 relative z-10 max-w-[1800px] mx-auto w-full">
        {/* Left Sidebar - Conversations */}
        <div className="w-96 flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-card/95 via-card/80 to-card/60 backdrop-blur-2xl shadow-2xl overflow-hidden">
          {/* Glassmorphic overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="relative p-6 border-b border-white/10 bg-gradient-to-br from-card/50 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand via-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-brand/25">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Messages
                  </h1>
                  <p className="text-xs text-muted-foreground">{conversations.length} conversations</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 w-9 p-0 hover:bg-white/10 transition-all duration-300 hover:scale-110"
                  onClick={() => setShowNewMessageDialog(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Search with glow effect */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-brand/20 via-purple-500/20 to-cyan-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/30 border-white/10 focus:border-brand/50 backdrop-blur-sm transition-all duration-300 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-hidden relative">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-1">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-12 px-6">
                    <div className="relative inline-block mb-4">
                      <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-purple-500/20 rounded-full blur-xl" />
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">No messages yet</p>
                    <p className="text-xs text-muted-foreground/60">Start a conversation with your connections</p>
                  </div>
                ) : (
                  filteredConversations.map((item, index) => (
                    <div
                      key={item.conversation.id}
                      onClick={() => handleConversationSelect(item.conversation.id)}
                      className={cn(
                        "relative p-3 rounded-xl cursor-pointer transition-all duration-300 group animate-in fade-in-0 slide-in-from-left-2",
                        activeConversation === item.conversation.id
                          ? "bg-gradient-to-r from-brand/15 via-purple-500/10 to-transparent border-l-2 border-brand shadow-lg shadow-brand/10"
                          : "hover:bg-white/5 hover:shadow-lg hover:shadow-white/5"
                      )}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      {/* Hover glow */}
                      <div className="absolute inset-0 bg-gradient-to-r from-brand/10 to-purple-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

                      <div className="relative flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-12 h-12 border-2 border-white/10 shadow-lg">
                            <AvatarImage src={item.other_user?.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-brand to-purple-500 text-white font-semibold">
                              {item.other_user?.full_name?.charAt(0) ||
                               item.other_user?.username?.charAt(0) ||
                               "U"}
                            </AvatarFallback>
                          </Avatar>
                          {/* Online indicator */}
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card shadow-lg" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-sm truncate">
                              {item.conversation.type === "direct"
                                ? item.other_user?.full_name || item.other_user?.username || "Unknown"
                                : item.conversation.name || "Group Chat"}
                            </h4>
                            {item.last_message && (
                              <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0 font-medium">
                                {new Date(item.last_message.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground truncate flex-1">
                              {item.last_message?.content || "No messages yet"}
                            </p>

                            {item.unread_count > 0 && (
                              <Badge className="h-5 min-w-[20px] px-1.5 bg-gradient-to-br from-brand to-purple-500 text-white text-[10px] font-bold shadow-lg shadow-brand/50">
                                {item.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Right Side - Chat Area */}
        <div className="flex-1 flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-card/95 via-card/80 to-card/60 backdrop-blur-2xl shadow-2xl overflow-hidden">
          {/* Glassmorphic overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="relative p-4 border-b border-white/10 bg-gradient-to-r from-card/50 to-transparent backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-11 h-11 border-2 border-white/10 shadow-lg">
                        <AvatarImage src={activeConversationData?.other_user?.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-brand to-purple-500 text-white font-semibold">
                          {activeConversationData?.other_user?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card shadow-lg" />
                    </div>

                    <div>
                      <h3 className="font-bold text-sm bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        {activeConversationData?.conversation.type === "direct"
                          ? activeConversationData?.other_user?.full_name ||
                            activeConversationData?.other_user?.username ||
                            "Unknown User"
                          : activeConversationData?.conversation.name || "Group Chat"}
                      </h3>
                      {activeConversationData?.other_user?.username && (
                        <p className="text-xs text-muted-foreground font-medium">
                          @{activeConversationData.other_user.username} • Active now
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {[
                      { icon: Star, color: "from-yellow-500 to-orange-500" },
                      { icon: Archive, color: "from-blue-500 to-cyan-500" },
                      { icon: Trash2, color: "from-red-500 to-pink-500" },
                      { icon: Info, color: "from-purple-500 to-pink-500" }
                    ].map((item, i) => (
                      <Button
                        key={i}
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 hover:bg-white/10 transition-all duration-300 hover:scale-110 group relative"
                      >
                        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300", item.color)} />
                        <item.icon className="w-4 h-4 relative z-10" />
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-hidden relative">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full min-h-[400px]">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-brand via-purple-500 to-cyan-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                          <div className="relative animate-spin rounded-full h-10 w-10 border-b-2 border-brand" />
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full min-h-[400px]">
                        <div className="text-center">
                          <div className="relative inline-block mb-4">
                            <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-purple-500/20 rounded-full blur-xl" />
                            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm flex items-center justify-center">
                              <MessageSquare className="w-10 h-10 text-muted-foreground/50" />
                            </div>
                          </div>
                          <p className="font-semibold text-lg mb-1">No messages yet</p>
                          <p className="text-sm text-muted-foreground">Start the conversation!</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 max-w-4xl mx-auto">
                        {messages.map((message, index) => (
                          <div
                            key={message.id}
                            className="animate-in fade-in-0 slide-in-from-bottom-2"
                            style={{ animationDelay: `${index * 20}ms` }}
                          >
                            <MessageBubble
                              message={message}
                              onReply={() => setReplyingTo(message)}
                            />
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Chat Input */}
              <div className="relative border-t border-white/10 bg-gradient-to-r from-card/50 to-transparent backdrop-blur-sm">
                <ChatInput
                  conversationId={activeConversation}
                  onSendMessage={handleSendMessage}
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                  placeholder="Write a message..."
                  disabled={messagesLoading}
                />
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md px-6">
                <div className="relative inline-block mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-brand/30 via-purple-500/30 to-cyan-500/30 rounded-full blur-3xl animate-pulse" />
                  <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-brand/20 via-purple-500/20 to-cyan-500/20 backdrop-blur-sm flex items-center justify-center shadow-2xl">
                    <MessageSquare className="w-16 h-16 text-brand" />
                  </div>
                </div>

                <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-foreground via-brand to-purple-500 bg-clip-text text-transparent">
                  Your Messages
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Send private messages to your connections. Select a conversation to start messaging or create a new one.
                </p>

                <Button
                  onClick={() => setShowNewMessageDialog(true)}
                  className="relative group bg-gradient-to-r from-brand via-purple-500 to-cyan-500 hover:opacity-90 transition-all duration-500 shadow-2xl shadow-brand/50 px-8 py-6 text-base font-semibold"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-brand via-purple-500 to-cyan-500 rounded-lg blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
                  <Plus className="w-5 h-5 mr-2 relative z-10" />
                  <span className="relative z-10">Start New Conversation</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Message Dialog */}
      <NewMessageDialog
        open={showNewMessageDialog}
        onClose={() => setShowNewMessageDialog(false)}
        onConversationCreated={(conversationId) => {
          setActiveConversation(conversationId);
          setShowNewMessageDialog(false);
          loadConversations();
        }}
      />
    </div>
  );
}