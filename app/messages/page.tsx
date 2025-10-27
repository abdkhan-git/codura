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
import { Send, MoreVertical, Users } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { getAcceptedConnections, getUserConversations, getConversationMessages, sendMessage as sendMessageUtil, startConversation, getGroupChatMembers } from '@/lib/messaging-utils';

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
        .subscribe();
    };

    setupRealtimeListener();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
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

  // Send message
  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!messageInput.trim() || !selectedConversationId || isSending) return;

      try {
        setIsSending(true);
        await sendMessageUtil(selectedConversationId, messageInput);
        setMessageInput('');

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
    [selectedConversationId, messageInput, isSending]
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

  // Filter conversations - support both direct messages and group chats
  const filteredConversations = conversations.filter((conv) =>
    searchQuery === ''
      ? true
      : (conv.type === 'direct'
          ? conv.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
          : conv.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-480px)]">
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
                  <h2 className="text-lg font-semibold mb-4">Conversations</h2>

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
                          <button
                            key={conv.id}
                            onClick={() => setSelectedConversationId(conv.id)}
                            className={cn(
                              'w-full p-3 text-left transition-all duration-200 rounded-lg m-1 border',
                              theme === 'light'
                                ? selectedConversationId === conv.id
                                  ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-blue-200/50 text-gray-900'
                                  : 'hover:bg-gray-100 border-transparent text-gray-900'
                                : selectedConversationId === conv.id
                                  ? 'bg-gradient-to-r from-blue-950/40 to-purple-950/40 border-blue-800/50 text-white'
                                  : 'hover:bg-zinc-800/80 border-transparent text-white'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <DefaultAvatar
                                name={conv.type === 'direct' ? conv.other_user?.full_name || 'User' : conv.name || 'Chat'}
                                src={conv.other_user?.avatar_url}
                                className="w-10 h-10 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold text-sm truncate">
                                    {conv.type === 'direct' ? conv.other_user?.full_name : conv.name}
                                  </p>
                                  {conv.unread_count > 0 && (
                                    <Badge className="flex-shrink-0 text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                                    </Badge>
                                  )}
                                </div>
                                <p className={cn("text-xs truncate mt-1", theme === 'light' ? "text-gray-600" : "text-gray-400")}>
                                  {conv.last_message || 'No messages yet'}
                                </p>
                              </div>
                            </div>
                          </button>
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
                                  {contact.email}
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
                      {selectedConversation.type === 'pod_chat' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-lg"
                          onClick={() => handleOpenMembersDialog(selectedConversation.id)}
                        >
                          <Users className={cn("w-4 h-4", theme === 'light' ? "text-gray-600" : "text-gray-400")} />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="rounded-lg">
                        <MoreVertical className={cn("w-4 h-4", theme === 'light' ? "text-gray-600" : "text-gray-400")} />
                      </Button>
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
                            className={cn('flex gap-2', msg.sender_id === currentUserId && 'justify-end')}
                          >
                            {msg.sender_id !== currentUserId && (
                              <DefaultAvatar
                                name={msg.sender?.full_name || 'User'}
                                src={msg.sender?.avatar_url}
                                className="w-8 h-8 flex-shrink-0"
                              />
                            )}
                            <div
                              className={cn(
                                'max-w-xs px-4 py-2 rounded-2xl backdrop-blur-sm border transition-all duration-200',
                                msg.sender_id === currentUserId
                                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white border-blue-400/50 shadow-lg'
                                  : theme === 'light'
                                    ? 'bg-gray-100 text-gray-900 border-gray-200/50 shadow-sm'
                                    : 'bg-zinc-800/50 text-white border-white/10 shadow-sm'
                              )}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className={cn("text-xs opacity-70 mt-1", msg.sender_id === currentUserId ? "text-white" : theme === 'light' ? "text-gray-600" : "text-gray-400")}>
                                {new Date(msg.sent_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
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
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        disabled={isSending}
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
