"use client";

import { useState, useEffect, useRef, useMemo } from "react";
// Removed useUser import - will fetch user data directly
import DashboardNavbar from "@/components/navigation/dashboard-navbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DefaultAvatar } from "@/components/ui/default-avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useRealtimeMessaging } from "@/hooks/use-realtime-messaging";
import { useRealtimeConversations } from "@/hooks/use-realtime-conversations";
import { useRealtimeTyping } from "@/hooks/use-realtime-typing";
import { ConversationMenuModal } from "@/components/messaging/conversation-menu-modal";
import { MessageBubble } from "@/components/messaging/message-bubble";
import { MessageSearch } from "@/components/messaging/message-search";
import { FileUpload } from "@/components/messaging/file-upload";
import { ReplyMessage } from "@/components/messaging/reply-message";
import {
  Send,
  MoreVertical,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";
import type { ConversationListItem, ChatMessage } from "@/types/messaging";

interface UserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
}

export default function MessagesPage() {
  const { theme } = useTheme();
  const [user, setUser] = useState<UserData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user ID from the user data
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Conversations list hook
  const {
    conversations,
    isLoading: conversationsLoading,
    refetch: fetchConversations
  } = useRealtimeConversations({
    currentUserId
  });

  // Messages for selected conversation
  const {
    messages,
    isLoading: messagesLoading,
    error: messagesError,
    sendMessage,
    markAsRead
  } = useRealtimeMessaging({
    conversationId: activeConversation,
    currentUserId
  });

  // Typing indicators
  const {
    typingUsers,
    sendTypingIndicator
  } = useRealtimeTyping({
    conversationId: activeConversation,
    currentUserId
  });

  const loading = conversationsLoading || messagesLoading;
  const isTyping = typingUsers.length > 0;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  // Track which messages we've already marked as read to prevent loops
  const markedAsReadRef = useRef<Set<string>>(new Set());

  // Mark messages as read when they arrive (debounced to prevent excessive calls)
  useEffect(() => {
    if (!messages || messages.length === 0 || !currentUserId) return;

    // Find unread messages that we haven't already tried to mark as read
    const unreadMessageIds = messages
      .filter((msg: any) =>
        msg.sender_id !== currentUserId &&
        !msg.read_by?.includes(currentUserId) &&
        !markedAsReadRef.current.has(msg.id)
      )
      .map((msg: any) => msg.id);

    if (unreadMessageIds.length > 0) {
      console.log('📖 Marking messages as read:', unreadMessageIds);

      // Mark them in our ref BEFORE calling the API to prevent duplicate calls
      unreadMessageIds.forEach(id => markedAsReadRef.current.add(id));

      markAsRead(unreadMessageIds);
    }
  }, [messages, currentUserId, markAsRead]);

  // Filter conversations based on search and archive status
  const [filteredConversations, setFilteredConversations] = useState<ConversationListItem[]>([]);

  // Transform conversations from useMessaging to ConversationListItem format
  const transformedConversations: ConversationListItem[] = useMemo(() => {
    return conversations?.map(conv => ({
      conversation: {
        id: conv.id,
        type: conv.type,
        name: conv.name,
        description: null,
        avatar_url: null,
        created_by: (conv as any).created_by || '',
        study_pod_id: null,
        is_archived: conv.is_archived,
        last_message_at: conv.last_message?.created_at || null,
        last_message_preview: conv.last_message?.content || null,
        metadata: {},
        created_at: (conv as any).created_at || new Date().toISOString(),
        updated_at: conv.updated_at || new Date().toISOString(),
      },
      other_user: conv.type === 'direct' && conv.participants?.length > 0 ? (() => {
        const otherUser = conv.participants[0];
        console.log('Debug - Conversation participants:', {
          conversationId: conv.id,
          participants: conv.participants,
          currentUserId,
          otherUser
        });
        return {
          user_id: otherUser?.id,
          username: otherUser?.username || '',
          full_name: otherUser?.name,
          avatar_url: otherUser?.avatar || undefined,
        };
      })() : undefined,
      participants: conv.participants || [],
      unread_count: conv.unread_count,
      last_message: conv.last_message ? {
        content: conv.last_message.content,
        sender_name: conv.last_message.sender_name,
        is_own_message: (conv.last_message as any).sender_id === currentUserId,
        created_at: conv.last_message.created_at,
      } : undefined,
      is_typing: false,
      typing_users: [],
    })) || [];
  }, [conversations, currentUserId]);

  // Fetch user data
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
            setUser({
            name: data.profile?.full_name || data.user?.email?.split('@')[0] || 'User',
            email: data.user?.email || '',
            avatar: data.profile?.avatar_url || data.profile?.full_name?.charAt(0).toUpperCase() || 'U',
            username: data.profile?.username || '',
          });
          // Set the current user ID - using user ID from the response
          setCurrentUserId(data.user?.id || data.profile?.user_id || '');
        } else if (response.status === 401) {
          // User is not authenticated, redirect to login
          window.location.href = '/login';
          return;
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        // If there's an error, redirect to login
        window.location.href = '/login';
      }
      }
    fetchUser();
  }, []);

  useEffect(() => {
    if (!transformedConversations) return;

    let filtered = transformedConversations;

    // Show/hide archived conversations based on toggle
    if (!showArchived) {
    filtered = filtered.filter(conv => !conv.conversation.is_archived);
    } else {
      filtered = filtered.filter(conv => conv.conversation.is_archived);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(conv => {
        const searchLower = searchQuery.toLowerCase();
        return (
          conv.conversation.name?.toLowerCase().includes(searchLower) ||
          conv.other_user?.full_name?.toLowerCase().includes(searchLower) ||
          conv.other_user?.username?.toLowerCase().includes(searchLower) ||
          conv.last_message?.content?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Sort by last message time
    filtered.sort((a, b) => {
      const aTime = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
      const bTime = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
      return bTime - aTime;
    });

    setFilteredConversations(filtered);
  }, [searchQuery, transformedConversations, showArchived]);

  const handleConversationSelect = (conversationId: string) => {
    setActiveConversation(conversationId);
    // markAsRead expects message IDs, not conversation ID
    // markAsRead([]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(newMessage.trim());
      setNewMessage("");
      // Scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleLeaveChat = async (conversationId: string) => {
    try {
      // Implementation for leaving chat
      console.log("Leave chat:", conversationId);
    } catch (error) {
      console.error("Error leaving chat:", error);
    }
  };

  const handleMuteToggle = async (conversationId: string, isMuted: boolean) => {
    try {
      // Implementation for mute toggle
      console.log("Mute toggle:", conversationId, isMuted);
    } catch (error) {
      console.error("Error toggling mute:", error);
    }
  };

  const handleRemoveMember = async (conversationId: string, userId: string) => {
    try {
      // Implementation for removing member
      console.log("Remove member:", conversationId, userId);
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  const handleDeleteChat = async (conversationId: string) => {
    try {
      // Implementation for deleting chat
      console.log("Delete chat:", conversationId);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleUnarchiveChat = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/unarchive`, {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh conversations
        fetchConversations();
        toast.success("Conversation unarchived");
      } else {
        toast.error("Failed to unarchive conversation");
      }
    } catch (error) {
      console.error("Error unarchiving conversation:", error);
      toast.error("Error unarchiving conversation");
    }
  };

  const handleArchiveChat = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/archive`, {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh conversations
        fetchConversations();
        toast.success("Conversation archived");
      } else {
        toast.error("Failed to archive conversation");
      }
    } catch (error) {
      console.error("Error archiving conversation:", error);
      toast.error("Error archiving conversation");
    }
  };

  const handleUpdateAvatar = async (conversationId: string, avatarUrl: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/avatar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });

      if (response.ok) {
        // Refresh conversations
        fetchConversations();
        toast.success("Avatar updated successfully");
      } else {
        toast.error("Failed to update avatar");
      }
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast.error("Error updating avatar");
    }
  };

  const handleFileUpload = async (attachment: any, messageType: string) => {
    if (!activeConversation) return;

    try {
      setIsSending(true);
      await sendMessage(attachment.url, messageType as any, [attachment] as any);
      setShowFileUpload(false);
      toast.success("File sent successfully");
    } catch (error) {
      console.error("Error sending file:", error);
      toast.error("Failed to send file");
    } finally {
      setIsSending(false);
    }
  };

  const handleReply = (message: ChatMessage) => {
    setReplyTo(message);
    setShowFileUpload(false);
  };

  const handleSendReply = async (content: string) => {
    if (!activeConversation || !replyTo) return;

    try {
      setIsSending(true);
      const replyContent = `Replying to ${replyTo.sender?.full_name || replyTo.sender?.username || 'Unknown'}: ${content}`;
      await sendMessage(replyContent);
      setReplyTo(null);
      toast.success("Reply sent");
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const handleEditMessage = async (message: ChatMessage) => {
    try {
      const response = await fetch(`/api/messages/${message.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: message.content }),
      });

      if (response.ok) {
        // Real-time update will happen automatically via postgres_changes
        toast.success("Message updated");
      } else {
        toast.error("Failed to update message");
      }
    } catch (error) {
      console.error("Error updating message:", error);
      toast.error("Error updating message");
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      });

      if (response.ok) {
        // Real-time update will happen automatically via postgres_changes
      } else {
        toast.error("Failed to add reaction");
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast.error("Error adding reaction");
    }
  };

  const getMessageStatusIcon = (message: ChatMessage) => {
    if (message.read_by?.includes((activeConversationData as any)?.participants?.[0]?.id)) {
      return <CheckCircle2 className="w-3 h-3 text-blue-500" />;
    } else if (message.read_by && message.read_by.length > 0) {
      return <CheckCircle2 className="w-3 h-3 text-gray-400" />;
      } else {
      return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const activeConversationData = filteredConversations.find(
    conv => conv.conversation.id === activeConversation
  );

  if (loading || !currentUserId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-indigo-500 to-pink-500 rounded-full blur-2xl opacity-20 animate-pulse" />
          <div className="relative animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
          <div className="mt-4 text-center">
            <p className="text-violet-400 text-sm">Loading messages...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Subtle ambient background like Connection Suggestions */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-violet-500/8 via-indigo-500/5 to-transparent rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-t from-pink-500/6 to-transparent rounded-full blur-[150px]" />
        <div className="absolute top-1/4 right-1/3 w-[300px] h-[300px] bg-gradient-to-br from-purple-500/4 to-violet-500/3 rounded-full blur-[100px]" />
      </div>

      {/* Navbar */}
      {user && <DashboardNavbar user={user} />}

      {/* Main Container */}
      <div className="flex-1 flex h-screen pt-16 gap-0 relative z-10 w-full">
        {/* Left Sidebar - Conversations */}
        <div className={cn(
          "relative w-80 flex flex-col border-r backdrop-blur-xl overflow-hidden",
          theme === 'light' 
            ? "border-gray-200 bg-white/95" 
            : "border-white/10 bg-zinc-900/95"
        )}>

          {/* Header */}
          <div className={cn(
            "relative p-4 border-b",
            theme === 'light' ? "border-gray-200" : "border-white/5"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-indigo-500/15 to-pink-500/20 rounded-xl blur-lg animate-pulse" />
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center border border-violet-500/30 backdrop-blur-sm">
                  <Send className={cn(
                    "w-5 h-5",
                    theme === 'light' ? "text-violet-600" : "text-violet-400"
                  )} />
                </div>
                </div>
                <div>
                  <h1 className={cn(
                    "text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                    theme === 'light' 
                      ? "from-gray-900 via-violet-600 to-pink-600" 
                      : "from-white via-violet-400 to-pink-400"
                  )}>Messages</h1>
                  <p className={cn(
                    "text-xs",
                    theme === 'light' ? "text-gray-600" : "text-gray-400"
                  )}>
                    {transformedConversations?.length || 0} {transformedConversations?.length === 1 ? 'conversation' : 'conversations'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                  onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                  title="Multi-select conversations"
                >
                  <CheckCircle2 className={cn(
                    "w-4 h-4",
                    theme === 'light' ? "text-gray-700" : "text-zinc-400"
                  )} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                  onClick={() => setShowMessageSearch(true)}
                  title="Search messages"
                >
                  <MoreVertical className={cn(
                    "w-4 h-4",
                    theme === 'light' ? "text-gray-700" : "text-zinc-400"
                  )} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-9 px-3 hover:bg-white/5 transition-colors",
                    showArchived && "bg-violet-500/10 text-violet-400"
                  )}
                  onClick={() => setShowArchived(!showArchived)}
                >
                  <Send className={cn(
                    "w-4 h-4 mr-1",
                    theme === 'light' ? "text-gray-700" : "text-zinc-400"
                  )} />
                  {showArchived ? "Active" : "Archived"}
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Send className={cn(
                "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4",
                theme === 'light' ? "text-gray-500" : "text-gray-500"
              )} />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "pl-10 transition-colors rounded-xl text-sm",
                  theme === 'light'
                    ? "bg-gray-100 border-gray-200 focus:border-violet-500/50 focus:bg-white"
                    : "bg-white/5 border-white/5 focus:border-emerald-500/50 focus:bg-white/[0.07]"
                )}
              />
            </div>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {isMultiSelectMode && selectedConversations.size > 0 && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-400">
                      {selectedConversations.size} conversation{selectedConversations.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          // TODO: Implement delete functionality
                          console.log('Delete conversations:', Array.from(selectedConversations));
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // TODO: Implement archive functionality
                          console.log('Archive conversations:', Array.from(selectedConversations));
                        }}
                      >
                        Archive
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {filteredConversations && filteredConversations.length > 0 ? (
                filteredConversations.map((item) => (
                    <div
                      key={item.conversation.id}
                      onClick={() => {
                        if (isMultiSelectMode) {
                          const newSelected = new Set(selectedConversations);
                          if (newSelected.has(item.conversation.id)) {
                            newSelected.delete(item.conversation.id);
                          } else {
                            newSelected.add(item.conversation.id);
                          }
                          setSelectedConversations(newSelected);
                        } else {
                          handleConversationSelect(item.conversation.id);
                        }
                      }}
                      className={cn(
                      "relative p-3 cursor-pointer transition-all duration-300 group",
                      theme === 'light' 
                        ? "border-b border-gray-200 hover:bg-gray-50"
                        : "border-b border-white/5 hover:bg-zinc-800/50",
                        activeConversation === item.conversation.id
                        ? (theme === 'light'
                            ? "bg-blue-50 border-l-4 border-l-blue-500"
                            : "bg-violet-500/20 border-l-4 border-l-violet-500")
                        : "bg-transparent",
                        selectedConversations.has(item.conversation.id) && isMultiSelectMode
                        ? "bg-blue-500/20 border-l-4 border-l-blue-500"
                        : ""
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {isMultiSelectMode && (
                          <div className="flex items-center justify-center w-5 h-5 mt-3">
                            <CheckCircle2 
                              className={cn(
                                "w-4 h-4",
                                selectedConversations.has(item.conversation.id)
                                  ? "text-blue-500"
                                  : "text-zinc-400"
                              )}
                            />
                          </div>
                        )}
                        <div className="relative flex-shrink-0">
                        <div className="relative">
                          <DefaultAvatar
                            src={(
                              item.conversation.type === 'group' 
                                ? (item.conversation as any).avatar_url
                                : item.other_user?.avatar_url
                            ) as string | null | undefined}
                            name={
                              item.conversation.type === 'group' 
                                ? item.conversation.name
                                : item.other_user?.full_name
                            }
                            username={
                              item.conversation.type === 'group' 
                                ? undefined
                                : item.other_user?.username
                            }
                            size="lg"
                            className="w-12 h-12 border-2 border-violet-500/40 backdrop-blur-sm shadow-lg shadow-violet-500/20 group-hover:border-violet-500/60 transition-all duration-300"
                          />
                          {/* Online indicator - only for 1-on-1 chats */}
                          {item.conversation.type === 'direct' && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1a1f2e] shadow-lg shadow-green-500/50 animate-pulse" />
                          )}
                          {/* Group chat indicator */}
                          {item.conversation.type === 'group' && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-violet-500 rounded-full border-2 border-[#1a1f2e] shadow-lg shadow-violet-500/50 flex items-center justify-center">
                              <Users className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <h3 className={cn(
                                "font-semibold text-sm truncate",
                                theme === 'light' ? "text-gray-900" : "text-white"
                              )}>
                                {item.conversation.name || item.other_user?.full_name || item.other_user?.username || 'Unknown'}
                              </h3>
                              {/* Group Chat Indicator */}
                              {item.conversation.type === 'group' && (
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-violet-400" />
                                  <span className="text-xs text-violet-400 font-medium">
                                    {item.participants?.length || 0}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {item.unread_count > 0 && (
                                <Badge className="h-5 min-w-[20px] px-1.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white text-[10px] font-bold rounded-full shadow-lg shadow-violet-500/40 animate-pulse">
                                  {item.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground truncate flex-1">
                              {item.last_message?.content || "No messages yet"}
                            </p>
                          <span className="text-xs text-muted-foreground/60">
                            {item.last_message?.created_at && formatDistanceToNow(new Date(item.last_message.created_at), { addSuffix: true })}
                          </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center mb-6 backdrop-blur-sm border border-violet-500/30 shadow-lg shadow-violet-500/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-pink-500/10 rounded-2xl blur-sm" />
                    <Send className="w-10 h-10 text-violet-400 relative z-10" />
                  </div>
                  <h3 className={cn(
                    "text-lg font-semibold mb-2",
                    theme === 'light' ? "text-gray-900" : "text-white"
                  )}>
                    {showArchived ? "No archived conversations" : "No messages yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground/80 max-w-sm">
                    {showArchived
                      ? "Archived conversations will appear here when you archive them"
                      : "Start a conversation with your connections to begin messaging"
                    }
                  </p>
                </div>
                )}
              </div>
            </ScrollArea>
        </div>

        {/* Right Side - Chat Area */}
          {activeConversation ? (
          <div className={cn(
            "flex-1 flex flex-col backdrop-blur-xl overflow-hidden",
            theme === 'light' ? "bg-white" : "bg-zinc-900/95"
          )}>
              {/* Chat Header */}
            <div className={cn(
              "relative p-4 border-b",
              theme === 'light' ? "border-gray-200" : "border-white/10"
            )}>
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DefaultAvatar
                    src={activeConversationData?.other_user?.avatar_url}
                    name={activeConversationData?.other_user?.full_name}
                    username={activeConversationData?.other_user?.username}
                    size="md"
                    className="w-10 h-10 border border-white/10"
                  />
                  <div>
                    <h2 className={cn(
                      "font-semibold",
                      theme === 'light' ? "text-gray-900" : "text-white"
                    )}>
                      {activeConversationData?.conversation.name || activeConversationData?.other_user?.full_name || activeConversationData?.other_user?.username || 'Unknown'}
                    </h2>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <p className={cn(
                        "text-xs",
                        theme === 'light' ? "text-gray-500" : "text-zinc-400"
                      )}>Active now</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                      onClick={() => setShowConversationMenu(true)}
                      title="Conversation settings"
                    >
                      <MoreVertical className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                    </Button>
                  </div>
                </div>
              </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message: any, index: number) => {
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const showSender = !prevMessage || prevMessage.sender_id !== message.sender_id;
                  
                  // Debug logging for message data
                  console.log('Rendering message:', {
                    id: message.id,
                    content: message.content,
                    sender_id: message.sender_id,
                    is_own_message: message.sender_id === currentUserId
                  });

                  return (
        <MessageBubble
          key={message.id || `temp-${Math.random()}`}
          message={{
            ...message,
            is_own_message: message.sender_id === currentUserId,
            sender: {
              id: message.sender_id,
              full_name: message.sender_id === currentUserId 
                ? 'You' 
                : (message.sender?.full_name || 'Unknown'),
              username: message.sender_id === currentUserId 
                ? undefined 
                : (message.sender?.username || undefined),
              avatar_url: message.sender_id === currentUserId 
                ? undefined 
                : (message.sender?.avatar_url || undefined),
            }
          }}
          showSender={showSender}
          onReply={handleReply}
          onEdit={handleEditMessage}
          onReact={handleReact}
        />
                  );
                })}
                {/* Scroll target for auto-scroll */}
                <div ref={messagesEndRef} />
                {isTyping && (
                  <div className="flex gap-3">
                    <DefaultAvatar
                      src={activeConversationData?.other_user?.avatar_url}
                      name={activeConversationData?.other_user?.full_name}
                      username={activeConversationData?.other_user?.username}
                      size="sm"
                      className="w-8 h-8 flex-shrink-0 border border-white/10"
                    />
                    <div className="bg-[#2a2f3a] border border-emerald-500/30 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

            {/* File Upload */}
            {showFileUpload && activeConversation && (
              <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                <FileUpload
                  conversationId={activeConversation}
                  onFileUploaded={handleFileUpload}
                  disabled={isSending}
                />
              </div>
            )}

            {/* Reply Message */}
            {replyTo && (
              <ReplyMessage
                replyTo={{
                  id: replyTo.id,
                  content: replyTo.content || '',
                  sender_name: replyTo.sender?.full_name || replyTo.sender?.username || 'Unknown',
                  sender_avatar: replyTo.sender?.avatar_url || undefined,
                  created_at: replyTo.created_at
                }}
                onSendReply={handleSendReply}
                onCancel={handleCancelReply}
                disabled={isSending}
              />
            )}

            {/* Message Input */}
            <div className="p-4 border-t border-white/5">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  className="px-3 bg-white/5 border-white/10 hover:border-violet-500/50 hover:bg-violet-500/10 transition-all duration-300 backdrop-blur-sm"
                >
                  📎
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    // Send typing indicator when user types
                    if (e.target.value.trim()) {
                      sendTypingIndicator();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/5 border-white/5 focus:border-emerald-500/50 focus:bg-white/[0.07] transition-colors rounded-xl text-sm"
                  disabled={isSending}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newMessage.trim() || isSending}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40"
                >
                  {isSending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
                  </div>
                </div>
        ) : (
          <div className={cn(
            "flex-1 flex items-center justify-center rounded-2xl border backdrop-blur-xl",
            theme === 'light' 
              ? "border-gray-200 bg-gray-50" 
              : "border-white/5 bg-[#1a1f2e]/95"
          )}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className={cn(
                "text-lg font-semibold mb-2",
                theme === 'light' ? "text-gray-900" : "text-white"
              )}>Select a conversation</h3>
              <p className={cn(
                "text-sm",
                theme === 'light' ? "text-gray-600" : "text-gray-400"
              )}>Choose a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>

      {/* Conversation Menu Modal */}
      {showConversationMenu && activeConversationData && (
        <ConversationMenuModal
          open={showConversationMenu}
          onOpenChange={setShowConversationMenu}
          conversation={{
            id: activeConversationData.conversation.id,
            type: activeConversationData.conversation.type === 'pod_chat' ? 'group' : activeConversationData.conversation.type,
            name: activeConversationData.conversation.name || activeConversationData.other_user?.full_name || activeConversationData.other_user?.username || 'Unknown',
            participants: (activeConversationData as any).participants?.map((p: any) => ({
              id: p.user_id,
              name: p.full_name || p.username,
              username: p.username,
              avatar: p.avatar,
              role: p.role,
            })),
            is_archived: activeConversationData.conversation.is_archived || false,
            is_muted: (activeConversationData as any).is_muted,
            muted_until: (activeConversationData as any).muted_until,
          }}
          currentUserId={currentUserId}
          onLeaveChat={handleLeaveChat}
          onMuteToggle={handleMuteToggle}
          onRemoveMember={handleRemoveMember}
          onDeleteChat={handleDeleteChat}
          onUnarchiveChat={handleUnarchiveChat}
          onArchiveChat={handleArchiveChat}
          onUpdateAvatar={handleUpdateAvatar}
        />
      )}

      {/* Message Search Modal */}
      <MessageSearch
        isOpen={showMessageSearch}
        onClose={() => setShowMessageSearch(false)}
        onSelectMessage={(messageId, conversationId) => {
          // TODO: Implement message selection and navigation
          console.log('Select message:', messageId, 'in conversation:', conversationId);
        }}
        conversationId={activeConversation || undefined}
      />
    </div>
  );
}