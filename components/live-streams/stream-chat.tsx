"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Send, Radio } from "lucide-react";
import { useStreamChat, type ChatMessage } from "@/hooks/use-stream-chat";

interface StreamChatProps {
  streamId: string;
  userId: string;
  userName: string;
}

export function StreamChat({ streamId, userId, userName }: StreamChatProps) {
  const { theme } = useTheme();
  const [messageInput, setMessageInput] = useState("");
  const { messages, isConnected, sendMessage, messagesEndRef } = useStreamChat(
    streamId,
    userId,
    userName
  );

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
        ? "bg-white/90 border-l border-gray-200"
        : "bg-zinc-950/90 border-l border-white/10"
    )}>
      {/* Chat Header */}
      <div className={cn(
        "p-4 border-b flex items-center justify-between",
        theme === 'light' ? "border-gray-200" : "border-white/10"
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
          )} />
          <h3 className={cn(
            "text-sm font-semibold",
            theme === 'light' ? "text-gray-900" : "text-foreground"
          )}>
            Chat
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
          <div className="text-center py-8">
            <p className={cn(
              "text-sm",
              theme === 'light' ? "text-gray-500" : "text-muted-foreground"
            )}>
              No messages yet. Be the first to chat!
            </p>
          </div>
        ) : (
          messages.map((message: ChatMessage) => (
            <div key={message.id} className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-xs font-medium"
                  style={{ color: message.userColor || '#a855f7' }}
                >
                  {message.userName}
                </span>
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
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className={cn(
        "p-4 border-t",
        theme === 'light' ? "border-gray-200 bg-gray-50" : "border-white/10 bg-zinc-900/50"
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
                : "bg-zinc-900 border-white/10"
            )}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !messageInput.trim()}
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

