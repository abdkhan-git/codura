"use client";

import { useState, useEffect } from "react";
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
  Phone,
  Video,
  Info,
  Send,
  Paperclip,
  Smile,
  ArrowLeft,
} from "lucide-react";
import { ConversationListItemComponent } from "@/components/messaging/conversation-list-item";
import { MessageBubble } from "@/components/messaging/message-bubble";
import { ChatInput } from "@/components/messaging/chat-input";
import { NewMessageDialog } from "@/components/messaging/new-message-dialog";
import type { ConversationListItem, ChatMessage } from "@/types/messaging";
import { toast } from "sonner";

interface MessagesPageProps {
  searchParams?: {
    conversation?: string;
  };
}

export default function MessagesPage({ searchParams }: MessagesPageProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(
    searchParams?.conversation || null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredConversations, setFilteredConversations] = useState<ConversationListItem[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Filter conversations based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredConversations(
        conversations.filter(
          (conv) =>
            conv.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            conv.other_user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            conv.conversation.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation]);

  const loadConversations = async () => {
    console.log("Loading conversations...");
    try {
      const response = await fetch("/api/conversations");
      console.log("Conversations API response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("Conversations data:", data);
        // Transform to ConversationListItem format
        const items: ConversationListItem[] = data.conversations.map((conv: any) => ({
          conversation: conv,
          other_user: conv.type === "direct" && conv.participants?.length === 2
            ? conv.participants.find((p: any) => p.id !== conv.current_user_id)?.user
            : null,
          unread_count: conv.unread_count || 0,
          last_message: conv.last_message,
          is_typing: false,
        }));
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
        setMessages(data.messages || []);
      } else {
        console.error("Failed to load messages");
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string, messageType: string = "text") => {
    if (!activeConversation || !content.trim()) return;

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: activeConversation,
          content: content.trim(),
          message_type: messageType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        // Update conversation list
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
    conv => conv.conversation.id === activeConversation
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Conversations List */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Messages</h1>
            <Button
              size="sm"
              onClick={() => setShowNewMessageDialog(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start messaging your connections!</p>
              </div>
            ) : (
              filteredConversations.map((item) => (
                <div
                  key={item.conversation.id}
                  onClick={() => handleConversationSelect(item.conversation.id)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-colors mb-1",
                    activeConversation === item.conversation.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  )}
                >
                  <ConversationListItemComponent
                    item={item}
                    isActive={activeConversation === item.conversation.id}
                    onClick={() => handleConversationSelect(item.conversation.id)}
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Side - Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setActiveConversation(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={activeConversationData?.other_user?.avatar_url} />
                  <AvatarFallback>
                    {activeConversationData?.other_user?.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">
                    {activeConversationData?.conversation.name || 
                     activeConversationData?.other_user?.full_name || 
                     "Unknown User"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {activeConversationData?.other_user?.username && 
                     `@${activeConversationData.other_user.username}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Info className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm mt-1">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.sender_id === "current-user-id"} // You'll need to pass the current user ID
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t border-border bg-card">
              <ChatInput
                onSendMessage={handleSendMessage}
                placeholder="Type a message..."
                disabled={loading}
              />
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Welcome to Messages</h2>
              <p className="text-muted-foreground mb-6">
                Select a conversation to start messaging
              </p>
              <Button onClick={() => setShowNewMessageDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Start New Conversation
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Message Dialog */}
      <NewMessageDialog
        open={showNewMessageDialog}
        onClose={() => setShowNewMessageDialog(false)}
        onConversationCreated={(conversationId) => {
          setActiveConversation(conversationId);
          loadConversations();
        }}
      />
    </div>
  );
}
