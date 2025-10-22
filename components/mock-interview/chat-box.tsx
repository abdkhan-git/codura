"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Paperclip,
  X,
  Image as ImageIcon,
  File,
  Download,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

interface Message {
  id: string;
  content: string;
  sender: "self" | "partner";
  senderName: string;
  timestamp: Date;
  type: "text" | "image" | "file" | "link";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

interface ChatBoxProps {
  sessionId: string;
  user: {
    name: string;
    email: string;
    avatar: string;
    user_id?: string;
  };
  onClose?: () => void;
}

export function ChatBox({ sessionId, user, onClose }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const channelRef = useRef<any>(null);
  const [realtimeReady, setRealtimeReady] = useState(false);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Realtime chat over Supabase channel, plus lightweight polling fallback.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const mapApiMessage = (m: any): Message => {
      const isSelf = m.sender_id === user.user_id;
      const meta = m.metadata || {};
      const type = (meta.message_type as Message["type"]) || "text";
      return {
        id: m.id,
        content: m.content || "",
        sender: isSelf ? "self" : "partner",
        senderName: m.sender?.full_name || m.sender?.username || (isSelf ? "You" : "Partner"),
        timestamp: new Date(m.created_at || Date.now()),
        type,
        fileUrl: meta.file_url || undefined,
        fileName: meta.file_name || undefined,
        fileSize: meta.file_size || undefined,
      };
    };

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/mock-interview/messages?sessionId=${encodeURIComponent(sessionId)}`);
        if (!res.ok) return;
        const data = await res.json();
        const apiMessages = Array.isArray(data.messages) ? data.messages : [];
        if (!cancelled) {
          // Merge fetched messages into current list instead of replacing
          setMessages((prev) => {
            const existing = new Map(prev.map((m) => [m.id, m] as const));
            for (const raw of apiMessages.map(mapApiMessage)) {
              if (existing.has(raw.id)) {
                existing.set(raw.id, { ...existing.get(raw.id)!, ...raw });
              } else {
                existing.set(raw.id, raw);
              }
            }
            return Array.from(existing.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          });
        }
      } catch (err) {
        // silently ignore
      }
    };

    // Subscribe to realtime channel for this session
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const channel = supabase.channel(`mock-interview:${sessionId}`)
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        try {
          const msg = payload as any;
          const isSelf = msg.sender_id === user.user_id;
          const m: Message = {
            id: msg.id || `rt-${Date.now()}`,
            content: msg.content || '',
            sender: isSelf ? 'self' : 'partner',
            senderName: msg.sender_name || (isSelf ? 'You' : 'Partner'),
            timestamp: new Date(msg.created_at || Date.now()),
            type: (msg.type as Message['type']) || 'text',
            fileUrl: msg.file_url,
            fileName: msg.file_name,
            fileSize: msg.file_size,
          };
          setMessages(prev => {
            if (prev.some(x => x.id === m.id)) return prev; // dedupe
            const next = [...prev, m];
            next.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            return next;
          });
        } catch {}
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeReady(true);
          await channel.send({ type: 'broadcast', event: 'chat-presence', payload: { t: Date.now() } });
          // Stop polling once realtime is ready
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
        }
      });
    channelRef.current = channel;

    // Initial fetch and polling fallback
    fetchMessages();
    timer = setInterval(fetchMessages, 5000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      setRealtimeReady(false);
    };
  }, [sessionId, user.user_id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !selectedFile) return;

    if (selectedFile) {
      toast.info("File sending is not yet implemented. Please send text.");
      return;
    }
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const isLink = urlRegex.test(inputValue);
    const content = inputValue.trim();
    const messageType = isLink ? 'link' : 'text';

    // Broadcast over realtime channel so both sides receive immediately
    try {
      if (!channelRef.current) throw new Error('Chat channel not ready');
      const tempId = `local-${Date.now()}`;
      await channelRef.current.send({
        type: 'broadcast',
        event: 'chat',
        payload: {
          id: tempId,
          content,
          type: messageType,
          sender_id: user.user_id,
          sender_name: user.name,
          created_at: new Date().toISOString(),
        },
      });
      // Optimistic add
      setMessages(prev => [...prev, {
        id: tempId,
        content,
        sender: 'self',
        senderName: user.name,
        timestamp: new Date(),
        type: messageType as Message['type'],
      }]);
      setInputValue('');

      // Persist to DB in background (best-effort)
      try {
        const res = await fetch('/api/mock-interview/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, content, messageType }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.message?.id) {
          const dbId = data.message.id;
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: dbId } : m));
        }
      } catch {}
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Card className="h-full flex flex-col border-2 border-border/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="border-b border-border/20 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Chat
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <p>No messages yet</p>
                <p className="text-xs mt-1">Send a message to start the conversation</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.sender === "self" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] space-y-1",
                      message.sender === "self" ? "items-end" : "items-start"
                    )}
                  >
                    {/* Sender Name & Time */}
                    <div
                      className={cn(
                        "flex items-center gap-2 text-xs text-muted-foreground px-1",
                        message.sender === "self" ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <span className="font-medium">{message.senderName}</span>
                      <span>{formatTime(message.timestamp)}</span>
                    </div>

                    {/* Message Content */}
                    {message.type === "text" && (
                      <div
                        className={cn(
                          "px-4 py-2 rounded-2xl break-words",
                          message.sender === "self"
                            ? "bg-gradient-to-r from-brand to-blue-600 text-white"
                            : "bg-muted text-foreground"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    )}

                    {message.type === "link" && (
                      <div
                        className={cn(
                          "px-4 py-2 rounded-2xl break-words",
                          message.sender === "self"
                            ? "bg-gradient-to-r from-brand to-blue-600 text-white"
                            : "bg-muted text-foreground"
                        )}
                      >
                        <a
                          href={message.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline hover:no-underline flex items-center gap-1"
                        >
                          {message.content}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {message.type === "image" && (
                      <div className="rounded-lg overflow-hidden border border-border/20 max-w-xs">
                        <img
                          src={message.fileUrl}
                          alt={message.fileName}
                          className="w-full h-auto"
                        />
                        <div className="bg-muted p-2 flex items-center justify-between">
                          <span className="text-xs truncate">{message.fileName}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            asChild
                          >
                            <a href={message.fileUrl} download={message.fileName}>
                              <Download className="w-3 h-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}

                    {message.type === "file" && (
                      <div
                        className={cn(
                          "px-4 py-3 rounded-2xl border flex items-center gap-3 min-w-[240px]",
                          message.sender === "self"
                            ? "bg-brand/10 border-brand/20"
                            : "bg-muted border-border/20"
                        )}
                      >
                        <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                          <File className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {message.fileSize && formatFileSize(message.fileSize)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          asChild
                        >
                          <a href={message.fileUrl} download={message.fileName}>
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Typing Indicator */}
        {isTyping && (
          <div className="px-4 py-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="animate-bounce">•</span>
              <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>
                •
              </span>
              <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>
                •
              </span>
            </span>
          </div>
        )}

        {/* File Preview */}
        {selectedFile && (
          <div className="px-4 py-2 border-t border-border/20">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                {selectedFile.type.startsWith("image/") ? (
                  <ImageIcon className="w-5 h-5 text-brand" />
                ) : (
                  <File className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => setSelectedFile(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-border/20">
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            <div className="flex-1 relative">
              <Input
                placeholder="Type a message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pr-12"
              />
            </div>

            <Button
              size="icon"
              className="h-10 w-10 flex-shrink-0 bg-gradient-to-r from-brand to-blue-600"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() && !selectedFile}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
