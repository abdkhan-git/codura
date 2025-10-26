"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Info,
  Search,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Image as ImageIcon,
  FileText,
  Code,
  Link,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useRealtimeMessaging } from "@/hooks/use-realtime-messaging";
import { useRealtimeTyping } from "@/hooks/use-realtime-typing";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type: "text" | "image" | "file" | "code_snippet" | "problem_link";
  attachments?: any[];
  reply_to_message_id?: string;
  reactions?: Record<string, string[]>;
  is_edited?: boolean;
  edited_at?: string;
  read_by?: string[];
}

interface ChatInterfaceProps {
  conversationId: string;
  recipient: {
    id: string;
    name: string;
    avatar?: string;
    username?: string;
    is_online?: boolean;
    last_seen?: string;
  };
  currentUserId: string;
  onClose?: () => void;
}

export function ChatInterface({
  conversationId,
  recipient,
  currentUserId,
  onClose,
}: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use real-time WebSocket hooks
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    markAsRead
  } = useRealtimeMessaging({
    conversationId,
    currentUserId
  });

  const {
    typingUsers,
    sendTypingIndicator
  } = useRealtimeTyping({
    conversationId,
    currentUserId
  });

  const isTyping = typingUsers.length > 0;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Track which messages we've already marked as read to prevent loops
  const markedAsReadRef = useRef<Set<string>>(new Set());

  // Mark messages as read when they arrive (with deduplication)
  useEffect(() => {
    if (messages.length === 0) return;

    // Find unread messages that we haven't already tried to mark as read
    const unreadMessageIds = messages
      .filter(msg =>
        msg.sender_id !== currentUserId &&
        !msg.read_by?.includes(currentUserId) &&
        !markedAsReadRef.current.has(msg.id)
      )
      .map(msg => msg.id);

    if (unreadMessageIds.length > 0) {
      console.log('📖 Marking messages as read:', unreadMessageIds);

      // Mark them in our ref BEFORE calling the API to prevent duplicate calls
      unreadMessageIds.forEach(id => markedAsReadRef.current.add(id));

      markAsRead(unreadMessageIds);
    }
  }, [messages, currentUserId, markAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    try {
      await sendMessage(messageContent, "text");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    // Send typing indicator
    if (e.target.value.trim()) {
      sendTypingIndicator();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const getMessageStatus = (message: Message) => {
    if (message.sender_id !== currentUserId) return null;
    
    if (message.read_by?.includes(recipient.id)) {
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    } else if (message.read_by?.length > 0) {
      return <Check className="w-3 h-3 text-gray-400" />;
    } else {
      return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Avatar className="w-8 h-8">
            <AvatarImage src={recipient.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-brand to-purple-600">
              {recipient.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-foreground">{recipient.name}</h3>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  recipient.is_online
                    ? "bg-green-500"
                    : "bg-gray-400"
                )}
              />
              <span className="text-xs text-muted-foreground">
                {recipient.is_online
                  ? "Online"
                  : recipient.last_seen
                  ? `Last seen ${formatMessageTime(recipient.last_sen)}`
                  : "Offline"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Search className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
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
                "flex gap-3",
                message.sender_id === currentUserId ? "justify-end" : "justify-start"
              )}
            >
              {message.sender_id !== currentUserId && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={recipient.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-brand to-purple-600">
                    {recipient.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div
                className={cn(
                  "max-w-[70%] space-y-1",
                  message.sender_id === currentUserId ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2 shadow-sm",
                    message.sender_id === currentUserId
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                      : "bg-card border border-border"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs text-muted-foreground",
                    message.sender_id === currentUserId ? "justify-end" : "justify-start"
                  )}
                >
                  <span>{formatMessageTime(message.created_at)}</span>
                  {message.is_edited && (
                    <span className="text-xs text-muted-foreground">(edited)</span>
                  )}
                  {getMessageStatus(message)}
                </div>
              </div>
              
              {message.sender_id === currentUserId && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src="/api/users/me" />
                  <AvatarFallback className="bg-gradient-to-br from-brand to-purple-600">
                    You
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {typingUsers.length > 0 && (
            <div className="flex gap-3 justify-start">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={recipient.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-brand to-purple-600">
                  {recipient.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="bg-card border border-border rounded-2xl px-4 py-2">
                <div className="flex items-center gap-1">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    {typingUsers.length === 1 ? `${recipient.name} is typing...` : `${typingUsers.length} people are typing...`}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="pr-12 resize-none"
              disabled={isSending}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="h-6 w-6 p-0"
              >
                <Smile className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="rounded-full w-10 h-10 p-0"
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
  );
}
