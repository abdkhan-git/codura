'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
import DashboardNavbar from '@/components/navigation/dashboard-navbar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DefaultAvatar } from '@/components/ui/default-avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Send, MoreVertical, Users, Smile, Reply, Trash2, Archive, Bell, BellOff, LogOut, Check, X, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getAcceptedConnections,
  getUserConversations,
  getConversationMessages,
  sendMessage as sendMessageUtil,
  startConversation,
  getGroupChatMembers,
  addReaction,
  deleteMessage,
  archiveConversation,
  unarchiveConversation,
  muteConversation,
  unmuteConversation,
  leaveGroupChat,
  sendTypingIndicator,
  clearTypingIndicator,
  getTypingUsers,
  deleteConversationForUser,
} from '@/lib/messaging-utils';
import { useReadReceipts } from '@/hooks/use-read-receipts';
import { ReadReceipt } from '@/components/messaging/read-receipt';

interface DashboardUserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
}

export default function MessagesPage() {
  const { theme } = useTheme();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<DashboardUserData | null>(null);

  // Data state
  const [conversations, setConversations] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  // UI state
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations');
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupMemberCount, setGroupMemberCount] = useState(0);
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showArchivedConversations, setShowArchivedConversations] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  // Read receipts
  const { readReceipts } = useReadReceipts({
    conversationId: selectedConversationId,
    messages,
    currentUserId,
    enabled: !!selectedConversationId,
  });

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setCurrentUserId(session.user.id);

        const { data } = await supabase
          .from('users')
          .select('full_name, email, avatar_url, username')
          .eq('user_id', session.user.id)
          .single();

        if (data) {
          setCurrentUser({
            name: data.full_name,
            email: data.email,
            avatar: data.avatar_url || '',
            username: data.username,
          });
        }
      }
    };
    getUser();
  }, []);

  // Load conversations and connections
  useEffect(() => {
    if (!currentUserId) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const [convs, conns] = await Promise.all([
          getUserConversations(),
          getAcceptedConnections(),
        ]);
        setConversations(convs);
        setConnections(conns);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentUserId]);

  // Load messages for selected conversation + real-time updates
  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    let subscription: any = null;
    let typingSubscription: any = null;

    const loadMessages = async () => {
      try {
        const msgs = await getConversationMessages(selectedConversationId);
        setMessages(msgs);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    loadMessages();

    // Set up real-time listener for new messages
    const setupRealtimeListener = async () => {
      subscription = supabase
        .channel(`messages:${selectedConversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConversationId}`,
          },
          async (payload) => {
            // Fetch the new message with sender data
            const msgs = await getConversationMessages(selectedConversationId);
            setMessages(msgs);

            // Also reload conversations to update last message
            const convs = await getUserConversations();
            setConversations(convs);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConversationId}`,
          },
          async (payload) => {
            // Reload messages on update (reactions, edits, etc)
            const msgs = await getConversationMessages(selectedConversationId);
            setMessages(msgs);
          }
        )
        .subscribe();

      // Set up typing indicators subscription
      typingSubscription = supabase
        .channel(`typing:${selectedConversationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversation_typing_indicators',
            filter: `conversation_id=eq.${selectedConversationId}`,
          },
          async () => {
            const users = await getTypingUsers(selectedConversationId);
            setTypingUsers(users);
          }
        )
        .subscribe();
    };

    setupRealtimeListener();

    // Poll for typing users every 2 seconds
    const typingInterval = setInterval(async () => {
      const users = await getTypingUsers(selectedConversationId);
      setTypingUsers(users);
    }, 2000);

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
      if (typingSubscription) {
        supabase.removeChannel(typingSubscription);
      }
      clearInterval(typingInterval);
      clearTypingIndicator(selectedConversationId);
    };
  }, [selectedConversationId, supabase]);

  // Load group member count for group chats
  useEffect(() => {
    if (!selectedConversationId) {
      setGroupMemberCount(0);
      return;
    }

    const selectedConv = conversations.find((c) => c.id === selectedConversationId);
    if (selectedConv?.type === 'pod_chat' || selectedConv?.type === 'group') {
      const loadMemberCount = async () => {
        try {
          const members = await getGroupChatMembers(selectedConversationId);
          setGroupMemberCount(members.length);
        } catch (error) {
          console.error('Failed to load member count:', error);
        }
      };
      loadMemberCount();
    } else {
      setGroupMemberCount(0);
    }
  }, [selectedConversationId, conversations]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showEmojiPicker) {
        setShowEmojiPicker(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showEmojiPicker]);

  // Handle typing
  const handleTyping = useCallback(
    async (value: string) => {
      setMessageInput(value);
      if (selectedConversationId && value.trim()) {
        await sendTypingIndicator(selectedConversationId);
      } else if (selectedConversationId) {
        await clearTypingIndicator(selectedConversationId);
      }
    },
    [selectedConversationId]
  );

  // Send message
  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!messageInput.trim() || !selectedConversationId || isSending) return;

      try {
        setIsSending(true);
        await sendMessageUtil(selectedConversationId, messageInput, replyToMessage?.id);
        setMessageInput('');
        setReplyToMessage(null);
        await clearTypingIndicator(selectedConversationId);

        // Reload messages
        const msgs = await getConversationMessages(selectedConversationId);
        setMessages(msgs);

        // Reload conversations
        const convs = await getUserConversations();
        setConversations(convs);
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('Failed to send message');
      } finally {
        setIsSending(false);
      }
    },
    [selectedConversationId, messageInput, isSending, replyToMessage]
  );

  // Handle reaction
  const handleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await addReaction(messageId, emoji);
        setShowEmojiPicker(null);
        // Messages will reload via real-time subscription
      } catch (error) {
        console.error('Failed to add reaction:', error);
        toast.error('Failed to add reaction');
      }
    },
    []
  );

  // Handle delete message
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await deleteMessage(messageId);
        toast.success('Message deleted');
        // Messages will reload via real-time subscription
      } catch (error) {
        console.error('Failed to delete message:', error);
        toast.error('Failed to delete message');
      }
    },
    []
  );

  // Handle archive conversation
  const handleArchiveConversation = useCallback(
    async (conversationId: string) => {
      try {
        await archiveConversation(conversationId);
        toast.success('Conversation archived');
        const convs = await getUserConversations();
        setConversations(convs);
        setSelectedConversationId(null);
      } catch (error) {
        console.error('Failed to archive conversation:', error);
        toast.error('Failed to archive conversation');
      }
    },
    []
  );

  // Handle unarchive conversation
  const handleUnarchiveConversation = useCallback(
    async (conversationId: string) => {
      try {
        await unarchiveConversation(conversationId);
        toast.success('Conversation unarchived');
        const convs = await getUserConversations();
        setConversations(convs);
      } catch (error) {
        console.error('Failed to unarchive conversation:', error);
        toast.error('Failed to unarchive conversation');
      }
    },
    []
  );

  // Handle mute conversation
  const handleMuteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await muteConversation(conversationId);
        toast.success('Conversation muted');
        const convs = await getUserConversations();
        setConversations(convs);
      } catch (error) {
        console.error('Failed to mute conversation:', error);
        toast.error('Failed to mute conversation');
      }
    },
    []
  );

  // Handle unmute conversation
  const handleUnmuteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await unmuteConversation(conversationId);
        toast.success('Conversation unmuted');
        const convs = await getUserConversations();
        setConversations(convs);
      } catch (error) {
        console.error('Failed to unmute conversation:', error);
        toast.error('Failed to unmute conversation');
      }
    },
    []
  );

  // Handle leave group
  const handleLeaveGroup = useCallback(
    async (conversationId: string) => {
      try {
        await leaveGroupChat(conversationId);
        toast.success('Left group chat');
        const convs = await getUserConversations();
        setConversations(convs);
        setSelectedConversationId(null);
      } catch (error) {
        console.error('Failed to leave group:', error);
        toast.error('Failed to leave group');
      }
    },
    []
  );

  // Handle multi-select toggle
  const toggleConversationSelection = useCallback(
    (conversationId: string) => {
      setSelectedConversations((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(conversationId)) {
          newSet.delete(conversationId);
        } else {
          newSet.add(conversationId);
        }
        return newSet;
      });
    },
    []
  );

  // Handle delete selected conversations
  const handleDeleteSelected = useCallback(
    async () => {
      try {
        await Promise.all(
          Array.from(selectedConversations).map((id) =>
            deleteConversationForUser(id)
          )
        );
        toast.success(`${selectedConversations.size} conversation(s) deleted`);
        setSelectedConversations(new Set());
        setIsMultiSelectMode(false);
        const convs = await getUserConversations();
        setConversations(convs);
        setSelectedConversationId(null);
      } catch (error) {
        console.error('Failed to delete conversations:', error);
        toast.error('Failed to delete conversations');
      }
    },
    [selectedConversations]
  );

  // Start new conversation
  const handleStartConversation = useCallback(
    async (userId: string) => {
      try {
        const conversationId = await startConversation(userId);
        setSelectedConversationId(conversationId);
        const convs = await getUserConversations();
        setConversations(convs);
      } catch (error) {
        console.error('Failed to start conversation:', error);
        toast.error('Failed to start conversation');
      }
    },
    []
  );

  // Open group chat members dialog
  const handleOpenMembersDialog = useCallback(
    async (conversationId: string) => {
      try {
        const members = await getGroupChatMembers(conversationId);
        setGroupMembers(members);
        setShowMembersDialog(true);
      } catch (error) {
        console.error('Failed to load group members:', error);
        toast.error('Failed to load group members');
      }
    },
    []
  );

  // Filter conversations - support both direct messages and group chats, and archived
  const filteredConversations = conversations.filter((conv) => {
    // Filter by archived status
    if (showArchivedConversations && !conv.is_archived) return false;
    if (!showArchivedConversations && conv.is_archived) return false;

    // Filter by search query
    if (searchQuery === '') return true;

    return conv.type === 'direct'
      ? conv.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      : conv.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Filter connections
  const filteredConnections = connections.filter((conn) =>
    searchQuery === ''
      ? true
      : conn.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  if (!currentUser || !currentUserId) {
    return (
      <div className={cn(
        "min-h-screen bg-gradient-to-br",
        theme === 'light'
          ? "from-gray-50 via-white to-gray-50"
          : "from-zinc-950 via-zinc-900 to-zinc-950"
      )}>
        <DashboardNavbar user={currentUser || { name: 'Loading', email: '', avatar: '' }} />
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <p className={cn("text-sm font-medium", theme === 'light' ? "text-gray-500" : "text-gray-400")}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen",
      theme === 'light'
        ? "bg-gradient-to-br from-gray-50 via-white to-gray-50"
        : "bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950"
    )}>
      <DashboardNavbar user={currentUser} />

      {/* Header Section - Matches Connection Suggestions styling */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-br from-purple-500/30 via-pink-500/20 to-rose-500/30 rounded-2xl blur-lg" />
              <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500/10 via-pink-500/8 to-rose-500/10 border border-purple-500/20 backdrop-blur-sm">
                <Send className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold">
                <span className={cn(theme === 'light' ? "text-foreground" : "text-foreground")}>Stay</span> <span className="bg-gradient-to-r from-purple-400 to-rose-400 bg-clip-text text-transparent">Connected</span>
              </h1>
              <p className={cn("text-sm", theme === 'light' ? "text-gray-600" : "text-gray-400")}>Grow and manage your conversations</p>
            </div>
          </div>
        </div>

        {/* Responsive Layout */}
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
            {/* Conversations List - Premium Card */}
            <div className="md:col-span-1 overflow-hidden">
              <div className={cn(
                "backdrop-blur-xl border rounded-2xl shadow-xl h-full flex flex-col overflow-hidden",
                theme === 'light'
                  ? "bg-white/80 border-gray-200/50"
                  : "bg-zinc-900/50 border-white/5"
              )}>
                {/* Header with Glassmorphism */}
                <div className={cn(
                  "p-6 border-b bg-gradient-to-br",
                  theme === 'light'
                    ? "border-gray-200/50 from-white/80 to-white/40 text-gray-900"
                    : "border-white/10 from-zinc-900/80 to-zinc-900/40 text-white"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex-shrink-0">Conversations</h2>
                    <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                      {isMultiSelectMode ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsMultiSelectMode(false);
                              setSelectedConversations(new Set());
                            }}
                            className={cn(
                              "h-8 text-xs px-2",
                              theme === 'light' ? "text-gray-600" : "text-gray-400"
                            )}
                          >
                            <X className="w-4 h-4 md:mr-1" />
                            <span className="hidden md:inline">Cancel</span>
                          </Button>
                          {selectedConversations.size > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleDeleteSelected}
                              className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 px-2"
                            >
                              <Trash2 className="w-4 h-4 md:mr-1" />
                              <span className="hidden md:inline">Delete ({selectedConversations.size})</span>
                              <span className="md:hidden">({selectedConversations.size})</span>
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowArchivedConversations(!showArchivedConversations)}
                            className={cn(
                              "h-8 w-8 flex-shrink-0",
                              showArchivedConversations
                                ? theme === 'light'
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-blue-950/30 text-blue-400"
                                : theme === 'light'
                                  ? "text-gray-600"
                                  : "text-gray-400"
                            )}
                            title={showArchivedConversations ? "Show active" : "Show archived"}
                          >
                            {showArchivedConversations ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsMultiSelectMode(true)}
                            className={cn(
                              "h-8 text-xs px-2 flex-shrink-0",
                              theme === 'light' ? "text-gray-600" : "text-gray-400"
                            )}
                          >
                            <Check className="w-4 h-4 md:mr-1" />
                            <span className="hidden md:inline">Select</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Search with Glassmorphism */}
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(
                        "pl-10 rounded-lg backdrop-blur-sm focus:outline-none transition-colors",
                        theme === 'light'
                          ? "bg-white/70 border border-gray-200/50 text-gray-900 placeholder:text-gray-500 focus:border-blue-300/70 focus:ring-2 focus:ring-blue-200/50"
                          : "bg-zinc-800/70 border border-white/10 text-white placeholder:text-gray-400 focus:border-blue-400/30 focus:ring-2 focus:ring-blue-500/20"
                      )}
                    />
                  </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <TabsList className={cn(
                    "w-full rounded-none border-b",
                    theme === 'light'
                      ? "border-gray-200/50 bg-gray-50/50"
                      : "border-white/10 bg-zinc-800/20"
                  )}>
                    <TabsTrigger value="conversations" className="flex-1 text-sm">
                      Chats ({filteredConversations.length})
                    </TabsTrigger>
                    <TabsTrigger value="contacts" className="flex-1 text-sm">
                      Contacts ({filteredConnections.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Conversations Tab */}
                  <TabsContent value="conversations" className="flex-1 overflow-y-auto m-0">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className={cn("w-8 h-8 border-2 border-t-blue-500 rounded-full animate-spin mx-auto mb-2", theme === 'light' ? "border-blue-200" : "border-blue-900")} />
                          <p className={cn("text-sm", theme === 'light' ? "text-gray-500" : "text-gray-400")}>Loading...</p>
                        </div>
                      </div>
                    ) : filteredConversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <div className={cn("p-3 rounded-full mb-3", theme === 'light' ? "bg-gray-200" : "bg-zinc-800")}>
                          <Send className={cn("w-6 h-6", theme === 'light' ? "text-gray-500" : "text-gray-600")} />
                        </div>
                        <p className={cn("text-sm font-medium", theme === 'light' ? "text-gray-700" : "text-gray-400")}>
                          {searchQuery ? 'No conversations found' : 'No conversations yet'}
                        </p>
                        <p className={cn("text-xs mt-1", theme === 'light' ? "text-gray-600" : "text-gray-500")}>
                          {!searchQuery && 'Start by selecting a contact'}
                        </p>
                        {!searchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab('contacts')}
                            className={cn("mt-3", theme === 'light' ? "text-blue-600 hover:bg-blue-50" : "text-blue-400 hover:bg-zinc-800")}
                          >
                            Browse contacts
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y p-1">
                        {filteredConversations.map((conv) => (
                          <div
                            key={conv.id}
                            className={cn(
                              'w-full p-3 transition-all duration-200 rounded-lg m-1 border flex items-start gap-3',
                              theme === 'light'
                                ? selectedConversationId === conv.id && !isMultiSelectMode
                                  ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-blue-200/50 text-gray-900'
                                  : 'hover:bg-gray-100 border-transparent text-gray-900'
                                : selectedConversationId === conv.id && !isMultiSelectMode
                                  ? 'bg-gradient-to-r from-blue-950/40 to-purple-950/40 border-blue-800/50 text-white'
                                  : 'hover:bg-zinc-800/80 border-transparent text-white'
                            )}
                          >
                            {isMultiSelectMode && (
                              <input
                                type="checkbox"
                                checked={selectedConversations.has(conv.id)}
                                onChange={() => toggleConversationSelection(conv.id)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            <button
                              onClick={() => !isMultiSelectMode && setSelectedConversationId(conv.id)}
                              className="flex-1 flex items-start gap-3 text-left"
                            >
                              <DefaultAvatar
                                name={conv.type === 'direct' ? conv.other_user?.full_name || 'User' : conv.name || 'Chat'}
                                src={conv.other_user?.avatar_url}
                                className="w-10 h-10 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-sm truncate">
                                      {conv.type === 'direct' ? conv.other_user?.full_name : conv.name}
                                    </p>
                                    {conv.is_muted && (
                                      <BellOff className={cn("w-3 h-3", theme === 'light' ? "text-gray-500" : "text-gray-400")} />
                                    )}
                                  </div>
                                  {conv.unread_count > 0 && !isMultiSelectMode && (
                                    <Badge className="flex-shrink-0 text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                                    </Badge>
                                  )}
                                </div>
                                <p className={cn("text-xs truncate mt-1", theme === 'light' ? "text-gray-600" : "text-gray-400")}>
                                  {conv.last_message || 'No messages yet'}
                                </p>
                              </div>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Contacts Tab */}
                  <TabsContent value="contacts" className="flex-1 overflow-y-auto m-0">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className={cn("w-8 h-8 border-2 border-t-blue-500 rounded-full animate-spin", theme === 'light' ? "border-blue-200" : "border-blue-900")} />
                      </div>
                    ) : filteredConnections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <div className={cn("p-3 rounded-full mb-3", theme === 'light' ? "bg-gray-100" : "bg-zinc-800")}>
                          <Users className={cn("w-6 h-6", theme === 'light' ? "text-gray-400" : "text-gray-600")} />
                        </div>
                        <p className={cn("text-sm font-medium", theme === 'light' ? "text-gray-600" : "text-gray-400")}>No connected users</p>
                      </div>
                    ) : (
                      <div className="divide-y p-1">
                        {filteredConnections.map((contact) => (
                          <button
                            key={contact.user_id}
                            onClick={() => handleStartConversation(contact.user_id)}
                            className={cn(
                              "w-full p-3 text-left transition-all duration-200 rounded-lg m-1 border border-transparent",
                              theme === 'light'
                                ? "hover:bg-gray-100"
                                : "hover:bg-zinc-800/80"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <DefaultAvatar
                                name={contact.full_name}
                                src={contact.avatar_url}
                                className="w-10 h-10 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={cn("font-semibold text-sm", theme === 'light' ? "text-gray-900" : "text-white")}>
                                  {contact.full_name}
                                </p>
                                <p className={cn("text-xs truncate", theme === 'light' ? "text-gray-500" : "text-gray-400")}>
                                  {contact.last_message || contact.email}
                                </p>
                              </div>
                              <Send className={cn("w-4 h-4 flex-shrink-0", theme === 'light' ? "text-gray-300" : "text-gray-600")} />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Chat Window - Premium Card */}
            <div className="md:col-span-2 overflow-hidden">
              {selectedConversation ? (
                <div className={cn(
                  "backdrop-blur-xl border rounded-2xl shadow-xl h-full flex flex-col overflow-hidden",
                  theme === 'light'
                    ? "bg-white/80 border-gray-200/50"
                    : "bg-zinc-900/50 border-white/5"
                )}>
                  {/* Chat Header with Glassmorphism */}
                  <div className={cn(
                    "p-4 border-b bg-gradient-to-br flex items-center justify-between",
                    theme === 'light'
                      ? "border-gray-200/50 from-white/80 to-white/40"
                      : "border-white/10 from-zinc-900/80 to-zinc-900/40"
                  )}>
                    <div className="flex items-center gap-3">
                      <DefaultAvatar
                        name={selectedConversation.type === 'direct' ? selectedConversation.other_user?.full_name || 'User' : selectedConversation.name || 'Chat'}
                        src={selectedConversation.other_user?.avatar_url}
                        className="w-10 h-10"
                      />
                      <div>
                        <h3 className={cn("font-semibold", theme === 'light' ? "text-gray-900" : "text-white")}>
                          {selectedConversation.type === 'direct' ? selectedConversation.other_user?.full_name : selectedConversation.name}
                        </h3>
                        <p className={cn("text-xs", theme === 'light' ? "text-gray-500" : "text-gray-400")}>
                          {selectedConversation.type === 'direct'
                            ? 'Direct message'
                            : `Group chat · ${groupMemberCount > 1 ? `${groupMemberCount - 1} others` : 'no other members'}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(selectedConversation.type === 'pod_chat' || selectedConversation.type === 'group') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-lg"
                          onClick={() => handleOpenMembersDialog(selectedConversation.id)}
                        >
                          <Users className={cn("w-4 h-4", theme === 'light' ? "text-gray-600" : "text-gray-400")} />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-lg">
                            <MoreVertical className={cn("w-4 h-4", theme === 'light' ? "text-gray-600" : "text-gray-400")} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className={cn(
                          "w-56",
                          theme === 'light' ? "bg-white" : "bg-zinc-900"
                        )}>
                          {selectedConversation.is_muted ? (
                            <DropdownMenuItem onClick={() => handleUnmuteConversation(selectedConversation.id)}>
                              <Bell className="w-4 h-4 mr-2" />
                              Unmute conversation
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleMuteConversation(selectedConversation.id)}>
                              <BellOff className="w-4 h-4 mr-2" />
                              Mute conversation
                            </DropdownMenuItem>
                          )}
                          {selectedConversation.is_archived ? (
                            <DropdownMenuItem onClick={() => handleUnarchiveConversation(selectedConversation.id)}>
                              <ArchiveRestore className="w-4 h-4 mr-2" />
                              Unarchive conversation
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleArchiveConversation(selectedConversation.id)}>
                              <Archive className="w-4 h-4 mr-2" />
                              Archive conversation
                            </DropdownMenuItem>
                          )}
                          {(selectedConversation.type === 'pod_chat' || selectedConversation.type === 'group') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleLeaveGroup(selectedConversation.id)}
                                className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20"
                              >
                                <LogOut className="w-4 h-4 mr-2" />
                                Leave group
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Messages with Glassmorphic Bubbles */}
                  <div className={cn("flex-1 overflow-y-auto p-4 space-y-4", theme === 'light' ? "bg-white/40" : "bg-zinc-900/20")}>
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className={cn("p-3 rounded-full mx-auto mb-3", theme === 'light' ? "bg-gray-100" : "bg-zinc-800")}>
                            <Send className={cn("w-6 h-6", theme === 'light' ? "text-gray-400" : "text-gray-600")} />
                          </div>
                          <p className={cn("text-sm", theme === 'light' ? "text-gray-600" : "text-gray-400")}>No messages yet</p>
                          <p className={cn("text-xs", theme === 'light' ? "text-gray-500" : "text-gray-500")}>Start the conversation!</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            data-message-id={msg.id}
                            data-sender-id={msg.sender_id}
                            className={cn('flex gap-2 group', msg.sender_id === currentUserId && 'justify-end')}
                            onMouseEnter={() => setHoveredMessageId(msg.id)}
                            onMouseLeave={() => setHoveredMessageId(null)}
                          >
                            {msg.sender_id !== currentUserId && (
                              <DefaultAvatar
                                name={msg.sender?.full_name || 'User'}
                                src={msg.sender?.avatar_url}
                                className="w-8 h-8 flex-shrink-0"
                              />
                            )}
                            <div className="flex flex-col max-w-xs">
                              {/* Reply preview */}
                              {msg.reply_to_message && (
                                <div className={cn(
                                  "text-xs mb-1 px-3 py-1.5 rounded-lg border-l-2 flex flex-col gap-0.5",
                                  msg.sender_id === currentUserId
                                    ? "bg-white/10 border-white/30"
                                    : theme === 'light'
                                      ? "bg-gray-200/50 border-gray-400"
                                      : "bg-zinc-700/50 border-zinc-500"
                                )}>
                                  <span className={cn(
                                    "font-semibold",
                                    msg.sender_id === currentUserId
                                      ? "text-white/90"
                                      : theme === 'light'
                                        ? "text-gray-700"
                                        : "text-gray-300"
                                  )}>
                                    {msg.reply_to_message.sender?.full_name?.split(' ')[0] || 'Someone'}
                                  </span>
                                  <span className={cn(
                                    "truncate max-w-[250px]",
                                    msg.sender_id === currentUserId
                                      ? "text-white/70"
                                      : theme === 'light'
                                        ? "text-gray-600"
                                        : "text-gray-400"
                                  )}>
                                    {msg.reply_to_message.content}
                                  </span>
                                </div>
                              )}

                              <div className="relative">
                                <div
                                  className={cn(
                                    'px-4 py-2 rounded-2xl backdrop-blur-sm border transition-all duration-200',
                                    msg.sender_id === currentUserId
                                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white border-blue-400/50 shadow-lg'
                                      : theme === 'light'
                                        ? 'bg-gray-100 text-gray-900 border-gray-200/50 shadow-sm'
                                        : 'bg-zinc-800/50 text-white border-white/10 shadow-sm'
                                  )}
                                >
                                  {/* Message actions */}
                                  {hoveredMessageId === msg.id && (
                                    <div className={cn(
                                      "absolute -top-8 flex gap-1 p-1 rounded-lg border backdrop-blur-sm shadow-lg",
                                      msg.sender_id === currentUserId ? "right-0" : "left-0",
                                      theme === 'light'
                                        ? "bg-white/90 border-gray-200"
                                        : "bg-zinc-800/90 border-white/10"
                                    )}>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                                      >
                                        <Smile className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => setReplyToMessage(msg)}
                                      >
                                        <Reply className="w-3 h-3" />
                                      </Button>
                                      {msg.sender_id === currentUserId && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                          onClick={() => handleDeleteMessage(msg.id)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  )}

                                  {/* Emoji picker */}
                                  {showEmojiPicker === msg.id && (
                                    <div className={cn(
                                      "absolute z-10 p-2 rounded-lg border backdrop-blur-sm shadow-lg flex gap-2",
                                      msg.sender_id === currentUserId ? "right-0 -top-12" : "left-0 -top-12",
                                      theme === 'light'
                                        ? "bg-white/95 border-gray-200"
                                        : "bg-zinc-800/95 border-white/10"
                                    )}>
                                      {['👍', '❤️', '😂', '��', '😢', '🎉'].map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => handleReaction(msg.id, emoji)}
                                          className="text-lg hover:scale-125 transition-transform"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  <p className="text-sm">{msg.content}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className={cn("text-xs opacity-70", msg.sender_id === currentUserId ? "text-white" : theme === 'light' ? "text-gray-600" : "text-gray-400")}>
                                      {new Date(msg.sent_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                    <ReadReceipt
                                      messageId={msg.id}
                                      senderId={msg.sender_id}
                                      currentUserId={currentUserId || ''}
                                      readReceipts={readReceipts[msg.id] || []}
                                      conversationType={selectedConversation?.type || 'direct'}
                                      totalParticipants={groupMemberCount || 2}
                                    />
                                  </div>
                                </div>

                                {/* Reactions */}
                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                      const reactedUsers = (userIds as string[])
                                        .map(userId => {
                                          if (userId === currentUserId) return 'You';
                                          // Find user in messages sender data or group members
                                          const sender = messages.find(m => m.sender_id === userId)?.sender;
                                          return sender?.full_name?.split(' ')[0] || 'Someone';
                                        });

                                      const tooltipText = reactedUsers.join(', ');

                                      return (
                                        <button
                                          key={emoji}
                                          onClick={() => handleReaction(msg.id, emoji)}
                                          title={tooltipText}
                                          className={cn(
                                            "px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border transition-all",
                                            (userIds as string[]).includes(currentUserId || '')
                                              ? theme === 'light'
                                                ? "bg-blue-100 border-blue-300 text-blue-700"
                                                : "bg-blue-950/30 border-blue-700 text-blue-300"
                                              : theme === 'light'
                                                ? "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                                                : "bg-zinc-800/50 border-zinc-700 text-gray-300 hover:bg-zinc-700"
                                          )}
                                        >
                                          <span>{emoji}</span>
                                          <span className="font-medium">{(userIds as string[]).length}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Typing indicator */}
                        {typingUsers.length > 0 && (
                          <div className="flex gap-2 items-center">
                            <div className={cn(
                              "px-4 py-2 rounded-2xl backdrop-blur-sm border",
                              theme === 'light'
                                ? "bg-gray-100 border-gray-200/50"
                                : "bg-zinc-800/50 border-white/10"
                            )}>
                              <div className="flex gap-1">
                                <div className={cn("w-2 h-2 rounded-full animate-bounce", theme === 'light' ? "bg-gray-600" : "bg-gray-400")} style={{ animationDelay: '0ms' }} />
                                <div className={cn("w-2 h-2 rounded-full animate-bounce", theme === 'light' ? "bg-gray-600" : "bg-gray-400")} style={{ animationDelay: '150ms' }} />
                                <div className={cn("w-2 h-2 rounded-full animate-bounce", theme === 'light' ? "bg-gray-600" : "bg-gray-400")} style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                            <span className={cn("text-xs", theme === 'light' ? "text-gray-600" : "text-gray-400")}>
                              {typingUsers.map(u => u.full_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                            </span>
                          </div>
                        )}

                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Message Input with Glassmorphism */}
                  <form onSubmit={handleSendMessage} className={cn(
                    "p-4 border-t bg-gradient-to-br",
                    theme === 'light'
                      ? "border-gray-200/50 from-white/80 to-white/40"
                      : "border-white/10 from-zinc-900/80 to-zinc-900/40"
                  )}>
                    {/* Reply preview */}
                    {replyToMessage && (
                      <div className={cn(
                        "mb-2 p-2 rounded-lg border-l-4 flex items-center justify-between",
                        theme === 'light'
                          ? "bg-blue-50 border-blue-500"
                          : "bg-blue-950/20 border-blue-500"
                      )}>
                        <div className="flex-1">
                          <p className={cn("text-xs font-medium", theme === 'light' ? "text-blue-700" : "text-blue-400")}>
                            Replying to {replyToMessage.sender?.full_name}
                          </p>
                          <p className={cn("text-xs truncate", theme === 'light' ? "text-gray-600" : "text-gray-400")}>
                            {replyToMessage.content}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => setReplyToMessage(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => handleTyping(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e as any);
                          }
                        }}
                        disabled={isSending}
                        autoFocus
                        className={cn(
                          "rounded-lg backdrop-blur-sm",
                          theme === 'light'
                            ? "bg-white/70 border border-gray-200/50 text-gray-900 placeholder:text-gray-500"
                            : "bg-zinc-800/70 border border-white/10 text-white placeholder:text-gray-400"
                        )}
                      />
                      <Button
                        type="submit"
                        disabled={!messageInput.trim() || isSending}
                        className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg shadow-lg"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className={cn(
                  "backdrop-blur-xl border rounded-2xl shadow-xl h-full flex items-center justify-center",
                  theme === 'light'
                    ? "bg-white/80 border-gray-200/50"
                    : "bg-zinc-900/50 border-white/5"
                )}>
                  <div className="text-center">
                    <div className={cn("p-4 rounded-full mx-auto mb-4", theme === 'light' ? "bg-gray-100" : "bg-zinc-800")}>
                      <Send className={cn("w-8 h-8", theme === 'light' ? "text-gray-400" : "text-gray-600")} />
                    </div>
                    <p className={cn("font-medium", theme === 'light' ? "text-gray-600" : "text-gray-400")}>Select a conversation</p>
                    <p className={cn("text-xs mt-1", theme === 'light' ? "text-gray-500" : "text-gray-500")}>to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Group Chat Members Dialog */}
        <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
          <DialogContent className={cn(
            "w-full max-w-md rounded-lg",
            theme === 'light'
              ? "bg-white border-gray-200/50"
              : "bg-zinc-900 border-white/5"
          )}>
            <DialogHeader>
              <DialogTitle className={theme === 'light' ? "text-gray-900" : "text-white"}>
                Group Members
              </DialogTitle>
              <DialogDescription className={theme === 'light' ? "text-gray-600" : "text-gray-400"}>
                {groupMembers.length} {groupMembers.length === 1 ? 'member' : 'members'} in this chat
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {groupMembers.map((member) => (
                <div
                  key={member.user_id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    theme === 'light'
                      ? "bg-gray-50 border-gray-200/50 hover:bg-gray-100"
                      : "bg-zinc-800/50 border-white/5 hover:bg-zinc-800"
                  )}
                >
                  <DefaultAvatar
                    name={member.full_name || 'User'}
                    src={member.avatar_url}
                    className="w-10 h-10 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("font-medium text-sm", theme === 'light' ? "text-gray-900" : "text-white")}>
                        {member.full_name || 'Unknown User'}
                      </p>
                      {member.role === 'admin' && (
                        <Badge className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Admin</Badge>
                      )}
                    </div>
                    <p className={cn("text-xs truncate", theme === 'light' ? "text-gray-600" : "text-gray-400")}>
                      {member.email}
                    </p>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded",
                    member.role === 'admin'
                      ? theme === 'light'
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-yellow-900/30 text-yellow-400"
                      : theme === 'light'
                        ? "bg-blue-100 text-blue-700"
                        : "bg-blue-900/30 text-blue-400"
                  )}>
                    {member.role === 'admin' ? 'Admin' : 'Member'}
                  </span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
