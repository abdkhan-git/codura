"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Send, Radio, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStreamChat, type ChatMessage } from "@/hooks/use-stream-chat";

interface StreamChatProps {
  streamId: string;
  userId: string;
  userName: string;
  streamerId?: string; // User ID of the live streamer
  messages?: Array<{
    id: string;
    userId: string;
    userName: string;
    userColor?: string;
    text: string;
    timestamp: Date;
  }>;
  onMessagesChange?: (messages: Array<{
    id: string;
    userId: string;
    userName: string;
    userColor?: string;
    text: string;
    timestamp: Date;
  }>) => void;
  sendMessage?: (text: string) => void;
  isConnected?: boolean;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
}

export function StreamChat({ 
  streamId, 
  userId, 
  userName,
  streamerId,
  messages: externalMessages,
  onMessagesChange,
  sendMessage: externalSendMessage,
  isConnected: externalIsConnected,
  messagesEndRef: externalMessagesEndRef
}: StreamChatProps) {
  const { theme } = useTheme();
  const [messageInput, setMessageInput] = useState("");
  const localMessagesEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = externalMessagesEndRef || localMessagesEndRef;
  
  // Use hook only if external functions not provided (for viewers on dedicated page)
  const { 
    messages: hookMessages, 
    isConnected: hookIsConnected, 
    sendMessage: hookSendMessage,
    messagesEndRef: hookMessagesEndRef
  } = useStreamChat(
    externalSendMessage ? '' : streamId, // Don't connect if external functions provided
    userId,
    userName,
    externalMessages,
    onMessagesChange
  );
  
  // Use external messages/functions if provided, otherwise use hook
  const messages = externalMessages || hookMessages;
  const isConnected = externalIsConnected !== undefined ? externalIsConnected : hookIsConnected;
  const sendMessage = externalSendMessage || hookSendMessage;
  const finalMessagesEndRef = externalMessagesEndRef || hookMessagesEndRef || localMessagesEndRef;
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    finalMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, finalMessagesEndRef])

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendMessage(messageInput);
    setMessageInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={cn(
      "h-full flex flex-col",
      theme === 'light'
        ? "bg-white/90 backdrop-blur-xl border-l border-gray-200"
        : "bg-zinc-950/30 backdrop-blur-xl border-l border-white/5"
    )}>
      {/* Chat Header */}
      <div className={cn(
        "px-4 py-3 border-b flex items-center justify-between bg-zinc-900/20 backdrop-blur-sm",
        theme === 'light' ? "border-gray-200" : "border-white/5"
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500 animate-pulse shadow-lg shadow-green-500/50" : "bg-red-500"
          )} />
          <h3 className={cn(
            "text-sm font-semibold",
            theme === 'light' ? "text-gray-900" : "text-foreground"
          )}>
            Stream Chat
          </h3>
        </div>
        <span className={cn(
          "text-xs",
          theme === 'light' ? "text-gray-500" : "text-muted-foreground"
        )}>
          {messages.length} messages
        </span>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-4 border-2 border-purple-500/30 shadow-lg shadow-purple-500/20">
              <MessageSquare className="w-6 h-6 text-purple-400" />
            </div>
            <p className={cn(
              "text-sm font-medium mb-2",
              theme === 'light' ? "text-gray-900" : "text-foreground"
            )}>
              No messages yet
            </p>
            <p className={cn(
              "text-xs",
              theme === 'light' ? "text-gray-500" : "text-muted-foreground"
            )}>
              Be the first to chat!
            </p>
          </div>
        ) : (
          messages.map((message: ChatMessage) => {
            const isStreamer = streamerId && message.userId === streamerId;
            return (
            <div key={message.id} className="space-y-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span
                  className="text-xs font-medium"
                  style={{ color: message.userColor || '#a855f7' }}
                >
                  {message.userName}
                </span>
                {isStreamer && (
                  <Badge 
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 font-semibold",
                      "bg-gradient-to-r from-purple-500 to-violet-500 text-white border-0"
                    )}
                  >
                    Live Streamer
                  </Badge>
                )}
                <span className={cn(
                  "text-xs",
                  theme === 'light' ? "text-gray-400" : "text-muted-foreground"
                )}>
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className={cn(
                "text-sm break-words",
                theme === 'light' ? "text-gray-900" : "text-foreground"
              )}>
                {message.text}
              </p>
            </div>
          );
          })
        )}
        <div ref={finalMessagesEndRef} />
      </div>

      {/* Message Input */}
      <div className={cn(
        "p-4 border-t bg-zinc-900/20 backdrop-blur-sm",
        theme === 'light' ? "border-gray-200 bg-gray-50" : "border-white/5"
      )}>
        <div className="flex gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            disabled={!isConnected}
            className={cn(
              "flex-1",
              theme === 'light'
                ? "bg-white border-gray-200"
                : "bg-muted/50 border-border/30 focus:border-purple-500/50"
            )}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !messageInput.trim()}
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg shadow-purple-500/25 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

