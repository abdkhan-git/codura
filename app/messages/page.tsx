'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardNavbar from '@/components/navigation/dashboard-navbar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DefaultAvatar } from '@/components/ui/default-avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, MoreVertical, MessageSquare, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { getAcceptedConnections, getUserConversations, getConversationMessages, sendMessage as sendMessageUtil, startConversation } from '@/lib/messaging-utils';

interface DashboardUserData {
  name: string;
  email: string;
  avatar: string;
  username?: string;
}

export default function MessagesPage() {
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

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const msgs = await getConversationMessages(selectedConversationId);
        setMessages(msgs);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    loadMessages();
  }, [selectedConversationId]);

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
        setIsMobileView(true);
        const convs = await getUserConversations();
        setConversations(convs);
      } catch (error) {
        console.error('Failed to start conversation:', error);
        toast.error('Failed to start conversation');
      }
    },
    []
  );

  // Filter conversations
  const filteredConversations = conversations.filter((conv) =>
    searchQuery === ''
      ? true
      : conv.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <DashboardNavbar user={currentUser || { name: 'Loading', email: '', avatar: '' }} />
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <p className="text-slate-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <DashboardNavbar user={currentUser} />

      {/* Header Section - Matches Connection Suggestions styling */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg backdrop-blur-xl",
              "from-purple-500 to-pink-500 shadow-purple-500/25 bg-white/5 dark:bg-white/5"
            )}>
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-brand to-purple-400 bg-clip-text text-transparent">
                Messages
              </h1>
              <p className="text-muted-foreground">Stay connected with your network</p>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-480px)]">
            {/* Conversations List - Premium Card */}
            <div className="lg:col-span-1 overflow-hidden">
              <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl shadow-xl h-full flex flex-col overflow-hidden">
                {/* Header with Glassmorphism */}
                <div className="p-6 border-b border-white/10 dark:border-slate-800/50 bg-gradient-to-br from-white/60 to-white/30 dark:from-slate-900/80 dark:to-slate-900/40">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Conversations</h2>

                  {/* Search with Glassmorphism */}
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/70 dark:bg-slate-800/70 border border-white/20 dark:border-slate-700/50 rounded-lg backdrop-blur-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-blue-400/50 dark:focus:border-blue-400/30"
                    />
                  </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <TabsList className="w-full rounded-none border-b border-white/10 dark:border-slate-800/50 bg-white/20 dark:bg-slate-800/20">
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
                          <div className="w-8 h-8 border-2 border-blue-200 dark:border-blue-900 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
                        </div>
                      </div>
                    ) : filteredConversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                          <MessageSquare className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                          {searchQuery ? 'No conversations found' : 'No conversations yet'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          {!searchQuery && 'Start by selecting a contact'}
                        </p>
                        {!searchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab('contacts')}
                            className="mt-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800"
                          >
                            Browse contacts
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-white/10 dark:divide-slate-800/50 p-1">
                        {filteredConversations.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => setSelectedConversationId(conv.id)}
                            className={cn(
                              'w-full p-3 text-left transition-all duration-200 rounded-lg m-1 hover:bg-white/60 dark:hover:bg-slate-800/80',
                              selectedConversationId === conv.id
                                ? 'bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/40 dark:to-purple-950/40 border border-blue-200/50 dark:border-blue-800/50'
                                : 'border border-transparent'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <DefaultAvatar
                                name={conv.other_user?.full_name || 'User'}
                                src={conv.other_user?.avatar_url}
                                className="w-10 h-10 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                    {conv.other_user?.full_name}
                                  </p>
                                  {conv.unread_count > 0 && (
                                    <Badge className="flex-shrink-0 text-xs bg-gradient-to-r from-blue-500 to-purple-600">
                                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
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
                        <div className="w-8 h-8 border-2 border-blue-200 dark:border-blue-900 border-t-blue-500 rounded-full animate-spin" />
                      </div>
                    ) : filteredConnections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                          <MessageSquare className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">No connected users</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/10 dark:divide-slate-800/50 p-1">
                        {filteredConnections.map((contact) => (
                          <button
                            key={contact.user_id}
                            onClick={() => handleStartConversation(contact.user_id)}
                            className="w-full p-3 text-left transition-all duration-200 rounded-lg m-1 hover:bg-white/60 dark:hover:bg-slate-800/80 border border-transparent"
                          >
                            <div className="flex items-start gap-3">
                              <DefaultAvatar
                                name={contact.full_name}
                                src={contact.avatar_url}
                                className="w-10 h-10 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-slate-900 dark:text-white">
                                  {contact.full_name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {contact.email}
                                </p>
                              </div>
                              <MessageSquare className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
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
            <div className="lg:col-span-2 overflow-hidden">
              {selectedConversation ? (
                <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl shadow-xl h-full flex flex-col overflow-hidden">
                  {/* Chat Header with Glassmorphism */}
                  <div className="p-4 border-b border-white/10 dark:border-slate-800/50 bg-gradient-to-br from-white/60 to-white/30 dark:from-slate-900/80 dark:to-slate-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DefaultAvatar
                        name={selectedConversation.other_user?.full_name || 'User'}
                        src={selectedConversation.other_user?.avatar_url}
                        className="w-10 h-10"
                      />
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {selectedConversation.other_user?.full_name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Connected</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="rounded-lg">
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-lg">
                        <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </Button>
                    </div>
                  </div>

                  {/* Messages with Glassmorphic Bubbles */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto mb-3">
                            <MessageSquare className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 text-sm">No messages yet</p>
                          <p className="text-xs text-slate-500 dark:text-slate-500">Start the conversation!</p>
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
                                  : 'bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white border-white/20 dark:border-slate-700/50 shadow-sm'
                              )}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className="text-xs opacity-70 mt-1">
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
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 dark:border-slate-800/50 bg-gradient-to-br from-white/60 to-white/30 dark:from-slate-900/80 dark:to-slate-900/40">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        disabled={isSending}
                        className="bg-white/70 dark:bg-slate-800/70 border border-white/20 dark:border-slate-700/50 rounded-lg backdrop-blur-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
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
                <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-2xl shadow-xl h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Select a conversation</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
